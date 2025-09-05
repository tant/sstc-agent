import { mastra } from "./mastra/index";
import { unifiedMemoryManager } from "./mastra/core/memory/unified-memory-manager";

/**
 * Enhanced API server using proper Mastra patterns
 * This replaces the standalone Express server with Mastra-integrated endpoints
 */

// Health check endpoint integrated with Mastra
export const healthEndpoint = async (req: any, res: any) => {
	try {
		const healthCheck = await unifiedMemoryManager.healthCheck();

		res.json({
			status: healthCheck.status,
			message: healthCheck.message,
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
			mastra: {
				agents: Object.keys(mastra.agents || {}),
				workflows: Object.keys(mastra.workflows || {}),
			},
		});
	} catch (error: any) {
		res.status(500).json({
			status: "unhealthy",
			message: `Health check failed: ${error.message}`,
			timestamp: new Date().toISOString(),
		});
	}
};

// Chat processing endpoint using proper Mastra workflow execution
export const chatEndpoint = async (req: any, res: any) => {
	try {
		const { channelId, message, senderId, chatId } = req.body;

		// Validate required fields
		if (!channelId || !message || !senderId) {
			return res.status(400).json({
				error: "Missing required fields",
				required: ["channelId", "message", "senderId"],
				example: {
					channelId: "web",
					message: "Xin chào!",
					senderId: "user123",
					chatId: "optional-chat-id",
				},
			});
		}

		console.log(
			`📨 [API] New chat message from ${senderId} on ${channelId}: ${message.substring(0, 50)}...`,
		);

		// Use proper Mastra workflow execution
		const result = await mastra.run({
			workflowId: "channel-message-processor", // Matches the workflow ID from message-processor.ts
			triggerData: {
				channelId,
				userId: senderId,
				chatId: chatId || senderId, // Use chatId or fallback to senderId
				message,
				timestamp: new Date().toISOString(),
			},
		});

		console.log(`✅ [API] Chat processed successfully for ${senderId}`);

		res.json({
			success: true,
			response: result?.data?.response || "Processed successfully",
			metadata: result?.data?.metadata || {},
			processedAt: new Date().toISOString(),
			workflowStatus: result?.status || "completed",
		});
	} catch (error: any) {
		console.error(`❌ [API] Chat processing failed:`, error);

		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
};

// Memory endpoints
export const getUserHistoryEndpoint = async (req: any, res: any) => {
	try {
		const { userId } = req.params;
		const { limit = 10, channelFilter } = req.query;

		console.log(
			`📚 [API] Getting chat history for user ${userId}, limit: ${limit}`,
		);

		const history = await unifiedMemoryManager.getUserChatHistory(userId, {
			limit: parseInt(limit as string, 10) || 10,
		});

		// Filter by channel if specified
		let filteredHistory = history;
		if (channelFilter) {
			filteredHistory = history.filter((msg) => msg.channel === channelFilter);
		}

		res.json({
			success: true,
			userId,
			messageCount: filteredHistory.length,
			messages: filteredHistory.map((msg) => ({
				role: msg.role,
				content: msg.content,
				channel: msg.channel,
				timestamp: msg.timestamp,
				id: msg.id,
			})),
			retrievedAt: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error(`❌ [API] Failed to get history for ${req.params.userId}:`, error);

		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
};

// Analytics endpoint
export const analyticsEndpoint = async (req: any, res: any) => {
	try {
		console.log("📊 [API] Getting system analytics");

		const memoryStats = await unifiedMemoryManager.getMemoryStats();

		res.json({
			success: true,
			memory: memoryStats,
			mastra: {
				agents: Object.keys(mastra.agents || {}),
				workflows: Object.keys(mastra.workflows || {}),
				version: "1.0.0", // You might want to read this from package.json
			},
			system: {
				uptime: process.uptime(),
				memoryUsage: process.memoryUsage(),
				nodeVersion: process.version,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error(`❌ [API] Failed to get analytics:`, error);

		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
};

// Reset user memory endpoint
export const resetUserMemoryEndpoint = async (req: any, res: any) => {
	try {
		const { userId } = req.params;
		const { confirm } = req.body;

		if (!confirm) {
			return res.status(400).json({
				success: false,
				error: 'Confirmation required. Send { "confirm": true }',
			});
		}

		console.log(`🗑️ [API] Resetting memory for user ${userId}`);

		await unifiedMemoryManager.resetUserMemory(userId);

		res.json({
			success: true,
			message: `Memory reset for user ${userId}`,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error(`❌ [API] Failed to reset memory for ${req.params.userId}:`, error);

		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
};

// Greeting status endpoint
export const greetingStatusEndpoint = async (req: any, res: any) => {
	try {
		const { userId } = req.params;

		console.log(`👋 [API] Checking greeting status for ${userId}`);

		const hasBeenGreeted = await unifiedMemoryManager.hasUserBeenGreeted(userId);

		res.json({
			success: true,
			userId,
			hasBeenGreeted,
			greetingInstruction: hasBeenGreeted
				? "[SKIP GREETING - USER ALREADY GREETED]"
				: "[FIRST TIME USER NEEDS GREETING]",
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error(`❌ [API] Failed to check greeting for ${req.params.userId}:`, error);

		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
};

// API documentation endpoint
export const docsEndpoint = (req: any, res: any) => {
	res.json({
		name: "SSTC Agent API",
		version: "1.0.0",
		description: "REST API for SSTC chat agents using Mastra framework",
		endpoints: {
			"GET /health": "System health check",
			"POST /chat": "Process chat message through Mastra workflow",
			"GET /memory/:userId/history": "Get user chat history",
			"GET /analytics": "Get system analytics",
			"POST /memory/:userId/reset": "Reset user memory (admin)",
			"GET /greeting/:userId/status": "Check greeting status for user",
		},
		mastra: {
			agents: Object.keys(mastra.agents || {}),
			workflows: Object.keys(mastra.workflows || {}),
			channels: ["telegram", "zalo", "web"],
			features: [
				"parallel processing",
				"2-phase responses", 
				"Vietnamese language support",
				"multi-specialist coordination",
				"unified memory",
				"timeout handling",
			],
		},
		timestamp: new Date().toISOString(),
	});
};

// Export all endpoint functions for Mastra server configuration
export const apiEndpoints = {
	healthEndpoint,
	chatEndpoint,
	getUserHistoryEndpoint,
	analyticsEndpoint,
	resetUserMemoryEndpoint,
	greetingStatusEndpoint,
	docsEndpoint,
};

console.log("🔧 [API] Mastra-integrated API endpoints configured");
console.log("💡 [API] Use these endpoints with Mastra server custom routes");
console.log("📚 [API] Available endpoints:", Object.keys(apiEndpoints));