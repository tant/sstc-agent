/**
 * Web channel adapter for Mastra framework
 * Allows interaction with agents through the Mastra Playground
 */

import type { ChannelAdapter } from "../../core/channels/interface";
import { messageProcessor } from "../../core/processor/message-processor";

export class WebChannelAdapter implements ChannelAdapter {
	channelId = "web";

	constructor() {
		console.log("🔧 [Web] Initializing web channel adapter");
	}

	/**
	 * Handle incoming message from web interface (Playground)
	 */
	async handleMessage(rawMessage: any): Promise<void> {
		console.log("📥 [Web] Received message:", rawMessage);

		try {
			// Validate message structure
			if (!rawMessage || !rawMessage.content || !rawMessage.senderId) {
				throw new Error("Invalid message format");
			}

			// Create standardized message format
			const standardizedMessage = {
				id: rawMessage.messageId || Date.now().toString(),
				content: rawMessage.content,
				contentType: rawMessage.contentType || "text",
				sender: {
					id: rawMessage.senderId,
					username: rawMessage.username || "web_user",
					displayName: rawMessage.displayName || "Web User",
				},
				timestamp: rawMessage.timestamp
					? new Date(rawMessage.timestamp)
					: new Date(),
				channel: {
					channelId: "web",
					channelMessageId: rawMessage.messageId || Date.now().toString(),
					metadata: {
						...rawMessage.metadata,
					},
				},
				attachments: rawMessage.attachments,
			};

			console.log("🔄 [Web] Sending to central processor:", {
				messageId: standardizedMessage.id,
				channelId: standardizedMessage.channel.channelId,
			});

			// Process through central message processor
			const response =
				await messageProcessor.processMessage(standardizedMessage);

			console.log("📤 [Web] Received response from processor:", {
				contentType: response.contentType,
				contentLength: response.content.length,
			});

			// For web channel, we don't need to send response back
			// The response will be returned to the caller directly
			console.log(`✅ [Web] Message processed successfully`);
		} catch (error) {
			console.error(`❌ [Web] Error processing message:`, error);
			throw error;
		}
	}

	/**
	 * Cleanup method for graceful shutdown
	 */
	async shutdown(): Promise<void> {
		console.log("🛑 [Web] Shutting down web channel adapter...");
		// No specific cleanup needed for web channel
		console.log("✅ [Web] Web channel adapter shut down successfully");
	}
}
