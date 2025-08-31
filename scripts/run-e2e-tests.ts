#!/usr/bin/env tsx

/**
 * Script to run E2E tests for SSTC Agent
 */

import { spawn } from 'child_process';
import path from 'path';

async function runE2Etests() {
  console.log('🚀 Starting SSTC Agent E2E Tests');
  console.log('=====================================');
  
  // Check if agent is running
  console.log('🔍 Checking if agent is running...');
  
  try {
    const agentCheck = spawn('curl', ['-f', 'http://localhost:4111/api/health'], {
      stdio: 'pipe'
    });
    
    let agentRunning = false;
    
    agentCheck.on('close', (code) => {
      if (code === 0) {
        agentRunning = true;
        console.log('✅ Agent is running');
        runTests();
      } else {
        console.log('❌ Agent is not running');
        console.log('Please start the agent first with: pnpm run dev');
        process.exit(1);
      }
    });
    
    agentCheck.on('error', (error) => {
      console.log('❌ Error checking agent status:', error.message);
      console.log('Please make sure curl is installed and agent is running');
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Error checking agent status:', error);
    process.exit(1);
  }
  
  function runTests() {
    console.log('\n🧪 Running E2E Tests...');
    
    const testProcess = spawn('pnpm', ['test:e2e'], {
      cwd: path.join(__dirname, '..', 'tests'),
      stdio: 'inherit'
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 All tests completed successfully!');
      } else {
        console.log(`\n❌ Tests failed with exit code ${code}`);
        process.exit(code || 1);
      }
    });
    
    testProcess.on('error', (error) => {
      console.error('Error running tests:', error);
      process.exit(1);
    });
  }
}

// Run the function
runE2Etests();
