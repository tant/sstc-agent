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
	formFactor: z.enum(["UDIMM", "SODIMM"]).optional(),
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

// Output schema for RAM database tool - structured data format
const ramSearchOutputSchema = z.object({
	specialistData: z.custom<RAMSpecialistData>(),
	searchMetadata: z.object({
		totalResults: z.number(),
		searchSummary: z.string(),
		processingTime: z.number(),
		confidenceScore: z.number().min(0).max(1),
	}),
	recommendations: z.array(z.string()),
});

export const ramDatabaseTool = createTool({
	id: "ram-database-search",
	description:
		"Search SSTC RAM product database and return structured data for specialist agents",
	inputSchema: ramSearchInputSchema,
	outputSchema: ramSearchOutputSchema,
	execute: async ({ context, mastra }) => {
		const inputData = context as any;
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
			// Get database connection
			const db = mastra.getStorage();

			// Build query based on filters
			let sqlQuery = `
        SELECT * FROM products 
        WHERE category = 'RAM' OR Loại sản phẩm = 'RAM'
      `;

			const params: any[] = [];

			// Add search term filter
			if (query) {
				sqlQuery += ` AND (Tên sản phẩm LIKE ? OR USP LIKE ? OR Tags LIKE ?)`;
				const searchTerm = `%${query}%`;
				params.push(searchTerm, searchTerm, searchTerm);
			}

			// Add capacity filter
			if (capacity) {
				sqlQuery += ` AND quantity = ?`;
				params.push(capacity);
			}

			// Add type filter
			if (type) {
				sqlQuery += ` AND type = ?`;
				params.push(type);
			}

			// Add speed filter
			if (speed) {
				sqlQuery += ` AND speed LIKE ?`;
				params.push(`%${speed}%`);
			}

			// Add form factor filter
			if (formFactor) {
				sqlQuery += ` AND form_factor = ?`;
				params.push(formFactor);
			}

			// Add budget filter
			if (budget) {
				if (budget.min) {
					sqlQuery += ` AND Giá >= ?`;
					params.push(budget.min);
				}
				if (budget.max) {
					sqlQuery += ` AND Giá <= ?`;
					params.push(budget.max);
				}
			}

			// Add use case filter
			if (useCase) {
				sqlQuery += ` AND Recommended_Use LIKE ?`;
				params.push(`%${useCase}%`);
			}

			// Add motherboard compatibility filter
			if (motherboardCompatibility) {
				sqlQuery += ` AND Tương thích RAM LIKE ?`;
				params.push(`%${motherboardCompatibility}%`);
			}

			// Order by price and limit results
			sqlQuery += ` ORDER BY CAST(REPLACE(Giá, ',', '') AS REAL) ASC LIMIT 10`;

			console.log("Executing SQL query:", sqlQuery, params);

			// Execute query
			const result: any = await db.query({
				sql: sqlQuery,
				args: params,
			});

			console.log("Database query result:", result);

			// Process results into structured format
			const products = result.rows.map((row: any) => {
				// Parse price (remove currency formatting)
				const priceText = row.Giá?.toString() || "0";
				const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;

				return {
					sku: row.SKU || "",
					name: row["Tên sản phẩm"] || "",
					type: row.type || "",
					capacity: row.quantity || "",
					speed: row.speed || "",
					latency: row.latency || "",
					voltage: row.voltage || "",
					formFactor: row.form_factor || "",
					price: price,
					compatibility: row["Tương thích RAM"]
						? row["Tương thích RAM"].split(",")
						: [],
					useCases: row.Recommended_Use ? row.Recommended_Use.split(",") : [],
					score: 0, // Will be calculated later
					stockStatus: row.Availability || "unknown",
					description: row.USP || "",
				};
			});

			// Score products based on relevance
			const scoredProducts = products.map((product: any) => {
				let score = 0;

				// Exact name match gets high score
				if (product.name.toLowerCase().includes(query.toLowerCase())) {
					score += 5;
				}

				// Capacity matching
				if (
					capacity &&
					product.capacity &&
					product.capacity.toLowerCase().includes(capacity.toLowerCase())
				) {
					score += 3;
				}

				// Type matching
				if (
					type &&
					product.type &&
					product.type.toLowerCase().includes(type.toLowerCase())
				) {
					score += 3;
				}

				// Speed matching
				if (
					speed &&
					product.speed &&
					product.speed.toLowerCase().includes(speed.toLowerCase())
				) {
					score += 2;
				}

				// Form factor matching
				if (
					formFactor &&
					product.formFactor &&
					product.formFactor.toLowerCase().includes(formFactor.toLowerCase())
				) {
					score += 2;
				}

				// Use case relevance
				if (useCase) {
					const matches = product.useCases.filter((uc: string) =>
						uc.toLowerCase().includes(useCase.toLowerCase()),
					);
					score += matches.length * 2;
				}

				// Budget compatibility
				if (budget) {
					if (
						budget.min &&
						product.price >= budget.min &&
						product.price <= (budget.max || Infinity)
					) {
						score += 3;
					}
				}

				return { ...product, score };
			});

			// Sort by score
			scoredProducts.sort((a: any, b: any) => b.score - a.score);

			// Convert to structured RAM specialist data format
			const ramSpecialistData: RAMSpecialistData = {
				type: "ram",
				recommendations: scoredProducts.map(
					(product: any): RAMProductRecommendation => ({
						productId: product.sku,
						productName: product.name,
						specifications: {
							type: product.type,
							capacity: product.capacity,
							speed: product.speed,
							latency: product.latency,
							voltage: product.voltage,
							formFactor: product.formFactor,
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
						imageUrl: product.imageUrl || undefined,
						description: product.description || undefined,
					}),
				),
				technicalAnalysis: {
					keySpecifications: {
						type:
							type ||
							(scoredProducts.length > 0 ? scoredProducts[0].type : "DDR4"),
						capacity:
							capacity ||
							(scoredProducts.length > 0 ? scoredProducts[0].capacity : "8GB"),
						speed:
							scoredProducts.length > 0 ? scoredProducts[0].speed : "2400MHz",
						latency:
							scoredProducts.length > 0 ? scoredProducts[0].latency : "CL16",
						voltage:
							scoredProducts.length > 0 ? scoredProducts[0].voltage : "1.2V",
						formFactor:
							formFactor ||
							(scoredProducts.length > 0
								? scoredProducts[0].formFactor
								: "UDIMM"),
					},
					performanceMetrics: {
						speedRating:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											(parseInt(
												scoredProducts[0].speed?.replace("MHz", "") || "2400",
												10,
											) /
												5000) *
												100,
										),
									)
								: 48,
						latencyRating:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											100 -
												parseInt(
													scoredProducts[0].latency?.replace("CL", "") || "16",
													10,
												) *
													2,
										),
									)
								: 68,
						compatibilityScore: motherboardCompatibility ? 90 : 70,
						powerEfficiency:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											100 -
												parseFloat(
													scoredProducts[0].voltage?.replace("V", "") || "1.2",
												) *
													20,
										),
									)
								: 76,
					},
					technicalRequirements: [
						"Compatible motherboard with matching RAM slot type",
						"Adequate power supply for system requirements",
						"Proper installation in correct slot configuration",
						"Compatible with existing RAM modules (if upgrading)",
					],
				},
				compatibilityCheck: {
					isCompatible: true,
					compatibilityIssues: motherboardCompatibility
						? []
						: ["Motherboard compatibility not specified"],
					recommendations: [
						"Ensure motherboard supports selected RAM type and speed",
						"Check available slots for dual channel configuration",
						"Verify power requirements for high-speed RAM",
						"Ensure RAM compatibility with CPU and chipset",
					],
				},
				pricingInfo: {
					basePrice:
						scoredProducts.length > 0
							? Math.min(...scoredProducts.map((p: any) => p.price))
							: 0,
					totalPrice:
						scoredProducts.length > 0
							? scoredProducts.reduce((sum: number, p: any) => sum + p.price, 0)
							: 0,
					savings:
						scoredProducts.length > 0
							? Math.max(...scoredProducts.map((p: any) => p.price)) -
								Math.min(...scoredProducts.map((p: any) => p.price))
							: 0,
					discountPercentage:
						scoredProducts.length > 0
							? ((Math.max(...scoredProducts.map((p: any) => p.price)) -
									Math.min(...scoredProducts.map((p: any) => p.price))) /
									Math.max(...scoredProducts.map((p: any) => p.price))) *
									100 || 0
							: 0,
					currency: "VND",
				},
				availability: {
					inStock: scoredProducts.some(
						(p: any) => p.stockStatus === "in_stock",
					),
					estimatedDelivery: "2-5 business days",
					quantityAvailable: scoredProducts.filter(
						(p: any) => p.stockStatus === "in_stock",
					).length,
					warehouseLocation: "Ho Chi Minh City Warehouse",
				},
				confidenceScore:
					scoredProducts.length > 0
						? Math.min(1, Math.max(0.1, scoredProducts[0].score / 10))
						: 0.1,
				processingMetadata: {
					processingTime: Date.now() - startTime,
					dataSources: ["SSTC Product Database"],
					completeness: scoredProducts.length > 0 ? 100 : 0,
				},
			};

			// Generate recommendations
			const recommendations = [];

			if (scoredProducts.length === 0) {
				recommendations.push(
					"Không tìm thấy sản phẩm RAM phù hợp. Hãy thử mở rộng ngân sách hoặc điều chỉnh yêu cầu.",
				);
			} else {
				const avgPrice =
					scoredProducts.reduce((sum: number, p: any) => sum + p.price, 0) /
					scoredProducts.length;
				if (avgPrice > 2000000) {
					recommendations.push(
						"Xem xét phiên bản cấu hình thấp hơn để tiết kiệm ngân sách",
					);
				}

				if (
					scoredProducts.some((p: any) =>
						p.useCases.some((uc: string) =>
							uc.toLowerCase().includes("gaming"),
						),
					)
				) {
					recommendations.push(
						"Đảm bảo chọn RAM có tốc độ cao để tối ưu hiệu năng gaming",
					);
				}

				recommendations.push(
					"Kiểm tra tương thích motherboard trước khi mua để đảm bảo hiệu suất tối ưu",
				);
			}

			const searchSummary =
				scoredProducts.length === 0
					? `Không tìm thấy sản phẩm RAM nào cho "${query}"`
					: `Tìm thấy ${scoredProducts.length} sản phẩm RAM phù hợp`;

			console.log("✅ [RAM DB] Results:", {
				totalFound: scoredProducts.length,
				averageScore:
					scoredProducts.length > 0
						? (
								scoredProducts.reduce(
									(sum: number, p: any) => sum + p.score,
									0,
								) / scoredProducts.length
							).toFixed(1)
						: 0,
				processingTime: Date.now() - startTime,
			});

			return {
				specialistData: ramSpecialistData,
				searchMetadata: {
					totalResults: scoredProducts.length,
					searchSummary,
					processingTime: Date.now() - startTime,
					confidenceScore: ramSpecialistData.confidenceScore,
				},
				recommendations,
			};
		} catch (error) {
			console.error("❌ [RAM DB] Search failed:", error);
			throw new Error(
				`RAM database search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});
