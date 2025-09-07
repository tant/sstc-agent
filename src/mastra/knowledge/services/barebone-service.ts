// src/mastra/knowledge/services/barebone-service.ts
import { Barebone, CPU } from '../products-data';

export class BareboneService {
  private products: { products: { barebones: Barebone[] } };
  private compatibilityIndex: Map<string, Barebone[]>;

  constructor(products: any) {
    this.products = products;
    this.compatibilityIndex = new Map();
    this.buildCompatibilityIndex();
  }

  private buildCompatibilityIndex(): void {
    this.products.products.barebones.forEach(barebone => {
      if (Array.isArray(barebone.compatibility.cpu)) {
        barebone.compatibility.cpu.forEach(cpuSku => {
          if (!this.compatibilityIndex.has(cpuSku)) {
            this.compatibilityIndex.set(cpuSku, []);
          }
          this.compatibilityIndex.get(cpuSku)?.push(barebone);
        });
      }
    });
  }

  getCompatibleBarebones(cpuSku: string): Barebone[] {
    console.log(`[BareboneService] Getting compatible barebones for CPU: ${cpuSku}`);
    return this.compatibilityIndex.get(cpuSku) || [];
  }

  // Example: Find barebones that support a specific RAM type
  findBarebonesByRam(ramType: 'DDR4' | 'DDR5'): Barebone[] {
    return this.products.products.barebones.filter(b => {
      const ramCompat = b.compatibility.ram;
      if (typeof ramCompat === 'object' && !Array.isArray(ramCompat) && ramCompat.type) {
        return ramCompat.type === ramType;
      }
      return false;
    });
  }
}
