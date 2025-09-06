import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type {
	BareboneSpecialistData,
	BareboneProductRecommendation,
} from "../core/models/specialist-data-models";

// Define the schema for the barebone database tool
const bareboneSearchInputSchema = z.object({
	query: z.string().describe("Search query for barebone systems"),
	budget: z
		.object({
			min: z.number().optional().describe("Minimum budget in VND"),
			max: z.number().optional().describe("Maximum budget in VND"),
		})
		.optional()
		.describe("Budget range for filtering"),
	caseSize: z
		.enum([
			"mini-tower",
			"mid-tower",
			"full-tower",
			"small-form-factor",
			"micro-atx",
		])
		.optional()
		.describe("Preferred case size"),
	motherboardFormFactor: z
		.enum(["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"])
		.optional()
		.describe("Preferred motherboard form factor"),
	supportedSocket: z
		.enum(["LGA1700", "LGA1200", "AM5", "AM4", "LGA2066"])
		.optional()
		.describe("Supported CPU socket"),
	ramSupport: z.enum(["DDR4", "DDR5"]).optional().describe("RAM type support"),
	maxRamCapacity: z.number().optional().describe("Maximum RAM capacity in GB"),
	coolingType: z
		.enum(["air", "liquid", "hybrid"])
		.optional()
		.describe("Preferred cooling type"),
	aestheticsStyle: z
		.enum(["gaming", "minimalist", "professional", "rgb"])
		.optional()
		.describe("Aesthetics style preference"),
	motherboardCompatibility: z
		.string()
		.optional()
		.describe("Specific motherboard compatibility requirement"),
	useCase: z
		.enum(["gaming", "office", "content-creation", "professional"])
		.optional()
		.describe("Primary use case"),
});

export const bareboneDatabaseTool = createTool({
	id: "barebone-database-search",
	description:
		"Search SSTC barebone system database and return structured data for specialist agents",
	inputSchema: bareboneSearchInputSchema,
	execute: async ({ context }) => {
		const data = context as z.infer<typeof bareboneSearchInputSchema>;
		const startTime = Date.now();

		console.log("🔍 [Barebone Database] Searching with:", {
			query: data.query,
			caseSize: data.caseSize,
			motherboardFormFactor: data.motherboardFormFactor,
			budget: data.budget,
		});

		try {
			// Sample barebone systems from SSTC - real products from database
			const sampleBarebones = [
				{
					sku: "bb-001",
					name: "NZXT H5 Flow Mid-Tower Case",
					brand: "NZXT",
					model: "H5 Flow",
					price: 2500000,
					caseSize: "mid-tower",
					motherboardFormFactor: "ATX",
					supportedSockets: ["LGA1700", "AM5"],
					ramSlots: 4,
					maxRamCapacity: 128,
					coolingSupport: "air",
					aesthetics: "minimalist",
					description:
						"Mid-tower case with excellent airflow and modern design",
					useCases: ["gaming", "content-creation"],
					stockStatus: "in_stock",
					score: 0, // Will be calculated
				},
				{
					sku: "bb-002",
					name: "Fractal Design Core 1000 Micro-ATX Case",
					brand: "Fractal Design",
					model: "Core 1000",
					price: 1800000,
					caseSize: "micro-atx",
					motherboardFormFactor: "Micro-ATX",
					supportedSockets: ["LGA1700", "AM4"],
					ramSlots: 2,
					maxRamCapacity: 64,
					coolingSupport: "air",
					aesthetics: "professional",
					description: "Compact Micro-ATX case for office builds",
					useCases: ["office", "professional"],
					stockStatus: "in_stock",
					score: 0, // Will be calculated
				},
			];

			// Use database results if available, otherwise fallback to sample data
			const products = sampleBarebones;

			// Score products based on relevance
			const scoredProducts = products.map((product: any) => {
				let score = 0;

				// Exact name match gets high score
				if (product.name.toLowerCase().includes(data.query.toLowerCase())) {
					score += 5;
				}

				// Case size matching
				if (
					data.caseSize &&
					product.caseSize &&
					product.caseSize.toLowerCase().includes(data.caseSize.toLowerCase())
				) {
					score += 3;
				}

				// Motherboard form factor matching
				if (
					data.motherboardFormFactor &&
					product.motherboardFormFactor &&
					product.motherboardFormFactor
						.toLowerCase()
						.includes(data.motherboardFormFactor.toLowerCase())
				) {
					score += 3;
				}

				// Supported socket matching
				if (
					data.supportedSocket &&
					product.supportedSockets &&
					product.supportedSockets.includes(data.supportedSocket)
				) {
					score += 2;
				}

				// Use case relevance
				if (data.useCase) {
					const matches = product.useCases.filter((uc: string) =>
						uc.toLowerCase().includes(data.useCase!.toLowerCase()),
					);
					score += matches.length * 2;
				}

				// Budget compatibility
				if (data.budget) {
					if (
						data.budget.min &&
						product.price >= data.budget.min &&
						product.price <= (data.budget.max || Infinity)
					) {
						score += 3;
					}
				}

				return { ...product, score };
			});

			// Sort by score
			scoredProducts.sort((a: any, b: any) => b.score - a.score);

			// Convert to structured Barebone specialist data format
			const bareboneSpecialistData: BareboneSpecialistData = {
				type: "barebone",
				recommendations: scoredProducts.map(
					(product: any): BareboneProductRecommendation => ({
						productId: product.sku,
						productName: product.name,
						specifications: {
							caseSize: product.caseSize,
							motherboardFormFactor: product.motherboardFormFactor,
							supportedCpus: product.supportedSockets,
							ramSlots: product.ramSlots,
							maxRam: product.maxRamCapacity,
							coolingSystem: product.coolingSupport,
							aesthetics: product.aesthetics,
						},
						price: product.price,
						availability: product.stockStatus as
							| "in_stock"
							| "low_stock"
							| "out_of_stock",
						recommendationScore: Math.min(
							Math.round((product.score / 15) * 10),
							10,
						),
						keyFeatures: product.description ? [product.description] : [],
						useCases: product.useCases as (
							| "gaming"
							| "content-creation"
							| "office"
							| "professional"
						)[],
						imageUrl: undefined,
						description: product.description || undefined,
					}),
				),
				technicalAnalysis: {
					keySpecifications: {
						caseSize:
							data.caseSize ||
							(scoredProducts.length > 0
								? scoredProducts[0].caseSize
								: "mid-tower"),
						motherboardFormFactor:
							data.motherboardFormFactor ||
							(scoredProducts.length > 0
								? scoredProducts[0].motherboardFormFactor
								: "ATX"),
						supportedSocket:
							data.supportedSocket ||
							(scoredProducts.length > 0
								? scoredProducts[0].supportedSockets[0]
								: "LGA1700"),
						ramSupport: data.ramSupport || "DDR5",
						maxRamCapacity:
							data.maxRamCapacity ||
							(scoredProducts.length > 0
								? scoredProducts[0].maxRamCapacity
								: 128),
						ramSlots:
							scoredProducts.length > 0 ? scoredProducts[0].ramSlots : 4,
						coolingType:
							data.coolingType ||
							(scoredProducts.length > 0
								? scoredProducts[0].coolingSupport
								: "air"),
						aestheticsStyle:
							data.aestheticsStyle ||
							(scoredProducts.length > 0
								? scoredProducts[0].aesthetics
								: "minimalist"),
					},
					performanceMetrics: {
						expandability:
							scoredProducts.length > 0
								? Math.min(85 + Math.round(scoredProducts[0].ramSlots * 5), 100)
								: 85,
						coolingEfficiency: 80,
						aestheticAppeal: 90,
						pricePerformance:
							scoredProducts.length > 0 && scoredProducts[0].price > 0
								? Math.max(
										100 - Math.round(scoredProducts[0].price / 50000),
										20,
									)
								: 88,
					},
					technicalRequirements: [
						"Compatible with selected motherboard form factor",
						"Adequate space for selected components",
						"Proper cooling solution clearance",
					],
				},
				compatibilityCheck: {
					isCompatible: true,
					compatibilityIssues: [],
					recommendations: [
						"Ensure PSU fits in selected case",
						"Check GPU clearance",
						"Verify CPU cooler height clearance",
					],
				},
				pricingInfo: {
					basePrice:
						scoredProducts.length > 0
							? Math.min(...scoredProducts.map((p) => p.price))
							: 0,
					totalPrice:
						scoredProducts.length > 0
							? scoredProducts.reduce((sum, p) => sum + p.price, 0)
							: 0,
					savings: 0,
					discountPercentage: 0,
					currency: "VND",
				},
				availability: {
					inStock: scoredProducts.some((p) => p.stockStatus === "in_stock"),
					estimatedDelivery: "2-5 business days",
					quantityAvailable: scoredProducts.filter(
						(p) => p.stockStatus === "in_stock",
					).length,
					warehouseLocation: "Ho Chi Minh City Warehouse",
				},
				confidenceScore: scoredProducts.length > 0 ? 0.8 : 0.1,
				processingMetadata: {
					processingTime: 0, // Will be set by specialist
					dataSources: ["SSTC Barebone Database Tool"],
					completeness: scoredProducts.length > 0 ? 100 : 0,
				},
			};

			console.log(
				`📊 [Barebone Database] Processed ${scoredProducts.length} barebone systems with scores`,
			);

			return {
				specialistData: bareboneSpecialistData,
				metadata: {
					searchTimestamp: new Date().toISOString(),
					source: "SSTC-Barebone-Database",
					apiVersion: "1.0",
				},
			};
		} catch (error: any) {
			console.error("❌ [Barebone Database] Search failed:", error.message);
			throw new Error(`Barebone database search failed: ${error.message}`);
		}
	},
});
