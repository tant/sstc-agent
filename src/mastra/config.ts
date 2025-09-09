// Shared constants across the application
export const CONFIG = {
  // Database
  DATABASE_URL: 'file:../mastra.db',
  MEMORY_URL: 'file:../mastra.db',

  // AI Model
  DEFAULT_MODEL: process.env.DEFAULT_MODEL ?? 'gpt-4o-mini',

  // Memory
  DEFAULT_RESOURCE: 'user_default',
  SALES_THREAD: 'sales_thread',

  // OpenAI / AI SDK provider configuration
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? undefined,
} as const;
