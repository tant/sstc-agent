/**
 * Telegram configuration types and validation
 */

export interface TelegramConfig {
  token: string;
  polling?: boolean;
  pollingInterval?: number;
  allowedChatTypes?: Array<'private' | 'group' | 'supergroup' | 'channel'>;
}

export function validateTelegramConfig(config: Partial<TelegramConfig>): TelegramConfig {
  if (!config.token) {
    throw new Error('Telegram bot token is required');
  }

  return {
    token: config.token,
    polling: config.polling ?? true,
    pollingInterval: config.pollingInterval,
    allowedChatTypes: config.allowedChatTypes
  };
}

export const defaultTelegramConfig: TelegramConfig = {
  token: '',
  polling: true,
  pollingInterval: 300,
  allowedChatTypes: ['private']
};