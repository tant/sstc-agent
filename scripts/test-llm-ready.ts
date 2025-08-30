/**
 * Unified test script: validate env, test agent, test LLM connection
 */
/** biome-ignore-all assist/source/organizeImports: <Không quan tâm> */


import axios from 'axios';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { getChromaVectorFromConfig } from '../src/mastra/app-config';



async function testProviderApi() {
  const baseUrl = process.env.VLLM_BASE_URL || process.env.OPENAI_API_BASE_URL || 'http://localhost:8000/v1';
  const apiKey = process.env.VLLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.GENERATE_MODEL || 'gpt-oss-20b';
  const url = `${baseUrl.replace(/\/$/, '')}/completions`;
  console.log('\n==============================');
  console.log('🤖  [STEP 2] Testing LLM Provider API');
  console.log('------------------------------');
  console.log(`🌐  Base URL: \x1b[36m${baseUrl}\x1b[0m`);
  console.log(`🧠  Model: \x1b[33m${model}\x1b[0m`);
  if (apiKey) {
    console.log('🔑  API Key: \x1b[32mFound\x1b[0m');
  } else {
    console.log('🔑  API Key: \x1b[31mNot found (may not be required)\x1b[0m');
  }
  console.log('==============================\n');
  try {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await axios.post(url, {
      model,
      prompt: 'Say hello from provider test',
      max_tokens: 20
    }, { headers });
    if (res.data?.choices?.[0]?.text) {
  console.log(`✅  Provider API response: "${res.data.choices[0].text.trim()}"`);
      console.log('\x1b[32m🎉  Provider API test PASSED!\x1b[0m\n');
    } else {
      throw new Error('No valid completion in response');
    }
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof (error as { response?: unknown }).response === 'object' &&
      (error as { response?: { data?: unknown } }).response !== null
    ) {
      const errObj = error as { response: { data?: unknown } };
      if ('data' in errObj.response) {
        console.error('\x1b[41m❌  Provider API test FAILED:\x1b[0m', errObj.response.data || error);
      } else {
        console.error('\x1b[41m❌  Provider API test FAILED:\x1b[0m', error);
      }
    } else {
      console.error('\x1b[41m❌  Provider API test FAILED:\x1b[0m', error);
    }
    process.exit(1);
  }
}


async function testEmbedderApi() {
  const baseUrl = process.env.EMBEDDER_BASE_URL;
  const model = process.env.EMBEDDER_MODEL;
  if (!baseUrl) {
    console.log('\x1b[33m⚠️  EMBEDDER_BASE_URL not set, skipping embedder test.\x1b[0m');
    return;
  }
  console.log('\n==============================');
  console.log('🧪  [STEP 3] Testing Embedder API');
  console.log('------------------------------');
  console.log(`🌐  Embedder URL: \x1b[36m${baseUrl}\x1b[0m`);
  if (model) console.log(`🧠  Embedder Model: \x1b[33m${model}\x1b[0m`);
  console.log('==============================\n');
  try {
    const res = await axios.post(baseUrl, {
      input: ["hello from embedder test"],
      model,
    }, { headers: { 'Content-Type': 'application/json' } });
    if (res.data && Array.isArray(res.data.data) && res.data.data[0]?.embedding) {
      console.log(`✅  Embedder API response: embedding length = ${res.data.data[0].embedding.length}`);
      console.log('\x1b[32m🎉  Embedder API test PASSED!\x1b[0m\n');
    } else {
      throw new Error('No valid embedding in response');
    }
  } catch (error) {
    console.error('\x1b[41m❌  Embedder API test FAILED:\x1b[0m', error);
    process.exit(1);
  }
}


async function testChromaDb() {
  console.log('\n==============================');
  console.log('🧪  [STEP 4] Testing ChromaDB (vector store)');
  console.log('------------------------------');
  try {
    const vector = getChromaVectorFromConfig();
    // Tạo index (collection) test nếu chưa có
    const indexName = 'test-chroma-connection';
    await vector.createIndex({ indexName, dimension: 3, metric: 'cosine' });
    // Upsert vector
    await vector.upsert({
      indexName,
      vectors: [[1, 2, 3]],
      ids: ['vec1'],
      documents: ['test document'],
    });
    // Query vector
    const results = await vector.query({
      indexName,
      queryVector: [1, 2, 3],
      topK: 1,
    });
    if (results && results.length > 0 && results[0]?.id) {
      console.log(`✅  ChromaDB query response: id = ${results[0].id}`);
      console.log('\x1b[32m🎉  ChromaDB test PASSED!\x1b[0m\n');
    } else {
      throw new Error('No result from ChromaDB');
    }
  } catch (error) {
    console.error('\x1b[41m❌  ChromaDB test FAILED:\x1b[0m', error);
    process.exit(1);
  }
}


async function main() {
  try {
    console.log('\n==============================');
    console.log('🧪  [STEP 1] Environment Validation');
    console.log('------------------------------');
    // Bước 1: validate env, nếu thiếu thì kiểm tra tiếp trong file .env
    const required = [
      'VLLM_BASE_URL',
      'DATABASE_URL',
      'EMBEDDER_BASE_URL',
      'EMBEDDER_MODEL',
      'CHROMA_HOST',
      'CHROMA_PORT',
      'CHROMA_SSL',
    ];
    let missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      // Đọc file .env nếu tồn tại
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      // Kiểm tra từng biến còn thiếu có được khai báo trong .env không
      missing = missing.filter(key => {
        const regex = new RegExp(`^${key}=`, 'm');
        return !regex.test(envContent);
      });
      if (missing.length > 0) {
        console.error(`\x1b[41m❌  Missing required environment variables (not found in process.env or .env):\x1b[0m`, missing);
        console.log('🔎  Please check your .env file and set the missing variables.');
        process.exit(1);
      }
    }
    console.log('\x1b[32m✅  Environment validation PASSED!\x1b[0m');
    console.log('==============================\n');

    // Bước 2: kiểm tra provider hoạt động bằng cách gọi API completions (OpenAI compatible)
    await testProviderApi();
    await testEmbedderApi();
    await testChromaDb();

    console.log('==============================');
    console.log('\x1b[42m🚀  ALL TESTS COMPLETED SUCCESSFULLY!\x1b[0m');
    console.log('==============================\n');
  } catch (error) {
    console.error('\x1b[41m❌  Unified test FAILED:\x1b[0m', error);
    process.exit(1);
  }
}

main();
