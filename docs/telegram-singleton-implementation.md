# 🔄 Telegram Singleton Pattern Implementation

## Overview

This document explains the singleton pattern implementation for the TelegramChannelAdapter to ensure only one instance exists per bot token, complying with Telegram's API requirements.

## Why Singleton Pattern?

Telegram Bot API has specific limitations that require careful handling:

1. **One Webhook per Bot**: Only one webhook can be active for a bot at any time
2. **Polling Conflicts**: Multiple polling instances can cause message delivery issues
3. **Rate Limiting**: Multiple instances can trigger rate limiting more quickly
4. **Resource Waste**: Unnecessary multiple instances consume system resources

## Implementation Details

### 1. Instance Registry

```typescript
private static instances: Map<string, TelegramChannelAdapter> = new Map();
```

A static Map stores all active instances, keyed by a unique token identifier.

### 2. Token-based Key Generation

```typescript
private generateTokenKey(token: string): string {
  return token.substring(0, 10);
}
```

Uses the first 10 characters of the token as a key for identification while maintaining security.

### 3. Instance Creation Logic

In the constructor:

```typescript
constructor(config: Partial<TelegramConfig>) {
  // Validate config first to ensure we have a token
  const validatedConfig = validateTelegramConfig(config);
  
  // Create a unique key based on the token
  const tokenKey = this.generateTokenKey(validatedConfig.token);
  
  // Check if an instance already exists for this token
  if (TelegramChannelAdapter.instances.has(tokenKey)) {
    console.log(`⚠️ [Telegram] Instance already exists for token prefix ${tokenKey}, returning existing instance`);
    return TelegramChannelAdapter.instances.get(tokenKey)!;
  }
  
  // Continue with normal initialization...
  
  // Store this instance
  TelegramChannelAdapter.instances.set(tokenKey, this);
}
```

### 4. Proper Cleanup

```typescript
async shutdown(): Promise<void> {
  console.log('🛑 Shutting down Telegram adapter...');
  try {
    // Stop polling
    this.bot.stopPolling();
    
    // Delete webhook if exists
    await this.bot.deleteWebHook();
    
    // Remove this instance from the registry
    const tokenKey = this.generateTokenKey(this.config.token);
    TelegramChannelAdapter.instances.delete(tokenKey);
    
    console.log('✅ Telegram adapter shut down successfully');
  } catch (error) {
    console.error('❌ [Telegram] Error shutting down adapter:', error);
  }
}
```

### 5. Utility Methods

```typescript
static isTokenInUse(token: string): boolean {
  const tokenKey = token.substring(0, 10);
  return this.instances.has(tokenKey);
}

static getActiveInstances(): string[] {
  return Array.from(this.instances.keys());
}
```

## Integration with Mastra Initialization

The Mastra index file includes additional checks to prevent conflicts:

```typescript
// Check if token is already in use by an existing instance
if (TelegramChannelAdapter.isTokenInUse(process.env.TELEGRAM_BOT_TOKEN)) {
  console.log('⚠️ Telegram bot token already in use, skipping initialization to prevent conflicts');
} else {
  // Proceed with initialization
}
```

## Benefits

1. **Prevents Conflicts**: Ensures only one instance receives messages from each bot
2. **Resource Efficiency**: Reduces unnecessary resource consumption
3. **Error Prevention**: Prevents webhook and polling conflicts
4. **Maintainability**: Clear instance management and cleanup
5. **Compatibility**: Works seamlessly with existing Mastra architecture

## Usage Examples

### Basic Usage (No Changes Required)

```typescript
const adapter = new TelegramChannelAdapter({
  token: process.env.TELEGRAM_BOT_TOKEN
});
// If an instance already exists, the existing one will be returned
```

### Checking Token Usage

```typescript
if (TelegramChannelAdapter.isTokenInUse(token)) {
  console.log('Token is already in use');
}
```

### Getting Active Instances

```typescript
const activeTokens = TelegramChannelAdapter.getActiveInstances();
console.log('Active Telegram bot instances:', activeTokens);
```

## Testing Considerations

When testing, ensure that:

1. Instances are properly shut down after tests
2. The static registry is cleared between test runs if needed
3. Multiple instantiations with the same token return the same instance

This implementation ensures robust, conflict-free operation of Telegram bots within the Mastra framework while maintaining full compatibility with existing code.