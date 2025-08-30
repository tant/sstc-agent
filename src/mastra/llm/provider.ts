/**
 * This file creates the centralized LLM provider.
 * Instead of each agent creating its own provider, they all use this one.
 */
/** biome-ignore-all assist/source/organizeImports: Không quan tâm */

// Import our configuration
import { appConfig } from '../app-config';
// Import the OpenAI provider from Mastra (works with vLLM too!)
import { createOpenAI, type OpenAIProviderSettings } from '@ai-sdk/openai';


/**
 * This function creates an LLM provider with the given configuration.
 * Think of it as a factory that makes LLM providers.
 */
export const createLLMProvider = (config: Partial<typeof appConfig.llm> = {}) => {
  // Merge order: appConfig.llm (default) <- config (override)
  const mergedConfig = {
    ...(appConfig.llm || {}),
    ...config
  };

  // Create and return the OpenAI-compatible provider
  // This works with vLLM because vLLM provides an OpenAI-compatible API
  // Only include apiKey if defined, to match OpenAIProviderSettings type
  // Đảm bảo baseURL luôn là string
  const baseURL = mergedConfig.baseUrl || '';
  const settings: OpenAIProviderSettings = mergedConfig.apiKey
    ? { baseURL, apiKey: mergedConfig.apiKey }
    : { baseURL };
  return createOpenAI(settings);
};

/**
 * This is our default provider instance.
 * All agents will use this unless they need something special.
 */
export const llmProvider = createLLMProvider();

/**
 * This function creates model instances from our provider.
 * For example: llmProviderFactory('gpt-oss-20b')
 */
export const llmProviderFactory = (modelName: string) => {
  return llmProvider(modelName);
};