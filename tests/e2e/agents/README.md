# Kiểm tra các chuyên gia phần cứng

Thư mục này chứa các bài kiểm tra cho các chuyên gia CPU, RAM, SSD, Barebone và Desktop trong hệ thống Mastra.

## Các tệp kiểm tra

1. `cpu-specialist.test.ts` - Kiểm tra cho chuyên gia CPU
2. `ram-specialist.test.ts` - Kiểm tra cho chuyên gia RAM
3. `ssd-specialist.test.ts` - Kiểm tra cho chuyên gia SSD
4. `barebone-specialist.test.ts` - Kiểm tra cho chuyên gia Barebone
5. `desktop-specialist.test.ts` - Kiểm tra cho chuyên gia Desktop
6. `hardware-specialists-integration.test.ts` - Kiểm tra tích hợp cho tất cả các chuyên gia phần cứng
7. `all-hardware-specialists.test.ts` - Kiểm tra nhập khẩu cho tất cả các chuyên gia phần cứng

## Chạy các bài kiểm tra

Để chạy các bài kiểm tra, sử dụng một trong các lệnh sau từ thư mục gốc của dự án:

```bash
# Chạy tất cả các bài kiểm tra agent
npm test -- tests/e2e/agents

# Chạy kiểm tra cho một chuyên gia cụ thể
npm test -- tests/e2e/agents/cpu-specialist.test.ts
npm test -- tests/e2e/agents/ram-specialist.test.ts
npm test -- tests/e2e/agents/ssd-specialist.test.ts
npm test -- tests/e2e/agents/barebone-specialist.test.ts
npm test -- tests/e2e/agents/desktop-specialist.test.ts

# Chạy kiểm tra tích hợp
npm test -- tests/e2e/agents/hardware-specialists-integration.test.ts

# Chạy kiểm tra nhập khẩu tất cả các chuyên gia
npm test -- tests/e2e/agents/all-hardware-specialists.test.ts
```

## Nội dung các bài kiểm tra

### Kiểm tra từng chuyên gia riêng lẻ
- **Liên quan**: Kiểm tra các chuyên gia cung cấp thông tin phù hợp với truy vấn
- **Chất lượng nội dung**: Kiểm tra các chuyên gia có bao gồm các từ khóa mong đợi trong phản hồi
- **Độ chính xác kỹ thuật**: Xác minh các chuyên gia cung cấp thông tin kỹ thuật chính xác
- **Phù hợp với trường hợp sử dụng**: Đảm bảo các chuyên gia đưa ra đề xuất phù hợp cho các trường hợp sử dụng cụ thể (chơi game, sáng tạo nội dung, v.v.)

### Kiểm tra tích hợp
- **Nhất quán giữa các chuyên gia**: Kiểm tra các chuyên gia khác nhau có thể phản hồi các truy vấn
- **Chất lượng phản hồi**: Xác minh tất cả các chuyên gia cung cấp phản hồi không rỗng
- **Chức năng**: Đảm bảo tất cả các chuyên gia được khởi tạo và hoạt động đúng cách

## Cấu trúc kiểm tra

Mỗi tệp kiểm tra tuân theo cấu trúc khung kiểm tra Jest:
- Sử dụng các khối `describe` để nhóm các kiểm tra liên quan
- Sử dụng các khối `it` cho các trường hợp kiểm tra riêng lẻ
- Sử dụng các xác nhận `expect` của Jest để xác minh kết quả
- Kiểm tra cả khả năng tạo phản hồi và chất lượng của các phản hồi đó của chuyên gia

## Thêm kiểm tra mới

Để thêm kiểm tra mới cho các chuyên gia:
1. Tạo một tệp kiểm tra mới trong thư mục này
2. Nhập chuyên gia bạn muốn kiểm tra
3. Viết các trường hợp kiểm tra sử dụng khung Jest
4. Chạy các bài kiểm tra để xác minh chúng hoạt động đúng