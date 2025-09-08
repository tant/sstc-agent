// src/mastra/knowledge/services/ssd-service.ts
import { Product, ProductWithVariants, Variant } from '../products-data';

export class SsdService {
  private products: { products: { ssds: ProductWithVariants[] } };

  constructor(products: any) {
    this.products = products;
  }

  // Detect SSD requirements from a user query (capacity in GB, format: 'sata' | 'nvme')
  detectSsdRequirements(query: string): { capacityGB?: number; format?: 'sata' | 'nvme'; budget?: number } {
    const q = query.toLowerCase();
    const result: any = {};

    // Detect capacity like '500gb', '1tb' (convert TB to GB)
    const capMatch = q.match(/(\d+(?:\.\d+)?)\s*(tb|gb)/i);
    if (capMatch) {
      const amount = parseFloat(capMatch[1]);
      const unit = capMatch[2].toLowerCase();
      result.capacityGB = unit === 'tb' ? Math.round(amount * 1024) : Math.round(amount);
    }

    // Detect format: m.2, nvme, sata
    if (q.includes('nvme') || q.includes('m.2') || q.includes('m2')) {
      result.format = 'nvme';
    } else if (q.includes('sata')) {
      result.format = 'sata';
    }

    // Detect budget (similar patterns as RamService)
    const budgetMatch = q.match(/(\d+)\s*tr/);
    if (budgetMatch) {
      result.budget = parseInt(budgetMatch[1], 10) * 1000000;
    } else {
      const kMatch = q.match(/(\d+)\s*k/);
      if (kMatch) result.budget = parseInt(kMatch[1], 10) * 1000;
    }

    console.log('[SsdService] detectSsdRequirements ->', result);
    return result;
  }

  // Recommend SSDs with stricter format compatibility: cannot substitute SATA <-> NVMe
  recommendSsd(
    options: { useCase?: 'gaming' | 'office' | 'creative' | 'budget'; capacityGB?: number; format?: 'sata' | 'nvme'; budget?: number } = {}
  ): Product[] {
    const { useCase, capacityGB, format, budget } = options;
    console.log(`[SsdService] Recommending SSDs`, options);

    // If format is provided, only consider that format (SATA and NVMe are not interchangeable)
    let candidates = this.products.products.ssds.filter(ssd => {
      if (format) {
        if (format === 'nvme') return ssd.tags.includes('nvme') || ssd.tags.includes('pcie3') || ssd.tags.includes('pcie4');
        if (format === 'sata') return ssd.tags.includes('sata');
      }
      return true;
    });

    // If useCase specified, further filter
    if (useCase) {
      switch (useCase) {
        case 'gaming':
          candidates = candidates.filter(ssd => ssd.tags.includes('pcie4') || ssd.tags.includes('nvme'));
          break;
        case 'creative':
          candidates = candidates.filter(ssd => ssd.tags.includes('nvme') || ssd.tags.includes('pcie3'));
          break;
        case 'office':
          candidates = candidates.filter(ssd => ssd.tags.includes('sata') || ssd.tags.includes('pcie3'));
          break;
        case 'budget':
        default:
          candidates = candidates.filter(ssd => ssd.tags.includes('sata') || ssd.tags.includes('pcie3'));
          break;
      }
    }

    // Flatten variants and apply capacity/budget filters
    const recommendations: Product[] = [];
    candidates.forEach(ssd => {
      ssd.variants.forEach(variant => {
        // variant.capacityGB should match or be >= requested capacity (prefer exact)
        if (capacityGB && variant.capacityGB < capacityGB) return; // skip smaller than requested
        if (budget && variant.price > budget) return; // skip above budget

        recommendations.push({
          sku: variant.sku,
          name: `${ssd.name} - ${variant.capacityGB}GB`,
          price: variant.price,
          warranty: ssd.warranty,
          description: `Dung lượng: ${variant.capacityGB}GB, Tốc độ đọc: ${variant.readSpeedMBs || 'N/A'}MB/s, Tốc độ ghi: ${variant.writeSpeedMBs || 'N/A'}MB/s`,
          tags: [...ssd.tags, 'ssd'],
          specs: { ...ssd.specs, ...variant }
        });
      });
    });

    // Prefer exact capacity matches first, then cheapest
    recommendations.sort((a, b) => {
      const capA = a.specs?.capacityGB || 0;
      const capB = b.specs?.capacityGB || 0;
      const capScoreA = capacityGB ? Math.abs(capA - capacityGB) : 0;
      const capScoreB = capacityGB ? Math.abs(capB - capacityGB) : 0;
      if (capScoreA !== capScoreB) return capScoreA - capScoreB;
      return a.price - b.price;
    });

    return recommendations.slice(0, 5);
  }
}
