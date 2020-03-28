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
    return $(query).text();
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
      let contentLength = 0;
      const req = request(options, (error, response, rawBody) => {
        console.debug("callback");
      });
      if (encoding) {
        req.pipe(iconv.decodeStream(encoding)).pipe(iconv.encodeStream("utf8"));
      }
      req
        .on("data", chunk => {
          console.debug("received data:", chunk.length, "total", body.length);
          body += chunk;
          if (contentLength > 0 && body.length >= contentLength) {
            resolve(RequestFetcher.execQuery(body, query));
          }
        })
        .on("error", error => {
          reject(error);
        })
        .on("end", () => {
          console.debug("end");
          resolve(RequestFetcher.execQuery(body, query));
        })
        .on("response", response => {
          console.debug("response");
          console.debug("code:", response.statusCode);
          if (response.headers["content-length"]) {
            contentLength = Number.parseInt(response.headers["content-length"]);
          }
          console.debug("content-length:", contentLength);
        })
        .on("close", () => {
          console.debug("close");
        })
        .on("complete", () => {
          console.debug("complete");
        });

      // request(options, (error, response, _body) => {
      //   let body = _body;
      //   if (encoding) {
      //     //body = iconv.decode(Buffer.from(body), encoding);
      //     body = iconv.decode(_body, "Shift_JIS");
      //   }
      //   if (error) {
      //     reject(error);
      //   } else if (response.statusCode != 200) {
      //     reject(response);
      //   } else {
      //     const $ = cheerio.load(body);
      //     resolve($(query).text());
      //   }
      // });
    });
  }

  async close() {}
}
