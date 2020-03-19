class Util {
  static getEnv(name: string) {
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
}

export { Util };
