# Kiến trúc Agent Tư vấn Sản phẩm SSTC

## Tổng quan

Hệ thống agent tư vấn sản phẩm SSTC sử dụng **kiến trúc hybrid** kết hợp giữa một agent điều phối chính (Main Agent) và các agent chuyên môn (Specialized Agents) cho từng loại sản phẩm. Kiến trúc này tối ưu cho việc tư vấn các sản phẩm công nghệ phức tạp như PC build, RAM, SSD, và Barebone.

## Kiến trúc Tổng thể

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           SSTC Agent Architecture                           ║
║                           (Hybrid Multi-Agent System)                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════╗
║                              MAIN AGENT                                   ║
║                           ┌─────────────┐                                 ║
║                           │  Mai Sale   │                                 ║
║                           │ (Coordinator│                                 ║
║                           │    Agent)   │                                 ║
║                           └──────┬──────┘                                 ║
║                                  │                                       ║
║                    ┌─────────────┼─────────────┐                         ║
║                    │             │             │                         ║
║           ┌────────▼────────┐ ┌──▼──┐ ┌──────▼──────┐                   ║
║           │   PC Build      │ │ RAM │ │     SSD     │                   ║
║           │  Specialist     │ │     │ │ Specialist  │                   ║
║           │                 │ │     │ │             │                   ║
║           │ • CPU Selection │ │ •   │ │ • NVMe/SATA │                   ║
║           │ • MB Compatibility││ DDR4│ │ • Capacity  │                   ║
║           │ • RAM Matching  │ │ DDR5│ │ • Speed     │                   ║
║           │ • SSD Selection │ │     │ │ • Use Case  │                   ║
║           └────────┬────────┘ └─┬───┘ └──────┬──────┘                   ║
║                    │             │             │                         ║
║                    └─────────────┼─────────────┘                         ║
║                                  │                                       ║
║                         ┌────────▼────────┐                              ║
║                         │   Barebone     │                              ║
║                         │  Specialist    │                              ║
║                         │                │                              ║
║                         │ • Case Size    │                              ║
║                         │ • MB Form      │                              ║
║                         │ • Cooling      │                              ║
║                         │ • Aesthetics   │                              ║
║                         └─────────────────┘                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════╗
║                           SHARED RESOURCES                                ║
║                                                                          ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           ║
║  │   Memory        │  │   RAG System    │  │   Workflows     │           ║
║  │   (LibSQL)      │  │   (Chroma)      │  │   (Mastra)      │           ║
║  │                 │  │                 │  │                 │           ║
║  │ • User Profiles │  │ • Product DB    │  │ • Routing WF    │           ║
║  │ • Conversation  │  │ • Compatibility │  │ • Consultation  │           ║
║  │ • Preferences   │  │ • Search        │  │ • Handoff       │           ║
║  └─────────────────┘  └─────────────────┘  └─────────────────┘           ║
║                                                                          ║
║  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           ║
║  │   Tools         │  │   Channels      │  │   Analytics     │           ║
║  │                 │  │                 │  │                 │           ║
║  │ • Compatibility │  │ • Telegram      │  │ • Performance   │           ║
║  │ • Price Calc    │  │ • WhatsApp      │  │ • Conversion    │           ║
║  │ • Product Search│  │ • Web Chat      │  │ • User Sat.     │           ║
║  └─────────────────┘  └─────────────────┘  └─────────────────┘           ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════╗
║                           DATA FLOW                                        ║
║                                                                          ║
║  User Query → Intent Analysis → Agent Routing → Specialized Consultation ║
║                                                                          ║
║  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ ║
║  │  Customer   │───▶│ Main Agent  │───▶│ Specialist  │───▶│  Response   │ ║
║  │   Input     │    │  (Mai)      │    │   Agent     │    │   &         │ ║
║  └─────────────┘    └─────────────┘    └─────────────┘    │  Recommendations║
║                                                          └─────────────┘ ║
║                                                                          ║
║  ⬆️                                                                    ⬆️ ║
║  └────────────────────────────────────────────────────────────────────────┘ ║
║              Memory Update & Learning Loop                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Kiến trúc Chi tiết

#### 1. **Hierarchical Agent Structure**
```
Main Agent (maiSale)
├── Coordination & Routing
├── User Profile Management
├── Consistency Assurance
└── Final Recommendations

Specialized Agents
├── PC Build Specialist
│   ├── CPU Selection Logic
│   ├── Motherboard Compatibility
│   ├── RAM Matching
│   └── SSD Recommendations
├── RAM Specialist
│   ├── DDR4/DDR5 Analysis
│   ├── Capacity Optimization
│   ├── Speed/Latency Advice
│   └── Motherboard Compatibility
├── SSD Specialist
│   ├── NVMe vs SATA Guidance
│   ├── Capacity Planning
│   ├── Performance Analysis
│   └── Use Case Matching
└── Barebone Specialist
    ├── Case Size Selection
    ├── Form Factor Matching
    ├── Cooling System Design
    └── Aesthetics Consultation
```

#### 2. **Data Flow Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │───▶│ Intent Analysis │───▶│ Agent Routing  │
│                 │    │                 │    │                 │
│ • Text Message  │    │ • NLP Processing│    │ • Rule Engine   │
│ • Context       │    │ • Intent Class. │    │ • Agent Select  │
│ • User Profile  │    │ • Entity Extract│    │ • Handoff       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Specialized Agent│───▶│Consultation Flow│───▶│Recommendation  │
│                 │    │                 │    │Generation       │
│ • Domain Expert │    │ • Question Tree │    │                 │
│ • Product DB    │    │ • Compatibility │    │ • Top 3 Options │
│ • RAG Search    │    │ • Price Calc    │    │ • Pros/Cons     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Response      │───▶│ Memory Update   │───▶│ Analytics      │
│   Formatting    │    │                 │    │                 │
│                 │    │ • User Profile  │    │ • Performance   │
│ • Natural Lang. │    │ • Preferences   │    │ • Conversion    │
│ • Recommendations│    │ • History      │    │ • Satisfaction  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### 3. **Memory Architecture**
```
Shared Memory (Resource Scope)
├── User Profiles
│   ├── Personal Information
│   ├── Purchase History
│   ├── Preferences
│   └── Interaction History
├── Product Knowledge
│   ├── Compatibility Rules
│   ├── Price Information
│   └── Technical Specifications
└── Conversation Context
    ├── Current Session
    ├── Previous Interactions
    └── Agent Handoffs

Agent-Specific Memory (Thread Scope)
├── PC Build Specialist
│   ├── Build Configurations
│   ├── Compatibility Checks
│   └── Price Calculations
├── RAM Specialist
│   ├── Memory Requirements
│   ├── Motherboard Compatibility
│   └── Performance Metrics
├── SSD Specialist
│   ├── Storage Needs
│   ├── Performance Requirements
│   └── Use Case Analysis
└── Barebone Specialist
    ├── Case Requirements
    ├── Component Fit
    └── Cooling Needs
```

#### 4. **Integration Points**
```
External Systems Integration
├── Product Database (Excel/ERP)
│   ├── Real-time Sync
│   ├── Inventory Updates
│   └── Price Changes
├── Communication Channels
│   ├── Telegram Bot
│   ├── WhatsApp Business
│   ├── Web Chat Widget
│   └── Voice Integration
├── Analytics & Monitoring
│   ├── User Behavior
│   ├── Conversion Tracking
│   ├── Agent Performance
│   └── System Health
└── Business Intelligence
    ├── Sales Forecasting
    ├── Customer Insights
    └── Product Recommendations
```

#### 5. **Workflow Routing Diagram**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        WORKFLOW ROUTING SYSTEM                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────┐
│   User Message  │
│  "Tôi muốn mua  │
│    PC gaming"   │
└─────────┬───────┘
          │
          ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         INTENT ANALYSIS                                   ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │                    Main Agent (maiSale)                             │ ║
║  │                                                                     │ ║
║  │  Input: "Tôi muốn mua PC gaming"                                   │ ║
║  │                                                                     │ ║
║  │  Analysis:                                                         │ ║
║  │  • Intent: pc-build                                                │ ║
║  │  • Confidence: 0.95                                                │ ║
║  │  • Entities: ["gaming", "pc"]                                      │ ║
║  │  • Budget: unknown                                                 │ ║
║  │                                                                     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════╝
          │
          ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         AGENT ROUTING                                     ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │                    Routing Decision                                 │ ║
║  │                                                                     │ ║
║  │  Intent: pc-build → PC Build Specialist                            │ ║
║  │  Intent: ram → RAM Specialist                                      │ ║
║  │  Intent: ssd → SSD Specialist                                      │ ║
║  │  Intent: barebone → Barebone Specialist                            │ ║
║  │                                                                     │ ║
║  │  Context Transfer:                                                 │ ║
║  │  • User Profile                                                    │ ║
║  │  • Conversation History                                            │ ║
║  │  • Previous Preferences                                            │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════╝
          │
          ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                     SPECIALIZED CONSULTATION                              ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │                PC Build Specialist                                  │ ║
║  │                                                                     │ ║
║  │  Step 1: Ask Budget → "Budget của bạn là bao nhiêu?"               │ ║
║  │  Step 2: Analyze Use Case → Gaming PC Configuration                │ ║
║  │  Step 3: CPU Selection → Intel i5/i7 or AMD Ryzen 5/7              │ ║
║  │  Step 4: Motherboard Match → Compatible chipset                    │ ║
║  │  Step 5: RAM Recommendation → DDR4/DDR5 based on CPU               │ ║
║  │  Step 6: SSD Selection → NVMe for performance                      │ ║
║  │  Step 7: Compatibility Check → All components compatible           │ ║
║  │  Step 8: Price Calculation → Within budget                         │ ║
║  │  Step 9: Generate Options → Top 3 configurations                   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════╝
          │
          ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         RESPONSE & HANDOFF                                ║
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │                    Final Response                                   │ ║
║  │                                                                     │ ║
║  │  "Dựa trên nhu cầu gaming của bạn với budget X triệu,              │ ║
║  │   tôi khuyến nghị 3 cấu hình sau:                                  │ ║
║  │                                                                     │ ║
║  │   1. Cấu hình cơ bản: CPU i5, 16GB RAM, GTX 1660...               │ ║
║  │   2. Cấu hình trung cấp: CPU i7, 32GB RAM, RTX 3060...            │ ║
║  │   3. Cấu hình cao cấp: CPU i9, 64GB RAM, RTX 4070...              │ ║
║  │                                                                     │ ║
║  │   Bạn muốn tôi giải thích chi tiết cấu hình nào không?"            │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### 6. **Memory Flow Diagram**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          MEMORY FLOW ARCHITECTURE                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔═══════════════╗    ╔══════════════════╗    ╔══════════════════════════════╗
║   User Input  ║───▶║  Intent Analysis ║───▶║    Agent Selection           ║
║               ║    ║                  ║    ║                              ║
║ • Message     ║    ║ • NLP Processing ║    ║ • Route to Specialist        ║
║ • Context     ║    ║ • Entity Extract ║    ║ • Context Transfer           ║
║ • History     ║    ║ • Intent Class.  ║    ║ • Memory Inheritance         ║
╚═══════════════╝    ╚══════════════════╝    ╚══════════════════════════════╝
         │                     │                        │
         │                     │                        │
         ▼                     ▼                        ▼
╔═══════════════╗    ╔══════════════════╗    ╔══════════════════════════════╗
║Shared Memory  ║    ║ Agent Memory     ║    ║  Specialized Memory          ║
║(Resource)     ║    ║ (Thread)         ║    ║  (Domain Specific)           ║
╠═══════════════╣    ╠══════════════════╣    ╠══════════════════════════════╣
║ • User Profile║    ║ • Session State  ║    ║ • Domain Knowledge           ║
║ • Preferences ║    ║ • Temp Data      ║    ║ • Product Expertise          ║
║ • History     ║    ║ • Working Notes  ║    ║ • Compatibility Rules        ║
║ • Purchase Rec║    ║ • Current Task   ║    ║ • Technical Specifications   ║
╚═══════════════╝    ╚══════════════════╝    ╚══════════════════════════════╝
         ▲                     ▲                        ▲
         │                     │                        │
         │                     │                        │
╔═══════════════╗    ╔══════════════════╗    ╔══════════════════════════════╗
║   Response    ║◀───║  Memory Update   ║◀───║    Consultation Result        ║
║   Generation  ║    ║                  ║    ║                              ║
║               ║    ║ • Update Profile ║    ║ • Product Recommendations     ║
║ • Final Answer║    ║ • Save Preferences║    ║ • Technical Details          ║
║ • Suggestions ║    ║ • Log Interaction║    ║ • Compatibility Info          ║
╚═══════════════╝    ╚══════════════════╝    ╚══════════════════════════════╝

╔══════════════════════════════════════════════════════════════════════════════╗
║                        MEMORY SYNCHRONIZATION                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                          Memory Sync Process                               │
│                                                                           │
│  1. Agent receives context from Main Agent                               │
│     ├── User profile (resource scope)                                    │
│     ├── Conversation history                                             │
│     └── Previous preferences                                             │
│                                                                           │
│  2. Agent loads domain-specific memory                                   │
│     ├── Product knowledge                                                │
│     ├── Compatibility rules                                              │
│     └── Technical specifications                                         │
│                                                                           │
│  3. Consultation process updates memory                                  │
│     ├── Working memory (current session)                                 │
│     ├── User preferences (learned)                                       │
│     └── Product recommendations                                          │
│                                                                           │
│  4. Memory sync back to shared storage                                   │
│     ├── Update user profile                                              │
│     ├── Save conversation context                                        │
│     └── Log agent performance                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 7. **Integration Flow Diagram**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        INTEGRATION FLOW                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔══════════════════════════════╗
║        External Systems      ║
╚══════════════════════════════╝
                │
                ▼
╔══════════════════════════════╗    ╔══════════════════════════════╗
║     Product Database         ║    ║    Communication Channels    ║
║     (Excel/ERP System)       ║    ║                              ║
╠══════════════════════════════╣    ╠══════════════════════════════╣
║ • Real-time data sync        ║    ║ • Telegram Bot API          ║
║ • Inventory updates          ║    ║ • WhatsApp Business API     ║
║ • Price changes              ║    ║ • Web Chat Widget           ║
║ • New product additions      ║    ║ • Voice Integration         ║
╚══════════════════════════════╝    ╚══════════════════════════════╝
                │                              │
                └──────────────────────────────┘
                               │
                               ▼
╔══════════════════════════════╗    ╔══════════════════════════════╗
║      Data Processing Layer   ║    ║       Memory System          ║
╚══════════════════════════════╝    ╚══════════════════════════════╝
                │
                ▼
╔══════════════════════════════╗    ╔══════════════════════════════╗
║        RAG System            ║    ║       Memory System          ║
║        (Chroma)              ║    ║       (LibSQL)               ║
╠══════════════════════════════╣    ╠══════════════════════════════╣
║ • Document chunking          ║    ║ • User profiles             ║
║ • Vector embeddings          ║    ║ • Conversation history      ║
║ • Similarity search          ║    ║ • Preferences               ║
║ • Product recommendations     ║    ║ • Agent state              ║
╚══════════════════════════════╝    ╚══════════════════════════════╝
                │                              │
                └──────────────────────────────┘
                               │
                               ▼
╔══════════════════════════════╗    ╔══════════════════════════════╗
║     Agent Orchestration      ║    ║     Analytics & Monitoring   ║
╚══════════════════════════════╝    ╚══════════════════════════════╝
                │
                ▼
╔══════════════════════════════╗    ╔══════════════════════════════╗
║   Workflow Engine            ║    ║     Analytics & Monitoring   ║
║   (Mastra)                   ║    ║                              ║
╠══════════════════════════════╣    ╠══════════════════════════════╣
║ • Intent analysis            ║    ║ • User behavior tracking     ║
║ • Agent routing              ║    ║ • Conversion metrics         ║
║ • Consultation flows         ║    ║ • Agent performance          ║
║ • Response generation        ║    ║ • System health             ║
╚══════════════════════════════╝    ╚══════════════════════════════╝
                │                              │
                └──────────────────────────────┘
                               │
                               ▼
╔══════════════════════════════╗    ╔══════════════════════════════╗
║      Response Delivery       ║    ║     Error Handling & Fallback║
╚══════════════════════════════╝    ╚══════════════════════════════╝
```

#### 8. **Real-time Communication Flow**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   REAL-TIME COMMUNICATION FLOW                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                           User Interaction                                 │
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Message   │───▶│  Channel   │───▶│   Queue     │───▶│   Agent     │ │
│  │   Input     │    │  Adapter   │    │   System    │    │   System    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                │                     │                │          │
│         │                │                     │                │          │
│         ▼                ▼                     ▼                ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Telegram  │    │   Webhook   │    │   Redis     │    │   Mastra    │ │
│  │   Bot API   │    │   Handler   │    │   Queue     │    │   Engine    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Agent Processing Flow                              │
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Intent    │───▶│   Route     │───▶│   Consult   │───▶│   Generate  │ │
│  │   Analysis  │    │   Agent     │    │   Agent     │    │   Response  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                │                     │                │          │
│         │                │                     │                │          │
│         ▼                ▼                     ▼                ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   NLP       │    │   Workflow  │    │   RAG       │    │   Template   │ │
│  │   Engine    │    │   Engine    │    │   Search    │    │   Engine    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        Response Delivery Flow                              │
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Format    │───▶│   Channel   │───▶│   Send      │───▶│   Track     │ │
│  │   Response  │    │   Adapter   │    │   Message   │    │   Metrics   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                │                     │                │          │
│         │                │                     │                │          │
│         ▼                ▼                     ▼                ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Markdown  │    │   Telegram  │    │   API       │    │   Analytics │ │
│  │   to Text   │    │   API       │    │   Call      │    │   System    │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9. **Error Handling & Fallback Flow**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                     ERROR HANDLING & FALLBACK                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Error Scenarios                                    │
│                                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │   Agent Error   │    │   System Error  │    │   Timeout       │       │
│  │                 │    │                 │    │                 │       │
│  │ • Model failure │    │ • DB down       │    │ • Long response │       │
│  │ • API limit     │    │ • Network issue │    │ • Stuck agent   │       │
│  │ • Bad input     │    │ • Service crash │    │ • Queue full    │       │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘       │
│         │                │                     │                         │
│         ▼                ▼                     ▼                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐       │
│  │   Detect Error  │    │   Fallback      │    │   Retry Logic   │       │
│  │                 │    │   Strategy      │    │                 │       │
│  │ • Error type    │    │ • Simple resp   │    │ • Exponential   │       │
│  │ • Severity      │    │ • Main agent    │    │ • Max retries   │       │
│  │ • Context       │    │ • Manual        │    │ • Circuit break │       │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      Fallback Hierarchy                                   │
│                                                                           │
│  1. Try Specialized Agent → 2. Fallback to Main Agent                    │
│     ├── Same domain fallback      ├── General consultation               │
│     └── Simplified response       └── Basic recommendations              │
│                                                                           │
│  3. Try Cached Response → 4. Static Response                             │
│     ├── Previous similar query    ├── Predefined answers                │
│     └── Template-based response   └── Contact human support              │
│                                                                           │
│  5. Error Notification → 6. System Recovery                              │
│     ├── Alert developers         ├── Restart services                    │
│     └── Log incident             └── Failover to backup                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 10. **Performance Monitoring Dashboard**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                   PERFORMANCE MONITORING DASHBOARD                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

╔═══════════════╗    ╔═══════════════╗    ╔═══════════════╗    ╔═══════════════╗
║ Response Time ║    ║  Throughput   ║    ║   Accuracy    ║    ║ User Sat.     ║
║               ║    ║               ║    ║               ║    ║               ║
║ • Avg: 2.3s   ║    ║ • 150 req/min ║    ║ • 94.2%       ║    ║ • 4.6/5       ║
║ • P95: 4.1s   ║    ║ • Peak: 300   ║    ║ • Intent: 96% ║    ║ • +12% MoM    ║
║ • P99: 8.2s   ║    ║ • Error: 2%   ║    ║ • Route: 98%  ║    ║ • Target: 4.8 ║
╚═══════════════╝    ╚═══════════════╝    ╚═══════════════╝    ╚═══════════════╝

╔═══════════════╗    ╔═══════════════╗    ╔═══════════════╗    ╔═══════════════╗
║ Agent Usage   ║    ║ Memory Usage  ║    ║ Error Rates   ║    ║ Cost Analysis ║
║               ║    ║               ║    ║               ║    ║               ║
║ • Main: 35%   ║    ║ • RAM: 2.1GB  ║    ║ • Total: 1.2% ║    ║ • $0.023/req  ║
║ • PC Build:25%║    ║ • Disk: 45GB ║    ║ • Agent: 0.8% ║    ║ • $450/month   ║
║ • RAM: 20%    ║    ║ • Cache: 89%  ║    ║ • System:0.4% ║    ║ • Budget: $600 ║
║ • SSD: 12%    ║    ║               ║    ║               ║    ║               ║
║ • Barebone:8% ║    ║               ║    ║               ║    ║               ║
╚═══════════════╝    ╚═══════════════╝    ╚═══════════════╝    ╚═══════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                        Real-time Metrics                                  │
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Active Users│    │ Queue Depth │    │ CPU Usage   │    │ Memory      │ │
│  │ • Current:47│    │ • Messages:3│    │ • System:23%│    │ • Used: 2.1G│ │
│  │ • Peak: 156 │    │ • Processing│    │ • User: 45% │    │ • Free: 4.2G│ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Conversions │    │ Error Rate  │    │ Avg Resp   │    │ Uptime      │ │
│  │ • Today: 23 │    │ • Last Hr:0%│    │ • Time:2.1s│    │ • 99.97%     │ │
│  │ • Week: 145 │    │ • Last Day:│    │ • Target:<3s│    │ • SLA: 99.9% │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```
