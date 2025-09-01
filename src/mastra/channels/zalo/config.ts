/**
 * Zalo configuration types and validation
 */

export interface ZaloConfig {
  cookie: string;
  imei: string;
  userAgent: string;
  selfListen?: boolean;
  checkUpdate?: boolean;
  logging?: boolean;
}

export function validateZaloConfig(config: Partial<ZaloConfig>): ZaloConfig {
  // Parse cookie from JSON string if needed
  let parsedCookie: any = config.cookie;
  if (typeof config.cookie === 'string') {
    try {
      parsedCookie = JSON.parse(config.cookie);
    } catch (_e) {
      throw new Error('Invalid cookie format. Must be a valid JSON string.');
    }
  }

  if (!parsedCookie) {
    throw new Error('Zalo cookie is required');
  }

  if (!config.imei) {
    throw new Error('Zalo IMEI is required');
  }

  if (!config.userAgent) {
    throw new Error('Zalo user agent is required');
  }

  return {
    cookie: typeof config.cookie === 'string' ? parsedCookie : config.cookie,
    imei: config.imei,
    userAgent: config.userAgent,
    selfListen: config.selfListen ?? false,
    checkUpdate: config.checkUpdate ?? true,
    logging: config.logging ?? true
  };
}

export const defaultZaloConfig: ZaloConfig = {
  cookie: '',
  imei: '',
  userAgent: '',
  selfListen: false,
  checkUpdate: true,
  logging: true
};