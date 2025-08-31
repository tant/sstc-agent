#!/usr/bin/env tsx

/**
 * Script to view test logs
 */

import fs from 'fs';
import path from 'path';

async function viewTestLogs() {
  const logsDir = path.join(__dirname, '..', 'tests', 'logs');
  
  if (!fs.existsSync(logsDir)) {
    console.log('No logs directory found. Run tests first to generate logs.');
    process.exit(1);
  }
  
  console.log('🔍 SSTC Agent Test Logs Viewer');
  console.log('================================');
  
  // Show conversation logs
  const conversationLogsDir = path.join(logsDir, 'conversation-logs');
  if (fs.existsSync(conversationLogsDir)) {
    console.log('\n📁 Conversation Logs:');
    const conversationLogs = fs.readdirSync(conversationLogsDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .slice(-10); // Show last 10 logs
    
    conversationLogs.forEach(file => {
      console.log(`  📄 ${file}`);
    });
    
    if (conversationLogs.length > 0) {
      console.log(`\n📝 To view a specific conversation log:`);
      console.log(`   cat tests/logs/conversation-logs/${conversationLogs[conversationLogs.length - 1]}`);
    }
  }
  
  // Show test results
  const testResultsDir = path.join(logsDir, 'test-results');
  if (fs.existsSync(testResultsDir)) {
    console.log('\n📁 Test Results:');
    const testResults = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.log') || file.endsWith('.json'))
      .sort()
      .slice(-10); // Show last 10 results
    
    testResults.forEach(file => {
      console.log(`  📄 ${file}`);
    });
    
    if (testResults.length > 0) {
      console.log(`\n📝 To view a specific test result:`);
      console.log(`   cat tests/logs/test-results/${testResults[testResults.length - 1]}`);
    }
  }
  
  console.log('\n📊 Quick commands:');
  console.log('  List all conversation logs:  ls -la tests/logs/conversation-logs/');
  console.log('  List all test results:       ls -la tests/logs/test-results/');
  console.log('  View latest conversation:    tail -n 20 tests/logs/conversation-logs/*.json | jq');
  console.log('  View latest test result:     tail tests/logs/test-results/*.log');
}

viewTestLogs();