// Minimal MastraLanguageModel interface for type compatibility
export interface MastraLanguageModel {
  // Add any required methods/properties if needed by Mastra agent
}

/**
 * This file creates the centralized LLM provider.
 * Instead of each agent creating its own provider, they all use this one.
 */
/** biome-ignore-all assist/source/organizeImports: Không quan tâm */

// Import the OpenAI-compatible provider factory
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';



// Read LLM config directly from environment variables
const BASE_URL = process.env.VLLM_BASE_URL || process.env.OPENAI_API_BASE_URL || '';
const API_KEY = process.env.VLLM_API_KEY || process.env.OPENAI_API_KEY || '';
const GENERATE_MODEL = process.env.GENERATE_MODEL || 'gpt-oss-20b';

console.log('[LLM Provider] baseUrl:', BASE_URL);
console.log('[LLM Provider] apiKey:', API_KEY);
console.log('[LLM Provider] model:', GENERATE_MODEL);

/**
 * Creates a new OpenAI-compatible LLM provider instance.
 * Optionally accepts a model name to override the default.
 */
export function createLLMProvider(modelName?: string) {
  return createOpenAICompatible({
    name: modelName || GENERATE_MODEL,
  baseURL: BASE_URL,
    apiKey: API_KEY,
    headers: {},
    queryParams: {},
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
  });
}



/**
 * Default LLM provider instance (uses GENERATE_MODEL from env)
 */
export const llmProvider = createLLMProvider();

/**
 * Mastra-compatible model provider for Agent: accepts ({ runtimeContext, mastra }) and returns llmProvider
 */
// Use more permissive parameter types to match Mastra's DynamicArgument signature
export function mastraModelProvider({ runtimeContext, mastra }: { runtimeContext: unknown; mastra?: unknown }): MastraLanguageModel | Promise<MastraLanguageModel> {
  return createLLMProvider() as unknown as MastraLanguageModel;
}