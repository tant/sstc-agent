import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Mock warranty data - in production this would be from a real database
const MOCK_WARRANTY_DATA = {
  // Valid warranties
  'SSTC-SSD-P001234': {
    serial: 'SSTC-SSD-P001234',
    productType: 'SSD Premium',
    warrantyPeriod: 5, // years
    purchaseDate: '2024-06-15',
    status: 'valid',
    location: 'SSTC Hồ Chí Minh Center',
    address: '123 Trần Hưng Đạo, Q1, TP.HCM',
    phone: '028-1234-5678'
  },
  'SSTC-SSD-V005678': {
    serial: 'SSTC-SSD-V005678',
    productType: 'SSD Value',
    warrantyPeriod: 3,
    purchaseDate: '2024-08-20',
    status: 'valid',
    location: 'SSTC Hà Nội Center',
    address: '456 Hoàng Hoa Thám, Q.Ba Đình, Hà Nội',
    phone: '024-8765-4321'
  },
  // Expired warranty
  'SSTC-MAIN-B009999': {
    serial: 'SSTC-MAIN-B009999',
    productType: 'Mainboard B650',
    warrantyPeriod: 3,
    purchaseDate: '2021-03-10',
    status: 'expired',
    message: 'Warranty expired on 2024-03-10'
  },
  // Invalid serial
  'INVALID-SERIAL': {
    status: 'invalid',
    message: 'Serial number not found in warranty database'
  }
};

// Schema for warranty check input
const warrantyCheckInputSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  customerInfo: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional()
  }).optional()
});

// Schema for warranty check output
const warrantyCheckOutputSchema = z.object({
  serialNumber: z.string(),
  isValid: z.boolean(),
  status: z.enum(['valid', 'expired', 'invalid']),
  productType: z.string().optional(),
  warrantyPeriod: z.number().optional(), // years
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  message: z.string(),
  recommendations: z.array(z.string()).optional()
});

export const warrantyCheckTool = createTool({
  id: 'warranty-checker',
  description: 'Check warranty status and information for SSTC products by serial number',
  inputSchema: warrantyCheckInputSchema,
  outputSchema: warrantyCheckOutputSchema,
  execute: async (context) => {
    const serialNumber = (context as any).serialNumber;

    console.log('🔍 [Warranty Tool] Checking serial:', serialNumber);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check mock database
    const warrantyInfo = MOCK_WARRANTY_DATA[serialNumber as keyof typeof MOCK_WARRANTY_DATA];

    if (!warrantyInfo) {
      console.log('❌ [Warranty Tool] Serial not found:', serialNumber);
      return {
        serialNumber,
        isValid: false,
        status: 'invalid' as const,
        message: `"${serialNumber}" không tồn tại trong cơ sở dữ liệu bảo hành. Vui lòng kiểm tra lại số serial hoặc liên hệ SSTC để hỗ trợ.`,
        recommendations: [
          'Kiểm tra lại chính tả serial number',
          'Đảm bảo serial đầy đủ và chính xác (thường bắt đầu bằng SSTC-)',
          'Liên hệ hotline SSTC: 1900 XXX XXX để hỗ trợ tra cứu'
        ]
      };
    }

    const info = warrantyInfo as any;
    const { status } = info;

    if (status === 'invalid') {
      console.log('❌ [Warranty Tool] Invalid serial:', serialNumber);
      return {
        serialNumber,
        isValid: false,
        status: 'invalid' as const,
        message: info.message,
        recommendations: [
          'Kiểm tra lại serial number với biên nhận mua hàng',
          'Liên hệ SSTC tại điểm bán để xác thực thông tin',
          'Chuẩn bị hình ảnh sản phẩm khi liên hệ'
        ]
      };
    }

    if (status === 'expired') {
      console.log('⚠️ [Warranty Tool] Expired warranty:', serialNumber);
      return {
        serialNumber,
        isValid: false,
        status: 'expired' as const,
        productType: info.productType,
        warrantyPeriod: info.warrantyPeriod,
        purchaseDate: info.purchaseDate,
        message: `Sản phẩm ${info.productType} với serial "${serialNumber}" đã hết hạn bảo hành ${info.warrantyPeriod} năm (từ ${info.purchaseDate}).`,
        recommendations: [
          'Xem xét dịch vụ sửa chữa có tính phí tại SSTC',
          'Liên hệ trung tâm bảo hành gần nhất để tư vấn',
          'Kiểm tra chính sách bảo hành mở rộng'
        ]
      };
    }

    // Valid warranty (this branch only for products with full warranty info)
    const validInfo = warrantyInfo as any;
    const purchaseDate = new Date(validInfo.purchaseDate);
    const expiryDate = new Date(purchaseDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + validInfo.warrantyPeriod);

    const currentDate = new Date();
    const isStillValid = currentDate <= expiryDate;

    console.log('✅ [Warranty Tool] Valid warranty found:', {
      serialNumber,
      productType: validInfo.productType,
      expiryDate: expiryDate.toISOString(),
      isStillValid
    });

    if (!isStillValid) {
      return {
        serialNumber,
        isValid: false,
        status: 'expired' as const,
        productType: validInfo.productType,
        warrantyPeriod: validInfo.warrantyPeriod,
        purchaseDate: validInfo.purchaseDate,
        expiryDate: expiryDate.toISOString().split('T')[0],
        message: `Sản phẩm ${validInfo.productType} đã hết hạn bảo hành tính đến ${expiryDate.toLocaleDateString('vi-VN')}.`,
        recommendations: [
          'Sử dụng dịch vụ sửa chữa có tính phí',
          'Xem xét nâng cấp lên dòng sản phẩm mới',
          'Liên hệ SSTC để tư vấn bảo hành mở rộng'
        ]
      };
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      serialNumber,
      isValid: true,
      status: 'valid' as const,
      productType: validInfo.productType,
      warrantyPeriod: validInfo.warrantyPeriod,
      purchaseDate: validInfo.purchaseDate,
      expiryDate: expiryDate.toISOString().split('T')[0],
      location: validInfo.location,
      address: validInfo.address,
      phone: validInfo.phone,
      message: `Sản phẩm ${validInfo.productType} với serial "${serialNumber}" còn hiệu lực bảo hành. Hạn bảo hành còn ${daysRemaining} ngày (đến ${expiryDate.toLocaleDateString('vi-VN')}).`,
      recommendations: [
        'Mang sản phẩm đến trung tâm bảo hành theo địa chỉ trên',
        'Chuẩn bị biên nhận mua hàng và hộp sản phẩm nguyên gốc',
        'Hẹn trước qua hotline để được phục vụ nhanh chóng'
      ]
    };
  }
});
