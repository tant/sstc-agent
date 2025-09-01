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
let telegramCleanup: (() => Promise<void>) | null = null;

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
      
      // Store cleanup function for graceful shutdown
      telegramCleanup = async () => {
        console.log('🧹 Cleaning up Telegram channel...');
        await telegramAdapter.shutdown();
      };
    }
  } catch (error) {
    console.error('❌ Failed to initialize Telegram channel:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  try {
    // Cleanup Telegram if it was initialized
    if (telegramCleanup) {
      await telegramCleanup();
    }
    
    // Shutdown all channels in registry
    await channelRegistry.shutdownAll();
    
    console.log('✅ All channels shut down');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    // Cleanup Telegram if it was initialized
    if (telegramCleanup) {
      await telegramCleanup();
    }
    
    // Shutdown all channels in registry
    await channelRegistry.shutdownAll();
    
    console.log('✅ All channels shut down');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});