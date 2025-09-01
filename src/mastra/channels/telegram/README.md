# 🟦 Telegram Channel Adapter for Mastra

This module provides a Telegram channel adapter that integrates seamlessly with the Mastra framework.

## Features

- ✅ Text message support
- ✅ Photo/image message support
- ✅ Document message support
- ✅ Voice/audio message support
- ✅ Quick reply buttons
- ✅ Polling and webhook support
- ✅ Error handling and retries
- ✅ Graceful shutdown
- ✅ Configuration validation
- ✅ Mastra framework integration
- ✅ Singleton pattern implementation (one instance per bot token)

## Singleton Pattern Implementation

The Telegram adapter implements a singleton pattern to ensure only one instance exists per bot token. This prevents conflicts that could occur when multiple instances try to receive messages from the same Telegram bot.

### Key Features:

1. **Token-based Instance Management**: Each bot token can only have one active adapter instance
2. **Automatic Instance Reuse**: If an adapter is requested with an existing token, the existing instance is returned
3. **Proper Cleanup**: Instances are properly removed from the registry when shut down
4. **Conflict Prevention**: Prevents multiple instances from trying to poll or receive webhooks for the same bot

## Installation

The Telegram adapter is already integrated into your Mastra project structure.

## Configuration

### Environment Variables

```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram  # Optional
TELEGRAM_POLLING=true                                           # Optional
TELEGRAM_POLLING_INTERVAL=300                                   # Optional
TELEGRAM_MAX_RETRIES=3                                          # Optional
```

### Programmatic Configuration

```typescript
import { TelegramChannelAdapter } from './src/mastra/channels/telegram';

const adapter = new TelegramChannelAdapter({
  token: 'your-bot-token',
  webhookUrl: 'https://your-domain.com/webhook/telegram',
  polling: true,
  pollingInterval: 300,
  maxRetries: 3
}, messageProcessor);
```

## Usage

### Basic Setup (Integrated with Mastra)

The Telegram adapter is automatically loaded by Mastra when `TELEGRAM_BOT_TOKEN` is set in your environment:

```env
# .env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### Webhook Setup

```typescript
// Set up webhook
await adapter.setWebhook('https://your-domain.com/webhook/telegram');

// Handle webhook requests in your server
app.post('/webhook/telegram', (req, res) => {
  // Pass the webhook data to the adapter
  adapter.handleMessage(req.body);
  res.sendStatus(200);
});
```

## API Reference

### Constructor

```typescript
new TelegramChannelAdapter(config: Partial<TelegramConfig>, processor: CentralMessageProcessor)
```

### Methods

- `getBotInfo()` - Get information about the bot
- `setWebhook(url)` - Set webhook URL
- `deleteWebhook()` - Delete webhook
- `shutdown()` - Gracefully shut down the adapter
- `handleMessage(message)` - Handle incoming message manually
- `isTokenInUse(token)` - Check if a token is already in use (static method)
- `getActiveInstances()` - Get all active instances (static method)

### Events

The adapter automatically handles these Telegram events:
- `message` - Text messages
- `photo` - Photo messages
- `document` - Document messages
- `voice` - Voice messages
- `callback_query` - Button presses

## Testing

### Unit Tests

Unit tests are located in `src/mastra/channels/telegram/tests/`.

### Integration Tests

Integration tests require a valid Telegram bot token.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT