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

// async function addFirstBookOfSeriesToBuscket(
//   page: puppeteer.Page,
//   series: Series
// ) {
//   const url =
//     "https://book.dmm.co.jp/series/?floor=Abook&series_id=" + series["id"];
//   console.log("Fetching " + series["name"] + " " + url);
//   await page.goto(url);

//   const btnText = await page.$eval(
//     "div.m-boxListBookProductBlock__btn__itemBasket",
//     e => (<HTMLElement>e).innerText
//   );
//   if (btnText.toString() == "バスケットに入れる") {
//     console.log("  -> Adding to cart");
//     slackWebhook.send({ text: "Adding to cart: " + series["name"] });
//     await page.click("div.m-boxListBookProductBlock__btn__itemBasket a");
//   }
// }

async function fetchPages(page: puppeteer.Page) {
  await page.goto("https://www.yodobashi.com/product/100000001005138030/");
  const cartText = await page.$eval(
    "div.buyBox",
    e => (<HTMLElement>e).innerText
  );
  console.debug("cartText:", cartText);
}

(async () => {
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

    //await fetchPages(page);

    fetch("https://www.yodobashi.com/product/100000001005138030/", {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en,ja;q=0.9",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/82.0.4076.0 Safari/537.36"
      },
      referrerPolicy: "no-referrer-when-downgrade",
      body: null,
      method: "GET",
      mode: "cors"
    });
    console.log("Finished");
  } finally {
    if (browser.close) {
      await browser.close();
    }
  }
})();
