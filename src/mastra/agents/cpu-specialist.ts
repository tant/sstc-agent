import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { optimizedMemoryManager } from "../core/memory/optimized-memory-manager";
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
// Embedded interfaces from cpu-knowledge-base

// Interface for a single CPU product's detailed information
export interface CPUProductInfo {
	sku: string;
	name: string;
	model: string;
	brand: string;
	series: string;
	socket: string;
	cores: number;
	threads: number;
	baseClock: string;
	boostClock: string;
	powerConsumption: string;
	l3Cache: string;
	architecture: string;
	integratedGraphics?: string;
	price: number;
	compatibility: string[];
	useCases: string[];
	stockStatus: string;
	description: string;
	tdp: string;
	benchmarkScore?: string;
	pricePerPerformance?: string;
	futureProofing?: string;
}

// Interface for compatibility results
export interface CompatibilityResult {
	isCompatible: boolean;
	compatibleChipsets: string[];
	compatibleMotherboards: string[];
	issues: string[];
	recommendations: string[];
}

// Interface for search criteria
export interface SearchCriteria {
	brand?: string;
	series?: string;
	socket?: string;
	cores?: number;
	minCores?: number;
	maxCores?: number;
	minPrice?: number;
	maxPrice?: number;
	useCase?: string;
	motherboardCompatibility?: string;
	chipset?: string;
}

// CPU Chipset compatibility mapping
const CPU_CHIPSET_COMPATIBILITY: Record<string, string[]> = {
	// Intel 12th Gen (Alder Lake)
	LGA1700: ["Z690", "B660", "H610"],

	// Intel 13th Gen (Raptor Lake)
	LGA1700_13TH: ["Z790", "B760", "H770"],

	// Intel 14th Gen (Raptor Lake Refresh)
	LGA1700_14TH: ["Z790", "B760", "H770"],

	// AMD AM4
	AM4: ["B550", "X570", "B450", "X470", "A320"],

	// AMD AM5 (Zen 4/5)
	AM5: ["X670", "B650", "X670E", "B650E"],
};

// Chipset motherboard brands mapping
const CHIPSET_MOTHERBOARD_BRANDS: Record<string, string[]> = {
	Z790: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	B760: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	Z690: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	B660: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	X670: ["ASUS", "MSI", "Gigabyte", "ASRock"],
	B650: ["ASUS", "MSI", "Gigabyte", "ASRock"],
};

// CPU Brand mapping for enhanced brand recognition
const CPU_BRAND_MAPPING: Record<string, string[]> = {
	Intel: ["Intel", "INTEL", "intel", "Core i3", "Core i5", "Core i7", "Core i9"],
	AMD: ["AMD", "amd", "Advanced Micro Devices", "Ryzen 3", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
};

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
	// Embedded knowledge base properties
	private products: CPUProductInfo[] = [];
	private isKnowledgeBaseInitialized: boolean = false;

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

		console.log("📚 [CPU Specialist] Initializing embedded knowledge base...");
		// Initialize embedded knowledge base
		this.initializeKnowledgeBase();
	}

	// Embedded knowledge base initialization method
	private async initializeKnowledgeBase(): Promise<void> {
		if (this.isKnowledgeBaseInitialized) {
			console.log("📚 [CPU Specialist] Knowledge base already initialized.");
			return;
		}

		console.log("📚 [CPU Specialist] Loading all CPU products...");
		try {
			// Use the cpuDatabaseTool to fetch all products
			const toolResult = await cpuDatabaseTool.execute({
				context: { query: "cpu", budget: { max: 999999999 } } as any,
				mastra: null, // Tool needs to be independent
			});

			if (toolResult.specialistData?.recommendations) {
				this.products = toolResult.specialistData.recommendations.map(
					(rec) => ({
						sku: rec.productId,
						name: rec.productName,
						model: rec.specifications.model || rec.productName,
						brand: rec.specifications.brand,
						series: rec.specifications.series || "",
						socket: rec.specifications.socket,
						cores: rec.specifications.cores,
						threads: rec.specifications.threads,
						baseClock: rec.specifications.baseClock || "",
						boostClock: rec.specifications.boostClock || "",
						powerConsumption: rec.specifications.powerConsumption || "",
						l3Cache: rec.specifications.l3Cache || "",
						architecture: rec.specifications.architecture || "",
						integratedGraphics: rec.specifications.integratedGraphics,
						price: rec.price,
						compatibility: [], // Tool output doesn't provide this directly, needs mapping
						useCases: rec.useCases || [],
						stockStatus: rec.availability,
						description: rec.description || "",
						tdp: rec.specifications.powerConsumption || "",
						benchmarkScore: rec.specifications.benchmarkScore,
						pricePerPerformance: rec.specifications.pricePerPerformance,
						futureProofing: rec.specifications.futureProofing,
					}),
				);
				this.isKnowledgeBaseInitialized = true;
				console.log(
					`✅ [CPU Specialist] Loaded ${this.products.length} CPU products.`,
				);
			} else {
				console.warn(
					"⚠️ [CPU Specialist] No CPU products found during initialization.",
				);
			}
		} catch (error) {
			console.error("❌ [CPU Specialist] Failed to initialize:", error);
			this.isKnowledgeBaseInitialized = false;
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
				sharedContext = await optimizedMemoryManager.getUserContext("unknown", conversationId);
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

	// Embedded knowledge base methods
	private getProductInfoInternal(cpuModel: string): CPUProductInfo | null {
		return (
			this.products.find(
				(p) =>
					p.name.toLowerCase().includes(cpuModel.toLowerCase()) ||
					p.model.toLowerCase().includes(cpuModel.toLowerCase()),
			) || null
		);
	}

	private searchCPUsInternal(criteria: SearchCriteria): CPUProductInfo[] {
		let results = [...this.products];

		if (criteria.brand) {
			results = results.filter(
				(cpu) => cpu.brand.toLowerCase() === criteria.brand?.toLowerCase(),
			);
		}

		if (criteria.series) {
			results = results.filter((cpu) =>
				cpu.series.toLowerCase().includes(criteria.series!.toLowerCase()),
			);
		}

		if (criteria.socket) {
			results = results.filter(
				(cpu) => cpu.socket.toLowerCase() === criteria.socket?.toLowerCase(),
			);
		}

		if (criteria.cores !== undefined) {
			results = results.filter((cpu) => cpu.cores === criteria.cores);
		}

		if (criteria.minCores !== undefined) {
			results = results.filter((cpu) => cpu.cores >= criteria.minCores!);
		}

		if (criteria.maxCores !== undefined) {
			results = results.filter((cpu) => cpu.cores <= criteria.maxCores!);
		}

		if (criteria.minPrice !== undefined) {
			results = results.filter((cpu) => cpu.price >= criteria.minPrice!);
		}

		if (criteria.maxPrice !== undefined) {
			results = results.filter((cpu) => cpu.price <= criteria.maxPrice!);
		}

		if (criteria.useCase) {
			const useCase = criteria.useCase.toLowerCase();
			results = results.filter((cpu) =>
				cpu.useCases.some((uc) => uc.toLowerCase().includes(useCase)),
			);
		}

		return results;
	}

	private checkCompatibilityInternal(
		cpuModel: string,
		motherboardOrChipset: string,
	): CompatibilityResult {
		const cpu = this.getProductInfoInternal(cpuModel);
		if (!cpu) {
			return {
				isCompatible: false,
				compatibleChipsets: [],
				compatibleMotherboards: [],
				issues: [`CPU model '${cpuModel}' not found.`],
				recommendations: [],
			};
		}

		const socket = cpu.socket;
		const compatibleChipsets = CPU_CHIPSET_COMPATIBILITY[socket] || [];
		const issues: string[] = [];
		const recommendations: string[] = [];
		let isCompatible = false;

		// Check if the motherboard/chipset is compatible
		if (compatibleChipsets.length > 0) {
			isCompatible = compatibleChipsets.some((chipset) =>
				motherboardOrChipset.toLowerCase().includes(chipset.toLowerCase()),
			);

			if (!isCompatible) {
				issues.push(
					`This ${cpu.brand} ${cpu.model} (${socket}) requires a compatible chipset: ${compatibleChipsets.join(", ")}`,
				);
				recommendations.push(
					`Look for motherboards with ${compatibleChipsets.join(", ")} chipsets`,
				);
			}
		} else {
			issues.push(`Compatibility data not available for socket ${socket}`);
			recommendations.push(
				"Please check motherboard manual for socket compatibility",
			);
		}

		// Get compatible motherboard brands
		let compatibleMotherboards: string[] = [];
		for (const chipset of compatibleChipsets) {
			const brands = CHIPSET_MOTHERBOARD_BRANDS[chipset] || [];
			compatibleMotherboards = [...compatibleMotherboards, ...brands];
		}

		return {
			isCompatible,
			compatibleChipsets,
			compatibleMotherboards: [...new Set(compatibleMotherboards)], // Remove duplicates
			issues,
			recommendations,
		};
	}

	// Enhanced brand extraction using brand mapping
	private extractBrand(productName: string): string {
		for (const [brand, variants] of Object.entries(CPU_BRAND_MAPPING)) {
			if (variants.some(variant => 
				productName.toLowerCase().includes(variant.toLowerCase())
			)) {
				return brand;
			}
		}
		// Fallback to first word if no mapping found
		return productName.split(' ')[0];
	}

	// Enhanced CPU generation detection
	private detectCPUGeneration(cpu: CPUProductInfo): string {
		// Intel generation detection
		if (cpu.brand.toLowerCase().includes('intel')) {
			if (cpu.architecture?.includes('Alder Lake') || cpu.series?.includes('12')) return '12th Gen';
			if (cpu.architecture?.includes('Raptor Lake') || cpu.series?.match(/13th|14th/)) return '13th/14th Gen';
			if (cpu.series?.includes('11')) return '11th Gen';
			if (cpu.series?.includes('10')) return '10th Gen';
		}
		
		// AMD generation detection  
		if (cpu.brand.toLowerCase().includes('amd')) {
			if (cpu.architecture?.includes('Zen 4') || cpu.socket === 'AM5') return 'Zen 4';
			if (cpu.architecture?.includes('Zen 3') || cpu.socket === 'AM4') return 'Zen 3';
			if (cpu.architecture?.includes('Zen 2')) return 'Zen 2';
		}
		
		return 'Unknown';
	}

	private getStatisticsInternal(): any {
		if (!this.isKnowledgeBaseReady()) {
			return {
				totalProducts: 0,
				brands: [],
				sockets: [],
				avgPrice: 0,
			};
		}

		const brands = [...new Set(this.products.map((p) => this.extractBrand(p.name)))];
		const sockets = [...new Set(this.products.map((p) => p.socket))];
		const avgPrice =
			this.products.length > 0
				? this.products.reduce((sum, p) => sum + p.price, 0) /
					this.products.length
				: 0;

		return {
			totalProducts: this.products.length,
			brands,
			sockets,
			avgPrice: parseFloat(avgPrice.toFixed(2)),
		};
	}

	// Public API methods using embedded functionality
	async getProductInfo(cpuModel: string): Promise<CPUProductInfo | null> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [CPU Specialist] Knowledge Base not ready");
			return null;
		}
		return this.getProductInfoInternal(cpuModel);
	}

	async searchCPUs(criteria: SearchCriteria): Promise<CPUProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [CPU Specialist] Knowledge Base not ready");
			return [];
		}
		return this.searchCPUsInternal(criteria);
	}

	async checkCompatibility(
		cpuModel: string,
		motherboardOrChipset: string,
	): Promise<CompatibilityResult> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [CPU Specialist] Knowledge Base not ready");
			return {
				isCompatible: false,
				compatibleChipsets: [],
				compatibleMotherboards: [],
				issues: ["Knowledge base not initialized"],
				recommendations: ["Please initialize the knowledge base"],
			};
		}
		return this.checkCompatibilityInternal(cpuModel, motherboardOrChipset);
	}

	async getAllCPUs(): Promise<CPUProductInfo[]> {
		if (!this.isKnowledgeBaseReady()) {
			console.warn("⚠️ [CPU Specialist] Knowledge Base not ready");
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

	// Method to generate a human-readable response from the data
	generateHumanReadableResponse(data: CPUSpecialistData): string {
		if (!data || !data.recommendations || data.recommendations.length === 0) {
			return "Xin lỗi, tôi không tìm thấy sản phẩm CPU nào phù hợp với yêu cầu của bạn.";
		}

		const { recommendations, technicalAnalysis, confidenceScore } = data;

		let response = `Dựa trên phân tích, tôi có một vài đề xuất CPU cho bạn (độ tin cậy: ${(confidenceScore * 100).toFixed(0)}%):\n\n`;

		recommendations.forEach((rec, index) => {
			response += `${index + 1}. **${rec.productName}** - ${rec.price.toLocaleString()}đ\n`;
			response += `   - **Lý do đề xuất**: ${rec.keyFeatures.join(", ")}\n`;
			response += `   - **Thông số**: ${rec.specifications.cores} cores/${rec.specifications.threads} threads, ${rec.specifications.baseClock} base, ${rec.specifications.boostClock} boost\n`;
			response += `   - **Socket**: ${rec.specifications.socket} | **TDP**: ${rec.specifications.powerConsumption}\n`;
			if (rec.recommendationScore > 8) {
				response += `   - **Độ phù hợp**: Rất cao (${rec.recommendationScore}/10)\n`;
			} else if (rec.recommendationScore > 5) {
				response += `   - **Độ phù hợp**: Cao (${rec.recommendationScore}/10)\n`;
			} else if (rec.recommendationScore > 3) {
				response += `   - **Độ phù hợp**: Trung bình (${rec.recommendationScore}/10)\n`;
			}
			response += `\n`;
		});

		if (technicalAnalysis.keySpecifications) {
			response += `**Tóm tắt thông số chính**:\n`;
			response += ` - Socket: ${technicalAnalysis.keySpecifications.socket}\n`;
			response += ` - Cores trung bình: ${technicalAnalysis.keySpecifications.cores}\n`;
			response += ` - Tốc độ base: ${technicalAnalysis.keySpecifications.baseClock}\n`;
			response += ` - Kiến trúc: ${technicalAnalysis.keySpecifications.architecture}\n`;
		}

		if (technicalAnalysis.performanceMetrics) {
			response += `\n**Phân tích hiệu năng**:\n`;
			response += ` - Single-core: ${technicalAnalysis.performanceMetrics.singleCorePerformance}/100\n`;
			response += ` - Multi-core: ${technicalAnalysis.performanceMetrics.multiCorePerformance}/100\n`;
			response += ` - Gaming: ${technicalAnalysis.performanceMetrics.gamingPerformance}/100\n`;
			response += ` - Hiệu suất năng lượng: ${technicalAnalysis.performanceMetrics.powerEfficiency}/100\n`;
		}

		response += `\nQuý khách muốn tìm hiểu thêm về mẫu nào trong số này, hay có yêu cầu đặc biệt về socket, budget hoặc use case? `;
		response += `Em có thể giúp tìm các lựa chọn phù hợp hơn với nhu cầu cụ thể của quý khách!`;

		return response;
	}

	// Standardized method name for consistency with other specialists
	async getStructuredRecommendations(
		message: string,
		context: any = {},
		conversationId?: string,
	): Promise<CPUSpecialistData | null> {
		return this.processCPUQueryForMai(message, context);
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
