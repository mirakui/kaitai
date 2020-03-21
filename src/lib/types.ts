type KaitaiConfig = {
  products: {
    name: string;
    sites: {
      name: string;
      url: string;
      query: string;
      engine?: KaitaiFetcherEngineName;
    }[];
  }[];
};

type KaitaiFetcherEngineName = "request" | "puppeteer";

type KaitaiSiteStatuses = {
  products: KaitaiProduct[];
};

type KaitaiProduct = {
  name: string;
  sites: KaitaiSite[];
};

type KaitaiSite = {
  name: string;
  url: string;
  status: string;
};

type KaitaiDiff = {
  productName: string;
  siteName: string;
  url: string;
  beforeStatus: string;
  afterStatus: string;
};

export {
  KaitaiDiff,
  KaitaiSite,
  KaitaiProduct,
  KaitaiConfig,
  KaitaiSiteStatuses,
  KaitaiFetcherEngineName
};
