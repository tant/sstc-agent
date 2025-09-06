# Triển Khai Chuyên Gia CPU

## Tổng Quan
Việc triển khai này cung cấp hỗ trợ chuyên gia CPU (Bộ Xử Lý Trung Tâm) trong hệ thống đại lý SSTC. Chuyên gia CPU là một đại lý tự chứa với chức năng cơ sở kiến thức nhúng, cung cấp lời khuyên chuyên gia về sản phẩm CPU và có thể hoạt động độc lập hoặc cùng với đại lý Mai.

## Kiến Trúc (Sau Khi Hợp Nhất)

### 1. Đại Lý Chuyên Gia CPU Hợp Nhất (`cpu-specialist.ts`)
- **Chuyên gia tự chứa** với chức năng cơ sở kiến thức nhúng
- **Hoạt động đa chế độ**: Dịch vụ backend, tư vấn trực tiếp và chế độ tóm tắt
- **Tích hợp cơ sở dữ liệu**: Sử dụng `cpuDatabaseTool` thay vì cơ sở kiến thức bên ngoài
- **Giao diện nhúng**: Tất cả giao diện cơ sở kiến thức được nhúng trực tiếp vào chuyên gia
- **Không phụ thuộc bên ngoài**: Loại bỏ nhu cầu về các tệp cơ sở kiến thức riêng biệt

### 2. Các Thành Phần Chính Được Nhúng

#### Giao Diện Nhúng
- `CPUProductInfo`: Chi tiết và thông số kỹ thuật sản phẩm CPU
- `CompatibilityResult`: Kết quả phân tích tương thích CPU  
- `SearchCriteria`: Tham số tìm kiếm và lọc

#### Ánh Xạ Tương Thích Nhúng
- `CPU_CHIPSET_COMPATIBILITY`: Ánh xạ socket sang chipset (LGA1700, AM5, AM4, v.v.)
- `CHIPSET_MOTHERBOARD_BRANDS`: Tương thích chipset với thương hiệu bo mạch chủ

#### Tích Hợp Công Cụ Cơ Sở Dữ Liệu
- `cpuDatabaseTool`: Công cụ nâng cao trả về dữ liệu chuyên gia có cấu trúc
- Thay thế truy cập LibSQL trực tiếp bằng cách tiếp cận công cụ cơ sở dữ liệu tập trung

### 3. Mô Hình Dữ Liệu (`specialist-data-models.ts`)
- `CPUSpecialistData`: Giao diện cho dữ liệu chuyên gia CPU
- `CPUProductRecommendation`: Giao diện cho khuyến nghị sản phẩm CPU riêng lẻ
- `CPUTechnicalAnalysis`: Giao diện cho phân tích kỹ thuật sản phẩm CPU

## Tích Hợp Với Quy Trình Làm Việc

### Tích Hợp Bộ Xử Lý Tin Nhắn
Bộ xử lý tin nhắn tích hợp với chuyên gia CPU:
1. **Phát Hiện**: Phát hiện truy vấn liên quan đến CPU bằng cách khớp từ khóa
2. **Định Tuyến**: Truy vấn được định tuyến trực tiếp đến chuyên gia CPU hợp nhất
3. **Xử Lý**: Chuyên gia CPU sử dụng cơ sở kiến thức nhúng và công cụ cơ sở dữ liệu
4. **Tích Hợp**: Dữ liệu có cấu trúc được tích hợp vào phản hồi của Mai

### Hỗ Trợ Chế Độ Hoạt Động
- **Chế Độ Dịch Vụ Backend**: Cung cấp dữ liệu có cấu trúc cho đại lý Mai
- **Chế Độ Tư Vấn Trực Tiếp**: Khả năng tương tác khách hàng trực tiếp  
- **Chế Độ Tóm Tắt**: Tạo tóm tắt nhanh cho xử lý song song
- **Nhận Biết Ngữ Cảnh**: Sử dụng bộ nhớ chia sẻ để khuyến nghị cá nhân hóa

## Tính Năng

### 1. Tìm Kiếm & Lọc Sản Phẩm
- Tìm kiếm theo thương hiệu (Intel, AMD)
- Lọc theo dòng (i3, i5, i7, i9, Ryzen 3, 5, 7, 9)
- Lọc theo socket (LGA1700, AM5, LGA1200, AM4, v.v.)
- Lọc theo số lõi/luồng
- Lọc dựa trên ngân sách
- Khớp với mục đích sử dụng (chơi game, tạo nội dung, văn phòng)

### 2. Phân Tích Kỹ Thuật
- Chỉ số hiệu suất (hiệu suất đơn lõi/đa lõi)
- Phân tích hiệu suất năng lượng
- Đánh giá hiệu suất nhiệt
- Kiểm tra tương thích
- Phân tích giá/hiệu suất

### 3. Đầu Ra Có Cấu Trúc
- Khuyến nghị sản phẩm với xếp hạng
- Thông số kỹ thuật
- Thông tin giá cả
- Trạng thái sẵn có
- Điểm tin cậy

## Ví Dụ Sử Dụng

### Truy Vấn Khách Hàng Được Hỗ Trợ
1. "Tôi cần CPU i5 cho gaming"
2. "CPU AMD Ryzen 5 giá dưới 3 triệu"
3. "CPU cho làm video 4K"
4. "CPU Intel i7 cho laptop gaming"
5. "So sánh CPU Intel và AMD"

### Tích Hợp Phản Hồi
Dữ liệu chuyên gia CPU được tích hợp vào phản hồi của Mai để cung cấp:
- Khuyến nghị sản phẩm cụ thể
- Giải thích kỹ thuật bằng ngôn ngữ thân thiện với khách hàng
- So sánh giá cả
- Xác minh tương thích
- Hướng dẫn mục đích sử dụng

## Kiểm Tra

### Tập Lệnh Kiểm Tra
- `test-cpu-specialist.cjs`: Kiểm tra toàn diện chức năng chuyên gia CPU

### Xác Minh
- Xác minh dữ liệu sản phẩm
- Xác minh đầu ra có cấu trúc
- Xác minh xử lý lỗi
- Đánh giá hiệu suất

## Cải Tiến Tương Lai

### 1. Tính Năng Nâng Cao
- Phân tích kỹ thuật chi tiết hơn
- Tùy chọn lọc nâng cao
- Công cụ so sánh
- Công cụ khuyến nghị tùy chỉnh

### 2. Nâng Cao Tích Hợp
- Giải quyết xung đột tốt hơn trong ngữ cảnh chia sẻ
- Khả năng xử lý song song nâng cao
- Cơ chế phục hồi lỗi cải thiện
- Chiến lược lưu trữ đệm nâng cao

### 3. Phân Tích & Giám Sát
- Phân tích sử dụng
- Giám sát hiệu suất
- Theo dõi sự hài lòng khách hàng
- Tối ưu hóa tỷ lệ chuyển đổi