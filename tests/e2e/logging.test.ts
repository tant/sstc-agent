import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
const conversationLogsDir = path.join(logsDir, 'conversation-logs');
const testResultsDir = path.join(logsDir, 'test-results');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(conversationLogsDir)) {
  fs.mkdirSync(conversationLogsDir, { recursive: true });
}
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

// Enhanced logging function
async function logConversation(
  testName: string,
  messages: { role: string; content: string }[],
  response: any,
  timestamp: string = new Date().toISOString()
) {
  const logEntry = {
    timestamp,
    testName,
    input: messages,
    output: response,
  };

  // Save conversation log
  const logFileName = `${testName}-${timestamp.replace(/[:.]/g, '-')}-conversation.json`;
  const logFilePath = path.join(conversationLogsDir, logFileName);
  
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(logEntry, null, 2));
    console.log(`💾  Conversation log saved to: ${logFilePath}`);
  } catch (error) {
    console.error(`❌  Failed to save conversation log:`, error);
  }

  return logFilePath;
}

// Enhanced test logger with automatic logging
export class EnhancedTestLogger {
  private testName: string;
  private startTime: number;
  private logs: string[] = [];

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = Date.now();
    console.log(`\n🧪  [${this.testName}] Test started at ${new Date(this.startTime).toISOString()}`);
  }

  log(message: string, level: 'INFO' | 'DEBUG' | 'ERROR' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${this.testName}] ${message}`;
    console.log(logEntry);
    this.logs.push(logEntry);
  }

  async logConversation(
    messages: { role: string; content: string }[],
    response: any
  ) {
    const timestamp = new Date().toISOString();
    await logConversation(this.testName, messages, response, timestamp);
    this.log(`Conversation logged with ${messages.length} messages`, 'DEBUG');
  }

  logTestResult(passed: boolean, errorMessage?: string) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const result = {
      testName: this.testName,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${duration}ms`,
      passed,
      errorMessage,
      logs: this.logs
    };

    // Save test result
    const resultFileName = `${this.testName}-result.json`;
    const resultFilePath = path.join(testResultsDir, resultFileName);
    
    try {
      fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));
      console.log(`📊  Test result saved to: ${resultFilePath}`);
    } catch (error) {
      console.error(`❌  Failed to save test result:`, error);
    }

    if (passed) {
      console.log(`✅  [${this.testName}] Test PASSED in ${duration}ms`);
    } else {
      console.log(`❌  [${this.testName}] Test FAILED in ${duration}ms`);
      if (errorMessage) {
        console.log(`   Error: ${errorMessage}`);
      }
    }
  }
}

// Enhanced sendMessage function with logging
export const sendLoggedMessage = async (
  messages: { role: string; content: string }[],
  testName: string,
  logger: EnhancedTestLogger
) => {
  const BASE_URL = 'http://localhost:4111';
  const API_KEY = process.env.MASTRA_API_KEY || 'test-key';
  
  try {
    logger.log(`Sending ${messages.length} messages to agent`, 'INFO');
    logger.log(`Messages: ${JSON.stringify(messages)}`, 'DEBUG');
    
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
    logger.log(`Response text length: ${response.data.text?.length || 0}`, 'DEBUG');
    
    // Log the conversation
    await logger.logConversation(messages, response.data);
    
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

// Example test with logging
describe('Enhanced Logging Test Suite', () => {
  test('should log conversation and save results', async () => {
    const logger = new EnhancedTestLogger('enhanced-logging-example');
    const messages = [
      { role: 'user', content: 'Xin chào, tôi cần tư vấn SSD' }
    ];
    
    try {
      const response = await sendLoggedMessage(messages, 'enhanced-logging-example', logger);
      
      expect(response.text).toContain('SSD');
      expect(response.text).toContain('Mai');
      
      logger.logTestResult(true);
    } catch (error) {
      logger.logTestResult(false, (error as Error).message);
      throw error;
    }
  }, 30000);
});