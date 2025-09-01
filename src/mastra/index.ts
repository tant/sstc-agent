import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { channelMessageWorkflow } from './workflows/message-processor';
import { maiSale } from './agents/mai-agent';
import { TelegramChannelAdapter } from './channels/telegram';
import { channelRegistry } from './core/channels/registry';
import { signalHandlerManager } from './core/signals/manager';

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
const shutdownHandler = async () => {
  // Check if shutdown is already in progress
  if (signalHandlerManager.isShutdownInProgress()) {
    console.log('⚠️ Shutdown already in progress, skipping...');
    return;
  }
  
  console.log('\n🛑 Shutting down gracefully...');
  signalHandlerManager.setShutdownInProgress();
  
  try {
    // Cleanup Telegram if it was initialized
    if (telegramCleanup) {
      console.log('🧹 Cleaning up Telegram channel...');
      await telegramCleanup();
    }
    
    // Shutdown all channels in registry
    console.log('🔌 Shutting down all channels...');
    await channelRegistry.shutdownAll();
    
    // Remove all signal handlers
    signalHandlerManager.removeAllHandlers();
    
    console.log('✅ All channels shut down');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register signal handlers with manager
signalHandlerManager.registerHandler('SIGINT', shutdownHandler);
signalHandlerManager.registerHandler('SIGTERM', shutdownHandler);