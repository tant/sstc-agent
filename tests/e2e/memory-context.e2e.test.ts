import { TestLogger, sendLoggedMessage } from './test-utils';

describe('Memory and Context Tests', () => {
  // Test 1: Working Memory Functionality
  describe('Working Memory Functionality', () => {
    test('should capture and retain customer profile information', async () => {
      const logger = new TestLogger('working-memory-profile');
      const messages = [
        { role: 'user', content: 'Tôi tên là An, 25 tuổi, làm designer đồ họa' }
      ];
      const response = await sendLoggedMessage(messages, 'working-memory-profile', logger);
      
      logger.logTestResult(true);
      
      // Should acknowledge customer's name
      expect(response.text).toContain('An');
      // Should reference profession
      expect(response.text.toLowerCase()).toContain('designer');
      expect(response.text.toLowerCase()).toContain('đồ họa');
    }, 30000);

    test('should update working memory with new information', async () => {
      const logger = new TestLogger('working-memory-update');
      const conversation = [
        { role: 'user', content: 'Tôi tên là Bình, tôi dùng PC để văn phòng' },
        { role: 'user', content: 'À không, tôi cũng chơi game nữa' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'working-memory-update', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should consider both office work and gaming
      expect(response.text.toLowerCase()).toContain('văn phòng');
      expect(response.text.toLowerCase()).toContain('game');
    }, 30000);
  });

  // Test 2: Semantic Recall
  describe('Semantic Recall', () => {
    test('should recall relevant information from earlier in conversation', async () => {
      const logger = new TestLogger('semantic-recall-info');
      const conversation = [
        { role: 'user', content: 'Tôi đang tìm SSD cho laptop Dell Inspiron' },
        { role: 'user', content: 'Dell Inspiron có khe M.2 không?' },
        { role: 'user', content: 'Cấu hình laptop là i7-1250H, 16GB RAM' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'semantic-recall-info', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should recall the laptop model when discussing SSD
      expect(response.text.toLowerCase()).toContain('dell');
      expect(response.text.toLowerCase()).toContain('inspiron');
      // Should suggest appropriate SSD type
      expect(response.text.toLowerCase()).toContain('m.2');
    }, 45000);

    test('should reference technical specifications mentioned earlier', async () => {
      const logger = new TestLogger('semantic-recall-tech');
      const conversation = [
        { role: 'user', content: 'Tôi có mainboard B660, CPU i5-12400F' },
        { role: 'user', content: 'Tôi muốn nâng cấp VGA' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'semantic-recall-tech', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should reference the mainboard and CPU
      expect(response.text.toLowerCase()).toContain('b660');
      expect(response.text.toLowerCase()).toContain('i5');
      // Should suggest compatible GPU
      expect(response.text.toLowerCase()).toContain('vga');
      expect(response.text.toLowerCase()).toContain('gpu');
    }, 30000);
  });

  // Test 3: Context Preservation Across Topics
  describe('Context Preservation Across Topics', () => {
    test('should maintain customer identity across topic changes', async () => {
      const logger = new TestLogger('memory-boundary-topic-changes');
      const conversation = [
        { role: 'user', content: 'Tôi tên là Hùng, kỹ sư phần mềm' },
        { role: 'user', content: 'Tôi cần SSD cho máy công ty' },
        { role: 'user', content: 'À, nhân tiện bạn có tư vấn bảo trì PC không?' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'memory-boundary-topic-changes', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should still reference customer's name
      expect(response.text).toContain('Hùng');
      // Should address maintenance questions
      expect(response.text.toLowerCase()).toContain('bảo trì');
    }, 60000);

    test('should preserve technical context when switching between products', async () => {
      const logger = new TestLogger('memory-boundary-overload');
      const conversation = [
        { role: 'user', content: 'Tôi đang build PC với case Fractal Design Define 7' },
        { role: 'user', content: 'Tôi cần PSU 750W' },
        { role: 'user', content: 'PSU nào phù hợp với case của tôi?' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'memory-boundary-overload', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should reference the case model
      expect(response.text.toLowerCase()).toContain('fractal');
      expect(response.text.toLowerCase()).toContain('define');
      // Should address PSU compatibility
      expect(response.text.toLowerCase()).toContain('psu');
      expect(response.text).toContain('750');
    }, 60000);
  });

  // Test 4: Memory Boundary Testing
  describe('Memory Boundary Testing', () => {
    test('should handle conversation with many topic changes', async () => {
      const logger = new TestLogger('memory-consistency');
      const topics = [
        'SSD cho laptop gaming',
        'GPU Zotac cho mining',
        'Mainboard cho streaming',
        'RAM cho editing video',
        'Case cho water cooling',
        'PSU cho hệ thống cao cấp'
      ];
      
      const messages: { role: string; content: string }[] = [
        { role: 'user', content: 'Tôi tên là Long, tôi là streamer và editor' }
      ];
      
      // Discuss multiple topics
      for (let i = 0; i < topics.length; i++) {
        messages.push({ role: 'user', content: `Bạn tư vấn ${topics[i]}?` });
        const response = await sendLoggedMessage(messages, 'memory-consistency', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      // Final question about overall build
      messages.push({ role: 'user', content: 'Tổng kết lại các thành phần tôi cần?' });
      const finalResponse = await sendLoggedMessage(messages, 'memory-consistency', logger);
      
      logger.logTestResult(true);
      
      // Should reference customer's name
      expect(finalResponse.text).toContain('Long');
      // Should reference multiple components discussed
      expect(finalResponse.text.toLowerCase()).toContain('ssd');
      expect(finalResponse.text.toLowerCase()).toContain('gpu');
      expect(finalResponse.text.toLowerCase()).toContain('mainboard');
    }, 90000);

    test('should gracefully handle information overload', async () => {
      const logger = new TestLogger('memory-contradiction');
      const detailedConversation = [
        { role: 'user', content: 'Tôi tên là Nam, 30 tuổi, làm kiến trúc sư, dùng Mac và Windows' },
        { role: 'user', content: 'Tôi có 3 máy: Desktop gaming RTX 3080, Laptop ThinkPad P15 cho work, Mini PC NUC cho server' },
        { role: 'user', content: 'Tôi cần backup solution cho cả 3, storage khoảng 4TB' },
        { role: 'user', content: 'Budget cho mỗi máy khoảng 2 triệu, tổng 6 triệu' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of detailedConversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'memory-contradiction', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should handle complex requirements
      expect(response.text).toContain('Nam');
      expect(response.text.toLowerCase()).toContain('backup');
      expect(response.text).toContain('4TB');
      expect(response.text).toContain('2 triệu');
    }, 60000);
  });

  // Test 5: Memory Consistency
  describe('Memory Consistency', () => {
    test('should maintain consistent information about customer throughout conversation', async () => {
      const logger = new TestLogger('context-tech-preservation');
      const conversation = [
        { role: 'user', content: 'Tôi tên là Quỳnh, sinh viên năm 4, chuyên ngành CNTT' },
        { role: 'user', content: 'Tôi đang làm đồ án tốt nghiệp về AI' },
        { role: 'user', content: 'Tôi cần laptop cấu hình mạnh để chạy model' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      const responses: any[] = [];
      
      for (const msg of conversation) {
        messages.push(msg);
        const response = await sendLoggedMessage(messages, 'context-tech-preservation', logger);
        responses.push(response);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Check that customer information is consistent
      responses.forEach(response => {
        expect(response.text).toContain('Quỳnh');
        expect(response.text.toLowerCase()).toContain('sinh viên');
      });
      
      // Final response should reference all relevant information
      const finalResponse = responses[responses.length - 1];
      expect(finalResponse.text.toLowerCase()).toContain('ai');
      expect(finalResponse.text.toLowerCase()).toContain('python');
      expect(finalResponse.text.toLowerCase()).toContain('tensorflow');
    }, 75000);

    test('should not contradict previously stated information', async () => {
      const logger = new TestLogger('context-customer-identity');
      const conversation = [
        { role: 'user', content: 'Tôi tên là Hải, tôi là gamer, không làm văn phòng' },
        { role: 'user', content: 'Tôi cần build PC gaming budget 25 triệu' },
        { role: 'user', content: 'Tôi sẽ dùng chủ yếu để chơi game AAA và streaming' },
        { role: 'user', content: 'À bạn nhớ là tôi không làm văn phòng nhé, chỉ chơi game thôi' }
      ];
      
      const messages: { role: string; content: string }[] = [];
      let response: any;
      
      for (const msg of conversation) {
        messages.push(msg);
        response = await sendLoggedMessage(messages, 'context-customer-identity', logger);
        messages.push({ role: 'assistant', content: response.text });
      }
      
      logger.logTestResult(true);
      
      // Should not recommend office-focused components
      expect(response.text.toLowerCase()).not.toContain('văn phòng');
      // Should focus on gaming/streaming components
      expect(response.text.toLowerCase()).toContain('game');
      expect(response.text.toLowerCase()).toContain('streaming');
    }, 60000);
  });
});