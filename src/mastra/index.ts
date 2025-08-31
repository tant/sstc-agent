
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { channelMessageWorkflow } from './workflows/message-processor';
import { maiSale } from './agents/mai-agent';
import { TelegramChannelAdapter } from './channels/telegram';
import { channelRegistry } from './core/channels/registry';

export const mastra = new Mastra({
  workflows: {
    channelMessageWorkflow
  },
  agents: { maiSale },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});

// Initialize Telegram channel when Mastra starts (if token is provided)
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    console.log('🔍 Attempting to initialize Telegram channel...');
    // Check if Telegram channel is already registered
    if (channelRegistry.has('telegram')) {
      console.log('⚠️ Telegram channel already registered, skipping initialization');
    } else {
      const telegramAdapter = new TelegramChannelAdapter({
        token: process.env.TELEGRAM_BOT_TOKEN
      });
      channelRegistry.register('telegram', telegramAdapter);
      console.log('✅ Telegram channel registered in Mastra');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Telegram channel:', error);
  }
}
