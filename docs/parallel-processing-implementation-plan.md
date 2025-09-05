# Kế hoạch Triển khai Xử lý Song song Đa Agent (Parallel Multi-Agent Processing)

## 📋 Tổng quan

Dựa trên review code hiện tại và tài liệu Mastra, hệ thống SSTC Agent đã có nền tảng tốt cho việc triển khai xử lý song song. Tài liệu này đưa ra kế hoạch chi tiết để implement ý tưởng của bạn: **khi user hỏi "bạn bán gì", kích hoạt đồng thời tất cả các agent chuyên gia và Mai tổng hợp kết quả**.

## 🔍 Phân tích Hiện trạng (Dựa trên Mastra Docs)

### ✅ Đã có sẵn:
1. **Workflow System**: `channelMessageWorkflow` với `.parallel()` và `.then()` support
2. **Agent Specialists**: CPU, RAM, SSD, Barebone, Desktop đều implement Agent class
3. **Parallel Processing Framework**: Mastra có native support cho parallel execution
4. **Mai Agent**: Agent class với khả năng tích hợp tools và workflows
5. **Template System**: Mai có templates và có thể dùng input/output processors
6. **Memory System**: Mastra Memory với LibSQL storage đã được setup

### 🎯 Cần điều chỉnh theo Mastra Best Practices:
1. **Workflow Steps**: Sử dụng `createStep()` thay vì custom orchestrator
2. **Parallel Execution**: Dùng `.parallel([step1, step2, step3])` native của Mastra
3. **Agent as Tools**: Convert agents thành tools để workflow có thể gọi
4. **Structured Output**: Dùng Zod schemas cho type safety
5. **Runtime Context**: Sử dụng RuntimeContext cho dynamic configuration

## 📈 Kế hoạch Triển khai (Theo Mastra Best Practices)

### Phase 1: Enhance Specialist Agents với Summary Prompts (1 tuần)

#### 1.1 Cập nhật Specialist Agent Prompts (Thay vì tạo tools)
**Files cần cập nhật:**
- `src/mastra/agents/cpu-specialist.ts` (cập nhật)
- `src/mastra/agents/ram-specialist.ts` (cập nhật) 
- `src/mastra/agents/ssd-specialist.ts` (cập nhật)
- `src/mastra/agents/barebone-specialist.ts` (cập nhật)
- `src/mastra/agents/desktop-specialist.ts` (cập nhật)

**Công việc:**
```typescript
// Ví dụ cập nhật CPU Specialist
export const cpuSpecialist = new Agent({
  name: "cpu-specialist",
  description: "CPU hardware specialist for SSTC",
  instructions: ({ runtimeContext }) => {
    const mode = runtimeContext?.get("summary-mode");
    const intent = runtimeContext?.get("user-intent");
    
    if (mode === "quick-summary") {
      return `You are a CPU specialist at SSTC computer store. 
      
      QUICK SUMMARY MODE: Provide concise, structured information about CPUs.
      
      For general inquiries, include:
      - 2-3 popular CPU models with prices
      - Brief specs (cores, clock speed)
      - Use cases (gaming, office, etc.)
      - Price range overview
      
      For specific inquiries (${intent}), focus on:
      - Relevant CPU models matching the query
      - Key differentiators 
      - Specific recommendations
      
      Format: JSON-like structure for easy parsing by Mai agent.
      Keep Vietnamese, friendly tone, under 200 words.
      
      Example output:
      {
        "category": "CPU",
        "popular_products": [
          {"name": "Intel i5-13400F", "price": "4.5 triệu", "specs": "10 cores, 4.6GHz", "use_case": "Gaming mid-range"},
          {"name": "AMD Ryzen 5 7600X", "price": "5.2 triệu", "specs": "6 cores, 5.3GHz", "use_case": "Gaming high-end"}
        ],
        "price_range": "từ 2.5 triệu đến 15 triệu",
        "summary": "Bên SSTC có đầy đủ CPU Intel và AMD cho mọi nhu cầu từ văn phòng đến gaming",
        "recommendations": ["i5 cho gaming", "i3 cho văn phòng", "Ryzen cho content creation"]
      }`;
    }
    
    // Normal mode (existing instructions)
    return `You are a CPU specialist at SSTC...`;
  },
  model: openai("gpt-4o-mini"), // Faster model for summaries
  // ... existing config
});
```

#### 1.2 Định nghĩa Summary Response Schema  
**Files cần tạo:**
- `src/mastra/schemas/specialist-summary-schemas.ts` (tạo mới)

**Công việc:**
```typescript
import { z } from "zod";

export const SpecialistSummarySchema = z.object({
  category: z.enum(["CPU", "RAM", "SSD", "Barebone", "Desktop"]),
  popular_products: z.array(z.object({
    name: z.string(),
    price: z.string(),
    specs: z.string(),
    use_case: z.string()
  })),
  price_range: z.string(),
  summary: z.string(),
  recommendations: z.array(z.string()),
  processing_time_note: z.string().optional()
});
```

### Phase 2: Direct Agent Workflow (Đơn giản hơn, không cần tools) (1-2 tuần)

#### 2.1 Simplified Agent Selection & Execution
**Files cần tạo:**
- `src/mastra/workflows/direct-agent-inquiry.ts` (tạo mới)

**Công việc:**
```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Step 1: Agent Selection (giữ nguyên)
const agentSelectionStep = createStep({
  id: "agent-selection",
  inputSchema: z.object({
    message: z.string(),
    intent: z.string(),
    entities: z.array(z.string()).optional()
  }),
  outputSchema: z.object({
    required_agents: z.array(z.enum(["cpu", "ram", "ssd", "barebone", "desktop"])),
    processing_strategy: z.enum(["single", "multi", "selective"]),
    timeout_ms: z.number()
  }),
  execute: async ({ inputData }) => {
    // Same logic as before...
    return { required_agents, processing_strategy, timeout_ms };
  }
});

// Step 2: Mai Holding Response (giữ nguyên)
const maiHoldingResponseStep = createStep({
  // Same as before...
});

// Step 3: SIMPLIFIED - Direct Agent Calls (không qua tools)
const directAgentExecutionStep = createStep({
  id: "direct-agent-execution",
  inputSchema: z.object({
    required_agents: z.array(z.string()),
    timeout_ms: z.number(),
    message: z.string(),
    intent: z.string()
  }),
  outputSchema: z.object({
    specialist_results: z.array(SpecialistSummarySchema),
    completed_agents: z.array(z.string()),
    timed_out_agents: z.array(z.string()),
    execution_time_ms: z.number()
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    const { required_agents, timeout_ms, message, intent } = inputData;
    const startTime = Date.now();
    
    // Set up runtime context for summary mode
    const summaryContext = new RuntimeContext();
    summaryContext.set("summary-mode", "quick-summary");
    summaryContext.set("user-intent", intent);
    summaryContext.set("original-message", message);
    
    // Map agent names to actual agents
    const agentMap = {
      "cpu": mastra?.getAgent("cpuSpecialist"),
      "ram": mastra?.getAgent("ramSpecialist"),
      "ssd": mastra?.getAgent("ssdSpecialist"),
      "barebone": mastra?.getAgent("bareboneSpecialist"),
      "desktop": mastra?.getAgent("desktopSpecialist")
    };
    
    // Create promises for required agents
    const agentPromises = required_agents.map(async (agentName) => {
      const agent = agentMap[agentName];
      if (!agent) return null;
      
      try {
        const result = await Promise.race([
          agent.generate(
            `Provide quick summary for customer inquiry: "${message}"`,
            { 
              runtimeContext: summaryContext,
              structuredOutput: {
                schema: SpecialistSummarySchema
              }
            }
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout_ms)
          )
        ]);
        
        return {
          agent: agentName,
          result: result.object, // Structured output từ agent
          status: "completed"
        };
      } catch (error) {
        return {
          agent: agentName,
          result: null,
          status: "timeout",
          error: error.message
        };
      }
    });
    
    const results = await Promise.allSettled(agentPromises);
    
    // Process results same as before...
    const specialist_results = [];
    const completed_agents = [];
    const timed_out_agents = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        if (result.value.status === 'completed') {
          specialist_results.push(result.value.result);
          completed_agents.push(result.value.agent);
        } else {
          timed_out_agents.push(result.value.agent);
        }
      }
    });
    
    return {
      specialist_results,
      completed_agents,
      timed_out_agents,
      execution_time_ms: Date.now() - startTime
    };
  }
});

// Step 4: Mai Final Response (simplified)
const maiFinalResponseStep = createStep({
  id: "mai-final-response",
  inputSchema: z.object({
    specialist_results: z.array(SpecialistSummarySchema),
    completed_agents: z.array(z.string()),
    timed_out_agents: z.array(z.string()),
    original_message: z.string()
  }),
  outputSchema: z.object({
    final_response: z.string(),
    response_type: z.enum(["complete", "partial", "fallback"])
  }),
  execute: async ({ inputData, mastra }) => {
    const { specialist_results, completed_agents, timed_out_agents, original_message } = inputData;
    const maiAgent = mastra?.getAgent("maiAgent");
    
    if (specialist_results.length === 0) {
      // Fallback response
      const fallback = await maiAgent?.generate(
        `All specialists timed out for: "${original_message}". Provide helpful general response.`
      );
      return {
        final_response: fallback?.text || "Em xin lỗi, hệ thống đang gặp sự cố...",
        response_type: "fallback"
      };
    }
    
    // Synthesize available data
    const context = `
Customer message: ${original_message}
Available specialist data: ${JSON.stringify(specialist_results, null, 2)}
Completed agents: ${completed_agents.join(", ")}
${timed_out_agents.length > 0 ? `Timed out: ${timed_out_agents.join(", ")}` : ""}
`;
    
    const response = await maiAgent?.generate(
      `Synthesize this specialist data into natural, helpful response: ${context}`,
      {
        instructions: `You are Mai from SSTC. Create natural Vietnamese response based on specialist data.
        
        - Combine information from all available specialists
        - Maintain friendly, professional tone
        - Include prices, specs, recommendations as appropriate
        - If some agents timed out, focus on available data without mentioning technical issues
        - End with helpful next steps or questions`
      }
    );
    
    return {
      final_response: response?.text || "Cảm ơn quý khách đã quan tâm đến SSTC!",
      response_type: timed_out_agents.length > 0 ? "partial" : "complete"
    };
  }
});
```

// Main Workflow - Simplified
export const directAgentInquiry = createWorkflow({
  id: "direct-agent-inquiry", 
  inputSchema: z.object({
    message: z.string(),
    intent: z.string(),
    entities: z.array(z.string()).optional(),
    user_id: z.string()
  }),
  outputSchema: z.object({
    immediate_response: z.string(),
    required_agents: z.array(z.string()),
    specialist_results: z.array(SpecialistSummarySchema),
    final_response: z.string(),
    response_type: z.string(),
    total_execution_time_ms: z.number()
  })
})
  .then(agentSelectionStep)
  .then(maiHoldingResponseStep)
  .then(directAgentExecutionStep)
  .then(maiFinalResponseStep)
  .map(({ getStepResult }) => {
    const selection = getStepResult(agentSelectionStep);
    const holding = getStepResult(maiHoldingResponseStep);
    const execution = getStepResult(directAgentExecutionStep);
    const final = getStepResult(maiFinalResponseStep);
    
    return {
      immediate_response: holding.immediate_response,
      required_agents: selection.required_agents,
      specialist_results: execution.specialist_results,
      final_response: final.final_response,
      response_type: final.response_type,
      total_execution_time_ms: execution.execution_time_ms
    };
  })
  .commit();
```

#### 2.2 Cập nhật Message Processor (Simplified)
**Files cần cập nhật:**
- `src/mastra/workflows/message-processor.ts`

**Công việc:**
```typescript
// Simplified branching
export const channelMessageWorkflow = createWorkflow({...})
  .then(intentAnalysisStep)
  .then(entityExtractionStep)
  .branch([
    // Route to direct agent workflow for any product inquiry
    [
      async ({ inputData }) => {
        const { intent } = inputData;
        const PRODUCT_INTENTS = [
          "cpu_inquiry", "ram_inquiry", "ssd_inquiry", "barebone_inquiry", "desktop_inquiry",
          "product_catalog", "build_pc", "gaming_setup", "office_setup", "upgrade_inquiry",
          "compare_cpu", "compare_storage", "compare_all"
        ];
        return PRODUCT_INTENTS.includes(intent);
      },
      directAgentInquiry // Single workflow handles all cases
    ],
    // Default fallback
    [
      async ({ inputData }) => true,
      agentDispatcherStep // Existing logic for non-product queries
    ]
  ])
  .commit();
```
```

### Phase 3: Workflow Integration với Error Handling (1-2 tuần)

#### 3.1 Cập nhật Message Processor với Adaptive Routing
**Files cần cập nhật:**
- `src/mastra/workflows/message-processor.ts`

**Công việc:**
```typescript
// Enhanced conditional branching với entity detection
export const channelMessageWorkflow = createWorkflow({...})
  .then(intentAnalysisStep)
  .then(entityExtractionStep) // New step để extract entities
  .branch([
    // Multi-agent scenarios
    [
      async ({ inputData }) => {
        const { intent, entities = [] } = inputData;
        
        const MULTI_AGENT_INTENTS = [
          "product_catalog", "build_pc", "gaming_setup", 
          "office_setup", "upgrade_inquiry", "compare_all"
        ];
        
        const hasMultipleEntities = entities.length > 1;
        const isMultiAgentIntent = MULTI_AGENT_INTENTS.includes(intent);
        
        return isMultiAgentIntent || hasMultipleEntities;
      },
      adaptiveAgentInquiry // Route to adaptive workflow
    ],
    // Single agent scenarios  
    [
      async ({ inputData }) => {
        const { intent, entities = [] } = inputData;
        
        const SINGLE_AGENT_INTENTS = [
          "cpu_inquiry", "ram_inquiry", "ssd_inquiry",
          "barebone_inquiry", "desktop_inquiry"
        ];
        
        const hasSingleEntity = entities.length === 1;
        const isSingleAgentIntent = SINGLE_AGENT_INTENTS.includes(intent);
        
        return isSingleAgentIntent || hasSingleEntity;
      },
      adaptiveAgentInquiry // Same workflow, but will select single agent
    ],
    // Default fallback
    [
      async ({ inputData }) => true, // Default case
      agentDispatcherStep // Original single agent logic
    ]
  ])
  .commit();

// New entity extraction step
const entityExtractionStep = createStep({
  id: "entity-extraction",
  inputSchema: z.object({
    message: z.string(),
    intent: z.string(),
    confidence: z.number()
  }),
  outputSchema: z.object({
    message: z.string(),
    intent: z.string(),
    confidence: z.number(),
    entities: z.array(z.string())
  }),
  execute: async ({ inputData, mastra }) => {
    const anAgent = mastra?.getAgent("anDataAnalyst");
    
    const entityResult = await anAgent?.generate(
      `Extract product-related entities from: "${inputData.message}"`,
      {
        instructions: `Extract entities related to computer hardware. Return as JSON array.
        
        Look for:
        - CPU brands: intel, amd, i5, i7, ryzen
        - RAM: memory, ddr4, ddr5, 8gb, 16gb, 32gb
        - Storage: ssd, nvme, storage, hard drive
        - Cases: case, tower, chassis, barebone
        - PC types: gaming, office, workstation
        
        Example: ["cpu", "intel", "i7"] or ["ssd", "nvme"] or ["gaming", "pc"]`,
        structuredOutput: {
          schema: z.object({
            entities: z.array(z.string())
          })
        }
      }
    );
    
    return {
      ...inputData,
      entities: entityResult?.object?.entities || []
    };
  }
});
```

#### 3.2 Error Handling & Timeout
**Files cần tạo:**
- `src/mastra/workflows/steps/timeout-wrapper-step.ts` (tạo mới)

**Công việc:**
```typescript
import { createStep } from "@mastra/core/workflows";

export const createTimeoutWrapper = (innerStep: any, timeoutMs: number = 3000) => {
  return createStep({
    id: `${innerStep.id}-with-timeout`,
    inputSchema: innerStep.inputSchema,
    outputSchema: innerStep.outputSchema,
    retries: 2, // Sử dụng built-in retry của Mastra
    execute: async (params) => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      });
      
      try {
        return await Promise.race([
          innerStep.execute(params),
          timeoutPromise
        ]);
      } catch (error) {
        // Fallback response
        return {
          category: "Unknown",
          products: [],
          summary: "Thông tin đang được cập nhật...",
          recommendations: []
        };
      }
    }
  });
};
```
### Phase 4: Mai Agent Enhancement với Processors (1 tuần)

#### 4.1 Mai Response Processors
**Files cần tạo:**
- `src/mastra/processors/multi-agent-response-processor.ts` (tạo mới)

**Công việc:**
```typescript
import { Processor } from "@mastra/core/processors";

export class MultiAgentResponseProcessor implements Processor {
  async processOutputResult(result: any, context: any) {
    // Format multi-agent data theo template Mai
    const formattedResponse = this.formatMultiAgentResponse(result);
    return {
      ...result,
      text: formattedResponse
    };
  }
  
  private formatMultiAgentResponse(data: any): string {
    // Logic format response từ multiple agents
    return `
Dạ bên SSTC có đầy đủ các sản phẩm sau ạ:

${data.specialists_data.map(specialist => 
  `🔹 **${specialist.category}**: ${specialist.summary}`
).join('\n')}

${data.final_response}
    `.trim();
  }
}
```

#### 4.2 Cập nhật Mai Agent với Processors
**Files cần cập nhật:**
- `src/mastra/agents/mai-agent.ts`

**Công việc:**
```typescript
export const maiAgent = new Agent({
  name: "mai-agent",
  description: "SSTC sales assistant with multi-agent coordination",
  instructions: ({ runtimeContext }) => {
    const mode = runtimeContext?.get("processing-mode");
    if (mode === "multi-agent") {
      return `You are coordinating responses from multiple specialist agents. 
               Synthesize their data into a cohesive, helpful response for SSTC customers.`;
    }
    return "You are Mai, SSTC's helpful sales assistant...";
  },
  model: openai("gpt-4o"),
  outputProcessors: [
    new MultiAgentResponseProcessor(),
    // Có thể thêm processors khác
  ],
  workflows: {
    multiAgentInquiry: multiAgentProductInquiry
  }
});
```

### Phase 5: Testing & Monitoring (1-2 tuần)

#### 5.1 Test Workflows
**Files cần tạo:**
- `tests/workflows/multi-agent-workflow.test.ts` (tạo mới)

**Công việc:**
```typescript
import { mastra } from "../../src/mastra";

describe("Multi-Agent Product Inquiry Workflow", () => {
  test("should handle parallel agent processing", async () => {
    const workflow = mastra.getWorkflow("multiAgentProductInquiry");
    const run = await workflow.createRunAsync();
    
    const result = await run.start({
      inputData: {
        message: "Bạn bán gì vậy?",
        intent: "product_catalog",
        user_id: "test_user"
      }
    });
    
    expect(result.status).toBe("success");
    expect(result.result.specialists_data).toHaveLength(5);
    expect(result.result.final_response).toContain("SSTC");
  });
  
  test("should handle timeout gracefully", async () => {
    // Test timeout scenarios
  });
});
```

#### 5.2 Workflow Monitoring với Watch
**Files cần tạo:**
- `src/mastra/monitoring/workflow-monitor.ts` (tạo mới)

**Công việc:**
```typescript
export class WorkflowMonitor {
  static monitorMultiAgentWorkflow(run: any) {
    run.watch((event) => {
      console.log(`Workflow Event: ${event.type}`, {
        currentStep: event.payload?.currentStep?.id,
        status: event.payload?.status,
        processingTime: event.payload?.processingTime
      });
      
      // Log để debug performance
      if (event.type === 'step.completed') {
        console.log(`Step ${event.payload.currentStep.id} completed in ${event.payload.processingTime}ms`);
      }
    });
  }
}
```

## 🎯 Ví dụ Luồng Simplified (Direct Agent Calls)

### Scenario 1: "Bạn có SSD nào không?"

```typescript
// Input
{
  message: "Bạn có SSD nào không?",
  intent: "ssd_inquiry", 
  entities: ["ssd"],
  user_id: "customer_123"
}

// Workflow execution:
// 1. agentSelectionStep → required_agents: ["ssd"], strategy: "single", timeout: 2000ms
// 2. maiHoldingResponseStep → "Để em kiểm tra thông tin SSD chi tiết cho quý khách nhé..."
// 3. directAgentExecutionStep → 
//    - Set RuntimeContext: summary-mode="quick-summary"
//    - Call ssdSpecialist.generate() with structured output
//    - Get JSON response: {category: "SSD", popular_products: [...], summary: "..."}
// 4. maiFinalResponseStep → Mai synthesizes SSD data into natural response
```

**Agent Response Example:**
```json
{
  "category": "SSD",
  "popular_products": [
    {"name": "Samsung 980 PRO 1TB", "price": "2.8 triệu", "specs": "NVMe PCIe 4.0", "use_case": "Gaming"},
    {"name": "WD Blue 1TB", "price": "1.9 triệu", "specs": "SATA 3", "use_case": "Office"}
  ],
  "price_range": "từ 600k đến 8 triệu",
  "summary": "Bên SSTC có đầy đủ SSD NVMe và SATA cho mọi nhu cầu",
  "recommendations": ["Samsung cho gaming", "WD Blue cho văn phòng", "Crucial cho budget"]
}
```

**Mai Final Response:**
```
"Dạ bên SSTC có đầy đủ các loại SSD ạ! 

🔸 **SSD Gaming**: Samsung 980 PRO 1TB (2.8 triệu) - NVMe PCIe 4.0 tốc độ cao
🔸 **SSD Văn phòng**: WD Blue 1TB (1.9 triệu) - SATA 3 ổn định  
🔸 **SSD Tiết kiệm**: Crucial BX từ 600k - phù hợp nhu cầu cơ bản

Quý khách dùng cho gaming hay văn phòng ạ?"
```

### Scenario 2: "Build PC gaming budget 20 triệu"

```typescript
// Input
{
  message: "Build PC gaming budget 20 triệu",
  intent: "gaming_setup",
  entities: ["gaming", "pc", "build", "20", "triệu"],
  user_id: "customer_456"
}

// Workflow execution:
// 1. agentSelectionStep → required_agents: ["cpu", "ram", "ssd", "desktop"], strategy: "multi", timeout: 5000ms
// 2. maiHoldingResponseStep → "Để em tổng hợp thông tin về CPU, RAM, SSD và PC gaming để tư vấn tốt nhất cho quý khách ạ..."
// 3. directAgentExecutionStep → 
//    - Parallel calls to 4 specialist agents with budget context
//    - Each returns structured JSON with gaming-focused recommendations
// 4. maiFinalResponseStep → Mai synthesizes all data into gaming PC build
```

**Timeline:**
- **0ms**: Mai holding response
- **0-5000ms**: 4 specialists processing in parallel
- **3000ms**: All complete → Final comprehensive gaming build response

### Scenario 3: Timeout Handling - "RAM DDR5 nào tốt?"

```typescript
// Nếu RAM specialist timeout:
// 1. Mai immediate: "Để em kiểm tra thông tin RAM DDR5 cho quý khách nhé..."
// 2. RAM specialist: [TIMEOUT after 2s]
// 3. Mai fallback với general knowledge:

"Em xin lỗi, hệ thống đang tải thông tin RAM. Dựa trên kinh nghiệm, bên SSTC có:

🔸 **DDR5 Gaming**: Corsair Vengeance 32GB (3.5 triệu) 
🔸 **DDR5 Standard**: Kingston Fury 16GB (1.8 triệu)
🔸 **DDR5 Budget**: Team Delta 16GB (1.5 triệu)

Quý khách cần dung lượng bao nhiêu để em tư vấn chi tiết hơn ạ?"
```

## 📊 Technical Architecture (Simplified)

```
User Message: "Bạn có SSD nào?"
     ↓
intentAnalysisStep → intent: "ssd_inquiry" 
     ↓  
entityExtractionStep → entities: ["ssd"]
     ↓
.branch([...]) → directAgentInquiry
     ↓
directAgentInquiry:
┌─────────────────────────────────────────┐
│ agentSelectionStep                      │
│ → required_agents: ["ssd"]              │ 
│         ↓                               │
│ maiHoldingResponseStep                  │  
│ → "Để em kiểm tra SSD..."               │
│         ↓                               │
│ directAgentExecutionStep                │
│ → ssdSpecialist.generate(               │
│     "quick summary",                    │
│     { structuredOutput: Schema }        │
│   )                                     │
│         ↓                               │
│ maiFinalResponseStep                    │
│ → Synthesize SSD JSON → Natural response│
└─────────────────────────────────────────┘
```

## 💡 Lợi ích của Direct Agent Approach

| Aspect | Tool-based Approach | Direct Agent Approach |
|--------|-------------------|----------------------|
| **Complexity** | Tools + Agents + Parsing | Chỉ Agents với structured output |
| **Type Safety** | Tool schemas + Agent responses | Agent structured output |
| **Performance** | Extra tool execution layer | Direct agent calls |
| **Maintainability** | 2 layers (tools + agents) | 1 layer (agents only) |
| **Flexibility** | Fixed tool outputs | Dynamic agent responses |
| **Error Handling** | Tool errors + Agent errors | Chỉ agent errors |

## ✅ Simplified Benefits

1. **Ít Code hơn**: Không cần tạo 5 tools riêng
2. **Nhanh hơn**: Bỏ tool execution layer  
3. **Flexible hơn**: Agents có thể adapt response theo context
4. **Dễ maintain**: Chỉ cần update agent prompts
5. **Natural hơn**: Agents trả về summary theo ngôn ngữ tự nhiên
6. **Type-safe**: Structured output với Zod schemas

Bạn thấy approach này đơn giản và practical hơn không? Chỉ cần enhance prompts của specialist agents thay vì tạo tools mới! 🚀

## 🚀 Timeline Tổng kết (Revised)

- **Phase 1**: 1-2 tuần (Tools & Schemas)
- **Phase 2**: 2-3 tuần (Parallel Workflow)  
- **Phase 3**: 1-2 tuần (Integration & Error Handling)
- **Phase 4**: 1 tuần (Mai Enhancement)
- **Phase 5**: 1-2 tuần (Testing & Monitoring)

**Tổng cộng: 6-10 tuần**

## 💡 Quick Wins (Mastra-native)

1. **Create Basic Tools**: Wrap existing agents trong `createTool()`
2. **Simple Parallel Workflow**: Tạo basic workflow với `.parallel()`
3. **Structured Output**: Implement Zod schemas cho type safety
4. **Agent Processors**: Thêm output processors cho Mai

## 🎛️ Configuration (Mastra RuntimeContext)

**File cần tạo**: `src/mastra/config/multi-agent-config.ts`
```typescript
import { RuntimeContext } from "@mastra/core/di";

export const createMultiAgentContext = () => {
  const context = new RuntimeContext();
  context.set("processing-mode", "multi-agent");
  context.set("default-timeout-ms", 3000);
  context.set("max-parallel-agents", 5);
  context.set("circuit-breaker-threshold", 5);
  return context;
};

// Usage trong workflow
const runtimeContext = createMultiAgentContext();
await run.start({ inputData, runtimeContext });
```

## 🔧 So sánh với Approach Ban đầu

| Aspect | Approach Cũ | Mastra Native Approach |
|--------|-------------|------------------------|
| **Orchestration** | Custom MultiAgentOrchestrator class | `createWorkflow()` + `.parallel()` |
| **Agent Calls** | Direct agent methods | `createTool()` + `createStep()` |
| **Type Safety** | Manual interfaces | Zod schemas + structured output |
| **Error Handling** | Custom timeout logic | Built-in retries + error branching |
| **Monitoring** | Custom logging | `.watch()` + step-level telemetry |
| **Context Management** | Manual context passing | `RuntimeContext` + dependency injection |

## ✅ Lợi ích của Adaptive Approach

1. **Linh hoạt Real-time**: System tự quyết định agents nào cần kích hoạt
2. **Performance Optimized**: Không waste resources gọi agents không cần thiết  
3. **Timeout Graceful**: Mai có thể handle timeout và provide fallback responses
4. **Entity-aware**: Hiểu context từ entities, không chỉ intent
5. **Scalable**: Dễ thêm agents mới và intent patterns
6. **Natural UX**: Response time thích hợp cho từng loại query

## 🔧 So sánh với Approach Ban đầu

| Aspect | Approach Cứng nhắc | Adaptive Approach |
|--------|-------------------|-------------------|
| **Agent Selection** | Fixed cho "bạn bán gì" | Dynamic based on intent + entities |
| **Resource Usage** | Always 5 agents | 1-5 agents tùy context |
| **Response Time** | Fixed 3-5s | 2s (single) to 5s (multi) |
| **Timeout Handling** | Generic fallback | Context-aware fallback |
| **Scalability** | Hard-coded mapping | Rule-based + entity detection |
| **User Experience** | One-size-fits-all | Tailored per query type |

Approach mới này sẽ:
- **Hiệu quả hơn**: Chỉ gọi agents cần thiết
- **Nhanh hơn**: Single agent queries < 2s
- **Thông minh hơn**: Entity detection + intent analysis
- **Robust hơn**: Graceful timeout handling với context-aware fallbacks
- **Maintainable hơn**: Rule-based thay vì hard-coded logic

Bạn muốn bắt đầu implement từ **Phase 1** (Tools & Schemas) với adaptive logic này không?
Bạn muốn bắt đầu từ phase nào trước? Tôi recommend Phase 1 để tạo foundation với tools và schemas.

## 📚 Key Mastra Concepts Cần Sử dụng

Dựa trên docs đã review, đây là những concepts quan trọng:

### 1. **Workflow Composition**
- `createWorkflow()` + `createStep()`
- `.parallel([step1, step2, step3])` cho parallel execution
- `.branch()` cho conditional routing
- `.map()` cho data transformation
- Zod schemas cho input/output validation

### 2. **Agent Integration**
- `createStep(agent)` để convert agent thành workflow step
- `createTool()` để wrap agent functionality
- `outputProcessors`/`inputProcessors` cho data formatting
- `RuntimeContext` cho dynamic configuration

### 3. **Error Handling**
- Built-in `retries` parameter trong createStep
- `.branch()` cho error routing
- Timeout handling qua `abortSignal`
- Circuit breaker patterns

### 4. **Memory & State**
- `Memory` class với LibSQL storage
- Thread-based conversation context
- Working memory cho temporary data
- Semantic recall cho relevant history

Approach này sẽ tạo ra solution native với Mastra framework thay vì reinvent wheel với custom orchestrator!
