# Hướng dẫn tích hợp kênh mới cho lập trình viên mới

## Tổng quan

Dự án sử dụng kiến trúc đa kênh (multi-channel) cho phép xử lý tin nhắn từ nhiều nền tảng khác nhau như Telegram, WhatsApp, Web, v.v. Tài liệu này hướng dẫn cách tích hợp một kênh mới vào hệ thống.

## Kiến trúc tổng quan

```
[External Channels] → [Channel Adapters] → [Central Message Processor] → [Mastra Workflows] → [Agents] → [Response]
       ↑                                                                              ↓
[Telegram, WhatsApp, Web, ...]                                           [Channel Adapters] → [External Channels]
```

## Các bước tích hợp kênh mới

### 1. Tạo thư mục kênh

Tạo thư mục cho kênh mới trong `src/mastra/channels/`:
```bash
mkdir src/mastra/channels/[channel-name]
```

### 2. Tạo Channel Adapter

Channel adapter là lớp trung gian giữa nền tảng bên ngoài và hệ thống xử lý trung tâm. Adapter cần thực hiện các nhiệm vụ:

#### a. Kế thừa interface ChannelAdapter

Tạo file `adapter.ts` trong thư mục kênh mới:

```typescript
import { ChannelAdapter } from '../../core/channels/interface';
import { NormalizedMessage, ProcessedResponse } from '../../core/models/message';

export class NewChannelAdapter implements ChannelAdapter {
  channelId = '[channel-name]'; // Tên kênh duy nhất
  
  constructor(config: any) {
    // Khởi tạo kết nối với nền tảng
    // Xử lý xác thực, token, v.v.
  }
  
  async handleMessage(rawMessage: any): Promise<void> {
    // Xử lý tin nhắn từ nền tảng
    // 1. Chuẩn hóa tin nhắn sang định dạng NormalizedMessage
    // 2. Gửi đến message processor trung tâm
    // 3. Xử lý phản hồi và gửi lại cho người dùng
  }
  
  async shutdown(): Promise<void> {
    // Dọn dẹp kết nối khi tắt ứng dụng
  }
}
```

#### b. Định nghĩa cấu hình (nếu cần)

Tạo file `config.ts`:

```typescript
export interface NewChannelConfig {
  // Các tham số cấu hình cần thiết
  token: string;
  // ...
}

export function validateConfig(config: Partial<NewChannelConfig>): NewChannelConfig {
  // Xác thực cấu hình
  if (!config.token) {
    throw new Error('Token is required');
  }
  
  return {
    token: config.token,
    // Giá trị mặc định cho các tham số khác
  };
}
```

### 3. Chuẩn hóa tin nhắn

Mỗi kênh cần chuyển đổi tin nhắn từ định dạng riêng sang `NormalizedMessage`:

```typescript
interface NormalizedMessage {
  id: string; // ID tin nhắn duy nhất
  content: string; // Nội dung tin nhắn
  contentType: 'text' | 'image' | 'document' | string;
  sender: {
    id: string; // ID người gửi
    username?: string;
    displayName?: string;
  };
  timestamp: Date;
  channel: {
    channelId: string; // Tên kênh
    channelMessageId?: string; // ID tin nhắn của kênh
    metadata: Record<string, unknown>; // Metadata bổ sung
  };
  attachments?: Array<{
    url: string;
    type: 'image' | 'document' | string;
    filename?: string;
  }>;
}
```

### 4. Gửi tin nhắn đến processor trung tâm

Sử dụng `messageProcessor` để xử lý tin nhắn:

```typescript
import { messageProcessor } from '../../core/processor/message-processor';

// Trong phương thức handleMessage
const normalizedMessage: NormalizedMessage = {
  // ... dữ liệu đã chuẩn hóa
};

const response = await messageProcessor.processMessage(normalizedMessage);
```

### 5. Xử lý phản hồi

Dựa trên `contentType` của phản hồi, chuyển đổi sang định dạng phù hợp với kênh:

```typescript
interface ProcessedResponse {
  content: string;
  contentType: 'text' | 'image' | 'document' | 'quick_reply' | string;
  attachments?: Array<{
    url: string;
    type: 'image' | 'document' | string;
    filename?: string;
  }>;
  quickReplies?: Array<{
    title: string;
    payload: string;
  }>;
  metadata?: Record<string, unknown>;
}
```

### 6. Đăng ký kênh

#### a. Export trong index.ts của kênh

```typescript
// src/mastra/channels/[channel-name]/index.ts
export { NewChannelAdapter } from './adapter';
export type { NewChannelConfig } from './config';
```

#### b. Thêm vào file index.ts chính

```typescript
// src/mastra/index.ts
import { NewChannelAdapter } from './channels/[channel-name]';

// Trong phần khởi tạo
if (process.env.NEW_CHANNEL_TOKEN) {
  const adapter = new NewChannelAdapter({
    token: process.env.NEW_CHANNEL_TOKEN
  });
  channelRegistry.register('new-channel', adapter);
}
```

### 7. Cập nhật workflow (nếu cần)

Nếu kênh mới cần xử lý đặc biệt trong workflow, cập nhật `message-processor.ts`:

```typescript
// src/mastra/workflows/message-processor.ts
inputSchema: z.object({
  channelId: z.enum(['telegram', 'whatsapp', 'web', 'new-channel']), // Thêm kênh mới
  // ...
})
```

### 8. Thêm script khởi động (nếu cần)

Thêm script vào `package.json` nếu cần:

```json
{
  "scripts": {
    "new-channel": "tsx new-channel-bot.ts"
  }
}
```

## Ví dụ thực tế: Telegram Channel

Tham khảo implementation của Telegram channel trong `src/mastra/channels/telegram/` để hiểu cách thực hiện:

1. `adapter.ts`: Xử lý tin nhắn Telegram, chuẩn hóa và gửi đến processor
2. `config.ts`: Xác thực token và cấu hình
3. Xử lý nhiều loại tin nhắn: text, hình ảnh, tài liệu, voice
4. Hỗ trợ quick replies (buttons)

## Các điểm cần lưu ý

1. **ID kênh duy nhất**: Mỗi kênh cần có `channelId` duy nhất
2. **Xử lý lỗi**: Triển khai đầy đủ try/catch và logging
3. **Graceful shutdown**: Thực hiện dọn dẹp khi ứng dụng tắt
4. **Xác thực tin nhắn**: Kiểm tra tính hợp lệ của tin nhắn trước khi xử lý
5. **Rate limiting**: Tránh quá tải khi nhận nhiều tin nhắn cùng lúc
6. **Security**: Bảo vệ token và thông tin xác thực

## Testing

1. Tạo test đơn giản để kiểm tra kết nối
2. Test với các loại tin nhắn khác nhau
3. Test xử lý lỗi và trường hợp ngoại lệ
4. Kiểm tra luồng xử lý end-to-end

## Best Practices

1. **Logging**: Thêm logging chi tiết để debug
2. **Configuration**: Sử dụng environment variables cho cấu hình
3. **Error handling**: Xử lý lỗi rõ ràng và cung cấp thông báo phù hợp
4. **Documentation**: Viết comment giải thích logic phức tạp
5. **Consistency**: Tuân theo pattern đã có trong các kênh khác
6. **Performance**: Tối ưu hóa xử lý để đảm bảo phản hồi nhanh

Bằng cách tuân theo các bước trên, bạn có thể tích hợp bất kỳ kênh mới nào vào hệ thống một cách nhất quán và hiệu quả.