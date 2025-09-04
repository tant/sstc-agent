#!/usr/bin/env tsx

import { mastra } from '../src/mastra';

async function testRAMAgent() {
  console.log('🚀 Testing RAM Specialist Agent...');
  
  try {
    // Get the RAM specialist agent
    const ramAgent = mastra.getAgent('ram');
    
    if (!ramAgent) {
      console.error('❌ RAM agent not found');
      return;
    }
    
    console.log('✅ RAM agent loaded successfully');
    console.log('📝 Agent name:', ramAgent.name);
    console.log('📝 Agent description:', await ramAgent.getDescription());
    
    // Test a simple query
    console.log('\n🔍 Testing with sample query: "Tôi cần mua RAM cho gaming"');
    
    const result = await ramAgent.generate([
      { role: 'user', content: 'Tôi cần mua RAM cho gaming' }
    ]);
    
    console.log('✅ Response received:');
    console.log(result.text);
    
    // Test with tools
    console.log('\n🔧 Testing with RAM database tool...');
    
    const toolResult = await ramAgent.generate([
      { role: 'user', content: 'Tìm RAM DDR4 16GB cho gaming' }
    ], {
      toolChoice: 'auto'
    });
    
    console.log('✅ Tool response received:');
    console.log(toolResult.text);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testRAMAgent();
}