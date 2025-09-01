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

// Advanced logger with detailed conversation tracking
export class AdvancedTestLogger {
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
    metadata: {
      responseTime: number;
      tokensUsed: number;
      finishReason: string;
    };
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

  logConversation(input: { role: string; content: string }[], output: any, metadata?: { 
    responseTime?: number; 
    tokensUsed?: number; 
    finishReason?: string 
  }) {
    const timestamp = new Date().toISOString();
    const conversationEntry = { 
      timestamp, 
      input, 
      output,
      metadata: {
        responseTime: metadata?.responseTime || 0,
        tokensUsed: metadata?.tokensUsed || 0,
        finishReason: metadata?.finishReason || 'unknown'
      }
    };
    this.conversationHistory.push(conversationEntry);
    
    // Save detailed conversation log
    this.saveDetailedConversationLog(conversationEntry);
  }

  private saveLogToFile(logEntry: { timestamp: string; level: string; message: string }) {
    try {
      const logFilename = `${this.testName}.log`;
      const logFilePath = path.join(testResultsDir, logFilename);
      
      const logLine = `[${logEntry.timestamp}] [${logEntry.level}] [${this.testName}] ${logEntry.message}\n`;
      fs.appendFileSync(logFilePath, logLine);
    } catch (_error) {
      // Silent fail to avoid breaking tests
    }
  }

  private saveDetailedConversationLog(conversationEntry: { 
    timestamp: string; 
    input: { role: string; content: string }[]; 
    output: any;
    metadata: {
      responseTime: number;
      tokensUsed: number;
      finishReason: string;
    };
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
          metadata: conversationEntry.metadata
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
  _testName: string,
  logger: AdvancedTestLogger
) => {
  const BASE_URL = 'http://localhost:4111';
  const API_KEY = process.env.MASTRA_API_KEY || 'test-key';
  
  try {
    logger.log(`📤 Sending ${messages.length} messages to agent`, 'INFO');
    logger.log(`📨 Messages: ${JSON.stringify(messages.map(m => m.content))}`, 'DEBUG');
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/api/agents/maiSale/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ messages })
    });
    const endTime = Date.now();
    
    const responseData = await response.json();
    
    logger.log(`📥 Received response in ${response.status} status`, 'INFO');
    logger.log(`📏 Response text length: ${responseData.text?.length || 0} characters`, 'DEBUG');
    logger.log(`⏱️  Response time: ${endTime - startTime}ms`, 'DEBUG');
    
    // Extract metadata from response
    const metadata = {
      responseTime: endTime - startTime,
      tokensUsed: responseData.usage?.totalTokens || 0,
      finishReason: responseData.finishReason || 'unknown'
    };
    
    // Log the conversation with full details
    logger.logConversation(messages, responseData, metadata);
    
    return responseData;
  } catch (error: any) {
    logger.log(`💥 Error sending message: ${error.message}`, 'ERROR');
    if (error.response) {
      logger.log(`📡 Response status: ${error.response.status}`, 'ERROR');
      logger.log(`📦 Response data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    throw error;
  }
};