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
	selectTemplate,
} from "./mai-response-templates";
import { findPromotionsTool } from "../tools/find-promotions-tool";

// Import specialist agents for behind-the-scenes coordination
import { cpuSpecialist } from "./cpu-specialist";
import { ramSpecialist } from "./ram-specialist";
import { ssdSpecialist } from "./ssd-specialist";
import { bareboneSpecialist } from "./barebone-specialist";
import { desktopSpecialist } from "./desktop-specialist";

// Combined Mai Personality with Behind-the-Scenes Specialist Coordination
const EMBEDDED_PERSONALITY = `# Mai Sale - SSTC Sales Assistant

## Core Personality
Mai is an enthusiastic, knowledgeable sales assistant for SSTC products (SSD storage, motherboards, RAM memory, CPU processors, barebone cases, and complete PC builds). She communicates warmly with "em" self-reference, "quý khách" for customers. Always cheerful, responsive, and focused exclusively on SSTC products and services. Mai works with a team of specialists who help provide expert advice on different product categories, but coordinates with them silently behind the scenes.

## Key Rules for Behind-the-Scenes Specialist Coordination:
1. **BEHIND-THE-SCENES COORDINATION**: Coordinate with specialists silently without mentioning it to customers
2. **ONLY PRESENT ACTUAL PRODUCTS**: Only mention products that exist in the database with exact names, SKUs, and prices
3. **NO FICTIONAL PRODUCTS**: Never create or invent product names, models, or prices that don't exist
4. **USE REAL DATA**: Always use actual product information from database tools
5. **VERIFY BEFORE PRESENTING**: Check product existence in database before recommending
6. **ACCURATE PRICING**: Only quote prices that match exactly what's in the database
7. **NO DIRECT SPECIALIST MENTION**: Never tell customers about talking to specialists behind the scenes

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
6. **Session-aware**: Remembers greeted customers, doesn't repeat full greeting
7. **Responsive**: Never ignores messages, always provides helpful responses
8. **Specialist-coordinated**: Can integrate data from behind-the-scenes specialists
9. **Parallel-processing aware**: Can handle scenarios where data is being processed in the background

## Session Management
- **First message**: Full greeting + introduction
- **Subsequent**: Acknowledge by name + direct response
- **Goodbye**: Polite farewell + session reset
- **Context**: Maintains conversation history and customer information

## Specialist Integration Approach
When coordinating with behind-the-scenes specialists:
1. **Silent coordination**: Talk to specialists without telling customers
2. **Data synthesis**: Combine customer context with specialist data
3. **Natural presentation**: Present information as if Mai knows everything
4. **Accurate details**: Use exact product names, SKUs, and prices
5. **Context awareness**: Remember conversation history and customer needs

## Response Synthesis with Specialist Data
When integrating specialist data:
1. **Introduction**: Present information naturally without mentioning specialists
2. **Key findings**: Highlight 2-3 most important recommendations
3. **Technical details**: Explain specifications in simple terms
4. **Benefits**: Emphasize value proposition for customer
5. **Next steps**: Guide customer toward decision or further questions

## User Profile Updates
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
**RAM queries:** "Dạ quý khách, về sản phẩm RAM, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì..."
**CPU queries:** "Dạ quý khách, về sản phẩm CPU, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì..."
**Specialist data integration:** "Dạ quý khách, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì..."
**Parallel processing notification:** "Dạ quý khách, em đang kiểm tra thông tin chi tiết từ hệ thống SSTC. Xin vui lòng chờ trong giây lát..."
**Redirection:** "Em cảm ơn quý khách quan tâm, nhưng em chuyên tư vấn về sản phẩm SSTC thôi ạ!"
`;

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

		// Initialize all specialists
		this.initializeSpecialists();
	}

	// Method to initialize all specialists
	private async initializeSpecialists(): Promise<void> {
		console.log("🏗️ [Mai] Initializing all specialists behind the scenes...");

		try {
			// Initialize each specialist (they handle their own initialization)
			await Promise.all([
				cpuSpecialist.initializeKnowledgeBase?.() || Promise.resolve(),
				ramSpecialist.initializeKnowledgeBase?.() || Promise.resolve(),
				ssdSpecialist.initializeKnowledgeBase?.() || Promise.resolve(),
				bareboneSpecialist.initializeKnowledgeBase?.() || Promise.resolve(),
				desktopSpecialist.initializeKnowledgeBase?.() || Promise.resolve(),
			]);

			console.log("✅ [Mai] All specialists initialized successfully");
		} catch (error) {
			console.error("❌ [Mai] Failed to initialize specialists:", error);
		}
	}

	// Method to coordinate with specialists behind the scenes
	private async coordinateWithSpecialists(
		customerMessage: string,
		_context: any = {},
		_conversationId?: string,
	): Promise<any> {
		console.log("🔄 [Mai] Coordinating with specialists behind the scenes...", {
			messageLength: customerMessage.length,
		});

		try {
			// Determine which specialist is most relevant
			const relevantSpecialist =
				this.identifyRelevantSpecialist(customerMessage);

			if (!relevantSpecialist) {
				console.log(
					"🔍 [Mai] No specific specialist identified, using general approach",
				);
				return null;
			}

			// Get data from the relevant specialist
			const specialistData = await this.requestSpecialistData(
				relevantSpecialist,
				customerMessage,
			);

			return specialistData;
		} catch (error: any) {
			console.error(
				"❌ [Mai] Failed to coordinate with specialists:",
				error.message,
			);
			return null;
		}
	}

	// Method to identify the most relevant specialist based on customer message
	private identifyRelevantSpecialist(message: string): any {
		const lowerMessage = message.toLowerCase();

		// Check for keywords to identify relevant specialist
		if (
			lowerMessage.includes("cpu") ||
			lowerMessage.includes("bộ xử lý") ||
			lowerMessage.includes("intel") ||
			lowerMessage.includes("amd")
		) {
			return cpuSpecialist;
		}

		if (lowerMessage.includes("ram") || lowerMessage.includes("bộ nhớ")) {
			return ramSpecialist;
		}

		if (lowerMessage.includes("ssd") || lowerMessage.includes("ổ cứng")) {
			return ssdSpecialist;
		}

		if (
			lowerMessage.includes("case") ||
			lowerMessage.includes("vỏ máy") ||
			lowerMessage.includes("barebone")
		) {
			return bareboneSpecialist;
		}

		if (
			lowerMessage.includes("pc") ||
			lowerMessage.includes("máy tính") ||
			lowerMessage.includes("desktop")
		) {
			return desktopSpecialist;
		}

		// Return null if no specific specialist is identified
		return null;
	}

	// Method to request data from a specific specialist
	private async requestSpecialistData(
		specialist: any,
		message: string,
	): Promise<any> {
		try {
			console.log(
				`🔄 [Mai] Requesting data from ${specialist.constructor?.name || "specialist"}`,
			);

			// Check if specialist has a method to generate structured data
			if (typeof specialist.generateStructuredResponse === "function") {
				// Prepare data for the specialist
				const requestData = {
					type: this.getSpecialistType(specialist),
					query: message,
					context: {},
				};

				const response =
					await specialist.generateStructuredResponse(requestData);
				return response;
			}

			// Check if specialist has a generate method
			if (typeof specialist.generate === "function") {
				const response = await specialist.generate(message, {});
				return response;
			}

			console.warn(
				`⚠️ [Mai] Specialist ${specialist.constructor?.name || "specialist"} has no generate method`,
			);
			return null;
		} catch (error: any) {
			console.error(
				`❌ [Mai] Failed to request data from ${specialist.constructor?.name || "specialist"}:`,
				error.message,
			);
			return null;
		}
	}

	// Method to get specialist type based on specialist instance
	private getSpecialistType(specialist: any): string {
		if (specialist === cpuSpecialist) return "cpu";
		if (specialist === ramSpecialist) return "ram";
		if (specialist === ssdSpecialist) return "storage";
		if (specialist === bareboneSpecialist) return "barebone";
		if (specialist === desktopSpecialist) return "desktop";
		return "general";
	}

	// Method to integrate specialist data into responses
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

		// If no specialist data, return normal response
		if (!specialistData) {
			return await this.generateNormalResponse(
				customerMessage,
				{},
				await this.getSharedContext(conversationId),
			);
		}

		// Validate specialist data
		const validation = validateSpecialistData(specialistData);
		if (!validation.isValid) {
			console.warn(
				"⚠️ [Mai] Specialist data validation failed:",
				validation.errors,
			);
			// If validation failed, still continue processing but may create warning
		}

		// Generate response using templates
		const templatedResponse = await this.generateTemplatedResponse(
			customerMessage,
			specialistData,
			{},
			await this.getSharedContext(conversationId),
		);

		return templatedResponse;
	}

	// Method to get shared context if conversationId is provided
	private async getSharedContext(conversationId?: string): Promise<any> {
		if (!conversationId) return null;

		try {
			return await sharedContextManager.getContext(conversationId);
		} catch (error) {
			console.warn("⚠️ [Mai] Failed to get shared context:", error);
			return null;
		}
	}

	// Method to generate response using templates
	private async generateTemplatedResponse(
		_customerMessage: string,
		specialistData: any,
		_context: any,
		sharedContext: any = null,
	): Promise<string> {
		console.log("🧩 [Mai] Generating templated response", {
			dataType: specialistData.type,
			recommendationsCount: specialistData.recommendations?.length || 0,
		});

		// Select template based on data type
		const template = selectTemplate(specialistData.type, "default");

		// Prepare data for template
		const templateData = this.prepareTemplateData(
			specialistData,
			sharedContext,
		);

		// Render template
		let response = this.renderTemplate(
			template.template,
			templateData,
			sharedContext,
		);

		// Personalize with customer name if available
		if (sharedContext?.userProfile?.name) {
			response = response.replace(/quý khách/g, sharedContext.userProfile.name);
		}

		// Append user profile update section (required)
		response += `\n\nHOMEMADE_PROFILE_UPDATE\nNAME: ${sharedContext?.userProfile?.name || "unknown"}\nLANGUAGE: ${sharedContext?.userProfile?.language || "unknown"}\nINTERESTS: ${sharedContext?.userProfile?.interests?.join(", ") || "none"}\nGOALS: ${sharedContext?.userProfile?.goals?.join(", ") || "none"}\nPAIN_POINTS: ${sharedContext?.userProfile?.painPoints?.join(", ") || "none"}\nEND_UPDATE`;

		console.log("✅ [Mai] Templated response generated", {
			responseLength: response.length,
			hasTemplate: !!template,
			dataType: specialistData.type,
		});

		return response;
	}

	// Method to prepare template data
	private prepareTemplateData(
		specialistData: any,
		sharedContext: any = null,
	): any {
		console.log("🧮 [Mai] Preparing template data", {
			dataType: specialistData.type,
			hasSharedContext: !!sharedContext,
			recommendationsCount: specialistData.recommendations?.length || 0,
		});

		// Return the specialist data as-is for template rendering
		return {
			...specialistData,
			userProfile: sharedContext?.userProfile || null,
		};
	}

	// Method to render template with data
	private renderTemplate(
		template: string,
		data: any,
		sharedContext: any = null,
	): string {
		console.log("🎨 [Mai] Rendering template", {
			templateLength: template.length,
			dataKeys: Object.keys(data),
		});

		// Simple template rendering - replace {{variable}} with values
		let rendered = template;

		// Replace simple variables
		for (const [key, value] of Object.entries(data)) {
			if (typeof value === "string" || typeof value === "number") {
				rendered = rendered.replace(
					new RegExp(`{{${key}}}`, "g"),
					String(value),
				);
			}
		}

		// Handle conditional blocks (simplified)
		rendered = rendered.replace(
			/{{#if ([^}]+)}}([\s\S]*?){{\/if}}/g,
			(_match, condition, content) => {
				const conditionValue = this.getNestedValue(data, condition);
				return conditionValue ? content : "";
			},
		);

		// Handle each blocks (simplified)
		rendered = rendered.replace(
			/{{#each ([^}]+)}}([\s\S]*?){{\/each}}/g,
			(_match, arrayPath, content) => {
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

		// Personalize with user profile
		if (sharedContext?.userProfile?.name) {
			rendered = rendered.replace(/quý khách/g, sharedContext.userProfile.name);
		}

		return rendered.trim();
	}

	// Helper to get value from nested object
	private getNestedValue(obj: any, path: string): any {
		return path.split(".").reduce((current, key) => current?.[key], obj);
	}

	// Method to generate normal response when no specialist data is available
	private async generateNormalResponse(
		customerMessage: string,
		_context: any,
		sharedContext: any = null,
	): Promise<string> {
		console.log("📝 [Mai] Generating normal response", {
			messageLength: customerMessage.length,
		});

		// Simple response generation
		let response = "";

		const lowerMessage = customerMessage.toLowerCase();

		if (lowerMessage.includes("xin chào") || lowerMessage.includes("chào")) {
			response =
				"Xin chào quý khách! Em là Mai, rất vui được tư vấn về SSD, mainboard, RAM, CPU, barebone case và lắp ráp PC hoàn chỉnh của SSTC cho quý khách ạ!";
		} else if (
			lowerMessage.includes("ssd") ||
			lowerMessage.includes("ổ cứng")
		) {
			response =
				"Dạ quý khách, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì...";
		} else if (
			lowerMessage.includes("ram") ||
			lowerMessage.includes("bộ nhớ")
		) {
			response =
				"Dạ quý khách, về sản phẩm RAM, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì...";
		} else if (
			lowerMessage.includes("cpu") ||
			lowerMessage.includes("bộ xử lý")
		) {
			response =
				"Dạ quý khách, về sản phẩm CPU, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì...";
		} else if (
			lowerMessage.includes("case") ||
			lowerMessage.includes("barebone")
		) {
			response =
				"Dạ quý khách, về sản phẩm barebone case, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì...";
		} else if (
			lowerMessage.includes("pc") ||
			lowerMessage.includes("máy tính")
		) {
			response =
				"Dạ quý khách, về việc lắp ráp PC hoàn chỉnh, em vừa nhận được thông tin chi tiết từ hệ thống SSTC. Theo như phân tích thì...";
		} else {
			response =
				"Dạ quý khách, em đang kiểm tra thông tin chi tiết từ hệ thống SSTC. Xin vui lòng chờ trong giây lát...";
		}

		// Append user profile update section (required)
		response += `\n\nHOMEMADE_PROFILE_UPDATE\nNAME: ${sharedContext?.userProfile?.name || "unknown"}\nLANGUAGE: ${sharedContext?.userProfile?.language || "unknown"}\nINTERESTS: ${sharedContext?.userProfile?.interests?.join(", ") || "none"}\nGOALS: ${sharedContext?.userProfile?.goals?.join(", ") || "none"}\nPAIN_POINTS: ${sharedContext?.userProfile?.painPoints?.join(", ") || "none"}\nEND_UPDATE`;

		return response;
	}

	// Override the generate method to implement behind-the-scenes specialist coordination
	async generate(messages: any[], options: any = {}): Promise<any> {
		console.log(
			"🚀 [Mai] Generating response with behind-the-scenes coordination",
			{
				messagesCount: messages.length,
				hasOptions: Object.keys(options).length > 0,
			},
		);

		try {
			// Extract the customer message (assuming it's the last message)
			const customerMessage = messages[messages.length - 1]?.content || "";
			const conversationId = options.conversationId;

			// Coordinate with specialists behind the scenes
			const specialistData = await this.coordinateWithSpecialists(
				customerMessage,
				options.context || {},
				conversationId,
			);

			// If we got specialist data, integrate it into the response
			if (specialistData) {
				const response = await this.integrateSpecialistData(
					customerMessage,
					specialistData,
					options.context || {},
					conversationId,
				);

				return {
					text: response,
					messages: [
						{
							role: "assistant",
							content: response,
						},
					],
				};
			}

			// If no specialist data, generate normal response
			const sharedContext = conversationId
				? await sharedContextManager.getContext(conversationId)
				: null;

			const normalResponse = await this.generateNormalResponse(
				customerMessage,
				options.context || {},
				sharedContext,
			);

			return {
				text: normalResponse,
				messages: [
					{
						role: "assistant",
						content: normalResponse,
					},
				],
			};
		} catch (error: any) {
			console.error("❌ [Mai] Failed to generate response:", error.message);
			const errorMessage =
				"Xin lỗi quý khách, em đang gặp một số vấn đề kỹ thuật. Em đang cố gắng khắc phục, quý khách vui lòng thử lại sau ít phút ạ!";

			return {
				text: errorMessage,
				messages: [
					{
						role: "assistant",
						content: errorMessage,
					},
				],
			};
		}
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

		try {
			// Coordinate with specialists behind the scenes
			const specialistData = await this.coordinateWithSpecialists(
				message,
				{},
				conversationId,
			);

			// If we got specialist data, integrate it into the response
			if (specialistData) {
				const response = await this.integrateSpecialistData(
					message,
					specialistData,
					{},
					conversationId,
				);

				return response;
			}

			// If no specialist data, generate normal response
			const sharedContext = conversationId
				? await sharedContextManager.getContext(conversationId)
				: null;

			return await this.generateNormalResponse(message, {}, sharedContext);
		} catch (error: any) {
			console.error(
				"❌ [Mai] Failed to generate context-aware response:",
				error.message,
			);
			return "Xin lỗi quý khách, em đang gặp một số vấn đề kỹ thuật. Em đang cố gắng khắc phục, quý khách vui lòng thử lại sau ít phút ạ!";
		}
	}

	// Method to handle parallel processing
	async handleParallelProcessing(
		status: "started" | "middle" | "completed" | "timeout" | "failed",
		specialistData: any = null,
		conversationId?: string,
	): Promise<string> {
		console.log("⏱️ [Mai] Handling parallel processing", {
			status,
			hasData: !!specialistData,
			conversationId,
		});

		let templateKey = "progress-start";

		switch (status) {
			case "started":
				templateKey = "progress-start";
				break;
			case "middle":
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

		// Get template
		const template =
			RESPONSE_TEMPLATES[templateKey] || RESPONSE_TEMPLATES["progress-start"];

		// Render template
		let renderedResponse = this.renderTemplate(
			template.template,
			{},
			conversationId
				? await sharedContextManager.getContext(conversationId)
				: null,
		);

		// Personalize if user profile is available
		const sharedContext = conversationId
			? await sharedContextManager.getContext(conversationId)
			: null;
		if (sharedContext?.userProfile?.name) {
			renderedResponse = renderedResponse.replace(
				/quý khách/g,
				sharedContext.userProfile.name,
			);
		}

		return renderedResponse;
	}

	// Method to process specialist data
	async processSpecialistData(
		specialistData: any,
		conversationId?: string,
	): Promise<any> {
		console.log("🔧 [Mai] Processing specialist data", {
			dataType: specialistData?.type,
			conversationId,
		});

		// Validate data
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

		// If conversationId is provided, get context from shared memory
		let sharedContext: any = null;
		if (conversationId) {
			sharedContext = await sharedContextManager.getContext(conversationId);
		}

		// Prepare data for processing
		const preparedData = this.prepareTemplateData(
			specialistData,
			sharedContext,
		);

		// Select template
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

// Export the single, unified Mai sale instance
export const maiSale = new MaiSale();
