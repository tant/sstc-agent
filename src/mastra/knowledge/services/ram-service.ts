// src/mastra/knowledge/services/ram-service.ts
import { Product, ProductWithVariants, Variant } from '../products-data';

// Renamed from RamRecommender to RamService for consistency.
export class RamService {
  private products: { products: { rams: ProductWithVariants[] } };

  constructor(products: any) {
    this.products = products;
  }

  detectRamRequirements(query: string): {
    formFactor?: 'desktop' | 'laptop';
    ddrGen?: 4 | 5;
    quantity?: 1 | 2;
    capacityPerModule?: number;
    useCase?: string;
    speedPriority?: 'highest' | 'high' | 'medium' | 'low';
    budget?: number;
  } {
    console.log('🔍 [RamService] DETECTING RAM REQUIREMENTS for query:', query);

    const result: any = {};
    const q = query.toLowerCase();

    // Detect budget first, as it's a critical filter
    const budgetPatterns = [
      { pattern: /(\d+)\s*tr/i, multiplier: 1000000 },
      { pattern: /dưới\s*(\d+)\s*tr/i, multiplier: 1000000 },
      { pattern: /khoảng\s*(\d+)\s*tr/i, multiplier: 1000000 },
      { pattern: /(\d+)\s*k/i, multiplier: 1000 },
      { pattern: /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:vnd|đồng)/i, multiplier: 1 },
    ];

    for (const { pattern, multiplier } of budgetPatterns) {
      const match = q.match(pattern);
      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ''));
        result.budget = amount * multiplier;
        console.log('💰 DETECTED: Budget =', result.budget);
        break;
      }
    }

    // Detect form factor
    if (q.includes('laptop')) {
      result.formFactor = 'laptop';
    } else if (q.includes('desktop') || q.includes('pc') || q.includes('main')) {
      result.formFactor = 'desktop';
    }

    // Detect DDR generation
    if (q.includes('ddr5')) {
      result.ddrGen = 5;
    } else if (q.includes('ddr4')) {
      result.ddrGen = 4;
    }

    // Detect speed priority
    if (q.includes('bus nhanh nhất') || q.includes('tốc độ cao nhất') || q.includes('nhanh nhất') ||
        q.includes('fastest') || q.includes('highest speed') || q.includes('max speed')) {
      result.speedPriority = 'highest';
    } else if (q.includes('tốc độ cao') || q.includes('nhanh') || q.includes('high speed') ||
               q.includes('gaming') || q.includes('chơi game')) {
      result.speedPriority = 'high';
    } else if (q.includes('văn phòng') || q.includes('office') || q.includes('work')) {
      result.speedPriority = 'medium';
    }

    // Detect quantity
    if (q.includes('hai thanh') || q.includes('2 thanh') || q.includes('hai cái') || q.includes('2 cái')) {
      result.quantity = 2;
    } else if (q.includes('một thanh') || q.includes('1 thanh') || q.includes('một cái') || q.includes('1 cái')) {
      result.quantity = 1;
    }

    // Detect capacity
    const capacityPatterns = [
      /(\d+)\s*gb\s*(?:x\s*\d+|\(\d+\s*thanh\)|\d+\s*thanh)?/i,
      /(\d+)\s*gb/i,
      /ram\s+(\d+)/i
    ];

    for (const pattern of capacityPatterns) {
      const match = q.match(pattern);
      if (match) {
        result.capacityPerModule = parseInt(match[1]);
        break;
      }
    }

    if (q.includes('2 thanh') && q.includes('8gb')) {
      result.quantity = 2;
      result.capacityPerModule = 8;
    }

    // Detect use case
    if (q.includes('gaming') || q.includes('game') || q.includes('chơi game')) {
      result.useCase = 'gaming';
    } else if (q.includes('văn phòng') || q.includes('office') || q.includes('work') || q.includes('làm việc')) {
      result.useCase = 'office';
    } else if (q.includes('sáng tạo') || q.includes('design') || q.includes('creative') || q.includes('đồ họa')) {
      result.useCase = 'creative';
      console.log('🎨 DETECTED: Creative use case');
    }

    console.log('📋 [RamService] FINAL DETECTION RESULT:', result);
    return result;
  }

  getRamRecommendations(
    formFactor?: 'desktop' | 'laptop',
    ddrGen?: 4 | 5,
    quantity?: 1 | 2,
    capacityPerModule?: number,
    useCase?: string,
    speedPriority?: 'highest' | 'high' | 'medium' | 'low',
    budget?: number
  ): Product[] {
    console.log('🎯 [RamService] GETTING RAM RECOMMENDATIONS:', { formFactor, ddrGen, quantity, capacityPerModule, useCase, speedPriority, budget });

    let recommendations: Product[] = [];

    // Start with all RAM variants and flatten them
    const allRamProducts: Product[] = [];
    this.products.products.rams.forEach(ram => {
      ram.variants.forEach(variant => {
        allRamProducts.push({
          sku: variant.sku,
          name: `${ram.name} - ${variant.capacityGB}GB`,
          price: variant.price,
          warranty: ram.warranty,
          description: `${ram.description} - Tốc độ: ${variant.speedMHz || ram.specs?.speedMHz}MHz`,
          tags: [...(ram.tags || []), 'ram', `ddr${ram.name.toLowerCase().includes('ddr5') ? 5 : 4}`],
          specs: { ...ram.specs, ...variant }
        });
      });
    });

    let filteredProducts = allRamProducts;

    // Filter by budget first
    if (budget) {
      filteredProducts = filteredProducts.filter(p => p.price <= budget);
      console.log(`💰 FILTERED by budget <= ${budget}:`, filteredProducts.length, 'products remaining');
    }

    // Filter by form factor
    if (formFactor) {
      filteredProducts = filteredProducts.filter(p => p.tags.includes(formFactor));
      console.log(`🖥️ FILTERED by formFactor = ${formFactor}:`, filteredProducts.length, 'products remaining');
    }

    // Filter by DDR generation
    if (ddrGen) {
      filteredProducts = filteredProducts.filter(p => p.tags.includes(`ddr${ddrGen}`));
      console.log(`🆕 FILTERED by ddrGen = ${ddrGen}:`, filteredProducts.length, 'products remaining');
    }

    // Filter by capacity if specified
    if (capacityPerModule) {
      filteredProducts = filteredProducts.filter(p => p.specs.capacityGB === capacityPerModule);
      console.log(`💾 FILTERED by capacity = ${capacityPerModule}GB:`, filteredProducts.length, 'products remaining');
    }

    // Filter by quantity (modules) if specified
    if (quantity) {
      filteredProducts = filteredProducts.filter(p => p.specs.modules === quantity);
       console.log(`🔢 FILTERED by quantity = ${quantity}:`, filteredProducts.length, 'products remaining');
    }

    recommendations = filteredProducts;

    // Sort by speed if highest priority
    if (speedPriority === 'highest' && recommendations.length > 0) {
      recommendations.sort((a, b) => (b.specs?.speedMHz || 0) - (a.specs?.speedMHz || 0));
      console.log('⚡ SORTED by highest speed');
    } else {
      // Default sort by price (cheapest first)
      recommendations.sort((a, b) => a.price - b.price);
    }

    // If no exact matches, try to find alternatives
    if (recommendations.length === 0 && (capacityPerModule || quantity)) {
      console.log('🔄 NO EXACT MATCHES, GETTING ALTERNATIVES...');
      // Pass all relevant filters to the alternatives function
      const alternatives = this.getRamAlternatives({
        formFactor,
        ddrGen,
        capacityPerModule: capacityPerModule || 8,
        quantity: quantity || 1,
        speedPriority,
      });
      recommendations.push(...alternatives);
      console.log('🔄 ADDED ALTERNATIVES:', alternatives.length, 'items');
    }

    console.log('🎯 FINAL RECOMMENDATIONS:', recommendations.length, 'items');
    return recommendations.slice(0, 5);
  }

  getRamAlternatives(
    { formFactor, ddrGen, capacityPerModule, quantity, speedPriority }: {
      formFactor?: 'desktop' | 'laptop';
      ddrGen?: 4 | 5;
      capacityPerModule: number;
      quantity: number;
      speedPriority?: 'highest' | 'high' | 'medium' | 'low';
    }
  ): Product[] {
    console.log('🔄 [RamService] GETTING ALTERNATIVES with rules:', { formFactor, ddrGen, capacityPerModule, quantity });
    const alternatives: Product[] = [];
    const targetTotalCapacity = capacityPerModule * quantity;

    // 1. Flatten all RAM variants into a single list with all necessary info
    const allRamProducts: Product[] = [];
    this.products.products.rams.forEach(ram => {
      ram.variants.forEach(variant => {
        allRamProducts.push({
          sku: variant.sku,
          name: `${ram.name} - ${variant.capacityGB}GB`,
          price: variant.price,
          warranty: ram.warranty,
          description: `${ram.description} - Tốc độ: ${variant.speedMHz || ram.specs?.speedMHz}MHz`,
          tags: [...(ram.tags || []), 'ram', `ddr${ram.name.toLowerCase().includes('ddr5') ? 5 : 4}`],
          specs: { ...ram.specs, ...variant }
        });
      });
    });

    // Find the speed of the requested product, if it exists, to use as a baseline
    const baseProduct = allRamProducts.find(p =>
      p.specs.capacityGB === capacityPerModule &&
      (!formFactor || p.tags.includes(formFactor)) &&
      (!ddrGen || p.tags.includes(`ddr${ddrGen}`))
    );
    const baseSpeed = baseProduct?.specs.speedMHz || 0;
    console.log(`⚡️ BASE SPEED for alternatives: ${baseSpeed}MHz`);


    // 2. Apply strict filters based on the rules
    let compatibleProducts = allRamProducts.filter(p => {
      const isCompatibleDdr = !ddrGen || p.tags.includes(`ddr${ddrGen}`); // Rule 1
      const isCompatibleFormFactor = !formFactor || p.tags.includes(formFactor); // Rule 2
      const isCompatibleSpeed = (p.specs.speedMHz || 0) >= baseSpeed; // Rule 4
      return isCompatibleDdr && isCompatibleFormFactor && isCompatibleSpeed;
    });

    console.log(`🔍 Found ${compatibleProducts.length} compatible products for alternatives.`);

    // 3. Generate different configurations from the compatible list

    // Suggest lower capacity (cheaper)
    const lowerCapacity = targetTotalCapacity / 2;
    if (lowerCapacity >= 8) {
      const cheaperOption = compatibleProducts.find(p => p.specs.capacityGB === lowerCapacity && p.specs.modules === 1);
      if (cheaperOption) {
        alternatives.push({
          ...cheaperOption,
          name: `(Rẻ hơn) ${cheaperOption.name}`,
          description: `Giải pháp tiết kiệm: Dùng ${lowerCapacity}GB thay vì ${targetTotalCapacity}GB. Phù hợp nếu nhu cầu không quá cao.`,
          tags: [...(cheaperOption.tags || []), 'alternative', 'lower-capacity', 'budget']
        });
      }
    }

    // Suggest higher capacity (future-proof)
    const higherCapacity = targetTotalCapacity * 2;
    if (higherCapacity <= 128) {
        const futureProofOption = compatibleProducts
            .filter(p => p.specs.capacityGB === higherCapacity && p.specs.modules === 1)
            .sort((a, b) => a.price - b.price)[0]; // Get the cheapest one at this capacity
        if (futureProofOption) {
            alternatives.push({
                ...futureProofOption,
                name: `(Nâng cấp) ${futureProofOption.name}`,
                description: `Giải pháp cho tương lai: ${higherCapacity}GB cho hiệu năng thoải mái và đa nhiệm tốt hơn.`,
                tags: [...(futureProofOption.tags || []), 'alternative', 'higher-capacity', 'future-proofing']
            });
        }
    }

    // Suggest different module configuration for the same total capacity (e.g., 2x8GB vs 1x16GB)
    if (targetTotalCapacity >= 16) {
      if (quantity === 1) { // Original is 1 stick, suggest 2 sticks
        const capacityPerStick = targetTotalCapacity / 2;
        const dualChannelOption = compatibleProducts.find(p => p.specs.capacityGB === capacityPerStick && p.specs.modules === 2);
        if (dualChannelOption) {
           alternatives.push({
            ...dualChannelOption,
            name: `(Hiệu năng tốt hơn) ${dualChannelOption.name}`,
            description: `Chạy Dual Channel (2 thanh) để tăng hiệu năng RAM (~10-15%), nhưng sẽ chiếm 2 khe cắm.`,
            tags: [...(dualChannelOption.tags || []), 'alternative', 'dual-channel']
          });
        }
      } else if (quantity === 2) { // Original is 2 sticks, suggest 1 stick
        const singleStickOption = compatibleProducts.find(p => p.specs.capacityGB === targetTotalCapacity && p.specs.modules === 1);
        if (singleStickOption) {
          alternatives.push({
            ...singleStickOption,
            name: `(Dễ nâng cấp) ${singleStickOption.name}`,
            description: `Dùng 1 thanh duy nhất để dễ dàng nâng cấp trong tương lai (còn khe cắm trống).`,
            tags: [...(singleStickOption.tags || []), 'alternative', 'single-channel']
          });
        }
      }
    }

    // Remove duplicates and sort by price
    const uniqueAlternatives = Array.from(new Map(alternatives.map(item => [item.sku, item])).values());
    uniqueAlternatives.sort((a, b) => a.price - b.price);

    return uniqueAlternatives;
  }
}
