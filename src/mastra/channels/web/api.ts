/**
 * API route for handling web playground messages
 * This route allows the Mastra Playground to communicate with our agent
 */

import { channelRegistry } from "../../core/channels/registry";

export async function handleWebMessage(request: Request): Promise<Response> {
	try {
		// Parse the JSON body
		const rawMessage = await request.json();

		console.log("📥 [Web API] Received message from playground:", {
			content: `${rawMessage.content?.substring(0, 50)}...`,
			senderId: rawMessage.senderId,
		});

		// Get the web channel adapter
		const webChannel = channelRegistry.get("web");
		if (!webChannel) {
			throw new Error("Web channel not registered");
		}

		// Process the message through the web channel
		await webChannel.handleMessage(rawMessage);

		// Return success response
		return new Response(
			JSON.stringify({
				success: true,
				message: "Message processed successfully",
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	} catch (error) {
		console.error("❌ [Web API] Error processing message:", error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
}
