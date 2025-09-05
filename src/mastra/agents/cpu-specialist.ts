import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { sharedContextManager } from "../core/memory/shared-context-manager";
import type { CPUSpecialistData } from "../core/models/specialist-data-models";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { getLibSQLConfig } from "../database/libsql";
import { embedder } from "../embedding/provider";
import { mastraModelProvider } from "../llm/provider";
import {
	CPUSummarySchema,
	type SummaryModeContext,
} from "../schemas/specialist-summary-schemas";
import { cpuDatabaseTool } from "../tools/cpu-database-tool";
import { chromaVector } from "../vector/chroma";
import {
	type CompatibilityResult,
	type CPUProductInfo,
	cpuKnowledgeBase,
	type SearchCriteria,
} from "./cpu-knowledge-base";

// CPU Specialist Personality - Multi-mode operation for parallel processing
const CPU_SPECIALIST_PERSONALITY = `# CPU Specialist - SSTC Processor Expert

## Core Personality
Tôi là chuyên gia vi xử lý CPU của SSTC, có thể hoạt động ở nhiều chế độ khác nhau:
- **Backend Service**: Cung cấp dữ liệu cấu trúc cho hệ thống
- **Direct Consultant**: Tương tác trực tiếp với khách hàng
- **Summary Mode**: Tạo tóm tắt nhanh cho parallel processing

## Operating Modes

### 1. Summary Mode (QUICK_SUMMARY) - For Parallel Processing
- **Purpose**: Tạo tóm tắt nhanh để hỗ trợ Mai agent trong xử lý song song
- **Tone**: Ngắn gọn, có cấu trúc, tập trung vào thông tin chính
- **Focus**: 2-3 sản phẩm CPU phổ biến, giá cả, đặc điểm nổi bật
- **Output**: JSON format theo CPUSummarySchema
- **Time Limit**: Phải hoàn thành trong 3 giây

**Summary Mode Instructions:**
When in QUICK_SUMMARY mode, provide concise, structured information about CPUs:

For general inquiries ("CPU nào tốt", "bán CPU gì"):
- Include 2-3 most popular CPU models with prices
- Brief specs (cores, clock speed, architecture)
- Use cases (gaming, office, content creation)
- Price range overview
- Brand recommendations (Intel vs AMD)

For specific inquiries:
- Focus on relevant CPU models matching the query
- Key differentiators and performance metrics
- Specific recommendations based on use case
- Compatibility notes if relevant

Response Format (JSON):
{
  "category": "CPU",
  "popular_products": [
    {"name": "Intel i5-13400F", "price": "4.5 triệu", "specs": "10 cores, 4.6GHz", "use_case": "Gaming"},
    {"name": "AMD Ryzen 5 7600X", "price": "5.2 triệu", "specs": "6 cores, 5.3GHz", "use_case": "Gaming"},
    {"name": "Intel i3-12100F", "price": "2.8 triệu", "specs": "4 cores, 4.3GHz", "use_case": "Budget"}
  ],
  "price_range": "từ 2.5 triệu đến 15 triệu",
  "summary": "Bên SSTC có đầy đủ CPU Intel và AMD cho mọi nhu cầu từ văn phòng đến gaming",
  "recommendations": ["i5 cho gaming", "i3 cho văn phòng", "Ryzen cho content creation"],
  "brands_available": ["Intel", "AMD"],
  "socket_types": ["LGA1700", "AM5", "LGA1200", "AM4"]
}

### 2. Backend Service Mode (Default):
- **Tone**: Kỹ thuật, chính xác, tập trung vào dữ liệu
- **Focus**: Trích xuất dữ liệu cấu trúc, phân tích kỹ thuật, cung cấp thông tin cho hệ thống
- **Output**: Dữ liệu có cấu trúc (CPUSpecialistData) cho agent khác sử dụng

### 3. Direct Consultant Mode:
- **Tone**: Chuyên nghiệp, nhiệt tình, dễ hiểu như một nhân viên kinh doanh SSTC
- **Focus**: Tư vấn kỹ thuật CPU, tương thích hệ thống, giá trị cho khách hàng
- **Output**: Phản hồi thân thiện với khách hàng bằng tiếng Việt/Anh

## Business Context
- **Company**: SSTC - Công ty chuyên cung cấp linh kiện máy tính
- **Role**: Chuyên gia vi xử lý CPU với khả năng làm việc backend và frontend
- **Products**: Vi xử lý máy tính CPU dùng để ráp, nâng cấp, thay thế cho desktop, minipc, laptop
- **Position**: Làm việc phía sau hoặc trực tiếp với khách hàng để hỗ trợ tư vấn CPU

## Key Expertise Areas

### 1. Data Processing & Analysis
- **Technical Specifications**: Trích xuất thông số kỹ thuật từ cơ sở dữ liệu sản phẩm
- **Performance Metrics**: Phân tích hiệu năng dựa trên tốc độ, số nhân/lõi, điện năng
- **Compatibility Analysis**: Phân tích tương thích với mainboard, RAM, tản nhiệt
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi

### 2. Product Knowledge
- **Intel vs AMD**: Sự khác biệt về hiệu năng, điện năng, giá cả cho khách hàng lựa chọn
- **Socket Types**: LGA1700, AM5, LGA1200, AM4 và các socket phổ biến
- **Architecture Generations**: Intel Gen10, Gen11, Gen12, Gen13, Gen14 và AMD Zen2, Zen3, Zen4, Zen5
- **Core/Thread Counts**: Số nhân/lõi ảnh hưởng hiệu năng đa nhiệm

### 3. Use Case Matching
- **Gaming**: Tối ưu hiệu năng đơn nhân và xung nhịp cao (3.5GHz+) cho game thủ
- **Content Creation**: Nhiều nhân/lõi (8+) và hiệu năng đa nhân cho làm video/render
- **Office/Productivity**: CPU giá tốt, độ tin cậy cao cho văn phòng
- **Upgrade/Replacement**: Hướng dẫn khách hàng nâng cấp/thay thế hiệu quả

## Working Modes

### 1. Backend Processing Mode (Default)
Khi được gọi từ hệ thống workflow:
- Nhận yêu cầu truy vấn CPU từ Mai hoặc các agent khác
- Trích xuất dữ liệu từ database thông qua cpuDatabaseTool
- Trả về dữ liệu cấu trúc (CPUSpecialistData) cho agent khác tích hợp
- Không tương tác trực tiếp với khách hàng

### 2. Direct Consultation Mode
Khi được gọi trực tiếp để tư vấn khách hàng:
- Tương tác như một nhân viên bán hàng SSTC
- Sử dụng kiến thức chuyên sâu để tư vấn sản phẩm phù hợp
- Giải thích kỹ thuật đơn giản, dễ hiểu cho khách hàng
- Hỗ trợ quyết định mua hàng của khách hàng

## Response Guidelines

### For Backend Processing:
- Trả về dữ liệu có cấu trúc theo interface CPUSpecialistData
- Bao gồm recommendations, technicalAnalysis, pricingInfo, availability
- Không cần format thân thiện với người dùng
- Focus vào độ chính xác và đầy đủ thông tin

### For Direct Consultation:
- Phản hồi bằng tiếng Việt hoặc tiếng Anh theo yêu cầu khách hàng
- Sử dụng ngôn ngữ dễ hiểu, tránh thuật ngữ kỹ thuật phức tạp
- Cung cấp thông tin sản phẩm cụ thể với model number và giá cả
- Luôn tập trung vào giá trị và lợi ích cho khách hàng`;

export class CPUSpecialist extends Agent {
	constructor() {
		super({
			name: "CPU Specialist",
			description:
				"CPU product specialist for data analysis and customer consultation",
			instructions: CPU_SPECIALIST_PERSONALITY,
			model: mastraModelProvider(),
			tools: {
				cpuDatabaseTool,
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

		// Khởi tạo CPU Knowledge Base
		this.initializeKnowledgeBase();
	}

	// Phương thức khởi tạo knowledge base
	private async initializeKnowledgeBase(): Promise<void> {
		try {
			console.log("🏗️ [CPU Specialist] Initializing CPU Knowledge Base...");
			await cpuKnowledgeBase.initialize();
			console.log(
				"✅ [CPU Specialist] CPU Knowledge Base initialized successfully",
			);

			// Hiển thị thống kê cơ bản
			const stats = cpuKnowledgeBase.getStatistics();
			console.log("📊 [CPU Specialist] Knowledge Base Statistics:", {
				totalProducts: stats.totalProducts,
				brands: stats.brands.length,
				sockets: stats.sockets.length,
				avgPrice: stats.avgPrice,
			});
		} catch (error) {
			console.error(
				"❌ [CPU Specialist] Failed to initialize Knowledge Base:",
				error,
			);
		}
	}

	// Method to process CPU queries and return structured data for Mai
	async processCPUQueryForMai(
		query: string,
		context: any = {},
	): Promise<CPUSpecialistData | null> {
		console.log("🧠 [CPU Specialist] Processing CPU query for Mai", {
			queryLength: query.length,
			hasContext: !!context,
		});

		try {
			// Use the structured CPU database tool to get data
			const toolResult = await cpuDatabaseTool.execute({
				context: {
					query,
					...context,
				} as any,
				mastra: this.mastra, // Pass the mastra instance for database access
			});

			console.log("✅ [CPU Specialist] Structured data retrieved", {
				productsFound: toolResult.specialistData.recommendations.length,
				confidenceScore: toolResult.specialistData.confidenceScore,
			});

			// Return the structured data that Mai can use
			return toolResult.specialistData;
		} catch (error: any) {
			console.error(
				"❌ [CPU Specialist] Query processing failed:",
				error.message,
			);

			// Return null to indicate failure, Mai can handle this gracefully
			return null;
		}
	}

	// Enhanced method that handles the full processing cycle
	async generateStructuredResponse(
		message: string,
		context: any = {},
		conversationId?: string,
	): Promise<{
		status: "success" | "failed" | "timeout";
		data?: CPUSpecialistData;
		error?: string;
		processingTime?: number;
	}> {
		const startTime = Date.now();

		console.log("🔄 [CPU Specialist] Generating structured response for Mai", {
			messageLength: message.length,
			contextKeys: context ? Object.keys(context) : [],
			conversationId,
		});

		try {
			// Nếu có conversationId, lấy thêm context từ shared memory
			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await sharedContextManager.getContext(conversationId);
			}

			// Tạo context mở rộng với thông tin từ shared context
			const extendedContext = {
				...context,
				sharedContext: sharedContext,
			};

			// Process the CPU query and get structured data
			const structuredData = await this.processCPUQueryForMai(
				message,
				extendedContext,
			);

			if (!structuredData) {
				console.warn("⚠️ [Backend CPU Specialist] No structured data returned");
				return {
					status: "failed",
					error: "No structured data returned from CPU database tool",
					processingTime: Date.now() - startTime,
				};
			}

			console.log(
				"✅ [Backend CPU Specialist] Structured response generated successfully",
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
				"❌ [Backend CPU Specialist] Structured response generation failed:",
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

		console.log("🔄 [Backend CPU Specialist] Generating parallel response", {
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

			console.log("✅ [Backend CPU Specialist] Parallel response generated", {
				status: result.status,
				processingTime: Date.now() - startTime,
			});

			return {
				...result,
				processingTime: Date.now() - startTime,
			};
		} catch (error: any) {
			console.error(
				"❌ [Backend CPU Specialist] Parallel response generation failed:",
				error.message,
			);

			return {
				status: "failed",
				error: error.message,
				processingTime: Date.now() - startTime,
			};
		}
	}

	// Method to get context-aware recommendations
	async getContextAwareRecommendations(
		message: string,
		conversationId?: string,
	): Promise<CPUSpecialistData | null> {
		console.log(
			"🧠 [Backend CPU Specialist] Getting context-aware recommendations",
			{
				messageLength: message.length,
				conversationId,
			},
		);

		try {
			// Nếu có conversationId, lấy context từ shared memory
			let sharedContext: any = null;
			if (conversationId) {
				sharedContext = await sharedContextManager.getContext(conversationId);
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

			// Process the CPU query with context
			const structuredData = await this.processCPUQueryForMai(message, context);

			console.log(
				"✅ [Backend CPU Specialist] Context-aware recommendations generated",
				{
					hasData: !!structuredData,
					recommendationsCount: structuredData?.recommendations?.length || 0,
				},
			);

			return structuredData;
		} catch (error: any) {
			console.error(
				"❌ [Backend CPU Specialist] Context-aware recommendations failed:",
				error.message,
			);
			return null;
		}
	}

	// Phương thức API nội bộ: Lấy thông tin chi tiết CPU
	async getProductInfo(cpuModel: string): Promise<CPUProductInfo | null> {
		if (!cpuKnowledgeBase.isReady()) {
			console.warn(
				"⚠️ [CPU Specialist] Knowledge Base not ready, falling back to database tool",
			);
			// Fallback to database tool if knowledge base not ready
			return null;
		}

		return cpuKnowledgeBase.getProductInfo(cpuModel);
	}

	// Phương thức API nội bộ: Tìm kiếm CPU theo tiêu chí
	async searchCPUs(criteria: SearchCriteria): Promise<CPUProductInfo[]> {
		if (!cpuKnowledgeBase.isReady()) {
			console.warn(
				"⚠️ [CPU Specialist] Knowledge Base not ready, falling back to database tool",
			);
			// Fallback to database tool if knowledge base not ready
			return [];
		}

		return cpuKnowledgeBase.searchCPUs(criteria);
	}

	// Phương thức API nội bộ: Kiểm tra tương thích
	async checkCompatibility(
		cpuModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!cpuKnowledgeBase.isReady()) {
			console.warn(
				"⚠️ [CPU Specialist] Knowledge Base not ready, falling back to database tool",
			);
			// Fallback to database tool if knowledge base not ready
			return {
				isCompatible: false,
				compatibleChipsets: [],
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}

		return cpuKnowledgeBase.checkCompatibility(cpuModel, motherboardOrChipset);
	}

	// Phương thức API nội bộ: Lấy tất cả CPU
	async getAllCPUs(): Promise<CPUProductInfo[]> {
		if (!cpuKnowledgeBase.isReady()) {
			console.warn("⚠️ [CPU Specialist] Knowledge Base not ready");
			return [];
		}

		return cpuKnowledgeBase.getAllCPUs();
	}

	// Phương thức API nội bộ: Kiểm tra trạng thái knowledge base
	isKnowledgeBaseReady(): boolean {
		return cpuKnowledgeBase.isReady();
	}

	// Phương thức API nội bộ: Lấy thống kê
	getKnowledgeBaseStats(): any {
		if (!cpuKnowledgeBase.isReady()) {
			return { ready: false };
		}

		return {
			ready: true,
			...cpuKnowledgeBase.getStatistics(),
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

		console.log("🔄 [CPU Specialist] Generating summary response", {
			messageLength: message.length,
			intent: context.user_intent,
			timeoutMs: context.timeout_ms,
		});

		try {
			// Create enhanced instructions for summary mode
			const summaryInstructions = `${CPU_SPECIALIST_PERSONALITY}

**CURRENT MODE: QUICK_SUMMARY**

User Intent: ${context.user_intent}
Original Message: ${context.original_message}
Max Products: ${context.max_products}
Include Prices: ${context.include_prices}

**IMPORTANT**: Respond ONLY with valid JSON matching CPUSummarySchema. No additional text or explanations.`;

			// Generate response with enhanced instructions
			const response = await this.generate(
				[
					{
						role: "system",
						content: summaryInstructions,
					},
					{
						role: "user",
						content: `Provide quick CPU summary for: "${message}"`,
					},
				],
				{
					structuredOutput: {
						schema: CPUSummarySchema,
					},
				},
			);

			const processingTime = Date.now() - startTime;

			// Check timeout
			if (processingTime > context.timeout_ms) {
				console.warn("⚠️ [CPU Specialist] Summary generation exceeded timeout", {
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
				"✅ [CPU Specialist] Summary response generated successfully",
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
				"❌ [CPU Specialist] Summary response generation failed:",
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

// Export CPU specialist instance
export const cpuSpecialist = new CPUSpecialist();
