# RAM Specialist Implementation

## Overview
This implementation provides RAM (Random Access Memory) specialist support in the SSTC agent system. The RAM specialist is a self-contained agent with embedded knowledge base functionality that provides expert advice on RAM products and can work both independently and with Mai agent.

## Architecture (Post-Consolidation)

### 1. Unified RAM Specialist Agent (`ram-specialist.ts`)
- **Self-contained specialist** with embedded knowledge base functionality
- **Multi-mode operation**: Backend service, direct consultant, and summary mode
- **Database integration**: Uses `ramDatabaseTool` instead of external knowledge base
- **Embedded interfaces**: All knowledge base interfaces embedded directly in the specialist
- **No external dependencies**: Eliminates need for separate knowledge base files

### 2. Key Components Embedded

#### Embedded Interfaces
- `RAMProductInfo`: RAM product details and specifications
- `RAMCompatibilityResult`: RAM compatibility analysis results
- `RAMSearchCriteria`: Search and filtering parameters

#### Embedded Compatibility Features
- DDR4/DDR5 compatibility mapping
- Form factor compatibility (UDIMM, SODIMM, ECC)
- Speed and latency compatibility validation
- Motherboard and CPU compatibility checking

#### Database Tool Integration
- `ramDatabaseTool`: Enhanced tool that returns structured specialist data
- Replaces direct LibSQL access with centralized database tool approach

### 3. Data Models (`specialist-data-models.ts`)
- `RAMSpecialistData`: Interface for RAM specialist data
- `RAMProductRecommendation`: Interface for individual RAM product recommendations
- `RAMTechnicalAnalysis`: Interface for technical analysis of RAM products

## Integration with Workflow

### Message Processor Integration
The message processor integrates with the RAM specialist:
1. **Detection**: RAM-related queries detected using keyword matching
2. **Routing**: Queries routed directly to the unified RAM specialist
3. **Processing**: RAM specialist uses embedded knowledge base and database tool
4. **Integration**: Structured data integrated into Mai's responses

### Operating Modes Support
- **Backend Service Mode**: Provides structured data for Mai agent
- **Direct Consultant Mode**: Direct customer interaction capabilities
- **Summary Mode**: Quick summary generation for parallel processing
- **Context-aware**: Leverages shared memory for personalized recommendations

## Features

### 1. Product Search & Filtering
- Search by capacity (8GB, 16GB, 32GB, etc.)
- Filter by type (DDR4, DDR5)
- Filter by form factor (UDIMM, SODIMM)
- Budget-based filtering
- Use case matching (gaming, content creation, office)

### 2. Technical Analysis
- Performance metrics (speed, latency, voltage)
- Compatibility checking with motherboards and CPUs.
- Price/performance analysis

### 3. Structured & Human-Readable Output
- The agent can provide raw structured data for other agents or generate a formatted, easy-to-understand response for a human user.

## Usage Examples

### Customer Queries Supported
1. "Tôi cần RAM 16GB cho gaming"
2. "RAM DDR5 bus 5200MHz"
3. "Tư vấn RAM cho laptop Dell"
4. "So sánh RAM DDR4 và DDR5"
