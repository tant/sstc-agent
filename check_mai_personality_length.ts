// Read personality directly from the file without database connection
import fs from 'fs';
import path from 'path';

// Read the file content directly
const maiAgentPath = path.join(process.cwd(), 'src/mastra/agents/mai-agent.ts');
const content = fs.readFileSync(maiAgentPath, 'utf-8');

// Extract the EMBEDDED_PERSONALITY content
const personalityMatch = content.match(/const EMBEDDED_PERSONALITY = `([\s\S]*?)`/);
const personalityText = personalityMatch ? personalityMatch[1] : '';

// Count characters and tokens
const characterCount = personalityText.length;
const tokenEstimate = Math.round(characterCount * 0.25); // Rough token estimate

console.log('🔤 Mai Personality Statistics:');
console.log('='.repeat(50));
console.log(`📏 Character Count: ${characterCount.toLocaleString()}`);
console.log(`🎫 Token Estimate: ${tokenEstimate.toLocaleString()}`);
console.log(`📊 Conversion Rate: ${characterCount} chars ≈ ${tokenEstimate} tokens (0.25 ratio)`);
console.log('');
console.log('📖 Personality Preview (First 200 chars):');
console.log(personalityText.substring(0, 200) + '...');
console.log('');
console.log('🏷️  Verdict:');
if (characterCount <= 3200) {
  console.log('✅ ĐÚNG! Character count under 3200 as estimated');
} else {
  console.log('⚠️  KHÁC BIỆT! Character count differs significantly from estimate');
  console.log(`   Estimated: 3200 chars | Actual: ${characterCount} chars`);
  console.log(`   Difference: ${Math.abs(3200 - characterCount)} chars (${Math.round(Math.abs(3200 - characterCount) / 32)}%)`);
}
