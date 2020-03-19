import fs from "fs";
import puppeteer from "puppeteer";
import S3 from "aws-sdk/clients/s3";
import { KaitaiSiteStatuses, KaitaiConfig } from "./lib/types";

function loadConfig(path: string): KaitaiConfig {
  const file = fs.readFileSync(path);
  return JSON.parse(file.toString());
}

async function setupBrowser() {
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
  return browser;
}

async function setupPage(browser: puppeteer.Browser) {
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
    request.continue({ headers });
  });

  return page;
}

async function fetchArea(page: puppeteer.Page, url: string, query: string) {
  await page.goto(url);
  const areaText = await page.$eval(query, e => (<HTMLElement>e).innerText);
  return areaText;
}

async function main() {
  console.log("Start");

  const config = loadConfig("kaitai_config.json");
  console.debug(config);

  const browser = await setupBrowser();
  try {
    const page = await setupPage(browser);
    let status: KaitaiSiteStatuses = { products: [] };

    for (let product of config.products) {
      let siteStatuses = [];
      for (let site of product.sites) {
        const areaText = await fetchArea(page, site.url, site.query);
        siteStatuses.push({ name: site.name, url: site.url, status: areaText });
      }
      status.products.push({ name: product.name, sites: siteStatuses });
    }

    console.debug("status", status);
    putStatus(status);

    console.log("Finished");
  } finally {
    if (browser.close) {
      await browser.close();
    }
  }
}

async function putStatus(status: object) {
  const s3 = new S3();
  const body = JSON.stringify(status);
  const params = {
    Body: body,
    Bucket: "static.mirakui.com",
    Key: "kaitai/status.json",
    ContentType: "text/json",
    ACL: "public-read"
  };
  s3.putObject(params, (err, data) => {
    console.debug("err:", err, "data:", data);
  });
}

(async () => {
  await main();
})();
