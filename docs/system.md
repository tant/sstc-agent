# SSTC Multi-Agent System - Current Architecture

This document describes the current optimized architecture, components, and operational flow of the SSTC Agent system as of September 2025.

## 1. System Overview

The system is built as a **multi-agent AI platform** using the **Mastra framework**, optimized for SSTC (computer hardware retailer) sales and support operations. The current architecture emphasizes **performance, consistency, and maintainability**.

### Core Design Principles
- **Build-First Development**: Every change must maintain successful project builds
- **Full System Testing**: Always test with complete 8-agent architecture  
- **Agent Consistency**: All specialist agents follow identical patterns and structures
- **Self-hosted AI**: Uses private vLLM and embedding servers (no external API dependencies)

## 2. Current Architecture Components

### 2.1. Main Entry Point (`src/mastra/index.ts`)

**Single, comprehensive configuration** that initializes the complete system:

- **Full Agent Registry**: All 7 agents loaded by default
- **Multi-Channel Support**: Telegram, Zalo, Web channels with graceful shutdown
- **Optimized Memory**: Unified memory management with caching
- **Signal Handling**: Proper cleanup on termination

### 2.2. Agent Architecture (8 Active Agents)

**Mai Agent** (`mai-agent.ts`)
- Central coordinator with warm Vietnamese personality
- Handles customer-facing interactions
- Silently coordinates with specialists behind the scenes

**Hardware Specialists** (Optimized & Consistent)
- `cpu-specialist.ts` - CPU recommendations and compatibility
- `ram-specialist.ts` - Memory specifications and compatibility  
- `ssd-specialist.ts` - Storage solutions and performance
- `barebone-specialist.ts` - Case and motherboard combinations
- `desktop-specialist.ts` - Complete PC builds

**Support Agents**
- `clarification-agent.ts` - Intent clarification
- `an-data-analyst.ts` - Data analysis and insights

### 2.3. Optimized Core Infrastructure

**Memory Management** (`src/mastra/core/memory/optimized-memory-manager.ts`)
- **76% code reduction** from previous implementation
- Unified singleton pattern with TTL caching
- Shared context management across all agents
- User profile tracking and conversation continuity

**Processing Engine** (`src/mastra/core/optimized-processing.ts`)  
- **76% code reduction** from previous implementation
- Combined parallel processing, timeout utilities, and signal management
- Graceful shutdown handling for all channels
- Background task coordination

**Message Workflow** (`src/mastra/workflows/message-processor.ts`)
- Single comprehensive workflow for all message routing
- Intent analysis and agent dispatching
- Parallel processing for specialist consultation
- Context preservation across conversations

## 3. Agent Consistency Standards

All hardware specialist agents follow **identical patterns** for maintainability:

### 3.1. Tool Execution Pattern
```typescript
// Consistent across CPU, RAM, SSD, Barebone specialists
const toolResult = await tool.execute({
  query: "search_query",
  budget: { min: 0, max: 999999999 },
  ...params
} as any);
```

### 3.2. Null Safety Pattern
```typescript
// Consistent null safety across all specialists
criteria.budget?.min ?? 0
rec.specifications?.property ?? defaultValue
```

### 3.3. Structured Output Pattern
```typescript
// All specialists include model parameter
{
  structuredOutput: { 
    schema: SpecialistSummarySchema,
    model: this.model 
  }
}
```

### 3.4. Error Handling Pattern
- Standardized try/catch blocks
- Consistent logging formats
- Graceful degradation strategies

## 4. Multi-Channel Integration

### 4.1. Channel Support
- **Telegram**: Bot integration with auto-initialization
- **Zalo**: Vietnamese messaging platform with lifecycle management  
- **Web**: HTTP API endpoints via Mastra server

### 4.2. Channel Registry (`src/mastra/core/channels/registry.ts`)
- Centralized channel management
- Dynamic registration/deregistration
- Graceful shutdown coordination

## 5. Data Architecture

### 5.1. AI Services (Self-hosted)
**vLLM Server** (LLM Provider)
- Model: `gpt-oss-20b` (configurable via `GENERATE_MODEL`)
- OpenAI-compatible endpoints
- Environment: `VLLM_BASE_URL`, `VLLM_API_KEY`

**Embedding Server**
- Model: `BAAI/bge-m3-unsupervised` (configurable via `EMBEDDER_MODEL`)
- Used for product semantic search
- Environment: `EMBEDDER_BASE_URL`, `EMBEDDER_API_KEY`

### 5.2. Database Layer
**Vector Database**: ChromaDB
- Product embeddings and semantic search
- Hardware specification matching

**Structured Storage**: LibSQL  
- Conversation history and telemetry
- In-memory for development (`:memory:`)
- Can persist with `file:../mastra.db` configuration

### 5.3. Product Database Tools
Consistent database tools for each product category:
- `cpu-database-tool.ts` - Intel/AMD CPU product queries
- `ram-database-tool.ts` - DDR4/DDR5 memory product queries
- `ssd-database-tool.ts` - Storage device product queries
- `barebone-database-tool.ts` - Case/motherboard product queries
- `desktop-database-tool.ts` - Complete build product queries

## 6. Message Processing Flow

### 6.1. Request Lifecycle
1. **Message Reception**: Via Telegram, Zalo, or Web API
2. **Channel Routing**: Channel registry forwards to message processor
3. **Intent Analysis**: `anDataAnalyst` determines user intent and needs
4. **Agent Selection**: Route to appropriate agent based on analysis
5. **Specialist Consultation**: Parallel processing for hardware expertise
6. **Response Generation**: Mai agent creates customer-friendly response
7. **Context Preservation**: Update shared memory with conversation state

### 6.2. Parallel Processing for Specialists

When hardware expertise is needed:

1. **Immediate Response**: Mai provides acknowledgment ("Em đang kiểm tra...")
2. **Background Processing**: Relevant specialist queries database
3. **Data Integration**: Specialist data merged with Mai's response  
4. **Timeout Handling**: 3-second limit with graceful fallback

### 6.3. Conversation Context Management

**Conversation ID Generation**
- Unique per user per channel per day
- Key for context retrieval and storage

**Shared Context**
- Chat history preservation
- User profile building
- Cross-agent information sharing
- Greeting status tracking

## 7. API Architecture

### 7.1. Mastra Server Endpoints
**Base URL**: `http://localhost:4111`

**Agent Endpoints**
- `GET /api/agents` - List all 8 active agents
- `POST /api/agents/{agentId}/generate/vnext` - AI SDK v5 generation
- `GET /api/agents/{agentId}/tools/{toolId}` - Agent tool access

**Workflow Endpoints**  
- `POST /api/workflows/channelMessageWorkflow/execute` - Main message processing
- `GET /api/workflows` - List available workflows

**System Endpoints**
- `GET /api` - System status
- `GET /openapi.json` - API specification
- `GET /swagger-ui` - Interactive API testing

### 7.2. Current Agent IDs
- `maiSale` - Main Vietnamese sales agent
- `cpu` - CPU specialist
- `ram` - RAM specialist  
- `ssd` - SSD specialist
- `barebone` - Case/motherboard specialist
- `desktop` - Complete PC build specialist
- `clarification` - Intent clarification
- `anDataAnalyst` - Data analysis

## 8. Performance Optimizations

### 8.1. Code Consolidation Achievements
- **Memory Management**: 76% reduction (40KB → 8KB)
- **Processing Utilities**: 76% reduction (1,006 lines → 240 lines)
- **Configuration Simplification**: Single index.ts (removed dual setup)
- **TypeScript Error Resolution**: All specialist consistency issues fixed

### 8.2. Runtime Optimizations
- **Cached Memory Access**: TTL-based user context caching
- **Parallel Agent Processing**: Simultaneous specialist consultation
- **Timeout Management**: Graceful handling of slow responses
- **Resource Cleanup**: Proper shutdown sequences for all channels

## 9. Development Guidelines

### 9.1. Critical Success Criteria
- **Build Success**: Any code change must maintain successful compilation
- **Agent Consistency**: Changes to one specialist must be applied to all four (CPU, RAM, SSD, Barebone)
- **Full System Testing**: Never use simplified configurations

### 9.2. Specialist Modification Rules
When modifying hardware specialists:
1. Apply identical changes to CPU, RAM, SSD, Barebone agents
2. Maintain consistent naming conventions
3. Preserve identical logic flow and structure  
4. Test build success after each change

### 9.3. Prohibited Actions
- **No New Agents**: Work with current 7 agents only
- **No Simplified Testing**: Always use full system configuration
- **No Pattern Inconsistency**: Maintain established specialist patterns

## 10. Future Considerations

### 10.1. Scalability Readiness
- Modular agent architecture supports horizontal scaling
- Channel registry enables easy platform additions
- Unified memory system supports multi-instance deployments

### 10.2. Maintenance Approach
- Consolidated codebase reduces maintenance overhead
- Consistent patterns simplify debugging and updates
- Self-hosted AI services eliminate external dependencies

### 10.3. Extension Points
- New product categories can follow existing specialist patterns
- Additional channels can use established adapter patterns
- Enhanced analytics through existing data collection points

## 11. System Status Summary

**Current State**: Production-ready multi-agent system
**Agent Count**: 8 active agents (optimized and consistent)
**Channel Support**: Telegram, Zalo, Web (full lifecycle management)
**Code Quality**: TypeScript strict mode, consistent patterns, successful builds
**Performance**: Optimized memory and processing (76% code reduction)
**Testing**: Full system configuration, no simplified versions

This architecture represents the mature, optimized state of the SSTC multi-agent system with emphasis on reliability, maintainability, and consistent customer experience across all hardware consultation scenarios.