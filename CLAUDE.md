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

## Development Principles & Constraints

### Critical Success Criteria
- **ALWAYS ensure project builds successfully** - This is the minimum completion criteria
- **Test on full/complex system** - Never use simplified configurations for testing
- **Never create new agents without approval** - Work with current agents only

### Code Quality Standards
- **Code Style**: Uses Biome with tab indentation and double quotes
- **TypeScript**: ES2022 modules with strict type checking
- **Build First**: Any change must maintain successful build status
- **Consistent Patterns**: All specialist agents follow identical patterns

## Architecture Overview

This is a **multi-agent AI system** built with the **Mastra framework** for SSTC (computer hardware retailer) sales and support. The system coordinates multiple specialized agents through a central Mai agent.

### Current Agent Architecture (7 Active Agents)

**Main Entry Point**: `src/mastra/index.ts` - Full system with all agents, channels, and features

**Active Agents**:
- **Mai Agent** (`mai-agent.ts`) - Central coordinator, handles customer interactions in Vietnamese
- **Hardware Specialists** - Optimized and consistent:
  - `cpu-specialist.ts` - CPU recommendations and compatibility  
  - `ram-specialist.ts` - Memory specifications and compatibility
  - `ssd-specialist.ts` - Storage solutions and performance
  - `barebone-specialist.ts` - Case and motherboard combinations
  - `desktop-specialist.ts` - Complete PC builds
- **Support Agents**:
  - `clarification-agent.ts` - Intent clarification
  - `an-data-analyst.ts` - Data analysis and insights

### Multi-Channel Support
- **Telegram** (`channels/telegram/`) - Bot integration with graceful shutdown
- **Zalo** (`channels/zalo/`) - Vietnamese messaging platform with full lifecycle management
- **Web** (`channels/web/`) - HTTP API endpoints via Mastra server

### Data Layer
- **Vector Database**: ChromaDB for product embeddings and semantic search
- **Storage**: LibSQL (in-memory for development, can persist with file:../mastra.db)
- **Memory**: Optimized shared context management across agents
- **Tools**: Consistent database query tools for each product category

### AI Services Architecture (Self-hosted)
- **LLM Provider**: Self-hosted vLLM server (OpenAI-compatible)
  - Base URL: `VLLM_BASE_URL` or `OPENAI_API_BASE_URL` 
  - API key: `VLLM_API_KEY` or `OPENAI_API_KEY`
  - Model: `GENERATE_MODEL` (default: `gpt-oss-20b`)
- **Embedding Service**: Self-hosted embedding server
  - Base URL: `EMBEDDER_BASE_URL`
  - API key: `EMBEDDER_API_KEY` 
  - Model: `EMBEDDER_MODEL` (default: `BAAI/bge-m3-unsupervised`)
- **Provider Configuration**: `src/mastra/llm/provider.ts` and `src/mastra/embedding/provider.ts`

### Optimized Core Infrastructure
- **Memory Management**: `src/mastra/core/memory/optimized-memory-manager.ts` - Unified, cached memory management
- **Processing**: `src/mastra/core/optimized-processing.ts` - Combined parallel processing, timeouts, and signal handling
- **Message Workflow**: `workflows/message-processor.ts` - Routes messages between channels and agents

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

## Mastra API Endpoints Guide

### Development Server URLs
- **Local Server**: http://localhost:4111
- **API Base**: http://localhost:4111/api  
- **OpenAPI Spec**: http://localhost:4111/openapi.json
- **Swagger UI**: http://localhost:4111/swagger-ui (Interactive API testing)
- **Playground**: http://localhost:4111 (Visual agent/workflow testing)

### Current Active Agents (API IDs)
- `maiSale` - Main Vietnamese sales agent for hardware consultation
- `anDataAnalyst` - Data analysis and insights
- `clarification` - Intent clarification helper
- `ram` - RAM specialist
- `cpu` - CPU specialist  
- `ssd` - SSD specialist
- `barebone` - Case/motherboard specialist
- `desktop` - Complete PC build specialist

### Key Agent Endpoints

#### List All Agents
```bash
GET /api/agents
curl http://localhost:4111/api/agents
```

#### Agent Generation (Use VNext for AI SDK v5)
```bash
POST /api/agents/{agentId}/generate/vnext
# Example:
curl -X POST http://localhost:4111/api/agents/cpu/generate/vnext \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Tôi cần CPU gaming tầm 10 triệu"}]}'
```

#### Execute Workflow
```bash
POST /api/workflows/channelMessageWorkflow/execute
# Example request body:
{
  "channelId": "web",
  "userId": "user123", 
  "message": "Xin chào, tôi cần tư vấn CPU",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Current Project Structure

### Optimized Core Structure
```
src/mastra/
├── agents/                    # 🤖 7 Active Agents (All Optimized)
│   ├── mai-agent.ts          # Main sales agent (Vietnamese)
│   ├── cpu-specialist.ts     # CPU specialist (Optimized & Consistent)
│   ├── ram-specialist.ts     # RAM specialist (Optimized & Consistent)
│   ├── ssd-specialist.ts     # SSD specialist (Optimized & Consistent)
│   ├── barebone-specialist.ts # Barebone specialist (Optimized & Consistent)
│   ├── desktop-specialist.ts # Desktop specialist
│   ├── clarification-agent.ts # Intent clarification
│   └── an-data-analyst.ts    # Data analysis
│
├── workflows/                 # ⚡ Business Logic Workflows  
│   └── message-processor.ts  # Main message routing workflow
│
├── tools/                     # 🛠️ Consistent Agent Tools
│   ├── cpu-database-tool.ts  # CPU product database queries
│   ├── ram-database-tool.ts  # RAM product database queries  
│   ├── ssd-database-tool.ts  # SSD product database queries
│   ├── barebone-database-tool.ts # Case/motherboard queries
│   ├── desktop-database-tool.ts # Complete build queries
│   ├── find-promotions-tool.ts # Promotional offers tool
│   └── clarify-intent-tool.ts # Intent clarification tool
│
├── channels/                  # 📡 Communication Channels
│   ├── telegram/             # Telegram bot integration
│   ├── zalo/                 # Zalo messaging platform
│   └── web/                  # Web API endpoints
│
├── core/                      # 🏗️ Optimized Core Infrastructure
│   ├── models/               # Data models and types
│   ├── memory/               # Optimized memory management
│   ├── channels/             # Channel registry
│   └── optimized-processing.ts # Combined processing utilities
│
├── database/libsql.ts        # LibSQL configuration
├── embedding/provider.ts     # Self-hosted embedding service config
├── llm/provider.ts          # Self-hosted vLLM server config
├── schemas/                  # Data validation schemas
├── vector/chroma.ts         # ChromaDB configuration
└── index.ts                 # 🚀 Full System Configuration (Default)
```

## Development Guidelines

### Working with Existing Agents

#### Agent Consistency Standards
All specialist agents follow identical patterns:
- **Tool Execution**: Direct parameter passing (no context wrapper)
- **Null Safety**: Consistent `?.` and `??` operators
- **Structured Output**: All include `model: this.model`
- **Error Handling**: Standardized try/catch patterns

#### Modifying Specialists
When making changes to CPU, RAM, SSD, or Barebone specialists:
1. Apply the same change to all four specialists
2. Maintain identical naming conventions
3. Keep the same logic flow and structure
4. Test that the project builds successfully

#### Adding New Tools
```typescript
// src/mastra/tools/new-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const newTool = createTool({
  id: "new-tool",
  description: "Tool description",
  inputSchema: z.object({...}),
  outputSchema: z.object({...}),
  execute: async ({ query, ...params }) => {
    // Direct parameter access (no context wrapper)
  },
});
```

#### Registering in Main Config
```typescript  
// src/mastra/index.ts - Add to existing agents/tools
export const mastra = new Mastra({
  agents: {
    maiSale,
    // ... existing agents
    // Add new agents here only with approval
  },
  // ... rest of config
});
```

## Important Development Notes

### Critical Rules
- **Product Data**: All product recommendations must come from actual database entries - never invent products
- **Agent Coordination**: Specialist coordination happens behind-the-scenes, invisible to customers
- **Build Success**: Any code change must maintain successful project build
- **Full System Testing**: Always test with complete agent system (never simplified versions)
- **No New Agents**: Work with current 7 agents only, no new agents without explicit approval

### Performance Optimizations Completed
- ✅ Memory management consolidated (76% reduction in code)
- ✅ Processing utilities optimized (76% reduction in code) 
- ✅ TypeScript errors fixed across all specialists
- ✅ Consistent patterns applied to all specialist agents
- ✅ Structured output configurations standardized
- ✅ Simplified index.ts to single full-system configuration

### Quality Assurance
- **Testing**: Focus on agent behavior consistency and hardware specialist accuracy
- **Memory Management**: Optimized shared context between agents for conversation continuity
- **Error Recovery**: Graceful shutdown handling for all channels
- **Type Safety**: Strict TypeScript checking with consistent null safety patterns

This documentation reflects the current optimized state of the SSTC multi-agent system with focus on maintainability, consistency, and successful builds.