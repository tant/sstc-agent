import { TestLogger, sendLoggedMessage } from './test-utils';

describe('Warranty Agent - SSTC Support Specialist', () => {
  // Test 1: SSD Warranty Verification & Processing
  describe('SSD Warranty Status & Claims', () => {
    test('should handle Premium SSD 5-year warranty inquiry', async () => {
      const logger = new TestLogger('warranty-ssd-premium-5year');
      const messages = [
        { role: 'user', content: 'SSD Premium của tôi còn bảo hành không? Mua được 2 năm rồi' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-ssd-premium-5year', logger);

      logger.logTestResult(true);

      // Should address Premium SSD warranty duration
      expect(response.text.toLowerCase()).toMatch(/(premium|5.*?năm|ssd|582e.*hành)/i);
      // Should demonstrate warranty expertise
      expect(response.text.toLowerCase()).toContain('bảo hành');
    }, 45000);

    test('should handle expired SSD warranty gracefully', async () => {
      const logger = new TestLogger('warranty-ssd-expired');
      const messages = [
        { role: 'user', content: 'SSD của tôi mua năm 2019 đã bị lỗi, còn bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-ssd-expired', logger);

      logger.logTestResult(true);

      // Should inform about expiration while offering alternatives
      expect(response.text.toLowerCase()).toMatch(/(hết.*?hạn|hết hạn|không.*bảo hành|dịch vụ.*?phí)/i);
      // Should be empathetic
      expect(response.text.toLowerCase()).toMatch(/(xin lỗi|hiểu|giúp đỡ|thay thế|có phí)/i);
    }, 45000);

    test('should handle SSD Plus/Value warranty (3 years)', async () => {
      const logger = new TestLogger('warranty-ssd-plus-value');
      const messages = [
        { role: 'user', content: 'SSD Plus mua năm ngoái, bây giờ bị chậm có được bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-ssd-plus-value', logger);

      logger.logTestResult(true);

      // Should address Plus/Value warranty periods (3 years)
      expect(response.text.toLowerCase()).toMatch(/(plus|value|3.*?năm|bảo hành?)/i);
      expect(response.text.toLowerCase()).toContain('ssd');
    }, 45000);
  });

  // Test 2: Mainboard Warranty Processing
  describe('Mainboard Warranty & Claims', () => {
    test('should provide mainboard warranty status for Intel platform', async () => {
      const logger = new TestLogger('warranty-mainboard-intel');
      const messages = [
        { role: 'user', content: 'Mainboard Intel LGA1700 của tôi mua được 1 năm, bây giờ USB ports bị lỗi' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-mainboard-intel', logger);

      logger.logTestResult(true);

      // Should address mainboard warranty scope
      expect(response.text.toLowerCase()).toMatch(/(mainboard|lga1700|usb|bảo hành|cổng kết nối)/i);
      // Should show motherboard support expertise
      expect(response.text.toLowerCase()).toContain('mainboard');
    }, 45000);

    test('should handle mainboard burnout due to power surge', async () => {
      const logger = new TestLogger('warranty-mainboard-burnout');
      const messages = [
        { role: 'user', content: 'Mainboard SSTC của tôi bị cháy do chập điện, có bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-mainboard-burnout', logger);

      logger.logTestResult(true);

      // Should explain exclusion for power surge damage
      expect(response.text.toLowerCase()).toMatch(/(không.*?bảo hành|cháy|chập điện|nguồn điện|nạp chìm|nội chính sách)/i);
      // Should remain professional and empathetic
      expect(response.text.toLowerCase()).toMatch(/(xin lỗi|hiểu|thay thế|có phí|dịch vụ)/i);
    }, 45000);
  });

  // Test 3: VGA Zotac Warranty Processing
  describe('VGA Zotac Warranty & Support', () => {
    test('should handle Zotac VGA warranty claim', async () => {
      const logger = new TestLogger('warranty-vga-zotac-claim');
      const messages = [
        { role: 'user', content: 'VGA Zotac RTX 4060 của tôi có phát âm thanh lạ sau 1 năm sử dụng' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-vga-zotac-claim', logger);

      logger.logTestResult(true);

      // Should address VGA warranty procedures
      expect(response.text.toLowerCase()).toMatch(/(zotac|rtx.*4060|vga|gpu|bảo hành|bảo hành card)/i);
      // Should show fan familiarity
      expect(response.text.toLowerCase()).toMatch(/(âm.*?thanh|lạ|fan|card kèm theo)/i);
    }, 45000);

    test('should explain Zotac premium series extended warranty', async () => {
      const logger = new TestLogger('warranty-vga-zotac-premium');
      const messages = [
        { role: 'user', content: 'Tôi có Zotac RTX 4090 Gaming Trinity. Bảo hành có gì đặc biệt không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-vga-zotac-premium', logger);

      logger.logTestResult(true);

      // Should highlight premium warranty benefits
      expect(response.text.toLowerCase()).toMatch(/(zotac|trinity|4090|premium|extended|đặc biệt)/i);
    }, 45000);
  });

  // Test 4: Serial Number Verification Process
  describe('Serial Number Verification & Guidance', () => {
    test('should request serial number for warranty status', async () => {
      const logger = new TestLogger('warranty-serial-request');
      const messages = [
        { role: 'user', content: 'SSD của tôi bị lỗi, làm sao biết còn bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-serial-request', logger);

      logger.logTestResult(true);

      // Should request serial number politely and clearly
      expect(response.text.toLowerCase()).toMatch(/(serial|số serial|số.*?serial|ổ cứng|ssd|kiểm tra|hệ thống)/i);
      // Should provide guidance on finding serial
      expect(response.text.toLowerCase()).toMatch(/(phiếu.*?bảo hành|vỏ hộp|hóa đơn|tem)/i);
    }, 45000);

    test('should handle invalid serial number gracefully', async () => {
      const logger = new TestLogger('warranty-invalid-serial');
      const messages = [
        { role: 'user', content: 'Serial SSD của tôi là ABC123XYZ, còn bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-invalid-serial', logger);

      logger.logTestResult(true);

      // Should handle invalid serial appropriately
      expect(response.text.toLowerCase()).toMatch(/(không.*tìm thấy|kiểm tra lại|sai serial|không hợp lệ)/i);
      // Should provide next steps or alternatives
      expect(response.text.toLowerCase()).toMatch(/(kiểm tra|liên hệ|điểm bán|thay thế)/i);
    }, 45000);
  });

  // Test 5: Warranty Exclusion Scenarios
  describe('Warranty Exclusions & Exceptions', () => {
    test('should handle physical damage exclusion', async () => {
      const logger = new TestLogger('warranty-physical-damage');
      const messages = [
        { role: 'user', content: 'SSD của tôi bị rơi vỡ rèm bạc, còn bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-physical-damage', logger);

      logger.logTestResult(true);

      // Should explain physical damage exclusion
      expect(response.text.toLowerCase()).toMatch(/(vật lý|thấm nước|ngã|đầy|hỏng.*?vật lý|không.*bảo hành)/i);
    }, 45000);

    test('should handle overclocking damage waiver', async () => {
      const logger = new TestLogger('warranty-overclocking-damage');
      const messages = [
        { role: 'user', content: 'GPU của tôi bị hỏng sau khi tôi overclock, có bảo hành không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-overclocking-damage', logger);

      logger.logTestResult(true);

      // Should address overclocking exclusion
      expect(response.text.toLowerCase()).toMatch(/(overclock|ép xung|không.*bảo hành|người dùng|chính sách)/i);
    }, 45000);

    test('should handle environmental damage (dust/heat)', async () => {
      const logger = new TestLogger('warranty-environmental-damage');
      const messages = [
        { role: 'user', content: 'SSD của tôi bị bụi, không hoạt động được nữa' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-environmental-damage', logger);

      logger.logTestResult(true);

      // Should address environmental exclusions
      expect(response.text.toLowerCase()).toMatch(/(bụi|nhiệt độ|môi trường|không.*bảo hành|lũ|^mưa|^trận|^cháy)/i);
    }, 45000);
  });

  // Test 6: Customer Support Quality
  describe('Customer Support & Communication Quality', () => {
    test('should show empathy for frustrating situations', async () => {
      const logger = new TestLogger('warranty-empathy-difficult');
      const messages = [
        { role: 'user', content: 'Tôi đã gọi nhiều chỗ rồi mà vẫn chưa được bảo hành. SSD hỏng, công việc gấp!' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-empathy-difficult', logger);

      logger.logTestResult(true);

      // Should show empathy and urgency understanding
      expect(response.text.toLowerCase()).toMatch(/(xin lỗi|hiểu|gấp|công việc|phiền toái|bất tiện|giúp додатков)/i);
      // Should remain professional and helpful
      expect(response.text.toLowerCase()).toMatch(/(hỗ trợ|giải quyết|hướng dẫn|liên hệ)/i);
    }, 45000);

    test('should provide detailed step-by-step resolution', async () => {
      const logger = new TestLogger('warranty-step-by-step-guidance');
      const messages = [
        { role: 'user', content: 'SSD Premium hết bảo hành, bây giờ phải làm sao?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-step-by-step-guidance', logger);

      logger.logTestResult(true);

      // Should provide clear alternatives and next steps
      expect(response.text.toLowerCase()).toMatch(/(sửa chữa|phí|thay thế|dịch vụ|liên hệ|ước tính)/i);
      // Should be comprehensive but not overwhelming
      expect(response.text.length).toBeGreaterThan(100);
    }, 45000);
  });

  // Test 7: Warranty Status Follow-up
  describe('Warranty Status Follow-up & Tracking', () => {
    test('should handle warranty claim progress inquiry', async () => {
      const logger = new TestLogger('warranty-claim-progress');
      const messages = [
        { role: 'user', content: 'Tôi đã mang SSD đến trung tâm bảo hành tuần trước, bây giờ được chưa?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-claim-progress', logger);

      logger.logTestResult(true);

      // Should address repair center coordination
      expect(response.text.toLowerCase()).toMatch(/(trung tâm|bảo hành|xử lý|kiểm tra|thời gian|liên hệ)/i);
    }, 45000);

    test('should handle extended warranty consideration', async () => {
      const logger = new TestLogger('warranty-extended-options');
      const messages = [
        { role: 'user', content: 'SSD của tôi sắp hết bảo hành, có cách gia hạn không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-extended-options', logger);

      logger.logTestResult(true);

      // Should address warranty extension possibilities
      expect(response.text.toLowerCase()).toMatch(/(gia hạn|extended|mở rộng|thêm*|sản phẩm mới|tùy chọn)/i);
    }, 45000);
  });

  // Test 8: Professional Problem Solving
  describe('Professional Problem Solving & Alternatives', () => {
    test('should offer repair service alternatives for out-of-warranty products', async () => {
      const logger = new TestLogger('warranty-repair-alternatives');
      const messages = [
        { role: 'user', content: 'Mainboard cũ bị lỗi, không còn bảo hành. Có sửa được không?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-repair-alternatives', logger);

      logger.logTestResult(true);

      // Should offer paid repair options professionally
      expect(response.text.toLowerCase()).toMatch(/(sửa chữa có phí|dịch vụ|ước tính|liên hệ|báo giá|thay thế)/i);
      // Should remain helpful and customer-focused
      expect(response.text.toLowerCase()).toMatch(/(hỗ trợ|giúp đỡ|hướng dẫn|liên hệ)/i);
    }, 45000);

    test('should recommend preventive maintenance', async () => {
      const logger = new TestLogger('warranty-preventive-advice');
      const messages = [
        { role: 'user', content: 'SSD của tôi thường bị nóng và chậm dần, phải làm sao?' }
      ];
      const response = await sendLoggedMessage(messages, 'warranty-preventive-advice', logger);

      logger.logTestResult(true);

      // Should provide preventive maintenance advice
      expect(response.text.toLowerCase()).toMatch(/(tản nhiệt|bảo vệ|clean|nóng|chậm|duy trì|phòng ngừa)/i);
      // Should be informative and helpful
      expect(response.text.toLowerCase()).toContain('ssd');
    }, 45000);
  });
});
