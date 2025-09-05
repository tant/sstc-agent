/**
 * Simple Mastra Workflow following best practices
 * Uses native Mastra patterns instead of custom parallel processing
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

export const simpleMessageWorkflow = createWorkflow({
	id: "simple-message-processor",
	description: "Process chat messages using Mastra agents",
	inputSchema: z.object({
		channelId: z.string(),
		userId: z.string(),
		message: z.string(),
		timestamp: z.string().optional(),
		chatId: z.string().optional(),
	}),
	outputSchema: z.object({
		response: z.string(),
		metadata: z.record(z.unknown()),
	}),
})
	.then(
		createStep({
			id: "process-with-mai-agent",
			description: "Process message with Mai agent",
			execute: async ({ inputData, mastra }) => {
				console.log("💬 [Workflow] Processing message with Mai agent");
				
				const { message, userId, channelId } = inputData as any;

				// Use Mastra's native agent execution
				const maiAgent = mastra.getAgent("maiSale");
				if (!maiAgent) {
					throw new Error("Mai agent not found");
				}

				console.log(`🤖 [Workflow] Calling Mai agent for user ${userId}`);
				
				const response = await maiAgent.generate(message, {
					userId,
					channelId,
					timestamp: new Date().toISOString(),
				});

				console.log("✅ [Workflow] Mai agent response generated");

				return {
					response: response.text || "Xin chào! Tôi có thể giúp gì cho bạn?",
					metadata: {
						agentUsed: "maiSale",
						userId,
						channelId,
						processedAt: new Date().toISOString(),
					},
				};
			},
		}),
	);