#!/usr/bin/env node
/**
 * Telegram Bot Demo using Mastra Multi-Channel Architecture
 *
 * To run this:
 *   npm install
 *   export TELEGRAM_BOT_TOKEN=your-bot-token
 *   node telegram-bot.js
 */

import { mastra } from './src/mastra/index.ts';
import { channelRegistry } from './src/mastra/core/channels/registry.ts';

// Simple demo to show Mastra Telegram integration is working
async function main() {
  console.log('🤖 Telegram Bot Demo with Mastra');
  console.log('===============================');

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required!');
    console.log('Get your bot token from @BotFather on Telegram');
    process.exit(1);
  }

  console.log('✅ Mastra instance initialized');
  console.log('✅ Available agents:', Object.keys(mastra.getAgents()));
  console.log('✅ Available workflows:', Object.keys(mastra.getWorkflows()));
  console.log('✅ Registered channels:', channelRegistry.listChannels());

  console.log('');
  console.log('🚀 Telegram bot is now running!');
  console.log('Send messages to your bot on Telegram to test the workflow.');
  console.log('');
  console.log('Press Ctrl+C to stop');

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    await channelRegistry.shutdownAll();
    process.exit(0);
  });

  // Keep alive
  setInterval(() => {
    // Ping to keep alive
  }, 10000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };
