import fs from "fs";
import util from "util";
import S3 from "aws-sdk/clients/s3";
import {
  KaitaiSiteStatuses,
  KaitaiConfig,
  KaitaiSiteStatusesDictionary,
  KaitaiSite,
  KaitaiProductDictionary
} from "./lib/types";
import { KaitaiUtil } from "./lib/util";
import { Fetcher } from "./lib/fetcher";

function loadConfig(path: string): KaitaiConfig {
  const file = fs.readFileSync(path);
  return JSON.parse(file.toString());
}

async function putStatus(status: object) {
  const s3 = new S3();
  const body = JSON.stringify(status);
  const bucket = KaitaiUtil.getEnvRequired("AFTER_STATUS_BUCKET");
  const key = KaitaiUtil.getEnvRequired("AFTER_STATUS_KEY");
  const params = {
    Body: body,
    Bucket: bucket,
    Key: key,
    ContentType: "text/json",
    ACL: "public-read"
  };
  s3.putObject(params, (err, data) => {
    console.debug(`s3 put: ${bucket}/${key}`, "err:", err, "data:", data);
  });
}

async function getStatus(): Promise<KaitaiSiteStatuses> {
  const s3 = new S3();
  const bucket = KaitaiUtil.getEnvRequired("AFTER_STATUS_BUCKET");
  const key = KaitaiUtil.getEnvRequired("AFTER_STATUS_KEY");
  const params = {
    Bucket: bucket,
    Key: key
  };

  return new Promise((resolve, reject) => {
    s3.getObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else if (data.Body) {
        const status: KaitaiSiteStatuses = JSON.parse(data.Body.toString());
        resolve(status);
      } else {
        reject();
      }
    });
  });
}

function siteStatusesToDictionary(status: KaitaiSiteStatuses) {
  let result: KaitaiSiteStatusesDictionary = { products: {} };
  for (let product of status.products) {
    for (let site of product.sites) {
      if (!result.products[product.name]) {
        result.products[product.name] = <KaitaiProductDictionary>{ sites: {} };
      }
      result.products[product.name].sites[site.name] = site;
    }
  }
  return <KaitaiSiteStatusesDictionary>result;
}

async function main() {
  console.log(`Start: ${new Date()}`);

  const config = loadConfig("kaitai_config.json");
  console.debug("Loaded config:", util.inspect(config, true, null));

  const lastStatus = siteStatusesToDictionary(await getStatus());

  const fetcher = new Fetcher();
  await fetcher.setup();

  try {
    let status: KaitaiSiteStatuses = { products: [] };

    for (let product of config.products) {
      let fetcherPromises: Promise<KaitaiSite>[] = [];

      for (let site of product.sites) {
        fetcherPromises.push(
          new Promise((resolve, reject) => {
            console.log(`Fetching ${site.url} (${site.engine})`);
            fetcher
              .fetchArea(site.url, site.query, {
                engine: site.engine,
                encoding: site.encoding,
                headers: site.headers,
                command: site.command
              })
              .then(areaText => {
                const siteStatus: KaitaiSite = {
                  name: site.name,
                  url: site.url,
                  status: areaText
                };
                console.debug(
                  "Site status:",
                  util.inspect(siteStatus, true, null)
                );
                resolve(siteStatus);
              })
              .catch(err => {
                console.warn("Error occurred on fetching", site.name, err);
                const lastSite =
                  lastStatus.products[product.name].sites[site.name];
                if (lastSite) {
                  console.log("Last status found:", lastSite);
                  resolve({
                    name: lastSite.name,
                    url: lastSite.url,
                    status: lastSite.status
                  });
                } else {
                  console.log("Last status not found:", site);
                  resolve({
                    name: site.name,
                    url: site.url,
                    status: "(no data)"
                  });
                }
              });
          })
        );
      }
      Promise.all(fetcherPromises).then(siteStatuses => {
        status.products.push({ name: product.name, sites: siteStatuses });

        console.debug("All statuses:", util.inspect(status, true, null));

        if (!KaitaiUtil.getEnv("DISABLE_UPDATE")) {
          putStatus(status);
        }
      });
    }
  } finally {
    fetcher.close();
    console.log(`Finished: ${new Date()}`);
  }
}

(async () => {
  await main();
})();
