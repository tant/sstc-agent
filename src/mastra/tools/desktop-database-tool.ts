import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Define the schema for the desktop database tool
const desktopSearchInputSchema = z.object({
	query: z.string().describe("Search query for desktop PC configurations"),
	budget: z
		.object({
			min: z.number().optional().describe("Minimum budget in VND"),
			max: z.number().optional().describe("Maximum budget in VND"),
		})
		.optional()
		.describe("Budget range for filtering"),
	useCase: z
		.enum(["gaming", "content-creation", "office", "professional"])
		.optional()
		.describe("Intended use case"),
	cpuBrand: z.enum(["Intel", "AMD"]).optional().describe("Preferred CPU brand"),
	ramCapacity: z.number().optional().describe("Required RAM capacity in GB"),
	ramType: z.enum(["DDR4", "DDR5"]).optional().describe("Preferred RAM type"),
	storageType: z
		.enum(["SSD", "NVMe", "HDD"])
		.optional()
		.describe("Preferred storage type"),
	storageCapacity: z
		.number()
		.optional()
		.describe("Required storage capacity in GB"),
	caseSize: z
		.enum(["mini-tower", "mid-tower", "full-tower", "small-form-factor"])
		.optional()
		.describe("Preferred case size"),
	coolingPreference: z
		.enum(["air", "liquid"])
		.optional()
		.describe("Cooling solution preference"),
	performanceLevel: z
		.enum(["budget", "mid-range", "high-end"])
		.optional()
		.describe("Performance level preference"),
});

const desktopSearchOutputSchema = z.object({
	specialistData: z.any(), // In a real implementation, this would be more specific
	searchMetadata: z.object({
		totalResults: z.number(),
		searchSummary: z.string(),
		processingTime: z.number(),
		confidenceScore: z.number(),
	}),
	recommendations: z.array(z.any()), // In a real implementation, this would be more specific
});

export const desktopDatabaseTool = createTool({
	id: "desktop-database-search",
	description:
		"Search SSTC desktop PC configuration database and return structured data for specialist agents",
	inputSchema: desktopSearchInputSchema,
	outputSchema: desktopSearchOutputSchema,
	execute: async ({ context }) => {
		const startTime = Date.now();
		console.log("🔍 [DesktopDatabaseTool] Executing with context:", context);

		// For now, we'll return mock data since we don't have a real database
		// In a real implementation, this would query an actual database
		const mockResults = [
			{
				productId: "DT-001",
				productName: "Gaming Beast Pro",
				specifications: {
					cpuModel: "Intel Core i7-12700K",
					ramConfiguration: {
						type: "DDR5",
						capacity: "32GB",
						speed: "5600MHz",
						latency: "CL36",
					},
					storageConfiguration: {
						type: "NVMe",
						capacity: "1TB",
						interface: "M.2",
						speed: "7000MB/s",
					},
					caseModel: "NZXT H5 Flow",
					caseSize: "mid-tower",
					powerSupply: "850W 80+ Gold",
					coolingSolution: "Air Cooling",
				},
				price: 15000000,
				availability: "in_stock",
				recommendationScore: 95,
				keyFeatures: [
					"High performance gaming",
					"Future upgradeable",
					"RGB lighting",
				],
				useCases: ["gaming", "content-creation"],
				description:
					"High-performance gaming desktop with Intel i7 and DDR5 RAM",
			},
		];

		return {
			specialistData: {
				type: "desktop",
				recommendations: mockResults,
				// Add other required fields as needed
			},
			searchMetadata: {
				totalResults: mockResults.length,
				searchSummary: `Found ${mockResults.length} desktop configurations matching criteria`,
				processingTime: Date.now() - startTime,
				confidenceScore: 0.9,
			},
			recommendations: mockResults,
		};
	},
});
