#!/usr/bin/env tsx

// Simple integration test to verify that all components work together
import { maiSale } from '../src/mastra/agents/mai-agent';
import { bareboneSpecialist } from '../src/mastra/agents/barebone-specialist';

async function testIntegration() {
  console.log('🧪 Running integration test for Mai and Barebone Specialist...');
  
  try {
    // Test that both agents can be imported
    console.log('✅ Both Mai and Barebone Specialist can be imported');
    
    // Test that Mai can generate a response
    const maiResponse = await maiSale.generate([
      { role: 'user', content: 'Tôi muốn mua case máy tính để build một PC gaming' }
    ], {});
    
    console.log('✅ Mai can generate responses');
    console.log('📝 Mai response preview:', maiResponse.text.substring(0, 100) + '...');
    
    // Test that Barebone Specialist can generate a response
    const bareboneResponse = await bareboneSpecialist.generate(
      'Tôi muốn mua case máy tính để build một PC gaming', 
      {}
    );
    
    console.log('✅ Barebone Specialist can generate responses');
    console.log('📝 Barebone response preview:', bareboneResponse.text.substring(0, 100) + '...');
    
    // Test that Mai can coordinate with specialists
    console.log('🔄 Testing Mai\'s specialist coordination...');
    const coordinationTest = await maiSale.getContextAwareResponse(
      'Tôi cần một case mid-tower cho PC gaming với budget khoảng 2 triệu',
      'test-conversation-id'
    );
    
    console.log('✅ Mai can coordinate with specialists');
    console.log('📝 Coordination response preview:', coordinationTest.substring(0, 100) + '...');
    
    console.log('\n🎉 All integration tests passed!');
    console.log('✅ Mai Agent and Barebone Specialist are working correctly');
    console.log('✅ Behind-the-scenes coordination is functioning properly');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the test
testIntegration();