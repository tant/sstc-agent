import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { getLibSQLConfig } from "../../database/libsql";
import { embedder } from "../../embedding/provider";
import { chromaVector } from "../../vector/chroma";

export interface UserContext {
	userId: string;
	conversationId: string;
	chatHistory: Array<{
		role: "user" | "assistant";
		content: string;
		timestamp: string;
		metadata?: Record<string, any>;
	}>;
	userProfile: Record<string, any>;
	specialistData?: Record<string, any>;
	processingStatus?: {
		type: string;
		status: "idle" | "processing" | "completed" | "failed";
		timestamp: number;
	};
	lastUpdated: number;
}

/**
 * Optimized Memory Manager - Simplified, efficient memory management for multi-agent system
 */
export class OptimizedMemoryManager {
	private static instance: OptimizedMemoryManager;
	private memory: Memory;
	private cache = new Map<string, UserContext>();
	private readonly CACHE_TTL = 60000; // 1 minute
	private readonly MAX_HISTORY = 30; // Reduced from 50

	private constructor() {
		const db = getLibSQLConfig();
		this.memory = new Memory({
			storage: new LibSQLStore({
				url: db.url,
				authToken: db.authToken,
			}),
			vector: chromaVector,
			embedder: embedder,
			options: {
				lastMessages: 15, // Reduced from 20
				workingMemory: {
					enabled: true,
					scope: "resource",
				},
				semanticRecall: {
					topK: 3, // Reduced from 5
					messageRange: 2, // Reduced from 3
					scope: "resource",
				},
			},
		});
	}

	static getInstance(): OptimizedMemoryManager {
		if (!OptimizedMemoryManager.instance) {
			OptimizedMemoryManager.instance = new OptimizedMemoryManager();
		}
		return OptimizedMemoryManager.instance;
	}

	getMemoryInstance(): Memory {
		return this.memory;
	}

	/**
	 * Get user context with automatic caching
	 */
	async getUserContext(userId: string, conversationId: string): Promise<UserContext> {
		const cacheKey = `${userId}_${conversationId}`;
		const cached = this.cache.get(cacheKey);

		// Return cached if still valid
		if (cached && Date.now() - cached.lastUpdated < this.CACHE_TTL) {
			return cached;
		}

		try {
			const result = await this.memory.get(conversationId);
			
			if (result?.data) {
				const context: UserContext = {
					userId,
					conversationId,
					chatHistory: result.data.chatHistory || [],
					userProfile: result.data.userProfile || {},
					specialistData: result.data.specialistData,
					processingStatus: result.data.processingStatus,
					lastUpdated: Date.now(),
				};
				
				this.cache.set(cacheKey, context);
				return context;
			}
		} catch (error) {
			console.warn(`Memory retrieval failed for ${conversationId}:`, error);
		}

		// Return new context if none found
		return this.createNewContext(userId, conversationId);
	}

	/**
	 * Save user context to memory and cache
	 */
	async saveUserContext(context: UserContext): Promise<void> {
		try {
			// Trim chat history to prevent bloat
			if (context.chatHistory.length > this.MAX_HISTORY) {
				context.chatHistory = context.chatHistory.slice(-this.MAX_HISTORY);
			}

			context.lastUpdated = Date.now();

			await this.memory.save({
				id: context.conversationId,
				data: context,
				metadata: {
					userId: context.userId,
					lastUpdated: context.lastUpdated,
				},
			});

			// Update cache
			const cacheKey = `${context.userId}_${context.conversationId}`;
			this.cache.set(cacheKey, context);
		} catch (error) {
			console.error(`Failed to save context for ${context.conversationId}:`, error);
			throw error;
		}
	}

	/**
	 * Add message to conversation
	 */
	async addMessage(
		userId: string,
		conversationId: string,
		role: "user" | "assistant",
		content: string,
		metadata?: Record<string, any>
	): Promise<void> {
		const context = await this.getUserContext(userId, conversationId);
		
		context.chatHistory.push({
			role,
			content,
			timestamp: new Date().toISOString(),
			metadata,
		});

		await this.saveUserContext(context);
	}

	/**
	 * Update user profile
	 */
	async updateUserProfile(
		userId: string,
		conversationId: string,
		profileData: Record<string, any>
	): Promise<void> {
		const context = await this.getUserContext(userId, conversationId);
		context.userProfile = { ...context.userProfile, ...profileData };
		await this.saveUserContext(context);
	}

	/**
	 * Update specialist data
	 */
	async updateSpecialistData(
		userId: string,
		conversationId: string,
		specialistType: string,
		data: any
	): Promise<void> {
		const context = await this.getUserContext(userId, conversationId);
		context.specialistData = { ...context.specialistData, [specialistType]: data };
		await this.saveUserContext(context);
	}

	/**
	 * Update processing status
	 */
	async updateProcessingStatus(
		userId: string,
		conversationId: string,
		type: string,
		status: "idle" | "processing" | "completed" | "failed"
	): Promise<void> {
		const context = await this.getUserContext(userId, conversationId);
		context.processingStatus = { type, status, timestamp: Date.now() };
		await this.saveUserContext(context);
	}

	/**
	 * Get chat history
	 */
	async getChatHistory(userId: string, conversationId: string, limit = 10): Promise<UserContext['chatHistory']> {
		const context = await this.getUserContext(userId, conversationId);
		return context.chatHistory.slice(-limit);
	}

	/**
	 * Check if user has been greeted
	 */
	async hasBeenGreeted(userId: string, conversationId: string): Promise<boolean> {
		const history = await this.getChatHistory(userId, conversationId, 5);
		return history.some(msg => 
			msg.role === "assistant" && 
			(msg.content.includes("Xin chào") || msg.content.includes("Chào bạn"))
		);
	}

	/**
	 * Mark user as greeted
	 */
	async markUserAsGreeted(userId: string, agentType: string, channel: string): Promise<void> {
		const conversationId = `${channel}_user_${userId}`;
		await this.updateUserProfile(userId, conversationId, {
			greeted: true,
			firstGreetedAt: new Date().toISOString(),
			firstGreetingAgent: agentType,
			greetingChannel: channel,
		});
	}

	/**
	 * Clear cache for specific conversation
	 */
	clearCache(userId?: string, conversationId?: string): void {
		if (userId && conversationId) {
			this.cache.delete(`${userId}_${conversationId}`);
		} else {
			this.cache.clear();
		}
	}

	/**
	 * Get system stats
	 */
	getStats() {
		return {
			cacheSize: this.cache.size,
			cacheTtl: this.CACHE_TTL,
			maxHistory: this.MAX_HISTORY,
		};
	}

	private createNewContext(userId: string, conversationId: string): UserContext {
		return {
			userId,
			conversationId,
			chatHistory: [],
			userProfile: {},
			lastUpdated: Date.now(),
		};
	}
}

// Export singleton
export const optimizedMemoryManager = OptimizedMemoryManager.getInstance();