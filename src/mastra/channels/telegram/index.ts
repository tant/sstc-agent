/**
 * Telegram channel exports for Mastra framework
 */

export { TelegramChannelAdapter } from "./adapter";
export { TelegramSingletonManager } from "./singleton-manager";
export type { TelegramConfig } from "./config";
export { defaultTelegramConfig, validateTelegramConfig } from "./config";

// Channel identifier
export const CHANNEL_NAME = "telegram";
