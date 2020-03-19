import { IncomingWebhook } from "@slack/webhook";

function getEnv(name: string) {
  let env = process.env;
  if ("SECRETS" in process.env) {
    env = JSON.parse(<string>process.env["SECRETS"]);
  }
  const val = env[name];
  if (val == undefined) {
    throw new Error('Environment variable "' + name + '" required');
  }
  return val;
}

const slackWebhook = new IncomingWebhook(getEnv("SLACK_WEBHOOK_URL"));

function main() {
  slackWebhook.send({ text: "hello" });
}
