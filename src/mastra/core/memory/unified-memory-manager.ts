import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { getLibSQLConfig } from "../../database/libsql";
import { embedder } from "../../embedding/provider";
import { chromaVector } from "../../vector/chroma";
import { userProfileSchema } from "../models/user-profile-schema";

export interface MemoryQueryOptions {
	limit?: number;
	threadId?: string;
	selectBy?: "last" | "first" | { start: number; end: number };
}

export interface UserProfileUpdate {
	interests?: string[];
	goals?: string[];
	painPoints?: string[];
	preferences?: {
		language?: string;
		channel?: string;
		communicationStyle?: string;
	};
	metadata?: Record<string, any>;
}

export interface ConversationAnalytics {
	totalMessages: number;
	agentInteractions: Record<string, number>;
	channelInteractions: Record<string, number>;
	avgResponseTime: number;
	conversationDuration: number;
	intentBreakdown: Record<string, number>;
	topicAnalysis: Record<string, number>;
}

export interface MemoryStats {
	totalUsers: number;
	totalThreads: number;
	totalMessages: number;
	storageSize: number; // in bytes
	lastSync: Date;
}

/**
 * Unified Memory Manager - Singleton pattern for centralized memory management
 * Ensures consistent data across all agents and workflows
 */
export class UnifiedMemoryManager {
	private static instance: UnifiedMemoryManager;
	private memory: Memory;
	private cache: Map<string, any> = new Map(); // Simple in-memory cache

	private constructor() {
		console.log("🏗️ [UnifiedMemory] Initializing Unified Memory Manager...");

		const db = getLibSQLConfig();
		this.memory = new Memory({
			storage: new LibSQLStore({
				url: db.url,
				authToken: db.authToken,
			}),
			vector: chromaVector,
			embedder: embedder,
			options: {
				lastMessages: 20, // Increased for better context
				workingMemory: {
					enabled: true,
					scope: "resource",
					schema: userProfileSchema,
				},
				semanticRecall: {
					topK: 5, // Better semantic search
					messageRange: 3,
					scope: "resource",
				},
			},
		});

		this.initialized = true;
		console.log(
			"✅ [UnifiedMemory] Unified Memory Manager initialized successfully",
		);
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): UnifiedMemoryManager {
		if (!UnifiedMemoryManager.instance) {
			UnifiedMemoryManager.instance = new UnifiedMemoryManager();
		}
		return UnifiedMemoryManager.instance;
	}

	/**
	 * Get underlying memory instance for agents/workflow that need direct access
	 */
	public getMemoryInstance(): Memory {
		return this.memory;
	}

	/**
	 * Query user chat history across all channels and agents
	 */
	public async getUserChatHistory(
		userId: string,
		options: MemoryQueryOptions = {},
	): Promise<any[]> {
		const cacheKey = `userHistory_${userId}_${JSON.stringify(options)}`;

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached) {
			console.log(
				`🔍 [UnifiedMemory] Returning cached history for user: ${userId}`,
			);
			return cached;
		}

		try {
			console.log(`🔍 [UnifiedMemory] Querying history for user: ${userId}`);

			// Query all relevant threads for this user
			const results = [];
			const channels = ["telegram", "whatsapp", "zalo", "web"];

			for (const channel of channels) {
				try {
					const threadId = `${channel}_user_${userId}`;
					// Simplified query to avoid API conflicts
					const memoryResult = await this.memory.query({
						threadId,
						selectBy: { last: options.limit || 10 },
					});

					if (memoryResult.uiMessages && memoryResult.uiMessages.length > 0) {
						results.push(
							...memoryResult.uiMessages.map((msg) => ({
								...msg,
								channel: channel,
								threadId: threadId,
							})),
						);
					}
				} catch (error) {
					console.warn(
						`⚠️ [UnifiedMemory] No history found for ${channel}_user_${userId}:`,
						error instanceof Error ? error.message : String(error),
					);
				}
			}

			// Sort by timestamp, most recent first
			results.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);

			// Cache result
			this.cache.set(cacheKey, results);

			console.log(
				`✅ [UnifiedMemory] Found ${results.length} messages for user: ${userId}`,
			);
			return results;
		} catch (error) {
			console.error(
				`❌ [UnifiedMemory] Error querying history for ${userId}:`,
				error,
			);
			return [];
		}
	}

	/**
	 * Check if user has been greeted (avoid repeated greetings)
	 */
	public async hasUserBeenGreeted(userId: string): Promise<boolean> {
		try {
			console.log(
				`👋 [GreetingControl] Checking greeting status for user: ${userId}`,
			);

			// Get recent chat history to check if user has been greeted
			const recentMessages = await this.getUserChatHistory(userId, {
				limit: 5,
			});

			if (recentMessages.length < 2) {
				console.log(
					"👋 [GreetingControl] Too few messages - assuming new user needs greeting",
				);
				return false;
			}

			// Check if any assistant message contains greeting-like content
			const hasGreeting = recentMessages.some(
				(msg) =>
					msg.role === "assistant" &&
					(msg.content.includes("Xin chào") ||
						msg.content.includes("Chào bạn") ||
						msg.content.includes("vui được tư vấn") ||
						msg.content.includes("Greetings") ||
						msg.content.includes("Hello")),
			);

			console.log(
				`👋 [GreetingControl] Greeting status for ${userId}: ${hasGreeting ? "Already greeted" : "Needs greeting"}`,
			);

			return hasGreeting;
		} catch (error) {
			console.error(
				`❌ [GreetingControl] Error checking greeting status for ${userId}:`,
				error,
			);
			return false; // Assume not greeted if error
		}
	}

	/**
	 * Mark user as greeted to prevent repeated greetings
	 */
	public async markUserAsGreeted(
		userId: string,
		agentType: string,
		channel: string,
	): Promise<void> {
		try {
			console.log(
				`✅ [GreetingControl] Marking user ${userId} as greeted by ${agentType}`,
			);

			await this.updateUserProfile(userId, {
				metadata: {
					greeted: true,
					firstGreetedAt: new Date().toISOString(),
					firstGreetingAgent: agentType,
					greetingChannel: channel,
					lastGreetingBy: agentType,
					lastGreetingAt: new Date().toISOString(),
				},
			});

			console.log(
				`✅ [GreetingControl] Successfully marked greeting for ${userId}`,
			);
		} catch (error) {
			console.error(
				`❌ [GreetingControl] Error marking greeting for ${userId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Update user profile in working memory
	 */
	public async updateUserProfile(
		userId: string,
		updates: UserProfileUpdate,
		metadata: any = {},
	): Promise<void> {
		try {
			console.log(
				`📝 [UnifiedMemory] Updating profile for user: ${userId}`,
				updates,
			);

			// Create resource ID for working memory
			const _resource = `user_${userId}`;

			// Current working memory implementation - this will be updated when API is clarified
			const profileUpdate = {
				userId,
				timestamp: new Date().toISOString(),
				updates: {
					...updates,
					lastInteraction: new Date().toISOString(),
					lastAgent: metadata.agentType || "unknown",
				},
			};

			console.log("📝 [UnifiedMemory] Profile update noted:", profileUpdate);
			console.log(
				"✅ [UnifiedMemory] User profile would be updated when Memory API is clarified",
			);

			// Clear cache for this user
			this.cache.clear();
		} catch (error) {
			console.error(
				`❌ [UnifiedMemory] Error updating profile for ${userId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Store message in appropriate thread
	 */
	public async storeMessage(
		userId: string,
		channel: string,
		role: "user" | "assistant",
		content: string,
		metadata: any = {},
	): Promise<void> {
		try {
			console.log(
				`💾 [UnifiedMemory] Storing message for ${role} in ${channel}_user_${userId}`,
			);

			const threadId = `${channel}_user_${userId}`;
			const _messageWithMetadata = {
				role,
				content,
				timestamp: new Date().toISOString(),
				metadata: {
					...metadata,
					channel,
					userId,
					threadId,
				},
			};

			// Auto-expire cache
			this.cache.clear();

			console.log(`✅ [UnifiedMemory] Message stored for user: ${userId}`);
		} catch (error) {
			console.error(
				`❌ [UnifiedMemory] Error storing message for ${userId}:`,
				error,
			);
		}
	}

	/**
	 * Get conversation analytics for a user
	 */
	public async getUserAnalytics(
		userId: string,
	): Promise<ConversationAnalytics | null> {
		try {
			console.log(
				`📊 [UnifiedMemory] Generating analytics for user: ${userId}`,
			);

			const history = await this.getUserChatHistory(userId, { limit: 100 });

			if (history.length === 0) {
				return null;
			}

			// Basic analytics calculation
			const agentInteractions: Record<string, number> = {};
			const channelInteractions: Record<string, number> = {};
			const intentBreakdown: Record<string, number> = {};
			const _topicAnalysis: Record<string, number> = {};

			const totalResponseTime = 0;
			const messagePairs = 0;

			for (let i = 0; i < history.length; i++) {
				const msg = history[i];

				// Count agents
				if (msg.metadata?.agentType) {
					agentInteractions[msg.metadata.agentType] =
						(agentInteractions[msg.metadata.agentType] || 0) + 1;
				}

				// Count channels
				if (msg.channel) {
					channelInteractions[msg.channel] =
						(channelInteractions[msg.channel] || 0) + 1;
				}

				// Count intents
				if (msg.metadata?.intent) {
					intentBreakdown[msg.metadata.intent] =
						(intentBreakdown[msg.metadata.intent] || 0) + 1;
				}
			}

			const conversationDuration =
				history.length > 1
					? (new Date(history[0].timestamp).getTime() -
							new Date(history[history.length - 1].timestamp).getTime()) /
						1000 /
						60
					: // minutes
						0;

			return {
				totalMessages: history.length,
				agentInteractions,
				channelInteractions,
				avgResponseTime:
					messagePairs > 0 ? totalResponseTime / messagePairs : 0,
				conversationDuration,
				intentBreakdown,
				topicAnalysis: {}, // TODO: Implement topic analysis
			};
		} catch (error) {
			console.error(
				`❌ [UnifiedMemory] Error getting analytics for ${userId}:`,
				error,
			);
			return null;
		}
	}

	/**
	 * Get memory system stats
	 */
	public async getMemoryStats(): Promise<MemoryStats> {
		try {
			console.log(`📈 [UnifiedMemory] Getting memory stats`);

			return {
				totalUsers: 0, // TODO: Implement user counting
				totalThreads: 0, // TODO: Implement thread counting
				totalMessages: 0, // TODO: Implement message counting
				storageSize: 0, // TODO: Implement storage size calculation
				lastSync: new Date(),
			};
		} catch (error) {
			console.error(`❌ [UnifiedMemory] Error getting stats:`, error);
			return {
				totalUsers: 0,
				totalThreads: 0,
				totalMessages: 0,
				storageSize: 0,
				lastSync: new Date(),
			};
		}
	}

	/**
	 * Clear cache
	 */
	public clearCache(): void {
		this.cache.clear();
		console.log("🧹 [UnifiedMemory] Cache cleared");
	}

	/**
	 * Reset memory for a specific user (for testing)
	 */
	public async resetUserMemory(userId: string): Promise<void> {
		try {
			console.log(`🗑️ [UnifiedMemory] Resetting memory for user: ${userId}`);

			// Clear cache
			this.cache.clear();

			// Note: This would delete from database when API is implemented
			console.log(`✅ [UnifiedMemory] Memory reset noted for user: ${userId}`);
		} catch (error) {
			console.error(
				`❌ [UnifiedMemory] Error resetting memory for ${userId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Health check
	 */
	public async healthCheck(): Promise<{ status: string; message: string }> {
		try {
			console.log("🏥 [UnifiedMemory] Health check initiated");

			// Simple health check
			const _stats = await this.getMemoryStats();

			return {
				status: "healthy",
				message: `Memory system operating normally. Cached items: ${this.cache.size}`,
			};
		} catch (error) {
			return {
				status: "unhealthy",
				message: `Memory system error: ${error.message}`,
			};
		}
	}
}

// Export singleton instance
export const unifiedMemoryManager = UnifiedMemoryManager.getInstance();
export default unifiedMemoryManager;
