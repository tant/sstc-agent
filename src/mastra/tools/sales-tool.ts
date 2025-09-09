import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { productManager } from '../knowledge/product-manager';
import { companyPolicies } from '../knowledge/policies';

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
    // RAM-specific parameters (accept flexible strings, will normalize)
    ramFormFactor: z.string().optional(),
    ramDdrGen: z.string().optional(),
    ramQuantity: z.number().optional(), // 1 or 2 modules
    ramCapacityPerModule: z.number().optional(), // GB per module
    useCase: z.string().optional(),
    speedPriority: z.string().optional(),
    budget: z.number().optional(),
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
    console.log('🔧 SALES-TOOL EXECUTING:', context);

    const {
      query,
      sku,
      variantSku,
      quantity = 1,
      ramFormFactor,
      ramDdrGen,
      ramQuantity,
      ramCapacityPerModule,
      useCase,
      speedPriority,
      budget
    } = context as any;

    console.log('📋 SALES-TOOL PARAMS:', {
      query,
      sku,
      variantSku,
      quantity,
      ramFormFactor,
      ramDdrGen,
      ramQuantity,
      ramCapacityPerModule,
      useCase,
      speedPriority,
      budget
    });

    // --- Normalize RAM inputs ---
    function normalizeFormFactor(raw?: string): 'desktop' | 'laptop' | undefined {
      if (!raw) return undefined;
      const s = String(raw).toLowerCase();
      if (s.includes('lap') || s.includes('sodimm') || s.includes('so-dimm')) return 'laptop';
      if (s.includes('dim') || s.includes('desktop') || s.includes('pc') || s.includes('main')) return 'desktop';
      return undefined;
    }

    function normalizeDdr(raw?: string): '4' | '5' | undefined {
      if (!raw) return undefined;
      const s = String(raw).toLowerCase();
      if (s.includes('ddr5') || s === '5') return '5';
      if (s.includes('ddr4') || s === '4') return '4';
      const num = parseInt(s, 10);
      if (num === 4 || num === 5) return String(num) as '4' | '5';
      return undefined;
    }

    function normalizeSpeedPriority(raw?: string): 'highest' | 'high' | 'medium' | 'low' | undefined {
      if (!raw) return undefined;
      const s = String(raw).toLowerCase().trim();
      if (!s) return undefined;
      if (s.includes('highest') || s.includes('nhanh nhất') || s.includes('max')) return 'highest';
      if (s.includes('high') || s.includes('nhanh') || s.includes('gaming')) return 'high';
      if (s.includes('medium') || s.includes('văn phòng') || s.includes('office')) return 'medium';
      if (s.includes('low') || s.includes('tiết kiệm') || s.includes('budget')) return 'low';
      return undefined;
    }

    const normalizedRamFormFactor = normalizeFormFactor(ramFormFactor);
    const normalizedRamDdr = normalizeDdr(ramDdrGen);
    const normalizedSpeedPriority = normalizeSpeedPriority(speedPriority);

    console.log('🔧 NORMALIZED RAM PARAMS:', { normalizedRamFormFactor, normalizedRamDdr, normalizedSpeedPriority });

    let results: any[] = [];
    let quote: any = null;

    // RAM-specific recommendations
    if (normalizedRamFormFactor || normalizedRamDdr || ramQuantity || ramCapacityPerModule || budget) {
      console.log('🧠 RAM RECOMMENDATIONS MODE');
      const ddrGen = ramDdrGen ? parseInt(ramDdrGen) as 4 | 5 : undefined;
      const ddrNum = normalizedRamDdr ? (parseInt(normalizedRamDdr) as 4 | 5) : undefined;
      results = productManager.ram!.getRamRecommendations(
        normalizedRamFormFactor,
        ddrNum,
        ramQuantity,
        ramCapacityPerModule,
        useCase,
        normalizedSpeedPriority,
        budget
      );
      console.log('💡 RAM RECOMMENDATIONS RESULTS:', results.length, 'items');
    } else if (sku) {
      console.log('🔍 SKU LOOKUP MODE:', sku);
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
        console.log('✅ SKU FOUND:', product.name);
      } else {
        console.log('❌ SKU NOT FOUND:', sku);
      }
    } else if (variantSku) {
      console.log('🔍 VARIANT SKU LOOKUP MODE:', variantSku);
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
        console.log('✅ VARIANT FOUND:', variantName);
      } else {
        console.log('❌ VARIANT NOT FOUND:', variantSku);
      }
    } else if (query) {
      console.log('🔍 FUZZY SEARCH MODE:', query);

      // Smart context detection for RAM
      if (query.toLowerCase().includes('ram') || query.toLowerCase().includes('memory') || productManager.ram!.detectRamRequirements(query).budget) {
        console.log('🧠 DETECTING RAM REQUIREMENTS...');
        const detected = productManager.ram!.detectRamRequirements(query);
        console.log('🔎 DETECTED REQUIREMENTS:', detected);

        // Get smart recommendations based on whatever was detected
        console.log('🎯 GETTING SMART RAM RECOMMENDATIONS');
        results = productManager.ram!.getRamRecommendations(
          detected.formFactor,
          detected.ddrGen,
          detected.quantity,
          detected.capacityPerModule,
          detected.useCase,
          detected.speedPriority,
          detected.budget
        );
        console.log('💡 SMART RAM RESULTS:', results.length, 'items');
      } else {
        console.log('📝 GENERAL SEARCH');
        // General search
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

    // Build quote if we have results and quantity > 0
    if (results.length > 0 && quantity > 0) {
      console.log('💰 BUILDING QUOTE for', results.length, 'items');
      const items = results.map(r => ({
        sku: r.sku,
        variantSku: variantSku || undefined,
        quantity
      }));
      quote = productManager.buildQuote(items);
      console.log('✅ QUOTE BUILT:', quote);
    } else {
      console.log('❌ NO QUOTE BUILT - no results or quantity = 0');
    }

    console.log('🎯 SALES-TOOL FINAL RESULT:', {
      resultsCount: results.length,
      hasQuote: !!quote,
      totalValue: quote?.total || 0
    });

    return { results, quote };
  },
});
