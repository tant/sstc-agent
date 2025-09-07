import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { salesTool } from '../tools/sales-tool';
import { CONFIG } from '../config';

export const salesAgent = new Agent({
  name: 'Sales Agent',
  instructions: `
    You are a friendly sales assistant. Help customers find products, provide quotes, and explain purchase steps.
    When a product is requested, call the sales-tool to search and build a quote. Be concise and helpful.
  `,
  model: openai(CONFIG.DEFAULT_MODEL),
  tools: { salesTool },
  memory: new Memory({
    storage: new LibSQLStore({ url: CONFIG.MEMORY_URL }),
  }),
});
