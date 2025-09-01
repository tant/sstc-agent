# Zalo Channel Configuration

## Environment Variables

To enable the Zalo channel, you need to set the following environment variables in your `.env` file:

```
ZALO_COOKIE={"zpw_sek":"your_cookie_value","zpw_wsek":"your_other_cookie_value"}
ZALO_IMEI=your_imei_value
ZALO_USER_AGENT=your_user_agent_string
ZALO_SELF_LISTEN=false
ZALO_CHECK_UPDATE=true
ZALO_LOGGING=true
```

## Obtaining Credentials

1. **Cookie**: Extract from your Zalo web client after logging in
2. **IMEI**: A unique identifier for your device (can be randomly generated for testing)
3. **User Agent**: The browser user agent string you want to use

## Configuration Options

- `ZALO_SELF_LISTEN`: Whether to listen to your own messages (default: false)
- `ZALO_CHECK_UPDATE`: Whether to check for library updates (default: true)
- `ZALO_LOGGING`: Whether to enable logging (default: true)

## Usage

Once the environment variables are set, the Zalo channel will be automatically initialized when the application starts. The system implements a singleton pattern to ensure only one instance of the Zalo adapter runs at a time, preventing conflicts.

## Shutdown

The Zalo channel implements graceful shutdown procedures that automatically clean up resources when the application terminates.