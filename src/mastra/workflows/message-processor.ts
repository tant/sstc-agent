/**
 * Mastra Workflow for processing messages from all channels
 * Leverages Mastra agents and tools for intelligent message handling
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { channelRegistry } from "../core/channels/registry";
import { optimizedMemoryManager } from "../core/memory/optimized-memory-manager";

export const channelMessageWorkflow = createWorkflow({
	id: "channel-message-processor",
	description: "Process messages from various chat channels",
	inputSchema: z.object({
		channelId: z.enum(["telegram", "whatsapp", "web", "zalo"]),
		message: z.object({
			content: z.string(),
			senderId: z.string(),
			timestamp: z.date(),
			attachments: z
				.array(
					z.object({
						type: z.string(),
						url: z.string(),
						filename: z.string().optional(),
					}),
				)
				.optional(),
		}),
	}),
	outputSchema: z.object({
		response: z.string(),
		channelId: z.string(),
		actions: z.array(z.string()).optional(),
		metadata: z.record(z.unknown()),
	}),
})
	.then(
		createStep({
			id: "intent-analysis",
			description: "Analyze user intent from message",
			inputSchema: z.object({
				channelId: z.enum(["telegram", "whatsapp", "web", "zalo"]),
				message: z.object({
					content: z.string(),
					senderId: z.string(),
					timestamp: z.date(),
					attachments: z
						.array(
							z.object({
								type: z.string(),
								url: z.string(),
								filename: z.string().optional(),
							}),
						)
						.optional(),
				}),
			}),
			outputSchema: z.object({
				channelId: z.enum(["telegram", "whatsapp", "web", "zalo"]),
				message: z.object({
					content: z.string(),
					senderId: z.string(),
					timestamp: z.date(),
					attachments: z
						.array(
							z.object({
								type: z.string(),
								url: z.string(),
								filename: z.string().optional(),
							}),
						)
						.optional(),
				}),
				intent: z.object({
					intent: z.string(),
					confidence: z.number(),
					entities: z.array(z.unknown()),
				}),
				chatHistory: z
					.array(
						z.object({
							role: z.string(),
							content: z.string(),
							timestamp: z.string().optional(),
						}),
					)
					.optional(),
			}),
			execute: async ({ inputData, mastra }) => {
				console.log("🔍 [Workflow] Starting intent analysis", {
					channelId: (inputData as any)?.channelId,
					messageLength: (inputData as any)?.message?.content?.length,
					senderId: (inputData as any)?.message?.senderId,
					hasAttachments: !!(inputData as any)?.message?.attachments?.length,
				});

				// Get chat history from unified memory manager
				let chatHistory: any[] = [];
				let currentUserProfile: any = {};
				try {
					const userId = (inputData as any).message.senderId;
					const channelId = (inputData as any).channelId;
					const conversationId = `${channelId}_user_${userId}`;

					console.log(
						"🔍 [Workflow] Getting chat history via Unified Memory Manager for user:",
						userId,
						"conversation:",
						conversationId,
					);

					// Use unified memory manager to get chat history across all channels
					chatHistory = await optimizedMemoryManager.getChatHistory(userId, conversationId, 5);

					// For tool context, prepare simplified structure
					currentUserProfile = {};

					console.log(
						`✅ [Workflow] Retrieved ${chatHistory.length} messages from unified memory`,
					);
				} catch (error) {
					console.warn(
						"⚠️ [Workflow] Could not retrieve chat history from unified memory:",
						error instanceof Error ? error.message : String(error),
					);
					chatHistory = [];
					currentUserProfile = {};
				}

				// Use default intent analysis
				const intentAnalysis = {
					intent: "user_query",
					confidence: 0.8,
					entities: [],
				};

				// Try to use An Data Analyst's intent analyzer tool
				try {
					const analyzerAgent = mastra.getAgent("anDataAnalyst");
					console.log(
						"🤖 [Workflow] Using An Data Analyst for intent analysis",
						{
							analyzerAgentName: analyzerAgent?.name,
							hasTools: Object.keys(analyzerAgent?.tools || {}).length,
							hasModel: !!analyzerAgent?.model,
						},
					);

					const toolContext = {
						message: (inputData as any)?.message?.content,
						chatHistory,
						currentProfile: currentUserProfile,
						language: (inputData as any)?.channelId as string,
					};

					// Try to use An Data Analyst's intent analyzer tool - simplified approach
					let analysisResult: any;
					try {
						if (analyzerAgent.tools?.intentAnalyzer?.execute) {
							// Suppress TypeScript warning for deprecated tools property
							// eslint-disable-next-line @typescript-eslint/no-deprecated
							analysisResult = await analyzerAgent.tools.intentAnalyzer.execute(
								{ context: toolContext },
							);
						} else {
							throw new Error(
								"Intent analyzer tool not available via direct access",
							);
						}
					} catch (toolError: any) {
						console.warn(
							"⚠️ [Workflow] Tool execution failed:",
							toolError?.message || "Unknown error",
						);
						throw new Error(
							`Intent analyzer tool execution failed: ${toolError?.message || "Unknown error"}`,
						);
					}

					console.log("📋 [Workflow] Intent analysis result", {
						primaryIntent: analysisResult.intentClassification.primaryIntent,
						purchaseConfidence:
							analysisResult.intentClassification.purchaseConfidence,
						warrantyConfidence:
							analysisResult.intentClassification.warrantyConfidence,
						hasProfileUpdates:
							Object.keys(analysisResult.profileUpdates).length > 0,
					});

					// Update intent analysis with results if successful
					intentAnalysis.intent =
						analysisResult.intentClassification.primaryIntent;
					intentAnalysis.confidence = Math.max(
						analysisResult.intentClassification.purchaseConfidence,
						analysisResult.intentClassification.warrantyConfidence,
					);

					// Update user profile with pain points and other insights
					// Update working memory if we have profile changes and can find the proper API
					if (Object.keys(analysisResult.profileUpdates).length > 0) {
						try {
							// TODO: Implement proper working memory update when Memory API is clarified
							// For now, just log that we would update the profile
							console.log(
								"📝 [Workflow] Would update user profile with:",
								analysisResult.profileUpdates,
							);
							console.log(
								"✅ [Workflow] User profile update noted (implementation pending Memory API clarification)",
							);
						} catch (updateError) {
							console.warn(
								"⚠️ [Workflow] Could not update user profile:",
								updateError?.message,
							);
						}
					}
				} catch (analysisError) {
					console.error(
						"❌ [Workflow] Intent analysis failed:",
						analysisError?.message,
					);
					// Keep default intent analysis if analysis fails
				}

				console.log("✅ [Workflow] Intent analysis completed", {
					intent: intentAnalysis.intent,
					confidence: intentAnalysis.confidence,
					chatHistoryLength: chatHistory.length,
				});

				return { ...inputData, intent: intentAnalysis, chatHistory };
			},
		}),
	)
	.then(
		createStep({
			id: "agent-dispatcher",
			description: "Route to appropriate agent based on intent analysis",
			inputSchema: z.object({
				channelId: z.enum(["telegram", "whatsapp", "web", "zalo"]),
				message: z.object({
					content: z.string(),
					senderId: z.string(),
					timestamp: z.date(),
					attachments: z
						.array(
							z.object({
								type: z.string(),
								url: z.string(),
								filename: z.string().optional(),
							}),
						)
						.optional(),
				}),
				intent: z.object({
					intent: z.string(),
					confidence: z.number(),
					entities: z.array(z.unknown()),
				}),
				chatHistory: z
					.array(
						z.object({
							role: z.string(),
							content: z.string(),
							timestamp: z.string().optional(),
						}),
					)
					.optional(),
			}),
			outputSchema: z.object({
				response: z.string(),
				channelId: z.string(),
				actions: z.array(z.string()).optional(),
				metadata: z.record(z.unknown()),
			}),
			execute: async ({ inputData, mastra }) => {
				const { message, channelId, chatHistory, intent } = inputData as any;
				const intentType = intent.intent;
				const confidence = intent.confidence;
				const userId = message.senderId;
				const conversationId = `${channelId}_user_${userId}`;

				console.log("🎭 [Workflow] Agent Dispatcher", {
					channelId,
					intentType,
					confidence,
					messageLength: message.content.length,
					senderId: userId,
					conversationId,
				});

				// 🏁 GREETING CONTROL LOGIC 🏁
				const hasBeenGreeted =
					await optimizedMemoryManager.hasBeenGreeted(userId, conversationId);
				const needsGreeting = !hasBeenGreeted;

				console.log("👋 [GreetingControl] Workflow-level greeting check:", {
					userId,
					hasBeenGreeted,
					needsGreeting,
					intentType,
				});

				// Check if repeat mode is enabled
				const isRepeatMode = process.env.AGENT_REPEAT_MODE === "true";
				if (isRepeatMode) {
					console.log(
						"🔄 [Workflow] Repeat mode enabled, returning user message",
					);
					return {
						response: `Bạn vừa nói: "${message.content}"`,
						channelId,
						metadata: {
							processedBy: "workflow-repeat-mode",
							timestamp: new Date().toISOString(),
							repeatMode: true,
						},
					};
				}

				let selectedAgent: any;
				let agentType: string;

				// Agent routing logic based on intent analysis
				// Check if this is a RAM-related query
				const lowerMessage = message.content.toLowerCase();
				const ramKeywords = [
					"ram",
					"memory",
					"ddr4",
					"ddr5",
					"bộ nhớ",
					"ram desktop",
					"ram laptop",
				];
				const foundRamKeywords = ramKeywords.filter((keyword) =>
					lowerMessage.includes(keyword),
				);

				// Enhanced routing logic with direct keyword matching for RAM queries
				if (foundRamKeywords.length > 0) {
					// Route any RAM-related queries to RAM specialist regardless of intent classification
					selectedAgent = mastra.getAgent("ram");
					agentType = "ram";
					console.log(
						"🎯 [Workflow] Direct RAM keyword match, routing to RAM specialist",
					);
				} else if (intentType === "purchase" && confidence >= 0.6) {
					selectedAgent = mastra.getAgent("purchase");
					agentType = "purchase";
				} else if (intentType === "warranty" && confidence >= 0.6) {
					selectedAgent = mastra.getAgent("warranty");
					agentType = "warranty";
				} else if (confidence < 0.5) {
					// Use clarification agent for unclear intents
					selectedAgent = mastra.getAgent("clarification");
					agentType = "clarification";
				} else {
					// Fallback to Mai agent for high confidence unknown intents or mixed intents
					selectedAgent = mastra.getAgent("maiSale");
					agentType = "maiSale";
				}

				console.log("🚀 [Workflow] Selected agent", {
					agentType,
					agentName: selectedAgent?.name,
					hasModel: !!selectedAgent?.model,
					intent: intentType,
					confidence: confidence.toFixed(2),
				});

				if (!selectedAgent) {
					console.error("❌ [Workflow] No agent available for routing");
					return {
						response:
							"Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.",
						channelId,
						metadata: {
							error: "No agent available",
							processedBy: "workflow-agent-dispatcher",
							timestamp: new Date().toISOString(),
						},
					};
				}

				try {
					console.log(
						"🤖 [Workflow] Generating response with agent:",
						agentType,
					);

					// Prepare messages for agent
					let messages = [{ role: "user", content: message.content }];

					// Add limited chat history for context
					if (chatHistory && chatHistory.length > 0) {
						const recentHistory = chatHistory.slice(-3); // Max 3 messages for context
						const historyMessages = recentHistory.map((msg: any) => ({
							role: msg.role,
							content: msg.content,
						}));
						messages = [
							...historyMessages,
							{ role: "user", content: message.content },
						];
					}

					console.log("📊 [Workflow] Agent input prepared", {
						totalMessages: messages.length,
						agentType,
						messageLength: message.content.length,
						needsGreeting,
						hasBeenGreeted,
					});

					// 🎯 GREETING CONTROL INSTRUCTION 📝
					// Add greeting control instruction to user message based on greeting status
					if (needsGreeting) {
						message.content = `[FIRST TIME USER NEEDS GREETING] ${message.content}`;
						console.log(
							"👋 [GreetingControl] Adding FIRST_TIME greeting instruction",
						);
					} else {
						message.content = `[SKIP GREETING - USER ALREADY GREETED] ${message.content}`;
						console.log(
							"👋 [GreetingControl] Adding SKIP_GREETING instruction",
						);
					}

					const result = await selectedAgent.generate(messages as any, {});

					console.log("✅ [Workflow] Agent response generated successfully", {
						agentType,
						responseLength: result.text.length,
						responsePreview: `${result.text?.substring(0, 50)}...`,
					});

					// 📝 MARK USER AS GREETED AFTER SUCCESSFUL RESPONSE 📝
					if (needsGreeting) {
						try {
							await optimizedMemoryManager.markUserAsGreeted(
								userId,
								agentType,
								channelId,
							);
							console.log(
								"✅ [GreetingControl] Successfully marked user as greeted",
							);
						} catch (markError) {
							console.warn(
								"⚠️ [GreetingControl] Failed to mark user as greeted:",
								markError,
							);
							// Don't fail the response if marking fails
						}
					}

					return {
						response:
							result.text || "Xin lỗi, tôi không thể tạo được phản hồi.",
						channelId,
						metadata: {
							processedBy: `workflow-agent-${agentType}`,
							agentType,
							intent: intentType,
							confidence: confidence,
							timestamp: new Date().toISOString(),
							greetingControls: {
								needsGreeting,
								hasBeenGreeted,
								greetingInstructionApplied: true,
							},
						},
					};
				} catch (error: any) {
					console.error("❌ [Workflow] Agent execution failed:", {
						agentType,
						errorMessage:
							error instanceof Error ? error.message : String(error),
						intent: intentType,
						confidence: confidence,
					});

					// Fallback to Mai agent if the selected agent fails
					try {
						console.log("🔄 [Workflow] Falling back to Mai agent");
						const fallbackAgent = mastra.getAgent("maiSale");
						const result = await fallbackAgent.generate(
							[{ role: "user", content: message.content }] as any,
							{},
						);

						return {
							response:
								result.text ||
								"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn.",
							channelId,
							metadata: {
								processedBy: "workflow-agent-fallback-maiSale",
								originalAgent: agentType,
								intent: intentType,
								confidence: confidence,
								fallback: true,
								error: error instanceof Error ? error.message : String(error),
								timestamp: new Date().toISOString(),
							},
						};
					} catch (fallbackError: any) {
						console.error(
							"❌ [Workflow] Fallback agent also failed:",
							fallbackError.message,
						);
						return {
							response:
								"Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
							channelId,
							metadata: {
								processedBy: "workflow-agent-error",
								error: error instanceof Error ? error.message : String(error),
								fallbackError:
									fallbackError instanceof Error
										? fallbackError.message
										: String(fallbackError),
								timestamp: new Date().toISOString(),
							},
						};
					}
				}
			},
		}),
	)
	.branch([
		{
			condition: ({ result }) => {
				// Check if message requires parallel processing
				const message = (result as any)?.message?.content || "";
				const intent = (result as any)?.intent || {};

				// Check for parallel keyword patterns
				const hasParallelKeywords = PARALLEL_KEYWORDS.some((keywords) =>
					keywords.every((kw) => message.toLowerCase().includes(kw)),
				);

				// Check for parallel intents
				const hasParallelIntent = PARALLEL_INTENTS.includes(
					intent.intent?.toLowerCase() || "",
				);

				// Check for multiple categories mentioned
				const hasMultipleCats = hasMultipleCategories(message);

				console.log(
					`🔍 [Routing] Parallel conditions: keywords=${hasParallelKeywords}, intent=${hasParallelIntent}, multiCat=${hasMultipleCats}`,
				);

				return hasParallelKeywords || hasParallelIntent || hasMultipleCats;
			},
			workflow: createStep({
				id: "parallel-specialist-step",
				description:
					"Execute multiple specialists in parallel for comprehensive queries",
				inputSchema: z.object({
					channelId: z.string(),
					message: z.object({
						content: z.string(),
						senderId: z.string(),
						timestamp: z.date().optional(),
					}),
					intent: z.object({
						intent: z.string(),
						confidence: z.number(),
						entities: z.array(z.unknown()).optional(),
					}),
					chatHistory: z.array(z.unknown()).optional(),
				}),
				outputSchema: z.object({
					response: z.string(),
					channelId: z.string(),
					actions: z.array(z.string()).optional(),
					metadata: z.record(z.unknown()),
				}),
				execute: async ({ inputData, mastra }) => {
					const { message, channelId, intent } = inputData as any;
					const userId = message.senderId;

					console.log("🚀 [ParallelStep] Starting parallel processing", {
						channelId,
						userId,
						messageContent: message.content,
						intent: intent.intent,
					});

					try {
						// 1. Determine required agents
						const requiredAgents = determineRequiredAgents(message.content);
						console.log(
							`🎯 [ParallelStep] Required agents: ${requiredAgents.join(", ")}`,
						);

						// 2. Send immediate holding message
						const holdingMessage = generateHoldingMessage(requiredAgents);

						// For Telegram, we need chatId from message context
						const chatId = (inputData as any).chatId || userId;

						await sendChannelResponse(
							channelId,
							userId,
							holdingMessage,
							chatId,
						);
						console.log(
							`📤 [ParallelStep] Holding message sent: "${holdingMessage}"`,
						);

						// 3. Execute specialists in parallel
						const specialistResults = await executeSpecialistsParallel(
							requiredAgents,
							message.content,
							intent,
							mastra,
						);

						// 4. Synthesize results with Mai
						const finalResponse = await synthesizeWithMai(
							specialistResults,
							message.content,
							intent,
							mastra,
						);

						console.log(
							"✅ [ParallelStep] Parallel processing completed successfully",
						);

						return {
							response: finalResponse,
							channelId,
							actions: ["parallel_processing_completed"],
							metadata: {
								processedBy: "parallel-specialist-step",
								requiredAgents: requiredAgents,
								successfulAgents: specialistResults.length,
								processingMode: "parallel",
								timestamp: new Date().toISOString(),
							},
						};
					} catch (error: any) {
						console.error(
							"❌ [ParallelStep] Parallel processing failed:",
							error.message,
						);

						// Fallback to Mai agent for error handling
						try {
							const maiAgent = mastra.getAgent("maiSale");
							const fallbackResponse = await maiAgent.generate(
								[
									{
										role: "user",
										content: `System error occurred while processing: "${message.content}". Provide helpful response.`,
									},
								],
								{},
							);

							return {
								response:
									fallbackResponse.text ||
									"Em xin lỗi, có lỗi xảy ra. Vui lòng thử lại ạ.",
								channelId,
								metadata: {
									processedBy: "parallel-specialist-step-fallback",
									error: error.message,
									fallback: true,
									timestamp: new Date().toISOString(),
								},
							};
						} catch (fallbackError: any) {
							return {
								response:
									"Em xin lỗi, hệ thống gặp sự cố. Vui lòng thử lại sau ạ.",
								channelId,
								metadata: {
									processedBy: "parallel-specialist-step-error",
									error: error.message,
									fallbackError: fallbackError.message,
									timestamp: new Date().toISOString(),
								},
							};
						}
					}
				},
			}),
		},
	])
	.commit();

// ========================================
// PARALLEL PROCESSING HELPER FUNCTIONS
// ========================================

// Parallel Mode Triggers
const PARALLEL_KEYWORDS = [
	["bạn", "bán", "gì"], // "Bạn bán gì?"
	["có", "sản phẩm", "gì"], // "Có sản phẩm gì?"
	["build", "pc"], // "Build PC gaming"
	["nâng cấp", "ram", "ổ cứng"], // "Nâng cấp RAM và ổ cứng"
	["so sánh", "tất cả"], // "So sánh tất cả"
	["tư vấn", "cấu hình"], // "Tư vấn cấu hình"
];

const PARALLEL_INTENTS = [
	"product_catalog", // General product inquiry
	"upgrade_inquiry", // Hardware upgrade
	"build_pc", // PC building
	"compare_all", // Product comparison
];

// Multiple category detection
function hasMultipleCategories(content: string): boolean {
	const categories = ["cpu", "ram", "ssd", "case", "barebone"];
	const vietnamese_map = {
		cpu: "bộ xử lý",
		ram: "bộ nhớ",
		ssd: "ổ cứng",
		case: "vỏ máy",
		barebone: "barebone",
	};

	let mentionedCount = 0;
	categories.forEach((cat) => {
		if (content.includes(cat) || content.includes(vietnamese_map[cat])) {
			mentionedCount++;
		}
	});

	return mentionedCount >= 2; // 2+ categories = parallel mode
}

// Helper function to determine required agents based on message content
function determineRequiredAgents(content: string): string[] {
	const lowerContent = content.toLowerCase();
	const required_agents: string[] = [];

	// For general product catalog queries
	if (
		lowerContent.includes("bán gì") ||
		lowerContent.includes("có gì") ||
		lowerContent.includes("sản phẩm gì")
	) {
		return ["cpu", "ram", "ssd", "barebone", "desktop"]; // All agents
	}

	// Category-specific detection with Vietnamese support
	const categoryMap = {
		cpu: ["cpu", "bộ xử lý", "vi xử lý", "intel", "amd", "ryzen"],
		ram: ["ram", "bộ nhớ", "memory", "ddr4", "ddr5"],
		ssd: ["ssd", "ổ cứng", "storage", "hard drive", "nvme", "sata"],
		barebone: ["case", "vỏ máy", "barebone", "chassis", "thùng máy"],
		desktop: ["pc", "máy tính", "desktop", "computer", "máy bộ"],
	};

	// Check each category
	Object.entries(categoryMap).forEach(([agent, keywords]) => {
		if (keywords.some((keyword) => lowerContent.includes(keyword))) {
			required_agents.push(agent);
		}
	});

	// Special handling for build/upgrade scenarios
	if (lowerContent.includes("build") || lowerContent.includes("lắp ráp")) {
		// PC build requires most components
		return ["cpu", "ram", "ssd", "barebone", "desktop"];
	}

	if (lowerContent.includes("nâng cấp") || lowerContent.includes("upgrade")) {
		// Keep detected agents, or default to common upgrade components
		return required_agents.length > 0 ? required_agents : ["cpu", "ram", "ssd"];
	}

	// Return detected agents or default fallback
	return required_agents.length > 0 ? required_agents : ["cpu", "ram", "ssd"];
}

// Helper function to generate appropriate holding messages
function generateHoldingMessage(agents: string[]): string {
	const agentDisplayNames = {
		cpu: "CPU",
		ram: "RAM",
		ssd: "SSD",
		barebone: "case",
		desktop: "PC hoàn chỉnh",
	};

	if (agents.length >= 4) {
		return "Để em tổng hợp thông tin từ tất cả chuyên gia về CPU, RAM, SSD và các linh kiện khác để tư vấn tốt nhất cho quý khách ạ...";
	}

	if (agents.length === 1) {
		const category = agentDisplayNames[agents[0]] || agents[0];
		return `Để em kiểm tra thông tin ${category} chi tiết cho quý khách nhé...`;
	}

	const categories = agents
		.map((agent) => agentDisplayNames[agent] || agent)
		.join(", ");
	return `Để em tổng hợp thông tin về ${categories} để tư vấn phù hợp cho quý khách ạ...`;
}

// Execute specialists in parallel with timeout handling
async function executeSpecialistsParallel(
	agents: string[],
	message: string,
	intent: any,
	mastra: any,
): Promise<any[]> {
	const agentMap = {
		cpu: mastra.getAgent("cpu"),
		ram: mastra.getAgent("ram"),
		ssd: mastra.getAgent("ssd"),
		barebone: mastra.getAgent("barebone"),
		desktop: mastra.getAgent("desktop"),
	};

	console.log(
		`🔄 [Parallel] Starting ${agents.length} specialists: ${agents.join(", ")}`,
	);

	// Create parallel promises with individual timeouts
	const agentPromises = agents.map(async (agentName) => {
		const agent = agentMap[agentName];
		if (!agent) {
			console.warn(`⚠️ [Parallel] Agent ${agentName} not found`);
			return { agent: agentName, status: "not_found", result: null };
		}

		try {
			// Use Phase 1 summary methods with timeout
			const result = await Promise.race([
				agent.getQuickSummary(message, intent.intent),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error(`${agentName} timeout`)), 3000),
				),
			]);

			console.log(`✅ [Parallel] ${agentName} completed successfully`);
			return { agent: agentName, status: "success", result };
		} catch (error: any) {
			console.warn(`⏰ [Parallel] ${agentName} failed: ${error.message}`);
			return {
				agent: agentName,
				status: "timeout",
				result: null,
				error: error.message,
			};
		}
	});

	// Execute all promises in parallel
	const results = await Promise.allSettled(agentPromises);

	// Filter successful results
	const successfulResults: any[] = [];
	results.forEach((result, _index) => {
		if (result.status === "fulfilled" && result.value?.status === "success") {
			successfulResults.push(result.value.result);
		}
	});

	console.log(
		`📊 [Parallel] Results: ${successfulResults.length}/${agents.length} successful`,
	);
	return successfulResults;
}

// Mai synthesizes specialist data into final response
async function synthesizeWithMai(
	specialistResults: any[],
	originalMessage: string,
	intent: any,
	mastra: any,
): Promise<string> {
	const maiAgent = mastra.getAgent("maiSale");
	if (!maiAgent) {
		console.error("❌ [Synthesis] Mai agent not found");
		return "Em xin lỗi, hệ thống gặp sự cố. Vui lòng thử lại sau ạ.";
	}

	// Handle no results (all agents timed out)
	if (!specialistResults || specialistResults.length === 0) {
		console.warn("⚠️ [Synthesis] No specialist data available, using fallback");

		const fallbackResponse = await maiAgent.generate(
			[
				{
					role: "user",
					content: `All specialists are busy. Provide helpful general response for customer query: "${originalMessage}"`,
				},
			],
			{},
		);

		return (
			fallbackResponse.text ||
			"Em xin lỗi, hệ thống đang tải thông tin. Quý khách vui lòng chờ chút ạ."
		);
	}

	// Prepare synthesis context for Mai
	const synthesisContext = `
Customer Original Message: ${originalMessage}
Customer Intent: ${intent.intent} (confidence: ${intent.confidence})

Available Specialist Data:
${JSON.stringify(specialistResults, null, 2)}

TASK: Synthesize this specialist data into a natural, comprehensive Vietnamese response for SSTC customer.

REQUIREMENTS:
- Combine ALL available information naturally
- Maintain Mai's warm, professional tone
- Include specific products, prices, and recommendations from the data
- Group similar products logically (e.g., "CPU Options:", "RAM Options:")
- Don't mention technical issues, timeouts, or specialists directly
- End with helpful questions or next steps to continue the conversation
- Use Vietnamese pricing format (e.g., "2.5 triệu", "15 triệu")
- Keep response comprehensive but not overwhelming (aim for 200-400 words)

EXAMPLE FORMAT:
"Dạ quý khách! Em vừa tổng hợp được thông tin chi tiết:

🔸 **CPU Options**: [products with prices and use cases]
🔸 **RAM Options**: [products with prices and use cases] 
🔸 **Storage Options**: [products with prices and use cases]

[Brief summary of benefits/recommendations]

Quý khách có budget khoảng bao nhiêu và dùng để làm gì chính ạ?"
`;

	try {
		const synthesizedResponse = await maiAgent.generate(
			[
				{
					role: "system",
					content:
						"You are Mai, SSTC's friendly sales assistant. Synthesize specialist data into natural customer response.",
				},
				{
					role: "user",
					content: synthesisContext,
				},
			],
			{},
		);

		const finalResponse =
			synthesizedResponse.text || "Cảm ơn quý khách đã quan tâm đến SSTC!";
		console.log(
			`✅ [Synthesis] Mai response generated (${finalResponse.length} chars)`,
		);

		return finalResponse;
	} catch (error: any) {
		console.error("❌ [Synthesis] Mai synthesis failed:", error.message);
		return "Em xin lỗi, có lỗi khi tổng hợp thông tin. Quý khách vui lòng thử lại ạ.";
	}
}

// Send response via appropriate channel
async function sendChannelResponse(
	channelId: string,
	userId: string,
	message: string,
	chatId?: string, // For Telegram
): Promise<boolean> {
	try {
		// Get channel adapter from registry
		const adapter = channelRegistry.get(channelId);
		if (!adapter) {
			console.warn(`⚠️ [Channel] Adapter ${channelId} not found`);
			return false;
		}

		console.log(
			`📤 [Channel:${channelId.toUpperCase()}] Sending to ${userId}: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`,
		);

		// Send via appropriate channel
		switch (channelId) {
			case "telegram": {
				// Cast to access public sendMessage method
				const telegramAdapter = adapter as any;
				if (telegramAdapter.sendMessage && chatId) {
					return await telegramAdapter.sendMessage(chatId, message);
				}
				break;
			}

			case "zalo": {
				// Cast to access public sendMessage method
				const zaloAdapter = adapter as any;
				if (zaloAdapter.sendMessage) {
					// For Zalo, userId is the threadId
					return await zaloAdapter.sendMessage(userId, message);
				}
				break;
			}

			case "web":
				// Web channel would use WebSocket or Server-Sent Events
				console.log(`📤 [Web] Would send via WebSocket: ${message}`);
				return true;

			default:
				console.warn(`❌ [Channel] Unknown channel: ${channelId}`);
				return false;
		}

		console.warn(
			`❌ [Channel] Failed to send via ${channelId} - method not available`,
		);
		return false;
	} catch (error: any) {
		console.error(
			`❌ [Channel:${channelId.toUpperCase()}] Send failed:`,
			error.message,
		);
		return false;
	}
}

// ✅ Mastra Workflow Ready!
console.log("✅ Channel Message Workflow initialized");
