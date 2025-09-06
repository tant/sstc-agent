import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type {
	RAMProductRecommendation,
	RAMSpecialistData,
} from "../core/models/specialist-data-models";

// Input schema for RAM database tool
const ramSearchInputSchema = z.object({
	query: z.string().min(1, "Search query is required"),
	capacity: z.enum(["8GB", "16GB", "32GB", "64GB"]).optional(),
	type: z.enum(["DDR4", "DDR5"]).optional(),
	speed: z.string().optional(),
	formFactor: z.enum(["DIMM", "SO-DIMM"]).optional(),
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

// Output schema for RAM database tool results
const ramSearchOutputSchema = z.object({
	specialistData: z.object({
		recommendations: z.array(z.any()),
		technicalAnalysis: z.object({
			keySpecifications: z.object({
				capacity: z.string(),
				type: z.string(),
				speed: z.string(),
				formFactor: z.string(),
				channels: z.string(),
			}),
			performanceMetrics: z.object({
				latency: z.string(),
				bandwidth: z.string(),
				overclockingPotential: z.string(),
				compatibilityScore: z.string(),
			}),
			compatibilityInfo: z.object({
				supportedChipsets: z.array(z.string()),
				recommendedMotherboards: z.array(z.string()),
				cpuCompatibility: z.string(),
				maxSupportedCapacity: z.string(),
			}),
		}),
		pricingInfo: z.object({
			budgetCategory: z.string(),
			priceRange: z.object({
				min: z.number(),
				max: z.number(),
			}),
			pricePerGBRatio: z.string(),
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

export const ramDatabaseTool = createTool({
	id: "ram-database-search",
	description:
		"Search SSTC RAM product database and return structured data for specialist agents",
	inputSchema: ramSearchInputSchema,
	outputSchema: ramSearchOutputSchema,
	execute: async (inputData) => {
		const {
			query,
			capacity,
			type,
			speed,
			formFactor,
			budget,
			useCase,
			motherboardCompatibility,
		} = inputData;

		console.log("🔍 [RAM DB] Searching:", {
			query,
			capacity,
			type,
			speed,
			formFactor,
			budget,
			useCase,
			motherboardCompatibility,
		});

		const startTime = Date.now();

		try {
			// Sample RAM modules from SSTC - these represent real products from the database
			const sampleRAMs = [
				{
					sku: "ram-001",
					name: "Corsair Vengeance LPX 16GB DDR4-3200",
					brand: "Corsair",
					model: "Vengeance LPX",
					capacity: "16GB",
					type: "DDR4",
					speed: "3200MHz",
					formFactor: "DIMM",
					channels: "2x8GB",
					latency: "CL16",
					price: 2400000,
					compatibility: ["B450", "B550", "X470", "X570", "B660", "H670", "Z690"],
					useCases: ["gaming", "office", "content-creation"],
					stockStatus: "in_stock",
					description: "RAM DDR4 phổ biến cho gaming và văn phòng",
					overclockingPotential: "Good",
					score: 0, // Will be calculated
				},
				{
					sku: "ram-002",
					name: "G.SKILL Trident Z5 32GB DDR5-6000",
					brand: "G.SKILL",
					model: "Trident Z5",
					capacity: "32GB",
					type: "DDR5",
					speed: "6000MHz",
					formFactor: "DIMM",
					channels: "2x16GB",
					latency: "CL36",
					price: 7200000,
					compatibility: ["B650", "X670", "B650E", "X670E", "Z790", "B760"],
					useCases: ["gaming", "content-creation", "professional"],
					stockStatus: "in_stock",
					description: "RAM DDR5 cao cấp cho gaming và content creation",
					overclockingPotential: "Excellent",
					score: 0, // Will be calculated
				},
				{
					sku: "ram-003",
					name: "Kingston FURY Beast 16GB DDR4-3600",
					brand: "Kingston",
					model: "FURY Beast",
					capacity: "16GB",
					type: "DDR4",
					speed: "3600MHz",
					formFactor: "DIMM",
					channels: "2x8GB",
					latency: "CL17",
					price: 2800000,
					compatibility: ["B450", "B550", "X470", "X570", "B660", "H670", "Z690"],
					useCases: ["gaming", "content-creation"],
					stockStatus: "in_stock",
					description: "RAM gaming hiệu năng cao với tản nhiệt",
					overclockingPotential: "Very Good",
					score: 0, // Will be calculated
				},
			];

			// Filter products based on criteria
			let filteredRAMs = [...sampleRAMs];

			// Apply search query filter
			if (query && query !== 'ram') {
				const searchTerm = query.toLowerCase();
				filteredRAMs = filteredRAMs.filter(ram => 
					ram.name.toLowerCase().includes(searchTerm) ||
					ram.brand.toLowerCase().includes(searchTerm) ||
					ram.model.toLowerCase().includes(searchTerm) ||
					ram.description.toLowerCase().includes(searchTerm)
				);
			}

			// Apply capacity filter
			if (capacity) {
				filteredRAMs = filteredRAMs.filter(ram => ram.capacity === capacity);
			}

			// Apply type filter
			if (type) {
				filteredRAMs = filteredRAMs.filter(ram => ram.type === type);
			}

			// Apply budget filters
			if (budget?.min) {
				filteredRAMs = filteredRAMs.filter(ram => ram.price >= budget.min);
			}

			if (budget?.max) {
				filteredRAMs = filteredRAMs.filter(ram => ram.price <= budget.max);
			}

			// Apply form factor filter
			if (formFactor) {
				filteredRAMs = filteredRAMs.filter(ram => ram.formFactor === formFactor);
			}

			// Apply use case filter
			if (useCase) {
				filteredRAMs = filteredRAMs.filter(ram => ram.useCases.includes(useCase));
			}

			console.log(`📊 [RAM DB] Found ${filteredRAMs.length} matching RAM modules`);

			if (filteredRAMs.length === 0) {
				console.warn("⚠️ [RAM DB] No RAM products found matching criteria");
				return {
					specialistData: {
						recommendations: [],
						technicalAnalysis: {
							keySpecifications: {
								capacity: "N/A",
								type: "N/A",
								speed: "N/A",
								formFactor: "N/A",
								channels: "N/A",
							},
							performanceMetrics: {
								latency: "N/A",
								bandwidth: "N/A",
								overclockingPotential: "N/A",
								compatibilityScore: "N/A",
							},
							compatibilityInfo: {
								supportedChipsets: [],
								recommendedMotherboards: [],
								cpuCompatibility: "N/A",
								maxSupportedCapacity: "N/A",
							},
						},
						pricingInfo: {
							budgetCategory: "N/A",
							priceRange: { min: 0, max: 0 },
							pricePerGBRatio: "N/A",
							value: "N/A",
						},
						availability: {
							stockStatus: "out_of_stock",
							estimatedDelivery: "N/A",
							warrantyInfo: "N/A",
						},
						confidenceScore: 0.0,
					},
					recommendations: ["No RAM products found matching your criteria"],
				};
			}

			// Calculate RAM scores
			const processedRAMs: any[] = filteredRAMs.map((ram: any) => {
				// Score calculation based on performance, price, and compatibility
				ram.score = calculateRAMScore({
					price: ram.price,
					capacity: parseInt(ram.capacity) || 16,
					speed: parseInt(ram.speed) || 3200,
					type: ram.type,
					latency: parseInt(ram.latency.replace('CL', '')) || 16,
					brand: ram.brand,
					useCase: useCase || "general",
					budget,
				});

				return ram;
			});

			// Sort by score (highest first)
			processedRAMs.sort((a, b) => b.score - a.score);

			console.log(`📊 [RAM Database] Processed ${processedRAMs.length} RAMs with scores`);

			// Convert to RAMProductRecommendation format
			const recommendations: RAMProductRecommendation[] = processedRAMs.map(ram => ({
				productId: ram.sku,
				productName: ram.name,
				price: ram.price,
				keyFeatures: [
					`${ram.capacity} capacity`,
					`${ram.type} ${ram.speed}`,
					`${ram.latency} latency`,
					ram.overclockingPotential
				],
				specifications: {
					brand: ram.brand,
					model: ram.model,
					capacity: ram.capacity,
					type: ram.type,
					speed: ram.speed,
					formFactor: ram.formFactor,
					channels: ram.channels,
					latency: ram.latency,
				},
				useCases: ram.useCases,
				availability: ram.stockStatus,
				recommendationScore: ram.score,
				description: ram.description,
			}));

			// Generate technical analysis
			const topRAM = processedRAMs[0];
			const technicalAnalysis = {
				keySpecifications: {
					capacity: topRAM.capacity,
					type: topRAM.type,
					speed: topRAM.speed,
					formFactor: topRAM.formFactor,
					channels: topRAM.channels,
				},
				performanceMetrics: {
					latency: topRAM.latency,
					bandwidth: `${parseInt(topRAM.speed) * 8 / 1000}GB/s`,
					overclockingPotential: topRAM.overclockingPotential,
					compatibilityScore: "Very Good",
				},
				compatibilityInfo: {
					supportedChipsets: topRAM.compatibility,
					recommendedMotherboards: topRAM.compatibility,
					cpuCompatibility: topRAM.type === "DDR5" ? "Latest Gen CPUs" : "Compatible with most CPUs",
					maxSupportedCapacity: topRAM.type === "DDR5" ? "128GB+" : "64GB",
				},
			};

			// Generate pricing info
			const prices = processedRAMs.map(ram => ram.price);
			const avgCapacity = processedRAMs.reduce((sum, ram) => sum + parseInt(ram.capacity), 0) / processedRAMs.length;
			const pricingInfo = {
				budgetCategory: categorizeRAMPrice(Math.min(...prices)),
				priceRange: { 
					min: Math.min(...prices), 
					max: Math.max(...prices) 
				},
				pricePerGBRatio: `${(Math.min(...prices) / avgCapacity).toFixed(0)}k đ/GB`,
				value: "Good value for performance",
			};

			// Generate availability
			const availability = {
				stockStatus: "in_stock",
				estimatedDelivery: "1-2 ngày làm việc",
				warrantyInfo: "36 tháng bảo hành chính hãng",
			};

			const confidenceScore = Math.min(1.0, processedRAMs.length / 3.0);

			const specialistData: RAMSpecialistData = {
				recommendations,
				technicalAnalysis,
				pricingInfo,
				availability,
				confidenceScore,
			};

			console.log(`✅ [RAM Database] Successfully processed ${recommendations.length} RAM recommendations`);
			console.log(`⏱️ [RAM Database] Processing time: ${Date.now() - startTime}ms`);

			return {
				specialistData,
				recommendations: recommendations.map(r => `${r.productName} - ${r.price.toLocaleString()}đ`),
			};

		} catch (error: any) {
			console.error("❌ [RAM DB] Search failed:", error.message);
			throw new Error(`RAM database search failed: ${error.message}`);
		}
	},
});

// Helper functions
function calculateRAMScore(params: {
	price: number;
	capacity: number;
	speed: number;
	type: string;
	latency: number;
	brand: string;
	useCase: string;
	budget?: { min?: number; max?: number };
}): number {
	let score = 0;

	// Base performance score (40% weight)
	const performanceScore = (params.capacity * 0.1 + params.speed * 0.0005 + (params.type === "DDR5" ? 20 : 10) - params.latency * 0.5) / 30;
	score += Math.max(0, performanceScore) * 0.4;

	// Price-performance ratio (35% weight) 
	const pricePerGB = params.price / params.capacity;
	const normalizedPricePerf = Math.max(0, 1 - (pricePerGB - 100000) / 200000);
	score += normalizedPricePerf * 0.35;

	// Use case matching (15% weight)
	let useCaseBonus = 0.5; // Base bonus
	if (params.useCase === "gaming" && params.capacity >= 16) useCaseBonus = 1.0;
	if (params.useCase === "content-creation" && params.capacity >= 32) useCaseBonus = 1.0;
	if (params.useCase === "professional" && params.capacity >= 32) useCaseBonus = 1.0;
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

function categorizeRAMPrice(price: number): string {
	if (price < 2000000) return "Budget";
	if (price < 4000000) return "Mid-range";
	if (price < 8000000) return "High-end";
	return "Enthusiast";
}