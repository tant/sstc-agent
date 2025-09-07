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
  } {
    console.log('🔍 [RamService] DETECTING RAM REQUIREMENTS for query:', query);

    const result: any = {};
    const q = query.toLowerCase();

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
    }

    console.log('📋 [RamService] FINAL DETECTION RESULT:', result);
    return result;
  }

  getRamRecommendations(formFactor: 'desktop' | 'laptop', ddrGen: 4 | 5, quantity: 1 | 2, capacityPerModule: number, useCase?: string, speedPriority?: 'highest' | 'high' | 'medium' | 'low'): Product[] {
    console.log('🎯 [RamService] GETTING RAM RECOMMENDATIONS:', { formFactor, ddrGen, quantity, capacityPerModule, useCase, speedPriority });

    const recommendations: Product[] = [];

    let matchingRams = this.products.products.rams.filter(ram => {
      const isFormFactorMatch = ram.tags?.some(tag => (formFactor === 'desktop' && tag.includes('desktop')) || (formFactor === 'laptop' && tag.includes('laptop')));
      const isDdrMatch = ram.name.toLowerCase().includes(`ddr${ddrGen}`);
      const hasMatchingVariant = ram.variants?.some(variant => variant.capacityGB === capacityPerModule && variant.modules === 1);
      return isFormFactorMatch && isDdrMatch && hasMatchingVariant;
    });

    if (speedPriority === 'highest' && matchingRams.length > 0) {
      matchingRams.sort((a, b) => (b.specs?.speedMHz || 0) - (a.specs?.speedMHz || 0));
    }

    matchingRams.forEach(ram => {
      ram.variants?.forEach(variant => {
        if (variant.capacityGB === capacityPerModule && variant.modules === 1) {
          recommendations.push({
            sku: variant.sku,
            name: `${ram.name} - ${variant.capacityGB}GB${quantity > 1 ? ` (${quantity} thanh)` : ''}`,
            price: variant.price * quantity,
            warranty: ram.warranty,
            description: quantity > 1 ? `${quantity} thanh RAM ${variant.capacityGB}GB, tổng dung lượng ${variant.capacityGB * quantity}GB` : `${ram.description} - Tốc độ: ${variant.speedMHz || ram.specs?.speedMHz}MHz`,
            tags: [...(ram.tags || []), 'ram']
          });
        }
      });
    });

    if (recommendations.length === 0) {
      const alternatives = this.getRamAlternatives(capacityPerModule, quantity, ddrGen, speedPriority);
      recommendations.push(...alternatives);
    }

    return recommendations.slice(0, 5);
  }

  getRamAlternatives(targetCapacity: number, targetModules: number, targetDdrGen?: 4 | 5, speedPriority?: 'highest' | 'high' | 'medium' | 'low'): Product[] {
    const alternatives: Product[] = [];
    const targetTotalCapacity = targetCapacity * targetModules;

    const allRamVariants: Array<{ variant: Variant; parentProduct: ProductWithVariants; ddrGen: 4 | 5; pricePerGB: number; speedMHz: number; }> = [];
    this.products.products.rams.forEach(ram => {
      const ddrGen = ram.name.toLowerCase().includes('ddr5') ? 5 : 4;
      const speedMHz = ram.specs?.speedMHz || 3200;
      ram.variants?.forEach(variant => {
        allRamVariants.push({ variant, parentProduct: ram, ddrGen, pricePerGB: variant.price / variant.capacityGB, speedMHz });
      });
    });

    let filteredVariants = allRamVariants;
    if (speedPriority === 'highest') {
      const maxSpeed = Math.max(...allRamVariants.map(v => v.speedMHz));
      filteredVariants = allRamVariants.filter(v => v.speedMHz === maxSpeed);
    }

    this.generateSameCapacityAlternatives(targetTotalCapacity, targetModules, targetDdrGen, filteredVariants, alternatives, speedPriority);
    this.generateLowerCapacityAlternatives(targetTotalCapacity, targetModules, targetDdrGen, filteredVariants, alternatives);
    this.generateHigherCapacityAlternatives(targetTotalCapacity, targetModules, targetDdrGen, filteredVariants, alternatives);
    this.generateDdrAlternatives(targetTotalCapacity, targetModules, targetDdrGen, filteredVariants, alternatives);

    alternatives.sort((a, b) => a.price - b.price);
    return alternatives.slice(0, 5);
  }

  private generateSameCapacityAlternatives(targetTotalCapacity: number, targetModules: number, targetDdrGen: 4 | 5 | undefined, allVariants: Array<{ variant: Variant; parentProduct: ProductWithVariants; ddrGen: 4 | 5; pricePerGB: number; speedMHz: number }>, alternatives: Product[], speedPriority?: 'highest' | 'high' | 'medium' | 'low'): void {
    const possibleConfigs = this.findCapacityConfigurations(targetTotalCapacity, targetDdrGen);
    possibleConfigs.forEach(config => {
      if (config.modules === targetModules) return;
      const variant = allVariants.find(v => v.variant.capacityGB === config.capacityPerModule && v.variant.modules === 1 && v.ddrGen === config.ddrGen);
      if (variant) {
        const totalPrice = variant.variant.price * config.modules;
        const isUpgradeFriendly = this.isUpgradeFriendly(config.modules, targetModules);
        alternatives.push({
          sku: variant.variant.sku,
          name: `${variant.parentProduct.name} - ${config.capacityPerModule}GB (${config.modules} thanh)`,
          price: totalPrice,
          warranty: variant.parentProduct.warranty,
          description: this.generateConfigDescription(config, targetModules, targetTotalCapacity, totalPrice),
          tags: ['ram', 'alternative', 'same-capacity', isUpgradeFriendly ? 'upgrade-friendly' : 'replacement']
        });
      }
    });
  }

  private generateLowerCapacityAlternatives(targetTotalCapacity: number, targetModules: number, targetDdrGen: 4 | 5 | undefined, allVariants: Array<{ variant: Variant; parentProduct: ProductWithVariants; ddrGen: 4 | 5; pricePerGB: number; speedMHz: number }>, alternatives: Product[]): void {
    const lowerCapacities = [Math.floor(targetTotalCapacity * 0.75), Math.floor(targetTotalCapacity * 0.5)].filter(cap => cap >= 8);
    lowerCapacities.forEach(lowerCapacity => {
      const configs = this.findCapacityConfigurations(lowerCapacity, targetDdrGen);
      configs.forEach(config => {
        const variant = allVariants.find(v => v.variant.capacityGB === config.capacityPerModule && v.variant.modules === 1 && v.ddrGen === config.ddrGen);
        if (variant) {
          const totalPrice = variant.variant.price * config.modules;
          const savingsPercent = Math.round(((targetTotalCapacity - lowerCapacity) / targetTotalCapacity) * 100);
          alternatives.push({
            sku: variant.variant.sku,
            name: `${variant.parentProduct.name} - ${config.capacityPerModule}GB (${config.modules} thanh)`,
            price: totalPrice,
            warranty: variant.parentProduct.warranty,
            description: `Tiết kiệm ${savingsPercent}% chi phí: ${lowerCapacity}GB tổng dung lượng thay vì ${targetTotalCapacity}GB`,
            tags: ['ram', 'alternative', 'budget', 'lower-capacity']
          });
        }
      });
    });
  }

  private generateHigherCapacityAlternatives(targetTotalCapacity: number, targetModules: number, targetDdrGen: 4 | 5 | undefined, allVariants: Array<{ variant: Variant; parentProduct: ProductWithVariants; ddrGen: 4 | 5; pricePerGB: number; speedMHz: number }>, alternatives: Product[]): void {
    const higherCapacities = [targetTotalCapacity * 1.5, targetTotalCapacity * 2].filter(cap => cap <= 128);
    higherCapacities.forEach(higherCapacity => {
      const configs = this.findCapacityConfigurations(higherCapacity, targetDdrGen);
      configs.forEach(config => {
        const variant = allVariants.find(v => v.variant.capacityGB === config.capacityPerModule && v.variant.modules === 1 && v.ddrGen === config.ddrGen);
        if (variant) {
          const totalPrice = variant.variant.price * config.modules;
          const priceIncrease = Math.round(((totalPrice / (targetTotalCapacity / (allVariants[0]?.pricePerGB || 1))) - 1) * 100);
          alternatives.push({
            sku: variant.variant.sku,
            name: `${variant.parentProduct.name} - ${config.capacityPerModule}GB (${config.modules} thanh)`,
            price: totalPrice,
            warranty: variant.parentProduct.warranty,
            description: `Future-proofing: ${higherCapacity}GB tổng dung lượng (+${priceIncrease}% chi phí cho hiệu năng lâu dài)`,
            tags: ['ram', 'alternative', 'future-proofing', 'higher-capacity']
          });
        }
      });
    });
  }

  private generateDdrAlternatives(targetTotalCapacity: number, targetModules: number, targetDdrGen: 4 | 5 | undefined, allVariants: Array<{ variant: Variant; parentProduct: ProductWithVariants; ddrGen: 4 | 5; pricePerGB: number; speedMHz: number }>, alternatives: Product[]): void {
    const otherDdrGen = targetDdrGen === 5 ? 4 : 5;
    const configs = this.findCapacityConfigurations(targetTotalCapacity, otherDdrGen);
    configs.forEach(config => {
      const variant = allVariants.find(v => v.variant.capacityGB === config.capacityPerModule && v.variant.modules === 1 && v.ddrGen === config.ddrGen);
      if (variant) {
        const totalPrice = variant.variant.price * config.modules;
        const isCheaper = otherDdrGen === 4 && targetDdrGen === 5;
        const priceDiff = isCheaper ? 'tiết kiệm chi phí' : 'đầu tư cho hiệu năng mới';
        alternatives.push({
          sku: variant.variant.sku,
          name: `${variant.parentProduct.name} - ${config.capacityPerModule}GB (${config.modules} thanh)`,
          price: totalPrice,
          warranty: variant.parentProduct.warranty,
          description: `DDR${otherDdrGen} thay thế: ${priceDiff}, dung lượng tương đương ${targetTotalCapacity}GB`,
          tags: ['ram', 'alternative', 'ddr-alternative', isCheaper ? 'budget' : 'performance']
        });
      }
    });
  }

  private findCapacityConfigurations(totalCapacity: number, preferredDdrGen?: 4 | 5): Array<{ capacityPerModule: number; modules: number; ddrGen: 4 | 5; }> {
    const configs: Array<{ capacityPerModule: number; modules: number; ddrGen: 4 | 5; }> = [];
    const moduleSizes = [8, 16, 32, 64];
    moduleSizes.forEach(moduleSize => {
      if (totalCapacity % moduleSize === 0) {
        const modules = totalCapacity / moduleSize;
        if (preferredDdrGen) {
          configs.push({ capacityPerModule: moduleSize, modules, ddrGen: preferredDdrGen });
        }
        const otherDdr = preferredDdrGen === 5 ? 4 : 5;
        configs.push({ capacityPerModule: moduleSize, modules, ddrGen: otherDdr });
      }
    });
    return configs;
  }

  private isUpgradeFriendly(newModules: number, oldModules: number): boolean {
    return newModules > oldModules;
  }

  private generateConfigDescription(config: { capacityPerModule: number; modules: number; ddrGen: 4 | 5 }, originalModules: number, targetTotalCapacity: number, totalPrice: number): string {
    const descriptions = [];
    descriptions.push(`${config.modules} thanh ${config.capacityPerModule}GB = ${targetTotalCapacity}GB tổng`);
    if (config.modules === 2 && originalModules === 1) {
      descriptions.push('Dual-channel: hiệu năng RAM tăng 10-20%');
    } else if (config.modules === 1 && originalModules === 2) {
      descriptions.push('Single-channel: đơn giản hơn cho upgrade');
    }
    if (config.modules > originalModules) {
      descriptions.push('Linh hoạt nâng cấp: có thể thêm thanh mới mà không cần bỏ thanh cũ');
    } else if (config.modules < originalModules) {
      descriptions.push('Cần thay thế toàn bộ RAM hiện tại');
    }
    return descriptions.join('. ');
  }
}
