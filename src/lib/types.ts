import request from "request";

export type KaitaiConfig = {
  products: {
    name: string;
    sites: {
      name: string;
      url: string;
      query: string;
      engine?: KaitaiFetcherEngineName;
      encoding?: string;
      headers?: request.Headers;
    }[];
  }[];
};

export type KaitaiFetcherEngineName = "request" | "puppeteer";

export type KaitaiSiteStatusesDictionary = {
  products: { [key: string]: KaitaiProductDictionary };
};

export type KaitaiProductDictionary = {
  sites: { [key: string]: KaitaiSite };
};

export type KaitaiSiteStatuses = {
  products: KaitaiProduct[];
};

export type KaitaiProduct = {
  name: string;
  sites: KaitaiSite[];
};

export type KaitaiSite = {
  name: string;
  url: string;
  status: string;
};

export type KaitaiDiff = {
  productName: string;
  siteName: string;
  url: string;
  beforeStatus: string;
  afterStatus: string;
};

export type KaitaiFetcherOptions = {
  engine?: KaitaiFetcherEngineName;
  encoding?: string;
  headers?: request.Headers;
};
