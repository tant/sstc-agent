// Shared constants across the application
export const CONFIG = {
  // Database
  DATABASE_URL: 'file:../mastra.db',
  MEMORY_URL: 'file:../mastra.db',

  // AI Model
  DEFAULT_MODEL: 'gpt-4o-mini',

  // Memory
  DEFAULT_RESOURCE: 'user_default',
  SALES_THREAD: 'sales_thread',
} as const;
