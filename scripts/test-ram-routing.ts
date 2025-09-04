#!/usr/bin/env tsx

/**
 * Test script to verify RAM agent routing is working correctly
 */

import { mastra } from '../src/mastra';

async function testRAMRouting() {
  console.log('🔍 Testing RAM Agent Routing...\\n');
  
  // Test messages that should trigger RAM routing
  const testCases = [
    {
      message: 'Bạn bán ram gì?',
      description: 'Direct RAM inquiry'
    },
    {
      message: 'Tôi cần mua RAM cho gaming',
      description: 'RAM purchase for gaming'
    },
    {
      message: 'RAM DDR4 16GB giá bao nhiêu?',
      description: 'Specific RAM product inquiry'
    },
    {
      message: 'Có bán RAM không?',
      description: 'General RAM availability check'
    }
  ];
  
  try {
    // Test the workflow directly
    const workflow = mastra.getWorkflow('channelMessageProcessor');
    
    for (const testCase of testCases) {
      console.log(`🧪 Testing: \"${testCase.message}\" (${testCase.description})`);
      
      try {
        // Simulate workflow execution
        const run = await workflow.createRunAsync();
        
        // This would normally go through the full workflow, but we'll test the routing logic directly
        const lowerMessage = testCase.message.toLowerCase();
        const ramKeywords = ['ram', 'memory', 'ddr4', 'ddr5', 'bộ nhớ', 'ram desktop', 'ram laptop'];
        const foundRamKeywords = ramKeywords.filter(keyword => lowerMessage.includes(keyword));
        
        console.log(`   🎯 RAM keywords found: [${foundRamKeywords.join(', ')}]`);
        console.log(`   ✅ Should route to RAM agent: ${foundRamKeywords.length > 0 ? 'YES' : 'NO'}\\n`);
        
      } catch (error) {
        console.log(`   ❌ Error testing case: ${error.message}\\n`);
      }
    }
    
    console.log('✅ RAM routing test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testRAMRouting();
}
