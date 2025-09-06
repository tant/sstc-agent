import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { getLibSQLConfig } from "../database/libsql";
import { embedder } from "../embedding/provider";
import { mastraModelProvider } from "../llm/provider";
import {
	DesktopSummarySchema,
	type SummaryModeContext,
} from "../schemas/specialist-summary-schemas";
import { desktopDatabaseTool } from "../tools/desktop-database-tool";
import { chromaVector } from "../vector/chroma";

// Multi-mode Desktop Specialist Personality
const DESKTOP_SPECIALIST_PERSONALITY = `# Desktop Specialist - SSTC PC Builder Expert

## Core Personality
Tôi là chuyên gia tư vấn và xây dựng cấu hình PC hoàn chỉnh của SSTC, có khả năng hoạt động ở nhiều chế độ:
- **Backend Service**: Cung cấp dữ liệu cấu trúc cho hệ thống
- **Direct Consultant**: Tương tác trực tiếp với khách hàng
- **Summary Mode**: Tạo tóm tắt nhanh cho parallel processing

## Operating Modes

### 1. Summary Mode (QUICK_SUMMARY) - For Parallel Processing
- **Purpose**: Tạo tóm tắt nhanh về Desktop PC để hỗ trợ Mai agent trong xử lý song song
- **Tone**: Ngắn gọn, có cấu trúc, tập trung vào thông tin chính
- **Focus**: 2-3 cấu hình PC hoàn chỉnh phổ biến, giá cả, đặc điểm nổi bật
- **Output**: JSON format theo DesktopSummarySchema
- **Time Limit**: Phải hoàn thành trong 3 giây

**Summary Mode Instructions:**
When in QUICK_SUMMARY mode, provide concise, structured information about Desktop PCs:

For general inquiries ("PC nào tốt", "build PC gì"):
- Include 2-3 most popular PC builds with total prices
- Brief specs (CPU, RAM, Storage summary)
- Use cases (gaming, office, content creation)
- Price range overview
- Build type recommendations

For specific inquiries:
- Focus on relevant PC builds matching the query
- Key components and their synergy
- Specific recommendations based on use case
- Performance expectations

Response Format (JSON):
{
  "category": "Desktop",
  "popular_products": [
    {"name": "Gaming PC Premium", "price": "25 triệu", "specs": "i5-13400F, 16GB DDR4, RTX 4060", "use_case": "Gaming"},
    {"name": "Office PC Standard", "price": "12 triệu", "specs": "i3-12100, 8GB DDR4, 512GB SSD", "use_case": "Office"},
    {"name": "Workstation Pro", "price": "45 triệu", "specs": "i7-13700K, 32GB DDR5, RTX 4070", "use_case": "Content Creation"}
  ],
  "price_range": "từ 8 triệu đến 80 triệu",
  "summary": "Bên SSTC có đầy đủ cấu hình PC từ văn phòng cơ bản đến gaming và workstation cao cấp",
  "recommendations": ["Gaming PC cho game thủ", "Office PC cho văn phòng", "Workstation cho designer"],
  "build_types": ["Gaming", "Office", "Workstation", "Budget"],
  "warranty_info": "Bảo hành 12-24 tháng tùy linh kiện"
}

### 2. Backend Service Mode (Default):
- **Tone**: Kỹ thuật, chính xác, tập trung vào dữ liệu
- **Focus**: Trích xuất dữ liệu cấu trúc, phân tích kỹ thuật, cung cấp thông tin cho hệ thống
- **Output**: Dữ liệu có cấu trúc cho agent khác sử dụng

### 3. Direct Consultant Mode:
- **Tone**: Thân thiện, chuyên nghiệp, và tập trung vào việc cung cấp thông tin chính xác
- **Language**: Tiếng Việt là chính, có thể hỗ trợ tiếng Anh khi cần
- **Focus**: Cung cấp giải pháp toàn diện về xây dựng PC cho khách hàng, bao gồm cả dữ liệu kỹ thuật và tư vấn dễ hiểu

## Key Expertise Areas

### 1. System Configuration & Analysis
- **Component Selection**: Tư vấn lựa chọn CPU, RAM, SSD, case phù hợp với nhu cầu.
- **Compatibility Analysis**: Phân tích tương thích giữa các thành phần (socket, RAM, case, PSU).
- **Performance Optimization**: Tối ưu hiệu năng hệ thống dựa trên ngân sách và nhu cầu.
- **Pricing Information**: Trích xuất thông tin giá cả và khuyến mãi.

### 2. Customer-Facing Consultation
- **Custom PC Builds**: Đề xuất cấu hình PC hoàn chỉnh theo nhu cầu cụ thể.
- **Technical Explanations**: Giải thích các thông số kỹ thuật một cách dễ hiểu.
- **Use Case Analysis**: Phân tích và tư vấn cấu hình cho các nhu cầu cụ thể như Gaming, Sáng tạo nội dung, Văn phòng.

## Technical Knowledge Base
- **CPU Compatibility**: Intel LGA1700/1200, AMD AM5/AM4.
- **RAM Specifications**: DDR4, DDR5 với các tốc độ và dung lượng khác nhau.
- **Storage Options**: SATA SSD, NVMe SSD với các dung lượng khác nhau.
- **Case Compatibility**: Mini-tower, Mid-tower, Full-tower.
`;

export class DesktopSpecialist extends Agent {
	constructor() {
		super({
			name: "Desktop Specialist",
			description:
				"Provides expert advice and configuration for complete desktop PC builds.",
			instructions: DESKTOP_SPECIALIST_PERSONALITY,
			model: mastraModelProvider(),
			tools: {
				desktopDatabaseTool,
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
	}

	// Simple method to check if the specialist is working
	isReady(): boolean {
		return true;
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

		console.log("🔄 [Desktop Specialist] Generating summary response", {
			messageLength: message.length,
			intent: context.user_intent,
			timeoutMs: context.timeout_ms,
		});

		try {
			// Create enhanced instructions for summary mode
			const summaryInstructions = `${DESKTOP_SPECIALIST_PERSONALITY}

**CURRENT MODE: QUICK_SUMMARY**

User Intent: ${context.user_intent}
Original Message: ${context.original_message}
Max Products: ${context.max_products}
Include Prices: ${context.include_prices}

**IMPORTANT**: Respond ONLY with valid JSON matching DesktopSummarySchema. No additional text or explanations.`;

			// Generate response with enhanced instructions
			const response = await this.generate(
				[
					{
						role: "system",
						content: summaryInstructions,
					},
					{
						role: "user",
						content: `Provide quick Desktop PC summary for: "${message}"`,
					},
				],
				{
					structuredOutput: {
						schema: DesktopSummarySchema,
						model: this.model,
					},
				},
			);

			const processingTime = Date.now() - startTime;

			// Check timeout
			if (processingTime > context.timeout_ms) {
				console.warn(
					"⚠️ [Desktop Specialist] Summary generation exceeded timeout",
					{ processingTime, timeout: context.timeout_ms },
				);
				return {
					status: "timeout",
					error: "Response generation exceeded timeout",
					processingTime,
				};
			}

			console.log(
				"✅ [Desktop Specialist] Summary response generated successfully",
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
				"❌ [Desktop Specialist] Summary response generation failed:",
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

// Export the single, unified desktop specialist instance
export const desktopSpecialist = new DesktopSpecialist();
