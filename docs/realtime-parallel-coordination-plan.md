# Kế hoạch Triển khai Xử lý Song song Realtime với Timeout Handling

## 📋 Tổng quan

Tài liệu này mô tả cách implement **realtime parallel processing** cho SSTC agent system theo yêu cầu:
- **Kích hoạt đồng thời** các agents liên quan sau khi phân tích intent
- **Mai làm coordinator** nhận data từ specialists và tổng hợp response
- **Timeout handling** với holding responses để tránh user chờ lâu
- **2-response pattern**: Immediate holding + Final comprehensive response

## 🎯 Workflow Architecture

### **Current vs Target Flow:**

**Current (Sequential):**
```
User → Intent Analysis → Single Agent Selection → Agent Response → User
```

**Target (Parallel Realtime):**
```
User → Intent Analysis → Agent Selection → Parallel Execution → Mai Coordination → User
                                      ↓
                                 Holding Response (< 1s)
                                      ↓
                              Specialists Processing (2-3s)
                                      ↓  
                               Final Response (with data)
```

## 🚀 Implementation Plan

### Phase 1: Enhanced Message Processor với Conditional Branching

#### 1.1 Cập nhật Current Workflow Structure
**File:** `src/mastra/workflows/message-processor.ts`

**Logic Changes:**
1. **Keep existing intent-analysis step** - reuse current logic
2. **Add conditional branching** sau intent analysis:
   - **Parallel-mode queries** → New parallel workflow
   - **Single-agent queries** → Current agent-dispatcher 
   - **Other queries** → Current fallback logic

**Conditional Logic:**
```typescript
// Parallel-mode conditions
const PARALLEL_INTENTS = [
  "product_catalog",     // "Bạn bán gì?"
  "general_inquiry",     // "Có sản phẩm gì?"
  "compare_all",         // "So sánh tất cả"
  "build_pc",           // "Build PC gaming"
  "complete_setup"      // "Tư vấn cấu hình"
];

const PARALLEL_KEYWORDS = [
  ["bạn", "bán", "gì"],
  ["có", "sản phẩm", "gì"], 
  ["build", "pc"],
  ["cấu hình", "máy"],
  ["tư vấn", "toàn bộ"]
];

// Single-agent conditions  
const SINGLE_AGENT_KEYWORDS = {
  "ssd": ["ssd", "ổ cứng", "storage"],
  "cpu": ["cpu", "bộ xử lý", "intel", "amd"],
  "ram": ["ram", "bộ nhớ", "memory"],
  "barebone": ["case", "vỏ máy", "barebone"],
  "desktop": ["pc hoàn chỉnh", "máy lắp sẵn"]
};
```

#### 1.2 Branching Implementation
**Modification trong current workflow:**

```typescript
export const channelMessageWorkflow = createWorkflow({...})
  .then(intentAnalysisStep) // Keep existing
  .branch([
    // PARALLEL MODE - Multi-agent coordination
    [
      async ({ inputData }) => {
        const { intent, message } = inputData;
        const content = message.content.toLowerCase();
        
        // Check parallel intents
        if (PARALLEL_INTENTS.includes(intent.intent)) return true;
        
        // Check parallel keywords
        return PARALLEL_KEYWORDS.some(keywords => 
          keywords.every(kw => content.includes(kw))
        );
      },
      parallelAgentWorkflow // NEW workflow
    ],
    
    // SINGLE MODE - Specific product queries  
    [
      async ({ inputData }) => {
        const { message } = inputData;
        const content = message.content.toLowerCase();
        
        // Check single agent keywords
        return Object.values(SINGLE_AGENT_KEYWORDS).some(keywords =>
          keywords.some(kw => content.includes(kw))
        );
      },
      singleAgentWorkflow // NEW workflow
    ],
    
    // DEFAULT - Keep existing logic
    [
      async () => true,
      agentDispatcherStep // Current logic unchanged
    ]
  ])
  .commit();
```

### Phase 2: Parallel Agent Workflow Implementation

#### 2.1 Main Parallel Workflow
**File:** `src/mastra/workflows/parallel-agent-workflow.ts` (tạo mới)

**Workflow Steps:**

**Step 1: Agent Selection & Timeout Configuration**
```typescript
const agentSelectionStep = createStep({
  id: "parallel-agent-selection",
  inputSchema: z.object({
    channelId: z.string(),
    message: z.object({ content: z.string(), senderId: z.string() }),
    intent: z.object({ intent: z.string(), confidence: z.number() })
  }),
  outputSchema: z.object({
    required_agents: z.array(z.string()),
    timeout_ms: z.number(),
    holding_message: z.string(),
    strategy: z.enum(["all_agents", "selective", "single_focus"])
  }),
  execute: async ({ inputData }) => {
    const { intent, message } = inputData;
    const content = message.content.toLowerCase();
    
    // LOGIC: Agent selection based on query type
    let required_agents = [];
    let strategy = "selective";
    let timeout_ms = 3000;
    
    // "Bạn bán gì?" → All agents
    if (PARALLEL_KEYWORDS[0].every(kw => content.includes(kw))) {
      required_agents = ["cpu", "ram", "ssd", "barebone", "desktop"];
      strategy = "all_agents";
      timeout_ms = 5000;
    }
    
    // "Build PC gaming" → Gaming-focused agents
    else if (content.includes("build") || content.includes("gaming")) {
      required_agents = ["cpu", "ram", "ssd", "desktop"];
      strategy = "selective";
      timeout_ms = 4000;
    }
    
    // "SSD nào tốt?" → SSD focus + Desktop context
    else if (SINGLE_AGENT_KEYWORDS.ssd.some(kw => content.includes(kw))) {
      required_agents = ["ssd", "desktop"];
      strategy = "single_focus";
      timeout_ms = 3000;
    }
    
    // Generate holding message
    const holding_message = generateHoldingMessage(required_agents, strategy);
    
    return { required_agents, timeout_ms, holding_message, strategy };
  }
});
```

**Step 2: Mai Holding Response (Immediate)**
```typescript
const maiHoldingResponseStep = createStep({
  id: "mai-holding-response", 
  inputSchema: z.object({
    holding_message: z.string(),
    channelId: z.string(),
    message: z.object({ senderId: z.string() })
  }),
  outputSchema: z.object({
    immediate_response: z.string(),
    response_sent: z.boolean()
  }),
  execute: async ({ inputData, mastra }) => {
    const { holding_message, channelId, message } = inputData;
    
    // LOGIC: Send immediate holding response
    // This simulates real-time response to user
    console.log("📤 [IMMEDIATE] Sending holding response:", holding_message);
    
    // In real implementation, this would send via channel
    await sendChannelResponse(channelId, message.senderId, holding_message);
    
    return {
      immediate_response: holding_message,
      response_sent: true
    };
  }
});
```

**Step 3: Parallel Specialist Execution**
```typescript
const parallelSpecialistStep = createStep({
  id: "parallel-specialist-execution",
  inputSchema: z.object({
    required_agents: z.array(z.string()),
    timeout_ms: z.number(),
    message: z.object({ content: z.string() }),
    intent: z.object({ intent: z.string() })
  }),
  outputSchema: z.object({
    specialist_results: z.array(SpecialistSummarySchema),
    completed_agents: z.array(z.string()),
    timed_out_agents: z.array(z.string()),
    total_execution_time: z.number()
  }),
  execute: async ({ inputData, mastra }) => {
    const { required_agents, timeout_ms, message, intent } = inputData;
    const startTime = Date.now();
    
    // LOGIC: Parallel execution với timeout
    const agentMap = {
      "cpu": mastra.getAgent("cpuSpecialist"),
      "ram": mastra.getAgent("ramSpecialist"), 
      "ssd": mastra.getAgent("ssdSpecialist"),
      "barebone": mastra.getAgent("bareboneSpecialist"),
      "desktop": mastra.getAgent("desktopSpecialist")
    };
    
    // Create parallel promises với individual timeouts
    const agentPromises = required_agents.map(async (agentName) => {
      const agent = agentMap[agentName];
      if (!agent) return { agent: agentName, status: "not_found", result: null };
      
      try {
        const result = await Promise.race([
          // Use new summary mode methods from Phase 1
          agent.generateSummaryResponse(message.content, {
            mode: "quick-summary",
            user_intent: intent.intent,
            original_message: message.content,
            timeout_ms: timeout_ms - 500, // Leave buffer
            max_products: 3,
            include_prices: true
          }),
          // Individual timeout
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Agent timeout')), timeout_ms)
          )
        ]);
        
        return {
          agent: agentName,
          status: result.status || "completed", 
          result: result.data,
          processing_time: result.processingTime
        };
        
      } catch (error) {
        return {
          agent: agentName,
          status: "timeout",
          result: null,
          error: error.message
        };
      }
    });
    
    // Execute all promises in parallel
    console.log(`🔄 [PARALLEL] Starting ${required_agents.length} agents`);
    const results = await Promise.allSettled(agentPromises);
    
    // Process results
    const specialist_results = [];
    const completed_agents = [];
    const timed_out_agents = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const agentResult = result.value;
        if (agentResult.status === 'completed' || agentResult.status === 'success') {
          specialist_results.push(agentResult.result);
          completed_agents.push(agentResult.agent);
        } else {
          timed_out_agents.push(agentResult.agent);
        }
      }
    });
    
    console.log(`✅ [PARALLEL] Completed: ${completed_agents.length}/${required_agents.length}`);
    
    return {
      specialist_results,
      completed_agents,
      timed_out_agents,
      total_execution_time: Date.now() - startTime
    };
  }
});
```

**Step 4: Mai Final Coordination & Response**
```typescript
const maiCoordinationStep = createStep({
  id: "mai-coordination-response",
  inputSchema: z.object({
    specialist_results: z.array(SpecialistSummarySchema),
    completed_agents: z.array(z.string()),
    timed_out_agents: z.array(z.string()),
    message: z.object({ content: z.string() }),
    channelId: z.string(),
    senderId: z.string()
  }),
  outputSchema: z.object({
    final_response: z.string(),
    response_quality: z.enum(["complete", "partial", "fallback"]),
    coordination_success: z.boolean()
  }),
  execute: async ({ inputData, mastra }) => {
    const { specialist_results, completed_agents, timed_out_agents, message, channelId } = inputData;
    const maiAgent = mastra.getAgent("maiSale");
    
    // LOGIC: Mai synthesizes specialist data
    if (specialist_results.length === 0) {
      // All agents timed out - fallback response
      const fallback = await maiAgent.generate([{
        role: "user", 
        content: `All specialists are busy. Provide general response for: "${message.content}"`
      }], {});
      
      const response = fallback.text || "Em xin lỗi, hệ thống đang tải thông tin. Quý khách vui lòng chờ chút ạ.";
      await sendChannelResponse(channelId, inputData.senderId, response);
      
      return {
        final_response: response,
        response_quality: "fallback",
        coordination_success: false
      };
    }
    
    // Prepare context for Mai
    const synthesisContext = `
Customer message: ${message.content}
Available data from specialists: ${JSON.stringify(specialist_results, null, 2)}
Completed agents: ${completed_agents.join(", ")}
${timed_out_agents.length > 0 ? `Timed out agents: ${timed_out_agents.join(", ")}` : ""}

Task: Synthesize this data into a natural, comprehensive Vietnamese response for SSTC customer.
- Combine all available information naturally
- Maintain Mai's friendly, professional tone  
- Include specific products, prices, recommendations
- Don't mention technical issues or agent timeouts
- End with helpful questions or next steps
`;

    const finalResponse = await maiAgent.generate([{
      role: "system",
      content: "You are Mai, SSTC's sales assistant. Coordinate specialist data into helpful customer response."
    }, {
      role: "user", 
      content: synthesisContext
    }], {});
    
    const response = finalResponse.text || "Cảm ơn quý khách đã quan tâm đến SSTC!";
    
    // Send final comprehensive response
    console.log("📤 [FINAL] Sending comprehensive response");
    await sendChannelResponse(channelId, inputData.senderId, response);
    
    return {
      final_response: response,
      response_quality: timed_out_agents.length > 0 ? "partial" : "complete", 
      coordination_success: true
    };
  }
});
```

#### 2.2 Complete Parallel Workflow Definition
```typescript
export const parallelAgentWorkflow = createWorkflow({
  id: "parallel-agent-workflow",
  description: "Realtime parallel specialist coordination with timeout handling",
  inputSchema: z.object({
    channelId: z.string(),
    message: z.object({
      content: z.string(),
      senderId: z.string(),
      timestamp: z.date()
    }),
    intent: z.object({
      intent: z.string(), 
      confidence: z.number()
    }),
    chatHistory: z.array(z.any()).optional()
  }),
  outputSchema: z.object({
    immediate_response: z.string(),
    final_response: z.string(),
    response_quality: z.string(),
    total_processing_time: z.number(),
    agents_used: z.array(z.string())
  })
})
  .then(agentSelectionStep)
  .then(maiHoldingResponseStep)  // Immediate response
  .then(parallelSpecialistStep) // Parallel execution  
  .then(maiCoordinationStep)    // Final response
  .map(({ getStepResult }) => {
    // Combine results from all steps
    const selection = getStepResult(agentSelectionStep);
    const holding = getStepResult(maiHoldingResponseStep);
    const parallel = getStepResult(parallelSpecialistStep);
    const final = getStepResult(maiCoordinationStep);
    
    return {
      immediate_response: holding.immediate_response,
      final_response: final.final_response,
      response_quality: final.response_quality,
      total_processing_time: parallel.total_execution_time,
      agents_used: parallel.completed_agents
    };
  })
  .commit();
```

### Phase 3: Single Agent Workflow (Optimized Path)

#### 3.1 Single Agent Workflow Implementation
**File:** `src/mastra/workflows/single-agent-workflow.ts` (tạo mới)

**Purpose:** Optimized cho single-product queries như "SSD nào tốt?"

```typescript
export const singleAgentWorkflow = createWorkflow({
  id: "single-agent-workflow",
  description: "Optimized single specialist with Mai coordination",
  inputSchema: z.object({
    channelId: z.string(),
    message: z.object({ content: z.string(), senderId: z.string() }),
    intent: z.object({ intent: z.string(), confidence: z.number() })
  }),
  outputSchema: z.object({
    immediate_response: z.string(),
    final_response: z.string(),
    specialist_used: z.string(),
    processing_time: z.number()
  })
})
  .then(singleAgentSelectionStep)   // Identify relevant specialist
  .then(maiHoldingResponseStep)     // "Để em kiểm tra SSD..."
  .then(singleSpecialistStep)       // Execute specialist
  .then(maiSingleResponseStep)      // Mai synthesizes
  .commit();
```

### Phase 4: Utility Functions & Helpers

#### 4.1 Holding Message Generator
**File:** `src/mastra/utils/holding-message-generator.ts` (tạo mới)

```typescript
export function generateHoldingMessage(agents: string[], strategy: string): string {
  const agentDisplayNames = {
    "cpu": "CPU", 
    "ram": "RAM",
    "ssd": "SSD", 
    "barebone": "Case",
    "desktop": "PC hoàn chỉnh"
  };
  
  if (strategy === "all_agents") {
    return "Để em tổng hợp thông tin từ tất cả chuyên gia về CPU, RAM, SSD và PC để tư vấn tốt nhất cho quý khách ạ...";
  }
  
  if (strategy === "single_focus") {
    const mainCategory = agentDisplayNames[agents[0]];
    return `Để em kiểm tra thông tin ${mainCategory} chi tiết cho quý khách nhé...`;
  }
  
  const categories = agents.map(a => agentDisplayNames[a]).join(", ");
  return `Để em tổng hợp thông tin về ${categories} để tư vấn phù hợp cho quý khách ạ...`;
}
```

#### 4.2 Channel Response Sender
**File:** `src/mastra/utils/channel-response-sender.ts` (tạo mới)

```typescript
export async function sendChannelResponse(
  channelId: string, 
  userId: string, 
  message: string
): Promise<boolean> {
  
  // LOGIC: Send immediate response via appropriate channel
  try {
    switch (channelId) {
      case "telegram":
        await telegramChannel.sendMessage(userId, message);
        break;
      case "zalo":
        await zaloChannel.sendMessage(userId, message);
        break;  
      case "web":
        await webChannel.sendMessage(userId, message);
        break;
      default:
        console.warn(`Unknown channel: ${channelId}`);
        return false;
    }
    
    console.log(`📤 [${channelId.toUpperCase()}] Message sent to ${userId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to send message via ${channelId}:`, error);
    return false;
  }
}
```

## 🎯 Example Execution Flows

### Scenario 1: "Bạn bán gì?" (Full Parallel)

**Timeline:**
```
0ms:    User sends message
50ms:   Intent analysis → "product_catalog" 
100ms:  Branch decision → parallelAgentWorkflow
150ms:  Agent selection → ["cpu", "ram", "ssd", "barebone", "desktop"] 
200ms:  📤 Mai holding: "Để em tổng hợp thông tin từ tất cả chuyên gia..."
200ms:  🔄 Start 5 specialists in parallel
2500ms: ✅ 4/5 specialists complete (SSD timeout)
2600ms: 📤 Mai final: "Dạ bên SSTC có đầy đủ sản phẩm: CPU Intel/AMD từ 2.5-15 triệu..."
```

### Scenario 2: "SSD 1TB nào tốt?" (Single Focus)

**Timeline:**
```
0ms:    User sends message
50ms:   Intent analysis → "ssd_inquiry"
100ms:  Branch decision → singleAgentWorkflow  
150ms:  Agent selection → ["ssd", "desktop"]
200ms:  📤 Mai holding: "Để em kiểm tra thông tin SSD chi tiết..."
200ms:  🔄 Start 2 specialists in parallel
1800ms: ✅ Both complete
1900ms: 📤 Mai final: "Dạ bên SSTC có SSD 1TB: Samsung 980 PRO (2.8tr), WD Blue (1.9tr)..."
```

### Scenario 3: Timeout Handling

**When specialist timeout occurs:**
```
0ms:    User sends message
200ms:  📤 Holding: "Để em kiểm tra thông tin RAM DDR5..."
3000ms: ⏰ RAM specialist timeout
3100ms: 📤 Fallback: "Em xin lỗi hệ thống đang tải. Dựa trên kinh nghiệm, DDR5 có..."
```

## 📊 Benefits của Architecture này

### 1. **Real-time User Experience**
- Immediate holding response (< 200ms)
- No more waiting for slow specialists
- Natural conversation flow

### 2. **Efficient Resource Usage**  
- Only activate relevant specialists
- Parallel execution saves time
- Timeout prevents resource waste

### 3. **Robust Error Handling**
- Graceful timeout handling
- Fallback responses available
- No system crashes from slow agents

### 4. **Scalable Architecture**
- Easy to add new specialists
- Configurable timeouts per query type
- Monitoring and metrics built-in

### 5. **Seamless Integration**
- Reuses existing intent analysis
- Leverages Phase 1 summary modes
- Compatible with current memory system

## 🔧 Implementation Requirements

### Files to Create:
1. `src/mastra/workflows/parallel-agent-workflow.ts`
2. `src/mastra/workflows/single-agent-workflow.ts`  
3. `src/mastra/utils/holding-message-generator.ts`
4. `src/mastra/utils/channel-response-sender.ts`

### Files to Modify:
1. `src/mastra/workflows/message-processor.ts` - Add branching logic
2. `src/mastra/index.ts` - Register new workflows

### Dependencies:
- Phase 1 specialist enhancements (✅ completed)
- Current intent analysis system (✅ available) 
- Channel response mechanisms (need implementation)
- Timeout handling utilities (need implementation)

Timeline: **2-3 weeks** for complete implementation with testing.