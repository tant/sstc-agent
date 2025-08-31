#!/usr/bin/env tsx

/**
 * Script to view and analyze test logs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to read and parse JSON files
function readJsonFile(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

// Helper function to format bytes to human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get most recent files
function getRecentFiles(dir: string, count: number = 10): string[] {
  try {
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    const files = fs.readdirSync(dir)
      .filter(file => file.endsWith('.json') || file.endsWith('.log'))
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(dir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)
      .slice(0, count)
      .map(file => file.name);
    
    return files;
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return [];
  }
}

async function viewTestLogs() {
  const logsDir = path.join(__dirname, '..', 'tests', 'logs');
  
  console.log('🔍 SSTC Agent Test Logs Viewer');
  console.log('================================');
  
  if (!fs.existsSync(logsDir)) {
    console.log('No logs directory found. Run tests first to generate logs.');
    process.exit(1);
  }
  
  // Show conversation logs
  const conversationLogsDir = path.join(logsDir, 'conversation-logs');
  if (fs.existsSync(conversationLogsDir)) {
    console.log('\n📁 Conversation Logs:');
    const conversationLogs = getRecentFiles(conversationLogsDir, 10);
    
    conversationLogs.forEach(file => {
      const filePath = path.join(conversationLogsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  📄 ${file} (${formatBytes(stats.size)})`);
    });
    
    if (conversationLogs.length > 0) {
      console.log(`\n📝 To view a specific conversation log:`);
      console.log(`   cat ${path.join('tests', 'logs', 'conversation-logs', conversationLogs[0])}`);
    }
  }
  
  // Show test results
  const testResultsDir = path.join(logsDir, 'test-results');
  if (fs.existsSync(testResultsDir)) {
    console.log('\n📁 Test Results:');
    const testResults = getRecentFiles(testResultsDir, 10);
    
    testResults.forEach(file => {
      const filePath = path.join(testResultsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  📄 ${file} (${formatBytes(stats.size)})`);
    });
    
    if (testResults.length > 0) {
      console.log(`\n📝 To view a specific test result:`);
      console.log(`   cat ${path.join('tests', 'logs', 'test-results', testResults[0])}`);
    }
  }
  
  console.log('\n📊 Quick commands:');
  console.log('  List all conversation logs:  ls -la tests/logs/conversation-logs/');
  console.log('  List all test results:       ls -la tests/logs/test-results/');
  console.log('  View latest conversation:    tail -n 20 tests/logs/conversation-logs/*.json');
  console.log('  View latest test result:     tail tests/logs/test-results/*.json');
  
  // Show summary of recent test runs
  console.log('\n📈 Recent Test Summary:');
  try {
    if (fs.existsSync(testResultsDir)) {
      const testResultFiles = fs.readdirSync(testResultsDir)
        .filter(file => file.includes('-result.json'))
        .sort()
        .slice(-5)
        .map(file => {
          const filePath = path.join(testResultsDir, file);
          return readJsonFile(filePath);
        })
        .filter(result => result !== null);
      
      if (testResultFiles.length > 0) {
        testResultFiles.forEach(result => {
          const status = result.passed ? '✅ PASSED' : '❌ FAILED';
          const duration = result.duration || 'N/A';
          console.log(`  ${status} ${result.testName} (${duration})`);
          if (!result.passed && result.errorMessage) {
            console.log(`    Error: ${result.errorMessage.substring(0, 100)}...`);
          }
        });
      } else {
        console.log('  No recent test results found.');
      }
    } else {
      console.log('  No test results directory found.');
    }
  } catch (error) {
    console.error('  Error reading test results:', error);
  }
  
  console.log('\n📋 Log Analysis Commands:');
  console.log('  View all conversation logs:    find tests/logs/conversation-logs -name "*.json" -exec cat {} \\;');
  console.log('  Search for specific keywords:  grep -r "SSD" tests/logs/conversation-logs/');
  console.log('  Count total conversations:     ls tests/logs/conversation-logs/*.json | wc -l');
  console.log('  View conversation by test:     find tests/logs/conversation-logs -name "*test-name*" -exec cat {} \\;');
}

viewTestLogs();