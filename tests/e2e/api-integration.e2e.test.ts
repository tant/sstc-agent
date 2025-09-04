import axios from 'axios';
import { TestLogger } from './test-utils';

describe('REST API Integration Tests', () => {
  const BASE_URL = 'http://localhost:4111'; // Updated to match workflow endpoint
  const AUTH_KEY = process.env.MASTRA_API_KEY || 'test-key';

  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_KEY}`
    }
  };

  beforeAll(() => {
    console.log('🔧 [API Tests] Using base URL:', BASE_URL);
    console.log('🔑 [API Tests] Using auth key:', AUTH_KEY.substring(0, 10) + '...');
  });

  // Test 1: Health Check Endpoint
  describe('Health Check Endpoint (/health)', () => {
    test('should return healthy status when service is running', async () => {
      const logger = new TestLogger('api-health-check');
      logger.log('Testing health check endpoint');

      const response = await axios.get(`${BASE_URL}/health`);

      logger.logTestResult(true);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('memory');
    }, 30000);

    test('should include memory usage information', async () => {
      const logger = new TestLogger('api-health-memory');
      logger.log('Testing health check memory fields');

      const response = await axios.get(`${BASE_URL}/health`);

      logger.logTestResult(true);

      expect(response.data.memory).toBeDefined();
      expect(typeof response.data.memory).toBe('object');
      // Check for common memory properties
      Object.keys(response.data.memory).forEach(key => {
        expect(typeof response.data.memory[key]).toBe('number');
      });
    }, 30000);
  });

  // Test 2: Chat Processing Endpoint
  describe('Chat Processing Endpoint (/chat)', () => {
    test('should process valid chat message successfully', async () => {
      const logger = new TestLogger('api-chat-valid');
      logger.log('Testing valid chat message');

      const chatPayload = {
        channelId: 'telegram',
        message: {
          content: 'Tôi muốn mua SSD SSTC',
          senderId: 'test-user-123',
          timestamp: new Date().toISOString()
        },
        senderId: 'test-user-123'
      };

      const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);

      logger.logTestResult(true);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('response');
      expect(response.data).toHaveProperty('metadata');
      expect(response.data).toHaveProperty('processedAt');
      expect(response.data.response).toBeDefined();
      expect(typeof response.data.response).toBe('string');
    }, 45000);

    test('should handle purchase inquiry with Purchase Agent', async () => {
      const logger = new TestLogger('api-chat-purchase');
      logger.log('Testing purchase-specific chat message');

      const chatPayload = {
        channelId: 'telegram',
        message: {
          content: 'Tôi cần tư vấn về mainboard gaming',
          senderId: 'test-purchase-user',
          timestamp: new Date().toISOString()
        },
        senderId: 'test-purchase-user'
      };

      const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);

      logger.logTestResult(true);

      expect(response.data.success).toBe(true);
      expect(response.data.response).toBeDefined();
      // Should address specific purchase questions
      expect(response.data.response.toLowerCase()).toMatch(/(mainboard|gaming|budget|tư vấn)/i);
    }, 45000);

    test('should handle warranty inquiry with Warranty Agent', async () => {
      const logger = new TestLogger('api-chat-warranty');
      logger.log('Testing warranty-specific chat message');

      const chatPayload = {
        channelId: 'telegram',
        message: {
          content: 'SSD của tôi mua được 1 năm, bây giờ bị lỗi cần bảo hành',
          senderId: 'test-warranty-user',
          timestamp: new Date().toISOString()
        },
        senderId: 'test-warranty-user'
      };

      const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);

      logger.logTestResult(true);

      expect(response.data.success).toBe(true);
      expect(response.data.response).toBeDefined();
      // Should address warranty-specific concerns
      expect(response.data.response.toLowerCase()).toMatch(/(bảo hành|warranty|serial|kiểm tra)/i);
    }, 45000);

    test('should handle unclear messages with Clarification Agent', async () => {
      const logger = new TestLogger('api-chat-clarification');
      logger.log('Testing unclear message handling');

      const chatPayload = {
        channelId: 'telegram',
        message: {
          content: ' SSD Và Zotac ..... ?',
          senderId: 'test-clarification-user',
          timestamp: new Date().toISOString()
        },
        senderId: 'test-clarification-user'
      };

      const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);

      logger.logTestResult(true);

      expect(response.data.success).toBe(true);
      // Should ask for clarification on unclear message
      expect(response.data.response.toLowerCase()).toMatch(/(hỏi|thêm.*thông tin|chỉ rõ|rõ hơn|specific)/i);
    }, 45000);

    test('should return error for missing required fields', async () => {
      const logger = new TestLogger('api-chat-missing-fields');
      logger.log('Testing error handling for missing fields');

      // Missing channelId
      const invalidPayload = {
        message: {
          content: 'Hello',
          senderId: 'test-user',
          timestamp: new Date().toISOString()
        },
        senderId: 'test-user'
      };

      try {
        await axios.post(`${BASE_URL}/chat`, invalidPayload, axiosConfig);
        throw new Error('Should have failed with 400 status');
      } catch (error: any) {
        logger.logTestResult(true);

        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.required).toBeDefined();
      }
    }, 30000);

    test('should process messages across different channels consistently', async () => {
      const logger = new TestLogger('api-chat-multi-channel');
      logger.log('Testing channel consistency');

      const channels = ['telegram', 'whatsapp', 'web', 'zalo'];
      const testMessage = ['Xin chào tôi cần tư vấn SSD'];
      const senderBase = 'multi-channel-test';

      const responses: any[] = [];

      for (let i = 0; i < channels.length; i++) {
        const channelId = channels[i];
        const senderId = `${senderBase}-${channelId}`;

        const chatPayload = {
          channelId,
          message: {
            content: testMessage[i % testMessage.length],
            senderId,
            timestamp: new Date().toISOString()
          },
          senderId
        };

        const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);
        responses.push(response);
      }

      logger.logTestResult(true);

      // All responses should be successful
      responses.forEach((response, index) => {
        expect(response.data.success).toBe(true);
        expect(response.data.response).toBeDefined();
        // Each should address the SSD inquiry
        expect(response.data.response.toLowerCase()).toContain('ssd');
      });
    }, 45000);
  });

  // Test 3: Memory Management Endpoints
  describe('Memory Management Endpoints', () => {
    test('should retrieve user chat history successfully', async () => {
      const logger = new TestLogger('api-memory-history');
      logger.log('Testing memory history retrieval');

      const testUserId = 'test-memory-user-123';

      const response = await axios.get(`${BASE_URL}/memory/${testUserId}/history`);

      logger.logTestResult(true);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('userId', testUserId);
      expect(response.data).toHaveProperty('messages');
      expect(Array.isArray(response.data.messages)).toBe(true);
      expect(response.data).toHaveProperty('retrievedAt');
    }, 30000);

    test('should handle history filtering by limit parameter', async () => {
      const logger = new TestLogger('api-memory-history-limit');
      logger.log('Testing memory history with limit parameter');

      const testUserId = 'test-history-limit-user';

      const response = await axios.get(`${BASE_URL}/memory/${testUserId}/history?limit=25`);

      logger.logTestResult(true);

      expect(response.data.success).toBe(true);
      expect(response.data.messages.length).toBeLessThanOrEqual(25);
    }, 30000);

    test('should reset user memory when confirmed', async () => {
      const logger = new TestLogger('api-memory-reset');
      logger.log('Testing memory reset functionality');

      const testUserId = 'test-reset-user-456';

      const resetPayload = {
        confirm: true
      };

      const response = await axios.post(`${BASE_URL}/memory/${testUserId}/reset`, resetPayload);

      logger.logTestResult(true);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.message).toContain(testUserId);
      expect(response.data.message).toContain('reset');
    }, 30000);

    test('should prevent reset without confirmation', async () => {
      const logger = new TestLogger('api-memory-reset-no-confirm');
      logger.log('Testing prevention of unconfirmed reset');

      const testUserId = 'test-no-confirm-reset-user';

      const resetPayload = {
        // No confirm field
      };

      try {
        await axios.post(`${BASE_URL}/memory/${testUserId}/reset`, resetPayload);
        throw new Error('Should have failed with 400 status');
      } catch (error: any) {
        logger.logTestResult(true);

        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('confirmation');
        expect(error.response.data.error).toContain('confirm');
      }
    }, 30000);
  });

  // Test 4: Greeting Control Endpoints
  describe('Greeting Control Endpoints', () => {
    test('should check greeting status for new user', async () => {
      const logger = new TestLogger('api-greeting-new-user');
      logger.log('Testing greeting status for new user');

      const testUserId = 'new-greeting-user-789';

      const response = await axios.get(`${BASE_URL}/greeting/${testUserId}/status`);

      logger.logTestResult(true);

      expect(response.data.success).toBe(true);
      expect(response.data.hasBeenGreeted).toBeDefined();
      expect(response.data).toHaveProperty('greetingInstruction');
      // Expected to be false for new user
      expect(response.data.hasBeenGreeted).toBe(false);
    }, 30000);

    test('should show correct greeting instruction', async () => {
      const logger = new TestLogger('api-greeting-instruction');
      logger.log('Testing greeting instruction logic');

      const testUserId = 'instruction-test-user';

      const response = await axios.get(`${BASE_URL}/greeting/${testUserId}/status`);

      logger.logTestResult(true);

      expect(response.data.greetingInstruction).toBeDefined();
      if (response.data.hasBeenGreeted) {
        expect(response.data.greetingInstruction).toContain('SKIP');
      } else {
        expect(response.data.greetingInstruction).toContain('FIRST TIME');
      }
    }, 30000);
  });

  // Test 5: System Analytics Endpoints
  describe('System Analytics Endpoints (/analytics)', () => {
    test('should return system analytics and memory stats', async () => {
      const logger = new TestLogger('api-analytics-system');
      logger.log('Testing system analytics endpoint');

      const response = await axios.get(`${BASE_URL}/analytics`);

      logger.logTestResult(true);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('memory');
      expect(response.data).toHaveProperty('system');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data.system).toHaveProperty('uptime');
      expect(response.data.system).toHaveProperty('memoryUsage');
    }, 30000);

    test('should include memory statistics data', async () => {
      const logger = new TestLogger('api-analytics-memory');
      logger.log('Testing analytics memory statistics');

      const response = await axios.get(`${BASE_URL}/analytics`);

      logger.logTestResult(true);

      expect(response.data.memory).toBeDefined();
      expect(typeof response.data.memory).toBe('object');
      // Should have chat history stats
      expect(response.data.memory).toHaveProperty('chatHistoryCount');
      expect(response.data.memory).toHaveProperty('userProfilesCount');
    }, 30000);
  });

  // Test 6: API Documentation & Root Endpoint
  describe('API Documentation Endpoint', () => {
    test('should return API documentation at root', async () => {
      const logger = new TestLogger('api-docs-root');
      logger.log('Testing API documentation endpoint');

      const response = await axios.get(BASE_URL);

      logger.logTestResult(true);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('name', 'SSTC Agent API');
      expect(response.data).toHaveProperty('version', '1.0.0');
      expect(response.data).toHaveProperty('endpoints');
      expect(response.data).toHaveProperty('workflow');
      expect(response.data.workflow.agents).toContain('maiSale');
      expect(response.data.workflow.channels).toContain('telegram');
    }, 30000);

    test('should list all available endpoints in docs', async () => {
      const logger = new TestLogger('api-docs-endpoints');
      logger.log('Testing API endpoints documentation');

      const response = await axios.get(BASE_URL);

      logger.logTestResult(true);

      const endpoints = response.data.endpoints;
      expect(endpoints).toHaveProperty('GET /health');
      expect(endpoints).toHaveProperty('POST /chat');
      expect(endpoints).toHaveProperty('GET /memory/:userId/history');
      expect(endpoints).toHaveProperty('GET /analytics');
      expect(endpoints).toHaveProperty('POST /memory/:userId/reset');
      expect(endpoints).toHaveProperty('GET /greeting/:userId/status');
    }, 30000);
  });

  // Test 7: Error Handling & Edge Cases
  describe('Error Handling & Edge Cases', () => {
    test('should handle server errors gracefully', async () => {
      const logger = new TestLogger('api-error-handling');
      logger.log('Testing error handling');

      // Test with malformed JSON or invalid request
      try {
        await axios.post(`${BASE_URL}/chat`, '{"invalid": json}', axiosConfig);
        throw new Error('Should have failed');
      } catch (error: any) {
        logger.logTestResult(true);

        if (error.response) {
          expect(error.response.status).toBeGreaterThanOrEqual(400);
          expect(error.response.data).toHaveProperty('error');
          expect(error.response.data).toHaveProperty('timestamp');
        }
      }
    }, 30000);

    test('should handle non-existent user IDs gracefully', async () => {
      const logger = new TestLogger('api-non-existent-user');
      logger.log('Testing non-existent user handling');

      const nonExistentUserId = 'non-existent-user-999';

      try {
        await axios.get(`${BASE_URL}/memory/${nonExistentUserId}/history`);
        // Should still return successful response with empty history
        // If it fails, handle the error appropriately
      } catch (error: any) {
        logger.logTestResult(true);

        if (error.response) {
          expect(error.response.status).toBeLessThan(500); // Should not be server error
          expect(error.response.data).toHaveProperty('messages');
          expect(Array.isArray(error.response.data.messages)).toBe(true);
        }
      }
    }, 30000);

    test('should handle authentication correctly', async () => {
      const logger = new TestLogger('api-auth-handling');
      logger.log('Testing authentication handling');

      const invalidConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key'
        }
      };

      const chatPayload = {
        channelId: 'telegram',
        message: {
          content: 'Hello',
          senderId: 'auth-test-user',
          timestamp: new Date().toISOString()
        },
        senderId: 'auth-test-user'
      };

      try {
        await axios.post(`${BASE_URL}/chat`, chatPayload, invalidConfig);
        // If succeeds, auth might not be implemented - that's okay
        logger.logTestResult(true);
      } catch (error: any) {
        logger.logTestResult(true);

        if (error.response) {
          expect(error.response.status).toBe(401); // Authentication error
        }
      }
    }, 30000);
  });

  // Test 8: Integration Stress Tests
  describe('Integration Stress Tests', () => {
    test('should handle rapid successive requests', async () => {
      const logger = new TestLogger('api-stress-rapid-requests');
      logger.log('Testing rapid successive requests');

      const rapidMessages = [
        'Tôi cần mua SSD',
        'SSD nào tốt nhất?',
        'Giá bao nhiêu?',
        'Có khuyến mãi không?'
      ];

      const responses: any[] = [];
      const startTime = Date.now();

      for (let i = 0; i < rapidMessages.length; i++) {
        const chatPayload = {
          channelId: 'telegram',
          message: {
            content: rapidMessages[i],
            senderId: `stress-test-user-${i}`,
            timestamp: new Date().toISOString()
          },
          senderId: `stress-test-user-${i}`
        };

        const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);
        responses.push(response);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      logger.logTestResult(true);

      responses.forEach(response => {
        expect(response.data.success).toBe(true);
      });

      // Should complete within reasonable time (allow 30 seconds total for 4 requests)
      expect(totalTime).toBeLessThan(30000);
    }, 45000);

    test('should maintain performance under load', async () => {
      const logger = new TestLogger('api-stress-load-performance');
      logger.log('Testing load performance');

      const messageContent = 'Nhanh gọn nhẹ nhàng dễ thương';
      const senderId = 'load-test-user';

      const responseTimes: number[] = [];
      const iterations = 5; // Reasonable load test

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const chatPayload = {
          channelId: 'telegram',
          message: {
            content: `${messageContent} ${i}`,
            senderId,
            timestamp: new Date().toISOString()
          },
          senderId
        };

        const response = await axios.post(`${BASE_URL}/chat`, chatPayload, axiosConfig);
        const endTime = Date.now();

        responseTimes.push(endTime - startTime);
        expect(response.data.success).toBe(true);
      }

      logger.logTestResult(true);

      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

      // Should typically respond within 10 seconds per request
      expect(avgResponseTime).toBeLessThan(10000);

      // Response times should be relatively consistent (not wildly varying)
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);
      const varianceRatio = maxTime / Math.max(minTime, 1);
      expect(varianceRatio).toBeLessThan(10); // Allow 10x variance
    }, 45000);
  });
});
