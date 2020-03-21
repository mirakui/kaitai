import fs from "fs";
import util from "util";
import puppeteer from "puppeteer";
import request from "request";
import cheerio from "cheerio";
import S3 from "aws-sdk/clients/s3";
import {
  KaitaiFetcherEngineName,
  KaitaiSiteStatuses,
  KaitaiConfig
} from "./lib/types";
import { KaitaiUtil } from "./lib/util";

const requestHeaders: { [key: string]: string } = {
  Connection: "keep-alive",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4088.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  "Accept-Language": "en,ja;q=0.9"
};

interface FetcherEngine {
  // static async create(): FetcherEngine;
  fetchArea(url: string, query: string): Promise<string>;
  close(): void;
}

class PuppeteerFetcher implements FetcherEngine {
  page: puppeteer.Page;

  constructor(page: puppeteer.Page) {
    this.page = page;
  }

  static async setupBrowser() {
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

  static async setupPage(browser: puppeteer.Browser) {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", request => {
      if (!request.isNavigationRequest()) {
        request.continue();
        return;
      }
      let headers = request.headers();
      headers = requestHeaders;
      request.continue({ headers });
    });

    return page;
  }

  static async create(): Promise<PuppeteerFetcher> {
    const browser = await this.setupBrowser();
    const page = await this.setupPage(browser);
    return new PuppeteerFetcher(page);
  }

  async fetchArea(url: string, query: string): Promise<string> {
    await this.page.goto(url);
    return new Promise((resolve, reject) => {
      this.page.$eval(query, e => {
        resolve((<HTMLElement>e).innerText);
      });
    });
  }

  async close() {
    if (this.page.browser().close) {
      await this.page.browser().close();
    }
  }
}

class RequestFetcher implements FetcherEngine {
  constructor() {}

  static async create(): Promise<RequestFetcher> {
    return new RequestFetcher();
  }

  async fetchArea(url: string, query: string): Promise<string> {
    const options = {
      url: url,
      headers: requestHeaders
    };
    return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        const $ = cheerio.load(body);
        resolve($(query).text());
      });
    });
  }

  async close() {}
}

class Fetcher {
  fetchers: { [key: string]: FetcherEngine };

  constructor() {
    this.fetchers = {};
  }

  async setup() {
    this.fetchers["puppeteer"] = await PuppeteerFetcher.create();
    this.fetchers["request"] = await RequestFetcher.create();
  }

  async fetchArea(
    url: string,
    query: string,
    engine?: KaitaiFetcherEngineName
  ): Promise<string> {
    const engineName = engine?.toString() || "request";
    return this.fetchers[engineName].fetchArea(url, query);
  }

  async close() {
    await this.fetchers["puppeteer"].close();
  }
}

function loadConfig(path: string): KaitaiConfig {
  const file = fs.readFileSync(path);
  return JSON.parse(file.toString());
}

async function putStatus(status: object) {
  const s3 = new S3();
  const body = JSON.stringify(status);
  const bucket = KaitaiUtil.getEnvRequired("AFTER_STATUS_BUCKET");
  const key = KaitaiUtil.getEnvRequired("AFTER_STATUS_KEY");
  const params = {
    Body: body,
    Bucket: bucket,
    Key: key,
    ContentType: "text/json",
    ACL: "public-read"
  };
  s3.putObject(params, (err, data) => {
    console.debug(`s3 put: ${bucket}/${key}`, "err:", err, "data:", data);
  });
}

async function main() {
  console.log("Start");

  const config = loadConfig("kaitai_config.json");
  console.debug(config);

  const fetcher = new Fetcher();
  await fetcher.setup();

  try {
    let status: KaitaiSiteStatuses = { products: [] };

    for (let product of config.products) {
      let siteStatuses = [];
      for (let site of product.sites) {
        const areaText = await fetcher.fetchArea(
          site.url,
          site.query,
          site.engine
        );
        siteStatuses.push({ name: site.name, url: site.url, status: areaText });
      }
      status.products.push({ name: product.name, sites: siteStatuses });
    }

    console.debug("status:", util.inspect(status, true, null));
    putStatus(status);

    console.log("Finished");
  } finally {
    fetcher.close();
  }
}

(async () => {
  await main();
})();
