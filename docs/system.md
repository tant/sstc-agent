 Core Components

  1. Mastra Framework Setup
   - File: src/mastra/index.ts
   - The main Mastra instance is configured with:
     - A workflow for message processing (channelMessageWorkflow)
     - An AI agent (maiSale)
     - LibSQL storage for persistence
     - Pino logger for logging

  2. Message Processing Pipeline
   - Central Processor: src/mastra/core/processor/message-processor.ts
     - Handles all incoming messages through a standardized workflow
     - Deduplicates messages to prevent double processing
     - Uses Mastra workflows for business logic

  3. Workflow System
   - File: src/mastra/workflows/message-processor.ts
   - Implements a two-step workflow:
     1. Intent analysis (placeholder implementation)
     2. Response generation using the maiSale agent

  4. AI Agent (maiSale)
   - File: src/mastra/agents/mai-agent.ts
   - A sales assistant agent with a detailed personality profile
   - Uses LibSQL for memory storage
   - Integrates with Chroma vector database for semantic search
   - Has a comprehensive personality defining communication style, behavior patterns, and session management

  5. Channel System
   - Interface: src/mastra/core/channels/interface.ts
   - Registry: src/mastra/core/channels/registry.ts
   - Supports multiple channels with a standardized adapter pattern
   - Telegram channel is currently implemented with singleton pattern to prevent conflicts

  6. Telegram Channel Implementation
   - Adapter: src/mastra/channels/telegram/adapter.ts
   - Implements the ChannelAdapter interface
   - Uses polling to receive messages
   - Handles various message types (text, images, documents, voice, etc.)
   - Converts Telegram messages to standardized format
   - Sends responses back through Telegram with appropriate formatting

  7. Data Models
   - Messages: src/mastra/core/models/message.ts
     - Defines NormalizedMessage and ProcessedResponse interfaces
     - Standardized format for all channels
   - User Profile: src/mastra/core/models/user-profile-schema.ts
     - Zod schema for user profile with confidence scoring

  8. External Services Integration
   - Database: LibSQL configuration in src/mastra/database/libsql.ts
   - Vector Storage: Chroma integration in src/mastra/vector/chroma.ts
   - Embedding: OpenAI-compatible embedding provider in src/mastra/embedding/provider.ts
   - LLM: OpenAI-compatible LLM provider in src/mastra/llm/provider.ts

  Key Features

   1. Multi-channel Support: Designed to work with Telegram, WhatsApp, Web, and other channels
   2. Singleton Pattern: Telegram adapter uses singleton to prevent multiple instances with the same token
   3. Message Deduplication: Prevents processing the same message multiple times
   4. Rich Media Support: Handles various Telegram message types
   5. Session Management: Tracks conversation state and user profiles
   6. Error Handling: Comprehensive error handling for all components
   7. Configurable: Uses environment variables for all external service configuration

  Architecture Patterns

   1. Adapter Pattern: For channel integration
   2. Singleton Pattern: For Telegram adapter instances
   3. Workflow Pattern: For message processing
   4. Registry Pattern: For managing active channels
   5. Factory Pattern: For creating LLM and embedding providers

  This is a well-structured system that follows modern software architecture principles and is designed for extensibility to support additional channels in the future.