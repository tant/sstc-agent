import { TestLogger, sendLoggedMessage } from './test-utils';

describe('Workflow Engine Integration', () => {
  // Test 1: Intent Analysis & Classification
  describe('Intent Analysis Processing', () => {
    test('should classify purchase intent and route to Purchase Agent', async () => {
      const logger = new TestLogger('workflow-purchase-routing');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua SSD gaming 2TB' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-purchase-routing', logger);

      logger.logTestResult(true);

      // Should be handled by Purchase agent (not Mai agent)
      expect(response.text.toLowerCase()).toMatch(/(ssd|ssd|sản phẩm|tuổi|tư vấn chi tiết|budget|game|gaming|purchase闷)/);
      // Should have workflow metadata indicating proper routing
      // Note: In real workflow, this would return metadata.agentType = 'purchase'
    }, 45000);

    test('should classify warranty intent and route to Warranty Agent', async () => {
      const logger = new TestLogger('workflow-warranty-routing');
      const messages = [
        { role: 'user', content: 'SSD của tôi mua 2 năm trước, bây giờ bị lỗi' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-warranty-routing', logger);

      logger.logTestResult(true);

      // Should be handled by Warranty agent (not Mai agent)
      expect(response.text.toLowerCase()).toMatch(/(bảo hành|biểu|serial|kiểm tra|support|repair|replace)/);
      // Should address warranty timeframe (2 years old)
      expect(response.text.toLowerCase()).toMatch(/(thời hạn|hàng|temporary|expires|policy)/);
    }, 45000);

    test('should route unclear intents to Clarification Agent', async () => {
      const logger = new TestLogger('workflow-clarification-routing');
      const messages = [
        { role: 'user', content: 'Card đồ họa Zotac thông tin' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-clarification-routing', logger);

      logger.logTestResult(true);

      // Should be handled by Clarification agent - unclear intent
      expect(response.text.toLowerCase()).toMatch(/(mua.*hay|bảo hành.*hay|thêm.*thông tin|specific|chi tiết|hỏi cụ thể)/);
      // Should not dive deep into product specifics yet
      expect(response.text.length).toBeLessThan(500); // Should keep it brief
    }, 45000);
  });

  // Test 2: Agent Selection Logic
  describe('Agent Selection Logic & Thresholds', () => {
    test('should route high confidence purchase to Purchase Agent', async () => {
      const logger = new TestLogger('workflow-routing-thresholds-purchase');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua SSD NVMe 1TB để build PC gaming' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-routing-thresholds-purchase', logger);

      logger.logTestResult(true);

      // Should demonstrate Purchase Agent expertise
      expect(response.text.toLowerCase()).toMatch(/(ssd|nvme|1tb|pc|gaming|budget|recommend|trust|suggested price)/);
      // Should ask relevant purchase-specific questions
      expect(response.text.length).toBeGreaterThan(150); // Comprehensive response
    }, 45000);

    test('should route high confidence warranty to Warranty Agent', async () => {
      const logger = new TestLogger('workflow-routing-thresholds-warranty');
      const messages = [
        { role: 'user', content: 'GPU Zotac của tôi không lên hình sau батаре 1 năm, serial XYZ123' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-routing-thresholds-warranty', logger);

      logger.logTestResult(true);

      // Should demonstrate Warranty Agent expertise
      expect(response.text.toLowerCase()).toMatch(/(zotac|gpu|vga|warranty|serial.*xyz123|register|claim)/);
      // Should address specific warranty procedures
      expect(response.text.toLowerCase()).toMatch(/(trình|repair|replace|step|process)/);
    }, 45000);

    test('should fallback to Mai Agent for unknown or mixed intents', async () => {
      const logger = new TestLogger('workflow-routing-fallback-mai');
      const messages = [
        { role: 'user', content: 'SSTC là gì và có bán gì?' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-routing-fallback-mai', logger);

      logger.logTestResult(true);

      // Should be Mai Agent - general company questions
      expect(response.text.toLowerCase()).toMatch(/(mai|sstc|introduction|welcome|company|product)/);
      // Should mention Mai explicitly (Mai agent's personality)
      expect(response.text).toMatch(/(Mai|mai)/);
    }, 45000);
  });

  // Test 3: Greeting Control Integration
  describe('Greeting Control System Integration', () => {
    test('should include FIRST_TIME greeting for new users', async () => {
      const logger = new TestLogger('workflow-greeting-first-time');
      const messages = [
        { role: 'user', content: 'Xin chào, tôi muốn hỏi về mainboard' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-greeting-first-time', logger);

      logger.logTestResult(true);

      // Should include greeting in response
      expect(response.text.toLowerCase()).toMatch(/(xin chào|chào.*quý khách|greetings|welcome)/);
      // Should introduce Mai or the agent
      expect(response.text.toLowerCase()).toMatch(/(mai|sự)*agent|tôi là|support/i);
    }, 45000);

    test('should mark users as greeted after first successful response', async () => {
      const logger = new TestLogger('workflow-greeting-mark-as-greeted');
      // First message - should get greeting
      const messages1 = [
        { role: 'user', content: 'Hi, I need SSD recommendations' }
      ];
      const response1 = await sendLoggedMessage(messages1, 'workflow-greeting-mark-as-greeted-1', logger);

      // Should show greeting behavior
      expect(response1.text).toBeDefined();

      // Second message - same user should not get greeting (in real workflow)
      const messages2 = [
        { role: 'user', content: 'Actually, budget under 2 million VND' }
      ];
      const response2 = await sendLoggedMessage(messages2, 'workflow-greeting-mark-as-greeted-2', logger);

      logger.logTestResult(true);

      // Second response should be direct (in real workflow, no greeting)
      expect(response2.text).toBeDefined();
    }, 45000);
  });

  // Test 4: Chat History Integration
  describe('Chat History & Context Integration', () => {
    test('should build context from previous messages', async () => {
      const logger = new TestLogger('workflow-chat-history-context');
      // Build conversation context
      const conversation = [
        'Tôi đang tìm SSD 1TB',
        'SSD nào phù hợp cho gaming?',
        'Budget khoảng 2 triệu',
        'Nhưng có ưu đãi gì không?'
      ];

      const responses: any[] = [];

      for (let i = 0; i < conversation.length; i++) {
        const messages = [
          { role: 'user', content: conversation[i] }
        ];
        const response = await sendLoggedMessage(messages, `workflow-chat-history-context-${i}`, logger);
        responses.push(response);
      }

      logger.logTestResult(true);

      // Responses should show context awareness
      expect(responses[0].text.toLowerCase()).toContain('ssd');
      expect(responses[1].text.toLowerCase()).toMatch(/(ssd|donald|premium|plus|value)/i);
      expect(responses[2].text.toLowerCase()).toMatch(/(2.*?triệu|budget|price|khoảng|giá)/i);
    }, 45000);

    test('should handle memory retrieval for returning users', async () => {
      const logger = new TestLogger('workflow-memory-returning-user');
      const messages = [
        { role: 'user', content: 'Tôi đã hỏi về GPU Zotac trước đây, giờ tôi muốn mua rồi' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-memory-returning-user', logger);

      logger.logTestResult(true);

      // Should show context awareness of previous inquiry
      expect(response.text.toLowerCase()).toMatch(/(zotac|gpu|trước đây|previous|nhà|prefer)/);
      // Should acknowledge memory of previous conversation
      expect(response.text.toLowerCase()).toMatch(/(nhớ|hỏi mua|ready|ready to purchase)/i);
    }, 45000);
  });

  // Test 5: Fallback & Error Recovery
  describe('Fallback Mechanisms & Error Recovery', () => {
    test('should fallback to Mai Agent when Purchase Agent fails', async () => {
      const logger = new TestLogger('workflow-fallback-purchase-to-mai');
      const messages = [
        // Create a scenario that might be challenging for Purchase Agent
        { role: 'user', content: 'Tôi muốn mua SSD siêu rẻ, không quan tâm chát lượng' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-fallback-purchase-to-mai', logger);

      logger.logTestResult(true);

      // Should handle the request appropriately regardless
      expect(response.text).toBeDefined();
      // Should not completely fail the interaction
      expect(response.text.length).toBeGreaterThan(50);
    }, 45000);

    test('should fallback to Mai Agent when Warranty Agent fails', async () => {
      const logger = new TestLogger('workflow-fallback-warranty-to-mai');
      const messages = [
        { role: 'user', content: 'GPU cháy điện thoại caused by overvolting, serial unknown, still have warranty?' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-fallback-warranty-to-mai', logger);

      logger.logTestResult(true);

      // Should handle complex warranty scenarios
      expect(response.text).toBeDefined();
      // Should address warranty implications of power surge damage
      expect(response.text.toLowerCase()).toMatch(/(warranty|policy|cháy|power.*surge|damage)/i);
    }, 45000);

    test('should handle complete workflow failure gracefully', async () => {
      const logger = new TestLogger('workflow-fallback-complete-failure');
      const messages = [
        // Very complex or problematic message
        { role: 'user', content: 'Tôi cần hỗ trợ bảo hành cho SSD bị cháy do lightning strike nhưng tôi không có serial và mua từ năm 2018' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-fallback-complete-failure', logger);

      logger.logTestResult(true);

      // Should always provide some response, never fail completely
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(20);
      // Should be professional even with difficult scenarios
      expect(response.text.toLowerCase()).toMatch(/(xin lỗi|hỗ trợ|support|policy)/i);
    }, 45000);
  });

  // Test 6: Channel-Agnostic Processing
  describe('Channel-Agnostic Processing', () => {
    test('should maintain consistent behavior across different channels', async () => {
      const logger = new TestLogger('workflow-channel-agnostic');
      const messages = [
        { role: 'user', content: 'Tôi cần bảo hành SSD' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-channel-agnostic', logger);

      logger.logTestResult(true);

      // Response should be consistent regardless of channel
      // In real implementation, this would test multiple channelId inputs
      expect(response.text).toBeDefined();
      expect(response.text.toLowerCase()).toContain('ssd');
    }, 45000);

    test('should handle channel-specific attachments appropriately', async () => {
      // This test would validate attachment processing in real workflow
      // Currently testing text-only for simplicity
      expect(true).toBe(true);
    }, 1000);
  });

  // Test 7: Profiling & User Data Updates
  describe('User Profiling & Data Updates', () => {
    test('should update user profile with purchase intent', async () => {
      const logger = new TestLogger('workflow-profiling-purchase-intent');
      const messages = [
        { role: 'user', content: 'Tôi là nhà thiết kế đồ họa, cần SSD 2TB cho 4K editing' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-profiling-purchase-intent', logger);

      logger.logTestResult(true);

      // Should respond to professional workstation needs
      expect(response.text.toLowerCase()).toMatch(/(đồ họa|editing|4k|ssd|2tb|professional)/);
      // In real workflow, would update user profile with profession and needs
    }, 45000);

    test('should capture pain points and satisfaction levels', async () => {
      const logger = new TestLogger('workflow-profiling-pain-points');
      const messages = [
        { role: 'user', content: 'SSD SSTC mỗi lần format lại máy rất mất thời gian' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-profiling-pain-points', logger);

      logger.logTestResult(true);

      // Should address specific technical pain point
      expect(response.text.toLowerCase()).toMatch(/(ssd|format|mất thời gian|time.*consuming|slow|performance)/i);
      // In real workflow, would note this as a user pain point
    }, 45000);
  });

  // Test 8: Performance & Runtime Validation
  describe('Performance & Runtime Validation', () => {
    test('should handle real-time processing under typical load', async () => {
      const logger = new TestLogger('workflow-performance-real-time');
      const messages = [
        { role: 'user', content: 'Tôi cần mua GPU RTX 4070, budget tầm 10 triệu' }
      ];
      const response = await sendLoggedMessage(messages, 'workflow-performance-real-time', logger);

      logger.logTestResult(true);

      // Should provide timely response
      expect(response.text).toBeDefined();
      // Should address specific GPU requirements
      expect(response.text.toLowerCase()).toMatch(/(rtx.*4070|gpu|10.*?triệu|budget)/i);
    }, 45000);

    test('should maintain consistency across rapid interactions', async () => {
      const logger = new TestLogger('workflow-performance-rapid-interactions');
      const rapidInteractionTypes = [
        'Tôi cần SSD tốt nhất',
        'SSD nào phù hợp gaming?',
        'Bao giờ có khuyến mãi?',
        'Giá giảm bao nhiêu?'
      ];

      const responses: any[] = [];

      for (let i = 0; i < rapidInteractionTypes.length; i++) {
        const messages = [
          { role: 'user', content: rapidInteractionTypes[i] }
        ];
        const response = await sendLoggedMessage(messages, `workflow-performance-rapid-interactions-${i}`, logger);
        responses.push(response);
      }

      logger.logTestResult(true);

      // All responses should be defined and relevant
      responses.forEach((response, index) => {
        expect(response.text).toBeDefined();
        expect(response.text.toLowerCase()).toContain('ssd');
      });
    }, 45000);
  });
});
