import request from "request";
import cheerio from "cheerio";
import iconv from "iconv-lite";
import { requestHeaders, FetcherEngine } from "./fetcher_common";

export class RequestFetcher implements FetcherEngine {
  constructor() {}

  static async create(): Promise<RequestFetcher> {
    return new RequestFetcher();
  }

  private static execQuery(body: string, query: string) {
    const $ = cheerio.load(body);
    const nodes = $(query);
    if (nodes.length == 0) {
      throw new Error(`No matches: ${query}`);
    }
    return nodes.text().trim();
  }

  async fetchArea(
    url: string,
    query: string,
    encoding?: string
  ): Promise<string> {
    const options = {
      url: url,
      headers: requestHeaders,
      encoding: null
    };
    return new Promise((resolve, reject) => {
      let body = "";
      request(options, (error, response, rawBody) => {
        if (error) {
          reject(error);
          return;
        } else if (response.statusCode != 200) {
          reject(new Error(`Status code: ${response.statusCode}`));
          return;
        }
        try {
          resolve(RequestFetcher.execQuery(body, query));
        } catch (execQueryError) {
          reject(execQueryError);
        }
      })
        .on("data", chunk => {
          if (encoding) {
            body += iconv.decode(Buffer.from(chunk), encoding);
          } else {
            body += chunk;
          }
        })
        .on("error", error => {
          reject(error);
        });
    });
  }

  async close() {}
}
