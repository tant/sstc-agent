import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type {
	CPUProductRecommendation,
	CPUSpecialistData,
} from "../core/models/specialist-data-models";

// Input schema for CPU database tool
const cpuSearchInputSchema = z.object({
	query: z.string().min(1, "Search query is required"),
	brand: z.enum(["Intel", "AMD"]).optional(),
	series: z
		.enum(["i3", "i5", "i7", "i9", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"])
		.optional(),
	socket: z
		.enum(["LGA1700", "AM5", "LGA1200", "AM4", "LGA2066", "TRX40"])
		.optional(),
	cores: z.number().optional(),
	threads: z.number().optional(),
	budget: z
		.object({
			min: z.number().optional(),
			max: z.number().optional(),
		})
		.optional(),
	useCase: z
		.enum(["gaming", "office", "content-creation", "professional"])
		.optional(),
	motherboardCompatibility: z.string().optional(),
});

// Output schema for CPU database tool results
const cpuSearchOutputSchema = z.object({
	specialistData: z.object({
		recommendations: z.array(z.any()),
		technicalAnalysis: z.object({
			keySpecifications: z.object({
				brand: z.string(),
				series: z.string(),
				socket: z.string(),
				cores: z.number(),
				threads: z.number(),
			}),
			performanceMetrics: z.object({
				benchmarkScore: z.string(),
				gamingPerformance: z.string(),
				productivityScore: z.string(),
				powerEfficiency: z.string(),
			}),
			compatibilityInfo: z.object({
				supportedChipsets: z.array(z.string()),
				recommendedMotherboards: z.array(z.string()),
				ramCompatibility: z.string(),
				coolingRequirements: z.string(),
			}),
		}),
		pricingInfo: z.object({
			budgetCategory: z.string(),
			priceRange: z.object({
				min: z.number(),
				max: z.number(),
			}),
			pricePerformanceRatio: z.string(),
			value: z.string(),
		}),
		availability: z.object({
			stockStatus: z.string(),
			estimatedDelivery: z.string(),
			warrantyInfo: z.string(),
		}),
		confidenceScore: z.number(),
	}),
	recommendations: z.array(z.string()),
});

export const cpuDatabaseTool = createTool({
	id: "cpu-database-search",
	description:
		"Search SSTC CPU product database and return structured data for specialist agents",
	inputSchema: cpuSearchInputSchema,
	outputSchema: cpuSearchOutputSchema,
	execute: async (inputData) => {
		const {
			query,
			brand,
			series,
			socket,
			cores,
			threads,
			budget,
			useCase,
			motherboardCompatibility,
		} = inputData;

		console.log("🔍 [CPU DB] Searching:", {
			query,
			brand,
			series,
			socket,
			cores,
			threads,
			budget,
			useCase,
			motherboardCompatibility,
		});

		const startTime = Date.now();

		try {
			// Sample CPUs from SSTC - these represent real products from the database
			const sampleCPUs = [
				{
					sku: "cpu-001",
					name: "Intel Core i5-13400F",
					brand: "Intel",
					model: "Core i5-13400F",
					series: "13th Gen",
					socket: "LGA1700",
					cores: 10,
					threads: 16,
					baseClock: "2.5 GHz",
					boostClock: "4.6 GHz",
					l3Cache: "20 MB",
					architecture: "Raptor Lake",
					powerConsumption: "65W",
					price: 5200000,
					compatibility: ["LGA1700", "B660", "H670", "Z690", "B760", "H770", "Z790"],
					useCases: ["gaming", "office", "content-creation"],
					stockStatus: "in_stock",
					description: "CPU gaming tầm trung hiệu năng cao",
					tdp: "65W",
					benchmarkScore: "85/100",
					pricePerPerformance: "Excellent",
					futureProofing: "Good",
					score: 0, // Will be calculated
				},
				{
					sku: "cpu-002",
					name: "AMD Ryzen 5 7600X",
					brand: "AMD",
					model: "Ryzen 5 7600X",
					series: "Ryzen 5",
					socket: "AM5",
					cores: 6,
					threads: 12,
					baseClock: "4.7 GHz",
					boostClock: "5.3 GHz",
					l3Cache: "32 MB",
					architecture: "Zen 4",
					powerConsumption: "105W",
					price: 6800000,
					compatibility: ["AM5", "B650", "X670", "B650E", "X670E"],
					useCases: ["gaming", "content-creation"],
					stockStatus: "in_stock",
					description: "CPU AMD Zen 4 hiệu năng cao cho gaming",
					tdp: "105W",
					benchmarkScore: "88/100",
					pricePerPerformance: "Very Good",
					futureProofing: "Excellent",
					integratedGraphics: "AMD Radeon Graphics",
					score: 0, // Will be calculated
				},
				{
					sku: "cpu-003",
					name: "Intel Core i7-13700F",
					brand: "Intel",
					model: "Core i7-13700F",
					series: "13th Gen",
					socket: "LGA1700",
					cores: 16,
					threads: 24,
					baseClock: "2.1 GHz",
					boostClock: "5.2 GHz",
					l3Cache: "30 MB",
					architecture: "Raptor Lake",
					powerConsumption: "65W",
					price: 9200000,
					compatibility: ["LGA1700", "B660", "H670", "Z690", "B760", "H770", "Z790"],
					useCases: ["gaming", "content-creation", "professional"],
					stockStatus: "in_stock",
					description: "CPU cao cấp cho gaming và content creation",
					tdp: "65W",
					benchmarkScore: "92/100",
					pricePerPerformance: "Good",
					futureProofing: "Excellent",
					score: 0, // Will be calculated
				},
			];

			// Filter products based on criteria
			let filteredCPUs = [...sampleCPUs];

			// Apply search query filter
			if (query && query !== 'cpu') {
				const searchTerm = query.toLowerCase();
				filteredCPUs = filteredCPUs.filter(cpu => 
					cpu.name.toLowerCase().includes(searchTerm) ||
					cpu.brand.toLowerCase().includes(searchTerm) ||
					cpu.series.toLowerCase().includes(searchTerm) ||
					cpu.description.toLowerCase().includes(searchTerm)
				);
			}

			// Apply brand filter
			if (brand) {
				filteredCPUs = filteredCPUs.filter(cpu => cpu.brand === brand);
			}

			// Apply budget filters
			if (budget?.min) {
				filteredCPUs = filteredCPUs.filter(cpu => cpu.price >= budget.min);
			}

			if (budget?.max) {
				filteredCPUs = filteredCPUs.filter(cpu => cpu.price <= budget.max);
			}

			// Apply socket filter
			if (socket) {
				filteredCPUs = filteredCPUs.filter(cpu => cpu.socket === socket);
			}

			// Apply cores filter
			if (cores) {
				filteredCPUs = filteredCPUs.filter(cpu => cpu.cores >= cores);
			}

			// Apply use case filter
			if (useCase) {
				filteredCPUs = filteredCPUs.filter(cpu => cpu.useCases.includes(useCase));
			}

			console.log(`📊 [CPU DB] Found ${filteredCPUs.length} matching CPUs`);

			if (filteredCPUs.length === 0) {
				console.warn("⚠️ [CPU DB] No CPU products found matching criteria");
				return {
					specialistData: {
						recommendations: [],
						technicalAnalysis: {
							keySpecifications: {
								brand: "N/A",
								series: "N/A",
								socket: "N/A",
								cores: 0,
								threads: 0,
							},
							performanceMetrics: {
								benchmarkScore: "N/A",
								gamingPerformance: "N/A",
								productivityScore: "N/A",
								powerEfficiency: "N/A",
							},
							compatibilityInfo: {
								supportedChipsets: [],
								recommendedMotherboards: [],
								ramCompatibility: "N/A",
								coolingRequirements: "N/A",
							},
						},
						pricingInfo: {
							budgetCategory: "N/A",
							priceRange: { min: 0, max: 0 },
							pricePerformanceRatio: "N/A",
							value: "N/A",
						},
						availability: {
							stockStatus: "out_of_stock",
							estimatedDelivery: "N/A",
							warrantyInfo: "N/A",
						},
						confidenceScore: 0.0,
					},
					recommendations: ["No CPU products found matching your criteria"],
				};
			}

			// Calculate CPU scores
			const processedCPUs: any[] = filteredCPUs.map((cpu: any) => {
				// Score calculation based on performance, price, and compatibility
				cpu.score = calculateCPUScore({
					price: cpu.price,
					cores: cpu.cores,
					threads: cpu.threads,
					baseClock: parseFloat(cpu.baseClock) || 2.5,
					boostClock: parseFloat(cpu.boostClock) || 4.0,
					benchmarkScore: parseInt(cpu.benchmarkScore) || 50,
					brand: cpu.brand,
					useCase: useCase || "general",
					budget,
				});

				return cpu;
			});

			// Sort by score (highest first)
			processedCPUs.sort((a, b) => b.score - a.score);

			console.log(`📊 [CPU Database] Processed ${processedCPUs.length} CPUs with scores`);

			// Convert to CPUProductRecommendation format
			const recommendations: CPUProductRecommendation[] = processedCPUs.map(cpu => ({
				productId: cpu.sku,
				productName: cpu.name,
				price: cpu.price,
				keyFeatures: [
					`${cpu.cores} cores/${cpu.threads} threads`,
					`${cpu.socket} socket`,
					`${cpu.benchmarkScore} benchmark score`,
					cpu.pricePerPerformance
				],
				specifications: {
					brand: cpu.brand,
					series: cpu.series,
					socket: cpu.socket,
					cores: cpu.cores,
					threads: cpu.threads,
					baseClock: cpu.baseClock,
					boostClock: cpu.boostClock,
					l3Cache: cpu.l3Cache,
					architecture: cpu.architecture,
					powerConsumption: cpu.powerConsumption,
					integratedGraphics: cpu.integratedGraphics,
				},
				useCases: cpu.useCases,
				availability: cpu.stockStatus,
				recommendationScore: cpu.score,
				description: cpu.description,
			}));

			// Generate technical analysis
			const topCpu = processedCPUs[0];
			const technicalAnalysis = {
				keySpecifications: {
					brand: topCpu.brand,
					series: topCpu.series,
					socket: topCpu.socket,
					cores: topCpu.cores,
					threads: topCpu.threads,
				},
				performanceMetrics: {
					benchmarkScore: topCpu.benchmarkScore,
					gamingPerformance: topCpu.benchmarkScore,
					productivityScore: topCpu.benchmarkScore,
					powerEfficiency: topCpu.powerConsumption,
				},
				compatibilityInfo: {
					supportedChipsets: topCpu.compatibility,
					recommendedMotherboards: topCpu.compatibility,
					ramCompatibility: topCpu.socket === "AM5" ? "DDR5" : "DDR4/DDR5",
					coolingRequirements: `Recommended for ${topCpu.tdp}`,
				},
			};

			// Generate pricing info
			const prices = processedCPUs.map(cpu => cpu.price);
			const pricingInfo = {
				budgetCategory: categorizePrice(Math.min(...prices)),
				priceRange: { 
					min: Math.min(...prices), 
					max: Math.max(...prices) 
				},
				pricePerformanceRatio: topCpu.pricePerPerformance,
				value: "Good value for performance",
			};

			// Generate availability
			const availability = {
				stockStatus: "in_stock",
				estimatedDelivery: "1-2 ngày làm việc",
				warrantyInfo: "36 tháng bảo hành chính hãng",
			};

			const confidenceScore = Math.min(1.0, processedCPUs.length / 5.0);

			const specialistData: CPUSpecialistData = {
				recommendations,
				technicalAnalysis,
				pricingInfo,
				availability,
				confidenceScore,
			};

			console.log(`✅ [CPU Database] Successfully processed ${recommendations.length} CPU recommendations`);
			console.log(`⏱️ [CPU Database] Processing time: ${Date.now() - startTime}ms`);

			return {
				specialistData,
				recommendations: recommendations.map(r => `${r.productName} - ${r.price.toLocaleString()}đ`),
			};

		} catch (error: any) {
			console.error("❌ [CPU DB] Search failed:", error.message);
			throw new Error(`CPU database search failed: ${error.message}`);
		}
	},
});

// Helper functions
function calculateCPUScore(params: {
	price: number;
	cores: number;
	threads: number;
	baseClock: number;
	boostClock: number;
	benchmarkScore: number;
	brand: string;
	useCase: string;
	budget?: { min?: number; max?: number };
}): number {
	let score = 0;

	// Base performance score (40% weight)
	const performanceScore = (params.cores * 2 + params.threads + params.boostClock * 10 + params.benchmarkScore) / 150;
	score += performanceScore * 0.4;

	// Price-performance ratio (35% weight) 
	const pricePerformance = (params.benchmarkScore * 1000000) / params.price;
	const normalizedPricePerf = Math.min(pricePerformance / 20, 1);
	score += normalizedPricePerf * 0.35;

	// Use case matching (15% weight)
	let useCaseBonus = 0.5; // Base bonus
	if (params.useCase === "gaming" && params.cores >= 6) useCaseBonus = 1.0;
	if (params.useCase === "content-creation" && params.cores >= 8) useCaseBonus = 1.0;
	if (params.useCase === "professional" && params.cores >= 12) useCaseBonus = 1.0;
	score += useCaseBonus * 0.15;

	// Budget alignment (10% weight)
	let budgetScore = 0.5;
	if (params.budget) {
		if (params.budget.min && params.price >= params.budget.min) budgetScore += 0.25;
		if (params.budget.max && params.price <= params.budget.max) budgetScore += 0.25;
	}
	score += budgetScore * 0.1;

	return Math.min(Math.max(score * 10, 0), 10); // Normalize to 0-10 scale
}

function categorizePrice(price: number): string {
	if (price < 3000000) return "Budget";
	if (price < 7000000) return "Mid-range";
	if (price < 12000000) return "High-end";
	return "Enthusiast";
}