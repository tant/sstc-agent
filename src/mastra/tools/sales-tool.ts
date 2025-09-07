import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { productManager, companyPolicies } from '../knowledge/product-manager';

// Load products on module load
productManager.loadProducts().catch(console.error);

export const salesTool = createTool({
  id: 'sales-tool',
  description: 'Search product catalog and build price quotes',
  inputSchema: z.object({
    query: z.string().optional(),
    sku: z.string().optional(),
    variantSku: z.string().optional(),
    quantity: z.number().optional().default(1),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        sku: z.string(),
        name: z.string(),
        price: z.number(),
        description: z.string(),
        tags: z.array(z.string()),
      }),
    ),
    quote: z.object({
      subtotal: z.number(),
      tax: z.number(),
      shipping: z.number(),
      total: z.number(),
      currency: z.string(),
    }).optional(),
  }),
  execute: async ({ context }) => {
    const { query, sku, variantSku, quantity = 1 } = context as any;

    let results: any[] = [];
    let quote: any = null;

    if (sku) {
      // Exact SKU lookup
      const product = productManager.findBySku(sku);
      if (product) {
        results = [{
          sku: product.sku,
          name: product.name,
          price: product.price,
          description: product.description,
          tags: product.tags
        }];
      }
    } else if (variantSku) {
      // Variant SKU lookup
      const variant = productManager.findByVariantSku(variantSku);
      if (variant) {
        results = [{
          sku: variant.sku,
          name: `Variant ${variant.sku}`,
          price: variant.price,
          description: `Capacity: ${variant.capacityGB}GB`,
          tags: []
        }];
      }
    } else if (query) {
      // Fuzzy search
      const products = productManager.searchByNameOrTag(query);
      results = products.slice(0, 10).map(p => ({
        sku: p.sku,
        name: p.name,
        price: p.price,
        description: p.description,
        tags: p.tags
      }));
    }

    // Build quote if we have results and quantity > 0
    if (results.length > 0 && quantity > 0) {
      const items = results.map(r => ({
        sku: r.sku,
        variantSku: variantSku || undefined,
        quantity
      }));
      quote = productManager.buildQuote(items, companyPolicies);
    }

    return { results, quote };
  },
});
