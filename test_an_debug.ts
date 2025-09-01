import { intentAnalyzerTool } from './src/mastra/tools/intent-analyzer.ts';

async function testIntentAnalyzerToolDirectly() {
  console.log('🚀 Testing Intent Analyzer Tool directly...\n');

  try {
    // Test the tool function directly
    console.log('🔧 Testing intent analyzer tool...\n');
    const testContext = {
      message: 'Hôm nay có mưa không?',
      chatHistory: [],
      currentProfile: {},
      language: 'zalo'
    };

    console.log('📤 Input to tool:', testContext);

    if (typeof intentAnalyzerTool.execute !== 'function') {
      console.error('❌ execute function not found on tool!');
      return;
    }

    console.log('✅ Tool has execute function. Calling...');
    const result = await intentAnalyzerTool.execute(testContext);

    console.log('📊 Result:', result);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      code: error.code || 'UNKNOWN',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

testIntentAnalyzerToolDirectly().catch(err => {
  console.error('Test script failed:', err);
});
