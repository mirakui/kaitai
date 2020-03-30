import request from "request";
import iconv from "iconv-lite";
import { defaultRequestHeaders, FetcherEngine } from "./fetcher_common";
import { KaitaiFetcherOptions } from "./types";
import { KaitaiUtil } from "./util";

export class RequestFetcher implements FetcherEngine {
  constructor() {}

  static async create(): Promise<RequestFetcher> {
    return new RequestFetcher();
  }

  async fetchArea(
    url: string,
    query: string,
    options?: KaitaiFetcherOptions
  ): Promise<string> {
    const requestOptions: request.OptionsWithUrl = {
      url: url,
      headers: options?.headers || defaultRequestHeaders,
      encoding: null,
      followRedirect: false,
      gzip: true
    };
    const allowStatusCodes = options?.allowStatusCodes || [200];

    return new Promise((resolve, reject) => {
      let body = "";
      request(requestOptions, (error, response, rawBody) => {
        if (error) {
          reject(error);
          return;
        } else if (allowStatusCodes.indexOf(response.statusCode) < 0) {
          reject(new Error(`Status code: ${response.statusCode}`));
          return;
        }
        try {
          resolve(KaitaiUtil.execQuery(body, query));
        } catch (execQueryError) {
          reject(execQueryError);
        }
      })
        .on("data", chunk => {
          if (options?.encoding) {
            body += iconv.decode(Buffer.from(chunk), options?.encoding);
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
