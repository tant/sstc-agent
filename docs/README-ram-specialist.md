# RAM Specialist Implementation

## Overview
This implementation adds RAM (Random Access Memory) specialist support to the SSTC agent system. The `RAMSpecialist` is a unified agent that provides expert advice on RAM products, handles data analysis, and can generate human-readable responses.

## Components

### 1. Unified RAM Specialist Agent (`ram-specialist.ts`)
- A single, unified agent that provides expert advice on RAM products.
- Uses the `ramDatabaseTool` for product information.
- Can generate both structured data for other agents and human-readable responses for users.

### 2. RAM Database Tool (`ram-database-tool.ts`)
- An enhanced tool that returns structured specialist data for RAM products.

### 3. Data Models (`specialist-data-models.ts`)
- `RAMSpecialistData`: Interface for RAM specialist data.
- `RAMProductRecommendation`: Interface for individual RAM product recommendations.
- `RAMTechnicalAnalysis`: Interface for technical analysis of RAM products.

## Integration with Workflow

### Message Processor Updates
The message processor has been updated to:
1. Detect RAM-related queries using keyword matching.
2. Route RAM queries directly to the unified `ramSpecialist`.
3. The `ramSpecialist` retrieves structured data using its tool.
4. The final data is integrated into Mai's responses for the customer.

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
