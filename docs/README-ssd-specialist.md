# SSD Specialist Implementation

## Overview
This implementation adds SSD (Solid State Drive) specialist support to the SSTC agent system. The `SSDSpecialist` is a unified agent that provides expert advice on SSD products, handles data analysis, and can generate human-readable responses.

## Components

### 1. Unified SSD Specialist Agent (`ssd-specialist.ts`)
- A single, frontend-facing agent that can directly interact with customers or provide data to other agents.
- Provides expert advice on SSD products.
- Uses the `ssdDatabaseTool` for product information.
- Can generate both structured data and human-readable responses.

### 2. SSD Database Tool (`ssd-database-tool.ts`)
- An enhanced tool that returns structured specialist data for SSDs.

### 3. Data Models (`specialist-data-models.ts`)
- `StorageSpecialistData`: Interface for SSD specialist data.
- `StorageProductRecommendation`: Interface for individual SSD product recommendations.
- `StorageTechnicalAnalysis`: Interface for technical analysis of SSD products.

## Integration with Workflow

### Message Processor Updates
The message processor has been updated to:
1. Detect SSD-related queries using keyword matching.
2. Route SSD queries directly to the unified `ssdSpecialist`.
3. The `ssdSpecialist` retrieves structured data using its tool.
4. The final data is integrated into Mai's responses for the customer.

## Features

### 1. Product Search & Filtering
- Search by capacity (120GB, 250GB, 500GB, 1TB, 2TB, etc.)
- Filter by interface (SATA, NVMe)
- Filter by form factor (2.5 inch, M.2 2280, etc.)
- Budget-based filtering
- Use case matching (gaming, content creation, office)

### 2. Technical Analysis
- Performance metrics (read/write speeds, IOPS)
- Durability analysis (TBW ratings)
- Compatibility checking
- Price/performance analysis

### 3. Structured & Human-Readable Output
- The agent can provide raw structured data for other agents or generate a formatted, easy-to-understand response for a human user.

## Usage Examples

### Customer Queries Supported
1. "Tôi cần SSD 1TB cho gaming"
2. "SSD 500GB giá dưới 1 triệu"
3. "SSD cho làm video 4K"
4. "SSD NVMe 1TB cho laptop gaming"
5. "So sánh SSD SATA và NVMe"
