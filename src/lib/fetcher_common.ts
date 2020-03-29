import { KaitaiFetcherOptions } from "./types";

export const defaultRequestHeaders: { [key: string]: string } = {
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

export interface FetcherEngine {
  // static async create(): FetcherEngine;
  fetchArea(
    url: string,
    query: string,
    options?: KaitaiFetcherOptions
  ): Promise<string>;
  close(): void;
}
