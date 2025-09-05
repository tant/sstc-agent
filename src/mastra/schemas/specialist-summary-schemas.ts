import { z } from "zod";

/**
 * Base schema for specialist summary responses
 * Used for parallel processing and quick summaries
 */
export const SpecialistSummarySchema = z.object({
	category: z.enum(["CPU", "RAM", "SSD", "Barebone", "Desktop"]),
	popular_products: z.array(
		z.object({
			name: z.string(),
			price: z.string(),
			specs: z.string(),
			use_case: z.string(),
		}),
	),
	price_range: z.string(),
	summary: z.string(),
	recommendations: z.array(z.string()),
	processing_time_note: z.string().optional(),
});

/**
 * CPU-specific summary schema
 */
export const CPUSummarySchema = z.object({
	category: z.literal("CPU"),
	popular_products: z.array(
		z.object({
			name: z.string(),
			price: z.string(),
			specs: z.string(), // cores, clock speed
			use_case: z.enum(["Gaming", "Office", "Content Creation", "Budget"]),
		}),
	),
	price_range: z.string(),
	summary: z.string(),
	recommendations: z.array(z.string()),
	brands_available: z.array(z.enum(["Intel", "AMD"])),
	socket_types: z.array(z.string()).optional(),
});

/**
 * RAM-specific summary schema
 */
export const RAMSummarySchema = z.object({
	category: z.literal("RAM"),
	popular_products: z.array(
		z.object({
			name: z.string(),
			price: z.string(),
			specs: z.string(), // capacity, speed, type
			use_case: z.enum(["Gaming", "Office", "Content Creation", "Server"]),
		}),
	),
	price_range: z.string(),
	summary: z.string(),
	recommendations: z.array(z.string()),
	memory_types: z.array(z.enum(["DDR4", "DDR5"])),
	capacities: z.array(z.string()).optional(), // ["8GB", "16GB", "32GB"]
});

/**
 * SSD-specific summary schema
 */
export const SSDSummarySchema = z.object({
	category: z.literal("SSD"),
	popular_products: z.array(
		z.object({
			name: z.string(),
			price: z.string(),
			specs: z.string(), // capacity, interface, speed
			use_case: z.enum(["Gaming", "Office", "Content Creation", "Budget"]),
		}),
	),
	price_range: z.string(),
	summary: z.string(),
	recommendations: z.array(z.string()),
	interface_types: z.array(z.enum(["NVMe", "SATA", "PCIe"])),
	capacities: z.array(z.string()).optional(), // ["256GB", "512GB", "1TB"]
});

/**
 * Barebone-specific summary schema
 */
export const BareboneSummarySchema = z.object({
	category: z.literal("Barebone"),
	popular_products: z.array(
		z.object({
			name: z.string(),
			price: z.string(),
			specs: z.string(), // form factor, features
			use_case: z.enum([
				"Gaming Build",
				"Office Build",
				"Compact PC",
				"Workstation",
			]),
		}),
	),
	price_range: z.string(),
	summary: z.string(),
	recommendations: z.array(z.string()),
	form_factors: z.array(z.string()).optional(), // ["ATX", "mATX", "ITX"]
	compatible_components: z.array(z.string()).optional(),
});

/**
 * Desktop-specific summary schema
 */
export const DesktopSummarySchema = z.object({
	category: z.literal("Desktop"),
	popular_products: z.array(
		z.object({
			name: z.string(),
			price: z.string(),
			specs: z.string(), // CPU, RAM, storage summary
			use_case: z.enum([
				"Gaming",
				"Office",
				"Content Creation",
				"Budget",
				"High Performance",
			]),
		}),
	),
	price_range: z.string(),
	summary: z.string(),
	recommendations: z.array(z.string()),
	build_types: z.array(z.string()).optional(), // ["Gaming", "Workstation", "HTPC"]
	warranty_info: z.string().optional(),
});

/**
 * Combined schema for all specialist responses
 */
export type SpecialistSummary =
	| z.infer<typeof CPUSummarySchema>
	| z.infer<typeof RAMSummarySchema>
	| z.infer<typeof SSDSummarySchema>
	| z.infer<typeof BareboneSummarySchema>
	| z.infer<typeof DesktopSummarySchema>;

/**
 * Multi-agent response schema
 */
export const MultiAgentResponseSchema = z.object({
	specialist_results: z.array(SpecialistSummarySchema),
	completed_agents: z.array(z.string()),
	timed_out_agents: z.array(z.string()),
	execution_time_ms: z.number(),
	total_products_found: z.number(),
	response_quality: z.enum(["complete", "partial", "fallback"]),
});

/**
 * Runtime context schema for summary mode
 */
export const SummaryModeContextSchema = z.object({
	mode: z.literal("quick-summary"),
	user_intent: z.string(),
	original_message: z.string(),
	timeout_ms: z.number().default(3000),
	max_products: z.number().default(3),
	include_prices: z.boolean().default(true),
});

export type SummaryModeContext = z.infer<typeof SummaryModeContextSchema>;