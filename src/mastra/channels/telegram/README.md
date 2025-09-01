# Telegram Channel Configuration

## Setup Instructions

1. Create a new bot by talking to [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token provided by BotFather
3. Add the token to your environment variables:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
```

## Token Format

A valid Telegram bot token should:
- Contain a colon (:)
- Have the format: `{bot_id}:{token_string}`
- Example: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`

## Troubleshooting

If you see polling errors like:
```
❌ [Telegram] Polling error: RequestError: AggregateError
```

Check the following:

1. **Token validity**: Ensure your token is correct and hasn't been revoked
2. **Network connectivity**: Verify you have internet access
3. **Firewall settings**: Make sure outgoing connections to Telegram API are allowed
4. **Environment variable**: Confirm TELEGRAM_BOT_TOKEN is set correctly

## Error Codes

- **EFATAL**: Usually indicates token issues or network problems
- **ECONNRESET**: Connection was reset, likely network related
- **ETIMEDOUT**: Connection timed out, check network or firewall