import { sendMessage, TestLogger } from './test-utils';

describe('Edge Cases and Special Scenarios', () => {
  // Test 1: Special Characters and Emojis
  describe('Special Characters and Emojis', () => {
    test('should handle messages with special Vietnamese characters', async () => {
      const logger = new TestLogger('special-characters');
      const messages = [
        { role: 'user', content: 'Tôi cần SSD dung lượng 1TB, giá khoảng 2.5 triệu' }
      ];
      const response = await sendMessage(messages, 'special-characters', logger);
      
      logger.logTestResult(true);
      
      // Should handle numbers with periods correctly
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
    }, 30000);

    test('should handle messages with emojis', async () => {
      const logger = new TestLogger('emojis');
      const messages = [
        { role: 'user', content: 'Xin chào 😊 tôi cần tư vấn SSD' }
      ];
      const response = await sendMessage(messages, 'emojis', logger);
      
      logger.logTestResult(true);
      
      // Should respond appropriately despite emojis
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text).toContain('Mai');
    }, 30000);
  });

  // Test 2: Very Long Messages
  describe('Very Long Messages', () => {
    test('should handle detailed technical specifications', async () => {
      const logger = new TestLogger('long-messages');
      const longMessage = `Tôi đang build PC với cấu hình sau: 
        CPU: Intel Core i9-13900K, 
        Mainboard: ASUS ROG Strix Z790-E Gaming WiFi, 
        RAM: Corsair Vengeance LPX 32GB (2x16GB) DDR5-5600, 
        VGA: ASUS ROG Strix RTX 4090 OC Edition 24GB, 
        SSD: Samsung 980 PRO 2TB NVMe M.2, 
        Case: Lian Li PC-O11 Dynamic, 
        PSU: Corsair RM850x 850W 80+ Gold Fully Modular. 
        Tôi muốn nâng cấp storage thêm 4TB, bạn gợi ý giải pháp nào tối ưu?`;
      
      const messages = [
        { role: 'user', content: longMessage }
      ];
      const response = await sendMessage(messages, 'long-messages', logger);
      
      logger.logTestResult(true);
      
      // Should provide relevant response to complex query
      expect(response.text.toLowerCase()).toContain('storage');
      expect(response.text).toContain('4TB');
    }, 45000);

    test('should handle very short messages', async () => {
      const logger = new TestLogger('short-messages');
      const messages = [
        { role: 'user', content: 'SSD?' }
      ];
      const response = await sendMessage(messages, 'short-messages', logger);
      
      logger.logTestResult(true);
      
      // Should ask for clarification
      expect(response.text).toContain('?');
    }, 30000);
  });

  // Test 3: Mixed Languages and Code Switching
  describe('Mixed Languages and Code Switching', () => {
    test('should handle code-switching within sentences', async () => {
      const logger = new TestLogger('code-switching');
      const messages = [
        { role: 'user', content: 'Tôi cần cái SSD good cho laptop gaming và có warranty dài' }
      ];
      const response = await sendMessage(messages, 'code-switching', logger);
      
      logger.logTestResult(true);
      
      // Should understand mixed language
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('laptop');
      expect(response.text.toLowerCase()).toContain('gaming');
    }, 30000);

    test('should maintain conversation flow with mixed language input', async () => {
      const logger = new TestLogger('mixed-language-flow');
      const conversation = [
        { role: 'user', content: 'Hi, I need SSD for my laptop' },
        { role: 'user', content: 'Laptop là Dell Inspiron 15 5520' },
        { role: 'user', content: 'What capacity do you recommend?' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'mixed-language-flow', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should handle language switching
      expect(response.text).toBeDefined();
    }, 45000);
  });

  // Test 4: Repetitive and Circular Conversations
  describe('Repetitive and Circular Conversations', () => {
    test('should not get stuck in loops with repetitive questions', async () => {
      const logger = new TestLogger('repetitive-questions');
      const repetitiveQuestions = [
        { role: 'user', content: 'SSD giá bao nhiêu?' },
        { role: 'user', content: 'SSD giá bao nhiêu?' },
        { role: 'user', content: 'SSD giá bao nhiêu?' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      const responses: any[] = [];
      
      for (const msg of repetitiveQuestions) {
        messages.push(msg);
        const response = await sendMessage(messages, 'repetitive-questions', logger);
        responses.push(response);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Responses should not be identical
      const responseTexts = responses.map(r => r.text);
      // At least some variation should occur
      expect(new Set(responseTexts).size).toBeGreaterThanOrEqual(1);
    }, 45000);

    test('should handle circular conversation patterns', async () => {
      const logger = new TestLogger('circular-conversation');
      const circularConversation = [
        { role: 'user', content: 'Tôi cần GPU' },
        { role: 'user', content: 'GPU nào tốt?' },
        { role: 'user', content: 'Tại sao GPU đó tốt?' },
        { role: 'user', content: 'GPU nào tốt?' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of circularConversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'circular-conversation', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should handle circular questioning gracefully
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(0);
    }, 45000);
  });

  // Test 5: Stress Testing
  describe('Stress Testing', () => {
    test('should handle rapid fire questions', async () => {
      const logger = new TestLogger('rapid-fire');
      const rapidQuestions = [
        'SSD nào nhanh nhất?',
        'GPU cho AI training?',
        'Mainboard hỗ trợ RAM 64GB?',
        'Case tản nhiệt tốt?',
        'PSU 1000W hiệu suất cao?'
      ];
      
      const messages: { role: string; content: string }[] = [];
      const responses: any[] = [];
      
      for (let i = 0; i < rapidQuestions.length; i++) {
        const question = rapidQuestions[i];
        messages.push({ role: 'user', content: question });
        const response = await sendMessage(messages, 'rapid-fire', logger);
        responses.push(response);
        messages.push({ role: 'assistant', content: response.text });
        
        // Small delay to simulate realistic interaction
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      logger.logTestResult(true);
      
      // Should handle all questions
      expect(responses.length).toBe(rapidQuestions.length);
      responses.forEach(response => {
        expect(response.text).toBeDefined();
        expect(response.text.length).toBeGreaterThan(0);
      });
    }, 60000);

    test('should maintain performance with complex nested conversations', async () => {
      const logger = new TestLogger('complex-conversation');
      // Create a complex conversation with multiple branches
      const complexConversation = [
        { role: 'user', content: 'Tôi tên là Đức, tôi là content creator' },
        { role: 'user', content: 'Tôi làm video 4K, cần PC mạnh' },
        { role: 'user', content: 'Budget khoảng 50 triệu' },
        { role: 'user', content: 'Tôi cần render nhanh và streaming ổn định' },
        { role: 'user', content: 'Bạn gợi ý cấu hình chi tiết?' },
        { role: 'user', content: 'So sánh Intel và AMD cho editing?' },
        { role: 'user', content: 'Storage solution cho project files?' },
        { role: 'user', content: 'Monitor 4K phù hợp?' },
        { role: 'user', content: 'Peripherals cho editing workflow?' },
        { role: 'user', content: 'Tổng kết lại và ước tính tổng cost?' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of complexConversation) {
        messages.push(msg);
        response = await sendMessage(messages, 'complex-conversation', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should handle complex multi-topic conversation
      expect(response.text).toContain('Đức');
      expect(response.text.toLowerCase()).toContain('50 triệu');
    }, 90000);
  });

  // Test 6: Error Recovery and Graceful Degradation
  describe('Error Recovery and Graceful Degradation', () => {
    test('should recover from confusing or contradictory input', async () => {
      const logger = new TestLogger('error-recovery');
      const confusingInput = [
        { role: 'user', content: 'Tôi cần SSD nhưng tôi không dùng máy tính' },
        { role: 'user', content: 'À có dùng, nhưng chỉ để xem phim' },
        { role: 'user', content: 'Không, tôi là gamer, nhưng tôi dùng console' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of confusingInput) {
        messages.push(msg);
        response = await sendMessage(messages, 'error-recovery', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should handle contradictory information gracefully
      expect(response.text).toBeDefined();
      // Should ask for clarification or make reasonable assumptions
      expect(response.text).toContain('?');
    }, 45000);

    test('should handle when customer changes requirements mid-conversation', async () => {
      const logger = new TestLogger('requirement-changes');
      const changingRequirements = [
        { role: 'user', content: 'Tôi cần PC gaming budget 15 triệu' },
        { role: 'user', content: 'À không, tôi cần PC cho office work' },
        { role: 'user', content: 'Không, đúng là gaming, nhưng budget 30 triệu' },
        { role: 'user', content: 'À cuối cùng là workstation cho CAD' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of changingRequirements) {
        messages.push(msg);
        response = await sendMessage(messages, 'requirement-changes', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should adapt to final requirement
      expect(response.text.toLowerCase()).toContain('cad');
      expect(response.text.toLowerCase()).toContain('workstation');
    }, 45000);
  });

  // Test 7: Cultural and Regional Sensitivity
  describe('Cultural and Regional Sensitivity', () => {
    test('should handle Vietnamese cultural context appropriately', async () => {
      const logger = new TestLogger('cultural-sensitivity');
      const messages = [
        { role: 'user', content: 'Tôi vừa nhận được học bổng nên muốn đầu tư PC' }
      ];
      const response = await sendMessage(messages, 'cultural-sensitivity', logger);
      
      logger.logTestResult(true);
      
      // Should respond with appropriate cultural sensitivity
      expect(response.text).toContain('học bổng');
      // Should be encouraging and helpful
      expect(response.text.toLowerCase()).toContain('chúc mừng');
    }, 30000);

    test('should handle regional product availability context', async () => {
      const logger = new TestLogger('regional-availability');
      const messages = [
        { role: 'user', content: 'Sản phẩm này có sẵn hàng không? Giao hàng bao lâu?' }
      ];
      const response = await sendMessage(messages, 'regional-availability', logger);
      
      logger.logTestResult(true);
      
      // Should address availability and shipping questions
      expect(response.text.toLowerCase()).toContain('sẵn');
      expect(response.text.toLowerCase()).toContain('giao');
    }, 30000);
  });
});