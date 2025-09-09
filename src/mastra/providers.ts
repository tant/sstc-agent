import { createOpenAI } from '@ai-sdk/openai';
import { CONFIG } from './config';

export const openaiProvider = createOpenAI({
  baseURL: CONFIG.OPENAI_BASE_URL,
  apiKey: CONFIG.OPENAI_API_KEY,
});
