import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { optimizedMemoryManager } from "../core/memory/optimized-memory-manager";
import type { RAMSpecialistData } from "../core/models/specialist-data-models";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { getLibSQLConfig } from "../database/libsql";
import { embedder } from "../embedding/provider";
import { mastraModelProvider } from "../llm/provider";
import {
	RAMSummarySchema,
	type SummaryModeContext,
} from "../schemas/specialist-summary-schemas";
import { ramDatabaseTool } from "../tools/ram-database-tool";
import { chromaVector } from "../vector/chroma";
// Embedded interfaces from ram-knowledge-base

// Interface for a single RAM product's detailed information
export interface RAMProductInfo {
	sku: string;
	name: string;
	type: string;
	capacity: string;
	speed: string;
	latency: string;
	voltage: string;
	formFactor: string;
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
	type?: string;
	speed?: string;
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

// RAM Brand mapping for enhanced brand recognition
const RAM_BRAND_MAPPING: Record<string, string[]> = {
	Corsair: ["Corsair", "CORSAIR", "corsair", "Vengeance", "Dominator", "LPX"],
	"G.Skill": ["G.Skill", "G.SKILL", "g.skill", "Trident", "Ripjaws", "Sniper"],
	Kingston: ["Kingston", "KINGSTON", "kingston", "HyperX", "ValueRAM", "Fury"],
	Crucial: ["Crucial", "CRUCIAL", "crucial", "Ballistix", "CT"],
	Samsung: ["Samsung", "SAMSUNG", "samsung"],
	Adata: ["Adata", "ADATA", "adata", "XPG", "Spectrix"],
	TeamGroup: ["Team Group", "TeamGroup", "TEAMGROUP", "T-Force", "Elite"],
	GeIL: ["GeIL", "GEIL", "geil"],
};

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
	// Embedded knowledge base properties
	private products: RAMProductInfo[] = [];
	private isKnowledgeBaseInitialized: boolean = false;

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

		console.log("📚 [RAM Specialist] Initializing embedded knowledge base...");
		// Initialize embedded knowledge base
		this.initializeKnowledgeBase();
	}

	// Embedded knowledge base initialization method
	private async initializeKnowledgeBase(): Promise<void> {
		if (this.isKnowledgeBaseInitialized) {
			console.log("📚 [RAM Specialist] Knowledge base already initialized.");
			return;
		}

		console.log("📚 [RAM Specialist] Loading all RAM products...");
		try {
			// Use the ramDatabaseTool to fetch all products
			const toolResult = await ramDatabaseTool.execute({
				context: { query: "ram", budget: { max: 999999999 } } as any,
				mastra: null, // Tool needs to be independent
			});

			if (toolResult.specialistData?.recommendations) {
				this.products = toolResult.specialistData.recommendations.map(
					(rec) => ({
						sku: rec.productId,
						name: rec.productName,
						type: rec.specifications.type,
						capacity: rec.specifications.capacity,
						speed: rec.specifications.speed,
						latency: rec.specifications.latency,
						voltage: rec.specifications.voltage,
						formFactor: rec.specifications.formFactor,
						price: rec.price,
						compatibility: [], // Tool output doesn't provide this directly, needs mapping
						useCases: rec.useCases || [],
						stockStatus: rec.availability,
						description: rec.description,
					}),
				);
				this.isKnowledgeBaseInitialized = true;
				console.log(
					`✅ [RAM Specialist] Loaded ${this.products.length} RAM products.`,
				);
			} else {
				console.warn(
					"⚠️ [RAM Specialist] No RAM products found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [RAM Specialist] Failed to initialize:", error);
			this.isKnowledgeBaseInitialized = false;
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
			if (!this.isKnowledgeBaseReady()) {
				console.warn(
					"⚠️ [RAM Specialist] Knowledge Base not ready, attempting to initialize...",
				);
				await this.initializeKnowledgeBase();
				if (!this.isKnowledgeBaseReady()) {
					throw new Error("Knowledge Base failed to initialize.");
				}
			}

			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await optimizedMemoryManager.getUserContext("unknown", conversationId);
			}

			const extendedContext = { ...context, sharedContext };

			// Use the ramDatabaseTool to search for RAMs (like CPU specialist)
			const toolResult = await ramDatabaseTool.execute({
				context: { query: message, ...extendedContext },
				mastra: null, // Tool needs to be independent
			});

			if (!toolResult.specialistData?.recommendations) {
				console.warn(
					"⚠️ [RAM Specialist] No recommendations from database tool",
				);
				return null;
			}

			// Use the tool result directly (already in correct RAMSpecialistData format)
			const specialistData: RAMSpecialistData = {
				...toolResult.specialistData,
				processingMetadata: {
					processingTime: Date.now() - startTime,
					dataSources: ["SSTC RAM Database Tool"],
					completeness:
						toolResult.specialistData.recommendations.length > 0 ? 100 : 0,
				},
			};

			console.log(
				"✅ [RAM Specialist] Structured data retrieved from Database Tool",
				{
					productsFound: specialistData.recommendations.length,
					confidenceScore: specialistData.confidenceScore,
					processingTime: Date.now() - startTime,
				},
			);

			return specialistData;
		} catch (error: any) {
			console.error(
				"❌ [RAM Specialist] Failed to get structured recommendations from Database Tool:",
				error.message,
			);
			return null;
		}
	}

	// Method for generating structured response with full error handling and timeout support
	async generateStructuredResponse(
		message: string,
		context: any = {},
		conversationId?: string,
	): Promise<{
		status: "success" | "failed" | "timeout";
		data?: RAMSpecialistData;
		error?: string;
		processingTime?: number;
	}> {
		const startTime = Date.now();

		console.log("🔄 [RAM Specialist] Generating structured response for Mai", {
			messageLength: message.length,
			contextKeys: context ? Object.keys(context) : [],
			conversationId,
		});

		try {
			// Nếu có conversationId, lấy thêm context từ shared memory
			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await optimizedMemoryManager.getUserContext("unknown", conversationId);
			}

			// Tạo context mở rộng với thông tin từ shared context
			const extendedContext = {
				...context,
				sharedContext: sharedContext,
			};

			// Process the RAM query and get structured data
			const structuredData = await this.getStructuredRecommendations(
				message,
				extendedContext,
				conversationId,
			);

			if (!structuredData) {
				console.warn("⚠️ [Backend RAM Specialist] No structured data returned");
				return {
					status: "failed",
					error: "No structured data returned from RAM database tool",
					processingTime: Date.now() - startTime,
				};
			}

			console.log(
				"✅ [Backend RAM Specialist] Structured response generated successfully",
				{
					recommendationsCount: structuredData.recommendations.length,
					confidenceScore: structuredData.confidenceScore,
					processingTime: Date.now() - startTime,
				},
			);

			return {
				status: "success",
				data: structuredData,
				processingTime: Date.now() - startTime,
			};
		} catch (error: any) {
			console.error(
				"❌ [Backend RAM Specialist] Structured response generation failed:",
				error.message,
			);

			return {
				status: "failed",
				error: error.message,
				processingTime: Date.now() - startTime,
			};
		}
	}

	// Method to generate response in parallel processing architecture
	async generateParallelResponse(
		messages: any[],
		options: any = {},
	): Promise<{
		status: "success" | "failed" | "timeout";
		data?: any;
		error?: string;
		processingTime?: number;
	}> {
		const startTime = Date.now();

		console.log("🔄 [Backend RAM Specialist] Generating parallel response", {
			messagesCount: messages.length,
			optionsKeys: Object.keys(options),
		});

		try {
			// Extract the user message from the messages array
			const userMessage =
				messages.find((msg) => msg.role === "user")?.content || "";

			// Extract conversationId from options if available
			const conversationId =
				options.conversationId || options.context?.conversationId;

			// Generate structured response
			const result = await this.generateStructuredResponse(
				userMessage,
				options.context || {},
				conversationId,
			);

			console.log("✅ [Backend RAM Specialist] Parallel response generated", {
				status: result.status,
				processingTime: Date.now() - startTime,
			});

			return {
				...result,
				processingTime: Date.now() - startTime,
			};
		} catch (error: any) {
			console.error(
				"❌ [Backend RAM Specialist] Parallel response generation failed:",
				error.message,
			);

			return {
				status: "failed",
				error: error.message,
				processingTime: Date.now() - startTime,
			};
		}
	}

	// Method for context-aware recommendations using shared memory
	async getContextAwareRecommendations(
		message: string,
		conversationId?: string,
	): Promise<RAMSpecialistData | null> {
		console.log(
			"🧠 [Backend RAM Specialist] Getting context-aware recommendations",
			{
				messageLength: message.length,
				conversationId,
			},
		);

		try {
			// Nếu có conversationId, lấy context từ shared memory
			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await optimizedMemoryManager.getUserContext("unknown", conversationId);
			}

			// Tạo context với thông tin user profile
			const context: any = {
				sharedContext: sharedContext,
			};

			// Nếu có user profile, thêm vào context
			if (sharedContext?.userProfile) {
				context.userProfile = sharedContext.userProfile;

				// Thêm thông tin về interests và goals để cá nhân hóa recommendations
				if (sharedContext.userProfile.interests) {
					context.userInterests = Object.keys(
						sharedContext.userProfile.interests,
					);
				}

				if (sharedContext.userProfile.goals) {
					context.userGoals = Object.keys(sharedContext.userProfile.goals);
				}
			}

			// Process the RAM query with context
			const structuredData = await this.getStructuredRecommendations(message, context, conversationId);

			console.log(
				"✅ [Backend RAM Specialist] Context-aware recommendations generated",
				{
					hasData: !!structuredData,
					recommendationsCount: structuredData?.recommendations?.length || 0,
				},
			);

			return structuredData;
		} catch (error: any) {
			console.error(
				"❌ [Backend RAM Specialist] Context-aware recommendations failed:",
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

	// Embedded knowledge base methods
	private getProductInfoInternal(ramModel: string): RAMProductInfo | null {
		return (
			this.products.find((p) =>
				p.name.toLowerCase().includes(ramModel.toLowerCase()),
			) || null
		);
	}

	private searchRAMsInternal(criteria: SearchCriteria): RAMProductInfo[] {
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
		if (criteria.type) {
			results = results.filter(
				(p) => p.type.toLowerCase() === criteria.type?.toLowerCase(),
			);
		}
		if (criteria.speed) {
			results = results.filter((p) =>
				p.speed.toLowerCase().includes(criteria.speed.toLowerCase()),
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
		ramModel: string,
		motherboardOrChipset: string,
	): CompatibilityResult {
		const ram = this.getProductInfoInternal(ramModel);
		if (!ram) {
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: [`RAM model '${ramModel}' not found.`],
				recommendations: [],
			};
		}

		// Simplified compatibility logic for demonstration
		const issues: string[] = [];
		const recommendations: string[] = [];
		let isCompatible = true;

		if (
			ram.type.toLowerCase() === "ddr5" &&
			!motherboardOrChipset.toLowerCase().includes("ddr5")
		) {
			issues.push("DDR5 RAM requires a DDR5 compatible motherboard.");
			isCompatible = false;
		}
		if (
			ram.type.toLowerCase() === "ddr4" &&
			!motherboardOrChipset.toLowerCase().includes("ddr4")
		) {
			issues.push("DDR4 RAM requires a DDR4 compatible motherboard.");
			isCompatible = false;
		}

		recommendations.push(
			"Ensure your motherboard has the correct RAM type (DDR4 or DDR5) and compatible slots.",
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

	// Enhanced brand extraction using brand mapping
	private extractBrand(productName: string): string {
		for (const [brand, variants] of Object.entries(RAM_BRAND_MAPPING)) {
			if (variants.some(variant => 
				productName.toLowerCase().includes(variant.toLowerCase())
			)) {
				return brand;
			}
		}
		// Fallback to first word if no mapping found
		return productName.split(' ')[0];
	}

	// Enhanced RAM specification detection
	private detectRAMGeneration(ram: RAMProductInfo): string {
		if (ram.type.toLowerCase().includes('ddr5')) return 'DDR5';
		if (ram.type.toLowerCase().includes('ddr4')) return 'DDR4';
		if (ram.type.toLowerCase().includes('ddr3')) return 'DDR3';
		return 'Unknown';
	}

	private getStatisticsInternal(): any {
		const brands = new Set(this.products.map((p) => this.extractBrand(p.name)));
		const capacities = new Set(this.products.map((p) => p.capacity));
		const types = new Set(this.products.map((p) => p.type));
		const avgPrice =
			this.products.length > 0
				? this.products.reduce((sum, p) => sum + p.price, 0) /
					this.products.length
				: 0;

		return {
			totalProducts: this.products.length,
			brands: Array.from(brands),
			capacities: Array.from(capacities),
			types: Array.from(types),
			avgPrice: parseFloat(avgPrice.toFixed(2)),
		};
	}

	// Public API methods using embedded functionality
	async getProductInfo(ramModel: string): Promise<RAMProductInfo | null> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return null;
		}
		return this.getProductInfoInternal(ramModel);
	}

	async searchRAMs(criteria: SearchCriteria): Promise<RAMProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return [];
		}
		return this.searchRAMsInternal(criteria);
	}

	async checkCompatibility(
		ramModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
			return {
				isCompatible: false,
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}
		return this.checkCompatibilityInternal(ramModel, motherboardOrChipset);
	}

	async getAllRAMs(): Promise<RAMProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [RAM Specialist] Knowledge Base not ready");
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
				console.warn("⚠️ [RAM Specialist] Summary generation exceeded timeout", {
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
				"✅ [RAM Specialist] Summary response generated successfully",
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
