import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
const testResultsDir = path.join(logsDir, 'test-results');
const conversationLogsDir = path.join(logsDir, 'conversation-logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}
if (!fs.existsSync(conversationLogsDir)) {
  fs.mkdirSync(conversationLogsDir, { recursive: true });
}

// Logger class to handle test logging
export class TestLogger {
  private testName: string;
  private logFile: string;
  private conversationFile: string;

  constructor(testName: string) {
    this.testName = testName;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(testResultsDir, `${testName}-${timestamp}.log`);
    this.conversationFile = path.join(conversationLogsDir, `${testName}-${timestamp}-conversation.json`);
  }

  log(message: string, level: 'INFO' | 'ERROR' | 'DEBUG' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${this.testName}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
    console.log(logEntry.trim());
  }

  logConversation(messages: any[], response: any) {
    const conversationLog = {
      timestamp: new Date().toISOString(),
      testName: this.testName,
      input: messages,
      output: response
    };
    fs.appendFileSync(this.conversationFile, JSON.stringify(conversationLog, null, 2) + ',\n');
  }

  logTestResult(passed: boolean, errorMessage?: string) {
    const result = {
      testName: this.testName,
      timestamp: new Date().toISOString(),
      passed,
      errorMessage
    };
    const resultFile = path.join(testResultsDir, `${this.testName}-result.json`);
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  }
}

// Enhanced sendMessage function with logging
export const sendMessage = async (
  messages: { role: string; content: string }[],
  testName: string,
  logger: TestLogger
) => {
  const BASE_URL = 'http://localhost:4111';
  const API_KEY = process.env.MASTRA_API_KEY || 'test-key';
  
  try {
    logger.log(`Sending ${messages.length} messages to agent`);
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
    
    logger.log(`Received response in ${response.status} status`);
    logger.log(`Response text length: ${response.data.text?.length || 0}`, 'DEBUG');
    
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

// Utility function to save test conversation history
export const saveTestConversation = (
  testName: string,
  messages: any[],
  response: any
) => {
  const conversation = {
    testName,
    timestamp: new Date().toISOString(),
    messages: [...messages, { role: 'assistant', content: response.text }],
    response
  };
  
  const filename = path.join(
    conversationLogsDir,
    `${testName}-conversation-${new Date().getTime()}.json`
  );
  
  fs.writeFileSync(filename, JSON.stringify(conversation, null, 2));
  return filename;
};

// Utility function to generate test report
export const generateTestReport = (
  testName: string,
  passed: boolean,
  details: any
) => {
  const report = {
    testName,
    timestamp: new Date().toISOString(),
    passed,
    details
  };
  
  const filename = path.join(
    testResultsDir,
    `${testName}-report-${new Date().getTime()}.json`
  );
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  return filename;
};