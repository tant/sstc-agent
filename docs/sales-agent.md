# Sales Agent Documentation

## Tổng quan

Sales Agent là một AI assistant chuyên về bán hàng linh kiện máy tính, được xây dựng trên nền tảng Mastra. Agent có khả năng tư vấn, tìm kiếm sản phẩm, tính báo giá, và hỗ trợ khách hàng trong việc chọn mua linh kiện tương thích.

## Kiến trúc hệ thống

### 1. Agent Core (Sales Agent)
- **File**: `src/mastra/agents/sales-agent.ts`
- **Chức năng**: AI assistant chính, xử lý hội thoại với khách hàng
- **Công nghệ**: Mastra Agent class với OpenAI GPT-4o-mini
- **Tính năng**:
  - Hiểu ngôn ngữ tự nhiên
  - Gọi tools để lấy thông tin sản phẩm
  - Lưu lịch sử hội thoại qua Memory
  - Tạo phản hồi thân thiện và chuyên nghiệp

### 2. Tools (Công cụ)
- **File**: `src/mastra/tools/sales-tool.ts`
- **Chức năng**: Tra cứu sản phẩm và tính báo giá
- **Input Schema**:
  ```typescript
  {
    query?: string,      // Tìm kiếm mờ theo tên/tags
    sku?: string,        // Tra cứu chính xác theo SKU
    variantSku?: string, // Tra cứu variant (RAM/SSD)
    quantity?: number    // Số lượng (default: 1)
  }
  ```
- **Output Schema**:
  ```typescript
  {
    results: Array<{
      sku: string,
      name: string,
      price: number,
      description: string,
      tags: string[]
    }>,
    quote?: {
      subtotal: number,
      tax: number,
      shipping: number,
      total: number,
      currency: string
    }
  }
  ```

### 3. Workflows (Luồng làm việc)
- **File**: `src/mastra/workflows/sales-workflow.ts`
- **Chức năng**: Xử lý luồng bán hàng từ tìm kiếm đến báo giá
- **Steps**:
  1. `sales-search`: Gọi sales-tool để tìm sản phẩm
  2. `present-offer`: Agent tạo message bán hàng thân thiện
- **Memory Integration**: Lưu lịch sử hội thoại với resource/thread

### 4. Knowledge Base (Cơ sở kiến thức)
- **File**: `src/mastra/knowledge/products.json`
- **Cấu trúc dữ liệu**:
  - `barebones`: Khung máy + bo mạch (5 sản phẩm)
  - `cpus`: CPU Intel (6 sản phẩm)
  - `rams`: RAM với variants (2 model, nhiều capacity)
  - `ssds`: SSD với variants (4 model, nhiều capacity)
- **ProductManager**: Class quản lý data với indices cho query nhanh
  - SKU index, Name index, Tag index, Compatibility index
  - Methods: findBySku, searchByNameOrTag, getCompatibleBarebones, buildQuote

### 5. Memory System
- **Storage**: LibSQL (file: ../mastra.db)
- **Chức năng**: Lưu lịch sử hội thoại, context khách hàng
- **Configuration**:
  - Resource: 'user_default' (đại diện khách hàng)
  - Thread: 'sales_thread' (luồng hội thoại bán hàng)

## Danh sách sản phẩm

### Barebones (Khung máy)
| SKU | Tên | Giá (VND) | Bảo hành | Tags |
|-----|-----|-----------|----------|------|
| H6312 | Barebone H6312 | 6,500,000 | 1 năm | entry-level, office, learning |
| H6512 | Barebone H6512 | 7,500,000 | 2 năm | mid-range, office, learning |
| B7312 | Barebone B7312 | 7,000,000 | 1 năm | entry-level, versatile |
| B7512 | Barebone B7512 | 8,000,000 | 2 năm | high-end, gaming, professional |
| B7712 | Barebone B7712 | 10,000,000 | 3 năm | flagship, gaming, creators |

### CPUs
| SKU | Tên | Giá (VND) | Cores/Threads | Tags |
|-----|-----|-----------|---------------|------|
| 12100 | Intel Core i3 12100 | 3,000,000 | 4/8 | office, light-gaming |
| 12100F | Intel Core i3 12100F | 2,500,000 | 4/8 | budget-gaming |
| 12400 | Intel Core i5 12400 | 4,900,000 | 6/12 | gaming-1080p, multitasking |
| 12400F | Intel Core i5 12400F | 4,200,000 | 6/12 | gaming-1080p |
| 12700 | Intel Core i7 12700 | 7,000,000 | 12/20 | gaming-1440p, professional |
| 12700F | Intel Core i7 12700F | 6,000,000 | 12/20 | gaming-1440p |

### RAMs (DDR4/DDR5)
| Model | Tên | Variants | Tags |
|-------|-----|----------|------|
| U3200I-C22 | RAM DDR4 3200MHz | 8G, 16G, 32G | desktop, intel-optimized |
| U5600-C40 | RAM DDR5 5600MHz | 8G, 16G, 32G | desktop, next-gen |

### SSDs
| Model | Tên | Variants | Tags |
|-------|-----|----------|------|
| M110 | SSD M110 SATA III | 256G, 512G | budget, sata |
| E130 | SSD E130 M.2 NVMe PCIe 3.0 | 256G, 512G | gaming, nvme |
| E130 Plus | SSD E130 Plus M.2 NVMe PCIe 3.0 | 256G, 512G | high-performance |
| MAX IV | SSD MAX IV M.2 NVMe PCIe 4.0 | 1T, 2T | ultra-fast, pcie4 |

## Luồng tương tác

### 1. Bán lẻ linh kiện
```
User: "Cho tôi báo giá CPU 12400"
Agent: Gọi sales-tool với sku="12400"
Tool: Trả về product + quote
Agent: "CPU Intel Core i5 12400 có giá 4,900,000 VND..."
```

### 2. Tìm kiếm mờ
```
User: "Tôi cần RAM gaming"
Agent: Gọi sales-tool với query="gaming"
Tool: Trả về RAM có tag "gaming"
Agent: List options và hỏi chi tiết
```

### 3. Ráp PC desktop
```
User: "Tôi muốn ráp PC với Barebone B7512"
Agent: Gợi ý CPU tương thích (12400, 12400F, 12700, 12700F)
User: Chọn CPU 12400
Agent: Gợi ý RAM tương thích (DDR4)
User: Chọn RAM U3200I-C22-16G
Agent: Gợi ý SSD tương thích (NVMe PCIe 3.0/4.0)
User: Chọn SSD E130-512Q
Agent: Validate compatibility + tính tổng quote
```

## Chính sách công ty

- **Tiền tệ**: VND
- **Thuế**: 8.5%
- **Vận chuyển**:
  - Miễn phí: Đơn hàng ≥ 2,000,000 VND
  - Phí chuẩn: 50,000 VND
- **Bảo hành**: Theo sản phẩm (1-5 năm)

## API Endpoints

### Khởi động hệ thống
```bash
npm run dev  # Chạy Mastra dev server
```

### Test agent
```typescript
import { mastra } from './mastra';

const agent = mastra.getAgent('salesAgent');
const response = await agent.generate("Cho tôi báo giá CPU 12400");
console.log(response.text);
```

### Test workflow
```typescript
const workflow = mastra.getWorkflow('salesWorkflow');
const run = await workflow.createRunAsync();
const result = await run.start({
  inputData: { sku: '12400', quantity: 1 }
});
```

## Mở rộng tương lai

1. **Semantic Memory**: Thêm semantic recall để agent nhớ sở thích khách hàng
2. **Working Memory**: Lưu profile khách hàng (tên, lịch sử mua)
3. **Multi-language**: Hỗ trợ tiếng Anh
4. **Integration**: Kết nối với hệ thống thanh toán, inventory
5. **Analytics**: Theo dõi hiệu suất bán hàng

## Troubleshooting

### Lỗi thường gặp
- **Product not found**: Kiểm tra SKU chính xác trong products.json
- **Memory not working**: Đảm bảo truyền resource/thread khi gọi agent
- **Tool timeout**: Kiểm tra kết nối internet cho OpenAI API

### Debug
- Kiểm tra logs trong terminal khi chạy `npm run dev`
- Sử dụng Mastra Playground tại http://localhost:4111
- Xem traces trong Mastra dashboard

## Dependencies

- **@mastra/core**: Core framework
- **@mastra/memory**: Memory system
- **@ai-sdk/openai**: LLM provider
- **zod**: Schema validation
- **LibSQL**: Database storage