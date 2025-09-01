# Boarding Guide for Mastra Agent Project

## Tổng quan dự án
## Cấu trúc thư mục src/mastra/

```
src/mastra/
├── agents/
│   └── mai-agent.ts         # Định nghĩa agent Mai Sale (personality, memory, logic)
├── channels/
│   ├── line/                # Adapter cho kênh Line
│   ├── telegram/            # Adapter cho Telegram
│   ├── web/                 # Adapter cho Web chat
│   ├── whatsapp/            # Adapter cho WhatsApp
│   └── zalo/                # Adapter cho Zalo
├── core/
│   ├── channels/            # Đăng ký, quản lý các kênh
│   ├── models/              # Định nghĩa schema dữ liệu (user, message...)
│   ├── processor/           # Xử lý logic message, intent
│   └── signals/             # Quản lý tín hiệu, sự kiện nội bộ
├── database/
│   └── libsql.ts            # Cấu hình và truy cập database LibSQL
├── embedding/
│   └── provider.ts          # Provider cho embedding (OpenAI, custom...)
├── index.ts                 # Khởi tạo agent, đăng ký workflow, kênh, storage, logger
├── llm/
│   ├── adapter.ts           # Adapter cho LLM, xử lý gọi model
│   ├── index.ts             # Export các hàm LLM
│   └── provider.ts          # Provider cho LLM (OpenAI, vLLM...)
├── tools/                   # (Hiện tại trống)
├── vector/
│   └── chroma.ts            # Provider cho vector database Chroma
└── workflows/
  └── message-processor.ts # Workflow xử lý tin nhắn đa kênh
```

### Giải thích các thành phần chính
- **agents/**: Chứa các agent AI, mỗi file là một agent với personality, memory, logic riêng.
  - `mai-agent.ts`: Agent Mai Sale, chuyên tư vấn sản phẩm SSTC, có personality và memory.
- **channels/**: Adapter cho từng kênh chat, giúp agent giao tiếp với khách hàng trên nhiều nền tảng.
- **core/**: Quản lý đăng ký kênh, schema dữ liệu, xử lý intent, và các tín hiệu nội bộ.
- **database/**: Kết nối và cấu hình database (LibSQL).
- **embedding/**: Provider cho embedding server, dùng để phân tích ngữ nghĩa, tìm kiếm semantic.
- **llm/**: Tích hợp các mô hình ngôn ngữ lớn (LLM) như OpenAI, vLLM, xử lý sinh phản hồi.
- **tools/**: Các công cụ mở rộng cho agent, ví dụ tra cứu thời tiết.
- **vector/**: Tích hợp vector database (Chroma) để lưu trữ và truy vấn embedding.
- **workflows/**: Định nghĩa các workflow xử lý message, ví dụ message-processor cho đa kênh.
- **index.ts**: Điểm khởi tạo agent, đăng ký các thành phần, khởi động hệ thống.

Mastra Agent là một hệ thống agent AI đa kênh, hỗ trợ các nền tảng chat như Telegram, Zalo, WhatsApp, Web, v.v. Dự án tập trung vào việc xây dựng các agent thông minh (ví dụ: Mai Sale) có thể xử lý tin nhắn, tư vấn sản phẩm, và tương tác với khách hàng qua nhiều kênh.

## Kiến trúc chính
- **Agent**: Định nghĩa tính cách, hành vi, và logic xử lý hội thoại. Ví dụ: `mai-agent.ts` mô tả agent Mai Sale với profile thân thiện, nhiệt tình, chuyên tư vấn sản phẩm SSTC.
- **Channels**: Adapter cho từng kênh chat (Telegram, Zalo, WhatsApp, Web...) giúp agent giao tiếp với khách hàng trên nhiều nền tảng.
- **Workflows**: Quy trình xử lý tin nhắn, phân tích ý định, sinh phản hồi, thực thi hành động. File `message-processor.ts` là workflow chính cho xử lý tin nhắn đa kênh.
- **LLM & Embedding**: Tích hợp các mô hình ngôn ngữ lớn (LLM) và embedding server (OpenAI, vLLM...) để sinh phản hồi và phân tích ngữ nghĩa.
- **Vector Database**: Sử dụng Chroma để lưu trữ và truy vấn vector embedding cho các tác vụ AI nâng cao.
- **Database**: Sử dụng LibSQL để lưu trữ dữ liệu agent, người dùng, và các thông tin liên quan.
- **Tools**: Các công cụ mở rộng như `weather-tool.ts` cho phép agent tra cứu thông tin thời tiết, v.v.

## Quy trình khởi động
- Khởi tạo Mastra agent qua file `index.ts`, đăng ký các workflow, agent, storage, logger.
- Tự động đăng ký kênh Telegram nếu có token trong biến môi trường.
- Các kênh khác (Zalo, WhatsApp, Web...) có thể đăng ký tương tự qua adapter.

## Cấu hình môi trường
- Đặt các biến môi trường trong file `.env`:
  - `TELEGRAM_BOT_TOKEN`, `LIBSQL_URL`, `LIBSQL_AUTH_TOKEN`, `EMBEDDER_BASE_URL`, `EMBEDDER_API_KEY`, `EMBEDDER_MODEL`, `VLLM_BASE_URL`, `VLLM_API_KEY`, `GENERATE_MODEL`, `CHROMA_HOST`, ...

## Bắt đầu code
1. Đọc file `src/mastra/index.ts` để hiểu cách khởi tạo agent và đăng ký kênh.
2. Xem `agents/mai-agent.ts` để hiểu cách xây dựng agent với personality và memory.
3. Tham khảo các adapter trong `channels/` để thêm hoặc sửa kênh chat.
4. Xem `workflows/message-processor.ts` để hiểu quy trình xử lý tin nhắn.
5. Sử dụng các provider trong `llm/`, `embedding/`, `vector/` để tích hợp AI.
6. Thêm công cụ mới vào `tools/` nếu muốn mở rộng chức năng agent.

## Liên hệ & đóng góp
- Đọc thêm các file trong thư mục `docs/` để hiểu chi tiết từng phần.
- Đóng góp code theo chuẩn TypeScript, tuân thủ cấu trúc thư mục hiện tại.

---
**Lưu ý:** Dự án ưu tiên mở rộng đa kênh, dễ tích hợp AI, và tối ưu cho các tác vụ hội thoại thông minh.
