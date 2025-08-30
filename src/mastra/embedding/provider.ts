
// Embedding provider for Mastra agent
// Uses @ai-sdk/openai for better compatibility with Mastra

import { createOpenAI } from '@ai-sdk/openai';

const EMBEDDER_BASE_URL = process.env.EMBEDDER_BASE_URL || '';
const EMBEDDER_API_KEY = process.env.EMBEDDER_API_KEY || '';
const EMBEDDER_MODEL = process.env.EMBEDDER_MODEL || '';

console.log('[Embedding Provider] baseUrl:', EMBEDDER_BASE_URL);
console.log('[Embedding Provider] model:', EMBEDDER_MODEL);

// Create embedding provider using OpenAI provider with custom base URL
const openai = createOpenAI({
  baseURL: EMBEDDER_BASE_URL,
  apiKey: EMBEDDER_API_KEY,
});

// Export the embedding model
export const embedder = openai.embedding(EMBEDDER_MODEL);
