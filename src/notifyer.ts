import S3 from "aws-sdk/clients/s3";
import request from "request";
import { IncomingWebhook } from "@slack/webhook";
import { KaitaiDiff, KaitaiSite, KaitaiSiteStatuses } from "./lib/types";
import { KaitaiUtil } from "./lib/util";
import util from "util";

const slackWebhook = new IncomingWebhook(
  KaitaiUtil.getEnvRequired("SLACK_WEBHOOK_URL")
);

async function getStatusFromS3(
  bucket: string,
  key: string
): Promise<KaitaiSiteStatuses> {
  const s3 = new S3();
  const params = {
    Bucket: bucket,
    Key: key
  };
  return new Promise((resolve, reject) =>
    s3.getObject(params, (err, data) => {
      if (err) {
        if (err.name == "NoSuchKey") {
          reject(err);
          return;
        } else {
          throw err;
        }
      }
      if (data.Body) {
        const json = JSON.parse(data.Body.toString());
        resolve(<KaitaiSiteStatuses>json);
      } else {
        throw "body is undefined";
      }
    })
  );
}

async function getStatusFromUrl(url: string): Promise<KaitaiSiteStatuses> {
  return new Promise((resolve, reject) => {
    request(url, { json: true }, (err, res, body) => {
      if (err) {
        throw err;
      }
      resolve(<KaitaiSiteStatuses>body);
    });
  });
}

async function putStatusToS3(
  bucket: string,
  key: string,
  status: KaitaiSiteStatuses
) {
  const s3 = new S3();
  const body = JSON.stringify(status);
  const params = {
    Body: body,
    Bucket: bucket,
    Key: key
  };
  s3.putObject(params, (err, data) => {
    console.debug(`s3 put: ${bucket}/${key}`, "err:", err, "data:", data);
  });
}

function compareStatuses(
  before: KaitaiSiteStatuses,
  after: KaitaiSiteStatuses
): KaitaiDiff[] {
  let diffs: KaitaiDiff[] = [];

  let befores: { [key: string]: { [key: string]: KaitaiSite } } = {};
  for (let product of before.products) {
    let sites: { [key: string]: KaitaiSite } = {};
    for (let site of product.sites) {
      sites[site.name] = site;
    }
    befores[product.name] = sites;
  }

  for (let product of after.products) {
    for (let site of product.sites) {
      const afterStatus = site.status;
      const beforeStatus = befores[product.name][site.name].status;
      if (beforeStatus != afterStatus || KaitaiUtil.getEnv("FORCE_NOTIFY")) {
        const diff: KaitaiDiff = {
          productName: product.name,
          siteName: site.name,
          url: site.url,
          beforeStatus: beforeStatus,
          afterStatus: afterStatus
        };
        diffs.push(diff);
      }
    }
  }

  return diffs;
}

function formatDiff(diff: KaitaiDiff): string {
  return (
    `${diff.siteName} で販売されている ${diff.productName} の販売状況に変化がありました。\n` +
    `*before*\n\`\`\`\n${diff.beforeStatus}\`\`\`\n` +
    `*after*\n\`\`\`\n${diff.afterStatus}\`\`\`\n` +
    `${diff.url}`
  );
}

async function main() {
  const beforeBucket = "naruta-test";
  const beforeKey = "kaitai/status.json";
  const afterUrl = "http://static.mirakui.com/kaitai/status.json";
  console.log("start");
  let beforeStatus = await getStatusFromS3(beforeBucket, beforeKey).catch(
    err => {
      console.warn("no such key in the Before bucket");
    }
  );
  const afterStatus = await getStatusFromUrl(afterUrl);
  let diffs: KaitaiDiff[];

  console.debug("before:", util.inspect(beforeStatus, true, null));
  console.debug("after:", util.inspect(afterStatus, true, null));

  if (beforeStatus) {
    diffs = compareStatuses(beforeStatus, afterStatus);
    console.log("diffs:", util.inspect(diffs, true, null));

    if (diffs.length > 0 && !KaitaiUtil.getEnv("DISABLE_UPDATE")) {
      putStatusToS3(beforeBucket, beforeKey, afterStatus);
    }

    for (let diff of diffs) {
      const diffString = formatDiff(diff);
      console.log("slack:", diffString);
      slackWebhook.send({
        text: diffString,
        channel: KaitaiUtil.getEnv("SLACK_CHANNEL"),
        icon_emoji: KaitaiUtil.getEnv("SLACK_ICON_EMOJI"),
        username: KaitaiUtil.getEnv("SLACK_USER_NAME")
      });
    }
  }
  console.log("finished");
}

(async () => {
  await main();
})();
