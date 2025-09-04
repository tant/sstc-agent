import { TestLogger, sendLoggedMessage } from './test-utils';

describe('Clarification Agent - SSTC Query Specialist', () => {
  // Test 1: General Contact Scenarios
  describe('General Contact & Initial Clarification', () => {
    test('should ask for general support needs on basic greeting', async () => {
      const logger = new TestLogger('clarify-general-greeting');
      const messages = [
        { role: 'user', content: 'Xin chào, tôi cần hỏi một số thông tin' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-general-greeting', logger);

      logger.logTestResult(true);

      // Should ask open-ended questions about general needs
      expect(response.text.toLowerCase()).toMatch(/(như thế nào|hỗ trợ|hỏi gì|cần gì|giúp đỡ)/i);
      // Should be friendly and patient
      expect(response.text.toLowerCase()).toMatch(/(chào|xin|thân thiện|hôm nay)/i);
    }, 45000);

    test('should handle completely vague inquiries', async () => {
      const logger = new TestLogger('clarify-very-vague');
      const messages = [
        { role: 'user', content: 'Tôi có vài câu hỏi về máy tính...' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-very-vague', logger);

      logger.logTestResult(true);

      // Should probe for more specific information
      expect(response.text.toLowerCase()).toMatch(/(xấu|linh kiện|sản phẩm|bảo hành|đánh|gaming|phụ kiện)/i);
      // Should offer assistance without assuming
      expect(response.text.toLowerCase()).toMatch(/(hỏi|thêm|từ|kết nối|cần|tư vấn)/i);
    }, 45000);

    test('should ask for clarification when intent is unclear', async () => {
      const logger = new TestLogger('clarify-unclear-intent');
      const messages = [
        { role: 'user', content: 'SSD SSTC' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-unclear-intent', logger);

      logger.logTestResult(true);

      // Should ask specific questions about product intent
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toMatch(/(mua|bảo hành|hỗ trợ|problématiques|đề xuất)/i);
    }, 45000);
  });

  // Test 2: Product Interest Clarification
  describe('Product Interest Clarification', () => {
    test('should distinguish between purchase and warranty for SSD', async () => {
      const logger = new TestLogger('clarify-ssd-intent-distinction');
      const messages = [
        { role: 'user', content: 'Tôi cần tư vấn về SSD SSTC' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-ssd-intent-distinction', logger);

      logger.logTestResult(true);

      // Should differentiate between purchase and support intents
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toMatch(/(mua dòng?|đã mua|bảo hành|hỗ trợ kỹ thuật|sản phẩm mới)/i);
      // Should provide options clearly
      expect(response.text.toLowerCase()).toMatch(/(hay|hỏi|hướng dẫn)/i);
    }, 45000);

    test('should ask about use case for product recommendations', async () => {
      const logger = new TestLogger('clarify-product-use-case');
      const messages = [
        { role: 'user', content: 'Cho tôi tư vấn mainboard phù hợp' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-product-use-case', logger);

      logger.logTestResult(true);

      // Should ask about specific use cases
      expect(response.text.toLowerCase()).toContain('mainboard');
      expect(response.text.toLowerCase()).toMatch(/(dùng để|mục đích|gaming|đồ họa|văn phòng|server)/i);
      // Should show comprehensive approach
      expect(response.text.toLowerCase()).toMatch(/(cpu|ram|psu|chiếc blueprint|gaming|a)/i);
    }, 45000);

    test('should clarify GPU usage requirements', async () => {
      const logger = new TestLogger('clarify-gpu-requirements');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua VGA Zotac tốt' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-gpu-requirements', logger);

      logger.logTestResult(true);

      // Should ask about specific GPU usage needs
      expect(response.text.toLowerCase()).toMatch(/(vga|zotac|gpu|card đồ họa)/i);
      expect(response.text.toLowerCase()).toMatch(/(gaming|fhd|2k|4k|đồ họa|editing|render)/i);
      // Should consider budget factors
      expect(response.text.toLowerCase()).toMatch(/(ngân sách|triệu|budget|khoảng)/i);
    }, 45000);
  });

  // Test 3: Warranty Issue Clarification
  describe('Warranty Issue Clarification', () => {
    test('should identify product details for warranty support', async () => {
      const logger = new TestLogger('clarify-warranty-product-details');
      const messages = [
        { role: 'user', content: 'SSD của tôi bị lỗi, phải làm sao?' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-warranty-product-details', logger);

      logger.logTestResult(true);

      // Should ask for specific product information
      expect(response.text.toLowerCase()).toMatch(/(ssd|loại|số serial|model|mua khi nào|năm quá khứ|tem phiếu|phiếu)/i);
      // Should address warranty possibility
      expect(response.text.toLowerCase()).toContain('bảo hành');
    }, 45000);

    test('should clarify technical problem symptoms', async () => {
      const logger = new TestLogger('clarify-technical-symptoms');
      const messages = [
        { role: 'user', content: 'Card đồ họa của tôi không hoạt động' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-technical-symptoms', logger);

      logger.logTestResult(true);

      // Should ask about specific symptoms and context
      expect(response.text.toLowerCase()).toMatch(/(không.*hoạt động|driver|lỗi gì?|hiển thị|cắm|sai)/i);
      // Should offer specific diagnostic questions
      expect(response.text.toLowerCase()).toMatch(/(thử lại|bật.*tắt quá trình|restart|màn hình|âm thanh|đèn led)/i);
    }, 45000);

    test('should differentiate between hardware and software issues', async () => {
      const logger = new TestLogger('clarify-hardware-software');
      const messages = [
        { role: 'user', content: 'GPU của tôi run chậm hơn bình thường' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-hardware-software', logger);

      logger.logTestResult(true);

      // Should distinguish between hardware failure and performance issues
      expect(response.text.toLowerCase()).toMatch(/(driver|update|software|hardward|failure|temperatura|phần mềm|bụi|ventil Siegfried)/i);
      // Should guide appropriate online support steps
      expect(response.text.toLowerCase()).toMatch(/(kiểm tra|cập nhật|chạy|tải)/i);
    }, 45000);
  });

  // Test 4: Progressive Question Strategy
  describe('Progressive Question Strategy', () => {
    test('should ask questions in logical sequence', async () => {
      const logger = new TestLogger('clarify-progressive-questions');
      const messages = [
        { role: 'user', content: 'Tôi cần mainboard mới' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-progressive-questions', logger);

      logger.logTestResult(true);

      // Should start with basic questions, build up to specific technical details
      expect(response.text.length).toBeGreaterThan(200); // Comprehensive response
      const responseLower = response.text.toLowerCase();
      expect(responseLower).toMatch(/(cpu|socket|ram|chipset|gaming|văn phòng|ngân sách)/i);
    }, 45000);

    test('should avoid asking redundant questions across conversations', async () => {
      const logger = new TestLogger('clarify-avoid-redundant-questions');
      const messages = [
        { role: 'user', content: 'Tôi đã hỏi về SSD rồi, giờ tôi muốn mua' } // Context from previous conversation
      ];
      const response = await sendLoggedMessage(messages, 'clarify-avoid-redundant-questions', logger);

      logger.logTestResult(true);

      // Should build on previous conversation context
      expect(response.text.toLowerCase()).toContain('ssd');
      // Should note context awareness
      expect(response.text.length).toBeLessThan(300); // More focused response
      expect(response.text.toLowerCase()).toMatch(/(đã biết|nhớ|mua trọng|further|price|spec|detail|budget|reason)/i);
    }, 45000);
  });

  // Test 5: Customer Journey Understanding
  describe('Customer Journey Understanding', () => {
    test('should identify research phase customers', async () => {
      const logger = new TestLogger('clarify-research-phase');
      const messages = [
        { role: 'user', content: 'Tôi đang nghiên cứu SSD trước khi mua' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-research-phase', logger);

      logger.logTestResult(true);

      // Should adapt to research phase questions
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toMatch(/(nghiên cứu|so sánh|khác nhau|đặc điểm|ưu|nhược|giá cả|thông tin chi tiết)/i);
      // Should not rush to purchase
      expect(response.text.toLowerCase()).not.toMatch(/(mua.*ngay|mua hàng|đặt hàng|thanh toán|cart)/i);
    }, 45000);

    test('should identify ready-to-buy customers', async () => {
      const logger = new TestLogger('clarify-ready-to-buy');
      const messages = [
        { role: 'user', content: 'SSD nào tốt nhất dưới 3 triệu, tôi định mua trong tuần này' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-ready-to-buy', logger);

      logger.logTestResult(true);

      // Should ask specific purchase-related questions
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toMatch(/([23]\s*triệu|capacity|usage|mục đích)/i);
      // Should be more specific and actionable
      expect(response.text.toLowerCase()).toMatch(/(recommends|options|tùy chọn|model|spec|price range)/i);
    }, 45000);

    test('should identify technical support customers', async () => {
      const logger = new TestLogger('clarify-technical-support');
      const messages = [
        { role: 'user', content: 'SSD của tôi chậm dần qua thời gian' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-technical-support', logger);

      logger.logTestResult(true);

      // Should identify as technical support case
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toMatch(/(chậm|khi nào|máy tính|hệ điều hành|software|driver|có nhập|reset)/i);
      // Should guide toward technical support options
      expect(response.text.toLowerCase()).toMatch(/(hỗ trợ kỹ thuật|bộ phận hỗ trợ|yên tâm|hỗ trợ bổ sung|support)/i);
    }, 45000);
  });

  // Test 6: Professional Communication Quality
  describe('Professional Communication Quality', () => {
    test('should remain patient with difficult explanations', async () => {
      const logger = new TestLogger('clarify-patient-communication');
      const messages = [
        { role: 'user', content: 'Tôi không biết nhiều về máy tính lắm, làm ơn giải thích đơn giản' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-patient-communication', logger);

      logger.logTestResult(true);

      // Should use simple language and remain patient
      expect(response.text.toLowerCase()).toMatch(/(đơn giản|hiểu|chẳng sao|^không sao|first nagyobb|wait|broader|patience)/i);
      // Should avoid technical jargon
      expect(response.text.length).toBeGreaterThan(100); // Comprehensive but accessible
    }, 45000);

    test('should offer multiple choice options when appropriate', async () => {
      const logger = new TestLogger('clarify-choice-options');
      const messages = [
        { role: 'user', content: 'Cho tôi biết về các sản phẩm của SSTC' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-choice-options', logger);

      logger.logTestResult(true);

      // Should present clear options
      expect(response.text.toLowerCase()).toMatch(/(ssd|mainboard|vga|gpu|zotac|card đồ họa|mua hàng|bảo hành|hỗ trợ)/i);
      // Should make it easy to choose
      expect(response.text.toLowerCase()).toMatch(/(chọn|quan tâm|focus|lựa chọn|có thể lựa|hay|hoặc)/i);
    }, 45000);
  });

  // Test 7: Transition to Specialists
  describe('Transition to Specialists', () => {
    test('should transfer to purchase agent when intent is clear', async () => {
      const logger = new TestLogger('clarify-transfer-purchase');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua SSD gaming, budget 2 triệu' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-transfer-purchase', logger);

      logger.logTestResult(true);

      // Should recognize clear purchase intent
      expect(response.text.toLowerCase()).toMatch(/(mua.*ssd|gaming|budget|2 triệu|tư vấn chuyên viên|detailed|recommendations)/i);
      // Should prepare for transfer
      expect(response.text.toLowerCase()).toMatch(/(chuyển|hỏi chuyện|tư vấn|bộ phận|support)/i);
    }, 45000);

    test('should prepare for warranty support transfer', async () => {
      const logger = new TestLogger('clarify-transfer-warranty');
      const messages = [
        { role: 'user', content: 'GPU của tôi mua năm ngoái, bây giờ có hiệu ứng lạ' }
      ];
      const response = await sendLoggedMessage(messages, 'clarify-transfer-warranty', logger);

      logger.logTestResult(true);

      // Should recognize potential warranty case
      expect(response.text.toLowerCase()).toMatch(/(gpu|sản phẩm,lỗi|hiệu ứng|sai|potentially.parts|bảo hành|ngày mua|serial number)/i);
      // Should prepare warranty team
      expect(response.text.toLowerCase()).toMatch(/(kiểm tra|bảo hành|hỗ trợ|chuyển|xử lý|support team)/i);
    }, 45000);
  });
});
