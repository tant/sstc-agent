import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { channelMessageWorkflow } from './workflows/message-processor';
import { maiSale } from './agents/mai-agent';
import { TelegramChannelAdapter } from './channels/telegram';
import { ZaloChannelAdapter } from './channels/zalo';
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

// Initialize Zalo channel when Mastra starts (if credentials are provided)
let zaloCleanup: (() => Promise<void>) | null = null;
let zaloAdapter: ZaloChannelAdapter | null = null;

if (process.env.ZALO_COOKIE && process.env.ZALO_IMEI && process.env.ZALO_USER_AGENT) {
  try {
    console.log('🔍 Attempting to initialize Zalo channel...');
    // Check if Zalo channel is already registered
    if (channelRegistry.has('zalo')) {
      console.log('⚠️ Zalo channel already registered, skipping initialization');
    } else {
      zaloAdapter = new ZaloChannelAdapter({
        cookie: process.env.ZALO_COOKIE,
        imei: process.env.ZALO_IMEI,
        userAgent: process.env.ZALO_USER_AGENT,
        selfListen: process.env.ZALO_SELF_LISTEN === 'true',
        checkUpdate: process.env.ZALO_CHECK_UPDATE !== 'false',
        logging: process.env.ZALO_LOGGING !== 'false'
      });
      
      // Start the Zalo adapter
      zaloAdapter.start()
        .then(() => {
          channelRegistry.register('zalo', zaloAdapter!);
          console.log('✅ Zalo channel registered in Mastra');
        })
        .catch((error) => {
          console.error('❌ Failed to start Zalo adapter:', error);
        });
      
      // Store cleanup function for graceful shutdown
      zaloCleanup = async () => {
        console.log('🧹 Cleaning up Zalo channel...');
        if (zaloAdapter) {
          await zaloAdapter.shutdown();
        }
      };
    }
  } catch (error) {
    console.error('❌ Failed to initialize Zalo channel:', error);
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
    
    // Cleanup Zalo if it was initialized
    if (zaloCleanup) {
      console.log('🧹 Cleaning up Zalo channel...');
      await zaloCleanup();
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