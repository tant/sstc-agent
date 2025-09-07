import * as fs from 'fs';
import * as path from 'path';

interface Product {
  sku: string;
  name: string;
  price: number;
  warranty?: string;
  description: string;
  tags: string[];
  [key: string]: any;
}

interface Variant {
  sku: string;
  capacityGB?: number;
  modules?: number;
  price: number;
  [key: string]: any;
}

interface ProductWithVariants extends Product {
  variants?: Variant[];
}

interface Compatibility {
  cpu?: string[];
  ram?: string[];
  ssd?: string[];
}

interface Barebone extends Product {
  compatibility: Compatibility;
}

interface ProductsData {
  products: {
    barebones: Barebone[];
    cpus: Product[];
    rams: ProductWithVariants[];
    ssds: ProductWithVariants[];
    desktopBuilds?: any[];
  };
}

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

  constructor(private jsonPath: string = path.join(__dirname, 'products.json')) {}

  async loadProducts(): Promise<void> {
    try {
      const data = fs.readFileSync(this.jsonPath, 'utf-8');
      this.products = JSON.parse(data);
      this.buildIndices();
    } catch (error) {
      throw new Error(`Failed to load products: ${error}`);
    }
  }

  private buildIndices(): void {
    if (!this.products) return;

    // Build SKU index
    this.products.products.barebones.forEach(product => {
      this.skuIndex.set(product.sku, product);
      this.addToNameIndex(product);
      this.addToTagIndex(product);
    });

    this.products.products.cpus.forEach(product => {
      this.skuIndex.set(product.sku, product);
      this.addToNameIndex(product);
      this.addToTagIndex(product);
    });

    // Build variant SKU index for RAM/SSD
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

    // Build compatibility index (CPU -> Barebones)
    this.products.products.barebones.forEach(barebone => {
      barebone.compatibility.cpu?.forEach(cpuSku => {
        if (!this.compatibilityIndex.has(cpuSku)) {
          this.compatibilityIndex.set(cpuSku, []);
        }
        this.compatibilityIndex.get(cpuSku)!.push(barebone);
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

  searchByNameOrTag(query: string): Product[] {
    const results = new Set<Product>();
    const q = query.toLowerCase();

    // Search by name
    for (const [name, products] of this.nameIndex) {
      if (name.includes(q)) {
        products.forEach(p => results.add(p));
      }
    }

    // Search by tag
    for (const [tag, products] of this.tagIndex) {
      if (tag.includes(q)) {
        products.forEach(p => results.add(p));
      }
    }

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
    let subtotal = 0;

    items.forEach(item => {
      let price = 0;
      if (item.variantSku) {
        const variant = this.findByVariantSku(item.variantSku);
        if (variant) price = variant.price;
      } else {
        const product = this.findBySku(item.sku);
        if (product) price = product.price;
      }
      subtotal += price * item.quantity;
    });

    const tax = (subtotal * policies.taxPercent) / 100;
    const shipping = subtotal >= policies.shipping.freeOver ? 0 : policies.shipping.standard;
    const total = subtotal + tax + shipping;

    return {
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      shipping: Math.round(shipping),
      total: Math.round(total),
      currency: 'VND'
    };
  }
}

// Export singleton instance
export const productManager = new ProductManager();
