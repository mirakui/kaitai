import puppeteer from "puppeteer";
import { defaultRequestHeaders, FetcherEngine } from "./fetcher_common";
import { KaitaiFetcherOptions } from "./types";

export class PuppeteerFetcher implements FetcherEngine {
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
      headers = defaultRequestHeaders;
      request.continue({ headers });
    });

    return page;
  }

  static async create(): Promise<PuppeteerFetcher> {
    const browser = await this.setupBrowser();
    const page = await this.setupPage(browser);
    return new PuppeteerFetcher(page);
  }

  async fetchArea(
    url: string,
    query: string,
    options?: KaitaiFetcherOptions
  ): Promise<string> {
    await this.page.goto(url);
    return new Promise((resolve, reject) => {
      try {
        this.page.$eval(query, e => {
          resolve((<HTMLElement>e).innerText);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async close() {
    if (this.page.browser().close) {
      await this.page.browser().close();
    }
  }
}
