 # SSTC Agent System Architecture

## Core Components

### 1. Mastra Framework Setup
- File: src/mastra/index.ts
- The main Mastra instance is configured with:
  - A workflow for message processing (channelMessageWorkflow)
  - An AI agent (maiSale)
  - LibSQL storage for persistence (using in-memory storage by default)
  - Pino logger for logging

### 2. Message Processing Pipeline
- Central Processor: src/mastra/core/processor/message-processor.ts
  - Handles all incoming messages through a standardized workflow
  - Deduplicates messages using a Set to track processed message IDs, with automatic cleanup after 5 minutes
  - Uses Mastra workflows for business logic

### 3. Workflow System
- File: src/mastra/workflows/message-processor.ts
- Implements a two-step workflow:
  1. Intent analysis (currently a placeholder implementation with fixed values)
  2. Response generation using the maiSale agent

### 4. AI Agent (maiSale)
- File: src/mastra/agents/mai-agent.ts
- A sales assistant agent with a detailed personality profile embedded directly in the code
- Uses LibSQL for memory storage
- Integrates with Chroma vector database for semantic search
- Has a comprehensive personality defining communication style, behavior patterns, and session management
- Manages user profiles with confidence scoring for stored information

### 5. Channel System
- Interface: src/mastra/core/channels/interface.ts
- Registry: src/mastra/core/channels/registry.ts
- Supports multiple channels with a standardized adapter pattern
- Telegram and Zalo channels are currently implemented with proper configuration

### 6. Telegram Channel Implementation
- Adapter: src/mastra/channels/telegram/adapter.ts
- Implements the ChannelAdapter interface
- Uses local copy of node-telegram-bot-api library to avoid dependency conflicts
- Uses polling by default to receive messages (configurable interval)
- Handles various message types including:
  - Text messages
  - Photo messages
  - Document messages
  - Voice messages
  - Audio messages
  - Video messages
  - Animation messages (GIFs)
  - Sticker messages
  - Video note messages
  - Contact messages
  - Location messages
- Converts Telegram messages to standardized format with proper attachment handling
- Sends responses back through Telegram with appropriate formatting including:
  - Plain text with Markdown support
  - Quick reply buttons
  - Images with captions
  - Documents with captions
  - Audio with captions
  - Video with captions
- Implements singleton pattern to prevent multiple instances
- Graceful shutdown procedure to clean up resources

### 7. Zalo Channel Implementation
- Adapter: src/mastra/channels/zalo/adapter.ts
- Implements the ChannelAdapter interface
- Uses local copy of zca-js library to avoid dependency conflicts
- Uses cookie-based authentication with IMEI and user agent
- Handles text messages from Zalo users
- Converts Zalo messages to standardized format
- Sends responses back through Zalo with appropriate formatting
- Implements singleton pattern to prevent multiple instances
- Graceful shutdown procedure to clean up resources

### 8. Data Models
- Messages: src/mastra/core/models/message.ts
  - Defines NormalizedMessage and ProcessedResponse interfaces
  - Standardized format for all channels with support for attachments and metadata
- User Profile: src/mastra/core/models/user-profile-schema.ts
  - Zod schema for user profile with confidence scoring for interests, goals, and pain points
  - Includes fields for name, language, location, timezone, interests, preferences, goals, last interaction, email, phone, and pain points

### 9. External Services Integration
- Database: LibSQL configuration in src/mastra/database/libsql.ts
- Vector Storage: Chroma integration in src/mastra/vector/chroma.ts
- Embedding: OpenAI-compatible embedding provider in src/mastra/embedding/provider.ts
- LLM: OpenAI-compatible LLM provider in src/mastra/llm/provider.ts

## Key Features

1. Multi-channel Support: Designed to work with Telegram, Zalo, WhatsApp, Web, and other channels
2. Singleton Pattern: Channel adapters use proper initialization to prevent conflicts
3. Message Deduplication: Prevents processing the same message multiple times using message ID tracking with automatic cleanup
4. Rich Media Support: Handles various message types with proper attachment processing
5. Session Management: Tracks conversation state and user profiles through the maiSale agent's personality profile
6. Error Handling: Comprehensive error handling for all components including graceful shutdown procedures
7. Configurable: Uses environment variables for all external service configuration (TELEGRAM_BOT_TOKEN, ZALO_COOKIE, etc.)

## Architecture Patterns

1. Adapter Pattern: For channel integration
2. Workflow Pattern: For message processing
3. Registry Pattern: For managing active channels
4. Factory Pattern: For creating LLM and embedding providers

This is a well-structured system that follows modern software architecture principles and is designed for extensibility to support additional channels in the future.