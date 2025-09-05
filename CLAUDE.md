# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `pnpm run dev` - Start development server using Mastra framework
- `pnpm run build` - Build the project using Mastra
- `pnpm run start` - Start production server

### Code Quality
- `pnpm run lint` - Lint code with Biome
- `pnpm run format` - Format code with Biome  
- `pnpm run check` - Run Biome checks
- `pnpm run fix` - Apply Biome fixes automatically

### Testing & Analysis
- `pnpm run test:hardware` - Run hardware specialist tests
- `pnpm run test:e2e` - Run end-to-end tests
- `pnpm run test:logs` - View test logs
- `pnpm run test:analyze` - Analyze test conversations
- `pnpm run check:system` - Test LLM readiness

### Data Management
- `pnpm run sync:products` - Sync product data to vector database

## Architecture Overview

This is a **multi-agent AI system** built with the **Mastra framework** for SSTC (computer hardware retailer) sales and support. The system coordinates multiple specialized agents through a central Mai agent.

### Core Components

**Main Entry Point**: `src/mastra/index.ts` - Initializes Mastra with all agents, workflows, and channels

**Agent Architecture**:
- **Mai Agent** (`mai-agent.ts`) - Central coordinator with warm personality, handles customer interactions
- **Specialist Agents** - Domain experts for different hardware categories:
  - `cpu-specialist.ts` - CPU recommendations and compatibility  
  - `ram-specialist.ts` - Memory specifications and compatibility
  - `ssd-specialist.ts` - Storage solutions and performance
  - `barebone-specialist.ts` - Case and motherboard combinations
  - `desktop-specialist.ts` - Complete PC builds
- **Support Agents**:
  - `clarification-agent.ts` - Intent clarification
  - `an-data-analyst.ts` - Data analysis and insights

**Behind-the-Scenes Coordination**: Mai silently coordinates with specialists without exposing this to customers. Only real database products are presented.

### Multi-Channel Support
- **Telegram** (`channels/telegram/`) - Bot integration
- **Zalo** (`channels/zalo/`) - Vietnamese messaging platform  
- **Web** (`channels/web/`) - HTTP API endpoints

### Data Layer
- **Vector Database**: ChromaDB for product embeddings and semantic search
- **Storage**: LibSQL for telemetry and structured data
- **Memory**: Shared context management across agents
- **Tools**: Database query tools for each product category

### AI Services Architecture
- **LLM Provider**: Self-hosted vLLM server (OpenAI-compatible) running model `gpt-oss-20b`
  - Base URL configured via `VLLM_BASE_URL` or `OPENAI_API_BASE_URL` 
  - API key via `VLLM_API_KEY` or `OPENAI_API_KEY`
  - Model name via `GENERATE_MODEL` (default: `gpt-oss-20b`)
- **Embedding Service**: Self-hosted embedding server (OpenAI-compatible)
  - Base URL configured via `EMBEDDER_BASE_URL`
  - API key via `EMBEDDER_API_KEY` 
  - Model configured via `EMBEDDER_MODEL` (default: `BAAI/bge-m3-unsupervised`)
- **Provider Configuration**: Located in `src/mastra/llm/provider.ts` and `src/mastra/embedding/provider.ts`

### Key Workflows
- **Message Processing** (`workflows/message-processor.ts`) - Routes messages between channels and agents
- **Parallel Processing Framework** (`core/parallel-processing/`) - Handles concurrent agent coordination

## Important Development Notes

- **Product Data**: All product recommendations must come from actual database entries - never invent products
- **Agent Coordination**: Specialist coordination happens behind-the-scenes, invisible to customers
- **Code Style**: Uses Biome with tab indentation and double quotes
- **TypeScript**: ES2022 modules with strict type checking
- **Testing**: Focus on agent behavior consistency and hardware specialist accuracy
- **Memory Management**: Shared context between agents for conversation continuity

## Environment Setup

Required environment variables for full functionality:

### Channel Configuration
- `TELEGRAM_BOT_TOKEN` - For Telegram channel integration
- `ZALO_COOKIE`, `ZALO_IMEI`, `ZALO_USER_AGENT` - For Zalo channel integration

### AI Services Configuration (Self-hosted)
**LLM Provider (vLLM Server):**
- `VLLM_BASE_URL` or `OPENAI_API_BASE_URL` - Base URL for self-hosted vLLM server
- `VLLM_API_KEY` or `OPENAI_API_KEY` - API key for vLLM authentication  
- `GENERATE_MODEL` - Model name (default: `gpt-oss-20b`)

**Embedding Service:**
- `EMBEDDER_BASE_URL` - Base URL for self-hosted embedding server
- `EMBEDDER_API_KEY` - API key for embedding service authentication
- `EMBEDDER_MODEL` - Embedding model name (default: `BAAI/bge-m3-unsupervised`)

### Database Configuration
- ChromaDB connection details for vector storage
- LibSQL configuration for structured data storage

**Note**: This system uses **self-hosted AI services**, not OpenAI's commercial API. Both the LLM and embedding services run on local/private infrastructure using OpenAI-compatible endpoints.

## Mastra API Endpoints Guide

### Development Server URLs
- **Local Server**: http://localhost:4111
- **API Base**: http://localhost:4111/api  
- **OpenAPI Spec**: http://localhost:4111/openapi.json
- **Swagger UI**: http://localhost:4111/swagger-ui (Interactive API testing)
- **Playground**: http://localhost:4111 (Visual agent/workflow testing)

### Agent Endpoints

#### List All Agents
```bash
GET /api/agents
# Returns: JSON object with all available agents and their configurations
curl http://localhost:4111/api/agents
```

#### Get Specific Agent
```bash
GET /api/agents/{agentId}
# Example:
curl http://localhost:4111/api/agents/maiSale
```

#### Agent Generation (AI SDK v5 Compatible)
```bash
# For AI SDK v5 / V1 models - Use VNext endpoints
POST /api/agents/{agentId}/generate/vnext
POST /api/agents/{agentId}/stream/vnext

# For legacy AI SDK / V2 models - Use regular endpoints  
POST /api/agents/{agentId}/generate
POST /api/agents/{agentId}/stream

# Example request body:
{
  "messages": [
    {"role": "user", "content": "Xin chào, tôi muốn mua laptop gaming"}
  ],
  "threadId": "optional-thread-id",
  "resourceId": "optional-resource-id"
}
```

#### Advanced Generation Options (VNext)
```bash
POST /api/agents/{agentId}/generate/vnext
# Extended request body with additional options:
{
  "messages": [...],
  "instructions": "Optional instruction override",
  "context": [...],
  "memory": {
    "threadId": "string",
    "resourceId": "string"
  },
  "toolChoice": "auto|none|required",
  "modelSettings": {
    "maxTokens": 1000,
    "temperature": 0.7,
    "topP": 0.9
  }
}
```

### Workflow Endpoints

#### List All Workflows  
```bash
GET /api/workflows
# Returns: JSON object with all available workflows and their schemas
curl http://localhost:4111/api/workflows
```

#### Get Specific Workflow
```bash
GET /api/workflows/{workflowId}
# Example:
curl http://localhost:4111/api/workflows/simpleMessageWorkflow
```

#### Execute Workflow
```bash
POST /api/workflows/{workflowId}/execute
# Example request body:
{
  "channelId": "web",
  "userId": "user123", 
  "message": "Xin chào, tôi cần tư vấn laptop",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Tool Endpoints

#### Get Agent Tools
```bash
GET /api/agents/{agentId}/tools/{toolId}
# Example:
curl http://localhost:4111/api/agents/maiSale/tools/cpu-database-search
```

#### Execute Tool
```bash
POST /api/agents/{agentId}/tools/{toolId}/execute
# Example request body:
{
  "data": {
    "query": "Intel i7 gaming",
    "budget": {"min": 5000000, "max": 15000000}
  }
}
```

### System Endpoints

#### API Status
```bash
GET /api
# Returns: "Hello to the Mastra API!"
```

#### Model Providers
```bash
GET /api/model-providers
# Returns: List of available model providers and keys
```

### Voice Endpoints (if enabled)

#### Text-to-Speech
```bash
POST /api/agents/{agentId}/voice/speak
# Request body:
{
  "input": "Text to convert to speech",
  "options": {
    "speaker": "speaker-id"
  }
}
```

#### Speech-to-Text
```bash
POST /api/agents/{agentId}/voice/listen
# Upload audio file as multipart/form-data
```

### Error Handling

#### Common Error Responses
- **404**: Agent/workflow/tool not found
- **400**: Missing or invalid request parameters  
- **Model Compatibility Errors**:
  - "V2 models are not supported, use generateVNext instead"
  - "V1 models are not supported, use stream instead"

### Testing Recommendations

1. **Use Swagger UI**: Visit http://localhost:4111/swagger-ui for interactive testing
2. **Use Playground**: Visit http://localhost:4111 for visual agent testing
3. **Check OpenAPI Spec**: http://localhost:4111/openapi.json for complete API documentation
4. **Model Compatibility**: Choose endpoints based on your AI SDK version:
   - AI SDK v5 → Use `/vnext` endpoints
   - Legacy AI SDK → Use regular endpoints

### Current Project Agents
- **maiSale**: Vietnamese SSTC sales agent for hardware consultation
- **simpleMessageWorkflow**: Basic message processing workflow

### Authentication
- Currently using dummy authentication in development
- Production requires proper API key configuration via environment variables

## Project Structure Guide

Based on [Mastra's official project structure guidelines](https://mastra.ai/en/docs/getting-started/project-structure), this project follows Mastra best practices with some domain-specific extensions.

### Recommended Mastra Structure
```
src/
└── mastra/
    ├── agents/           # AI agents (core Mastra component)
    ├── tools/            # Agent tools (core Mastra component)  
    ├── workflows/        # Business logic workflows (core Mastra component)
    └── index.ts         # Main Mastra configuration file
```

### Current Project Structure
```
src/
└── mastra/
    ├── agents/                    # 🤖 AI Agents
    │   ├── mai-agent.ts          # Main sales agent (Vietnamese)
    │   ├── pure-mai-agent.ts     # Simplified version for testing
    │   ├── cpu-specialist.ts     # CPU recommendation specialist
    │   ├── ram-specialist.ts     # RAM specification specialist
    │   ├── ssd-specialist.ts     # Storage solution specialist
    │   ├── barebone-specialist.ts # Case/motherboard specialist
    │   ├── desktop-specialist.ts # Complete PC build specialist
    │   └── clarification-agent.ts # Intent clarification helper
    │
    ├── workflows/                 # ⚡ Business Logic Workflows  
    │   ├── message-processor.ts  # Main message routing workflow
    │   └── simple-message-processor.ts # Simplified workflow for testing
    │
    ├── tools/                     # 🛠️ Agent Tools
    │   ├── cpu-database-tool.ts  # CPU product database queries
    │   ├── ram-database-tool.ts  # RAM product database queries  
    │   ├── ssd-database-tool.ts  # SSD product database queries
    │   ├── barebone-database-tool.ts # Case/motherboard queries
    │   ├── desktop-database-tool.ts # Complete build queries
    │   ├── find-promotions-tool.ts # Promotional offers tool
    │   └── clarify-intent-tool.ts # Intent clarification tool
    │
    ├── channels/                  # 📡 Communication Channels (SSTC Extension)
    │   ├── telegram/             # Telegram bot integration
    │   ├── zalo/                 # Zalo messaging platform (Vietnamese)
    │   └── web/                  # Web API endpoints
    │
    ├── core/                      # 🏗️ Core Infrastructure (SSTC Extension)
    │   ├── models/               # Data models and types
    │   ├── memory/               # Shared memory management
    │   └── parallel-processing/  # Agent coordination framework
    │
    ├── database/                  # 🗄️ Database Integrations (SSTC Extension)
    │   └── libsql.ts            # LibSQL configuration
    │
    ├── embedding/                 # 🔍 Vector Embeddings (SSTC Extension)
    │   └── provider.ts          # Self-hosted embedding service config
    │
    ├── llm/                       # 🧠 Language Model Config (SSTC Extension)
    │   └── provider.ts          # Self-hosted vLLM server config
    │
    ├── schemas/                   # 📋 Data Schemas (SSTC Extension)
    │   └── [validation schemas]
    │
    ├── vector/                    # 🎯 Vector Database (SSTC Extension)
    │   └── chroma.ts            # ChromaDB configuration
    │
    └── index.ts                   # 🚀 Main Mastra Configuration
```

### Root Project Files
```
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration  
├── biome.json                    # Code formatter/linter config
├── pnpm-lock.yaml               # Package lock file
├── CLAUDE.md                    # This documentation file
├── data/                        # Product data files
├── database/                    # SQLite database files
├── docs/                        # Project documentation
├── scripts/                     # Utility scripts
└── tests/                       # Test files
    └── e2e/                     # End-to-end tests
```

### Folder Organization Principles

#### ✅ **Core Mastra Components** (Follow Mastra Standards)
- **`agents/`**: Individual agent files, one per agent
- **`tools/`**: Reusable tools that agents can use
- **`workflows/`**: Business logic and process orchestration
- **`index.ts`**: Central Mastra configuration

#### 🏢 **SSTC-Specific Extensions** (Domain Extensions)
- **`channels/`**: Multi-platform communication (Telegram, Zalo, Web)
- **`core/`**: Shared infrastructure and utilities
- **`database/`**: Database connection and configuration
- **`embedding/`**: Vector embedding service configuration  
- **`llm/`**: Language model provider configuration
- **`vector/`**: Vector database setup

### File Naming Conventions

#### Agents
- Pattern: `{domain}-{role}.ts` or `{name}-agent.ts`
- Examples: `cpu-specialist.ts`, `mai-agent.ts`
- Purpose: One agent per file, focused responsibility

#### Tools  
- Pattern: `{domain}-{function}-tool.ts`
- Examples: `cpu-database-tool.ts`, `find-promotions-tool.ts`
- Purpose: Reusable tools that multiple agents can use

#### Workflows
- Pattern: `{process}-{type}.ts` or `{name}-processor.ts`  
- Examples: `message-processor.ts`, `simple-message-processor.ts`
- Purpose: Business logic orchestration

#### Channels
- Pattern: `{platform}/` folder with `index.ts`, `adapter.ts`, `config.ts`
- Examples: `telegram/`, `zalo/`, `web/`
- Purpose: Platform-specific integration code

### Best Practices

#### ✅ **Do Follow**
1. **One agent per file**: Keep agents focused and maintainable
2. **Shared tools**: Create reusable tools in `/tools` for multiple agents
3. **Clear naming**: Use descriptive, domain-specific names
4. **Mastra conventions**: Follow core Mastra folder structure for `agents/`, `tools/`, `workflows/`
5. **Separation of concerns**: Keep domain logic separate from infrastructure

#### ❌ **Avoid**
1. **Monolithic files**: Don't put all agents in one file
2. **Mixed responsibilities**: Don't mix channel logic with agent logic
3. **Custom API servers**: Use Mastra's built-in server instead of Express
4. **Overly nested structures**: Keep folder hierarchy reasonable

### Adding New Components

#### New Agent
```typescript
// src/mastra/agents/new-specialist.ts  
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const newSpecialist = new Agent({
  name: "newSpecialist", 
  instructions: "Your specialized instructions...",
  model: {
    provider: openai,
    name: "gpt-3.5-turbo",
  },
  tools: {
    // Reference tools from /tools folder
  },
});
```

#### New Tool
```typescript
// src/mastra/tools/new-function-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const newFunctionTool = createTool({
  id: "new-function-tool",
  description: "Tool description",
  inputSchema: z.object({...}),
  outputSchema: z.object({...}),
  execute: async ({ context, mastra }) => {
    // Tool logic here
  },
});
```

#### Register in Main Config
```typescript  
// src/mastra/index.ts
import { newSpecialist } from "./agents/new-specialist";
import { newFunctionTool } from "./tools/new-function-tool";

export const mastra = new Mastra({
  agents: {
    newSpecialist, // Add new agent
  },
  tools: {
    newFunctionTool, // Add new tool
  },
  // ... other config
});
```

### Migration from Custom Structure

If migrating from custom implementations:
1. **Move agents** from custom folders to `src/mastra/agents/`
2. **Convert tools** to use `createTool()` pattern
3. **Update workflows** to use Mastra workflow syntax
4. **Remove custom API servers** - use Mastra's built-in server
5. **Update imports** in `src/mastra/index.ts`

This structure balances **Mastra best practices** with the **specific needs of the SSTC multi-agent system** while maintaining clarity and maintainability.