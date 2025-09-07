// src/mastra/knowledge/services/ssd-service.ts
import { Product, ProductWithVariants, Variant } from '../products-data';

export class SsdService {
  private products: { products: { ssds: ProductWithVariants[] } };

  constructor(products: any) {
    this.products = products;
  }

  // Example method: Recommend SSDs based on use case
  recommendSsd(useCase: 'gaming' | 'office' | 'creative' | 'budget'): Product[] {
    console.log(`[SsdService] Recommending SSDs for use case: ${useCase}`);
    let filteredSsds: ProductWithVariants[] = [];

    switch (useCase) {
      case 'gaming':
        // Prioritize NVMe PCIe 4.0 for best gaming performance
        filteredSsds = this.products.products.ssds.filter(ssd => ssd.tags.includes('pcie4'));
        break;
      case 'creative':
        // High-speed NVMe is good for creative work
        filteredSsds = this.products.products.ssds.filter(ssd => ssd.tags.includes('nvme'));
        break;
      case 'office':
        // Reliable SATA or budget NVMe is sufficient
        filteredSsds = this.products.products.ssds.filter(ssd => ssd.tags.includes('sata') || ssd.tags.includes('pcie3'));
        break;
      case 'budget':
      default:
        // SATA SSDs are the most budget-friendly
        filteredSsds = this.products.products.ssds.filter(ssd => ssd.tags.includes('sata'));
        break;
    }

    // Flatten variants into a single product list
    const recommendations: Product[] = [];
    filteredSsds.forEach(ssd => {
      ssd.variants.forEach(variant => {
        recommendations.push({
          sku: variant.sku,
          name: `${ssd.name} - ${variant.capacityGB}GB`,
          price: variant.price,
          warranty: ssd.warranty,
          description: `Dung lượng: ${variant.capacityGB}GB, Tốc độ đọc: ${variant.readSpeedMBs}MB/s, Tốc độ ghi: ${variant.writeSpeedMBs}MB/s`,
          tags: [...ssd.tags, 'ssd']
        });
      });
    });

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }
}
