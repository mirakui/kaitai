import puppeteer from "puppeteer";
import { IncomingWebhook } from "@slack/webhook";

function getEnv(name: string) {
  let env = process.env;
  if ("SECRETS" in process.env) {
    env = JSON.parse(<string>process.env["SECRETS"]);
  }
  const val = env[name];
  if (val == undefined) {
    throw new Error('Environment variable "' + name + '" required');
  }
  return val;
}

const slackWebhook = new IncomingWebhook(getEnv("SLACK_WEBHOOK_URL"));

async function fetchPages(page: puppeteer.Page) {
  await page.goto("https://www.yodobashi.com/product/100000001005138030/");
  const cartText = await page.$eval(
    "div.buyBox",
    e => (<HTMLElement>e).innerText
  );
  console.debug("cartText:", cartText);
  slackWebhook.send({ text: cartText });
}

async function main() {
  console.log("Start");

  const browser = await (async () => {
    if (process.env.CHROME_PATH) {
      console.log("Using chrome in path " + process.env.CHROME_PATH);
      return await puppeteer.launch({
        executablePath: process.env.CHROME_PATH,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
    } else {
      //browser = await puppeteer.launch({headless: false});
      return await puppeteer.launch();
    }
  })();

  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", request => {
      if (!request.isNavigationRequest()) {
        request.continue();
        return;
      }
      let headers = request.headers();
      headers["connection"] = "keep-alive";
      headers["user-agent"] =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/82.0.4076.0 Safari/537.36";
      headers["accept-language"] = "en,ja;q=0.9";
      headers["accept"] =
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9";
      console.debug("headers", headers);
      request.continue({ headers });
    });

    await fetchPages(page);

    console.log("Finished");

    return { message: "ok" };
  } finally {
    if (browser.close) {
      await browser.close();
    }
  }
}

exports.transfer = async (event: any) => {
  const dispatchPromises = event.Records.map((record: any) => {
    const payloadString = new Buffer(record.kinesis.data, "base64").toString(
      "utf-8"
    );
    const payload = JSON.parse(payloadString);
    console.log(payload);
    return main();
  });
  return Promise.all(dispatchPromises);
};
