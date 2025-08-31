import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Create logs directory structure
const logsDir = path.join(__dirname, 'logs');
const testResultsDir = path.join(logsDir, 'test-results');
const conversationLogsDir = path.join(logsDir, 'conversation-logs');

// Ensure directories exist
[logsDir, testResultsDir, conversationLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enhanced Logger class with detailed logging capabilities
export class TestLogger {
  private testName: string;
  private startTime: number;
  private logEntries: Array<{ 
    timestamp: string; 
    level: 'INFO' | 'ERROR' | 'DEBUG' | 'WARN'; 
    message: string 
  }> = [];
  private conversationHistory: Array<{
    timestamp: string;
    input: { role: string; content: string }[];
    output: any;
  }> = [];

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = Date.now();
    this.log(`🔄 Test ${testName} started`, 'INFO');
  }

  log(message: string, level: 'INFO' | 'ERROR' | 'DEBUG' | 'WARN' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.logEntries.push(logEntry);
    
    // Log to console
    console.log(`[${timestamp}] [${level}] [${this.testName}] ${message}`);
    
    // Log to file
    this.saveLogToFile(logEntry);
  }

  private saveLogToFile(logEntry: { timestamp: string; level: string; message: string }) {
    try {
      const logFilename = `${this.testName}.log`;
      const logFilePath = path.join(testResultsDir, logFilename);
      
      const logLine = `[${logEntry.timestamp}] [${logEntry.level}] [${this.testName}] ${logEntry.message}
`;
      fs.appendFileSync(logFilePath, logLine);
    } catch (error) {
      // Silent fail to avoid breaking tests
    }
  }

  logConversation(input: { role: string; content: string }[], output: any) {
    const timestamp = new Date().toISOString();
    const conversationEntry = { timestamp, input, output };
    this.conversationHistory.push(conversationEntry);
    
    // Save detailed conversation log
    this.saveDetailedConversationLog(conversationEntry);
  }

  private saveDetailedConversationLog(conversationEntry: { 
    timestamp: string; 
    input: { role: string; content: string }[]; 
    output: any 
  }) {
    try {
      // Create detailed conversation log with timestamp
      const timestampStr = conversationEntry.timestamp.replace(/[:.]/g, '-');
      const logFilename = `${this.testName}-${timestampStr}-conversation.json`;
      const logFilePath = path.join(conversationLogsDir, logFilename);
      
      const detailedLog = {
        testName: this.testName,
        timestamp: conversationEntry.timestamp,
        conversation: {
          input: conversationEntry.input,
          output: conversationEntry.output,
          metadata: {
            inputMessageCount: conversationEntry.input.length,
            outputTextLength: conversationEntry.output.text?.length || 0,
            responseTime: new Date().getTime() - new Date(conversationEntry.timestamp).getTime(),
            hasFiles: conversationEntry.output.files?.length > 0,
            hasToolCalls: conversationEntry.output.toolCalls?.length > 0,
            finishReason: conversationEntry.output.finishReason,
            usage: conversationEntry.output.usage
          }
        }
      };
      
      fs.writeFileSync(logFilePath, JSON.stringify(detailedLog, null, 2));
      this.log(`📄 Detailed conversation log saved: ${logFilename}`, 'DEBUG');
    } catch (error) {
      this.log(`❌ Failed to save detailed conversation log: ${(error as Error).message}`, 'ERROR');
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
      summary: {
        totalLogEntries: this.logEntries.length,
        totalConversations: this.conversationHistory.length
      },
      logEntries: this.logEntries,
      conversationHistory: this.conversationHistory
    };

    try {
      // Save test result
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const resultFilename = `${this.testName}-result-${timestampStr}.json`;
      const resultFilePath = path.join(testResultsDir, resultFilename);
      fs.writeFileSync(resultFilePath, JSON.stringify(testResult, null, 2));
      this.log(`📊 Test result saved: ${resultFilename}`, 'INFO');
      
      if (passed) {
        this.log(`✅ Test PASSED in ${duration}ms`, 'INFO');
      } else {
        this.log(`❌ Test FAILED in ${duration}ms`, 'ERROR');
        if (errorMessage) {
          this.log(`❗ Error: ${errorMessage}`, 'ERROR');
        }
      }
    } catch (error) {
      this.log(`❌ Failed to save test result: ${(error as Error).message}`, 'ERROR');
    }
  }
}

// Enhanced sendMessage function with comprehensive logging
export const sendLoggedMessage = async (
  messages: { role: string; content: string }[],
  testName: string,
  logger: TestLogger
) => {
  const BASE_URL = 'http://localhost:4111';
  const API_KEY = process.env.MASTRA_API_KEY || 'test-key';
  
  try {
    logger.log(`📤 Sending ${messages.length} messages to agent`, 'INFO');
    logger.log(`📨 Messages content: ${JSON.stringify(messages.map(m => m.content))}`, 'DEBUG');
    
    const startTime = Date.now();
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
    const endTime = Date.now();
    
    logger.log(`📥 Received response in ${endTime - startTime}ms`, 'INFO');
    logger.log(`📏 Response text length: ${response.data.text?.length || 0} characters`, 'DEBUG');
    
    // Log the conversation with full details
    logger.logConversation(messages, response.data);
    
    return response.data;
  } catch (error: any) {
    logger.log(`💥 Error sending message: ${error.message}`, 'ERROR');
    if (error.response) {
      logger.log(`📡 Response status: ${error.response.status}`, 'ERROR');
      logger.log(`📦 Response data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
};