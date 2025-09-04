import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { getLibSQLConfig } from "../../database/libsql";
import { chromaVector } from "../../vector/chroma";
import { embedder } from "../../embedding/provider";

// Interface cho shared context
export interface SharedContext {
	conversationId: string;
	userId: string;
	chatHistory: any[];
	userProfile: any;
	specialistData?: any;
	processingStatus?: {
		specialistType?: string;
		status: "idle" | "processing" | "completed" | "failed" | "timeout";
		startTime?: number;
		endTime?: number;
		error?: string;
	};
	timestamps: {
		createdAt: number;
		updatedAt: number;
	};
}

// Interface cho context bundle
export interface ContextBundle {
	conversationId: string;
	context: SharedContext;
}

export class SharedContextManager {
	private memory: Memory;
	private cache: Map<string, SharedContext> = new Map();
	private cacheTimeout: number = 5000; // 5 seconds cache

	constructor() {
		const db = getLibSQLConfig();
		this.memory = new Memory({
			storage: new LibSQLStore({
				url: db.url,
				authToken: db.authToken,
			}),
			vector: chromaVector,
			embedder: embedder,
			options: {
				lastMessages: 20, // Tăng số lượng message để có context đầy đủ hơn
				workingMemory: {
					enabled: true,
					scope: "resource",
				},
				semanticRecall: {
					topK: 5,
					messageRange: 3,
					scope: "resource",
				},
			},
		});

		console.log("🔄 [SharedContextManager] Initialized shared context manager");
	}

	// Tạo context bundle mới
	async createContextBundle(
		conversationId: string,
		userId: string,
		initialData: Partial<SharedContext> = {},
	): Promise<ContextBundle> {
		console.log("🔄 [SharedContextManager] Creating context bundle", {
			conversationId,
			userId,
		});

		const context: SharedContext = {
			conversationId,
			userId,
			chatHistory: [],
			userProfile: {},
			timestamps: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			...initialData,
		};

		// Lưu vào memory
		await this.saveContext(conversationId, context);

		return {
			conversationId,
			context,
		};
	}

	// Lấy context từ memory
	async getContext(conversationId: string): Promise<SharedContext | null> {
		// Kiểm tra cache trước
		if (this.cache.has(conversationId)) {
			const cached = this.cache.get(conversationId)!;
			if (Date.now() - cached.timestamps.updatedAt < this.cacheTimeout) {
				console.log("✅ [SharedContextManager] Returning cached context", {
					conversationId,
				});
				return cached;
			}
		}

		try {
			console.log("🔍 [SharedContextManager] Retrieving context from memory", {
				conversationId,
			});

			// Lấy từ memory
			const memoryResult = await this.memory.get(conversationId);

			if (memoryResult && memoryResult.data) {
				const context: SharedContext = {
					conversationId,
					userId: memoryResult.data.userId || "",
					chatHistory: memoryResult.data.chatHistory || [],
					userProfile: memoryResult.data.userProfile || {},
					specialistData: memoryResult.data.specialistData,
					processingStatus: memoryResult.data.processingStatus,
					timestamps: {
						createdAt: memoryResult.data.createdAt || Date.now(),
						updatedAt: memoryResult.data.updatedAt || Date.now(),
					},
				};

				// Cập nhật cache
				this.cache.set(conversationId, context);

				console.log(
					"✅ [SharedContextManager] Context retrieved successfully",
					{
						conversationId,
						hasChatHistory: context.chatHistory.length > 0,
						hasUserProfile: Object.keys(context.userProfile).length > 0,
					},
				);

				return context;
			}

			console.log("⚠️ [SharedContextManager] No context found in memory", {
				conversationId,
			});
			return null;
		} catch (error) {
			console.error(
				"❌ [SharedContextManager] Failed to retrieve context:",
				error,
			);
			return null;
		}
	}

	// Lưu context vào memory
	async saveContext(
		conversationId: string,
		context: SharedContext,
	): Promise<void> {
		try {
			console.log("💾 [SharedContextManager] Saving context to memory", {
				conversationId,
				chatHistoryLength: context.chatHistory.length,
				hasUserProfile: Object.keys(context.userProfile).length > 0,
			});

			// Cập nhật timestamp
			context.timestamps.updatedAt = Date.now();

			// Lưu vào memory
			await this.memory.save({
				id: conversationId,
				data: context,
				metadata: {
					userId: context.userId,
					createdAt: context.timestamps.createdAt,
					updatedAt: context.timestamps.updatedAt,
				},
			});

			// Cập nhật cache
			this.cache.set(conversationId, context);

			console.log("✅ [SharedContextManager] Context saved successfully", {
				conversationId,
			});
		} catch (error) {
			console.error("❌ [SharedContextManager] Failed to save context:", error);
			throw error;
		}
	}

	// Cập nhật context với chat message mới
	async updateContextWithMessage(
		conversationId: string,
		message: any,
		role: string,
	): Promise<void> {
		console.log("💬 [SharedContextManager] Updating context with new message", {
			conversationId,
			role,
			messageLength: message.content?.length || 0,
		});

		try {
			// Lấy context hiện tại
			let context = await this.getContext(conversationId);

			if (!context) {
				console.warn(
					"⚠️ [SharedContextManager] No existing context found, creating new one",
				);
				const bundle = await this.createContextBundle(
					conversationId,
					message.senderId || "unknown",
				);
				context = bundle.context;
			}

			// Thêm message vào chat history
			const newMessage = {
				role,
				content: message.content,
				timestamp: message.timestamp || new Date().toISOString(),
				senderId: message.senderId,
			};

			context.chatHistory.push(newMessage);

			// Giới hạn chat history để tránh quá tải
			if (context.chatHistory.length > 50) {
				context.chatHistory = context.chatHistory.slice(-30);
			}

			// Lưu context cập nhật
			await this.saveContext(conversationId, context);
		} catch (error) {
			console.error(
				"❌ [SharedContextManager] Failed to update context with message:",
				error,
			);
			throw error;
		}
	}

	// Cập nhật context với specialist data
	async updateContextWithSpecialistData(
		conversationId: string,
		specialistData: any,
		specialistType: string,
	): Promise<void> {
		console.log(
			"📊 [SharedContextManager] Updating context with specialist data",
			{
				conversationId,
				specialistType,
				hasData: !!specialistData,
			},
		);

		try {
			// Lấy context hiện tại
			let context = await this.getContext(conversationId);

			if (!context) {
				console.warn("⚠️ [SharedContextManager] No existing context found");
				return;
			}

			// Cập nhật specialist data
			context.specialistData = specialistData;

			// Cập nhật processing status
			context.processingStatus = {
				specialistType,
				status: "completed",
				endTime: Date.now(),
			};

			// Lưu context cập nhật
			await this.saveContext(conversationId, context);
		} catch (error) {
			console.error(
				"❌ [SharedContextManager] Failed to update context with specialist data:",
				error,
			);
			throw error;
		}
	}

	// Cập nhật processing status
	async updateProcessingStatus(
		conversationId: string,
		status: SharedContext["processingStatus"],
	): Promise<void> {
		console.log("🔄 [SharedContextManager] Updating processing status", {
			conversationId,
			status: status.status,
			specialistType: status.specialistType,
		});

		try {
			// Lấy context hiện tại
			let context = await this.getContext(conversationId);

			if (!context) {
				console.warn("⚠️ [SharedContextManager] No existing context found");
				return;
			}

			// Cập nhật processing status
			context.processingStatus = {
				...context.processingStatus,
				...status,
			};

			// Nếu bắt đầu processing, set startTime
			if (
				status.status === "processing" &&
				!context.processingStatus.startTime
			) {
				context.processingStatus.startTime = Date.now();
			}

			// Nếu kết thúc processing, set endTime
			if (status.status !== "processing" && !context.processingStatus.endTime) {
				context.processingStatus.endTime = Date.now();
			}

			// Lưu context cập nhật
			await this.saveContext(conversationId, context);
		} catch (error) {
			console.error(
				"❌ [SharedContextManager] Failed to update processing status:",
				error,
			);
			throw error;
		}
	}

	// Cập nhật user profile
	async updateUserProfile(
		conversationId: string,
		userProfile: any,
	): Promise<void> {
		console.log("👤 [SharedContextManager] Updating user profile", {
			conversationId,
			profileKeys: Object.keys(userProfile),
		});

		try {
			// Lấy context hiện tại
			let context = await this.getContext(conversationId);

			if (!context) {
				console.warn("⚠️ [SharedContextManager] No existing context found");
				return;
			}

			// Merge user profile
			context.userProfile = {
				...context.userProfile,
				...userProfile,
			};

			// Lưu context cập nhật
			await this.saveContext(conversationId, context);
		} catch (error) {
			console.error(
				"❌ [SharedContextManager] Failed to update user profile:",
				error,
			);
			throw error;
		}
	}

	// Lấy chat history
	async getChatHistory(
		conversationId: string,
		limit: number = 10,
	): Promise<any[]> {
		try {
			const context = await this.getContext(conversationId);
			if (!context) return [];

			// Trả về chat history giới hạn
			return context.chatHistory.slice(-limit);
		} catch (error) {
			console.error(
				"❌ [SharedContextManager] Failed to get chat history:",
				error,
			);
			return [];
		}
	}

	// Xóa cache cho một conversation
	clearCache(conversationId: string): void {
		console.log("🧹 [SharedContextManager] Clearing cache for conversation", {
			conversationId,
		});
		this.cache.delete(conversationId);
	}

	// Xóa toàn bộ cache
	clearAllCache(): void {
		console.log("🧹 [SharedContextManager] Clearing all cache");
		this.cache.clear();
	}
}

// Export singleton instance
export const sharedContextManager = new SharedContextManager();
