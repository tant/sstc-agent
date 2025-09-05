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
8. `ssd-specialist-test.ts` - Kiểm tra ngăn chặn tạo sản phẩm hư cấu cho SSD specialist
9. `mai-agent-test.ts` - Kiểm tra ngăn chặn tạo sản phẩm hư cấu cho Mai agent

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

# Chạy kiểm tra ngăn chặn tạo sản phẩm hư cấu
npm test -- tests/e2e/agents/ssd-specialist-test.ts
npm test -- tests/e2e/agents/mai-agent-test.ts

# Chạy kiểm tra nhập khẩu tất cả các chuyên gia
npm test -- tests/e2e/agents/all-hardware-specialists.test.ts
```

## Nội dung các bài kiểm tra

### Kiểm tra từng chuyên gia riêng lẻ
- **Liên quan**: Kiểm tra các chuyên gia cung cấp thông tin phù hợp với truy vấn
- **Chất lượng nội dung**: Kiểm tra các chuyên gia có bao gồm các từ khóa mong đợi trong phản hồi
- **Độ chính xác kỹ thuật**: Xác minh các chuyên gia cung cấp thông tin kỹ thuật chính xác
- **Phù hợp với trường hợp sử dụng**: Đảm bảo các chuyên gia đưa ra đề xuất phù hợp cho các trường hợp sử dụng cụ thể (chơi game, sáng tạo nội dung, v.v.)
- **Ngăn chặn tạo sản phẩm hư cấu**: Đảm bảo các chuyên gia không tạo ra sản phẩm không tồn tại trong database

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

## Chính sách Ngăn chặn Tạo Sản phẩm Hư cấu

### Quy tắc nghiêm ngặt:
1. **Chỉ trình bày sản phẩm thực tế**: Chỉ hiển thị sản phẩm có trong database với tên, SKU, và giá chính xác
2. **Không tạo sản phẩm hư cấu**: Tuyệt đối không tạo tên sản phẩm, mô hình, hoặc giá không tồn tại
3. **Không tạo bảng so sánh hư cấu**: Không tạo bảng so sánh với sản phẩm không có trong database
4. **Không đặt tên thương hiệu hư cấu**: Không tạo tên thương hiệu như "SSTC SSD" cho sản phẩm cụ thể

### Cách tiếp cận đúng:
1. **Trình bày sản phẩm thực tế**: Hiển thị đúng tên sản phẩm từ database (ví dụ: E130, MAX IV, E130 Plus)
2. **Hướng dẫn khách hàng chi tiết hơn**: Khi khách hàng cần thông tin cụ thể, hỏi thêm chi tiết để đưa ra sản phẩm phù hợp thực tế
3. **Không tạo bảng so sánh**: Thay vào tạo bảng so sánh hư cấu, hãy hỏi khách hàng về nhu cầu cụ thể để đưa ra sản phẩm phù hợp
4. **Chuyển tiếp đến chuyên gia phù hợp**: Khi có yêu cầu phức tạp, chuyển tiếp đến chuyên gia phù hợp thay vì tự tạo thông tin

### Ví dụ:
❌ Sai (tạo sản phẩm hư cấu):
```
| Loại SSD | Kích thước | Tốc độ đọc/ghi | Giá (ước tính) | Ưu điểm |
|----------|------------|----------------|----------------|----------|
| SSTC SSD 1TB NVMe M.2 | M.2 2280 | 3500/3000 MB/s | 1.200.000 đ | Độ bền cao, phù hợp gaming & làm việc đa nhiệm |
```

✅ Đúng (trình bày sản phẩm thực tế):
```
Dạ quý khách, em xin giới thiệu các mẫu SSD hiện có tại SSTC:

**MAX IV** (MAX IV -1T)
- Dung lượng: 1TB NVMe
- Giao tiếp: PCIe 4X4
- Tốc độ đọc/ghi: 6000/6000 MB/s
- Giá: 1.600.000 VND
- Phù hợp: Ultra-fast storage, 4K gaming
```