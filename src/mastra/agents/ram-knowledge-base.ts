import { ramDatabaseTool } from "../tools/ram-database-tool";

// Interface for a single RAM product's detailed information
export interface RAMProductInfo {
	sku: string;
	name: string;
	type: string;
	capacity: string;
	speed: string;
	latency: string;
	voltage: string;
	formFactor: string;
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
	type?: string;
	speed?: string;
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

export class RAMKnowledgeBase {
	private products: RAMProductInfo[] = [];
	private isInitialized: boolean = false;

	constructor() {
		console.log("📚 [RAMKnowledgeBase] Initializing...");
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.log("📚 [RAMKnowledgeBase] Already initialized.");
			return;
		}

		console.log("📚 [RAMKnowledgeBase] Loading all RAM products...");
		try {
			// Use the ramDatabaseTool to fetch all products (or a large subset)
			// For simplicity, we'll query with a broad term or no term to get many results
			const toolResult = await ramDatabaseTool.execute({
				context: { query: "ram", budget: { max: 999999999 } } as any,
				mastra: null, // Mastra instance is not available here, tool needs to be independent or mocked
			});

			if (toolResult.specialistData?.recommendations) {
				this.products = toolResult.specialistData.recommendations.map(
					(rec) => ({
						sku: rec.productId,
						name: rec.productName,
						type: rec.specifications.type,
						capacity: rec.specifications.capacity,
						speed: rec.specifications.speed,
						latency: rec.specifications.latency,
						voltage: rec.specifications.voltage,
						formFactor: rec.specifications.formFactor,
						price: rec.price,
						compatibility: [], // Tool output doesn't provide this directly, needs mapping
						useCases: rec.useCases || [],
						stockStatus: rec.availability,
						description: rec.description,
					}),
				);
				this.isInitialized = true;
				console.log(
					`✅ [RAMKnowledgeBase] Loaded ${this.products.length} RAM products.`,
				);
			} else {
				console.warn(
					"⚠️ [RAMKnowledgeBase] No RAM products found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [RAMKnowledgeBase] Failed to initialize:", error);
			this.isInitialized = false;
		}
	}

	isReady(): boolean {
		return this.isInitialized;
	}

	getProductInfo(ramModel: string): RAMProductInfo | null {
		return (
			this.products.find((p) =>
				p.name.toLowerCase().includes(ramModel.toLowerCase()),
			) || null
		);
	}

	searchRAMs(criteria: SearchCriteria): RAMProductInfo[] {
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
		if (criteria.type) {
			results = results.filter(
				(p) => p.type.toLowerCase() === criteria.type?.toLowerCase(),
			);
		}
		if (criteria.speed) {
			results = results.filter((p) =>
				p.speed.toLowerCase().includes(criteria.speed.toLowerCase()),
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
		ramModel: string,
		motherboardOrChipset: string,
	): CompatibilityResult {
		const ram = this.getProductInfo(ramModel);
		if (!ram) {
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: [`RAM model '${ramModel}' not found.`],
				recommendations: [],
			};
		}

		// Simplified compatibility logic for demonstration
		const issues: string[] = [];
		const recommendations: string[] = [];
		let isCompatible = true;

		if (
			ram.type.toLowerCase() === "ddr5" &&
			!motherboardOrChipset.toLowerCase().includes("ddr5")
		) {
			issues.push("DDR5 RAM requires a DDR5 compatible motherboard.");
			isCompatible = false;
		}
		if (
			ram.type.toLowerCase() === "ddr4" &&
			!motherboardOrChipset.toLowerCase().includes("ddr4")
		) {
			issues.push("DDR4 RAM requires a DDR4 compatible motherboard.");
			isCompatible = false;
		}

		recommendations.push(
			"Ensure your motherboard has the correct RAM type (DDR4 or DDR5) and compatible slots.",
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

	getAllRAMs(): RAMProductInfo[] {
		return [...this.products];
	}

	getStatistics(): any {
		const brands = new Set(this.products.map((p) => p.name.split(" ")[0])); // Simple brand extraction
		const capacities = new Set(this.products.map((p) => p.capacity));
		const types = new Set(this.products.map((p) => p.type));
		const avgPrice =
			this.products.length > 0
				? this.products.reduce((sum, p) => sum + p.price, 0) /
					this.products.length
				: 0;

		return {
			totalProducts: this.products.length,
			brands: Array.from(brands),
			capacities: Array.from(capacities),
			types: Array.from(types),
			avgPrice: parseFloat(avgPrice.toFixed(2)),
		};
	}
}

export const ramKnowledgeBase = new RAMKnowledgeBase();
