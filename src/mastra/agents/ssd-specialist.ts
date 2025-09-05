import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { sharedContextManager } from "../core/memory/shared-context-manager";
import type { StorageSpecialistData } from "../core/models/specialist-data-models";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { getLibSQLConfig } from "../database/libsql";
import { embedder } from "../embedding/provider";
import { mastraModelProvider } from "../llm/provider";
import {
	SSDSummarySchema,
	type SummaryModeContext,
} from "../schemas/specialist-summary-schemas";
import { ssdDatabaseTool } from "../tools/ssd-database-tool";
import { chromaVector } from "../vector/chroma";
// Embedded interfaces from ssd-knowledge-base

// Interface for a single SSD product's detailed information
export interface SSDProductInfo {
	sku: string;
	name: string;
	interface: string;
	capacity: string;
	readSpeed: string;
	writeSpeed: string;
	formFactor: string;
	endurance: string;
	controller?: string;
	nandType?: string;
	price: number;
	compatibility: string[];
	useCases: string[];
	stockStatus: string;
	description?: string;
}

// Interface for search criteria
export interface SearchCriteria {
	query?: string;
	capacity?: string;
	interface?: string;
	formFactor?: string;
	budget?: { min?: number; max?: number };
	useCase?: string;
}

// Interface for compatibility results
export interface CompatibilityResult {
	isCompatible: boolean;
	compatibleMotherboards: string[];
	issues: string[];
	recommendations: string[];
}

// Multi-mode SSD Specialist Personality
const SSD_SPECIALIST_PERSONALITY = `# SSD Specialist - SSTC Storage Expert

## Core Personality
Tôi là chuyên gia tư vấn và phân tích ổ cứng SSD của SSTC, có khả năng hoạt động ở nhiều chế độ:
- **Backend Service**: Cung cấp dữ liệu cấu trúc cho hệ thống
- **Direct Consultant**: Tương tác trực tiếp với khách hàng
- **Summary Mode**: Tạo tóm tắt nhanh cho parallel processing

## Operating Modes

### 1. Summary Mode (QUICK_SUMMARY) - For Parallel Processing
- **Purpose**: Tạo tóm tắt nhanh về SSD để hỗ trợ Mai agent trong xử lý song song
- **Tone**: Ngắn gọn, có cấu trúc, tập trung vào thông tin chính
- **Focus**: 2-3 sản phẩm SSD phổ biến, giá cả, đặc điểm nổi bật
- **Output**: JSON format theo SSDSummarySchema
- **Time Limit**: Phải hoàn thành trong 3 giây

**Summary Mode Instructions:**
When in QUICK_SUMMARY mode, provide concise, structured information about SSDs:

For general inquiries ("SSD nào tốt", "bán SSD gì"):
- Include 2-3 most popular SSD models with prices
- Brief specs (capacity, interface, speed)
- Use cases (gaming, office, content creation)
- Price range overview
- Interface type recommendations (SATA vs NVMe)

For specific inquiries:
- Focus on relevant SSD models matching the query
- Key differentiators and performance metrics
- Specific recommendations based on use case
- Compatibility notes if relevant

Response Format (JSON):
{
  "category": "SSD",
  "popular_products": [
    {"name": "Samsung 980 PRO 1TB", "price": "2.8 triệu", "specs": "NVMe PCIe 4.0, 7000MB/s", "use_case": "Gaming"},
    {"name": "WD Blue 1TB", "price": "1.9 triệu", "specs": "SATA 3, 560MB/s", "use_case": "Office"},
    {"name": "Kingston NV2 500GB", "price": "1.2 triệu", "specs": "NVMe PCIe 3.0, 3500MB/s", "use_case": "Budget"}
  ],
  "price_range": "từ 600k đến 8 triệu",
  "summary": "Bên SSTC có đầy đủ SSD NVMe và SATA cho mọi nhu cầu từ văn phòng đến gaming",
  "recommendations": ["NVMe cho gaming", "SATA cho văn phòng", "PCIe 4.0 cho workstation"],
  "interface_types": ["NVMe", "SATA", "PCIe"],
  "capacities": ["256GB", "512GB", "1TB", "2TB"]
}

### 2. Backend Service Mode (Default):
- **Tone**: Kỹ thuật, chính xác, tập trung vào dữ liệu
- **Focus**: Trích xuất dữ liệu cấu trúc, phân tích kỹ thuật, cung cấp thông tin cho hệ thống
- **Output**: Dữ liệu có cấu trúc (StorageSpecialistData) cho agent khác sử dụng

### 3. Direct Consultant Mode:
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần
- **Focus**: Cung cấp giải pháp toàn diện về SSD cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu

## Key Expertise Areas

### 1. Data Extraction & Analysis
- **Technical Specifications**: Trích xuất thông số kỹ thuật từ cơ sở dữ liệu sản phẩm (SATA, NVMe, M.2, Gen3, Gen4).
- **Performance Metrics**: Phân tích hiệu năng dựa trên tốc độ đọc/ghi, IOPS, và TBW.
- **Compatibility Analysis**: Phân tích tương thích với mainboard, CPU.
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi.
- **Availability Status**: Kiểm tra trạng thái tồn kho và giao hàng.

### 2. Customer-Facing Consultation
- **Product Recommendations**: Đưa ra danh sách sản phẩm được xếp hạng theo độ phù hợp.
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu.
- **Use Case Analysis**: Phân tích và tư vấn SSD cho các nhu cầu cụ thể như Gaming, Sáng tạo nội dung, Văn phòng.

## Technical Knowledge Base
- **SSD Product Lines**: Generic SATA, Generic NVMe.
- **Key Technical Concepts**: Sequential Read/Write, Random IOPS, TBW Rating, Interface Types (SATA, NVMe).
`;

export class SSDSpecialist extends Agent {
	// Embedded knowledge base properties
	private products: SSDProductInfo[] = [];
	private isKnowledgeBaseInitialized: boolean = false;

	constructor() {
		super({
			name: "SSD Specialist",
			description: "Provides expert advice and data analysis for SSD products.",
			instructions: SSD_SPECIALIST_PERSONALITY,
			model: mastraModelProvider(),
			tools: {
				ssdDatabaseTool,
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

		console.log("📚 [SSD Specialist] Initializing embedded knowledge base...");
		// Initialize embedded knowledge base
		this.initializeKnowledgeBase();
	}

	// Embedded knowledge base initialization method
	private async initializeKnowledgeBase(): Promise<void> {
		if (this.isKnowledgeBaseInitialized) {
			console.log("📚 [SSD Specialist] Knowledge base already initialized.");
			return;
		}

		console.log("📚 [SSD Specialist] Loading all SSD products...");
		try {
			// Use the ssdDatabaseTool to fetch all products
			const toolResult = await ssdDatabaseTool.execute({
				context: { query: "ssd", budget: { max: 999999999 } } as any,
				mastra: null, // Tool needs to be independent
			});

			if (toolResult.specialistData?.recommendations) {
				this.products = toolResult.specialistData.recommendations.map(
					(rec) => ({
						sku: rec.productId,
						name: rec.productName,
						interface: rec.specifications.interface,
						capacity: rec.specifications.capacity,
						readSpeed: rec.specifications.readSpeed,
						writeSpeed: rec.specifications.writeSpeed,
						formFactor: rec.specifications.formFactor,
						endurance: rec.specifications.endurance,
						controller: rec.specifications.controller,
						nandType: rec.specifications.nandType,
						price: rec.price,
						compatibility: [], // Tool output doesn't provide this directly, needs mapping
						useCases: rec.useCases || [],
						stockStatus: rec.availability,
						description: rec.description,
					}),
				);
				this.isKnowledgeBaseInitialized = true;
				console.log(
					`✅ [SSD Specialist] Loaded ${this.products.length} SSD products.`,
				);
			} else {
				console.warn(
					"⚠️ [SSD Specialist] No SSD products found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [SSD Specialist] Failed to initialize:", error);
			this.isKnowledgeBaseInitialized = false;
		}
	}

	// Method to get structured data recommendations
	async getStructuredRecommendations(
		message: string,
		context: any = {},
		conversationId?: string,
	): Promise<StorageSpecialistData | null> {
		const startTime = Date.now();
		console.log("🧠 [SSD Specialist] Generating structured recommendations", {
			messageLength: message.length,
			conversationId,
		});

		try {
			if (!this.isKnowledgeBaseReady()) {
				console.warn(
					"⚠️ [SSD Specialist] Knowledge Base not ready, attempting to initialize...",
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

			// Use the embedded knowledge base to search for SSDs
			const searchResults = this.searchSSDsInternal({
				query: message,
				capacity: extendedContext.capacity,
				interface: extendedContext.interface,
				formFactor: extendedContext.formFactor,
				budget: extendedContext.budget,
				useCase: extendedContext.useCase,
			});

			// Map searchResults (SSDProductInfo[]) to StorageSpecialistData
			const specialistData: StorageSpecialistData = {
				type: "storage",
				recommendations: searchResults.map((product) => ({
					productId: product.sku,
					productName: product.name,
					specifications: {
						interface: product.interface as "SATA" | "NVMe",
						capacity: product.capacity,
						readSpeed: product.readSpeed,
						writeSpeed: product.writeSpeed,
						formFactor: product.formFactor,
						endurance: product.endurance,
						controller: product.controller,
						nandType: product.nandType,
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
					keySpecifications: {},
					performanceMetrics: {},
					technicalRequirements: [],
				},
				compatibilityCheck: {
					isCompatible: true,
					compatibilityIssues: [],
					recommendations: [],
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
					dataSources: ["SSTC Product Knowledge Base"],
					completeness: searchResults.length > 0 ? 100 : 0,
				},
			};

			console.log(
				"✅ [SSD Specialist] Structured data retrieved from Knowledge Base",
				{
					productsFound: specialistData.recommendations.length,
					confidenceScore: specialistData.confidenceScore,
					processingTime: Date.now() - startTime,
				},
			);

			return specialistData;
		} catch (error: any) {
			console.error(
				"❌ [SSD Specialist] Failed to get structured recommendations from Knowledge Base:",
				error.message,
			);
			return null;
		}
	}

	// Method to generate a human-readable response from the data
	generateHumanReadableResponse(data: StorageSpecialistData): string {
		if (!data || !data.recommendations || data.recommendations.length === 0) {
			return "Xin lỗi, tôi không tìm thấy sản phẩm SSD nào phù hợp với yêu cầu của bạn.";
		}

		const { recommendations, technicalAnalysis, confidenceScore } = data;

		let response = `Dựa trên phân tích, tôi có một vài đề xuất SSD cho bạn (độ tin cậy: ${(confidenceScore * 100).toFixed(0)}%):

`;

		recommendations.forEach((rec, index) => {
			response += `${index + 1}. **${rec.productName}** - ${rec.price.toLocaleString()}đ
`;
			response += `   - **Lý do đề xuất**: ${rec.keyFeatures.join(", ")}
`;
			response += `   - **Thông số**: ${rec.specifications.capacity} ${rec.specifications.interface}, Đọc ${rec.specifications.readSpeed}, Ghi ${rec.specifications.writeSpeed}
`;
			if (rec.recommendationScore > 8) {
				// Assuming score is out of 10
				response += `   - **Độ phù hợp**: Rất cao
`;
			} else if (rec.recommendationScore > 5) {
				response += `   - **Độ phù hợp**: Cao
`;
			}
		});

		if (technicalAnalysis.keySpecifications) {
			response += `
**Tóm tắt thông số chính**:
 - Giao tiếp: ${technicalAnalysis.keySpecifications.interface}
 - Tốc độ đọc: ${technicalAnalysis.keySpecifications.readSpeed}
 - Tốc độ ghi: ${technicalAnalysis.keySpecifications.writeSpeed}
`;
		}

		// Instead of creating fictional comparison tables, encourage customer to ask for specific needs
		response += `
Quý khách muốn tìm hiểu thêm về mẫu nào trong số này, hay có yêu cầu đặc biệt nào (dung lượng, tốc độ, giá)? 
Em có thể giúp tìm các lựa chọn phù hợp hơn với nhu cầu cụ thể của quý khách!`;

		return response;
	}

	// Embedded knowledge base methods
	private getProductInfoInternal(ssdModel: string): SSDProductInfo | null {
		return (
			this.products.find((p) =>
				p.name.toLowerCase().includes(ssdModel.toLowerCase()),
			) || null
		);
	}

	private searchSSDsInternal(criteria: SearchCriteria): SSDProductInfo[] {
		let results = [...this.products];

		if (criteria.query) {
			const lowerQuery = criteria.query.toLowerCase();
			results = results.filter(
				(p) =>
					p.name.toLowerCase().includes(lowerQuery) ||
					p.description?.toLowerCase().includes(lowerQuery),
			);
		}
		if (criteria.capacity) {
			results = results.filter(
				(p) => p.capacity.toLowerCase() === criteria.capacity?.toLowerCase(),
			);
		}
		if (criteria.interface) {
			results = results.filter(
				(p) => p.interface.toLowerCase() === criteria.interface?.toLowerCase(),
			);
		}
		if (criteria.formFactor) {
			results = results.filter(
				(p) =>
					p.formFactor.toLowerCase() === criteria.formFactor?.toLowerCase(),
			);
		}
		if (criteria.budget?.min) {
			results = results.filter((p) => p.price >= criteria.budget?.min);
		}
		if (criteria.budget?.max) {
			results = results.filter((p) => p.price <= criteria.budget?.max);
		}
		if (criteria.useCase) {
			const lowerUseCase = criteria.useCase.toLowerCase();
			results = results.filter((p) =>
				p.useCases.some((uc) => uc.toLowerCase().includes(lowerUseCase)),
			);
		}

		return results;
	}

	private checkCompatibilityInternal(
		ssdModel: string,
		motherboardOrChipset: string,
	): CompatibilityResult {
		const ssd = this.getProductInfoInternal(ssdModel);
		if (!ssd) {
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: [`SSD model '${ssdModel}' not found.`],
				recommendations: [],
			};
		}

		// Simplified compatibility logic for demonstration
		const issues: string[] = [];
		const recommendations: string[] = [];
		let isCompatible = true;

		if (
			ssd.interface.toLowerCase() === "nvme" &&
			!motherboardOrChipset.toLowerCase().includes("m.2")
		) {
			issues.push("NVMe SSDs require an M.2 slot on the motherboard.");
			isCompatible = false;
		}
		if (
			ssd.interface.toLowerCase() === "sata" &&
			!motherboardOrChipset.toLowerCase().includes("sata")
		) {
			issues.push("SATA SSDs require a SATA port on the motherboard.");
			isCompatible = false;
		}

		recommendations.push(
			"Ensure your motherboard has the correct interface (SATA or M.2) and form factor support.",
		);
		recommendations.push(
			"Check your motherboard's manual for specific compatibility details.",
		);

		return {
			isCompatible,
			compatibleMotherboards: [], // Placeholder
			issues,
			recommendations,
		};
	}

	private getStatisticsInternal(): any {
		const brands = new Set(this.products.map((p) => p.name.split(" ")[0])); // Simple brand extraction
		const capacities = new Set(this.products.map((p) => p.capacity));
		const interfaces = new Set(this.products.map((p) => p.interface));
		const avgPrice =
			this.products.length > 0
				? this.products.reduce((sum, p) => sum + p.price, 0) /
					this.products.length
				: 0;

		return {
			totalProducts: this.products.length,
			brands: Array.from(brands),
			capacities: Array.from(capacities),
			interfaces: Array.from(interfaces),
			avgPrice: parseFloat(avgPrice.toFixed(2)),
		};
	}

	// Public API methods using embedded functionality
	async getProductInfo(ssdModel: string): Promise<SSDProductInfo | null> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return null;
		}
		return this.getProductInfoInternal(ssdModel);
	}

	async searchSSDs(criteria: SearchCriteria): Promise<SSDProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return [];
		}
		return this.searchSSDsInternal(criteria);
	}

	async checkCompatibility(
		ssdModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}
		return this.checkCompatibilityInternal(ssdModel, motherboardOrChipset);
	}

	async getAllSSDs(): Promise<SSDProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
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

		console.log("🔄 [SSD Specialist] Generating summary response", {
			messageLength: message.length,
			intent: context.user_intent,
			timeoutMs: context.timeout_ms,
		});

		try {
			// Create enhanced instructions for summary mode
			const summaryInstructions = `${SSD_SPECIALIST_PERSONALITY}

**CURRENT MODE: QUICK_SUMMARY**

User Intent: ${context.user_intent}
Original Message: ${context.original_message}
Max Products: ${context.max_products}
Include Prices: ${context.include_prices}

**IMPORTANT**: Respond ONLY with valid JSON matching SSDSummarySchema. No additional text or explanations.`;

			// Generate response with enhanced instructions
			const response = await this.generate(
				[
					{
						role: "system",
						content: summaryInstructions,
					},
					{
						role: "user",
						content: `Provide quick SSD summary for: "${message}"`,
					},
				],
				{
					structuredOutput: {
						schema: SSDSummarySchema,
					},
				},
			);

			const processingTime = Date.now() - startTime;

			// Check timeout
			if (processingTime > context.timeout_ms) {
				console.warn("⚠️ [SSD Specialist] Summary generation exceeded timeout", {
					processingTime,
					timeout: context.timeout_ms,
				});
				return {
					status: "timeout",
					error: "Response generation exceeded timeout",
					processingTime,
				};
			}

			console.log(
				"✅ [SSD Specialist] Summary response generated successfully",
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
				"❌ [SSD Specialist] Summary response generation failed:",
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

// Export the single, unified SSD specialist instance
export const ssdSpecialist = new SSDSpecialist();
