import { sendMessage, TestLogger } from './test-utils';

describe('SSTC Agent End-to-End Tests', () => {
  // Test 1: Basic Conversation Flow
  describe('Basic Conversation Flow', () => {
    test('should respond to greeting with appropriate welcome message', async () => {
      const logger = new TestLogger('basic-greeting');
      const messages = [{ role: 'user', content: 'Xin chào' }];
      const response = await sendMessage(messages, 'basic-greeting', logger);
      
      logger.logTestResult(true);
      
      expect(response.text).toContain('Mai');
      expect(response.text).toContain('SSTC');
      expect(response.text).toContain('SSD');
      expect(response.text).toContain('Zotac');
      expect(response.text.toLowerCase()).toContain('motherboard');
    }, 30000);

    test('should respond in English when greeted in English', async () => {
      const logger = new TestLogger('english-greeting');
      const messages = [{ role: 'user', content: 'Hello' }];
      const response = await sendMessage(messages, 'english-greeting', logger);
      
      logger.logTestResult(true);
      
      expect(response.text).toContain('Mai');
      expect(response.text).toContain('SSTC');
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('graphics');
    }, 30000);
  });

  // Test 2: Product Recommendation
  describe('Product Recommendation', () => {
    test('should provide SSD recommendations for gaming laptop', async () => {
      const logger = new TestLogger('ssd-recommendation');
      const messages = [
        { role: 'user', content: 'Tôi cần mua SSD cho laptop gaming' }
      ];
      const response = await sendMessage(messages, 'ssd-recommendation', logger);
      
      logger.logTestResult(true);
      
      expect(response.text).toContain('SSD');
      expect(response.text.toLowerCase()).toContain('laptop');
      expect(response.text.toLowerCase()).toContain('gaming');
      // Should ask follow-up questions about usage, budget, etc.
      expect(response.text).toContain('?');
    }, 30000);

    test('should provide GPU recommendations', async () => {
      const logger = new TestLogger('gpu-recommendation');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua card đồ họa Zotac' }
      ];
      const response = await sendMessage(messages, 'gpu-recommendation', logger);
      
      logger.logTestResult(true);
      
      expect(response.text).toContain('Zotac');
      expect(response.text.toLowerCase()).toContain('gpu');
      expect(response.text.toLowerCase()).toContain('card');
    }, 30000);
  });

  // Test 3: Language Switching
  describe('Language Switching', () => {
    test('should switch from Vietnamese to English when requested', async () => {
      const logger = new TestLogger('lang-switch-vi-to-en');
      const messages = [
        { role: 'user', content: 'Xin chào' },
        { role: 'user', content: 'speak English please' }
      ];
      const response = await sendMessage(messages, 'lang-switch-vi-to-en', logger);
      
      logger.logTestResult(true);
      
      // Response should be in English
      expect(response.text).toMatch(/[A-Za-z]/);
      // Should acknowledge the language switch
      expect(response.text.toLowerCase()).toContain('english');
    }, 30000);

    test('should switch from English to Vietnamese when requested', async () => {
      const logger = new TestLogger('lang-switch-en-to-vi');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'nói tiếng Việt đi' }
      ];
      const response = await sendMessage(messages, 'lang-switch-en-to-vi', logger);
      
      logger.logTestResult(true);
      
      // Response should contain Vietnamese characters
      expect(response.text).toMatch(/[À-ỹ]/);
      // Should acknowledge the language switch
      expect(response.text).toContain('Việt');
    }, 30000);
  });

  // Test 4: Handling Inappropriate Questions
  describe('Handling Inappropriate Questions', () => {
    test('should redirect personal questions back to products', async () => {
      const logger = new TestLogger('inappropriate-questions');
      const messages = [
        { role: 'user', content: 'Bạn có bạn trai chưa?' }
      ];
      const response = await sendMessage(messages, 'inappropriate-questions', logger);
      
      logger.logTestResult(true);
      
      // Should not engage with personal question
      expect(response.text.toLowerCase()).not.toContain('bạn trai');
      expect(response.text.toLowerCase()).not.toContain('người yêu');
      // Should redirect to products
      expect(response.text).toContain('SSTC');
      expect(response.text).toContain('SSD');
      expect(response.text).toContain('Zotac');
    }, 30000);
  });

  // Test 5: Multi-turn Conversation
  describe('Multi-turn Conversation', () => {
    test('should maintain conversation context', async () => {
      const logger = new TestLogger('multi-turn-context');
      
      // First message - customer introduces themselves
      const messages1 = [
        { role: 'user', content: 'Tôi tên là Tan, tôi đang tìm mua SSD' }
      ];
      const response1 = await sendMessage(messages1, 'multi-turn-context', logger);
      
      // Second message - follow up on previous conversation
      const messages2 = [
        { role: 'user', content: 'Tôi tên là Tan, tôi đang tìm mua SSD' },
        { role: 'assistant', content: response1.text },
        { role: 'user', content: 'Tôi dùng cho laptop chơi game' }
      ];
      const response2 = await sendMessage(messages2, 'multi-turn-context', logger);
      
      logger.logTestResult(true);
      
      // Agent should remember the customer's name and context
      expect(response2.text).toContain('Tan');
      expect(response2.text.toLowerCase()).toContain('laptop');
      expect(response2.text.toLowerCase()).toContain('game');
    }, 30000);
  });

  // Test 6: Sales Process
  describe('Sales Process', () => {
    test('should ask relevant questions to understand customer needs', async () => {
      const logger = new TestLogger('sales-process');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua mainboard' }
      ];
      const response = await sendMessage(messages, 'sales-process', logger);
      
      logger.logTestResult(true);
      
      // Should ask follow-up questions
      expect(response.text).toContain('?');
      // Should mention mainboard
      expect(response.text.toLowerCase()).toContain('mainboard');
    }, 30000);

    test('should provide product comparison when asked', async () => {
      const logger = new TestLogger('product-comparison');
      const messages = [
        { role: 'user', content: 'So sánh SSD Samsung và WD' }
      ];
      const response = await sendMessage(messages, 'product-comparison', logger);
      
      logger.logTestResult(true);
      
      expect(response.text.toLowerCase()).toContain('samsung');
      expect(response.text.toLowerCase()).toContain('wd');
      // Should provide comparative information
      expect(response.text).toContain('?') // Likely to ask for more details
    }, 30000);
  });

  // Test 7: Technical Support
  describe('Technical Support', () => {
    test('should provide installation guidance', async () => {
      const logger = new TestLogger('technical-support');
      const messages = [
        { role: 'user', content: 'Hướng dẫn lắp SSD vào laptop' }
      ];
      const response = await sendMessage(messages, 'technical-support', logger);
      
      logger.logTestResult(true);
      
      expect(response.text.toLowerCase()).toContain('lắp');
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('laptop');
    }, 30000);
  });
});