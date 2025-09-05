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
- `TELEGRAM_BOT_TOKEN` - For Telegram channel
- `ZALO_COOKIE`, `ZALO_IMEI`, `ZALO_USER_AGENT` - For Zalo channel  
- LLM provider configuration (OpenAI-compatible)
- ChromaDB connection details