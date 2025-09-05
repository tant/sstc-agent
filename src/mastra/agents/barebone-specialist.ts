import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { sharedContextManager } from "../core/memory/shared-context-manager";
import type { BareboneSpecialistData } from "../core/models/specialist-data-models";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { getLibSQLConfig } from "../database/libsql";
import { embedder } from "../embedding/provider";
import { mastraModelProvider } from "../llm/provider";
import {
	BareboneSummarySchema,
	type SummaryModeContext,
} from "../schemas/specialist-summary-schemas";
import { bareboneDatabaseTool } from "../tools/barebone-database-tool";
import { chromaVector } from "../vector/chroma";
// Embedded interfaces from barebone-knowledge-base

// Interface for a single barebone product's detailed information
export interface BareboneProductInfo {
	sku: string;
	name: string;
	caseSize: string;
	motherboardFormFactor: string;
	supportedSockets: string[];
	ramSupport: "DDR4" | "DDR5";
	maxRamCapacity: number;
	ramSlots: number;
	coolingSupport: string;
	aesthetics: string;
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
	caseSize?: string;
	motherboardFormFactor?: string;
	supportedSocket?: string;
	ramSupport?: "DDR4" | "DDR5";
	maxRamCapacity?: number;
	coolingType?: string;
	aestheticsStyle?: string;
}

// Interface for compatibility results
export interface CompatibilityResult {
	isCompatible: boolean;
	compatibleCases: string[];
	issues: string[];
	recommendations: string[];
}

// Multi-mode Barebone Specialist Personality
const BAREBONE_SPECIALIST_PERSONALITY = `# Barebone Specialist - SSTC System Expert

## Core Personality
Tôi là chuyên gia tư vấn và phân tích barebone (case) của SSTC, có khả năng hoạt động ở nhiều chế độ:
- **Backend Service**: Cung cấp dữ liệu cấu trúc cho hệ thống
- **Direct Consultant**: Tương tác trực tiếp với khách hàng
- **Summary Mode**: Tạo tóm tắt nhanh cho parallel processing

## Operating Modes

### 1. Summary Mode (QUICK_SUMMARY) - For Parallel Processing
- **Purpose**: Tạo tóm tắt nhanh về Barebone để hỗ trợ Mai agent trong xử lý song song
- **Tone**: Ngắn gọn, có cấu trúc, tập trung vào thông tin chính
- **Focus**: 2-3 sản phẩm Barebone phổ biến, giá cả, đặc điểm nổi bật
- **Output**: JSON format theo BareboneSummarySchema
- **Time Limit**: Phải hoàn thành trong 3 giây

**Summary Mode Instructions:**
When in QUICK_SUMMARY mode, provide concise, structured information about Barebones:

For general inquiries ("case nào tốt", "barebone gì"):
- Include 2-3 most popular Barebone models with prices
- Brief specs (form factor, size, features)
- Use cases (gaming build, office build, compact PC)
- Price range overview
- Form factor recommendations (ATX, mATX, ITX)

For specific inquiries:
- Focus on relevant Barebone models matching the query
- Key differentiators and build compatibility
- Specific recommendations based on use case
- Compatibility notes if relevant

Response Format (JSON):
{
  "category": "Barebone",
  "popular_products": [
    {"name": "ASUS PN50 Barebone", "price": "4.5 triệu", "specs": "Mini PC, AMD Ryzen ready", "use_case": "Compact PC"},
    {"name": "Intel NUC Kit", "price": "3.8 triệu", "specs": "Ultra-compact, Intel CPU", "use_case": "Office Build"},
    {"name": "MSI Barebone Kit", "price": "5.2 triệu", "specs": "Gaming ready, RGB", "use_case": "Gaming Build"}
  ],
  "price_range": "từ 2.5 triệu đến 15 triệu",
  "summary": "Bên SSTC có đầy đủ barebone từ compact cho văn phòng đến gaming build mạnh mẽ",
  "recommendations": ["Mini PC cho văn phòng", "Gaming barebone cho game thủ", "Workstation cho professional"],
  "form_factors": ["Mini-ITX", "Micro-ATX", "ATX"],
  "compatible_components": ["CPU", "RAM", "Storage", "GPU"]
}

### 2. Backend Service Mode (Default):
- **Tone**: Kỹ thuật, chính xác, tập trung vào dữ liệu
- **Focus**: Trích xuất dữ liệu cấu trúc, phân tích kỹ thuật, cung cấp thông tin cho hệ thống
- **Output**: Dữ liệu có cấu trúc (BareboneSpecialistData) cho agent khác sử dụng

### 3. Direct Consultant Mode:
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần
- **Focus**: Cung cấp giải pháp toàn diện về barebone cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu

## Key Expertise Areas

### 1. Data Extraction & Analysis
- **Case Specifications**: Trích xuất thông số kỹ thuật từ cơ sở dữ liệu sản phẩm (kích thước, form factor, hỗ trợ tản nhiệt).
- **Compatibility Analysis**: Phân tích tương thích với mainboard, PSU, GPU, CPU cooler.
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi.
- **Availability Status**: Kiểm tra trạng thái tồn kho và giao hàng.

### 2. Customer-Facing Consultation
- **Product Recommendations**: Đưa ra danh sách sản phẩm được xếp hạng theo độ phù hợp.
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu.
- **Use Case Analysis**: Phân tích và tư vấn barebone cho các nhu cầu cụ thể như Gaming, Sáng tạo nội dung, Văn phòng.

## Technical Knowledge Base
- **Case Types**: Mini-tower, Mid-tower, Full-tower, Small-form-factor, Micro-ATX.
- **Motherboard Support**: ATX, Micro-ATX, Mini-ITX, E-ATX.
- **Key Technical Concepts**: Airflow, Cable Management, GPU Clearance, PSU Compatibility.
`;

export class BareboneSpecialist extends Agent {
	// Embedded knowledge base properties
	private products: BareboneProductInfo[] = [];
	private isKnowledgeBaseInitialized: boolean = false;

	constructor() {
		super({
			name: "Barebone Specialist",
			description:
				"Provides expert advice and data analysis for barebone (case) products.",
			instructions: BAREBONE_SPECIALIST_PERSONALITY,
			model: mastraModelProvider(),
			tools: {
				bareboneDatabaseTool,
			},
			memory: (() => {
				const db = getLibSQLConfig();
				return new Memory({
					storage: new LibSQLStore({
						url: db.url,
						authToken: db.authToken,
					}),
					vector: chromaVector,
					embedder: embedder,
					options: {
						lastMessages: 10,
						workingMemory: {
							enabled: true,
							scope: "resource",
							schema: userProfileSchema,
						},
						semanticRecall: {
							topK: 3,
							messageRange: 2,
							scope: "resource",
						},
					},
				});
			})(),
		});

		console.log("📚 [Barebone Specialist] Initializing embedded knowledge base...");
		// Initialize embedded knowledge base
		this.initializeKnowledgeBase();
	}

	// Embedded knowledge base initialization method
	private async initializeKnowledgeBase(): Promise<void> {
		if (this.isKnowledgeBaseInitialized) {
			console.log("📚 [Barebone Specialist] Knowledge base already initialized.");
			return;
		}

		console.log("📚 [Barebone Specialist] Loading all barebone products...");
		try {
			// Use the bareboneDatabaseTool to fetch all products
			const toolResult = await bareboneDatabaseTool.execute({
				context: { query: "barebone", budget: { max: 999999999 } } as any,
				mastra: null, // Tool needs to be independent
			});

			if (toolResult.specialistData?.recommendations) {
				this.products = toolResult.specialistData.recommendations.map(
					(rec) => ({
						sku: rec.productId,
						name: rec.productName,
						caseSize: rec.specifications.caseSize,
						motherboardFormFactor: rec.specifications.motherboardFormFactor,
						supportedSockets: [rec.specifications.supportedSocket],
						ramSupport: rec.specifications.ramSupport,
						maxRamCapacity: rec.specifications.maxRamCapacity,
						ramSlots: rec.specifications.ramSlots,
						coolingSupport: rec.specifications.coolingSystem,
						aesthetics: rec.specifications.aesthetics,
						price: rec.price,
						compatibility: [], // Tool output doesn't provide this directly, needs mapping
						useCases: rec.useCases || [],
						stockStatus: rec.availability,
						description: rec.description,
					}),
				);
				this.isKnowledgeBaseInitialized = true;
				console.log(
					`✅ [Barebone Specialist] Loaded ${this.products.length} barebone products.`,
				);
			} else {
				console.warn(
					"⚠️ [Barebone Specialist] No barebone products found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [Barebone Specialist] Failed to initialize:", error);
			this.isKnowledgeBaseInitialized = false;
		}
	}

	// Method to get structured data recommendations
	async getStructuredRecommendations(
		message: string,
		context: any = {},
		conversationId?: string,
	): Promise<BareboneSpecialistData | null> {
		const startTime = Date.now();
		console.log(
			"🧠 [Barebone Specialist] Generating structured recommendations",
			{
				messageLength: message.length,
				conversationId,
			},
		);

		try {
			if (!this.isKnowledgeBaseReady()) {
				console.warn(
					"⚠️ [Barebone Specialist] Knowledge Base not ready, attempting to initialize...",
				);
				await this.initializeKnowledgeBase();
				if (!this.isKnowledgeBaseReady()) {
					throw new Error("Knowledge Base failed to initialize.");
				}
			}

			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await sharedContextManager.getContext(conversationId);
			}

			const extendedContext = { ...context, sharedContext };

			// Use the embedded knowledge base to search for barebones
			const searchResults = this.searchBarebonesInternal({
				query: message,
				budget: extendedContext.budget,
				caseSize: extendedContext.caseSize,
				motherboardFormFactor: extendedContext.motherboardFormFactor,
				supportedSocket: extendedContext.supportedSocket,
				ramSupport: extendedContext.ramSupport,
				maxRamCapacity: extendedContext.maxRamCapacity,
				coolingType: extendedContext.coolingType,
				aestheticsStyle: extendedContext.aestheticsStyle,
			});

			// Map searchResults (BareboneProductInfo[]) to BareboneSpecialistData
			const specialistData: BareboneSpecialistData = {
				type: "barebone",
				recommendations: searchResults.map((product) => ({
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
					recommendationScore: 0, // Score needs to be calculated based on relevance
					keyFeatures: product.description ? [product.description] : [],
					useCases: product.useCases as (
						| "gaming"
						| "content-creation"
						| "office"
						| "professional"
					)[],
					imageUrl: undefined,
					description: product.description,
				})),
				technicalAnalysis: {
					keySpecifications: {
						caseSize: extendedContext.caseSize || "mid-tower",
						motherboardFormFactor:
							extendedContext.motherboardFormFactor || "ATX",
						supportedSocket: extendedContext.supportedSocket || "LGA1700",
						ramSupport: extendedContext.ramSupport || "DDR5",
						maxRamCapacity: extendedContext.maxRamCapacity || 128,
						ramSlots: 4,
						coolingType: extendedContext.coolingType || "air",
						aestheticsStyle: extendedContext.aestheticsStyle || "minimalist",
					},
					performanceMetrics: {
						expandability: 85,
						coolingEfficiency: 80,
						aestheticAppeal: 90,
						pricePerformance: 88,
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
						searchResults.length > 0
							? Math.min(...searchResults.map((p) => p.price))
							: 0,
					totalPrice:
						searchResults.length > 0
							? searchResults.reduce((sum, p) => sum + p.price, 0)
							: 0,
					savings: 0,
					discountPercentage: 0,
					currency: "VND",
				},
				availability: {
					inStock: searchResults.some((p) => p.stockStatus === "in_stock"),
					estimatedDelivery: "2-5 business days",
					quantityAvailable: searchResults.filter(
						(p) => p.stockStatus === "in_stock",
					).length,
					warehouseLocation: "Ho Chi Minh City Warehouse",
				},
				confidenceScore: searchResults.length > 0 ? 0.8 : 0.1, // Placeholder confidence
				processingMetadata: {
					processingTime: Date.now() - startTime,
					dataSources: ["SSTC Barebone Knowledge Base"],
					completeness: searchResults.length > 0 ? 100 : 0,
				},
			};

			console.log(
				"✅ [Barebone Specialist] Structured data retrieved from Knowledge Base",
				{
					productsFound: specialistData.recommendations.length,
					confidenceScore: specialistData.confidenceScore,
					processingTime: Date.now() - startTime,
				},
			);

			return specialistData;
		} catch (error: any) {
			console.error(
				"❌ [Barebone Specialist] Failed to get structured recommendations from Knowledge Base:",
				error.message,
			);
			return null;
		}
	}

	// Method to generate a human-readable response from the data
	generateHumanReadableResponse(data: BareboneSpecialistData): string {
		if (!data || !data.recommendations || data.recommendations.length === 0) {
			return "Xin lỗi, tôi không tìm thấy sản phẩm barebone nào phù hợp với yêu cầu của bạn.";
		}

		const { recommendations, technicalAnalysis, confidenceScore } = data;

		let response = `Dựa trên phân tích, tôi có một vài đề xuất barebone cho bạn (độ tin cậy: ${(confidenceScore * 100).toFixed(0)}%):\n\n`;

		recommendations.forEach((rec, index) => {
			response += `${index + 1}. **${rec.productName}** - ${rec.price.toLocaleString()}đ\n`;
			response += `   - **Lý do đề xuất**: ${rec.keyFeatures.join(", ")}\n`;
			response += `   - **Thông số**: ${rec.specifications.caseSize} ${rec.specifications.motherboardFormFactor}, Hỗ trợ ${rec.specifications.supportedCpus.join(", ")}\n`;
			if (rec.recommendationScore > 8) {
				// Assuming score is out of 10
				response += `   - **Độ phù hợp**: Rất cao\n`;
			} else if (rec.recommendationScore > 5) {
				response += `   - **Độ phù hợp**: Cao\n`;
			}
		});

		if (technicalAnalysis.keySpecifications) {
			response += `\n**Tóm tắt thông số chính**:\n - Kích thước case: ${technicalAnalysis.keySpecifications.caseSize}\n - Form factor: ${technicalAnalysis.keySpecifications.motherboardFormFactor}\n - Socket hỗ trợ: ${technicalAnalysis.keySpecifications.supportedSocket}\n`;
		}

		return response;
	}

	// Embedded knowledge base methods
	private getProductInfoInternal(sku: string): BareboneProductInfo | null {
		const product = this.products.find((p) => p.sku === sku);
		return product || null;
	}

	private searchBarebonesInternal(criteria: SearchCriteria): BareboneProductInfo[] {
		let results = [...this.products];

		// Apply filters
		if (criteria.query) {
			const query = criteria.query.toLowerCase();
			results = results.filter(
				(product) =>
					product.name.toLowerCase().includes(query) ||
					product.description?.toLowerCase().includes(query) ||
					product.aesthetics.toLowerCase().includes(query),
			);
		}

		if (criteria.budget?.min !== undefined) {
			results = results.filter(
				(product) => product.price >= criteria.budget?.min!,
			);
		}

		if (criteria.budget?.max !== undefined) {
			results = results.filter(
				(product) => product.price <= criteria.budget?.max!,
			);
		}

		if (criteria.caseSize) {
			results = results.filter(
				(product) => product.caseSize === criteria.caseSize,
			);
		}

		if (criteria.motherboardFormFactor) {
			results = results.filter(
				(product) =>
					product.motherboardFormFactor === criteria.motherboardFormFactor,
			);
		}

		if (criteria.supportedSocket) {
			results = results.filter((product) =>
				product.supportedSockets.includes(criteria.supportedSocket!),
			);
		}

		if (criteria.ramSupport) {
			results = results.filter(
				(product) => product.ramSupport === criteria.ramSupport,
			);
		}

		if (criteria.maxRamCapacity !== undefined) {
			results = results.filter(
				(product) => product.maxRamCapacity >= criteria.maxRamCapacity!,
			);
		}

		if (criteria.coolingType) {
			results = results.filter((product) =>
				product.coolingSupport.toLowerCase().includes(criteria.coolingType!),
			);
		}

		if (criteria.aestheticsStyle) {
			results = results.filter((product) =>
				product.aesthetics.toLowerCase().includes(criteria.aestheticsStyle!),
			);
		}

		// Sort by price (ascending) and then by name
		results.sort((a, b) => {
			if (a.price !== b.price) {
				return a.price - b.price;
			}
			return a.name.localeCompare(b.name);
		});

		return results;
	}

	private checkCompatibilityInternal(
		bareboneSku: string,
		_motherboardOrChipset: string,
	): CompatibilityResult {
		const barebone = this.products.find((p) => p.sku === bareboneSku);
		if (!barebone) {
			return {
				isCompatible: false,
				compatibleCases: [],
				issues: [`Barebone with SKU ${bareboneSku} not found`],
				recommendations: ["Check the SKU and try again"],
			};
		}

		// In a real implementation, this would check actual compatibility
		// For now, we'll return a mock result
		return {
			isCompatible: true,
			compatibleCases: [bareboneSku],
			issues: [],
			recommendations: [
				"Ensure PSU fits in selected case",
				"Check GPU clearance",
				"Verify CPU cooler height clearance",
			],
		};
	}

	private getStatisticsInternal(): {
		totalProducts: number;
		caseSizes: string[];
		formFactors: string[];
		avgPrice: number;
		brands: string[];
	} {
		if (!this.isKnowledgeBaseReady()) {
			return {
				totalProducts: 0,
				caseSizes: [],
				formFactors: [],
				avgPrice: 0,
				brands: [],
			};
		}

		const caseSizes = [...new Set(this.products.map((p) => p.caseSize))];
		const formFactors = [
			...new Set(this.products.map((p) => p.motherboardFormFactor)),
		];
		const avgPrice =
			this.products.reduce((sum, p) => sum + p.price, 0) / this.products.length;
		const brands = [...new Set(this.products.map((p) => p.name.split(" ")[0]))];

		return {
			totalProducts: this.products.length,
			caseSizes,
			formFactors,
			avgPrice,
			brands,
		};
	}

	// Public API methods using embedded functionality
	async getProductInfo(
		bareboneModel: string,
	): Promise<BareboneProductInfo | null> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [Barebone Specialist] Knowledge Base not ready");
			return null;
		}
		return this.getProductInfoInternal(bareboneModel);
	}

	async searchBarebones(
		criteria: SearchCriteria,
	): Promise<BareboneProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [Barebone Specialist] Knowledge Base not ready");
			return [];
		}
		return this.searchBarebonesInternal(criteria);
	}

	async checkCompatibility(
		bareboneModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [Barebone Specialist] Knowledge Base not ready");
			return {
				isCompatible: false,
				compatibleCases: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}
		return this.checkCompatibilityInternal(bareboneModel, motherboardOrChipset);
	}

	async getAllBarebones(): Promise<BareboneProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [Barebone Specialist] Knowledge Base not ready");
			return [];
		}
		return [...this.products];
	}

	isKnowledgeBaseReady(): boolean {
		return this.isKnowledgeBaseInitialized;
	}

	getKnowledgeBaseStats(): any {
		if (!this.isKnowledgeBaseReady()) {
			return { ready: false };
		}
		return {
			ready: true,
			...this.getStatisticsInternal(),
		};
	}

	// NEW: Method for generating summary responses in parallel processing
	async generateSummaryResponse(
		message: string,
		context: SummaryModeContext,
	): Promise<{
		status: "success" | "failed" | "timeout";
		data?: any;
		error?: string;
		processingTime?: number;
	}> {
		const startTime = Date.now();

		console.log("🔄 [Barebone Specialist] Generating summary response", {
			messageLength: message.length,
			intent: context.user_intent,
			timeoutMs: context.timeout_ms,
		});

		try {
			// Create enhanced instructions for summary mode
			const summaryInstructions = `${BAREBONE_SPECIALIST_PERSONALITY}

**CURRENT MODE: QUICK_SUMMARY**

User Intent: ${context.user_intent}
Original Message: ${context.original_message}
Max Products: ${context.max_products}
Include Prices: ${context.include_prices}

**IMPORTANT**: Respond ONLY with valid JSON matching BareboneSummarySchema. No additional text or explanations.`;

			// Generate response with enhanced instructions
			const response = await this.generate(
				[
					{
						role: "system",
						content: summaryInstructions,
					},
					{
						role: "user",
						content: `Provide quick Barebone summary for: "${message}"`,
					},
				],
				{
					structuredOutput: {
						schema: BareboneSummarySchema,
					},
				},
			);

			const processingTime = Date.now() - startTime;

			// Check timeout
			if (processingTime > context.timeout_ms) {
				console.warn(
					"⚠️ [Barebone Specialist] Summary generation exceeded timeout",
					{ processingTime, timeout: context.timeout_ms },
				);
				return {
					status: "timeout",
					error: "Response generation exceeded timeout",
					processingTime,
				};
			}

			console.log(
				"✅ [Barebone Specialist] Summary response generated successfully",
				{
					processingTime,
					hasData: !!response?.object,
				},
			);

			return {
				status: "success",
				data: response?.object || null,
				processingTime,
			};
		} catch (error: any) {
			const processingTime = Date.now() - startTime;
			console.error(
				"❌ [Barebone Specialist] Summary response generation failed:",
				error.message,
			);

			return {
				status: "failed",
				error: error.message,
				processingTime,
			};
		}
	}

	// NEW: Quick summary method for simple calls
	async getQuickSummary(
		message: string,
		intent: string = "general_inquiry",
	): Promise<any> {
		const context: SummaryModeContext = {
			mode: "quick-summary",
			user_intent: intent,
			original_message: message,
			timeout_ms: 3000,
			max_products: 3,
			include_prices: true,
		};

		const result = await this.generateSummaryResponse(message, context);
		return result.data;
	}
}

// Export the single, unified barebone specialist instance
export const bareboneSpecialist = new BareboneSpecialist();
