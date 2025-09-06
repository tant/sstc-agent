# Specialist Agent Template Architecture

## Overview

This document outlines a **templated architecture** for creating new specialist agents in the SSTC system. After analyzing the four existing specialists (CPU, RAM, SSD, Barebone), I've identified a consistent pattern that can be abstracted into a **configuration-driven template system**.

## 🎯 **Goal: One-Command Specialist Creation**

```bash
# Future vision - create a new specialist with just:
npm run create-specialist --name="graphics-card" --prompt="GPU expert" --data="gpu"
```

---

## 📋 **Current Architecture Analysis**

### **Common Patterns Identified**

All four specialists follow **identical structural patterns**:

#### **1. File Structure Pattern**
```typescript
// Every specialist has these components:
├── imports (always same 15 imports)
├── ProductInfo interface (domain-specific fields)  
├── SearchCriteria interface (domain-specific filters)
├── CompatibilityResult interface (domain-specific)
├── BRAND_MAPPING constant (domain-specific brands)
├── SPECIALIST_PERSONALITY string (domain-specific prompt)
├── SpecialistClass extends Agent
└── export const specialistInstance
```

#### **2. Method Pattern (100% Identical)**
Every specialist has **exactly 16 methods**:

**Core Methods (4):**
- `getStructuredRecommendations()` 
- `generateHumanReadableResponse()`
- `generateSummaryResponse()`
- `getQuickSummary()`

**Parallel Processing Methods (3):**
- `generateStructuredResponse()`
- `generateParallelResponse()`
- `getContextAwareRecommendations()`

**Knowledge Base Methods (6):**
- `initializeKnowledgeBase()`
- `isKnowledgeBaseReady()`
- `getKnowledgeBaseStats()`
- `getProductInfo()`, `searchProducts()`, `getAllProducts()`

**Internal Methods (3):**
- `extractBrand()`, `detectSpecification()`, `getStatisticsInternal()`

#### **3. Constructor Pattern (100% Identical)**
```typescript
constructor() {
    super({
        name: "[DOMAIN] Specialist",
        description: "Expert advice for [DOMAIN] products",
        instructions: [DOMAIN]_SPECIALIST_PERSONALITY,
        model: mastraModelProvider(),
        tools: { [domain]DatabaseTool },
        memory: { /* identical LibSQL + ChromaDB config */ }
    });
    this.initializeKnowledgeBase();
}
```

---

## 🏗️ **Proposed Template Architecture**

### **Template-Based Specialist Generation**

#### **1. Configuration Object Approach**

```typescript
interface SpecialistConfig {
    // Basic Info
    domain: string;                    // "graphics-card", "motherboard" 
    displayName: string;               // "Graphics Card", "Motherboard"
    type: string;                      // "gpu", "motherboard"
    
    // Product Schema
    productFields: ProductField[];     // Define product-specific fields
    searchCriteria: SearchField[];     // Define search filters
    
    // Domain Knowledge  
    brandMapping: Record<string, string[]>;  // Brand variants
    personality: string;               // Domain expertise prompt
    
    // Optional Customizations
    compatibilityLogic?: string;       // Custom compatibility rules
    performanceMetrics?: string[];     // Domain-specific metrics
    technicalAnalysis?: string[];      // Domain-specific analysis
}
```

#### **2. Product Field Definition System**

```typescript
interface ProductField {
    name: string;           // "memory", "coreClock", "vramSize"
    type: "string" | "number" | "array" | "boolean";
    required: boolean;
    description: string;    // For AI personality understanding
}

// Example for Graphics Card:
const GPU_PRODUCT_FIELDS: ProductField[] = [
    { name: "memory", type: "string", required: true, description: "VRAM amount (e.g., '8GB', '16GB')" },
    { name: "coreClock", type: "string", required: true, description: "Base clock speed" },
    { name: "boostClock", type: "string", required: false, description: "Boost clock speed" },
    { name: "interface", type: "string", required: true, description: "Connection type (PCIe 4.0, etc.)" },
    { name: "powerConsumption", type: "string", required: true, description: "TDP in watts" },
    { name: "rayTracing", type: "boolean", required: false, description: "Ray tracing support" },
    { name: "dlssSupport", type: "boolean", required: false, description: "DLSS/FSR support" }
];
```

#### **3. Personality Template System**

```typescript
const PERSONALITY_TEMPLATE = `# {{displayName}} Specialist - SSTC {{domain}} Expert

## Core Personality
Tôi là chuyên gia tư vấn và phân tích {{domain}} của SSTC, có khả năng hoạt động ở nhiều chế độ:
- **Backend Service**: Cung cấp dữ liệu cấu trúc cho hệ thống
- **Direct Consultant**: Tương tác trực tiếp với khách hàng
- **Summary Mode**: Tạo tóm tắt nhanh cho parallel processing

## Operating Modes

### 1. Summary Mode (QUICK_SUMMARY) - For Parallel Processing
- **Purpose**: Tạo tóm tắt nhanh để hỗ trợ Mai agent trong xử lý song song
- **Tone**: Ngắn gọn, súc tích, tập trung vào thông tin cốt lõi
- **Focus**: Đưa ra danh sách sản phẩm phù hợp với điểm số và lý do

Response Format (JSON):
{
  "category": "{{displayName}}",
  "popular_products": [
    {"name": "Sample {{displayName}}", "price": "X triệu", "specs": "key specs", "use_case": "target use"},
    // ... more products
  ],
  "price_range": "từ X triệu đến Y triệu",
  "summary": "Bên SSTC có đầy đủ {{domain}} từ budget đến high-end",
  "recommendations": ["recommendation 1", "recommendation 2"],
  {{#each customFields}}
  "{{name}}": {{defaultValue}},
  {{/each}}
}

### 2. Backend Service Mode (Default):
- **Tone**: Kỹ thuật, chính xác, tập trung vào dữ liệu
- **Focus**: Trích xuất dữ liệu cấu trúc, phân tích kỹ thuật, cung cấp thông tin cho hệ thống
- **Output**: Dữ liệu có cấu trúc ({{displayName}}SpecialistData) cho agent khác sử dụng

### 3. Direct Consultant Mode:
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần
- **Focus**: Cung cấp giải pháp toàn diện về {{domain}} cho khách hàng

## Key Expertise Areas

### 1. Data Extraction & Analysis
{{#each productFields}}
- **{{description}}**: {{technicalGuidance}}
{{/each}}

### 2. Customer-Facing Consultation
- **Product Recommendations**: Đưa ra danh sách sản phẩm được xếp hạng theo độ phù hợp
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu
- **Use Case Analysis**: Phân tích và tư vấn {{domain}} cho các nhu cầu cụ thể

## Technical Knowledge Base
{{domainSpecificKnowledge}}
`;
```

---

## 🚀 **Implementation Plan**

### **Phase 1: Template System Creation**

#### **1. Base Specialist Factory**

```typescript
// src/mastra/core/specialist-factory/base-specialist.ts
export class BaseSpecialist extends Agent {
    protected config: SpecialistConfig;
    protected products: any[] = [];
    protected isKnowledgeBaseInitialized = false;

    constructor(config: SpecialistConfig) {
        super({
            name: `${config.displayName} Specialist`,
            description: `Expert advice for ${config.domain} products`,
            instructions: processTemplate(PERSONALITY_TEMPLATE, config),
            model: mastraModelProvider(),
            tools: { [config.domain + 'DatabaseTool']: createDatabaseTool(config) },
            memory: createStandardMemoryConfig()
        });
        this.config = config;
        this.initializeKnowledgeBase();
    }

    // All 16 methods implemented generically using config
    async getStructuredRecommendations(message: string, context: any = {}, conversationId?: string) {
        // Generic implementation using this.config
    }
    
    // ... all other methods implemented generically
}
```

#### **2. Specialist Generator CLI**

```typescript
// scripts/create-specialist.ts
interface CreateSpecialistOptions {
    name: string;           // "graphics-card"
    displayName?: string;   // "Graphics Card" (auto-generated)
    prompt?: string;        // Custom personality additions
    dataFields: string;     // Path to field definitions
    brandMapping?: string;  // Path to brand mapping
}

async function createSpecialist(options: CreateSpecialistOptions) {
    // 1. Generate config from options
    const config = await generateConfig(options);
    
    // 2. Create specialist file from template
    const specialistCode = generateSpecialistCode(config);
    await writeFile(`src/mastra/agents/${options.name}-specialist.ts`, specialistCode);
    
    // 3. Create database tool from template
    const toolCode = generateDatabaseToolCode(config);
    await writeFile(`src/mastra/tools/${options.name}-database-tool.ts`, toolCode);
    
    // 4. Update data models
    await addToSpecialistDataModels(config);
    
    // 5. Update schemas
    await addToSummarySchemas(config);
    
    // 6. Update main Mastra config
    await addToMastraIndex(config);
    
    console.log(`✅ ${config.displayName} specialist created successfully!`);
}
```

### **Phase 2: Configuration Examples**

#### **Graphics Card Specialist Example**

```typescript
// configs/graphics-card-specialist.json
{
    "domain": "graphics-card",
    "displayName": "Graphics Card",
    "type": "gpu",
    "productFields": [
        { "name": "memory", "type": "string", "required": true, "description": "VRAM amount" },
        { "name": "coreClock", "type": "string", "required": true, "description": "Base clock speed" },
        { "name": "boostClock", "type": "string", "required": false, "description": "Boost clock speed" },
        { "name": "interface", "type": "string", "required": true, "description": "PCIe interface" },
        { "name": "powerConsumption", "type": "string", "required": true, "description": "TDP in watts" },
        { "name": "rayTracing", "type": "boolean", "required": false, "description": "RT cores support" },
        { "name": "architecture", "type": "string", "required": true, "description": "GPU architecture" }
    ],
    "searchCriteria": [
        { "name": "memory", "type": "string", "description": "Filter by VRAM amount" },
        { "name": "budget", "type": "range", "description": "Price range filter" },
        { "name": "useCase", "type": "string", "description": "Gaming, workstation, mining" },
        { "name": "powerLimit", "type": "number", "description": "Max power consumption" }
    ],
    "brandMapping": {
        "NVIDIA": ["NVIDIA", "nvidia", "GeForce", "RTX", "GTX"],
        "AMD": ["AMD", "amd", "Radeon", "RX"],
        "ASUS": ["ASUS", "asus", "ROG", "TUF", "STRIX"],
        "MSI": ["MSI", "msi", "Gaming", "Suprim"],
        "Gigabyte": ["Gigabyte", "GIGABYTE", "AORUS", "Eagle"],
        "EVGA": ["EVGA", "evga"],
        "Sapphire": ["Sapphire", "SAPPHIRE", "Nitro", "Pulse"]
    },
    "domainSpecificKnowledge": "GPU architectures, ray tracing, DLSS/FSR, mining capabilities, 4K gaming requirements",
    "performanceMetrics": ["fps", "rayTracingPerformance", "powerEfficiency", "memoryBandwidth"],
    "compatibilityChecks": ["psuRequirements", "caseSize", "motherboardSlot"]
}
```

#### **Motherboard Specialist Example**

```typescript
// configs/motherboard-specialist.json
{
    "domain": "motherboard",
    "displayName": "Motherboard", 
    "type": "motherboard",
    "productFields": [
        { "name": "socket", "type": "string", "required": true, "description": "CPU socket type" },
        { "name": "chipset", "type": "string", "required": true, "description": "Chipset model" },
        { "name": "formFactor", "type": "string", "required": true, "description": "ATX, mATX, ITX" },
        { "name": "ramSlots", "type": "number", "required": true, "description": "Number of RAM slots" },
        { "name": "maxRam", "type": "string", "required": true, "description": "Maximum RAM capacity" },
        { "name": "pciSlots", "type": "array", "required": true, "description": "PCIe slot configuration" },
        { "name": "m2Slots", "type": "number", "required": true, "description": "M.2 slot count" },
        { "name": "sataConnectors", "type": "number", "required": true, "description": "SATA connector count" }
    ],
    "brandMapping": {
        "ASUS": ["ASUS", "asus", "ROG", "TUF", "Prime", "ProArt"],
        "MSI": ["MSI", "msi", "MAG", "MPG", "MEG", "Pro"],
        "Gigabyte": ["Gigabyte", "GIGABYTE", "AORUS", "UD"],
        "ASRock": ["ASRock", "ASROCK", "asrock", "Phantom Gaming"],
        "EVGA": ["EVGA", "evga"],
        "Biostar": ["Biostar", "BIOSTAR", "biostar"]
    }
}
```

---

## 📝 **Usage Guide: Adding New Specialists**

### **Step 1: Prepare Configuration**

Create a JSON config file:
```bash
# Create config file
nano configs/graphics-card-specialist.json
```

### **Step 2: Run Generator**

```bash
# Generate the specialist
npm run create-specialist --config=configs/graphics-card-specialist.json

# Or with inline options
npm run create-specialist \
  --name="graphics-card" \
  --displayName="Graphics Card" \
  --prompt="Expert in GPUs, ray tracing, and gaming performance" \
  --fields="memory,coreClock,rayTracing,powerConsumption"
```

### **Step 3: Customize (Optional)**

The generator creates these files:
```
├── src/mastra/agents/graphics-card-specialist.ts    # Generated specialist
├── src/mastra/tools/graphics-card-database-tool.ts  # Generated database tool  
├── data/products-graphics-card.csv                  # Data template
└── docs/README-graphics-card-specialist.md          # Documentation
```

### **Step 4: Add Product Data**

```csv
# data/products-graphics-card.csv (generated template)
sku,name,brand,model,memory,coreClock,boostClock,interface,powerConsumption,rayTracing,architecture,price,stockStatus,description
gpu-001,RTX 4080 Gaming OC,Gigabyte,RTX 4080,16GB,2205 MHz,2505 MHz,PCIe 4.0,320W,true,Ada Lovelace,28000000,in_stock,High-performance gaming graphics card
```

### **Step 5: Test & Deploy**

```bash
# Test the new specialist
npm run test:specialist -- graphics-card

# Start development server
npm run dev
```

---

## 🎨 **Template Customization Options**

### **Advanced Configuration Features**

```typescript
interface AdvancedSpecialistConfig extends SpecialistConfig {
    // Custom method implementations
    customMethods?: {
        compatibility?: string;     // Custom compatibility logic
        performance?: string;       // Custom performance analysis
        recommendations?: string;   // Custom recommendation logic
    };
    
    // Integration settings
    integrations?: {
        withSpeCialists?: string[];  // Cross-specialist compatibility
        externalAPIs?: string[];     // External data sources
    };
    
    // UI/UX customization
    displayConfig?: {
        primaryColor?: string;
        icon?: string;
        categoryOrder?: string[];
    };
}
```

---

## 🔍 **Benefits of This Architecture**

### **For Developers:**
- ✅ **5-minute specialist creation** instead of 3+ hours
- ✅ **Zero boilerplate coding** - everything templated
- ✅ **Automatic consistency** - all specialists identical structure
- ✅ **Built-in best practices** - error handling, logging, testing

### **For Business:**
- ✅ **Rapid expansion** - add new product categories instantly  
- ✅ **Consistent experience** - all specialists behave identically
- ✅ **Easy maintenance** - template updates apply to all
- ✅ **Quality assurance** - no manual coding errors

### **For Users:**
- ✅ **Predictable interface** - same commands work across specialists
- ✅ **Consistent quality** - all specialists equally capable
- ✅ **Comprehensive coverage** - easy to add new product types

---

## 📚 **Next Steps**

1. **Create base specialist factory class**
2. **Build CLI generator tool** 
3. **Create configuration schema validation**
4. **Add automated testing templates**
5. **Create deployment automation**

This architecture would allow you to create a **Graphics Card specialist** in under 5 minutes by just providing the product schema and domain knowledge!