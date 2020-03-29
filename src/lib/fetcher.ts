import { KaitaiUtil } from "./util";
import { KaitaiFetcherEngineName } from "./types";
import { FetcherEngine } from "./fetcher_common";
import { PuppeteerFetcher } from "./puppeteer_fetcher";
import { RequestFetcher } from "./request_fetcher";

export class Fetcher {
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
    engine?: KaitaiFetcherEngineName,
    encoding?: string
  ): Promise<string> {
    const engineName = engine?.toString() || "request";

    return KaitaiUtil.retry(async () => {
      return await this.fetchers[engineName].fetchArea(url, query, encoding);
    });
  }

  async close() {
    await this.fetchers["puppeteer"].close();
  }
}
