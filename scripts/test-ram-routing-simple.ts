#!/usr/bin/env tsx

/**
 * Simple test to verify RAM agent routing logic
 */

async function testRAMRoutingLogic() {
  console.log('🔍 Testing RAM Agent Routing Logic...\n');
  
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
    },
    {
      message: 'Tôi muốn hỏi về bộ nhớ DDR5',
      description: 'DDR5 memory inquiry'
    }
  ];
  
  // Test the routing logic directly
  for (const testCase of testCases) {
    console.log(`🧪 Testing: \"${testCase.message}\" (${testCase.description})`);
    
    // Simulate the routing logic from the workflow
    const lowerMessage = testCase.message.toLowerCase();
    const ramKeywords = ['ram', 'memory', 'ddr4', 'ddr5', 'bộ nhớ', 'ram desktop', 'ram laptop'];
    const foundRamKeywords = ramKeywords.filter(keyword => lowerMessage.includes(keyword));
    
    console.log(`   🎯 RAM keywords found: [${foundRamKeywords.join(', ')}]`);
    console.log(`   ✅ Should route to RAM agent: ${foundRamKeywords.length > 0 ? 'YES' : 'NO'}\n`);
  }
  
  console.log('✅ RAM routing logic test completed');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testRAMRoutingLogic();
}