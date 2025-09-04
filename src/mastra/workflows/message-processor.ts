/**
 * Mastra Workflow for processing messages from all channels
 * Leverages Mastra agents and tools for intelligent message handling
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { purchaseAgent } from "../agents/purchase-agent";
import { warrantyAgent } from "../agents/warranty-agent";
import { clarificationAgent } from "../agents/clarification-agent";
import { maiSale } from "../agents/mai-agent";
import { cpuSpecialist } from "../agents/cpu-specialist";
import { unifiedMemoryManager } from "../core/memory/unified-memory-manager";

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

					console.log(
						"🔍 [Workflow] Getting chat history via Unified Memory Manager for user:",
						userId,
					);

					// Use unified memory manager to get chat history across all channels
					chatHistory = await unifiedMemoryManager.getUserChatHistory(userId, {
						limit: 5,
					});

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
						if (
							analyzerAgent.tools &&
							analyzerAgent.tools.intentAnalyzer?.execute
						) {
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

				console.log("🎭 [Workflow] Agent Dispatcher", {
					channelId,
					intentType,
					confidence,
					messageLength: message.content.length,
					senderId: userId,
				});

				// 🏁 GREETING CONTROL LOGIC 🏁
				const hasBeenGreeted =
					await unifiedMemoryManager.hasUserBeenGreeted(userId);
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
							await unifiedMemoryManager.markUserAsGreeted(
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

	.commit();

// ✅ Mastra Workflow Ready!
console.log("✅ Channel Message Workflow initialized");
