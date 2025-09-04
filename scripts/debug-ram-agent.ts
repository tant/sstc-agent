#!/usr/bin/env tsx

import { mastra } from '../src/mastra';

async function debugRAMAgent() {
  console.log('🔍 Debugging RAM Agent Issue...');
  
  try {
    // Check if RAM agent is registered
    console.log('\n=== Checking Agent Registration ===');
    const agents = mastra.getAgents();
    console.log('Available agents:', Object.keys(agents));
    
    // Try to get the RAM agent directly
    console.log('\n=== Testing Direct Agent Access ===');
    try {
      const ramAgent = mastra.getAgent('ram');
      console.log('✅ RAM agent found:', ramAgent.name);
      console.log('Agent description:', await ramAgent.getDescription());
    } catch (error) {
      console.log('❌ Error getting RAM agent:', error.message);
    }
    
    // Test intent analyzer
    console.log('\n=== Testing Intent Analyzer ===');
    const testMessages = [
      'Bạn bán ram gì?',
      'Tôi cần mua RAM cho gaming',
      'RAM DDR4 16GB giá bao nhiêu?',
      'Có bán RAM không?'
    ];
    
    for (const message of testMessages) {
      console.log(`\nTesting message: "${message}"`);
      
      // Check if this would trigger RAM routing in workflow
      const lowerMessage = message.toLowerCase();
      const ramKeywords = ['ram', 'memory', 'ddr4', 'ddr5', 'bộ nhớ', 'ram desktop', 'ram laptop'];
      const foundRamKeywords = ramKeywords.filter(keyword => lowerMessage.includes(keyword));
      
      console.log(`  RAM keywords found: [${foundRamKeywords.join(', ')}]`);
      
      // Test intent analyzer directly
      try {
        const analyzerAgent = mastra.getAgent('anDataAnalyst');
        if (analyzerAgent && analyzerAgent.tools && analyzerAgent.tools.intentAnalyzer) {
          const result = await analyzerAgent.tools.intentAnalyzer.execute({
            context: {
              message: message,
              chatHistory: [],
              currentProfile: {},
              language: 'telegram'
            }
          });
          console.log(`  Intent analysis: ${result.intentClassification.primaryIntent} (${result.intentClassification.purchaseConfidence})`);
        }
      } catch (error) {
        console.log('  ❌ Intent analyzer error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
if (import.meta.url === `file://${process.argv[1]}`) {
  debugRAMAgent();
}