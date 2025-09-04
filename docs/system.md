# Mô tả hệ thống

Tài liệu này mô tả kiến trúc tổng quan, các thành phần chính và luồng hoạt động của hệ thống SSTC Agent.

## 1. Kiến trúc tổng quan

Hệ thống được xây dựng dưới dạng một nền tảng chatbot (agent platform) dựa trên framework **Mastra**. Kiến trúc này bao gồm các thành phần chính sau:

- **API Server:** Một máy chủ REST API được xây dựng bằng Express.js, đóng vai trò là cổng giao tiếp chính (gateway) cho tất cả các tương tác từ bên ngoài.
- **Mastra Core Engine:** Hạt nhân của hệ thống, quản lý vòng đời của các agents, workflows, channels và các dịch vụ cốt lõi khác.
- **Channels:** Các adapter để kết nối với nhiều nền tảng nhắn tin khác nhau (ví dụ: Telegram, Zalo, Web).
- **Agents:** Các "bộ não" chuyên biệt, mỗi agent chịu trách nhiệm xử lý một nghiệp vụ cụ thể (ví dụ: tư vấn bán hàng, xử lý mua hàng, bảo hành).
- **Unified Memory:** Một hệ thống bộ nhớ hợp nhất để lưu trữ lịch sử trò chuyện, ngữ cảnh và trạng thái của người dùng trên tất cả các kênh.
- **Workflow:** Luồng xử lý logic để điều phối thông tin giữa các kênh, bộ nhớ và agents.

![Agent Architecture](agent-architecture.md)

## 2. Các thành phần chính

### 2.1. API Server (`src/api-server.ts`)

Đây là điểm vào (entry point) chính của hệ thống cho các yêu cầu HTTP. Nó chịu trách nhiệm:

- Tiếp nhận tin nhắn từ các kênh hoặc client thông qua endpoint `POST /chat`.
- Cung cấp các endpoint để quản lý và theo dõi hệ thống.
- Giao tiếp với `channelMessageWorkflow` để xử lý tin nhắn.

**Các Endpoints chính:**

- `POST /chat`: Endpoint chính để xử lý một tin nhắn mới.
  - **Input:** `{ channelId, message, senderId }`
  - **Processing:** Chuyển tiếp yêu cầu đến `channelMessageWorkflow`.
- `GET /health`: Kiểm tra "sức khỏe" của hệ thống, bao gồm cả trạng thái của `unifiedMemoryManager`.
- `GET /memory/:userId/history`: Lấy lịch sử trò chuyện của một người dùng cụ thể.
- `POST /memory/:userId/reset`: Xóa bộ nhớ của một người dùng (dành cho mục đích quản trị/kiểm thử).
- `GET /analytics`: Lấy các số liệu thống kê về hệ thống (bộ nhớ, uptime...).
- `GET /greeting/:userId/status`: Kiểm tra xem một người dùng đã được chào hỏi lần đầu hay chưa (Greeting Control).

### 2.2. Mastra Core (`src/mastra/index.ts`)

Tệp này là nơi khởi tạo và cấu hình instance chính của Mastra, liên kết tất cả các thành phần lại với nhau.

- **Khởi tạo Mastra:** Tạo một instance `Mastra` và đăng ký các thành phần.
- **Đăng ký Agents:** Các agent như `maiSale`, `purchaseAgent`, `warrantyAgent`, `clarificationAgent`, `ramSpecialist` được đăng ký để hệ thống có thể định tuyến yêu cầu đến chúng.
- **Đăng ký Workflows:** `channelMessageWorkflow` được đăng ký làm workflow xử lý chính.
- **Cấu hình Storage:** Sử dụng `LibSQLStore` để lưu trữ dữ liệu (telemetry, evals). Mặc định đang được cấu hình để chạy trên bộ nhớ (`:memory:`).
- **Khởi tạo Channels:**
  - `TelegramChannelAdapter` và `ZaloChannelAdapter` được khởi tạo và đăng ký vào `channelRegistry` một cách tự động nếu các biến môi trường tương ứng (`TELEGRAM_BOT_TOKEN`, `ZALO_COOKIE`...) được cung cấp.
  - Điều này cho phép hệ thống có khả năng mở rộng và kết nối với nhiều kênh một cách linh hoạt.
- **Graceful Shutdown:** Quản lý việc tắt hệ thống một cách an toàn, đảm bảo các kênh được đóng đúng cách.

### 2.3. Workflow (`src/mastra/workflows/message-processor.ts`)

- **`channelMessageWorkflow`** là bộ điều phối trung tâm. Khi được `api-server` gọi, nó nhận thông tin tin nhắn và thực hiện các bước logic cần thiết, bao gồm:
  - Lấy ngữ cảnh từ bộ nhớ.
  - Định tuyến (route) tin nhắn đến agent phù hợp.
  - Nhận kết quả từ agent và trả về cho `api-server`.

### 2.4. Quản lý bộ nhớ (`src/mastra/core/memory/unified-memory-manager.ts`)

- **`unifiedMemoryManager`** cung cấp một giao diện duy nhất để tương tác với bộ nhớ của người dùng.
- **Chức năng:**
  - Lưu và truy xuất lịch sử trò chuyện.
  - **Greeting Control:** Quản lý trạng thái "đã chào hỏi" của người dùng. Agent có thể sử dụng `hasUserBeenGreeted` để quyết định có cần gửi lời chào cho người dùng mới hay không và dùng `markUserAsGreeted` sau khi đã tương tác lần đầu.
  - Cung cấp các số liệu thống kê về bộ nhớ.

## 3. Các ý định (Intents) được hỗ trợ

Hệ thống sử dụng agent `anDataAnalyst` và công cụ `intentAnalyzerTool` để phân tích tin nhắn của người dùng và phân loại chúng vào các ý định (intent) và chủ đề chuyên gia (specialist topics) cụ thể. Việc phân loại này hiện đang dựa trên phương pháp quét từ khóa (keyword-based).

### 3.1. Ý định chính (`primaryIntent`)

Đây là mục tiêu tổng quát nhất của người dùng.

*   **`purchase` (Mua hàng):**
    *   **Mô tả:** Người dùng có ý định tìm hiểu thông tin hoặc mua một sản phẩm.
    *   **Từ khóa kích hoạt:** `mua`, `buy`, `purchase`, `price`, `cost`, `order`, `dat hang`, `gia`.

*   **`warranty` (Bảo hành):**
    *   **Mô tả:** Người dùng đang gặp vấn đề với sản phẩm đã mua và cần hỗ trợ kỹ thuật hoặc bảo hành.
    *   **Từ khóa kích hoạt:** `bao hanh`, `warranty`, `guarantee`, `hong`, `broken`, `sua chua`, `bảo hành`.

*   **`mixed` (Hỗn hợp):**
    *   **Mô tả:** Tin nhắn của người dùng chứa từ khóa của cả hai ý định trên, cho thấy một yêu cầu phức tạp.

*   **`unknown` (Không xác định):**
    *   **Mô tả:** Hệ thống không tìm thấy đủ từ khóa để phân loại ý định một cách tự tin. Trong trường hợp này, `clarificationAgent` hoặc `maiSale` sẽ được sử dụng để làm rõ yêu cầu.

### 3.2. Chủ đề chuyên gia (`specialistNeeded`)

Đây là các chủ đề kỹ thuật cụ thể. Khi được nhắc đến, hệ thống sẽ kích hoạt luồng xử lý song song để lấy thông tin chuyên sâu từ các agent backend.

*   **`ram`:** Các yêu cầu liên quan đến bộ nhớ RAM.
    *   **Từ khóa:** `ram`, `memory`, `ddr4`, `ddr5`, `bộ nhớ`, `ram desktop`, `ram laptop`, `dual channel`, `single channel`.

*   **`gpu`:** Các yêu cầu liên quan đến card đồ họa.
    *   **Từ khóa:** `gpu`, `graphics card`, `card đồ họa`, `rtx`, `gtx`, `rx`.

*   **`cpu`:** Các yêu cầu liên quan đến bộ vi xử lý.
    *   **Từ khóa:** `cpu`, `processor`, `vi xử lý`, `intel`, `amd`, `ryzen`.

*   **`storage`:** Các yêu cầu liên quan đến thiết bị lưu trữ.
    *   **Từ khóa:** `ssd`, `hdd`, `ổ cứng`, `storage`, `drive`.

*   **`none`:** Không cần chuyên gia.

## 4. Luồng xử lý tin nhắn chi tiết (Message Flow)

Luồng xử lý được định nghĩa trong `channelMessageWorkflow` (`src/mastra/workflows/message-processor.ts`) và bao gồm 2 bước chính nối tiếp nhau: **`intent-analysis`** (Phân tích ý định) và **`agent-dispatcher`** (Điều phối Agent).

### 4.1. Bước 1: Phân tích ý định & Chuẩn bị ngữ cảnh (`intent-analysis`)

Mục tiêu của bước này là hiểu người dùng muốn gì và thu thập tất cả dữ liệu cần thiết để xử lý.

1.  **Tạo/Lấy ID Cuộc hội thoại:**
    - Một `conversationId` duy nhất được tạo ra cho mỗi người dùng trên mỗi kênh trong ngày. ID này là chìa khóa để truy xuất và lưu trữ ngữ cảnh cho toàn bộ cuộc trò chuyện.

2.  **Quản lý Ngữ cảnh (`sharedContextManager`):**
    - Hệ thống sử dụng `conversationId` để tìm kiếm **ngữ cảnh chung (`sharedContext`)** đã có.
    - Nếu chưa có, một ngữ cảnh mới sẽ được tạo, bao gồm `chatHistory` (lịch sử trò chuyện) và `userProfile` (thông tin người dùng).
    - Tin nhắn mới của người dùng ngay lập tức được thêm vào `sharedContext`.

3.  **Phân tích ý định bằng AI (`anDataAnalyst`):**
    - Hệ thống sử dụng agent `anDataAnalyst` với công cụ `intentAnalyzerTool` để phân tích tin nhắn và xác định `primaryIntent` và `specialistNeeded` dựa trên các từ khóa được định nghĩa ở trên.

3.  **Phân tích bằng từ khóa (Dự phòng):**
    - Nếu `anDataAnalyst` không phát hiện ra nhu cầu cần chuyên gia, hệ thống sẽ quét tin nhắn để tìm các từ khóa như `ssd`, `ổ cứng`, `cpu`, `intel`... để tự động định tuyến đến chuyên gia.

4.  **Cập nhật ngữ cảnh:**
    - Nếu `anDataAnalyst` tìm thấy thông tin mới về người dùng, `userProfile` trong `sharedContext` sẽ được cập nhật.

**Kết quả của Bước 1:** Dữ liệu đầu vào ban đầu được "làm giàu" thêm với `intent` (ý định), `chatHistory` (lịch sử chat), `specialistRouting` (thông tin định tuyến chuyên gia), và `conversationId`.

### 4.2. Bước 2: Điều phối Agent & Xử lý song song (`agent-dispatcher`)

Đây là bước cốt lõi, nơi quyết định agent nào sẽ trả lời và cách thức trả lời.

1.  **Kiểm soát lời chào (Greeting Control):**
    - Hệ thống kiểm tra trong `sharedContext` xem người dùng này đã được chào hỏi trước đây hay chưa (`hasBeenGreeted`). Đây là cơ sở cho việc quyết định có gửi lời chào lần đầu hay không.

2.  **Luồng xử lý song song (Parallel Processing) - Dành cho chuyên gia:**
    - Đây là một nhánh xử lý rất đặc biệt, được kích hoạt khi `specialistRouting.needed` là `true`.
    - **Kích hoạt đồng thời:**
        - **Agent chính (`maiSale`)** được yêu cầu tạo ra một câu trả lời tạm thời ngay lập tức (ví dụ: "Dạ, em đang kiểm tra thông tin về RAM cho mình, anh/chị vui lòng chờ trong giây lát...").
        - Cùng lúc đó, một **Agent chuyên gia backend** (ví dụ: `backendRAMSpecialist`) được gọi để truy vấn cơ sở dữ liệu hoặc các nguồn kiến thức kỹ thuật.
    - **Tích hợp kết quả:**
        - Hệ thống chờ kết quả từ agent chuyên gia trong một khoảng thời gian nhất định (ví dụ: 3 giây).
        - **Nếu chuyên gia trả về dữ liệu kịp thời:** Agent `maiSale` sẽ được gọi một lần nữa để tạo ra một câu trả lời cuối cùng, **tích hợp dữ liệu kỹ thuật** vừa nhận được.
        - **Nếu chuyên gia bị trễ (timeout) hoặc lỗi:** Câu trả lời tạm thời của `maiSale` sẽ được gửi đi để người dùng không phải chờ đợi.

3.  **Luồng xử lý thông thường (Normal Dispatching):**
    - Nếu không cần chuyên gia, hệ thống sẽ chọn một agent dựa trên ý định đã phân tích ở Bước 1:
        - `intent: 'purchase'` -> `purchaseAgent`
        - `intent: 'warranty'` -> `warrantyAgent`
        - Ý định không rõ ràng (`confidence < 0.5`) -> `clarificationAgent` (Agent làm rõ)
        - Mặc định/Các trường hợp khác -> `maiSale`

4.  **Thực thi Agent được chọn:**
    - Agent được chọn sẽ nhận toàn bộ ngữ cảnh, bao gồm lịch sử chat và tin nhắn của người dùng.
    - **Chỉ thị Greeting Control:** Đây là một chi tiết triển khai quan trọng. Hệ thống sẽ **thêm một chỉ thị ẩn** vào đầu tin nhắn gửi đến agent, ví dụ: `[FIRST TIME USER NEEDS GREETING]` hoặc `[SKIP GREETING]`. Agent sẽ đọc chỉ thị này để quyết định văn phong trả lời (có chào hỏi thân thiện lần đầu hay đi thẳng vào vấn đề).
    - Agent tạo ra câu trả lời.

5.  **Cập nhật trạng thái sau khi trả lời:**
    - Nếu đây là lần tương tác đầu tiên, hệ thống sẽ cập nhật `userProfile` trong `sharedContext` với `hasBeenGreeted: true`.
    - Câu trả lời của agent cũng được lưu lại vào `chatHistory` của `sharedContext`.

6.  **Cơ chế dự phòng (Fallback):**
    - Nếu agent được chọn (ví dụ: `purchaseAgent`) gặp lỗi trong quá trình xử lý, hệ thống sẽ tự động chuyển sang `maiSale` để cố gắng đưa ra một câu trả lời hữu ích thay vì im lặng.
    - Nếu cả `maiSale` cũng lỗi, một thông báo lỗi chung sẽ được trả về.