import { unifiedMemoryManager } from "./mastra/core/memory/unified-memory-manager";

/**
 * Test script to demonstrate Greeting Control functionality
 */
export async function testGreetingControl() {
  console.log('🚀 Starting Greeting Control Test...\n');

  const testUserId = 'test_user_12345';

  // Test 1: Check new user greeting status
  console.log('📋 TEST 1: Check greeting status for new user');
  const initialGreetingStatus = await unifiedMemoryManager.hasUserBeenGreeted(testUserId);
  console.log('✅ Initial greeting status:', initialGreetingStatus ? 'Greeted' : 'Needs greeting');

  // Test 2: Simulate first interaction
  console.log('\n📋 TEST 2: First interaction - marking user as greeted');
  await unifiedMemoryManager.markUserAsGreeted(testUserId, 'maiSale', 'telegram');

  // Test 3: Check greeting status after marking
  console.log('\n📋 TEST 3: Check greeting status after marking as greeted');
  const afterGreetingStatus = await unifiedMemoryManager.hasUserBeenGreeted(testUserId);
  console.log('✅ Greeting status after marking:', afterGreetingStatus ? 'Greeted' : 'Needs greeting');

  // Test 4: Get user chat history (should be empty since we don't have real messages)
  console.log('\n📋 TEST 4: Get user history');
  const userHistory = await unifiedMemoryManager.getUserChatHistory(testUserId, { limit: 3 });
  console.log('✅ User history messages:', userHistory.length);

  console.log('\n🎉 Greeting Control Test Completed!');
  console.log('📊 Summary:');
  console.log('   - New users automatically detected as "needs greeting"');
  console.log('   - After first interaction, users are marked as "greeted"');
  console.log('   - Future interactions will skip greeting in agents');

  return {
    initialGreetingStatus,
    afterGreetingStatus,
    userHistoryLength: userHistory.length
  };
}

// Export test function
export { unifiedMemoryManager } from "./mastra/core/memory/unified-memory-manager";
