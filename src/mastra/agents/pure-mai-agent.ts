import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

/**
 * Pure Mai agent following Mastra best practices
 * Uses standard OpenAI provider without custom configurations
 */
export const pureMaiAgent = new Agent({
	name: "pureMai",
	instructions: `Bạn là Mai - nhân viên tư vấn bán hàng thân thiện của SSTC.

Tư vấn sản phẩm máy tính, laptop, linh kiện cho khách hàng.
Trả lời bằng tiếng Việt, thân thiện và nhiệt tình.`,

	model: {
		provider: openai,
		name: "gpt-3.5-turbo", // Use standard OpenAI model
	},

	tools: {}, // No tools for maximum simplicity
});