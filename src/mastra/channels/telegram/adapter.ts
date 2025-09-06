/**
 * Telegram Channel Adapter with Singleton Management
 * Single consolidated adapter với đầy đủ functionality
 */

import type TelegramBot from "node-telegram-bot-api";
import type { ChannelAdapter } from "../../core/channels/interface";
import { messageProcessor } from "../../core/optimized-processing";
import { TelegramSingletonManager } from "./singleton-manager";
import { type TelegramConfig, validateTelegramConfig } from "./config";

interface ConnectionHealth {
	isConnected: boolean;
	lastHealthCheck: number;
	consecutiveFailures: number;
	lastError?: string;
}

export class TelegramChannelAdapter implements ChannelAdapter {
	private static globalInstance: TelegramChannelAdapter | null = null;
	private singletonManager: TelegramSingletonManager;
	private bot: TelegramBot | null = null;
	private config: TelegramConfig;
	private _isShutdown: boolean = false;
	private healthCheck: NodeJS.Timeout | null = null;
	private connectionHealth: ConnectionHealth;
	
	// Connection settings
	private readonly MAX_CONSECUTIVE_FAILURES = 5;
	private readonly HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute

	channelId = "telegram";

	/**
	 * Factory method - đảm bảo singleton tuyệt đối
	 */
	static async create(config: Partial<TelegramConfig>): Promise<TelegramChannelAdapter | null> {
		console.log("🔍 [Telegram] Checking for existing instances across system...");
		
		// Validate config first
		const validatedConfig = validateTelegramConfig(config);
		
		// Kiểm tra system-wide lock trước khi làm gì khác
		const singletonManager = TelegramSingletonManager.getInstance();
		const canAcquireLock = await singletonManager.canAcquireLock(validatedConfig);
		
		if (!canAcquireLock.canAcquire) {
			console.error("❌ [Telegram] Cannot create instance - another instance exists:", {
				reason: canAcquireLock.reason,
				existingProcess: canAcquireLock.existingLock?.pid,
				lockAge: canAcquireLock.lockAge,
			});
			return null;
		}

		// Return existing healthy instance nếu có
		if (TelegramChannelAdapter.globalInstance) {
			const instance = TelegramChannelAdapter.globalInstance;
			if (!instance._isShutdown && instance.isHealthy()) {
				console.log("♻️ [Telegram] Returning existing healthy instance (same process)");
				return instance;
			} else {
				console.log("🔄 [Telegram] Existing instance unhealthy, shutting down...");
				await instance.forceShutdown();
				TelegramChannelAdapter.globalInstance = null;
			}
		}

		// Create new instance với strict singleton enforcement
		try {
			const instance = new TelegramChannelAdapter(validatedConfig);
			const success = await instance.initializeWithLock();
			
			if (success) {
				TelegramChannelAdapter.globalInstance = instance;
				console.log("✅ [Telegram] Singleton instance created successfully");
				return instance;
			} else {
				await instance.forceShutdown();
				return null;
			}
		} catch (error) {
			console.error("❌ [Telegram] Singleton creation failed:", error);
			return null;
		}
	}

	/**
	 * Private constructor - use factory method
	 */
	private constructor(config: TelegramConfig) {
		console.log("🔧 [Telegram] Initializing adapter");

		this.config = config;
		this.singletonManager = TelegramSingletonManager.getInstance();
		
		this.connectionHealth = {
			isConnected: false,
			lastHealthCheck: 0,
			consecutiveFailures: 0,
		};
	}

	/**
	 * Initialize with singleton lock
	 */
	private async initializeWithLock(): Promise<boolean> {
		console.log("🔐 [Telegram] Acquiring singleton lock");

		try {
			// Acquire system-wide lock
			const lockAcquired = await this.singletonManager.acquireLock(this.config);
			if (!lockAcquired) {
				console.error("❌ [Telegram] Failed to acquire singleton lock");
				return false;
			}

			// Create bot instance through singleton manager
			this.bot = await this.singletonManager.createBot(this.config);
			if (!this.bot) {
				console.error("❌ [Telegram] Failed to create bot instance");
				await this.singletonManager.releaseLock();
				return false;
			}

			// Setup message handlers
			this.setupMessageHandlers();

			// Start health monitoring
			this.startHealthMonitoring();

			// Update connection health
			this.connectionHealth.isConnected = true;
			this.connectionHealth.lastHealthCheck = Date.now();
			this.connectionHealth.consecutiveFailures = 0;

			console.log("✅ [Telegram] Initialization completed successfully");
			return true;
		} catch (error) {
			console.error("❌ [Telegram] Initialization failed:", error);
			this.connectionHealth.isConnected = false;
			this.connectionHealth.lastError = error instanceof Error ? error.message : String(error);
			return false;
		}
	}

	/**
	 * Setup Telegram message handlers
	 */
	private setupMessageHandlers(): void {
		if (!this.bot) {
			console.error("❌ [Telegram] No bot instance available for handlers");
			return;
		}

		console.log("⚙️ [Telegram] Setting up message handlers");

		// Main message handler
		this.bot.on("message", this.handleTelegramMessage.bind(this));
		
		// Callback queries (button presses)
		this.bot.on("callback_query", this.handleCallbackQuery.bind(this));

		// Error handling
		this.bot.on("polling_error", (error: any) => {
			console.error("❌ [Telegram] Polling error:", error);
			this.handleConnectionError(error);
		});

		this.bot.on("webhook_error", (error: any) => {
			console.error("❌ [Telegram] Webhook error:", error);
			this.handleConnectionError(error);
		});

		console.log("✅ [Telegram] Message handlers configured");
	}

	/**
	 * Handle Telegram message
	 */
	private async handleTelegramMessage(telegramMessage: TelegramBot.Message): Promise<void> {
		console.log("📥 [Telegram] Processing message:", {
			messageId: telegramMessage.message_id,
			chatId: telegramMessage.chat.id,
			from: telegramMessage.from?.username || telegramMessage.from?.first_name,
		});

		// Ignore bot messages
		if (telegramMessage.from?.is_bot) {
			console.log("🤖 [Telegram] Ignoring bot message");
			return;
		}

		try {
			// Normalize message
			const normalizedMessage = this.normalizeMessage(telegramMessage);
			
			// Validate message
			if (!this.validateMessage(normalizedMessage)) {
				await this.sendErrorMessage(
					"Xin lỗi, tôi không thể xử lý tin nhắn của bạn. Vui lòng thử lại.",
					telegramMessage
				);
				return;
			}

			// Create standardized message
			const standardizedMessage = {
				id: normalizedMessage.messageId,
				content: normalizedMessage.content,
				contentType: normalizedMessage.contentType,
				sender: {
					id: normalizedMessage.senderId,
					username: telegramMessage.from?.username,
					displayName: telegramMessage.from?.first_name || 
					              telegramMessage.from?.username || 
					              "Unknown User",
				},
				timestamp: normalizedMessage.timestamp,
				channel: {
					channelId: "telegram",
					channelMessageId: normalizedMessage.messageId,
					metadata: {
						chatId: normalizedMessage.chatId,
						messageType: this.getMessageType(telegramMessage),
					},
				},
				attachments: normalizedMessage.attachments,
			};

			// Process through message processor
			const response = await messageProcessor.processMessage(standardizedMessage);

			// Send response
			await this.sendResponse(response, telegramMessage);
			
			// Update health on successful processing
			this.updateHealthStatus(true);
			
			console.log("✅ [Telegram] Message processed successfully");
		} catch (error) {
			console.error("❌ [Telegram] Message processing error:", error);
			this.updateHealthStatus(false);
			await this.sendErrorMessage(
				"Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
				telegramMessage
			);
		}
	}

	/**
	 * Normalize Telegram message
	 */
	private normalizeMessage(telegramMessage: TelegramBot.Message): {
		content: string;
		contentType: string;
		senderId: string;
		timestamp: Date;
		messageId: string;
		chatId: string;
		attachments?: any[];
	} {
		// Determine content type and content text
		let contentType = "text";
		let content = "";

		if (telegramMessage.text) {
			contentType = "text";
			content = telegramMessage.text;
		} else if (telegramMessage.photo) {
			contentType = "image";
			content = telegramMessage.caption || "[Image message]";
		} else if (telegramMessage.document) {
			contentType = "document";
			content = telegramMessage.caption || "[Document message]";
		} else if (telegramMessage.audio) {
			contentType = "audio";
			content = telegramMessage.caption || "[Audio message]";
		} else if (telegramMessage.video) {
			contentType = "video";
			content = telegramMessage.caption || "[Video message]";
		} else if (telegramMessage.voice) {
			contentType = "voice";
			content = "[Voice message]";
		} else if (telegramMessage.sticker) {
			contentType = "sticker";
			content = "[Sticker message]";
		} else {
			contentType = "unknown";
			content = "[Unsupported message type]";
		}
		
		return {
			content,
			contentType,
			senderId: telegramMessage.from?.id.toString() || "unknown",
			timestamp: new Date(telegramMessage.date * 1000),
			messageId: telegramMessage.message_id.toString(),
			chatId: telegramMessage.chat.id.toString(),
		};
	}

	/**
	 * Get message type
	 */
	private getMessageType(message: TelegramBot.Message): string {
		if (message.text) return "text";
		if (message.photo) return "photo";
		if (message.document) return "document";
		if (message.audio) return "audio";
		if (message.video) return "video";
		if (message.voice) return "voice";
		if (message.sticker) return "sticker";
		return "unknown";
	}

	/**
	 * Validate message
	 */
	private validateMessage(message: any): boolean {
		return message.content && 
		       message.content.trim().length > 0 && 
		       message.senderId !== "unknown" &&
		       message.content.length <= 4096;
	}

	/**
	 * Send response back to Telegram
	 */
	private async sendResponse(response: any, originalMessage: TelegramBot.Message): Promise<void> {
		if (!this.bot) {
			throw new Error("No bot instance available");
		}

		const chatId = originalMessage.chat.id.toString();
		const messageText = response.response || response.text || "Sorry, no response available.";

		try {
			// Try Markdown first, fallback to plain text
			try {
				await this.bot.sendMessage(chatId, messageText, {
					parse_mode: "Markdown",
					reply_to_message_id: originalMessage.message_id,
				});
			} catch (_markdownError) {
				await this.bot.sendMessage(chatId, messageText, {
					reply_to_message_id: originalMessage.message_id,
				});
			}

			console.log("📤 [Telegram] Response sent successfully");
		} catch (error) {
			console.error("❌ [Telegram] Failed to send response:", error);
			throw error;
		}
	}

	/**
	 * Send error message
	 */
	private async sendErrorMessage(message: string, originalMessage: TelegramBot.Message): Promise<void> {
		if (!this.bot) {
			return;
		}

		try {
			await this.bot.sendMessage(originalMessage.chat.id, message);
		} catch (error) {
			console.error("❌ [Telegram] Failed to send error message:", error);
		}
	}

	/**
	 * Handle callback queries
	 */
	private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
		try {
			// Acknowledge callback
			if (this.bot) {
				await this.bot.answerCallbackQuery(callbackQuery.id);
			}

			// Create synthetic message if needed
			if (callbackQuery.message) {
				const syntheticMessage: TelegramBot.Message = {
					...callbackQuery.message,
					text: callbackQuery.data || "Button pressed",
					from: callbackQuery.from,
				};

				await this.handleTelegramMessage(syntheticMessage);
			}
		} catch (error) {
			console.error("❌ [Telegram] Callback query error:", error);
		}
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		if (this.healthCheck) {
			clearInterval(this.healthCheck);
		}

		this.healthCheck = setInterval(async () => {
			await this.performHealthCheck();
		}, this.HEALTH_CHECK_INTERVAL);

		console.log("💓 [Telegram] Health monitoring started");
	}

	/**
	 * Perform health check
	 */
	private async performHealthCheck(): Promise<void> {
		try {
			if (!this.bot || this._isShutdown) {
				return;
			}

			// Test connection
			await this.bot.getMe();
			
			// Update health status
			this.updateHealthStatus(true);
			
			console.log("💓 [Telegram] Health check passed");
		} catch (error) {
			console.error("❌ [Telegram] Health check failed:", error);
			this.updateHealthStatus(false);
			
			// Trigger reconnection if too many failures
			if (this.connectionHealth.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
				console.error("🚨 [Telegram] Too many failures, attempting reconnection");
				await this.attemptReconnection();
			}
		}
	}

	/**
	 * Update health status
	 */
	private updateHealthStatus(success: boolean): void {
		this.connectionHealth.lastHealthCheck = Date.now();
		
		if (success) {
			this.connectionHealth.isConnected = true;
			this.connectionHealth.consecutiveFailures = 0;
			delete this.connectionHealth.lastError;
		} else {
			this.connectionHealth.isConnected = false;
			this.connectionHealth.consecutiveFailures++;
		}
	}

	/**
	 * Handle connection errors
	 */
	private handleConnectionError(error: any): void {
		console.error("🚨 [Telegram] Connection error:", error);
		
		this.connectionHealth.lastError = error instanceof Error ? error.message : String(error);
		this.updateHealthStatus(false);

		// Critical error - shutdown
		if (error?.code === "EFATAL" || error?.message?.includes("401")) {
			console.error("💥 [Telegram] Critical error - shutting down");
			this.shutdown().catch(console.error);
		}
	}

	/**
	 * Attempt reconnection
	 */
	private async attemptReconnection(): Promise<void> {
		console.log("🔄 [Telegram] Attempting reconnection");

		try {
			// Wait before reconnection
			await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

			// Shutdown current bot
			if (this.bot) {
				try {
					this.bot.stopPolling();
					await this.bot.deleteWebHook();
				} catch (error) {
					console.warn("⚠️ [Telegram] Error during bot cleanup:", error);
				}
			}

			// Create new bot through singleton manager
			this.bot = await this.singletonManager.createBot(this.config);
			
			if (this.bot) {
				this.setupMessageHandlers();
				this.updateHealthStatus(true);
				console.log("✅ [Telegram] Reconnection successful");
			} else {
				throw new Error("Failed to create new bot instance");
			}
		} catch (error) {
			console.error("❌ [Telegram] Reconnection failed:", error);
			this.updateHealthStatus(false);
		}
	}

	/**
	 * Check if adapter is healthy
	 */
	isHealthy(): boolean {
		return this.connectionHealth.isConnected && 
		       this.connectionHealth.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES;
	}

	/**
	 * Check if adapter is shutdown
	 */
	isShutdown(): boolean {
		return this._isShutdown;
	}

	/**
	 * Get health status
	 */
	getHealthStatus(): ConnectionHealth {
		return { ...this.connectionHealth };
	}

	/**
	 * Handle incoming message (interface implementation)
	 */
	async handleMessage(rawMessage: any): Promise<void> {
		if (rawMessage && typeof rawMessage === "object" && rawMessage.message_id) {
			await this.handleTelegramMessage(rawMessage);
		}
	}

	/**
	 * Direct message sending (for holding messages)
	 */
	async sendMessage(chatId: string, message: string): Promise<boolean> {
		if (!this.bot) {
			return false;
		}

		try {
			await this.bot.sendMessage(chatId, message, {
				parse_mode: "Markdown",
			});
			return true;
		} catch (error) {
			console.error("❌ [Telegram] Direct send failed:", error);
			return false;
		}
	}

	/**
	 * Force shutdown (immediate cleanup)
	 */
	async forceShutdown(): Promise<void> {
		console.log("💥 [Telegram] Force shutdown initiated");
		this._isShutdown = true;
		
		if (this.healthCheck) {
			clearInterval(this.healthCheck);
			this.healthCheck = null;
		}
		
		if (this.bot) {
			try {
				this.bot.stopPolling();
			} catch (error) {
				console.warn("⚠️ [Telegram] Force stop polling error:", error);
			}
		}
		
		await this.singletonManager.releaseLock();
		
		if (TelegramChannelAdapter.globalInstance === this) {
			TelegramChannelAdapter.globalInstance = null;
		}
		
		this.bot = null;
		this.connectionHealth.isConnected = false;
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		if (this._isShutdown) {
			return;
		}

		console.log("🛑 [Telegram] Graceful shutdown");
		this._isShutdown = true;

		if (this.healthCheck) {
			clearInterval(this.healthCheck);
			this.healthCheck = null;
		}

		if (this.bot) {
			try {
				this.bot.stopPolling();
				await this.bot.deleteWebHook();
			} catch (error) {
				console.warn("⚠️ [Telegram] Shutdown cleanup error:", error);
			}
		}

		await this.singletonManager.releaseLock();

		if (TelegramChannelAdapter.globalInstance === this) {
			TelegramChannelAdapter.globalInstance = null;
		}

		this.bot = null;
		this.connectionHealth.isConnected = false;
		console.log("✅ [Telegram] Shutdown completed");
	}
}