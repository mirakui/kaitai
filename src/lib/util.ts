class KaitaiUtil {
  static getEnvRequired(name: string) {
    let env = process.env;
    if ("SECRETS" in process.env) {
      const secrets = JSON.parse(<string>process.env["SECRETS"]);
      env = { env, ...secrets };
    }
    const val = env[name];
    if (val == undefined) {
      throw new Error('Environment variable "' + name + '" required');
    }
    return val;
  }
  static getEnv(name: string) {
    let env = process.env;
    if ("SECRETS" in process.env) {
      const secrets = JSON.parse(<string>process.env["SECRETS"]);
      env = { env, ...secrets };
    }
    const val = env[name];
    return val;
  }
}

export { KaitaiUtil };
