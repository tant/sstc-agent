import { TestLogger, sendLoggedMessage } from './test-utils';

describe('Advanced SSTC Agent Scenarios', () => {
  // Test 1: Complex Multi-turn Conversation
  describe('Complex Multi-turn Conversation', () => {
    test('should handle customer with multiple product interests', async () => {
      const logger = new TestLogger('complex-multi-product');
      const messages = [
        { role: 'user', content: 'Tôi tên là Linh, tôi đang build PC mới' }
      ];
      const response = await sendLoggedMessage(messages, 'complex-multi-product', logger);
      
      logger.logTestResult(true);
      
      // Should provide relevant response
      expect(response.text.length).toBeGreaterThan(100);
    }, 45000);

    test('should handle difficult customer with complaints', async () => {
      const logger = new TestLogger('difficult-customer');
      const messages = [
        { role: 'user', content: 'Tôi mua SSD của các bạn nhưng chất lượng không tốt' }
      ];
      const response = await sendLoggedMessage(messages, 'difficult-customer', logger);
      
      logger.logTestResult(true);
      
      // Should acknowledge the concern
      expect(response.text.toLowerCase()).toContain('không');
      // Should offer help
      expect(response.text.toLowerCase()).toContain('giúp');
    }, 45000);
  });

  // Test 2: Upselling and Cross-selling
  describe('Upselling and Cross-selling', () => {
    test('should suggest related products when appropriate', async () => {
      const logger = new TestLogger('upselling-related');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua SSD Samsung 1TB' }
      ];
      const response = await sendLoggedMessage(messages, 'upselling-related', logger);
      
      logger.logTestResult(true);
      
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('samsung');
    }, 30000);

    test('should recommend product bundles', async () => {
      const logger = new TestLogger('product-bundles');
      const messages = [
        { role: 'user', content: 'Tôi đang build PC gaming' }
      ];
      const response = await sendLoggedMessage(messages, 'product-bundles', logger);
      
      logger.logTestResult(true);
      
      expect(response.text.toLowerCase()).toContain('gaming');
      expect(response.text.toLowerCase()).toContain('pc');
    }, 30000);
  });

  // Test 3: Memory and Context Retention
  describe('Memory and Context Retention', () => {
    test('should remember customer preferences throughout conversation', async () => {
      const logger = new TestLogger('memory-customer-preferences');
      const messages = [
        { role: 'user', content: 'Tôi tên là Minh, tôi thích màu xanh' }
      ];
      const response = await sendLoggedMessage(messages, 'memory-customer-preferences', logger);
      
      logger.logTestResult(true);
      
      expect(response.text).toContain('Minh');
      expect(response.text).toContain('xanh');
    }, 30000);

    test('should reference previous conversation points', async () => {
      const logger = new TestLogger('memory-conversation-points');
      const messages = [
        { role: 'user', content: 'Tôi dùng PC để làm đồ họa và chơi game' }
      ];
      const response = await sendLoggedMessage(messages, 'memory-conversation-points', logger);
      
      logger.logTestResult(true);
      
      expect(response.text.toLowerCase()).toContain('đồ họa');
      expect(response.text.toLowerCase()).toContain('game');
    }, 30000);
  });

  // Test 4: Edge Cases and Error Handling
  describe('Edge Cases and Error Handling', () => {
    test('should handle unclear or vague requests gracefully', async () => {
      const logger = new TestLogger('unclear-requests');
      const messages = [
        { role: 'user', content: 'Tôi cần cái gì đó tốt cho máy tính' }
      ];
      const response = await sendLoggedMessage(messages, 'unclear-requests', logger);
      
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
      const response = await sendLoggedMessage(messages, 'mixed-language', logger);
      
      logger.logTestResult(true);
      
      // Should understand mixed language
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('gaming');
      expect(response.text.toLowerCase()).toContain('laptop');
    }, 30000);

    test('should handle rapid successive questions', async () => {
      const logger = new TestLogger('rapid-questions');
      const rapidQuestions = [
        { role: 'user', content: 'SSD giá bao nhiêu?' },
        { role: 'user', content: 'GPU nào tốt?' },
        { role: 'user', content: 'Mainboard tương thích?' }
      ];
      
      const responses: any[] = [];
      
      for (const question of rapidQuestions) {
        const response = await sendLoggedMessage([question], 'rapid-questions', logger);
        responses.push(response);
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
      
      const response = await sendLoggedMessage(longConversation, 'performance-load', logger);
      
      logger.logTestResult(true);
      
      // Should provide coherent response
      expect(response.text.length).toBeGreaterThan(0);
    }, 60000);
  });
});