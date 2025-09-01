
# 📨 Message Flow trong Mastra Agent

## Kiến trúc tổng quan

```
[Telegram, WhatsApp, Web, ...]
             ↓
    [External Channels] → [Channel Adapters] → [Central Message Processor] → [Mastra Workflows] → [Agents] → [Response]
                                                                                     ↓
                                                                            [Channel Adapters] → [External Channels]
```

## 1. Nhận message từ kênh (ví dụ: Telegram)
- **Telegram API** gửi message đến **Telegram Adapter**.
- Adapter **normalize** message về format chuẩn (`NormalizedMessage`).
- Adapter chuyển message đến **CentralMessageProcessor**.

## 2. Xử lý trung tâm (Central Processor)
- **Deduplicate**: Kiểm tra trùng lặp message (dựa trên `channelId-messageId`).
- **Gọi workflow xử lý**:
  - Sử dụng `channelMessageWorkflow` (định nghĩa trong `src/mastra/workflows/message-processor.ts`).
  - Truyền vào: `channelId`, nội dung, senderId, timestamp, attachments.
- **Nhận kết quả** từ workflow (response, metadata...).

## 3. Workflow xử lý
- **Bước 1: Intent Analysis**
  - Phân tích ý định người dùng (ví dụ: muốn mua laptop, hỏi giá...).
- **Bước 2: Response Generation**
  - Gọi **Agent (maiSale)** để sinh câu trả lời phù hợp.
  - Agent sử dụng LLM (Large Language Model) và context đầy đủ.

## 4. Agent (maiSale) xử lý
- **Instructions/Personality**: Được nhúng sẵn (nhiệt tình, thân thiện, chuyên nghiệp, luôn xưng "em", gọi khách là "quý khách", hỗ trợ đa ngôn ngữ...).
- **Memory**: Lưu lịch sử hội thoại, user profile (tên, ngôn ngữ, sở thích, mục tiêu, v.v.).
- **Semantic Recall**: Truy xuất các tin nhắn tương tự để tăng tính liên kết.
- **Gọi LLM**: Truyền vào context gồm:
  - System prompt (tính cách)
  - User profile
  - Lịch sử hội thoại
  - Tin nhắn hiện tại

## 5. Logic xây dựng câu trả lời
- **Phân tích ý định**: Xác định nhu cầu, đối tượng, ngôn ngữ.
- **Áp dụng tính cách**: Thân thiện, nhiệt tình, cá nhân hóa.
- **Cá nhân hóa**: Sử dụng thông tin profile (tên, sở thích...).
- **Thu thập thêm thông tin**: Đặt câu hỏi dẫn dắt nếu cần.
- **Xây dựng câu trả lời**: Theo cấu trúc:
  - Lời chào + giới thiệu
  - Phân tích nhu cầu
  - Đặt câu hỏi dẫn dắt
  - Kết thúc tích cực

## 6. Trả lời người dùng
- **LLM trả về response** → Agent → Workflow → Central Processor → Adapter → Người dùng.

## 7. Cập nhật User Profile
- Sau mỗi tương tác, agent tự động cập nhật user profile (tên, ngôn ngữ, sở thích, lastInteraction...).
- Thông tin này được lưu trong metadata của response.

## 8. Vòng lặp liên tục
1. Nhận message mới
2. Phân tích ý định
3. Kiểm tra & cập nhật profile
4. Áp dụng tính cách
5. Sinh nội dung trả lời
6. Trả lời người dùng

---

### **Ưu điểm hệ thống**
- **Nhất quán**: Luôn tuân thủ personality đã định.
- **Cá nhân hóa**: Dựa trên user profile, lịch sử.
- **Thông minh**: Học hỏi, cập nhật profile liên tục.
- **Dễ bảo trì, mở rộng**: Tính cách nhúng, dễ thêm kênh mới.

---

### **Bổ sung từ code**
- **Session & Greeting**: Agent có logic chào hỏi đầu session, tạm biệt khi kết thúc, và reset cờ greeting để lần sau greeting lại.
- **Deduplication**: Xử lý trùng lặp message ở Central Processor.
- **Workflow**: Có thể mở rộng thêm step (ví dụ: tích hợp tool, kiểm tra tồn kho...).

---

> **File tham khảo chính:**  
> - `docs/message-flow.md`  
> - `src/mastra/workflows/message-processor.ts`  
> - `src/mastra/agents/mai-agent.ts`  
> - `src/mastra/core/processor/message-processor.ts`

---

Nếu cần chi tiết về bất kỳ bước nào hoặc code mẫu, hãy yêu cầu!
