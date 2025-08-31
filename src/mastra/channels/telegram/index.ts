/**
 * Telegram channel exports for Mastra framework
 */

export { TelegramChannelAdapter } from './adapter';
export type { TelegramConfig } from './config';
export { validateTelegramConfig, defaultTelegramConfig } from './config';

// Channel identifier
export const CHANNEL_NAME = 'telegram';