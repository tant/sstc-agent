import { desktopDatabaseTool } from "../tools/desktop-database-tool";

// Interface for a single desktop configuration's detailed information
export interface DesktopConfigInfo {
	configId: string;
	name: string;
	cpuModel: string;
	ramConfiguration: {
		type: "DDR4" | "DDR5";
		capacity: string;
		speed: string;
		latency: string;
	};
	storageConfiguration: {
		type: "SSD" | "HDD" | "NVMe";
		capacity: string;
		interface: "SATA" | "NVMe" | "M.2";
		speed: string;
	};
	caseModel: string;
	caseSize: string;
	powerSupply: string;
	coolingSolution: string;
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
	useCase?: string;
	cpuBrand?: "Intel" | "AMD";
	ramCapacity?: number;
	ramType?: "DDR4" | "DDR5";
	storageType?: "SSD" | "NVMe" | "HDD";
	storageCapacity?: number;
	caseSize?: string;
	coolingPreference?: "air" | "liquid";
	performanceLevel?: "budget" | "mid-range" | "high-end";
}

// Interface for compatibility results
export interface CompatibilityResult {
	isCompatible: boolean;
	compatibleConfigs: string[];
	issues: string[];
	recommendations: string[];
}

export class DesktopKnowledgeBase {
	private configs: DesktopConfigInfo[] = [];
	private isInitialized: boolean = false;

	constructor() {
		console.log("📚 [DesktopKnowledgeBase] Initializing...");
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			console.log("📚 [DesktopKnowledgeBase] Already initialized.");
			return;
		}

		console.log(
			"📚 [DesktopKnowledgeBase] Loading all desktop configurations...",
		);
		try {
			// Use the desktopDatabaseTool to fetch all configurations
			const toolResult = await desktopDatabaseTool.execute({
				context: { query: "desktop", budget: { max: 999999999 } } as any,
				mastra: null, // Mastra instance is not available here, tool needs to be independent or mocked
			});

			if (toolResult.specialistData?.recommendations) {
				this.configs = toolResult.specialistData.recommendations.map((rec) => ({
					configId: rec.productId,
					name: rec.productName,
					cpuModel: rec.specifications.cpuModel,
					ramConfiguration: rec.specifications.ramConfiguration,
					storageConfiguration: rec.specifications.storageConfiguration,
					caseModel: rec.specifications.caseModel,
					caseSize: rec.specifications.caseSize,
					powerSupply: rec.specifications.powerSupply,
					coolingSolution: rec.specifications.coolingSolution,
					price: rec.price,
					compatibility: [], // Tool output doesn't provide this directly, needs mapping
					useCases: rec.useCases || [],
					stockStatus: rec.availability,
					description: rec.description,
				}));
				this.isInitialized = true;
				console.log(
					`✅ [DesktopKnowledgeBase] Loaded ${this.configs.length} desktop configurations.`,
				);
			} else {
				console.warn(
					"⚠️ [DesktopKnowledgeBase] No desktop configurations found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [DesktopKnowledgeBase] Failed to initialize:", error);
			this.isInitialized = false;
		}
	}

	isReady(): boolean {
		return this.isInitialized;
	}

	getStatistics(): {
		totalConfigs: number;
		avgPrice: number;
		useCases: string[];
		caseSizes: string[];
	} {
		if (!this.isReady()) {
			return {
				totalConfigs: 0,
				avgPrice: 0,
				useCases: [],
				caseSizes: [],
			};
		}

		const avgPrice =
			this.configs.reduce((sum, p) => sum + p.price, 0) / this.configs.length;
		const useCases = [...new Set(this.configs.flatMap((p) => p.useCases))];
		const caseSizes = [...new Set(this.configs.map((p) => p.caseSize))];

		return {
			totalConfigs: this.configs.length,
			avgPrice,
			useCases,
			caseSizes,
		};
	}

	// Search for desktop configurations based on criteria
	searchDesktops(criteria: SearchCriteria): DesktopConfigInfo[] {
		if (!this.isReady()) {
			console.warn("⚠️ [DesktopKnowledgeBase] Not ready for searches.");
			return [];
		}

		console.log("🔍 [DesktopKnowledgeBase] Searching with criteria:", criteria);

		let results = [...this.configs];

		// Apply filters
		if (criteria.query) {
			const query = criteria.query.toLowerCase();
			results = results.filter(
				(config) =>
					config.name.toLowerCase().includes(query) ||
					config.description?.toLowerCase().includes(query) ||
					config.cpuModel.toLowerCase().includes(query),
			);
		}

		if (criteria.budget?.min !== undefined) {
			results = results.filter(
				(config) => config.price >= (criteria.budget?.min ?? 0),
			);
		}

		if (criteria.budget?.max !== undefined) {
			results = results.filter(
				(config) => config.price <= (criteria.budget?.max ?? Infinity),
			);
		}

		if (criteria.useCase) {
			results = results.filter((config) =>
				config.useCases.includes(criteria.useCase ?? ''),
			);
		}

		if (criteria.cpuBrand) {
			results = results.filter((config) =>
				config.cpuModel
					.toLowerCase()
					.includes(criteria.cpuBrand?.toLowerCase()),
			);
		}

		if (criteria.ramCapacity !== undefined) {
			results = results.filter((config) => {
				const ramCapacity = parseInt(config.ramConfiguration.capacity, 10);
				return ramCapacity >= (criteria.ramCapacity ?? 0);
			});
		}

		if (criteria.ramType) {
			results = results.filter(
				(config) => config.ramConfiguration.type === criteria.ramType,
			);
		}

		if (criteria.storageType) {
			results = results.filter(
				(config) => config.storageConfiguration.type === criteria.storageType,
			);
		}

		if (criteria.storageCapacity !== undefined) {
			results = results.filter((config) => {
				const storageCapacity = parseInt(
					config.storageConfiguration.capacity,
					10,
				);
				return storageCapacity >= (criteria.storageCapacity ?? 0);
			});
		}

		if (criteria.caseSize) {
			results = results.filter(
				(config) => config.caseSize === criteria.caseSize,
			);
		}

		if (criteria.coolingPreference) {
			results = results.filter((config) =>
				config.coolingSolution
					.toLowerCase()
					.includes(criteria.coolingPreference ?? ''),
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
			`✅ [DesktopKnowledgeBase] Found ${results.length} matching configurations.`,
		);
		return results;
	}

	// Get information for a specific desktop configuration
	getConfigInfo(configId: string): DesktopConfigInfo | null {
		if (!this.isReady()) {
			console.warn("⚠️ [DesktopKnowledgeBase] Not ready.");
			return null;
		}

		const config = this.configs.find((p) => p.configId === configId);
		return config || null;
	}

	// Check compatibility between components
	checkCompatibility(
		configId: string,
		_additionalComponents: string[],
	): CompatibilityResult {
		if (!this.isReady()) {
			console.warn("⚠️ [DesktopKnowledgeBase] Not ready.");
			return {
				isCompatible: false,
				compatibleConfigs: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}

		const config = this.configs.find((p) => p.configId === configId);
		if (!config) {
			return {
				isCompatible: false,
				compatibleConfigs: [],
				issues: [`Configuration with ID ${configId} not found`],
				recommendations: ["Check the configuration ID and try again"],
			};
		}

		// In a real implementation, this would check actual compatibility
		// For now, we'll return a mock result
		return {
			isCompatible: true,
			compatibleConfigs: [configId],
			issues: [],
			recommendations: [
				"Ensure PSU wattage meets system requirements",
				"Check GPU clearance in selected case",
				"Verify CPU cooler height clearance",
			],
		};
	}

	// Get all desktop configurations
	getAllDesktops(): DesktopConfigInfo[] {
		if (!this.isReady()) {
			console.warn("⚠️ [DesktopKnowledgeBase] Not ready.");
			return [];
		}
		return [...this.configs];
	}
}

// Export the single, unified desktop knowledge base instance
export const desktopKnowledgeBase = new DesktopKnowledgeBase();
