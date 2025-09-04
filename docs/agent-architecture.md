# Kiến trúc Agent Tư vấn Sản phẩm SSTC

## Tổng quan

Hệ thống agent tư vấn sản phẩm SSTC sử dụng **kiến trúc hybrid** kết hợp giữa một agent điều phối chính (Main Agent) và các agent chuyên môn (Specialized Agents) cho từng loại sản phẩm.

## Kiến trúc Hiện Tại

Hệ thống hiện đang vận hành theo mô hình **định tuyến trực tiếp** (Direct Routing), nơi các tin nhắn từ khách hàng được phân tích bởi An-Data-Analyst và sau đó được định tuyến trực tiếp đến agent chuyên trách phù hợp.

### Luồng Xử Lý Hiện Tại
```
Customer Message 
    ↓
An-Data-Analyst (phân tích intent)
    ↓
Agent Routing (chuyển tiếp trực tiếp)
    ↓
Specialized Agent (trả lời trực tiếp khách hàng)
```

## Kiến trúc Mới Đề Xuất: Xử Lý Song Song

Để cải thiện trải nghiệm người dùng và hiệu suất hệ thống, chúng tôi đề xuất chuyển sang **kiến trúc xử lý song song** (Parallel Processing Architecture) với An-Data-Analyst làm trung tâm điều phối.

### Luồng Xử Lý Mới
```
Customer Message 
    ↓
An-Data-Analyst (phân tích intent)
    ↓
Decision Point:
├── Không rõ intent → Mai xử lý trực tiếp
└── Rõ intent → Parallel Processing:
    ├── Specialist Agent (xử lý chuyên sâu, trả về dữ liệu)
    └── Mai Agent (chuẩn bị response structure)
    ↓
Mai tổng hợp dữ liệu từ Specialist → Trả lời khách hàng
```

### Lợi Ích Chính Của Kiến Trúc Mới

#### 1. Trải Nghiệm Người Dùng Tốt Hơn
- **Thời gian phản hồi nhanh hơn**: Mai bắt đầu xử lý ngay lập tức
- **Thông báo minh bạch**: Khách hàng được thông báo rõ ràng khi cần chờ
- **Tương tác tự nhiên**: Luôn tương tác với Mai - nhân viên quen thuộc

#### 2. Kiến Trúc Linh Hoạt
- **Dễ mở rộng**: Thêm specialist mới mà không thay đổi workflow chính
- **Tách biệt concerns**: An-Data-Analyst tập trung phân tích, Mai tập trung giao tiếp
- **Quản lý lỗi tốt**: Cơ chế timeout/retry rõ ràng

#### 3. Hiệu Suất Tối Ưu
- **Xử lý song song**: Tận dụng tối đa tài nguyên hệ thống
- **Tối ưu thời gian**: Giảm thời gian chờ cảm nhận của khách hàng

## Chi Tiết Triển Khai Kiến Trúc Mới

### Phase 1: Core Infrastructure (Tuần 1-2)

#### 1.1 Cải Tiến An-Data-Analyst
**File ảnh hưởng**: `/src/mastra/agents/an-data-analyst.ts`

**Công việc cần làm**:
- Bổ sung logic xác định specialist dựa trên keywords
- Thêm confidence scoring cho routing decisions
- Chuẩn bị context data cho xử lý song song
- Cập nhật tool intent analyzer với logic routing nâng cao

#### 1.2 Framework Xử Lý Song Song
**Tạo mới**: `/src/mastra/core/parallel-processing/framework.ts`

**Công việc cần làm**:
- Tạo interface ParallelProcessingFramework với các phương thức:
  - initiateParallelProcessing: Khởi tạo xử lý song song
  - waitForSpecialistData: Chờ dữ liệu từ specialist với timeout
  - handleTimeoutScenario: Xử lý kịch bản timeout
- Implement cơ chế quản lý processing sessions
- Tạo hệ thống tracking cho các xử lý đang chạy

#### 1.3 Cơ Chế Timeout/Retry
**Tạo mới**: `/src/mastra/core/parallel-processing/timeout-manager.ts`

**Công việc cần làm**:
- Tạo class TimeoutManager với chiến lược timeout progressive
- Implement waitForData với Promise.race để timeout handling
- Tạo progressiveRetry với exponential backoff
- Thêm logging và monitoring cho timeout events

### Phase 2: Cải Tiến Mai Agent (Tuần 2)

#### 2.1 Khả Năng Nhận Dữ Liệu Từ Specialist
**File ảnh hưởng**: `/src/mastra/agents/mai-agent.ts`

**Công việc cần làm**:
- Bổ sung khả năng xử lý dữ liệu từ specialist
- Implement data validation logic cho specialist inputs
- Tạo error handling mechanisms cho dữ liệu không đầy đủ
- Cập nhật instructions cho Mai với khả năng mới

#### 2.2 Templates Phản Hồi Theo Loại Dữ Liệu
**Tạo mới**: `/src/mastra/agents/mai-agent/response-templates.ts`

**Công việc cần làm**:
- Tạo response templates cho từng loại specialist data (RAM, GPU, CPU, v.v.)
- Implement template selection logic dựa trên loại dữ liệu nhận được
- Thêm timeout communication templates
- Tạo progress indication templates

### Phase 3: Chuyển Đổi RAM Specialist (Tuần 3)

#### 3.1 Thay Đổi Từ Trả Lời Sang Cung Cấp Dữ Liệu
**File ảnh hưởng**: `/src/mastra/agents/ram-specialist.ts`

**Công việc cần làm**:
- Chuyển đổi RAM specialist từ customer-facing responder sang data provider
- Bổ sung structured data output formats
- Thêm technical analysis capabilities
- Implement recommendation scoring system

#### 3.2 Định Dạng Dữ Liệu Chuẩn Cho Specialist
**Tạo mới**: `/src/mastra/core/models/specialist-data-models.ts`

**Công việc cần làm**:
- Tạo interface SpecialistData với các fields cần thiết
- Định nghĩa ProductRecommendation interface
- Thêm processing metadata fields
- Implement data validation và normalization logic

### Phase 4: Workflow Integration (Tuần 4)

#### 4.1 Cập Nhật Message Processor Workflow
**File ảnh hưởng**: `/src/mastra/workflows/message-processor.ts`

**Công việc cần làm**:
- Cập nhật workflow với mô hình xử lý song song
- Thêm parallel processing initiation logic
- Implement data synchronization giữa Mai và specialist
- Thêm timeout/retry handling trong workflow

#### 4.2 Hệ Thống Quản Lý Context Chia Sẻ
**Tạo mới**: `/src/mastra/core/memory/shared-context-manager.ts`

**Công việc cần làm**:
- Tạo SharedContextManager để quản lý context chia sẻ
- Implement createContextBundle để tạo context bundle
- Thêm updateContextWithSpecialistData để cập nhật context
- Tạo conflict resolution mechanisms

## Timeline Triển Khai Chi Tiết

### Tuần 1: Core Infrastructure
**Ngày 1-3**: Thiết kế Parallel Processing Framework
- Thiết kế interfaces và data structures
- Xây dựng timeout/retry mechanisms
- Tạo skeleton code cho framework components

**Ngày 4-5**: Implement Parallel Processing Core
- Implement ParallelProcessingFramework
- Implement TimeoutManager
- Tạo context management utilities

**Ngày 6-7**: Testing và Integration
- Unit testing framework components
- Integration testing với existing workflow
- Hoàn thiện documentation

### Tuần 2: Mai Agent Enhancement
**Ngày 1-2**: Data Reception Interface
- Cập nhật Mai agent với khả năng nhận dữ liệu
- Implement data validation logic
- Tạo error handling mechanisms

**Ngày 3-4**: Response Synthesis Engine
- Implement template-based response generation
- Tạo natural language synthesis từ structured data
- Thêm personality preservation mechanisms

**Ngày 5-7**: Timeout Handling
- Implement customer communication during delays
- Tạo progress indication systems
- Thêm retry coordination logic

### Tuần 3: Specialist Transformation
**Ngày 1-3**: RAM Specialist Restructuring
- Chuyển đổi RAM specialist từ responder sang data provider
- Implement structured data output formats
- Thêm technical analysis capabilities

**Ngày 4-5**: Data Model Standardization
- Tạo standardized data models cho tất cả specialists
- Implement data validation và normalization
- Thêm compatibility checking logic

**Ngày 6-7**: Testing và Optimization
- Test specialist data output quality
- Tối ưu processing performance
- Validate data consistency

### Tuần 4: Workflow Integration
**Ngày 1-2**: Workflow Restructuring
- Cập nhật message processor workflow
- Implement parallel processing initiation
- Thêm data synchronization logic

**Ngày 3-4**: Context Management Enhancement
- Implement shared context management
- Thêm context versioning và synchronization
- Tạo conflict resolution mechanisms

**Ngày 5-7**: End-to-End Testing
- Full system integration testing
- Performance optimization
- User experience validation

## Risk Mitigation Strategies

### 1. Performance Risks
**Risk**: Increased resource usage from parallel processing
**Mitigation**: 
- Implement resource monitoring và alerts
- Add load balancing cho high-traffic periods
- Create graceful degradation cho resource constraints

### 2. Data Consistency Risks
**Risk**: Race conditions giữa Mai và specialists
**Mitigation**:
- Implement data versioning và timestamps
- Add data integrity checks và validation
- Create rollback mechanisms cho inconsistent data

### 3. User Experience Risks
**Risk**: Confusing timeout communications
**Mitigation**:
- A/B testing different timeout messages
- Implement progressive timeout escalation
- Add customer preference settings cho communication style

### 4. Technical Debt Risks
**Risk**: Complex codebase với multiple coordination points
**Mitigation**:
- Comprehensive documentation và diagrams
- Regular code reviews và refactoring
- Automated testing cho all coordination scenarios

## Success Metrics

### Technical Metrics
- **Response Time**: <2 seconds cho 95% requests
- **Timeout Rate**: <5% specialist requests
- **Error Rate**: <1% system errors
- **Resource Usage**: <20% CPU utilization during peak

### User Experience Metrics
- **Customer Satisfaction**: >4.5/5 rating
- **Response Quality**: >90% relevant responses
- **Wait Time Perception**: <10% customer complaints about delays

### Business Metrics
- **Conversion Rate**: 15% improvement in product inquiries to sales
- **Customer Retention**: 20% improvement in return customers
- **Support Efficiency**: 25% reduction in follow-up questions

## Rollback Plan

If implementation faces critical issues:

1. **Immediate Rollback**: Revert to direct routing within 2 hours
2. **Incremental Rollout**: Deploy to subset of users for testing
3. **Feature Flag**: Implement toggle to switch between architectures
4. **Monitoring**: Enhanced observability for rapid issue detection

This approach provides a balanced evolution of the current system while significantly improving the customer experience and maintaining system reliability.