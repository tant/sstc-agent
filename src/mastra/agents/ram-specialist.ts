import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { getLibSQLConfig } from "../database/libsql";
import { chromaVector } from "../vector/chroma";
import { mastraModelProvider } from "../llm/provider";
import { embedder } from "../embedding/provider";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { ramDatabaseTool } from "../tools/ram-database-tool";
import type { RAMSpecialistData } from "../core/models/specialist-data-models";
import { sharedContextManager } from "../core/memory/shared-context-manager";
import {
	ramKnowledgeBase,
	type RAMProductInfo,
	type SearchCriteria,
	type CompatibilityResult,
} from "./ram-knowledge-base";
import { 
	SpecialistSummarySchema, 
	RAMSummarySchema,
	type SummaryModeContext 
} from "../schemas/specialist-summary-schemas";

// Multi-mode RAM Specialist Personality
const RAM_SPECIALIST_PERSONALITY = `# RAM Specialist - SSTC Memory Expert

## Core Personality
Tôi là chuyên gia tư vấn và phân tích bộ nhớ RAM của SSTC, có khả năng hoạt động ở nhiều chế độ:
- **Backend Service**: Cung cấp dữ liệu cấu trúc cho hệ thống
- **Direct Consultant**: Tương tác trực tiếp với khách hàng
- **Summary Mode**: Tạo tóm tắt nhanh cho parallel processing

## Operating Modes

### 1. Summary Mode (QUICK_SUMMARY) - For Parallel Processing
- **Purpose**: Tạo tóm tắt nhanh về RAM để hỗ trợ Mai agent trong xử lý song song
- **Tone**: Ngắn gọn, có cấu trúc, tập trung vào thông tin chính
- **Focus**: 2-3 sản phẩm RAM phổ biến, giá cả, đặc điểm nổi bật
- **Output**: JSON format theo RAMSummarySchema
- **Time Limit**: Phải hoàn thành trong 3 giây

**Summary Mode Instructions:**
When in QUICK_SUMMARY mode, provide concise, structured information about RAM:

For general inquiries ("RAM nào tốt", "bán RAM gì"):
- Include 2-3 most popular RAM models with prices
- Brief specs (capacity, speed, type)
- Use cases (gaming, office, content creation)
- Price range overview
- Memory type recommendations (DDR4 vs DDR5)

For specific inquiries:
- Focus on relevant RAM models matching the query
- Key differentiators and performance metrics
- Specific recommendations based on use case
- Compatibility notes if relevant

Response Format (JSON):
{
  "category": "RAM",
  "popular_products": [
    {"name": "Corsair Vengeance LPX 16GB", "price": "1.8 triệu", "specs": "DDR4-3200 CL16", "use_case": "Gaming"},
    {"name": "G.SKILL Ripjaws V 32GB", "price": "3.2 triệu", "specs": "DDR4-3600 CL18", "use_case": "Content Creation"},
    {"name": "Kingston Fury Beast 16GB", "price": "1.5 triệu", "specs": "DDR4-3200 CL16", "use_case": "Office"}
  ],
  "price_range": "từ 800k đến 8 triệu",
  "summary": "Bên SSTC có đầy đủ RAM DDR4 và DDR5 cho mọi nhu cầu từ văn phòng đến gaming",
  "recommendations": ["16GB cho gaming", "32GB cho content creation", "8GB cho văn phòng"],
  "memory_types": ["DDR4", "DDR5"],
  "capacities": ["8GB", "16GB", "32GB", "64GB"]
}

### 2. Backend Service Mode (Default):
- **Tone**: Kỹ thuật, chính xác, tập trung vào dữ liệu
- **Focus**: Trích xuất dữ liệu cấu trúc, phân tích kỹ thuật, cung cấp thông tin cho hệ thống
- **Output**: Dữ liệu có cấu trúc (RAMSpecialistData) cho agent khác sử dụng

### 3. Direct Consultant Mode:
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần
- **Focus**: Cung cấp giải pháp toàn diện về RAM cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu

## Key Expertise Areas

### 1. Data Extraction & Analysis
- **Technical Specifications**: Trích xuất thông số kỹ thuật từ cơ sở dữ liệu sản phẩm.
- **Performance Metrics**: Phân tích hiệu năng dựa trên tốc độ, độ trễ, điện áp.
- **Compatibility Analysis**: Phân tích tương thích với mainboard, CPU.
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi.
- **Availability Status**: Kiểm tra trạng thái tồn kho và giao hàng.

### 2. Customer-Facing Consultation
- **Product Recommendations**: Đưa ra danh sách sản phẩm được xếp hạng theo độ phù hợp.
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu.
- **Use Case Analysis**: Phân tích và tư vấn RAM cho các nhu cầu cụ thể như Gaming, Sáng tạo nội dung, Văn phòng.

## Technical Knowledge Base
- **RAM Product Lines**: Generic DDR4, Generic DDR5.
- **Key Technical Concepts**: CAS Latency, Bandwidth, Dual-channel, Overclocking (XMP/DOCP).
`;

export class RAMSpecialist extends Agent {
	constructor() {
		super({
			name: "RAM Specialist",
			description: "Provides expert advice and data analysis for RAM products.",
			instructions: RAM_SPECIALIST_PERSONALITY,
			model: mastraModelProvider(),
			tools: {
				ramDatabaseTool,
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

		// Khởi tạo RAM Knowledge Base
		this.initializeKnowledgeBase();
	}

	// Phương thức khởi tạo knowledge base
	private async initializeKnowledgeBase(): Promise<void> {
		try {
			console.log("🏗️ [RAM Specialist] Initializing RAM Knowledge Base...");
			await ramKnowledgeBase.initialize();
			console.log(
				"✅ [RAM Specialist] RAM Knowledge Base initialized successfully",
			);

			// Hiển thị thống kê cơ bản
			const stats = ramKnowledgeBase.getStatistics();
			console.log("📊 [RAM Specialist] Knowledge Base Statistics:", {
				totalProducts: stats.totalProducts,
				brands: stats.brands.length,
				types: stats.types.length,
				avgPrice: stats.avgPrice,
			});
		} catch (error) {
			console.error(
				"❌ [RAM Specialist] Failed to initialize Knowledge Base:",
				error,
			);
		}
	}

	// Method to get structured data recommendations
	async getStructuredRecommendations(
		message: string,
		context: any = {},
		conversationId?: string,
	): Promise<RAMSpecialistData | null> {
		const startTime = Date.now();
		console.log("🧠 [RAM Specialist] Generating structured recommendations", {
			messageLength: message.length,
			conversationId,
		});

		try {
			if (!ramKnowledgeBase.isReady()) {
				console.warn(
					"⚠️ [RAM Specialist] Knowledge Base not ready, attempting to initialize...",
				);
				await ramKnowledgeBase.initialize();
				if (!ramKnowledgeBase.isReady()) {
					throw new Error("Knowledge Base failed to initialize.");
				}
			}

			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await sharedContextManager.getContext(conversationId);
			}

			const extendedContext = { ...context, sharedContext };

			// Use the knowledge base to search for RAMs
			const searchResults = ramKnowledgeBase.searchRAMs({
				query: message,
				capacity: extendedContext.capacity,
				type: extendedContext.type,
				speed: extendedContext.speed,
				formFactor: extendedContext.formFactor,
				budget: extendedContext.budget,
				useCase: extendedContext.useCase,
			});

			// Map searchResults (RAMProductInfo[]) to RAMSpecialistData
			const specialistData: RAMSpecialistData = {
				type: "ram",
				recommendations: searchResults.map((product) => ({
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
				"✅ [RAM Specialist] Structured data retrieved from Knowledge Base",
				{
					productsFound: specialistData.recommendations.length,
					confidenceScore: specialistData.confidenceScore,
					processingTime: Date.now() - startTime,
				},
			);

			return specialistData;
		} catch (error: any) {
			console.error(
				"❌ [RAM Specialist] Failed to get structured recommendations from Knowledge Base:",
				error.message,
			);
			return null;
		}
	}

	// Method to generate a human-readable response from the data
	generateHumanReadableResponse(data: RAMSpecialistData): string {
		if (!data || !data.recommendations || data.recommendations.length === 0) {
			return "Xin lỗi, tôi không tìm thấy sản phẩm RAM nào phù hợp với yêu cầu của bạn.";
		}

		const { recommendations, analysis, confidenceScore } = data;

		let response = `Dựa trên phân tích, tôi có một vài đề xuất RAM cho bạn (độ tin cậy: ${(confidenceScore * 100).toFixed(0)}%):\n\n`;

		recommendations.forEach((rec, index) => {
			response += `${index + 1}. **${rec.productName}** - ${rec.price.toLocaleString()}đ\n`;
			response += `   - **Lý do đề xuất**: ${rec.keyFeatures.join(", ")}\n`;
			response += `   - **Thông số**: ${rec.specifications.capacity} ${rec.specifications.type}, ${rec.specifications.speed}, ${rec.specifications.latency}\n`;
			if (rec.recommendationScore > 8) {
				// Assuming score is out of 10
				response += `   - **Độ phù hợp**: Rất cao\n`;
			} else if (rec.recommendationScore > 5) {
				response += `   - **Độ phù hợp**: Cao\n`;
			}
		});

		if (analysis.summary) {
			response += `\n**Tóm tắt phân tích**: ${analysis.summary}\n`;
		}

		if (analysis.performance) {
			response += `\n**Phân tích hiệu năng**: ${analysis.performance}\n`;
		}

		if (analysis.compatibility) {
			response += `\n**Phân tích tương thích**: ${analysis.compatibility}\n`;
		}

		return response;
	}

	// Internal API methods delegating to ramKnowledgeBase
	async getProductInfo(ramModel: string): Promise<RAMProductInfo | null> {
		if (!ramKnowledgeBase.isReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return null;
		}
		return ramKnowledgeBase.getProductInfo(ramModel);
	}

	async searchRAMs(criteria: SearchCriteria): Promise<RAMProductInfo[]> {
		if (!ramKnowledgeBase.isReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return [];
		}
		return ramKnowledgeBase.searchRAMs(criteria);
	}

	async checkCompatibility(
		ramModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!ramKnowledgeBase.isReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}
		return ramKnowledgeBase.checkCompatibility(ramModel, motherboardOrChipset);
	}

	async getAllRAMs(): Promise<RAMProductInfo[]> {
		if (!ramKnowledgeBase.isReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return [];
		}
		return ramKnowledgeBase.getAllRAMs();
	}

	isKnowledgeBaseReady(): boolean {
		return ramKnowledgeBase.isReady();
	}

	getKnowledgeBaseStats(): any {
		if (!ramKnowledgeBase.isReady()) {
			return { ready: false };
		}
		return {
			ready: true,
			...ramKnowledgeBase.getStatistics(),
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

		console.log("🔄 [RAM Specialist] Generating summary response", {
			messageLength: message.length,
			intent: context.user_intent,
			timeoutMs: context.timeout_ms,
		});

		try {
			// Create enhanced instructions for summary mode
			const summaryInstructions = `${RAM_SPECIALIST_PERSONALITY}

**CURRENT MODE: QUICK_SUMMARY**

User Intent: ${context.user_intent}
Original Message: ${context.original_message}
Max Products: ${context.max_products}
Include Prices: ${context.include_prices}

**IMPORTANT**: Respond ONLY with valid JSON matching RAMSummarySchema. No additional text or explanations.`;

			// Generate response with enhanced instructions
			const response = await this.generate(
				[
					{
						role: "system",
						content: summaryInstructions,
					},
					{
						role: "user",
						content: `Provide quick RAM summary for: "${message}"`,
					},
				],
				{
					structuredOutput: {
						schema: RAMSummarySchema,
					},
				},
			);

			const processingTime = Date.now() - startTime;

			// Check timeout
			if (processingTime > context.timeout_ms) {
				console.warn(
					"⚠️ [RAM Specialist] Summary generation exceeded timeout",
					{ processingTime, timeout: context.timeout_ms },
				);
				return {
					status: "timeout",
					error: "Response generation exceeded timeout",
					processingTime,
				};
			}

			console.log("✅ [RAM Specialist] Summary response generated successfully", {
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
				"❌ [RAM Specialist] Summary response generation failed:",
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

// Export the single, unified RAM specialist instance
export const ramSpecialist = new RAMSpecialist();
