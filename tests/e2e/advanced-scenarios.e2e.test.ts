import { sendMessage, TestLogger } from './test-utils';

describe('Advanced SSTC Agent Scenarios', () => {
  // Test 1: Complex Multi-turn Conversation
  describe('Complex Multi-turn Conversation', () => {
    test('should handle customer with multiple product interests', async () => {
      const logger = new TestLogger('complex-multi-product');
      const conversation = [
        { role: 'user', content: 'Tôi tên là Linh, tôi đang build PC mới' },
        { role: 'user', content: 'Tôi cần SSD, GPU và mainboard' },
        { role: 'user', content: 'Budget khoảng 15 triệu' }
      ];
      
      // Simulate conversation flow
      let messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'complex-multi-product', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should address all mentioned products
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('gpu');
      expect(response.text.toLowerCase()).toContain('mainboard');
      // Should consider the budget
      expect(response.text).toContain('15');
      expect(response.text.toLowerCase()).toContain('triệu');
    }, 45000);

    test('should handle difficult customer with complaints', async () => {
      const logger = new TestLogger('difficult-customer');
      const conversation = [
        { role: 'user', content: 'Tôi mua SSD của các bạn nhưng chất lượng không tốt' },
        { role: 'user', content: 'Tôi rất thất vọng' },
        { role: 'user', content: 'Các bạn có giải pháp gì không?' }
      ];
      
      let messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'difficult-customer', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should acknowledge complaint
      expect(response.text.toLowerCase()).toContain('thất vọng');
      // Should remain professional and helpful
      expect(response.text.toLowerCase()).toContain('giải pháp');
      // Should not be defensive
      expect(response.text.toLowerCase()).not.toContain('tôi không biết');
    }, 45000);
  });

  // Test 2: Upselling and Cross-selling
  describe('Upselling and Cross-selling', () => {
    test('should suggest related products when appropriate', async () => {
      const logger = new TestLogger('upselling-related');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua SSD Samsung 1TB' }
      ];
      const response = await sendMessage(messages, 'upselling-related', logger);
      
      logger.logTestResult(true);
      
      // Should mention related products
      expect(response.text.toLowerCase()).toContain('ssd');
      // May suggest related items like cases, cables, etc.
      // This depends on agent's training and configuration
    }, 30000);

    test('should recommend product bundles', async () => {
      const logger = new TestLogger('product-bundles');
      const conversation = [
        { role: 'user', content: 'Tôi đang build PC gaming' },
        { role: 'user', content: 'Tôi chọn GPU Zotac RTX 4070' },
        { role: 'user', content: 'Bạn gợi ý mainboard phù hợp?' }
      ];
      
      let messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'product-bundles', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should suggest compatible mainboard
      expect(response.text.toLowerCase()).toContain('mainboard');
      expect(response.text.toLowerCase()).toContain('zotac');
      expect(response.text.toLowerCase()).toContain('rtx');
    }, 45000);
  });

  // Test 3: Memory and Context Retention
  describe('Memory and Context Retention', () => {
    test('should remember customer preferences throughout conversation', async () => {
      const logger = new TestLogger('memory-customer-preferences');
      const conversation = [
        { role: 'user', content: 'Tôi tên là Minh, tôi thích màu xanh' },
        { role: 'user', content: 'Tôi đang tìm mainboard màu xanh' },
        { role: 'user', content: 'Còn SSD thì sao?' }
      ];
      
      let messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'memory-customer-preferences', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should remember the customer's name
      expect(response.text).toContain('Minh');
      // Should maintain context about color preference
      expect(response.text.toLowerCase()).toContain('xanh');
    }, 45000);

    test('should reference previous conversation points', async () => {
      const logger = new TestLogger('memory-conversation-points');
      const conversation = [
        { role: 'user', content: 'Tôi dùng PC để làm đồ họa và chơi game' },
        { role: 'user', content: 'Bạn gợi ý cấu hình phù hợp?' },
        { role: 'user', content: 'Tôi có budget 20 triệu' }
      ];
      
      let messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'memory-conversation-points', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should reference previous usage context
      expect(response.text.toLowerCase()).toContain('đồ họa');
      expect(response.text.toLowerCase()).toContain('game');
      // Should incorporate budget information
      expect(response.text).toContain('20');
      expect(response.text.toLowerCase()).toContain('triệu');
    }, 45000);
  });

  // Test 4: Edge Cases and Error Handling
  describe('Edge Cases and Error Handling', () => {
    test('should handle unclear or vague requests gracefully', async () => {
      const logger = new TestLogger('unclear-requests');
      const messages = [
        { role: 'user', content: 'Tôi cần cái gì đó tốt cho máy tính' }
      ];
      const response = await sendMessage(messages, 'unclear-requests', logger);
      
      logger.logTestResult(true);
      
      // Should ask clarifying questions
      expect(response.text).toContain('?');
      // Should try to understand the need
      expect(response.text.toLowerCase()).toContain('máy tính');
    }, 30000);

    test('should handle mixed language input', async () => {
      const logger = new TestLogger('mixed-language');
      const messages = [
        { role: 'user', content: 'Tôi cần SSD good for gaming laptop' }
      ];
      const response = await sendMessage(messages, 'mixed-language', logger);
      
      logger.logTestResult(true);
      
      // Should understand mixed language
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('gaming');
      expect(response.text.toLowerCase()).toContain('laptop');
    }, 30000);

    test('should handle rapid successive questions', async () => {
      const logger = new TestLogger('rapid-questions');
      const conversation = [
        { role: 'user', content: 'SSD giá bao nhiêu?' },
        { role: 'user', content: 'GPU nào tốt?' },
        { role: 'user', content: 'Mainboard tương thích?' }
      ];
      
      let messages: { role: string; content: string }[] = [];
      let responses: any[] = [];
      
      for (const msg of conversation) {
        messages.push(msg);
        const response = await sendMessage(messages, 'rapid-questions', logger);
        responses.push(response);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should handle each question appropriately
      expect(responses[0].text.toLowerCase()).toContain('ssd');
      expect(responses[1].text.toLowerCase()).toContain('gpu');
      expect(responses[2].text.toLowerCase()).toContain('mainboard');
    }, 45000);
  });

  // Test 5: Performance Under Load
  describe('Performance Under Load', () => {
    test('should maintain reasonable response times with conversation history', async () => {
      const logger = new TestLogger('performance-load');
      
      // Create a long conversation history
      const longConversation = [];
      for (let i = 0; i < 10; i++) {
        longConversation.push({ role: 'user', content: `Câu hỏi ${i + 1}: Thông tin sản phẩm?` });
        longConversation.push({ role: 'assistant', content: `Đây là thông tin cho câu hỏi ${i + 1}` });
      }
      
      // Add final question
      longConversation.push({ role: 'user', content: 'Tổng kết lại các thông tin trên?' });
      
      const startTime = Date.now();
      const response = await sendMessage(longConversation, 'performance-load', logger);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      
      logger.logTestResult(true);
      
      // Should respond within reasonable time (less than 30 seconds)
      expect(responseTime).toBeLessThan(30000);
      
      // Should still provide coherent response
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
    }, 45000);
  });
});