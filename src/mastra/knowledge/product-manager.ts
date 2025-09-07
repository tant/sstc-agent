import { productsData, ProductsData, Product, Variant, Barebone, ProductWithVariants } from './products-data';

// Company policies - moved from sales-knowledge.ts
export const companyPolicies = {
  currency: 'VND',
  taxPercent: 8.5,
  shipping: {
    standard: 50000, // VND
    freeOver: 2000000, // VND
  },
};

export class ProductManager {
  private products: ProductsData | null = null;
  private skuIndex: Map<string, Product> = new Map();
  private variantSkuIndex: Map<string, Variant> = new Map();
  private nameIndex: Map<string, Product[]> = new Map();
  private tagIndex: Map<string, Product[]> = new Map();
  private compatibilityIndex: Map<string, Barebone[]> = new Map();
  private parentProductCache: Map<string, ProductWithVariants> = new Map();

  constructor() {}

  async loadProducts(): Promise<void> {
    try {
      this.products = productsData;
      this.buildIndices();
      this.buildParentProductCache();
    } catch (error) {
      throw new Error(`Failed to load products: ${error}`);
    }
  }

  private buildIndices(): void {
    if (!this.products) return;

    // Helper function to add products to indices
    const addProductsToIndices = (products: Product[]) => {
      products.forEach(product => {
        this.skuIndex.set(product.sku, product);
        this.addToNameIndex(product);
        this.addToTagIndex(product);
      });
    };

    // Build indices for main products
    addProductsToIndices(this.products.products.barebones);
    addProductsToIndices(this.products.products.cpus);

    // Build variant indices for RAM/SSD
    this.products.products.rams.forEach(product => {
      this.addToNameIndex(product);
      this.addToTagIndex(product);
      product.variants?.forEach(variant => {
        this.variantSkuIndex.set(variant.sku, variant);
      });
    });

    this.products.products.ssds.forEach(product => {
      this.addToNameIndex(product);
      this.addToTagIndex(product);
      product.variants?.forEach(variant => {
        this.variantSkuIndex.set(variant.sku, variant);
      });
    });

    // Build compatibility index
    this.products.products.barebones.forEach(barebone => {
      barebone.compatibility.cpu?.forEach(cpuSku => {
        if (!this.compatibilityIndex.has(cpuSku)) {
          this.compatibilityIndex.set(cpuSku, []);
        }
        this.compatibilityIndex.get(cpuSku)!.push(barebone);
      });
    });
  }

  private buildParentProductCache(): void {
    if (!this.products) return;

    // Cache parent products for variants
    [...this.products.products.rams, ...this.products.products.ssds].forEach(product => {
      product.variants?.forEach(variant => {
        this.parentProductCache.set(variant.sku, product);
      });
    });
  }

  private addToNameIndex(product: Product): void {
    const key = product.name.toLowerCase();
    if (!this.nameIndex.has(key)) {
      this.nameIndex.set(key, []);
    }
    this.nameIndex.get(key)!.push(product);
  }

  private addToTagIndex(product: Product): void {
    product.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, []);
      }
      this.tagIndex.get(tag)!.push(product);
    });
  }

  findBySku(sku: string): Product | null {
    return this.skuIndex.get(sku) || null;
  }

  findByVariantSku(variantSku: string): Variant | null {
    return this.variantSkuIndex.get(variantSku) || null;
  }

  // Helper functions for searchByNameOrTag
  private createVariantProduct(variant: Variant, parentProduct: ProductWithVariants | null, type: string): Product {
    return {
      sku: variant.sku,
      name: parentProduct ? `${parentProduct.name} - ${variant.capacityGB}GB` : `${type} ${variant.capacityGB}GB`,
      price: variant.price,
      warranty: parentProduct?.warranty || '1 year',
      description: parentProduct?.description || `${type} ${variant.capacityGB}GB`,
      tags: parentProduct?.tags || []
    };
  }

  private createMoreOptionsProduct(sku: string, name: string, description: string, warranty: string = ''): Product {
    return {
      sku,
      name,
      price: 0,
      warranty,
      description,
      tags: ['info']
    };
  }

  private createDesktopProduct(desktop: any): Product {
    return {
      sku: desktop.sku,
      name: desktop.name,
      price: desktop.totalPrice,
      warranty: '1 year',
      description: desktop.description,
      tags: ['desktop', 'pre-built', ...desktop.useCase.map((u: string) => u.toLowerCase())]
    };
  }

  private getRepresentativeVariants(productType: 'rams' | 'ssds', skus: string[]): Product[] {
    return skus
      .map(sku => this.findByVariantSku(sku))
      .filter(Boolean)
      .map(variant => {
        const parentProduct = this.findParentProductByVariantSku(variant!.sku);
        return this.createVariantProduct(variant!, parentProduct, productType === 'rams' ? 'RAM' : 'SSD');
      });
  }

  private getRepresentativeProducts(productType: 'barebones' | 'cpus', skus: string[]): Product[] {
    const products = productType === 'barebones' ? this.products?.products.barebones : this.products?.products.cpus;
    return skus
      .map(sku => products?.find(p => p.sku === sku))
      .filter(Boolean) as Product[];
  }

  private getRepresentativeDesktops(skus: string[]): Product[] {
    return skus
      .map(sku => this.products?.desktopBuilds.find(d => d.sku === sku))
      .filter(Boolean)
      .map(desktop => this.createDesktopProduct(desktop));
  }

  searchByNameOrTag(query: string): Product[] {
    console.log('🔍 SEARCHING BY NAME/TAG:', query);

    const results = new Set<Product>();
    const q = query.toLowerCase();

    // Define special handling configurations
    const specialHandlers = {
      ram: {
        keywords: ['ram', 'memory'],
        representativeSkus: ['U3200I-C22-8G', 'U5600-C40-8G', 'U3200I-C22-16G'],
        moreOptions: {
          sku: 'more-ram-options',
          name: 'Nhiều tùy chọn RAM khác',
          description: 'Chúng tôi có RAM từ 8GB đến 64GB với nhiều mức giá khác nhau',
          warranty: '1 year'
        },
        type: 'rams' as const
      },
      ssd: {
        keywords: ['ssd', 'storage', 'drive'],
        representativeSkus: ['M110-256Q', 'E130-256T', 'E130-512Q'],
        moreOptions: {
          sku: 'more-ssd-options',
          name: 'Nhiều tùy chọn SSD khác',
          description: 'Chúng tôi có SSD từ 256GB đến 2TB với nhiều công nghệ khác nhau',
          warranty: ''
        },
        type: 'ssds' as const
      },
      barebone: {
        keywords: ['barebone', 'case', 'motherboard'],
        representativeSkus: ['H6312', 'H6512', 'B7312'],
        moreOptions: {
          sku: 'more-barebone-options',
          name: 'Nhiều tùy chọn barebone khác',
          description: 'Chúng tôi có barebone từ 6.5 triệu đến 10 triệu phù hợp với mọi nhu cầu',
          warranty: '1 year'
        },
        type: 'barebones' as const
      },
      cpu: {
        keywords: ['cpu', 'processor', 'intel'],
        representativeSkus: ['12100', '12400', '12700'],
        moreOptions: {
          sku: 'more-cpu-options',
          name: 'Nhiều tùy chọn CPU khác',
          description: 'Chúng tôi có CPU Intel Core i3, i5, i7 với nhiều mức hiệu năng',
          warranty: '1 year'
        },
        type: 'cpus' as const
      },
      desktop: {
        keywords: ['desktop', 'pc', 'computer'],
        representativeSkus: ['PC-H6312-DEFAULT', 'PC-H6512-DEFAULT', 'PC-B7512-GAMING'],
        moreOptions: {
          sku: 'more-desktop-options',
          name: 'Nhiều cấu hình khác',
          description: 'Chúng tôi có nhiều cấu hình từ 8 triệu đến 19 triệu phù hợp với mọi nhu cầu',
          warranty: ''
        },
        type: 'desktops' as const
      }
    };

    // Check for special handling
    for (const [key, config] of Object.entries(specialHandlers)) {
      if (config.keywords.some(keyword => q.includes(keyword))) {
        console.log('🎯 SPECIAL HANDLING TRIGGERED for:', key.toUpperCase());

        let representativeProducts: Product[] = [];

        if (config.type === 'rams' || config.type === 'ssds') {
          console.log('🔄 GETTING VARIANT PRODUCTS for', config.type);
          representativeProducts = this.getRepresentativeVariants(config.type, config.representativeSkus);
        } else if (config.type === 'barebones' || config.type === 'cpus') {
          console.log('🔄 GETTING PRODUCT RECOMMENDATIONS for', config.type);
          representativeProducts = this.getRepresentativeProducts(config.type, config.representativeSkus);
        } else if (config.type === 'desktops') {
          console.log('🔄 GETTING DESKTOP RECOMMENDATIONS');
          representativeProducts = this.getRepresentativeDesktops(config.representativeSkus);
        }

        console.log('📦 REPRESENTATIVE PRODUCTS:', representativeProducts.length, 'items');
        representativeProducts.forEach(product => results.add(product));
        results.add(this.createMoreOptionsProduct(
          config.moreOptions.sku,
          config.moreOptions.name,
          config.moreOptions.description,
          config.moreOptions.warranty
        ));

        console.log('🎯 SPECIAL SEARCH RESULT:', Array.from(results).length, 'items');
        return Array.from(results);
      }
    }

    // General search for other queries
    console.log('📝 GENERAL SEARCH MODE');

    // Search by name
    for (const [name, products] of this.nameIndex) {
      if (name.includes(q)) {
        console.log('📋 NAME MATCH:', name, '→', products.length, 'products');
        products.forEach(p => results.add(p));
      }
    }

    // Search by tag
    for (const [tag, products] of this.tagIndex) {
      if (tag.includes(q)) {
        console.log('🏷️ TAG MATCH:', tag, '→', products.length, 'products');
        products.forEach(p => results.add(p));
      }
    }

    console.log('🎯 GENERAL SEARCH RESULT:', Array.from(results).length, 'items');
    return Array.from(results);
  }

  getCompatibleBarebones(cpuSku: string): Barebone[] {
    return this.compatibilityIndex.get(cpuSku) || [];
  }

  getAllBarebones(): Barebone[] {
    return this.products?.products.barebones || [];
  }

  getAllCpus(): Product[] {
    return this.products?.products.cpus || [];
  }

  getAllRams(): ProductWithVariants[] {
    return this.products?.products.rams || [];
  }

  getAllSsds(): ProductWithVariants[] {
    return this.products?.products.ssds || [];
  }

  buildQuote(items: { sku: string; variantSku?: string; quantity: number }[], policies: { taxPercent: number; shipping: { freeOver: number; standard: number } }): { subtotal: number; tax: number; shipping: number; total: number; currency: string } {
    console.log('💰 BUILDING QUOTE for', items.length, 'items');

    let subtotal = 0;

    items.forEach((item, index) => {
      console.log(`📦 ITEM ${index + 1}:`, item);
      let price = 0;
      if (item.variantSku) {
        const variant = this.findByVariantSku(item.variantSku);
        if (variant) {
          price = variant.price;
          console.log(`✅ VARIANT PRICE: ${variant.sku} = ${price} VND`);
        } else {
          console.log(`❌ VARIANT NOT FOUND: ${item.variantSku}`);
        }
      } else {
        const product = this.findBySku(item.sku);
        if (product) {
          price = product.price;
          console.log(`✅ PRODUCT PRICE: ${product.sku} = ${price} VND`);
        } else {
          console.log(`❌ PRODUCT NOT FOUND: ${item.sku}`);
        }
      }
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;
      console.log(`💵 ITEM TOTAL: ${price} x ${item.quantity} = ${itemTotal} VND`);
    });

    const tax = (subtotal * policies.taxPercent) / 100;
    const shipping = subtotal >= policies.shipping.freeOver ? 0 : policies.shipping.standard;
    const total = subtotal + tax + shipping;

    const quote = {
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      shipping: Math.round(shipping),
      total: Math.round(total),
      currency: 'VND'
    };

    console.log('🧾 QUOTE SUMMARY:', {
      subtotal: quote.subtotal,
      tax: quote.tax,
      shipping: quote.shipping,
      total: quote.total,
      currency: quote.currency
    });

    return quote;
  }

  getDesktopBuildById(id: string): any {
    if (!this.products?.desktopBuilds) return null;
    return this.products.desktopBuilds.find(build => build.sku === id) || null;
  }

  getDesktopBuildsByUseCase(useCase: string): any[] {
    if (!this.products?.desktopBuilds) return [];
    return this.products.desktopBuilds.filter(build =>
      build.useCase.some(uc => uc.toLowerCase().includes(useCase.toLowerCase()))
    );
  }

  getDesktopBuildsByBudget(maxBudget: number): any[] {
    if (!this.products?.desktopBuilds) return [];
    return this.products.desktopBuilds.filter(build => build.totalPrice <= maxBudget);
  }

  findParentProductByVariantSku(variantSku: string): ProductWithVariants | null {
    return this.parentProductCache.get(variantSku) || null;
  }

  findRamBySpecs(capacityGB: number, modules: number): { variant: Variant, parentProduct: ProductWithVariants } | null {
    console.log('🔍 FINDING RAM BY SPECS:', { capacityGB, modules });

    for (const ram of this.products?.products.rams || []) {
      const variant = ram.variants?.find(v => v.capacityGB === capacityGB && v.modules === modules);
      if (variant) {
        console.log('✅ FOUND RAM VARIANT:', {
          ramName: ram.name,
          variantSku: variant.sku,
          capacityGB: variant.capacityGB,
          modules: variant.modules,
          price: variant.price
        });
        return { variant, parentProduct: ram };
      }
    }

    console.log('❌ NO RAM FOUND for specs:', { capacityGB, modules });
    return null;
  }

  findRamByFormFactor(formFactor: 'desktop' | 'laptop', ddrGen?: 4 | 5): ProductWithVariants[] {
    return this.products?.products.rams.filter(ram => {
      const isFormFactorMatch = ram.tags?.some(tag =>
        (formFactor === 'desktop' && tag.includes('desktop')) ||
        (formFactor === 'laptop' && tag.includes('laptop'))
      );

      const isDdrMatch = !ddrGen || ram.name.toLowerCase().includes(`ddr${ddrGen}`);

      return isFormFactorMatch && isDdrMatch;
    }) || [];
  }

  findRamByUseCase(useCase: string): ProductWithVariants[] {
    const speedRecommendations: Record<string, number> = {
      'gaming': 3600,
      'sáng tạo': 3600,
      'heavy': 3600,
      'văn phòng': 3200,
      'basic': 3200
    };

    const minSpeed = speedRecommendations[useCase.toLowerCase()] || 3200;

    return this.products?.products.rams.filter(ram =>
      ram.variants?.some(variant => variant.speedMHz >= minSpeed)
    ) || [];
  }

  getRamRecommendations(formFactor: 'desktop' | 'laptop', ddrGen: 4 | 5, quantity: 1 | 2, capacityPerModule: number, useCase?: string): Product[] {
    console.log('🎯 GETTING RAM RECOMMENDATIONS:', {
      formFactor,
      ddrGen,
      quantity,
      capacityPerModule,
      useCase
    });

    const recommendations: Product[] = [];

    // Find RAMs matching criteria
    const matchingRams = this.products?.products.rams.filter(ram => {
      const isFormFactorMatch = ram.tags?.some(tag =>
        (formFactor === 'desktop' && tag.includes('desktop')) ||
        (formFactor === 'laptop' && tag.includes('laptop'))
      );

      const isDdrMatch = ram.name.toLowerCase().includes(`ddr${ddrGen}`);

      // For single module requests, find exact match
      // For multi-module requests, find the single module and multiply price
      const hasMatchingVariant = ram.variants?.some(variant =>
        variant.capacityGB === capacityPerModule && variant.modules === 1
      );

      return isFormFactorMatch && isDdrMatch && hasMatchingVariant;
    }) || [];

    console.log('🔍 FOUND MATCHING RAMS:', matchingRams.length, 'products');

    // Convert to Product format
    matchingRams.forEach(ram => {
      ram.variants?.forEach(variant => {
        if (variant.capacityGB === capacityPerModule && variant.modules === 1) {
          const product: Product = {
            sku: variant.sku,
            name: `${ram.name} - ${variant.capacityGB}GB${quantity > 1 ? ` (${quantity} thanh)` : ''}`,
            price: variant.price * quantity,
            warranty: ram.warranty,
            description: quantity > 1
              ? `${quantity} thanh RAM ${variant.capacityGB}GB, tổng dung lượng ${variant.capacityGB * quantity}GB`
              : `${ram.description} - Tốc độ: ${variant.speedMHz || ram.specs?.speedMHz}MHz`,
            tags: [...(ram.tags || []), 'ram']
          };

          recommendations.push(product);
          console.log('✅ ADDED RECOMMENDATION:', {
            name: product.name,
            price: product.price,
            description: product.description
          });
        }
      });
    });

    // If no exact matches, add alternatives
    if (recommendations.length === 0) {
      console.log('🔄 NO EXACT MATCHES, GETTING ALTERNATIVES...');
      const alternatives = this.getRamAlternatives(capacityPerModule, quantity);
      recommendations.push(...alternatives);
      console.log('🔄 ADDED ALTERNATIVES:', alternatives.length, 'items');
    }

    console.log('🎯 FINAL RECOMMENDATIONS:', recommendations.length, 'items');
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  getRamAlternatives(targetCapacity: number, targetModules: number): Product[] {
    console.log('🔄 GETTING RAM ALTERNATIVES for:', {
      targetCapacity,
      targetModules
    });

    const alternatives: Product[] = [];

    // If customer wants 2x8GB but doesn't exist, suggest buying 2 individual 8GB modules
    if (targetCapacity === 8 && targetModules === 2) {
      console.log('🎯 ALTERNATIVE: 2x8GB → 2 individual 8GB modules');
      // Look for 8GB single module
      const single8GB = this.findRamBySpecs(8, 1);
      if (single8GB) {
        alternatives.push({
          sku: single8GB.variant.sku,
          name: `${single8GB.parentProduct?.name || 'RAM'} - 8GB (2 thanh)`,
          price: single8GB.variant.price * 2, // Price for 2 modules
          warranty: single8GB.parentProduct?.warranty || '1 year',
          description: `2 thanh RAM 8GB riêng lẻ, tổng dung lượng 16GB`,
          tags: ['ram', 'alternative']
        });
        console.log('✅ FOUND ALTERNATIVE: 2x8GB modules');
      } else {
        console.log('❌ NO 8GB SINGLE MODULE FOUND');
      }
    }

    // If customer wants 1x16GB but doesn't exist, suggest 2x8GB
    if (targetCapacity === 16 && targetModules === 1) {
      console.log('🎯 ALTERNATIVE: 1x16GB → 2x8GB modules');
      // Look for 8GB modules
      const dual8GB = this.findRamBySpecs(8, 1);
      if (dual8GB) {
        alternatives.push({
          sku: dual8GB.variant.sku,
          name: `${dual8GB.parentProduct?.name || 'RAM'} - 8GB (2 thanh)`,
          price: dual8GB.variant.price * 2, // Price for 2 modules
          warranty: dual8GB.parentProduct?.warranty || '1 year',
          description: `Thay thế cho 1 thanh 16GB: 2 thanh 8GB với tổng dung lượng 16GB`,
          tags: ['ram', 'alternative']
        });
        console.log('✅ FOUND ALTERNATIVE: 2x8GB for 16GB total');
      } else {
        console.log('❌ NO 8GB MODULE FOUND FOR ALTERNATIVE');
      }
    }

    console.log('🔄 ALTERNATIVES RESULT:', alternatives.length, 'items');
    return alternatives;
  }

  detectRamRequirements(query: string): {
    formFactor?: 'desktop' | 'laptop';
    ddrGen?: 4 | 5;
    quantity?: 1 | 2;
    capacityPerModule?: number;
    useCase?: string;
  } {
    console.log('🔍 DETECTING RAM REQUIREMENTS for query:', query);

    const result: any = {};
    const q = query.toLowerCase();

    // Detect form factor
    if (q.includes('laptop')) {
      result.formFactor = 'laptop';
      console.log('💻 DETECTED: Laptop form factor');
    } else if (q.includes('desktop') || q.includes('pc') || q.includes('main')) {
      result.formFactor = 'desktop';
      console.log('🖥️ DETECTED: Desktop form factor');
    }

    // Detect DDR generation
    if (q.includes('ddr5')) {
      result.ddrGen = 5;
      console.log('🆕 DETECTED: DDR5 generation');
    } else if (q.includes('ddr4')) {
      result.ddrGen = 4;
      console.log('📊 DETECTED: DDR4 generation');
    }

    // Detect quantity - improved logic
    if (q.includes('hai thanh') || q.includes('2 thanh') || q.includes('hai cái') || q.includes('2 cái')) {
      result.quantity = 2;
      console.log('🔢 DETECTED: Quantity = 2');
    } else if (q.includes('một thanh') || q.includes('1 thanh') || q.includes('một cái') || q.includes('1 cái')) {
      result.quantity = 1;
      console.log('🔢 DETECTED: Quantity = 1');
    }

    // Detect capacity - improved pattern matching
    const capacityPatterns = [
      /(\d+)\s*gb\s*(?:x\s*\d+|\(\d+\s*thanh\)|\d+\s*thanh)?/i,
      /(\d+)\s*gb/i,
      /ram\s+(\d+)/i
    ];

    for (const pattern of capacityPatterns) {
      const match = q.match(pattern);
      if (match) {
        result.capacityPerModule = parseInt(match[1]);
        console.log('💾 DETECTED: Capacity per module =', result.capacityPerModule, 'GB');
        break;
      }
    }

    // Special handling for "2 thanh 8gb" pattern
    if (q.includes('2 thanh') && q.includes('8gb')) {
      result.quantity = 2;
      result.capacityPerModule = 8;
      console.log('🎯 SPECIAL PATTERN: 2 thanh 8GB detected');
    }

    // Detect use case
    if (q.includes('gaming') || q.includes('game') || q.includes('chơi game')) {
      result.useCase = 'gaming';
      console.log('🎮 DETECTED: Gaming use case');
    } else if (q.includes('văn phòng') || q.includes('office') || q.includes('work') || q.includes('làm việc')) {
      result.useCase = 'office';
      console.log('💼 DETECTED: Office use case');
    } else if (q.includes('sáng tạo') || q.includes('design') || q.includes('creative') || q.includes('đồ họa')) {
      result.useCase = 'creative';
      console.log('🎨 DETECTED: Creative use case');
    }

    console.log('📋 FINAL DETECTION RESULT:', result);
    return result;
  }
}

// Export singleton instance
export const productManager = new ProductManager();
