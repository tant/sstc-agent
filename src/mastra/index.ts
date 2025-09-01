
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

// Initialize Telegram channel when Mastra starts (if token is provided)\nlet telegramCleanup: (() => Promise<void>) | null = null;\n\nif (process.env.TELEGRAM_BOT_TOKEN) {\n  try {\n    console.log('🔍 Attempting to initialize Telegram channel...');\n    // Check if Telegram channel is already registered\n    if (channelRegistry.has('telegram')) {\n      console.log('⚠️ Telegram channel already registered, skipping initialization');\n    } else {\n      const telegramAdapter = new TelegramChannelAdapter({\n        token: process.env.TELEGRAM_BOT_TOKEN\n      });\n      channelRegistry.register('telegram', telegramAdapter);\n      console.log('✅ Telegram channel registered in Mastra');\n      \n      // Store cleanup function for graceful shutdown\n      telegramCleanup = async () => {\n        console.log('🧹 Cleaning up Telegram channel...');\n        await telegramAdapter.shutdown();\n      };\n    }\n  } catch (error) {\n    console.error('❌ Failed to initialize Telegram channel:', error);\n  }\n}\n\n// Graceful shutdown\nprocess.on('SIGINT', async () => {\n  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');\n  try {\n    // Cleanup Telegram if it was initialized\n    if (telegramCleanup) {\n      await telegramCleanup();\n    }\n    \n    // Shutdown all channels in registry\n    await channelRegistry.shutdownAll();\n    \n    console.log('✅ All channels shut down');\n    process.exit(0);\n  } catch (error) {\n    console.error('❌ Error during shutdown:', error);\n    process.exit(1);\n  }\n});\n\nprocess.on('SIGTERM', async () => {\n  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');\n  try {\n    // Cleanup Telegram if it was initialized\n    if (telegramCleanup) {\n      await telegramCleanup();\n    }\n    \n    // Shutdown all channels in registry\n    await channelRegistry.shutdownAll();\n    \n    console.log('✅ All channels shut down');\n    process.exit(0);\n  } catch (error) {\n    console.error('❌ Error during shutdown:', error);\n    process.exit(1);\n  }\n});
