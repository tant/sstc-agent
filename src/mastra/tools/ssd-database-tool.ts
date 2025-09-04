import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
	SpecialistData,
	StorageSpecialistData,
	StorageProductRecommendation,
	StorageTechnicalAnalysis,
} from "../core/models/specialist-data-models";

// Input schema for SSD database tool
const ssdSearchInputSchema = z.object({
	query: z.string().min(1, "Search query is required"),
	capacity: z
		.enum([
			"120GB",
			"240GB",
			"250GB",
			"256GB",
			"480GB",
			"500GB",
			"512GB",
			"1TB",
			"2TB",
			"4TB",
		])
		.optional(),
	interface: z.enum(["SATA", "NVMe"]).optional(),
	formFactor: z
		.enum(["2.5 inch", "M.2 2280", "M.2 2242", "M.2 2230"])
		.optional(),
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

// Output schema for SSD database tool - structured data format
const ssdSearchOutputSchema = z.object({
	specialistData: z.custom<StorageSpecialistData>(),
	searchMetadata: z.object({
		totalResults: z.number(),
		searchSummary: z.string(),
		processingTime: z.number(),
		confidenceScore: z.number().min(0).max(1),
	}),
	recommendations: z.array(z.string()),
});

export const ssdDatabaseTool = createTool({
	id: "ssd-database-search",
	description:
		"Search SSTC SSD product database and return structured data for specialist agents",
	inputSchema: ssdSearchInputSchema,
	outputSchema: ssdSearchOutputSchema,
	execute: async ({ context, mastra }) => {
		const inputData = context as any;
		const {
			query,
			capacity,
			interface: iface,
			formFactor,
			budget,
			useCase,
			motherboardCompatibility,
		} = inputData;

		console.log("🔍 [SSD DB] Searching:", {
			query,
			capacity,
			interface: iface,
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
        WHERE category = 'SSD' OR Loại sản phẩm = 'SSD'
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

			// Add interface filter
			if (iface) {
				sqlQuery += ` AND interface = ?`;
				params.push(iface);
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
				sqlQuery += ` AND Tương thích SSD LIKE ?`;
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
					interface: row.interface || "",
					capacity: row.quantity || "",
					readSpeed: row.read_speed || "",
					writeSpeed: row.write_speed || "",
					formFactor: row.form_factor || "",
					endurance: row.endurance || "",
					controller: row.controller || "",
					nandType: row.nand_type || "",
					price: price,
					compatibility: row["Tương thích SSD"]
						? row["Tương thích SSD"].split(",")
						: [],
					useCases: row["Recommended_Use"]
						? row["Recommended_Use"].split(",")
						: [],
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

				// Interface matching
				if (
					iface &&
					product.interface &&
					product.interface.toLowerCase().includes(iface.toLowerCase())
				) {
					score += 3;
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

			// Convert to structured Storage specialist data format
			const storageSpecialistData: StorageSpecialistData = {
				type: "storage",
				recommendations: scoredProducts.map(
					(product: any): StorageProductRecommendation => ({
						productId: product.sku,
						productName: product.name,
						specifications: {
							interface: product.interface as "SATA" | "NVMe",
							capacity: product.capacity,
							readSpeed: product.readSpeed,
							writeSpeed: product.writeSpeed,
							formFactor: product.formFactor,
							endurance: product.endurance,
							controller: product.controller || undefined,
							nandType: product.nandType || undefined,
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
						interface:
							iface ||
							(scoredProducts.length > 0
								? scoredProducts[0].interface
								: "SATA"),
						capacity:
							capacity ||
							(scoredProducts.length > 0
								? scoredProducts[0].capacity
								: "250GB"),
						readSpeed:
							scoredProducts.length > 0
								? scoredProducts[0].readSpeed
								: "500MB/s",
						writeSpeed:
							scoredProducts.length > 0
								? scoredProducts[0].writeSpeed
								: "400MB/s",
						formFactor:
							formFactor ||
							(scoredProducts.length > 0
								? scoredProducts[0].formFactor
								: "2.5 inch"),
						endurance:
							scoredProducts.length > 0
								? scoredProducts[0].endurance
								: "300TBW",
						controller:
							scoredProducts.length > 0
								? scoredProducts[0].controller
								: "Unknown",
						nandType:
							scoredProducts.length > 0 ? scoredProducts[0].nandType : "TLC",
					},
					performanceMetrics: {
						readPerformance:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											(parseInt(
												scoredProducts[0].readSpeed?.replace("MB/s", "") ||
													"500",
											) /
												7000) *
												100,
										),
									)
								: 7,
						writePerformance:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											(parseInt(
												scoredProducts[0].writeSpeed?.replace("MB/s", "") ||
													"400",
											) /
												7000) *
												100,
										),
									)
								: 6,
						enduranceRating:
							scoredProducts.length > 0
								? Math.min(
										100,
										Math.max(
											0,
											(parseInt(
												scoredProducts[0].endurance?.replace("TBW", "") ||
													"300",
											) /
												1000) *
												100,
										),
									)
								: 30,
						compatibilityScore: motherboardCompatibility ? 90 : 70,
					},
					technicalRequirements: [
						"Compatible motherboard with matching interface slot",
						"Adequate power supply for system requirements",
						"Proper installation in correct slot configuration",
						"Compatible with existing storage setup",
					],
				},
				compatibilityCheck: {
					isCompatible: true,
					compatibilityIssues: motherboardCompatibility
						? []
						: ["Motherboard compatibility not specified"],
					recommendations: [
						"Ensure motherboard supports selected SSD interface and form factor",
						'Check available slots for M.2 or 2.5" installation',
						"Verify power requirements for high-performance SSDs",
						"Ensure SSD compatibility with system BIOS/UEFI",
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
					"Không tìm thấy sản phẩm SSD phù hợp. Hãy thử mở rộng ngân sách hoặc điều chỉnh yêu cầu.",
				);
			} else {
				const avgPrice =
					scoredProducts.reduce((sum: number, p: any) => sum + p.price, 0) /
					scoredProducts.length;
				if (avgPrice > 3000000) {
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
						"Đảm bảo chọn SSD có tốc độ đọc/ghi cao để tối ưu hiệu năng gaming",
					);
				}

				recommendations.push(
					"Kiểm tra tương thích motherboard trước khi mua để đảm bảo hiệu suất tối ưu",
				);
			}

			const searchSummary =
				scoredProducts.length === 0
					? `Không tìm thấy sản phẩm SSD nào cho "${query}"`
					: `Tìm thấy ${scoredProducts.length} sản phẩm SSD phù hợp`;

			console.log("✅ [SSD DB] Results:", {
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
				specialistData: storageSpecialistData,
				searchMetadata: {
					totalResults: scoredProducts.length,
					searchSummary,
					processingTime: Date.now() - startTime,
					confidenceScore: storageSpecialistData.confidenceScore,
				},
				recommendations,
			};
		} catch (error) {
			console.error("❌ [SSD DB] Search failed:", error);
			throw new Error(
				`SSD database search failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
});
