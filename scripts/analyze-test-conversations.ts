#!/usr/bin/env tsx

/**
 * Script to analyze and view detailed test conversation logs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



interface TestResult {
  testName: string;
  startTime: string;
  endTime: string;
  duration: string;
  passed: boolean;
  errorMessage?: string;
  summary: {
    totalLogEntries: number;
    totalConversations: number;
  };
  logEntries: any[];
  conversationHistory: any[];
}

async function analyzeTestConversations() {
  const logsDir = path.join(__dirname, '..', 'tests', 'logs');
  const conversationLogsDir = path.join(logsDir, 'conversation-logs');
  const testResultsDir = path.join(logsDir, 'test-results');
  
  console.log('🔍 SSTC Agent Conversation Analyzer');
  console.log('===================================');
  
  if (!fs.existsSync(logsDir)) {
    console.log('No logs directory found. Run tests first to generate logs.');
    process.exit(1);
  }
  
  // Get all conversation log files (both .json and .log files)
  let conversationLogFiles: string[] = [];
  if (fs.existsSync(conversationLogsDir)) {
    conversationLogFiles = fs.readdirSync(conversationLogsDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        // Sort by timestamp in filename (newest first)
        const timeA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z)/)?.[1] || '';
        const timeB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z)/)?.[1] || '';
        return timeB.localeCompare(timeA);
      });
  }
  
  console.log(`\n📊 Found ${conversationLogFiles.length} conversation logs`);
  
  // Show summary of recent conversations
  console.log('\n📋 Recent Conversations Summary:');
  console.log('--------------------------------');
  
  const recentLogs = conversationLogFiles.slice(0, 10);
  for (const file of recentLogs) {
    try {
      const filePath = path.join(conversationLogsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const logData = JSON.parse(content);
      
      // Handle different log formats
      let log: any;
      if (logData.testName && logData.timestamp) {
        // Detailed conversation log format
        log = logData;
      } else if (logData.messages && logData.response) {
        // Simple conversation log format
        log = {
          testName: file.replace(/-\d{4}-\d{2}-\d{2}T.*\.json/, ''),
          timestamp: new Date().toISOString(),
          conversation: {
            input: logData.messages,
            output: logData.response,
            metadata: {
              inputMessageCount: logData.messages?.length || 0,
              outputTextLength: logData.response?.text?.length || 0,
              responseTime: 0,
              hasFiles: logData.response?.files?.length > 0,
              hasToolCalls: logData.response?.toolCalls?.length > 0,
              finishReason: logData.response?.finishReason || 'unknown',
              usage: logData.response?.usage || {}
            }
          }
        };
      } else {
        // Unknown format, skip
        continue;
      }
      
      console.log(`\n📝 ${log.testName}`);
      console.log(`  🕐 ${new Date(log.timestamp).toLocaleString()}`);
      console.log(`  💬 ${log.conversation.metadata.inputMessageCount} messages`);
      console.log(`  📝 ${log.conversation.metadata.outputTextLength} characters in response`);
      if (log.conversation.metadata.responseTime > 0) {
        console.log(`  ⏱️  ${log.conversation.metadata.responseTime}ms response time`);
      }
      console.log(`  📎 Files: ${log.conversation.metadata.hasFiles ? 'Yes' : 'No'}`);
      console.log(`  🛠️  Tool Calls: ${log.conversation.metadata.hasToolCalls ? 'Yes' : 'No'}`);
      console.log(`  🏁 Finish Reason: ${log.conversation.metadata.finishReason}`);
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, (error as Error).message);
    }
  }
  
  // Show detailed view of most recent conversation
  if (conversationLogFiles.length > 0) {
    const latestFile = conversationLogFiles[0];
    console.log(`\n🔍 Detailed View of Latest Conversation: ${latestFile}`);
    console.log('----------------------------------------------------');
    
    try {
      const filePath = path.join(conversationLogsDir, latestFile);
      const content = fs.readFileSync(filePath, 'utf8');
      const logData = JSON.parse(content);
      
      // Handle different log formats
      let log: any;
      if (logData.testName && logData.timestamp) {
        // Detailed conversation log format
        log = logData;
      } else if (logData.messages && logData.response) {
        // Simple conversation log format
        log = {
          testName: latestFile.replace(/-\d{4}-\d{2}-\d{2}T.*\.json/, ''),
          timestamp: new Date().toISOString(),
          conversation: {
            input: logData.messages,
            output: logData.response,
            metadata: {
              inputMessageCount: logData.messages?.length || 0,
              outputTextLength: logData.response?.text?.length || 0,
              responseTime: 0,
              hasFiles: logData.response?.files?.length > 0,
              hasToolCalls: logData.response?.toolCalls?.length > 0,
              finishReason: logData.response?.finishReason || 'unknown',
              usage: logData.response?.usage || {}
            }
          }
        };
      } else {
        throw new Error('Unknown log format');
      }
      
      console.log(`\n🎯 Test: ${log.testName}`);
      console.log(`🕐 Timestamp: ${new Date(log.timestamp).toLocaleString()}`);
      
      console.log('\n💬 Conversation:');
      log.conversation.input.forEach((msg: { role: string; content: string }) => {
        const roleEmoji = msg.role === 'user' ? '👤' : '🤖';
        console.log(`  ${roleEmoji} ${msg.role}: ${msg.content}`);
      });
      
      console.log('\n📝 Agent Response:');
      console.log(`  🤖 Assistant: ${log.conversation.output.text}`);
      
      console.log('\n📊 Metadata:');
      console.log(`  📏 Input Messages: ${log.conversation.metadata.inputMessageCount}`);
      console.log(`  📝 Output Length: ${log.conversation.metadata.outputTextLength} characters`);
      if (log.conversation.metadata.responseTime > 0) {
        console.log(`  ⏱️  Response Time: ${log.conversation.metadata.responseTime}ms`);
      }
      console.log(`  📎 Files: ${log.conversation.metadata.hasFiles ? 'Yes' : 'No'}`);
      console.log(`  🛠️  Tool Calls: ${log.conversation.metadata.hasToolCalls ? 'Yes' : 'No'}`);
      console.log(`  🏁 Finish Reason: ${log.conversation.metadata.finishReason}`);
      
      if (log.conversation.metadata.usage) {
        console.log(`  📊 Usage: ${JSON.stringify(log.conversation.metadata.usage)}`);
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${latestFile}:`, (error as Error).message);
    }
  }
  
  // Show test results summary
  console.log('\n🏁 Test Results Summary:');
  console.log('------------------------');
  
  if (fs.existsSync(testResultsDir)) {
    const testResultFiles = fs.readdirSync(testResultsDir)
      .filter(file => file.includes('-result.json'))
      .sort((a, b) => {
        // Sort by timestamp in filename (newest first)
        const timeA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z)/)?.[1] || '';
        const timeB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z)/)?.[1] || '';
        return timeB.localeCompare(timeA);
      });
    
    const recentResults = testResultFiles.slice(0, 10);
    for (const file of recentResults) {
      try {
        const filePath = path.join(testResultsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const result: TestResult = JSON.parse(content);
        
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`  ${status} ${result.testName} (${result.duration})`);
        
        if (!result.passed && result.errorMessage) {
          console.log(`    ❗ Error: ${result.errorMessage.substring(0, 80)}...`);
        }
      } catch (error) {
        console.error(`❌ Error reading test result ${file}:`, (error as Error).message);
      }
    }
  }
  
  console.log('\n💡 Usage Tips:');
  console.log('  View specific conversation: cat tests/logs/conversation-logs/<filename>');
  console.log('  View specific test result: cat tests/logs/test-results/<filename>');
  console.log('  Search conversations: grep -r "keyword" tests/logs/conversation-logs/');
  console.log('  Export analysis: node scripts/analyze-test-conversations.ts > analysis-report.txt');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
SSTC Agent Conversation Analyzer

Usage:
  pnpm test:analyze    - Analyze all conversation logs
  pnpm test:analyze --help  - Show this help message

Features:
  - Shows summary of recent conversations
  - Displays detailed view of latest conversation
  - Provides test results summary
  - Shows metadata and performance metrics
  `);
  process.exit(0);
}

analyzeTestConversations();