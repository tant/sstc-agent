import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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
});

const bareboneSearchOutputSchema = z.object({
	specialistData: z.any(), // In a real implementation, this would be more specific
	searchMetadata: z.object({
		totalResults: z.number(),
		searchSummary: z.string(),
		processingTime: z.number(),
		confidenceScore: z.number(),
	}),
	recommendations: z.array(z.any()), // In a real implementation, this would be more specific
});

export const bareboneDatabaseTool = createTool({
	id: "barebone-database-search",
	description:
		"Search SSTC barebone system database and return structured data for specialist agents",
	inputSchema: bareboneSearchInputSchema,
	outputSchema: bareboneSearchOutputSchema,
	execute: async ({ context }) => {
		const startTime = Date.now();
		console.log("🔍 [BareboneDatabaseTool] Executing with context:", context);

		// For now, we'll return mock data since we don't have a real database
		// In a real implementation, this would query an actual database
		const mockResults = [
			{
				productId: "BB-001",
				productName: "NZXT H5 Flow",
				specifications: {
					caseSize: "mid-tower",
					motherboardFormFactor: "ATX",
					supportedSocket: "LGA1700",
					ramSupport: "DDR5",
					maxRamCapacity: 128,
					ramSlots: 4,
					coolingSystem: "air",
					aesthetics: "minimalist",
				},
				price: 2500000,
				availability: "in_stock",
				recommendationScore: 95,
				keyFeatures: [
					"Excellent airflow",
					"Cable management",
					"Tempered glass side panel",
				],
				useCases: ["gaming", "content-creation"],
				description: "Mid-tower case with excellent airflow and modern design",
			},
		];

		return {
			specialistData: {
				type: "barebone",
				recommendations: mockResults,
				// Add other required fields as needed
			},
			searchMetadata: {
				totalResults: mockResults.length,
				searchSummary: `Found ${mockResults.length} barebone systems matching criteria`,
				processingTime: Date.now() - startTime,
				confidenceScore: 0.85,
			},
			recommendations: mockResults,
		};
	},
});
