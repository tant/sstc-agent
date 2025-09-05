import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { getLibSQLConfig } from "../../database/libsql";
import { embedder } from "../../embedding/provider";
import { chromaVector } from "../../vector/chroma";

// Interface cho shared context với versioning
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
	// Versioning để conflict resolution
	version: number;
	lastModifiedBy?: string;
}

// Interface cho context bundle
export interface ContextBundle {
	conversationId: string;
	context: SharedContext;
}

// Conflict resolution strategies
export type ConflictResolutionStrategy =
	| "latest-wins"
	| "merge"
	| "manual-review";

export class SharedContextManager {
	private memory: Memory;
	private cache: Map<string, SharedContext> = new Map();
	private cacheTimeout: number = 5000; // 5 seconds cache
	private conflictResolutionStrategy: ConflictResolutionStrategy =
		"latest-wins";

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

		console.log(
			"🔄 [Enhanced SharedContextManager] Initialized enhanced shared context manager",
		);
	}

	// Tạo context bundle mới với versioning
	async createContextBundle(
		conversationId: string,
		userId: string,
		initialData: Partial<SharedContext> = {},
	): Promise<ContextBundle> {
		console.log(
			"🔄 [Enhanced SharedContextManager] Creating context bundle with versioning",
			{ conversationId, userId },
		);

		const context: SharedContext = {
			conversationId,
			userId,
			chatHistory: [],
			userProfile: {},
			timestamps: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			version: 1,
			...initialData,
		};

		// Lưu vào memory
		await this.saveContext(conversationId, context);

		return {
			conversationId,
			context,
		};
	}

	// Lấy context từ memory với conflict resolution
	async getContext(
		conversationId: string,
		options: {
			conflictResolution?: ConflictResolutionStrategy;
			forceRefresh?: boolean;
		} = {},
	): Promise<SharedContext | null> {
		const {
			conflictResolution = this.conflictResolutionStrategy,
			forceRefresh = false,
		} = options;

		// Kiểm tra cache trước nếu không force refresh
		if (!forceRefresh && this.cache.has(conversationId)) {
			const cached = this.cache.get(conversationId)!;
			if (Date.now() - cached.timestamps.updatedAt < this.cacheTimeout) {
				console.log(
					"✅ [Enhanced SharedContextManager] Returning cached context",
					{ conversationId },
				);
				return cached;
			}
		}

		try {
			console.log(
				"🔍 [Enhanced SharedContextManager] Retrieving context from memory",
				{
					conversationId,
					conflictResolution,
					forceRefresh,
				},
			);

			// Lấy từ memory
			const memoryResult = await this.memory.get(conversationId);

			if (memoryResult?.data) {
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
					version: memoryResult.data.version || 1,
					lastModifiedBy: memoryResult.data.lastModifiedBy,
				};

				// Cập nhật cache
				this.cache.set(conversationId, context);

				console.log(
					"✅ [Enhanced SharedContextManager] Context retrieved successfully",
					{
						conversationId,
						version: context.version,
						lastModifiedBy: context.lastModifiedBy,
						hasChatHistory: context.chatHistory.length > 0,
						hasUserProfile: Object.keys(context.userProfile).length > 0,
					},
				);

				return context;
			}

			console.log(
				"⚠️ [Enhanced SharedContextManager] No context found in memory",
				{ conversationId },
			);
			return null;
		} catch (error) {
			console.error(
				"❌ [Enhanced SharedContextManager] Failed to retrieve context:",
				error,
			);
			return null;
		}
	}

	// Lưu context vào memory với versioning và conflict resolution
	async saveContext(
		conversationId: string,
		context: SharedContext,
		options: {
			modifier?: string;
			conflictResolution?: ConflictResolutionStrategy;
		} = {},
	): Promise<void> {
		const {
			modifier = "system",
			conflictResolution = this.conflictResolutionStrategy,
		} = options;

		try {
			console.log(
				"💾 [Enhanced SharedContextManager] Saving context to memory with versioning",
				{
					conversationId,
					version: context.version,
					modifier,
					conflictResolution,
					chatHistoryLength: context.chatHistory.length,
					hasUserProfile: Object.keys(context.userProfile).length > 0,
				},
			);

			// Kiểm tra conflict với version hiện tại trong database
			if (conflictResolution !== "latest-wins") {
				const existingContext = await this.getContext(conversationId, {
					forceRefresh: true,
				});
				if (existingContext && existingContext.version > context.version) {
					console.warn(
						"⚠️ [Enhanced SharedContextManager] Version conflict detected",
						{
							conversationId,
							localVersion: context.version,
							remoteVersion: existingContext.version,
							conflictResolution,
						},
					);

					// Xử lý conflict theo chiến lược
					const resolvedContext = await this.resolveConflict(
						conversationId,
						existingContext,
						context,
						conflictResolution,
					);

					if (resolvedContext) {
						context = resolvedContext;
					}
				}
			}

			// Cập nhật version và metadata
			context.version = (context.version || 0) + 1;
			context.timestamps.updatedAt = Date.now();
			context.lastModifiedBy = modifier;

			// Lưu vào memory
			await this.memory.save({
				id: conversationId,
				data: context,
				metadata: {
					userId: context.userId,
					createdAt: context.timestamps.createdAt,
					updatedAt: context.timestamps.updatedAt,
					version: context.version,
					lastModifiedBy: context.lastModifiedBy,
				},
			});

			// Cập nhật cache
			this.cache.set(conversationId, context);

			console.log(
				"✅ [Enhanced SharedContextManager] Context saved successfully",
				{
					conversationId,
					version: context.version,
					modifier,
				},
			);
		} catch (error) {
			console.error(
				"❌ [Enhanced SharedContextManager] Failed to save context:",
				error,
			);
			throw error;
		}
	}

	// Resolve conflicts between local and remote contexts
	private async resolveConflict(
		conversationId: string,
		remoteContext: SharedContext,
		localContext: SharedContext,
		strategy: ConflictResolutionStrategy,
	): Promise<SharedContext | null> {
		console.log("🔄 [Enhanced SharedContextManager] Resolving conflict", {
			conversationId,
			strategy,
			remoteVersion: remoteContext.version,
			localVersion: localContext.version,
		});

		switch (strategy) {
			case "latest-wins":
				// Remote wins - sử dụng context mới nhất từ database
				console.log(
					"✅ [Enhanced SharedContextManager] Latest-wins conflict resolution - using remote context",
				);
				return remoteContext;

			case "merge":
				// Merge contexts - kết hợp cả hai
				console.log(
					"🔄 [Enhanced SharedContextManager] Merge conflict resolution",
				);
				return await this.mergeContexts(remoteContext, localContext);

			case "manual-review":
				// Manual review - cần can thiệp thủ công
				console.log(
					"⚠️ [Enhanced SharedContextManager] Manual review conflict resolution - requires human intervention",
				);
				// Trong thực tế, có thể tạo một task để review thủ công
				return null;

			default:
				console.warn(
					"⚠️ [Enhanced SharedContextManager] Unknown conflict resolution strategy, using latest-wins",
				);
				return remoteContext;
		}
	}

	// Merge two contexts together
	private async mergeContexts(
		remoteContext: SharedContext,
		localContext: SharedContext,
	): Promise<SharedContext> {
		console.log("🔄 [Enhanced SharedContextManager] Merging contexts", {
			remoteVersion: remoteContext.version,
			localVersion: localContext.version,
		});

		// Merge chat histories - giữ các message mới nhất
		const mergedChatHistory = this.mergeChatHistories(
			remoteContext.chatHistory || [],
			localContext.chatHistory || [],
		);

		// Merge user profiles - giữ các giá trị mới nhất
		const mergedUserProfile = {
			...remoteContext.userProfile,
			...localContext.userProfile,
		};

		// Merge specialist data - ưu tiên dữ liệu mới hơn
		const mergedSpecialistData =
			localContext.specialistData || remoteContext.specialistData;

		// Merge processing status - giữ trạng thái mới nhất
		const mergedProcessingStatus = {
			...remoteContext.processingStatus,
			...localContext.processingStatus,
		};

		// Tạo merged context với version cao hơn
		const mergedContext: SharedContext = {
			conversationId: localContext.conversationId,
			userId: localContext.userId,
			chatHistory: mergedChatHistory,
			userProfile: mergedUserProfile,
			specialistData: mergedSpecialistData,
			processingStatus: mergedProcessingStatus,
			timestamps: {
				createdAt: Math.min(
					remoteContext.timestamps.createdAt,
					localContext.timestamps.createdAt,
				),
				updatedAt: Math.max(
					remoteContext.timestamps.updatedAt,
					localContext.timestamps.updatedAt,
				),
			},
			version: Math.max(remoteContext.version, localContext.version) + 1,
			lastModifiedBy: "merge-operation",
		};

		console.log(
			"✅ [Enhanced SharedContextManager] Contexts merged successfully",
			{
				mergedVersion: mergedContext.version,
				chatHistoryLength: mergedChatHistory.length,
				userProfileKeys: Object.keys(mergedUserProfile).length,
			},
		);

		return mergedContext;
	}

	// Merge chat histories from two sources
	private mergeChatHistories(remoteHistory: any[], localHistory: any[]): any[] {
		// Kết hợp cả hai lịch sử và loại bỏ duplicates dựa trên timestamp
		const combinedHistory = [...remoteHistory, ...localHistory];

		// Tạo map để theo dõi message độc nhất dựa trên timestamp và nội dung
		const messageMap = new Map<string, any>();

		for (const message of combinedHistory) {
			const key = `${message.timestamp || Date.now()}-${message.content?.substring(0, 50)}`;
			if (!messageMap.has(key)) {
				messageMap.set(key, message);
			}
		}

		// Chuyển map thành array và sắp xếp theo timestamp
		const mergedHistory = Array.from(messageMap.values());
		mergedHistory.sort((a, b) => {
			const timeA = new Date(a.timestamp || 0).getTime();
			const timeB = new Date(b.timestamp || 0).getTime();
			return timeA - timeB;
		});

		console.log("📊 [Enhanced SharedContextManager] Chat histories merged", {
			remoteLength: remoteHistory.length,
			localLength: localHistory.length,
			mergedLength: mergedHistory.length,
		});

		return mergedHistory;
	}

	// Cập nhật context với chat message mới
	async updateContextWithMessage(
		conversationId: string,
		message: any,
		role: string,
		options: {
			modifier?: string;
			conflictResolution?: ConflictResolutionStrategy;
		} = {},
	): Promise<void> {
		console.log(
			"💬 [Enhanced SharedContextManager] Updating context with new message",
			{
				conversationId,
				role,
				messageLength: message.content?.length || 0,
				modifier: options.modifier,
			},
		);

		try {
			// Lấy context hiện tại
			let context = await this.getContext(conversationId);

			if (!context) {
				console.warn(
					"⚠️ [Enhanced SharedContextManager] No existing context found, creating new one",
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

			// Lưu context cập nhật với conflict resolution
			await this.saveContext(conversationId, context, options);
		} catch (error) {
			console.error(
				"❌ [Enhanced SharedContextManager] Failed to update context with message:",
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
		options: {
			modifier?: string;
			conflictResolution?: ConflictResolutionStrategy;
		} = {},
	): Promise<void> {
		console.log(
			"📊 [Enhanced SharedContextManager] Updating context with specialist data",
			{
				conversationId,
				specialistType,
				hasData: !!specialistData,
				modifier: options.modifier,
			},
		);

		try {
			// Lấy context hiện tại
			const context = await this.getContext(conversationId);

			if (!context) {
				console.warn(
					"⚠️ [Enhanced SharedContextManager] No existing context found",
				);
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

			// Lưu context cập nhật với conflict resolution
			await this.saveContext(conversationId, context, options);
		} catch (error) {
			console.error(
				"❌ [Enhanced SharedContextManager] Failed to update context with specialist data:",
				error,
			);
			throw error;
		}
	}

	// Cập nhật processing status
	async updateProcessingStatus(
		conversationId: string,
		status: SharedContext["processingStatus"],
		options: {
			modifier?: string;
			conflictResolution?: ConflictResolutionStrategy;
		} = {},
	): Promise<void> {
		console.log(
			"🔄 [Enhanced SharedContextManager] Updating processing status",
			{
				conversationId,
				status: status.status,
				specialistType: status.specialistType,
				modifier: options.modifier,
			},
		);

		try {
			// Lấy context hiện tại
			const context = await this.getContext(conversationId);

			if (!context) {
				console.warn(
					"⚠️ [Enhanced SharedContextManager] No existing context found",
				);
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

			// Lưu context cập nhật với conflict resolution
			await this.saveContext(conversationId, context, options);
		} catch (error) {
			console.error(
				"❌ [Enhanced SharedContextManager] Failed to update processing status:",
				error,
			);
			throw error;
		}
	}

	// Cập nhật user profile
	async updateUserProfile(
		conversationId: string,
		userProfile: any,
		options: {
			modifier?: string;
			conflictResolution?: ConflictResolutionStrategy;
		} = {},
	): Promise<void> {
		console.log("👤 [Enhanced SharedContextManager] Updating user profile", {
			conversationId,
			profileKeys: Object.keys(userProfile),
			modifier: options.modifier,
		});

		try {
			// Lấy context hiện tại
			const context = await this.getContext(conversationId);

			if (!context) {
				console.warn(
					"⚠️ [Enhanced SharedContextManager] No existing context found",
				);
				return;
			}

			// Merge user profile
			context.userProfile = {
				...context.userProfile,
				...userProfile,
			};

			// Lưu context cập nhật với conflict resolution
			await this.saveContext(conversationId, context, options);
		} catch (error) {
			console.error(
				"❌ [Enhanced SharedContextManager] Failed to update user profile:",
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
				"❌ [Enhanced SharedContextManager] Failed to get chat history:",
				error,
			);
			return [];
		}
	}

	// Xóa cache cho một conversation
	clearCache(conversationId: string): void {
		console.log(
			"🧹 [Enhanced SharedContextManager] Clearing cache for conversation",
			{ conversationId },
		);
		this.cache.delete(conversationId);
	}

	// Xóa toàn bộ cache
	clearAllCache(): void {
		console.log("🧹 [Enhanced SharedContextManager] Clearing all cache");
		this.cache.clear();
	}

	// Set conflict resolution strategy
	setConflictResolutionStrategy(strategy: ConflictResolutionStrategy): void {
		console.log(
			"🔧 [Enhanced SharedContextManager] Setting conflict resolution strategy",
			{ strategy },
		);
		this.conflictResolutionStrategy = strategy;
	}

	// Get conflict resolution strategy
	getConflictResolutionStrategy(): ConflictResolutionStrategy {
		return this.conflictResolutionStrategy;
	}
}

// Export singleton instance
export const sharedContextManager = new SharedContextManager();
