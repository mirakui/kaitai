import { KaitaiUtil } from "./util";
import { KaitaiFetcherEngineName, KaitaiFetcherOptions } from "./types";
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
    options?: KaitaiFetcherOptions
  ): Promise<string> {
    const engineName = options?.engine?.toString() || "request";

    return KaitaiUtil.retry(
      async () => {
        return await this.fetchers[engineName].fetchArea(url, query, options);
      },
      { message: `on fetching ${url}` }
    );
  }

  async close() {
    await this.fetchers["puppeteer"].close();
  }
}
