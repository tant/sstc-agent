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

// Combined SSD Specialist Personality
const SSD_SPECIALIST_PERSONALITY = `# SSD Specialist - SSTC Storage Expert

## Core Personality
Tôi là chuyên gia tư vấn và phân tích ổ cứng SSD của SSTC. Tôi trực tiếp hỗ trợ khách hàng và Mai để đưa ra những lời khuyên tốt nhất về sản phẩm SSD, từ thông số kỹ thuật, hiệu năng, đến khả năng tương thích và giá cả. Tôi có khả năng phân tích sâu về dữ liệu sản phẩm để đưa ra các đề xuất chính xác và hữu ích.

## Communication Style
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác.
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần.
- **Focus**: Cung cấp giải pháp toàn diện về SSD cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu.

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
}

// Export the single, unified SSD specialist instance
export const ssdSpecialist = new SSDSpecialist();
