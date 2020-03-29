export class KaitaiUtil {
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
  static async retry<T>(
    callback: () => Promise<T>,
    intervals: number[] = [1, 2, 4, 8]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      callback()
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          if (intervals.length > 0) {
            const interval = intervals[0] * 1000;
            console.warn(`Retrying after ${interval} sec`);
            setTimeout(() => {
              resolve(KaitaiUtil.retry(callback, intervals.slice(1)));
            }, interval);
          } else {
            reject(error);
          }
        });
    });
  }
}
