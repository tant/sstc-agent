import { bareboneDatabaseTool } from "../tools/barebone-database-tool";

// Interface for a single barebone product's detailed information
export interface BareboneProductInfo {
  sku: string;
  name: string;
  caseSize: string;
  motherboardFormFactor: string;
  supportedSockets: string[];
  ramSupport: "DDR4" | "DDR5";
  maxRamCapacity: number;
  ramSlots: number;
  coolingSupport: string;
  aesthetics: string;
  price: number;
  compatibility: string[];
  useCases: string[];
  stockStatus: string;
  description?: string;
}

// Interface for search criteria
export interface SearchCriteria {
  query?: string;
  budget?: { min?: number; max?: number };
  caseSize?: string;
  motherboardFormFactor?: string;
  supportedSocket?: string;
  ramSupport?: "DDR4" | "DDR5";
  maxRamCapacity?: number;
  coolingType?: string;
  aestheticsStyle?: string;
}

// Interface for compatibility results
export interface CompatibilityResult {
  isCompatible: boolean;
  compatibleCases: string[];
  issues: string[];
  recommendations: string[];
}

export class BareboneKnowledgeBase {
  private products: BareboneProductInfo[] = [];
  private isInitialized: boolean = false;

  constructor() {
    console.log("📚 [BareboneKnowledgeBase] Initializing...");
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("📚 [BareboneKnowledgeBase] Already initialized.");
      return;
    }

    console.log("📚 [BareboneKnowledgeBase] Loading all barebone products...");
    try {
      // Use the bareboneDatabaseTool to fetch all products
      const toolResult = await bareboneDatabaseTool.execute({
        context: { query: "barebone", budget: { max: 999999999 } } as any,
        mastra: null, // Mastra instance is not available here, tool needs to be independent or mocked
      });

      if (toolResult.specialistData?.recommendations) {
        this.products = toolResult.specialistData.recommendations.map(
          (rec) => ({
            sku: rec.productId,
            name: rec.productName,
            caseSize: rec.specifications.caseSize,
            motherboardFormFactor: rec.specifications.motherboardFormFactor,
            supportedSockets: [rec.specifications.supportedSocket],
            ramSupport: rec.specifications.ramSupport,
            maxRamCapacity: rec.specifications.maxRamCapacity,
            ramSlots: rec.specifications.ramSlots,
            coolingSupport: rec.specifications.coolingSystem,
            aesthetics: rec.specifications.aesthetics,
            price: rec.price,
            compatibility: [], // Tool output doesn't provide this directly, needs mapping
            useCases: rec.useCases || [],
            stockStatus: rec.availability,
            description: rec.description,
          }),
        );
        this.isInitialized = true;
        console.log(
          `✅ [BareboneKnowledgeBase] Loaded ${this.products.length} barebone products.`,
        );
      } else {
        console.warn(
          "⚠️ [BareboneKnowledgeBase] No barebone products found during initialization.",
        );
      }
    } catch (error) {
      console.error("❌ [BareboneKnowledgeBase] Failed to initialize:", error);
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getStatistics(): {
    totalProducts: number;
    caseSizes: string[];
    formFactors: string[];
    avgPrice: number;
    brands: string[];
  } {
    if (!this.isReady()) {
      return {
        totalProducts: 0,
        caseSizes: [],
        formFactors: [],
        avgPrice: 0,
        brands: [],
      };
    }

    const caseSizes = [...new Set(this.products.map((p) => p.caseSize))];
    const formFactors = [
      ...new Set(this.products.map((p) => p.motherboardFormFactor)),
    ];
    const avgPrice =
      this.products.reduce((sum, p) => sum + p.price, 0) /
      this.products.length;
    const brands = [
      ...new Set(this.products.map((p) => p.name.split(" ")[0])),
    ];

    return {
      totalProducts: this.products.length,
      caseSizes,
      formFactors,
      avgPrice,
      brands,
    };
  }

  // Search for barebone systems based on criteria
  searchBarebones(criteria: SearchCriteria): BareboneProductInfo[] {
    if (!this.isReady()) {
      console.warn("⚠️ [BareboneKnowledgeBase] Not ready for searches.");
      return [];
    }

    console.log("🔍 [BareboneKnowledgeBase] Searching with criteria:", criteria);

    let results = [...this.products];

    // Apply filters
    if (criteria.query) {
      const query = criteria.query.toLowerCase();
      results = results.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.aesthetics.toLowerCase().includes(query),
      );
    }

    if (criteria.budget?.min !== undefined) {
      results = results.filter((product) => product.price >= criteria.budget!.min!);
    }

    if (criteria.budget?.max !== undefined) {
      results = results.filter((product) => product.price <= criteria.budget!.max!);
    }

    if (criteria.caseSize) {
      results = results.filter(
        (product) => product.caseSize === criteria.caseSize,
      );
    }

    if (criteria.motherboardFormFactor) {
      results = results.filter(
        (product) => product.motherboardFormFactor === criteria.motherboardFormFactor,
      );
    }

    if (criteria.supportedSocket) {
      results = results.filter((product) =>
        product.supportedSockets.includes(criteria.supportedSocket!),
      );
    }

    if (criteria.ramSupport) {
      results = results.filter(
        (product) => product.ramSupport === criteria.ramSupport,
      );
    }

    if (criteria.maxRamCapacity !== undefined) {
      results = results.filter(
        (product) => product.maxRamCapacity >= criteria.maxRamCapacity!,
      );
    }

    if (criteria.coolingType) {
      results = results.filter((product) =>
        product.coolingSupport.toLowerCase().includes(criteria.coolingType!),
      );
    }

    if (criteria.aestheticsStyle) {
      results = results.filter((product) =>
        product.aesthetics.toLowerCase().includes(criteria.aestheticsStyle!),
      );
    }

    // Sort by price (ascending) and then by name
    results.sort((a, b) => {
      if (a.price !== b.price) {
        return a.price - b.price;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(
      `✅ [BareboneKnowledgeBase] Found ${results.length} matching products.`,
    );
    return results;
  }

  // Get information for a specific barebone model
  getProductInfo(sku: string): BareboneProductInfo | null {
    if (!this.isReady()) {
      console.warn("⚠️ [BareboneKnowledgeBase] Not ready.");
      return null;
    }

    const product = this.products.find((p) => p.sku === sku);
    return product || null;
  }

  // Check compatibility between a barebone and other components
  checkCompatibility(
    bareboneSku: string,
    motherboardOrChipset: string,
  ): CompatibilityResult {
    if (!this.isReady()) {
      console.warn("⚠️ [BareboneKnowledgeBase] Not ready.");
      return {
        isCompatible: false,
        compatibleCases: [],
        issues: ["Knowledge base not initialized"],
        recommendations: ["Please initialize the knowledge base"],
      };
    }

    const barebone = this.products.find((p) => p.sku === bareboneSku);
    if (!barebone) {
      return {
        isCompatible: false,
        compatibleCases: [],
        issues: [`Barebone with SKU ${bareboneSku} not found`],
        recommendations: ["Check the SKU and try again"],
      };
    }

    // In a real implementation, this would check actual compatibility
    // For now, we'll return a mock result
    return {
      isCompatible: true,
      compatibleCases: [bareboneSku],
      issues: [],
      recommendations: [
        "Ensure PSU fits in selected case",
        "Check GPU clearance",
        "Verify CPU cooler height clearance"
      ],
    };
  }

  // Get all barebone systems
  getAllBarebones(): BareboneProductInfo[] {
    if (!this.isReady()) {
      console.warn("⚠️ [BareboneKnowledgeBase] Not ready.");
      return [];
    }
    return [...this.products];
  }
}

// Export the single, unified barebone knowledge base instance
export const bareboneKnowledgeBase = new BareboneKnowledgeBase();