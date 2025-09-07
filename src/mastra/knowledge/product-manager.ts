import { productsData, ProductsData, Product, Variant, Barebone, ProductWithVariants } from './products-data';
import { RamService } from './services/ram-service';
import { SsdService } from './services/ssd-service';
import { CpuService } from './services/cpu-service';
import { BareboneService } from './services/barebone-service';
import { companyPolicies } from './policies';

// Company policies - moved from sales-knowledge.ts
export const policies = {
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
  private parentProductCache: Map<string, ProductWithVariants> = new Map();

  // Services for different product types
  public ram: RamService | null = null;
  public ssd: SsdService | null = null;
  public cpu: CpuService | null = null;
  public barebone: BareboneService | null = null;

  constructor() {}

  async loadProducts(): Promise<void> {
    try {
      this.products = productsData;
      this.buildIndices();
      this.buildParentProductCache();

      // Initialize services
      this.ram = new RamService(this.products);
      this.ssd = new SsdService(this.products);
      this.cpu = new CpuService(this.products);
      this.barebone = new BareboneService(this.products);

    } catch (error) {
      throw new Error(`Failed to load products: ${error}`);
    }
  }

  private buildIndices(): void {
    if (!this.products) return;

    const allProducts = [
      ...this.products.products.barebones,
      ...this.products.products.cpus,
      ...this.products.products.rams,
      ...this.products.products.ssds,
    ];

    allProducts.forEach(product => {
      this.skuIndex.set(product.sku, product);
      this.addToNameIndex(product);
      this.addToTagIndex(product);

      if ('variants' in product) {
        (product as ProductWithVariants).variants.forEach(variant => {
          this.variantSkuIndex.set(variant.sku, variant);
        });
      }
    });
  }

  private buildParentProductCache(): void {
    if (!this.products) return;
    [...this.products.products.rams, ...this.products.products.ssds].forEach(product => {
      product.variants.forEach(variant => {
        this.parentProductCache.set(variant.sku, product);
      });
    });
  }

  findBySku(sku: string): Product | null {
    return this.skuIndex.get(sku) || null;
  }

  findByVariantSku(variantSku: string): Variant | null {
    return this.variantSkuIndex.get(variantSku) || null;
  }

  findParentProductByVariantSku(variantSku: string): ProductWithVariants | null {
    return this.parentProductCache.get(variantSku) || null;
  }

  searchByNameOrTag(query: string): Product[] {
    const lowerCaseQuery = query.toLowerCase();
    const results = new Set<Product>();

    this.nameIndex.forEach((products, name) => {
      if (name.includes(lowerCaseQuery)) {
        products.forEach(p => results.add(p));
      }
    });

    this.tagIndex.forEach((products, tag) => {
      if (tag.includes(lowerCaseQuery)) {
        products.forEach(p => results.add(p));
      }
    });

    return Array.from(results);
  }

  private addToNameIndex(product: Product): void {
    const name = product.name.toLowerCase();
    if (!this.nameIndex.has(name)) {
      this.nameIndex.set(name, []);
    }
    this.nameIndex.get(name)?.push(product);
  }

  private addToTagIndex(product: Product): void {
    product.tags?.forEach(tag => {
      const lowerCaseTag = tag.toLowerCase();
      if (!this.tagIndex.has(lowerCaseTag)) {
        this.tagIndex.set(lowerCaseTag, []);
      }
      this.tagIndex.get(lowerCaseTag)?.push(product);
    });
  }

  buildQuote(items: { sku: string; variantSku?: string; quantity: number }[]): { subtotal: number; tax: number; shipping: number; total: number; currency: string } {
    console.log('💰 BUILDING QUOTE for', items.length, 'items');

    let subtotal = 0;

    items.forEach((item, index) => {
      console.log(`📦 ITEM ${index + 1}:`, item);
      let price = 0;
      if (item.variantSku) {
        const variant = this.findByVariantSku(item.variantSku);
        if (variant) {
          price = variant.price;
        }
      } else {
        const product = this.findBySku(item.sku);
        if (product) {
          price = product.price;
        }
      }
      subtotal += price * item.quantity;
    });

    const tax = (subtotal * companyPolicies.taxPercent) / 100;
    const shipping = subtotal >= companyPolicies.shipping.freeOver ? 0 : companyPolicies.shipping.standard;
    const total = subtotal + tax + shipping;

    const quote = {
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      shipping: Math.round(shipping),
      total: Math.round(total),
      currency: companyPolicies.currency
    };

    console.log('🧾 QUOTE SUMMARY:', quote);
    return quote;
  }
}

// Export singleton instance
export const productManager = new ProductManager();
