// biome-ignore assist/source/organizeImports: <Không quan trọng lắm>
import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { getLibSQLConfig } from "../database/libsql";
import { chromaVector } from "../vector/chroma";
import { mastraModelProvider } from "../llm/provider";
import { embedder } from "../embedding/provider";
import { userProfileSchema } from "../core/models/user-profile-schema";
import { sharedContextManager } from "../core/memory/shared-context-manager";
import {
	SPECIALIST_RESPONSE_TEMPLATES as RESPONSE_TEMPLATES,
	validateSpecialistData,
	formatPrice,
	selectTemplate,
} from "./mai-response-templates";
import { findPromotionsTool } from "../tools/find-promotions-tool";

// persona is embedded below to allow admin-free runtime usage and safer loading

// Không cần lấy model từ appConfig nữa, đã config trong provider
// Embedded personality markdown - Optimized for GPT-OSS-20B context window (~2048 tokens max)
const EMBEDDED_PERSONALITY = `# Mai Sale - SSTC Sales Assistant

## Core Personality
Mai is an enthusiastic, knowledgeable sales assistant for SSTC products (SSD storage, motherboards, RAM memory, CPU processors, barebone cases, and complete PC builds). She communicates warmly with "em" self-reference, "quý khách" for customers. Always cheerful, responsive, and focused exclusively on SSTC products and services. Mai works with a team of specialists who help provide expert advice on different product categories.

## Communication Style
- **Tone**: Warm, enthusiastic, professional
- **Language**: Vietnamese/English based on customer preference
- **Length**: 60-120 words unless detailed request
- **Focus**: SSTC products, customer service, technical support

## Key Traits
1. **Enthusiastic**: Loves technology, uses positive energy
2. **Knowledgeable**: Expert in SSD, motherboards, RAM memory, CPU processors, barebone cases, and PC builds
3. **Empathetic**: Listens actively to customer concerns
4. **Proactive**: Guides customers through options
5. **Tactful**: Politely redirects inappropriate questions to products
6. **Team-oriented**: Knows when to connect customers with specialists (CPU, RAM, SSD, case, and PC build specialists)
7. **Session-aware**: Remembers greeted customers, doesn't repeat full greeting
8. **Responsive**: Never ignores messages, always provides helpful responses
9. **Specialist-coordinated**: Can integrate data from behind-the-scenes specialists
10. **Parallel-processing aware**: Can handle scenarios where data is being processed in the background

## Session Management
- **First message**: Full greeting + introduction
- **Subsequent**: Acknowledge by name + direct response
- **Goodbye**: Polite farewell + session reset
- **Context**: Maintains conversation history and customer information

## Specialist Integration
- **Behind-the-scenes specialists**: Receive customer queries and prepare data while Mai continues conversation
- **Data integration**: Seamlessly incorporates specialist data into responses
- **Timeout handling**: Gracefully manages delayed specialist responses
- **Fallback mechanisms**: Provides helpful responses even when specialists are unavailable

## User Profile Updates
- Always update customer info when detected
- Track interests, pain points, purchase goals with confidence scores
- Personalize responses using profile data
- Respect privacy, don't pressure for information
- Integrate questions naturally into product conversations

## Language Handling
- **Detection**: Automatic from first message (Vietnamese default)
- **Switching**: Responds to requests (Viet/Viết → "nói tiếng Việt"; English → "speak English")
- **Consistency**: Maintains personality in both languages

## Interaction Rules
- Personalize: Use customer names, reference interests/purchase history
- Professional: Help-focused, never pressure sales or argue
- Boundaries: Politely redirect non-product questions to SSTC offerings
- Gratitude: Always thank and wish well after interactions

## Specialist Data Integration Approach
When receiving data from behind-the-scenes specialists:
1. **Acknowledge receipt**: Thank specialist for information
2. **Synthesize response**: Combine customer context with specialist data
3. **Present clearly**: Format technical data in customer-friendly way
4. **Add value**: Explain benefits and use cases
5. **Maintain personality**: Keep warm, enthusiastic tone

## Response Synthesis with Specialist Data
When integrating specialist data:
1. **Introduction**: Briefly acknowledge the technical information received
2. **Key findings**: Highlight 2-3 most important recommendations
3. **Technical details**: Explain specifications in simple terms
4. **Benefits**: Emphasize value proposition for customer
5. **Next steps**: Guide customer toward decision or further questions

## User Profile Inclusion (Required)
ALWAYS append user profile data to the end of each response in this exact format:

HOMEMADE_PROFILE_UPDATE
NAME: [customer_name or unknown]
LANGUAGE: [language or unknown]
INTERESTS: [comma-separated interests, or none]
GOALS: [comma-separated goals, or none]
PAIN_POINTS: [comma-separated pain points, or none]
END_UPDATE

Example:
HOMEMADE_PROFILE_UPDATE
NAME: Tan
LANGUAGE: vietnamese
INTERESTS: gaming(0.8), SSD storage(0.9)
GOALS: buy gaming SSD(0.9), warranty support(0.6)
PAIN_POINTS: slow computer(0.7)
END_UPDATE

Every response must include this profile section for system tracking.

## Examples (Vietnamese)
**Greeting:** "Xin chào quý khách! Em là Mai, rất vui được tư vấn về SSD, mainboard, RAM, CPU, barebone case và lắp ráp PC hoàn chỉnh của SSTC cho quý khách ạ!"
**Product questions:** "Dạ quý khách [name], mình đang tìm SSD cho gaming hay làm việc văn phòng?"
**RAM queries:** "Dạ quý khách, về sản phẩm RAM, em xin phép chuyển quý khách sang chuyên gia RAM của SSTC để được tư vấn chi tiết hơn ạ!"
**CPU queries:** "Dạ quý khách, về sản phẩm CPU, em xin phép chuyển quý khách sang chuyên gia CPU của SSTC để được tư vấn chi tiết hơn ạ!"
**PC Build queries:** "Dạ quý khách, về việc lắp ráp PC hoàn chỉnh, em xin phép chuyển quý khách sang chuyên gia xây dựng cấu hình PC của SSTC để được tư vấn chi tiết hơn ạ!"
**Specialist data integration:** "Dạ quý khách, em vừa nhận được thông tin chi tiết từ chuyên gia [tên chuyên gia] của SSTC. Theo như phân tích thì..."
**Parallel processing notification:** "Dạ quý khách, em đang kiểm tra thông tin chi tiết từ chuyên gia của SSTC. Xin vui lòng chờ trong giây lát..."
**Redirection:** "Em cảm ơn quý khách quan tâm, nhưng em chuyên tư vấn về sản phẩm SSTC thôi ạ!"
`;

// The personality profile is used directly as the agent's instructions.
// It is assumed to be managed by an admin, so sanitization is not required.

// Enhanced Mai agent with specialist data integration capabilities
export class MaiSale extends Agent {
	constructor() {
		super({
			name: "Mai Sale",
			instructions: EMBEDDED_PERSONALITY,
			model: mastraModelProvider(),
			tools: { findPromotions: findPromotionsTool },
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

	// Method to integrate specialist data into responses using templates
	async integrateSpecialistData(
		customerMessage: string,
		specialistData: any,
		_context: any,
		conversationId?: string,
	): Promise<string> {
		console.log("🔄 [Mai] Integrating specialist data", {
			hasData: !!specialistData,
			messageLength: customerMessage.length,
			conversationId,
			dataType: specialistData?.type,
		});

		// Nếu có conversationId, lấy thêm context từ shared memory
		let sharedContext: any = null;
		if (conversationId) {
			sharedContext = await sharedContextManager.getContext(conversationId);
		}

		// If no specialist data, return normal response
		if (!specialistData) {
			return await this.generateNormalResponse(
				customerMessage,
				context,
				sharedContext,
			);
		}

		// Validate specialist data
		const validation = validateSpecialistData(specialistData);
		if (!validation.isValid) {
			console.warn(
				"⚠️ [Mai] Specialist data validation failed:",
				validation.errors,
			);
			// Nếu validation failed, vẫn tiếp tục xử lý nhưng có thể tạo cảnh báo
		}

		// Generate response using templates
		const templatedResponse = await this.generateTemplatedResponse(
			customerMessage,
			specialistData,
			context,
			sharedContext,
		);

		return templatedResponse;
	}

	// Method to generate response using templates
	private async generateTemplatedResponse(
		customerMessage: string,
		specialistData: any,
		context: any,
		sharedContext: any = null,
	): Promise<string> {
		console.log("🧩 [Mai] Generating templated response", {
			messageLength: customerMessage.length,
			dataType: specialistData.type,
			recommendationsCount: specialistData.recommendations?.length || 0,
		});

		// Chọn template phù hợp dựa trên loại dữ liệu
		const template = selectTemplate(specialistData.type, "default");

		// Chuẩn bị dữ liệu cho template
		const templateData = this.prepareTemplateData(
			specialistData,
			sharedContext,
		);

		// Render template với dữ liệu
		const renderedResponse = this.renderTemplate(
			template.template,
			templateData,
			sharedContext,
		);

		return renderedResponse;
	}

	// Method to prepare data for template
	private prepareTemplateData(
		specialistData: any,
		sharedContext: any = null,
	): any {
		// Format dữ liệu specialist để phù hợp với template
		const formattedData: any = {
			...specialistData,
			formattedPrice: specialistData.pricingInfo?.basePrice
				? formatPrice(specialistData.pricingInfo.basePrice)
				: "Liên hệ",
			recommendations:
				specialistData.recommendations?.map((rec: any) => ({
					...rec,
					formattedPrice: rec.price ? formatPrice(rec.price) : "Liên hệ",
				})) || [],
		};

		// Thêm thông tin từ shared context nếu có
		if (sharedContext) {
			formattedData.userProfile = sharedContext.userProfile;
		}

		return formattedData;
	}

	// Method to render template with data (đơn giản hóa, trong thực tế có thể dùng thư viện template)
	private renderTemplate(
		template: string,
		data: any,
		sharedContext: any = null,
	): string {
		let rendered = template;

		// Thay thế các biến đơn giản
		for (const [key, value] of Object.entries(data)) {
			if (typeof value === "string" || typeof value === "number") {
				rendered = rendered.replace(
					new RegExp(`{{${key}}}`, "g"),
					String(value),
				);
			}
		}

		// Thay thế conditional blocks (đơn giản hóa)
		rendered = rendered.replace(
			/{{#if ([^}]+)}}([\s\S]*?){{\/if}}/g,
			(match, condition, content) => {
				const conditionValue = this.getNestedValue(data, condition);
				return conditionValue ? content : "";
			},
		);

		// Thay thế each blocks (đơn giản hóa)
		rendered = rendered.replace(
			/{{#each ([^}]+)}}([\s\S]*?){{\/each}}/g,
			(match, arrayPath, content) => {
				const arrayValue = this.getNestedValue(data, arrayPath);
				if (Array.isArray(arrayValue)) {
					return arrayValue
						.map((item) => {
							let itemContent = content;
							for (const [key, value] of Object.entries(item)) {
								if (typeof value === "string" || typeof value === "number") {
									itemContent = itemContent.replace(
										new RegExp(`{{${key}}}`, "g"),
										String(value),
									);
								}
							}
							return itemContent;
						})
						.join("");
				}
				return "";
			},
		);

		// Cá nhân hóa với thông tin user profile
		if (sharedContext?.userProfile?.name) {
			rendered = rendered.replace(/quý khách/g, sharedContext.userProfile.name);
		}

		return rendered.trim();
	}

	// Helper để lấy giá trị nested
	private getNestedValue(obj: any, path: string): any {
		return path.split(".").reduce((current, key) => current?.[key], obj);
	}

	private async generateNormalResponse(
		customerMessage: string,
		context: any,
		sharedContext: any = null,
	): Promise<string> {
		console.log("📝 [Mai] Generating normal response", {
			messageLength: customerMessage.length,
		});

		// Prepare messages with shared context if available
		let messages: any[] = [{ role: "user", content: customerMessage }];

		if (sharedContext?.chatHistory) {
			// Lấy chat history từ shared context
			const recentHistory = sharedContext.chatHistory.slice(-5);
			const historyMessages = recentHistory.map((msg: any) => ({
				role: msg.role,
				content: msg.content,
			}));
			messages = [
				...historyMessages,
				{ role: "user", content: customerMessage },
			];
		}

		// Generate normal response using existing logic
		const result = await this.generate(messages as any, {});
		return result.text || "Xin lỗi, em không thể tạo được phản hồi.";
	}

	// Method to handle parallel processing notifications with templates
	async handleParallelProcessing(
		status: "started" | "completed" | "failed" | "timeout",
		specialistData?: any,
		conversationId?: string,
	): Promise<string> {
		console.log("🔔 [Mai] Handling parallel processing notification", {
			status,
			hasData: !!specialistData,
			conversationId,
		});

		// Nếu có conversationId, lấy context từ shared memory
		let sharedContext: any = null;
		if (conversationId) {
			sharedContext = await sharedContextManager.getContext(conversationId);
		}

		// Chọn template phù hợp dựa trên status
		let templateKey = "";
		switch (status) {
			case "started":
				templateKey = "progress-start";
				break;
			case "completed":
				if (specialistData) {
					return await this.integrateSpecialistData(
						"Thông tin từ chuyên gia đã sẵn sàng",
						specialistData,
						{},
						conversationId,
					);
				}
				templateKey = "progress-middle";
				break;
			case "timeout":
				templateKey = "timeout-default";
				break;
			case "failed":
				templateKey = "error-default";
				break;
			default:
				templateKey = "progress-start";
		}

		// Lấy template
		const template =
			RESPONSE_TEMPLATES[templateKey] || RESPONSE_TEMPLATES["progress-start"];

		// Render template
		let renderedResponse = this.renderTemplate(
			template.template,
			{},
			sharedContext,
		);

		// Cá nhân hóa nếu có user profile
		if (sharedContext?.userProfile?.name) {
			renderedResponse = renderedResponse.replace(
				/quý khách/g,
				sharedContext.userProfile.name,
			);
		}

		return renderedResponse;
	}

	// Method to get context-aware response
	async getContextAwareResponse(
		message: string,
		conversationId?: string,
	): Promise<string> {
		console.log("🧠 [Mai] Generating context-aware response", {
			messageLength: message.length,
			conversationId,
		});

		// Nếu có conversationId, lấy context từ shared memory
		let sharedContext: any = null;
		if (conversationId) {
			sharedContext = await sharedContextManager.getContext(conversationId);
		}

		// Prepare messages with shared context if available
		let messages: any[] = [{ role: "user", content: message }];

		if (sharedContext?.chatHistory) {
			// Lấy chat history từ shared context
			const recentHistory = sharedContext.chatHistory.slice(-8); // Tăng lên 8 messages để có context đầy đủ hơn
			const historyMessages = recentHistory.map((msg: any) => ({
				role: msg.role,
				content: msg.content,
			}));
			messages = [...historyMessages, { role: "user", content: message }];

			// Thêm thông tin user profile vào prompt nếu có
			if (
				sharedContext.userProfile &&
				Object.keys(sharedContext.userProfile).length > 0
			) {
				const userProfileInfo = `
        [USER PROFILE CONTEXT]
        Name: ${sharedContext.userProfile.name || "Unknown"}
        Language preference: ${sharedContext.userProfile.language || "Vietnamese"}
        Interests: ${sharedContext.userProfile.interests ? Object.keys(sharedContext.userProfile.interests).join(", ") : "None"}
        Previous goals: ${sharedContext.userProfile.goals ? Object.keys(sharedContext.userProfile.goals).join(", ") : "None"}
        `;

				messages.unshift({ role: "system", content: userProfileInfo.trim() });
			}
		}

		// Generate response
		const result = await this.generate(messages as any, {});
		return result.text || "Xin lỗi, em không thể tạo được phản hồi.";
	}

	// Method để xử lý dữ liệu specialist với validation và error handling
	async processSpecialistData(
		specialistData: any,
		conversationId?: string,
	): Promise<{
		isValid: boolean;
		processedData: any;
		response: string;
		errors?: string[];
	}> {
		console.log("🔧 [Mai] Processing specialist data", {
			dataType: specialistData?.type,
			conversationId,
		});

		// Validate dữ liệu
		const validation = validateSpecialistData(specialistData);

		if (!validation.isValid) {
			console.warn(
				"⚠️ [Mai] Specialist data validation failed:",
				validation.errors,
			);
			return {
				isValid: false,
				processedData: null,
				response:
					"Xin lỗi quý khách, có lỗi xảy ra khi xử lý thông tin từ chuyên gia. Vui lòng thử lại sau ạ!",
				errors: validation.errors,
			};
		}

		// Nếu có conversationId, lấy context từ shared memory
		let sharedContext: any = null;
		if (conversationId) {
			sharedContext = await sharedContextManager.getContext(conversationId);
		}

		// Chuẩn bị dữ liệu cho xử lý
		const preparedData = this.prepareTemplateData(
			specialistData,
			sharedContext,
		);

		// Tạo response mẫu
		const template = selectTemplate(specialistData.type, "default");
		const response = this.renderTemplate(
			template.template,
			preparedData,
			sharedContext,
		);

		return {
			isValid: true,
			processedData: preparedData,
			response: response,
		};
	}
}

// Export enhanced Mai agent instance
export const maiSale = new MaiSale();
