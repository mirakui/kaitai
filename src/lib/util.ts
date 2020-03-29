type RetryOptions = {
  intervals?: number[];
  message?: string;
};
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
    options?: RetryOptions
  ): Promise<T> {
    const intervals = options?.intervals || [1, 2, 4, 8];
    return new Promise((resolve, reject) => {
      callback()
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          if (intervals.length > 0) {
            const interval = intervals[0] * 1000;
            console.warn(`Retrying after ${interval} sec: ${options?.message}`);
            setTimeout(() => {
              const newOptions: RetryOptions = {
                ...options,
                intervals: intervals.slice(1)
              };
              resolve(KaitaiUtil.retry(callback, newOptions));
            }, interval);
          } else {
            reject(error);
          }
        });
    });
  }
}
