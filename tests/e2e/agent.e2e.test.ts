import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Create logs directory structure
const logsDir = path.join(__dirname, '..', 'logs');
const testResultsDir = path.join(logsDir, 'test-results');
const conversationLogsDir = path.join(logsDir, 'conversation-logs');

// Ensure directories exist
[logsDir, testResultsDir, conversationLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enhanced TestLogger class with conversation logging
export class TestLogger {
  private testName: string;
  private startTime: number;
  private logEntries: Array<{ timestamp: string; level: string; message: string }> = [];
  private conversationHistory: Array<{ input: any[]; output: any }> = [];

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = Date.now();
    this.log(`Test started`, 'INFO');
  }

  log(message: string, level: 'INFO' | 'ERROR' | 'DEBUG' | 'WARN' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.logEntries.push(logEntry);
    console.log(`[${timestamp}] [${level}] [${this.testName}] ${message}`);
  }

  logConversation(input: any[], output: any) {
    const conversationEntry = { 
      timestamp: new Date().toISOString(),
      input, 
      output 
    };
    this.conversationHistory.push(conversationEntry);
    
    // Save to file immediately
    this.saveConversationLog(conversationEntry);
  }

  private saveConversationLog(conversationEntry: { timestamp: string; input: any[]; output: any }) {
    try {
      const logFilename = `${this.testName}-${Date.now()}-conversation.json`;
      const logFilePath = path.join(conversationLogsDir, logFilename);
      
      const conversationData = {
        testName: this.testName,
        ...conversationEntry,
        metadata: {
          inputMessageCount: conversationEntry.input.length,
          outputTextLength: conversationEntry.output.text?.length || 0,
          timestamp: conversationEntry.timestamp
        }
      };
      
      fs.writeFileSync(logFilePath, JSON.stringify(conversationData, null, 2));
      this.log(`Conversation log saved to: ${logFilePath}`, 'DEBUG');
    } catch (error) {
      this.log(`Failed to save conversation log: ${(error as Error).message}`, 'ERROR');
    }
  }

  logTestResult(passed: boolean, errorMessage?: string) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const testResult = {
      testName: this.testName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${duration}ms`,
      passed,
      errorMessage,
      logEntries: this.logEntries,
      conversationHistory: this.conversationHistory
    };

    try {
      const resultFilename = `${this.testName}-result-${Date.now()}.json`;
      const resultFilePath = path.join(testResultsDir, resultFilename);
      fs.writeFileSync(resultFilePath, JSON.stringify(testResult, null, 2));
      this.log(`Test result saved to: ${resultFilePath}`, 'INFO');
      
      if (passed) {
        this.log(`✅ Test PASSED in ${duration}ms`, 'INFO');
      } else {
        this.log(`❌ Test FAILED in ${duration}ms`, 'ERROR');
        if (errorMessage) {
          this.log(`Error: ${errorMessage}`, 'ERROR');
        }
      }
    } catch (error) {
      this.log(`Failed to save test result: ${(error as Error).message}`, 'ERROR');
    }
  }
}

// Enhanced sendMessage function with logging
export const sendLoggedMessage = async (
  messages: { role: string; content: string }[],
  _testName: string,
  logger: TestLogger
) => {
  const BASE_URL = 'http://localhost:4111';
  const API_KEY = process.env.MASTRA_API_KEY || 'test-key';
  
  try {
    logger.log(`Sending ${messages.length} messages to agent`, 'INFO');
    logger.log(`Messages: ${JSON.stringify(messages.map(m => m.content))}`, 'DEBUG');
    
    const response = await axios.post(
      `${BASE_URL}/api/agents/maiSale/generate`,
      { messages },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    logger.log(`Received response in ${response.status} status`, 'INFO');
    logger.log(`Response text length: ${response.data.text?.length || 0} characters`, 'DEBUG');
    
    // Log the conversation
    logger.logConversation(messages, response.data);
    
    return response.data;
  } catch (error: any) {
    logger.log(`Error sending message: ${error.message}`, 'ERROR');
    if (error.response) {
      logger.log(`Response status: ${error.response.status}`, 'ERROR');
      logger.log(`Response data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
};

describe('SSTC Agent End-to-End Tests', () => {
  // Test 1: Basic Conversation Flow
  describe('Basic Conversation Flow', () => {
    test('should respond to greeting with appropriate welcome message', async () => {
      const logger = new TestLogger('basic-greeting');
      const messages = [{ role: 'user', content: 'Xin chào' }];
      const response = await sendLoggedMessage(messages, 'basic-greeting', logger);
      
      expect(response.text).toContain('Mai');
      expect(response.text).toContain('SSTC');
      expect(response.text).toContain('SSD');
      expect(response.text).toContain('Zotac');
      expect(response.text).toContain('mainboard');
      
      logger.logTestResult(true);
    }, 30000);

    test('should respond in English when greeted in English', async () => {
      const logger = new TestLogger('english-greeting');
      const messages = [{ role: 'user', content: 'Hello' }];
      const response = await sendLoggedMessage(messages, 'english-greeting', logger);
      
      expect(response.text).toContain('Mai');
      expect(response.text).toContain('SSTC');
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('graphics');
      
      logger.logTestResult(true);
    }, 30000);
  });

  // Test 2: Product Recommendation
  describe('Product Recommendation', () => {
    test('should provide SSD recommendations for gaming laptop', async () => {
      const logger = new TestLogger('ssd-recommendation');
      const messages = [
        { role: 'user', content: 'Tôi cần mua SSD cho laptop gaming' }
      ];
      const response = await sendLoggedMessage(messages, 'ssd-recommendation', logger);
      
      expect(response.text).toContain('SSD');
      expect(response.text.toLowerCase()).toContain('laptop');
      expect(response.text.toLowerCase()).toContain('gaming');
      // Should ask follow-up questions about usage, budget, etc.
      expect(response.text).toContain('?');
      
      logger.logTestResult(true);
    }, 30000);

    test('should provide GPU recommendations', async () => {
      const logger = new TestLogger('gpu-recommendation');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua card đồ họa Zotac' }
      ];
      const response = await sendLoggedMessage(messages, 'gpu-recommendation', logger);
      
      expect(response.text).toContain('Zotac');
      expect(response.text.toLowerCase()).toContain('gpu');
      expect(response.text.toLowerCase()).toContain('card');
      
      logger.logTestResult(true);
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
      const response = await sendLoggedMessage(messages, 'lang-switch-vi-to-en', logger);
      
      // Response should be in English
      expect(response.text).toMatch(/[A-Za-z]/);
      // Should acknowledge the language switch
      expect(response.text.toLowerCase()).toContain('english');
      
      logger.logTestResult(true);
    }, 30000);

    test('should switch from English to Vietnamese when requested', async () => {
      const logger = new TestLogger('lang-switch-en-to-vi');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'nói tiếng Việt đi' }
      ];
      const response = await sendLoggedMessage(messages, 'lang-switch-en-to-vi', logger);
      
      // Response should contain Vietnamese characters
      expect(response.text).toMatch(/[À-ỹ]/);
      // Should acknowledge the language switch
      expect(response.text).toContain('Việt');
      
      logger.logTestResult(true);
    }, 30000);
  });

  // Test 4: Handling Inappropriate Questions
  describe('Handling Inappropriate Questions', () => {
    test('should redirect personal questions back to products', async () => {
      const logger = new TestLogger('inappropriate-questions');
      const messages = [
        { role: 'user', content: 'Bạn có bạn trai chưa?' }
      ];
      const response = await sendLoggedMessage(messages, 'inappropriate-questions', logger);
      
      // Should not engage with personal question
      expect(response.text.toLowerCase()).not.toContain('bạn trai');
      expect(response.text.toLowerCase()).not.toContain('người yêu');
      // Should redirect to products
      expect(response.text).toContain('SSTC');
      expect(response.text).toContain('SSD');
      expect(response.text).toContain('Zotac');
      
      logger.logTestResult(true);
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
      const response1 = await sendLoggedMessage(messages1, 'multi-turn-context', logger);
      
      // Second message - follow up on previous conversation
      const messages2 = [
        { role: 'user', content: 'Tôi tên là Tan, tôi đang tìm mua SSD' },
        { role: 'assistant', content: response1.text },
        { role: 'user', content: 'Tôi dùng cho laptop chơi game' }
      ];
      const response2 = await sendLoggedMessage(messages2, 'multi-turn-context', logger);
      
      // Agent should remember the customer's name
      expect(response2.text).toContain('Tan');
      expect(response2.text.toLowerCase()).toContain('laptop');
      expect(response2.text.toLowerCase()).toContain('game');
      
      logger.logTestResult(true);
    }, 30000);

    test('should handle difficult customer with complaints', async () => {
      const logger = new TestLogger('difficult-customer');
      const messages = [
        { role: 'user', content: 'Tôi mua SSD của các bạn nhưng chất lượng không tốt' }
      ];
      const response = await sendLoggedMessage(messages, 'difficult-customer', logger);
      
      // Should acknowledge the concern
      expect(response.text.toLowerCase()).toContain('không');
      // Should offer help
      expect(response.text.toLowerCase()).toContain('giúp');
      
      logger.logTestResult(true);
    }, 30000);
  });

  // Test 6: Sales Process
  describe('Sales Process', () => {
    test('should ask relevant questions to understand customer needs', async () => {
      const logger = new TestLogger('sales-process');
      const messages = [
        { role: 'user', content: 'Tôi muốn mua mainboard' }
      ];
      const response = await sendLoggedMessage(messages, 'sales-process', logger);
      
      // Should ask follow-up questions
      expect(response.text).toContain('?');
      // Should mention mainboard
      expect(response.text.toLowerCase()).toContain('mainboard');
      
      logger.logTestResult(true);
    }, 30000);

    test('should provide product comparison when asked', async () => {
      const logger = new TestLogger('product-comparison');
      const messages = [
        { role: 'user', content: 'So sánh SSD Samsung và WD' }
      ];
      const response = await sendLoggedMessage(messages, 'product-comparison', logger);
      
      expect(response.text.toLowerCase()).toContain('samsung');
      expect(response.text.toLowerCase()).toContain('wd');
      
      logger.logTestResult(true);
    }, 30000);
  });

  // Test 7: Technical Support
  describe('Technical Support', () => {
    test('should provide installation guidance', async () => {
      const logger = new TestLogger('technical-support');
      const messages = [
        { role: 'user', content: 'Hướng dẫn lắp SSD vào laptop' }
      ];
      const response = await sendLoggedMessage(messages, 'technical-support', logger);
      
      expect(response.text.toLowerCase()).toContain('lắp');
      expect(response.text.toLowerCase()).toContain('ssd');
      expect(response.text.toLowerCase()).toContain('laptop');
      
      logger.logTestResult(true);
    }, 30000);
  });
});