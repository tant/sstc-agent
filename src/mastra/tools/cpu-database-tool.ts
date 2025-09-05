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

// Output schema for CPU database tool - sử dụng schema thống nhất
const cpuSearchOutputSchema = z.object({
	specialistData: z.custom<CPUSpecialistData>(),
	searchMetadata: z.object({
		totalResults: z.number(),
		searchSummary: z.string(),
		processingTime: z.number(),
		confidenceScore: z.number().min(0).max(1),
	}),
	recommendations: z.array(z.string()),
});

export const cpuDatabaseTool = createTool({
	id: "cpu-database-search",
	description:
		"Search SSTC CPU product database and return structured data for specialist agents",
	inputSchema: cpuSearchInputSchema,
	outputSchema: cpuSearchOutputSchema,
	execute: async ({ context, mastra }) => {
		const inputData = context as any;
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
			// Get database connection
			const db = mastra.getStorage();

			// Build query based on filters
			let sqlQuery = `
        SELECT * FROM products 
        WHERE category = 'CPU' OR Loại sản phẩm = 'CPU'
      `;

			const params: any[] = [];

			// Add search term filter
			if (query) {
				sqlQuery += ` AND (Tên sản phẩm LIKE ? OR USP LIKE ? OR Tags LIKE ?)`;
				const searchTerm = `%${query}%`;
				params.push(searchTerm, searchTerm, searchTerm);
			}

			// Add brand filter
			if (brand) {
				sqlQuery += ` AND brand = ?`;
				params.push(brand);
			}

			// Add series filter
			if (series) {
				sqlQuery += ` AND series = ?`;
				params.push(series);
			}

			// Add socket filter
			if (socket) {
				sqlQuery += ` AND socket = ?`;
				params.push(socket);
			}

			// Add cores filter
			if (cores) {
				sqlQuery += ` AND cores = ?`;
				params.push(cores);
			}

			// Add threads filter
			if (threads) {
				sqlQuery += ` AND threads = ?`;
				params.push(threads);
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
				sqlQuery += ` AND Tương thích CPU LIKE ?`;
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
					brand: row.brand || "",
					series: row.series || "",
					socket: row.socket || "",
					cores: parseInt(row.cores || "0", 10),
					threads: parseInt(row.threads || "0", 10),
					baseClock: row.base_clock || "",
					boostClock: row.boost_clock || "",
					powerConsumption: row.power_consumption || "",
					l3Cache: row.l3_cache || "",
					architecture: row.architecture || "",
					integratedGraphics: row.integrated_graphics || "",
					price: price,
					compatibility: row["Tương thích CPU"]
						? row["Tương thích CPU"].split(",")
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

				// Brand matching
				if (
					brand &&
					product.brand &&
					product.brand.toLowerCase().includes(brand.toLowerCase())
				) {
					score += 3;
				}

				// Series matching
				if (
					series &&
					product.series &&
					product.series.toLowerCase().includes(series.toLowerCase())
				) {
					score += 3;
				}

				// Socket matching
				if (
					socket &&
					product.socket &&
					product.socket.toLowerCase().includes(socket.toLowerCase())
				) {
					score += 2;
				}

				// Cores matching
				if (cores && product.cores === cores) {
					score += 2;
				}

				// Threads matching
				if (threads && product.threads === threads) {
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

			// Convert to structured CPU specialist data format
			const cpuSpecialistData: CPUSpecialistData = {
				type: "cpu",
				recommendations: scoredProducts.map(
					(product: any): CPUProductRecommendation => ({
						productId: product.sku,
						productName: product.name,
						specifications: {
							socket: product.socket,
							cores: product.cores,
							threads: product.threads,
							baseClock: product.baseClock,
							boostClock: product.boostClock,
							powerConsumption: product.powerConsumption,
							l3Cache: product.l3Cache,
							architecture: product.architecture,
							integratedGraphics: product.integratedGraphics,
						},
						price: product.price,
						availability: product.stockStatus as
							| "in_stock"
							| "low_stock"
							| "out_of_stock",
						recommendationScore: product.score,
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
						socket:
							socket ||
							(scoredProducts.length > 0
								? scoredProducts[0].socket
								: "LGA1700"),
						coreCount: scoredProducts.length > 0 ? scoredProducts[0].cores : 4,
						threadCount:
							scoredProducts.length > 0 ? scoredProducts[0].threads : 8,
						baseFrequency:
							scoredProducts.length > 0
								? scoredProducts[0].baseClock
								: "3.0GHz",
						boostFrequency:
							scoredProducts.length > 0
								? scoredProducts[0].boostClock
								: "4.5GHz",
						powerConsumption:
							scoredProducts.length > 0
								? scoredProducts[0].powerConsumption
								: "65W",
						l3Cache:
							scoredProducts.length > 0 ? scoredProducts[0].l3Cache : "8MB",
						architecture:
							scoredProducts.length > 0
								? scoredProducts[0].architecture
								: "Unknown",
					},
					performanceMetrics: {
						singleCorePerformance:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											(parseFloat(
												scoredProducts[0].baseClock?.replace("GHz", "") || "0",
											) /
												5) *
												100,
										),
									)
								: 60,
						multiCorePerformance:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(0, (scoredProducts[0].cores / 16) * 100),
									)
								: 25,
						powerEfficiency:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											100 -
												parseInt(
													scoredProducts[0].powerConsumption?.replace(
														"W",
														"",
													) || "65",
													10,
												) /
													2,
										),
									)
								: 67,
						thermalPerformance:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											100 -
												parseInt(
													scoredProducts[0].powerConsumption?.replace(
														"W",
														"",
													) || "65",
													10,
												) /
													3,
										),
									)
								: 78,
					},
					technicalRequirements: [
						"Compatible motherboard with matching CPU socket",
						"Adequate power supply for system requirements",
						"Proper cooling solution for CPU thermal design power",
						"Compatible RAM for optimal performance",
					],
				},
				compatibilityCheck: {
					isCompatible: true,
					compatibilityIssues: motherboardCompatibility
						? []
						: ["Motherboard compatibility not specified"],
					recommendations: [
						"Ensure motherboard supports selected CPU socket and chipset",
						"Check available power phases for high-end CPUs",
						"Verify cooling solution compatibility with CPU TDP",
						"Ensure RAM compatibility with CPU and motherboard",
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
					"Không tìm thấy sản phẩm CPU phù hợp. Hãy thử mở rộng ngân sách hoặc điều chỉnh yêu cầu.",
				);
			} else {
				const avgPrice =
					scoredProducts.reduce((sum: number, p: any) => sum + p.price, 0) /
					scoredProducts.length;
				if (avgPrice > 5000000) {
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
						"Đảm bảo chọn CPU có xung nhịp cao để tối ưu hiệu năng gaming",
					);
				}

				recommendations.push(
					"Kiểm tra tương thích motherboard trước khi mua để đảm bảo hiệu suất tối ưu",
				);
			}

			const searchSummary =
				scoredProducts.length === 0
					? `Không tìm thấy sản phẩm CPU nào cho "${query}"`
					: `Tìm thấy ${scoredProducts.length} sản phẩm CPU phù hợp`;

			console.log("✅ [CPU DB] Results:", {
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
				specialistData: cpuSpecialistData,
				searchMetadata: {
					totalResults: scoredProducts.length,
					searchSummary,
					processingTime: Date.now() - startTime,
					confidenceScore: cpuSpecialistData.confidenceScore,
				},
				recommendations,
			};
		} catch (error) {
			console.error("❌ [CPU DB] Search failed:", error);
			throw new Error(
				`CPU database search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});
