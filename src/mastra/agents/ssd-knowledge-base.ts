import { ssdDatabaseTool } from "../tools/ssd-database-tool";

// Interface for a single SSD product's detailed information
export interface SSDProductInfo {
	sku: string;
	name: string;
	interface: string;
	capacity: string;
	readSpeed: string;
	writeSpeed: string;
	formFactor: string;
	endurance: string;
	controller?: string;
	nandType?: string;
	price: number;
	compatibility: string[];
	useCases: string[];
	stockStatus: string;
	description?: string;
}

// Interface for search criteria
export interface SearchCriteria {
	query?: string;
	capacity?: string;
	interface?: string;
	formFactor?: string;
	budget?: { min?: number; max?: number };
	useCase?: string;
}

// Interface for compatibility results
export interface CompatibilityResult {
	isCompatible: boolean;
	compatibleMotherboards: string[];
	issues: string[];
	recommendations: string[];
}

export class SSDKnowledgeBase {
	private products: SSDProductInfo[] = [];
	private isInitialized: boolean = false;

	constructor() {
		console.log("📚 [SSDKnowledgeBase] Initializing...");
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.log("📚 [SSDKnowledgeBase] Already initialized.");
			return;
		}

		console.log("📚 [SSDKnowledgeBase] Loading all SSD products...");
		try {
			// Use the ssdDatabaseTool to fetch all products (or a large subset)
			// For simplicity, we'll query with a broad term or no term to get many results
			const toolResult = await ssdDatabaseTool.execute({
				context: { query: "ssd", budget: { max: 999999999 } } as any,
				mastra: null, // Mastra instance is not available here, tool needs to be independent or mocked
			});

			if (toolResult.specialistData?.recommendations) {
				this.products = toolResult.specialistData.recommendations.map(
					(rec) => ({
						sku: rec.productId,
						name: rec.productName,
						interface: rec.specifications.interface,
						capacity: rec.specifications.capacity,
						readSpeed: rec.specifications.readSpeed,
						writeSpeed: rec.specifications.writeSpeed,
						formFactor: rec.specifications.formFactor,
						endurance: rec.specifications.endurance,
						controller: rec.specifications.controller,
						nandType: rec.specifications.nandType,
						price: rec.price,
						compatibility: [], // Tool output doesn't provide this directly, needs mapping
						useCases: rec.useCases || [],
						stockStatus: rec.availability,
						description: rec.description,
					}),
				);
				this.isInitialized = true;
				console.log(
					`✅ [SSDKnowledgeBase] Loaded ${this.products.length} SSD products.`,
				);
			} else {
				console.warn(
					"⚠️ [SSDKnowledgeBase] No SSD products found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [SSDKnowledgeBase] Failed to initialize:", error);
			this.isInitialized = false;
		}
	}

	isReady(): boolean {
		return this.isInitialized;
	}

	getProductInfo(ssdModel: string): SSDProductInfo | null {
		return (
			this.products.find((p) =>
				p.name.toLowerCase().includes(ssdModel.toLowerCase()),
			) || null
		);
	}

	searchSSDs(criteria: SearchCriteria): SSDProductInfo[] {
		let results = [...this.products];

		if (criteria.query) {
			const lowerQuery = criteria.query.toLowerCase();
			results = results.filter(
				(p) =>
					p.name.toLowerCase().includes(lowerQuery) ||
					p.description?.toLowerCase().includes(lowerQuery),
			);
		}
		if (criteria.capacity) {
			results = results.filter(
				(p) => p.capacity.toLowerCase() === criteria.capacity?.toLowerCase(),
			);
		}
		if (criteria.interface) {
			results = results.filter(
				(p) => p.interface.toLowerCase() === criteria.interface?.toLowerCase(),
			);
		}
		if (criteria.formFactor) {
			results = results.filter(
				(p) =>
					p.formFactor.toLowerCase() === criteria.formFactor?.toLowerCase(),
			);
		}
		if (criteria.budget?.min) {
			results = results.filter((p) => p.price >= criteria.budget?.min);
		}
		if (criteria.budget?.max) {
			results = results.filter((p) => p.price <= criteria.budget?.max);
		}
		if (criteria.useCase) {
			const lowerUseCase = criteria.useCase.toLowerCase();
			results = results.filter((p) =>
				p.useCases.some((uc) => uc.toLowerCase().includes(lowerUseCase)),
			);
		}

		return results;
	}

	checkCompatibility(
		ssdModel: string,
		motherboardOrChipset: string,
	): CompatibilityResult {
		const ssd = this.getProductInfo(ssdModel);
		if (!ssd) {
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: [`SSD model '${ssdModel}' not found.`],
				recommendations: [],
			};
		}

		// Simplified compatibility logic for demonstration
		const issues: string[] = [];
		const recommendations: string[] = [];
		let isCompatible = true;

		if (
			ssd.interface.toLowerCase() === "nvme" &&
			!motherboardOrChipset.toLowerCase().includes("m.2")
		) {
			issues.push("NVMe SSDs require an M.2 slot on the motherboard.");
			isCompatible = false;
		}
		if (
			ssd.interface.toLowerCase() === "sata" &&
			!motherboardOrChipset.toLowerCase().includes("sata")
		) {
			issues.push("SATA SSDs require a SATA port on the motherboard.");
			isCompatible = false;
		}

		recommendations.push(
			"Ensure your motherboard has the correct interface (SATA or M.2) and form factor support.",
		);
		recommendations.push(
			"Check your motherboard's manual for specific compatibility details.",
		);

		return {
			isCompatible,
			compatibleMotherboards: [], // Placeholder
			issues,
			recommendations,
		};
	}

	getAllSSDs(): SSDProductInfo[] {
		return [...this.products];
	}

	getStatistics(): any {
		const brands = new Set(this.products.map((p) => p.name.split(" ")[0])); // Simple brand extraction
		const capacities = new Set(this.products.map((p) => p.capacity));
		const interfaces = new Set(this.products.map((p) => p.interface));
		const avgPrice =
			this.products.length > 0
				? this.products.reduce((sum, p) => sum + p.price, 0) /
					this.products.length
				: 0;

		return {
			totalProducts: this.products.length,
			brands: Array.from(brands),
			capacities: Array.from(capacities),
			interfaces: Array.from(interfaces),
			avgPrice: parseFloat(avgPrice.toFixed(2)),
		};
	}
}

export const ssdKnowledgeBase = new SSDKnowledgeBase();
