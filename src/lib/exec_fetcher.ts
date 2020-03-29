import { exec } from "child_process";
import cheerio from "cheerio";
import { FetcherEngine } from "./fetcher_common";
import { KaitaiFetcherOptions } from "./types";

export class ExecFetcher implements FetcherEngine {
  constructor() {}

  static async create(): Promise<ExecFetcher> {
    return new ExecFetcher();
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
    options?: KaitaiFetcherOptions
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!options?.command) {
        reject(new Error("ExecFetcher requires `command` in config"));
        return;
      }
      exec(options?.command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        resolve(ExecFetcher.execQuery(stdout, query));
      });
    });
  }

  async close() {}
}
