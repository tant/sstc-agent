import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { salesTool } from '../tools/sales-tool';
import { CONFIG } from '../config';

const productSchema = z.object({
  sku: z.string(),
  name: z.string(),
  price: z.number(),
  description: z.string(),
  tags: z.array(z.string()),
});

const quoteSchema = z.object({
  subtotal: z.number(),
  tax: z.number(),
  shipping: z.number(),
  total: z.number(),
  currency: z.string(),
});

const searchStep = createStep({
  id: 'sales-search',
  description: 'Search products in catalog',
  inputSchema: z.object({
    query: z.string().optional(),
    sku: z.string().optional(),
    variantSku: z.string().optional(),
    quantity: z.number().optional(),
  }),
  outputSchema: z.object({
    results: z.array(productSchema),
    quote: quoteSchema.optional(),
  }),
  execute: async ({ inputData, mastra }) => {
  const ctx = { ...(inputData || {}), quantity: (inputData as any)?.quantity ?? 1 };
  const res = await salesTool.execute({ context: ctx, runtimeContext: {}, tracingContext: {} } as any);
    return res;
  },
});

const presentStep = createStep({
  id: 'present-offer',
  description: 'Formats a conversational offer/quote for the user',
  inputSchema: z.object({
    results: z.array(productSchema),
    quote: quoteSchema.optional(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('salesAgent');
    if (!agent) throw new Error('salesAgent not registered');

    const prompt = `Create a short friendly sales message based on the following data:\n${JSON.stringify(
      inputData,
      null,
      2,
    )}\nInclude next steps the customer can take to purchase.`;

    const response = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ], {
      memory: {
        resource: CONFIG.DEFAULT_RESOURCE,
        thread: CONFIG.SALES_THREAD,
      },
    });

    let message = '';
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      message += chunk;
    }

    return { message };
  },
});

const salesWorkflow = createWorkflow({
  id: 'sales-workflow',
  inputSchema: z.object({
    query: z.string().optional(),
    sku: z.string().optional(),
    variantSku: z.string().optional(),
    quantity: z.number().optional(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
})
  .then(searchStep)
  .then(presentStep);

salesWorkflow.commit();

export { salesWorkflow };
