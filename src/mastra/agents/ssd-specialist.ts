import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { getLibSQLConfig } from "../database/libsql";
import { chromaVector } from "../vector/chroma";
import { mastraModelProvider } from "../llm/provider";
import { embedder } from "../embedding/provider";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { ssdDatabaseTool } from "../tools/ssd-database-tool";
import type { StorageSpecialistData } from "../core/models/specialist-data-models";
import { sharedContextManager } from "../core/memory/shared-context-manager";
import {
	ssdKnowledgeBase,
	type SSDProductInfo,
	type SearchCriteria,
	type CompatibilityResult,
} from "./ssd-knowledge-base";
import { 
	SpecialistSummarySchema, 
	SSDSummarySchema,
	type SummaryModeContext 
} from "../schemas/specialist-summary-schemas";

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

		// Initialize SSD Knowledge Base
		this.initializeKnowledgeBase();
	}

	// Method to initialize knowledge base
	private async initializeKnowledgeBase(): Promise<void> {
		try {
			console.log("🏗️ [SSD Specialist] Initializing SSD Knowledge Base...");
			await ssdKnowledgeBase.initialize();
			console.log(
				"✅ [SSD Specialist] SSD Knowledge Base initialized successfully",
			);

			// Display basic statistics
			const stats = ssdKnowledgeBase.getStatistics();
			console.log("📊 [SSD Specialist] Knowledge Base Statistics:", {
				totalProducts: stats.totalProducts,
				brands: stats.brands.length,
				interfaces: stats.interfaces.length,
				avgPrice: stats.avgPrice,
			});
		} catch (error) {
			console.error(
				"❌ [SSD Specialist] Failed to initialize Knowledge Base:",
				error,
			);
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
			if (!ssdKnowledgeBase.isReady()) {
				console.warn(
					"⚠️ [SSD Specialist] Knowledge Base not ready, attempting to initialize...",
				);
				await ssdKnowledgeBase.initialize();
				if (!ssdKnowledgeBase.isReady()) {
					throw new Error("Knowledge Base failed to initialize.");
				}
			}

			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await sharedContextManager.getContext(conversationId);
			}

			const extendedContext = { ...context, sharedContext };

			// Use the knowledge base to search for SSDs
			const searchResults = ssdKnowledgeBase.searchSSDs({
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

	// Internal API methods delegating to ssdKnowledgeBase
	async getProductInfo(ssdModel: string): Promise<SSDProductInfo | null> {
		if (!ssdKnowledgeBase.isReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return null;
		}
		return ssdKnowledgeBase.getProductInfo(ssdModel);
	}

	async searchSSDs(criteria: SearchCriteria): Promise<SSDProductInfo[]> {
		if (!ssdKnowledgeBase.isReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return [];
		}
		return ssdKnowledgeBase.searchSSDs(criteria);
	}

	async checkCompatibility(
		ssdModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!ssdKnowledgeBase.isReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}
		return ssdKnowledgeBase.checkCompatibility(ssdModel, motherboardOrChipset);
	}

	async getAllSSDs(): Promise<SSDProductInfo[]> {
		if (!ssdKnowledgeBase.isReady()) {
			console.warn("⚠️ [SSD Specialist] Knowledge Base not ready");
			return [];
		}
		return ssdKnowledgeBase.getAllSSDs();
	}

	isKnowledgeBaseReady(): boolean {
		return ssdKnowledgeBase.isReady();
	}

	getKnowledgeBaseStats(): any {
		if (!ssdKnowledgeBase.isReady()) {
			return { ready: false };
		}
		return {
			ready: true,
			...ssdKnowledgeBase.getStatistics(),
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
				console.warn(
					"⚠️ [SSD Specialist] Summary generation exceeded timeout",
					{ processingTime, timeout: context.timeout_ms },
				);
				return {
					status: "timeout",
					error: "Response generation exceeded timeout",
					processingTime,
				};
			}

			console.log("✅ [SSD Specialist] Summary response generated successfully", {
				processingTime,
				hasData: !!response?.object,
			});

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
