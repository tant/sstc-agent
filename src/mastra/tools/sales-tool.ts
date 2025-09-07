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
    // RAM-specific parameters
    ramFormFactor: z.enum(['desktop', 'laptop']).optional(),
    ramDdrGen: z.enum(['4', '5']).optional(),
    ramQuantity: z.number().optional(), // 1 or 2 modules
    ramCapacityPerModule: z.number().optional(), // GB per module
    useCase: z.string().optional(),
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
    const {
      query,
      sku,
      variantSku,
      quantity = 1,
      ramFormFactor,
      ramDdrGen,
      ramQuantity,
      ramCapacityPerModule,
      useCase
    } = context as any;

    let results: any[] = [];
    let quote: any = null;

    // RAM-specific recommendations
    if (ramFormFactor && ramDdrGen && ramQuantity && ramCapacityPerModule) {
      const ddrGen = parseInt(ramDdrGen) as 4 | 5;
      results = productManager.getRamRecommendations(
        ramFormFactor,
        ddrGen,
        ramQuantity,
        ramCapacityPerModule,
        useCase
      );
    } else if (sku) {
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
        // Find the parent product to get full details
        const parentProduct = productManager.findParentProductByVariantSku(variantSku);
        const variantName = parentProduct
          ? `${parentProduct.name} - ${variant.capacityGB}GB`
          : `RAM/SSD Variant ${variant.capacityGB}GB`;

        results = [{
          sku: variant.sku,
          name: variantName,
          price: variant.price,
          description: `Dung lượng: ${variant.capacityGB}GB, Số module: ${variant.modules}`,
          tags: parentProduct?.tags || []
        }];
      }
    } else if (query) {
      // Fuzzy search
      const products = productManager.searchByNameOrTag(query);

      // Special handling for RAM alternatives
      if (query.toLowerCase().includes('ram') || query.toLowerCase().includes('memory')) {
        // Check if customer specified specific requirements
        const capacityMatch = query.match(/(\d+)\s*gb/i);
        const modulesMatch = query.match(/(\d+)\s*thanh/i) || query.match(/hai\s*thanh/i) || query.match(/một\s*thanh/i);

        if (capacityMatch && modulesMatch) {
          const targetCapacity = parseInt(capacityMatch[1]);
          const targetModules = modulesMatch[0].includes('hai') || modulesMatch[0].includes('2') ? 2 : 1;

          // Try to find exact match first
          const exactMatch = productManager.findRamBySpecs(targetCapacity, targetModules);
          if (!exactMatch) {
            // Add alternatives if no exact match
            const alternatives = productManager.getRamAlternatives(targetCapacity, targetModules);
            products.push(...alternatives);
          }
        }

        // If query contains DDR generation, filter by it
        if (query.toLowerCase().includes('ddr4')) {
          const ddr4Rams = productManager.findRamByFormFactor('desktop', 4);
          ddr4Rams.forEach(ram => products.unshift(ram)); // Add to beginning
        } else if (query.toLowerCase().includes('ddr5')) {
          const ddr5Rams = productManager.findRamByFormFactor('desktop', 5);
          ddr5Rams.forEach(ram => products.unshift(ram)); // Add to beginning
        }
      }

      // Smart context detection for RAM
      if (query.toLowerCase().includes('ram') || query.toLowerCase().includes('memory')) {
        const detected = productManager.detectRamRequirements(query);

        // If we have enough info, get smart recommendations
        if (detected.formFactor && detected.ddrGen && detected.quantity && detected.capacityPerModule) {
          results = productManager.getRamRecommendations(
            detected.formFactor,
            detected.ddrGen,
            detected.quantity,
            detected.capacityPerModule,
            detected.useCase
          );
        } else {
          // Fallback to general search
          const searchResults = productManager.searchByNameOrTag(query);
          results = searchResults.slice(0, 10).map(p => ({
            sku: p.sku,
            name: p.name,
            price: p.price,
            description: p.description,
            tags: p.tags
          }));
        }
      }

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
