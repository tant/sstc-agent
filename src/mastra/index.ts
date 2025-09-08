import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { salesWorkflow } from './workflows/sales-workflow';
import { salesAgent } from './agents/sales-agent';
import { CONFIG } from './config';

export const mastra = new Mastra({
  workflows: { salesWorkflow },
  agents: { salesAgent },
  storage: new LibSQLStore({
    url: CONFIG.DATABASE_URL,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug',
  }),
});
