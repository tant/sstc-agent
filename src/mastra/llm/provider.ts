// Import the OpenAI provider factory
import { createOpenAI } from '@ai-sdk/openai';
import { CoreMessage } from 'ai';

// Read LLM config directly from environment variables
const BASE_URL = process.env.VLLM_BASE_URL || process.env.OPENAI_API_BASE_URL || '';
const API_KEY = process.env.VLLM_API_KEY || process.env.OPENAI_API_KEY || '';
const GENERATE_MODEL = process.env.GENERATE_MODEL || 'gpt-oss-20b';

console.log('[LLM Provider] baseUrl:', BASE_URL);
console.log('[LLM Provider] apiKey:', API_KEY);
console.log('[LLM Provider] model:', GENERATE_MODEL);

/**
 * Creates a new OpenAI LLM provider instance with custom base URL.
 * Optionally accepts a model name to override the default.
 */
export function createLLMProvider(modelName?: string) {
  return createOpenAI({
    baseURL: BASE_URL,
    apiKey: API_KEY,
  })(modelName || GENERATE_MODEL);
}

/**
 * Default LLM provider instance (uses GENERATE_MODEL from env)
 */
export const llmProvider = createLLMProvider();

/**
 * Mastra-compatible model provider for Agent: accepts ({ runtimeContext, mastra }) and returns llmProvider
 */
export function mastraModelProvider() {
  return createLLMProvider();
}