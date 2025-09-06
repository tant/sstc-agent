/**
 * Zalo channel adapter for Mastra framework
 * INTEGRATES with existing maiSale agent and message workflows
 */

import { Zalo } from "zca-js";
import type { ChannelAdapter } from "../../core/channels/interface";
import { messageProcessor } from "../../core/optimized-processing";
import { validateZaloConfig, type ZaloConfig } from "./config";

interface ConnectionHealth {
	isConnected: boolean;
	lastHealthCheck: number;
	consecutiveFailures: number;
	lastError?: string;
}

export class ZaloChannelAdapter implements ChannelAdapter {
	private static globalInstance: ZaloChannelAdapter | null = null;
	private zalo: any;
	private api: any;
	private config: ZaloConfig;
	private _isShutdown: boolean = false;
	private healthCheck: NodeJS.Timeout | null = null;
	private connectionHealth: ConnectionHealth;
	
	// Connection settings
	private readonly MAX_CONSECUTIVE_FAILURES = 5;
	private readonly HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute

	channelId = "zalo";

	/**
	 * Factory method - đảm bảo singleton
	 */
	static async create(config: Partial<ZaloConfig>): Promise<ZaloChannelAdapter | null> {
		console.log("🔍 [Zalo] Checking for existing instances across system...");
		
		// Return existing healthy instance
		if (ZaloChannelAdapter.globalInstance) {
			const instance = ZaloChannelAdapter.globalInstance;
			if (!instance._isShutdown && instance.isHealthy()) {
				console.log("♻️ [Zalo] Returning existing healthy instance");
				return instance;
			} else {
				console.log("🔄 [Zalo] Existing instance unhealthy, shutting down...");
				await instance.forceShutdown();
				ZaloChannelAdapter.globalInstance = null;
			}
		}

		// Create new instance
		try {
			const instance = new ZaloChannelAdapter(config);
			const success = await instance.initialize();
			
			if (success) {
				ZaloChannelAdapter.globalInstance = instance;
				console.log("✅ [Zalo] Singleton instance created successfully");
				return instance;
			} else {
				await instance.forceShutdown();
				return null;
			}
		} catch (error) {
			console.error("❌ [Zalo] Singleton creation failed:", error);
			return null;
		}
	}

	/**
	 * Check if adapter is shutdown
	 */
	isShutdown(): boolean {
		return this._isShutdown;
	}

	/**
	 * Check if adapter is healthy
	 */
	isHealthy(): boolean {
		return this.connectionHealth.isConnected && 
		       this.connectionHealth.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES;
	}

	/**
	 * Private constructor - use factory method
	 */
	private constructor(config: Partial<ZaloConfig>) {
		console.log("🔧 [Zalo] Initializing adapter with config", {
			hasCookie: !!config.cookie,
			hasImei: !!config.imei,
			hasUserAgent: !!config.userAgent,
			selfListen: config.selfListen,
			checkUpdate: config.checkUpdate,
			logging: config.logging,
		});

		this.config = validateZaloConfig(config);
		
		this.connectionHealth = {
			isConnected: false,
			lastHealthCheck: 0,
			consecutiveFailures: 0,
		};

		this.zalo = new Zalo({
			selfListen: this.config.selfListen,
			checkUpdate: this.config.checkUpdate,
			logging: this.config.logging,
		});
	}

	/**
	 * Initialize adapter with connection
	 */
	private async initialize(): Promise<boolean> {
		console.log("🔧 [Zalo] Starting initialization...");
		
		try {
			await this.connectToZalo();
			this.startHealthMonitoring();
			
			this.connectionHealth.isConnected = true;
			this.connectionHealth.lastHealthCheck = Date.now();
			this.connectionHealth.consecutiveFailures = 0;
			
			console.log("✅ [Zalo] Initialization completed successfully");
			return true;
		} catch (error) {
			console.error("❌ [Zalo] Initialization failed:", error);
			this.connectionHealth.isConnected = false;
			this.connectionHealth.lastError = error instanceof Error ? error.message : String(error);
			return false;
		}
	}

	/**
	 * Connect to Zalo (legacy method for compatibility)
	 */
	async start(): Promise<void> {
		if (this._isShutdown) {
			throw new Error("Cannot start shutdown adapter");
		}
		const success = await this.initialize();
		if (!success) {
			throw new Error("Failed to initialize Zalo adapter");
		}
	}

	/**
	 * Connect to Zalo service
	 */
	private async connectToZalo(): Promise<void> {
		console.log("🔍 [Zalo] Logging in with credentials...");

		this.api = await this.zalo.login({
			cookie: this.config.cookie,
			imei: this.config.imei,
			userAgent: this.config.userAgent,
		});

		console.log("✅ [Zalo] Logged in successfully");
		this.setupMessageHandlers();
		console.log("✅ [Zalo] Connection established");
	}

	/**
	 * Set up Zalo message handlers
	 */
	private setupMessageHandlers(): void {
		console.log("⚙️ [Zalo] Setting up message handlers");

		// Text messages
		this.api.listener.on("message", this.handleZaloMessage.bind(this));
		console.log("📝 [Zalo] Message handler registered");

		// Error handling
		this.api.listener.on("error", (error: any) => {
			console.error("❌ [Zalo] Listener error:", error);
			this.handleConnectionError(error);
		});

		// Start listening
		this.api.listener.start();
		console.log("✅ [Zalo] Listener started");

		console.log("✅ [Zalo] All message handlers set up");
	}

	/**
	 * Normalize Zalo message to Mastra workflow format
	 */
	private normalizeMessage(zaloMessage: any): {
		content: string;
		contentType: string;
		senderId: string;
		timestamp: Date;
		messageId: string;
		threadId: string;
		attachments?: Array<{
			type: string;
			url: string;
			filename?: string;
		}>;
	} {
		// Validate message structure
		if (!zaloMessage) {
			console.log("⚠️ [Zalo] Cannot normalize message: null or undefined");
			return {
				content: "[Invalid message]",
				contentType: "unknown",
				senderId: "unknown",
				timestamp: new Date(),
				messageId: Date.now().toString(),
				threadId: "unknown",
			};
		}

		// Handle new message structure (with data object)
		if (zaloMessage.data) {
			console.log("📝 [Zalo] Normalizing message (new structure)", {
				messageId: zaloMessage.data.msgId,
				messageType: zaloMessage.type,
				hasContent: !!zaloMessage.data.content,
				senderId: zaloMessage.data.uidFrom,
				senderName: zaloMessage.data.dName,
			});

			// Determine content type and content text
			let contentType = "text";
			let content = zaloMessage.data.content || "";

			// For new structure, we only have text content for now
			if (!content) {
				contentType = "unknown";
				content = "[Empty message]";
			}

			const normalized = {
				content,
				contentType,
				senderId: zaloMessage.data.uidFrom?.toString() || "unknown",
				timestamp: new Date(parseInt(zaloMessage.data.ts, 10) || Date.now()),
				messageId: zaloMessage.data.msgId?.toString() || Date.now().toString(),
				threadId:
					zaloMessage.threadId?.toString() ||
					zaloMessage.data.uidFrom?.toString() ||
					"unknown",
				attachments: undefined,
			};

			console.log("✅ [Zalo] Message normalized (new structure)", {
				contentType: normalized.contentType,
				contentLength: normalized.content.length,
				hasAttachments: !!normalized.attachments,
				timestamp: normalized.timestamp.toISOString(),
			});

			return normalized;
		}

		// Handle old message structure (with sender object)
		// Validate that we have a sender
		if (!zaloMessage.sender) {
			console.log(
				"⚠️ [Zalo] Cannot normalize message: missing sender information",
			);
			console.log("📄 [Zalo] Message structure:", {
				hasMessage: !!zaloMessage,
				hasSender: !!zaloMessage?.sender,
				availableKeys: zaloMessage ? Object.keys(zaloMessage) : [],
			});

			// Return a minimal normalized message to avoid crashes
			return {
				content: "[Invalid message]",
				contentType: "unknown",
				senderId: "unknown",
				timestamp: new Date(),
				messageId: Date.now().toString(),
				threadId: "unknown",
			};
		}

		console.log("📝 [Zalo] Normalizing message (old structure)", {
			messageId: zaloMessage.id,
			messageType: zaloMessage.type,
			hasBody: !!zaloMessage.body,
			hasText: !!zaloMessage.text,
			hasAttachments: !!(
				zaloMessage.attachments ||
				zaloMessage.photo ||
				zaloMessage.file
			),
			senderId: zaloMessage.sender?.id,
			senderName: zaloMessage.sender?.name,
		});

		// Determine content type and content text
		let contentType = "text";
		let content = "";

		// Use text content (body has higher priority than text)
		const _messageText = zaloMessage.body || zaloMessage.text || "";

		// Determine primary content type based on message content
		if (zaloMessage.body || zaloMessage.text) {
			contentType = "text";
			content = zaloMessage.body || zaloMessage.text;
		} else if (zaloMessage.photo) {
			contentType = "image";
			content = "[Image message]";
		} else if (zaloMessage.file) {
			contentType = "file";
			content = "[File message]";
		} else {
			contentType = "unknown";
			content = "[Unsupported message type]";
		}

		const normalized = {
			content,
			contentType,
			senderId: zaloMessage.sender?.id?.toString() || "unknown",
			timestamp: new Date(zaloMessage.timestamp || Date.now()),
			messageId: zaloMessage.id?.toString() || Date.now().toString(),
			threadId: (
				zaloMessage.threadID ||
				zaloMessage.sender?.id ||
				"unknown"
			).toString(),
			attachments: undefined,
		};

		console.log("✅ [Zalo] Message normalized (old structure)", {
			contentType: normalized.contentType,
			contentLength: normalized.content.length,
			hasAttachments: !!normalized.attachments,
			timestamp: normalized.timestamp.toISOString(),
		});

		return normalized;
	}

	/**
	 * Handle Zalo message through Mastra Workflow
	 */
	private async handleZaloMessage(zaloMessage: any): Promise<void> {
		// Debug log: Display raw Zalo message
		console.log(
			"🔍 [Zalo] RAW MESSAGE RECEIVED:",
			JSON.stringify(zaloMessage, null, 2),
		);

		// Validate message structure
		if (!zaloMessage) {
			console.log("⚠️ [Zalo] Received invalid message: null or undefined");
			return;
		}

		// Debug log to inspect message structure safely
		console.log("🔍 [Zalo] DEBUG - Message structure:", {
			keys: Object.keys(zaloMessage || {}),
			hasData: !!zaloMessage?.data,
			dataKeys: zaloMessage?.data ? Object.keys(zaloMessage.data) : null,
			messageId: zaloMessage?.data?.msgId,
			messageType: zaloMessage?.type,
			hasContent: !!zaloMessage?.data?.content,
		});

		// Check if this is the new message structure (with data object)
		if (zaloMessage.data) {
			console.log("📥 [Zalo] Received message (new structure):", {
				messageId: zaloMessage.data.msgId,
				messageType: zaloMessage.type,
				hasContent: !!zaloMessage.data.content,
				sender: {
					id: zaloMessage.data.uidFrom || "unknown",
					name: zaloMessage.data.dName || "Unknown Sender",
				},
				textPreview: zaloMessage.data.content
					? `${zaloMessage.data.content.substring(0, 50)}...`
					: "[No content]",
				timestamp: new Date(
					parseInt(zaloMessage.data.ts, 10) || Date.now(),
				).toISOString(),
			});
		} else {
			// Fallback to old structure
			console.log("📥 [Zalo] Received message (old structure):", {
				messageId: zaloMessage.id,
				messageType: zaloMessage.type,
				hasBody: !!zaloMessage.body,
				hasText: !!zaloMessage.text,
				hasPhoto: !!zaloMessage.photo,
				hasFile: !!zaloMessage.file,
				sender: {
					id: zaloMessage.sender?.id || "unknown",
					name: zaloMessage.sender?.name || "Unknown Sender",
				},
				textPreview:
					`${zaloMessage.body?.substring(0, 50)}...` ||
					`${zaloMessage.text?.substring(0, 50)}...`,
				timestamp: new Date(zaloMessage.timestamp || Date.now()).toISOString(),
			});
		}

		// Validate that we have the minimum required information
		const hasValidSender = zaloMessage.data?.uidFrom || zaloMessage.sender?.id;

		if (!hasValidSender) {
			console.log(
				"⚠️ [Zalo] Message missing valid sender information, skipping processing",
			);
			console.log("📄 [Zalo] Message preview:", {
				id: zaloMessage.data?.msgId || zaloMessage.id,
				type: zaloMessage.type,
				availableKeys: Object.keys(zaloMessage),
				hasData: !!zaloMessage.data,
				hasSender: !!zaloMessage.sender,
			});
			return;
		}

		try {
			// Normalize message using shared types
			const normalizedMessage = this.normalizeMessage(zaloMessage);
			console.log("📝 [Zalo] Normalized message:", {
				id: normalizedMessage.messageId,
				senderId: normalizedMessage.senderId,
				contentType: normalizedMessage.contentType,
				contentLength: normalizedMessage.content.length,
			});

			// Validate the message
			if (!this.validateMessage(normalizedMessage)) {
				console.log("❌ [Zalo] Message validation failed");
				await this.sendResponseViaApi(
					"Xin lỗi, tôi không thể xử lý tin nhắn của bạn. Vui lòng thử lại.",
					normalizedMessage,
				);
				return;
			}

			console.log("✅ [Zalo] Message validation passed");

			// Create standardized message format
			// Handle both new and old message structures
			let senderInfo = {
				id: "unknown",
				username: "Unknown Sender",
				displayName: "Unknown User",
			};

			if (zaloMessage.data) {
				// New message structure
				senderInfo = {
					id:
						zaloMessage.data.uidFrom || normalizedMessage.senderId || "unknown",
					username: zaloMessage.data.dName || "Unknown Sender",
					displayName: zaloMessage.data.dName || "Unknown User",
				};
			} else if (zaloMessage.sender) {
				// Old message structure
				senderInfo = {
					id: zaloMessage.sender?.id || normalizedMessage.senderId || "unknown",
					username: zaloMessage.sender?.name || "Unknown Sender",
					displayName: zaloMessage.sender?.name || "Unknown User",
				};
			} else {
				// Fallback to normalized message data
				senderInfo = {
					id: normalizedMessage.senderId || "unknown",
					username: "Unknown Sender",
					displayName: "Unknown User",
				};
			}

			const standardizedMessage = {
				id: normalizedMessage.messageId,
				content: normalizedMessage.content,
				contentType: normalizedMessage.contentType,
				sender: senderInfo,
				timestamp: normalizedMessage.timestamp,
				channel: {
					channelId: "zalo",
					channelMessageId: normalizedMessage.messageId,
					metadata: {
						threadId: normalizedMessage.threadId,
						messageType: normalizedMessage.contentType,
					},
				},
				attachments: normalizedMessage.attachments,
			};

			console.log("🔄 [Zalo] Sending to central processor:", {
				messageId: standardizedMessage.id,
				channelId: standardizedMessage.channel.channelId,
				contentType: standardizedMessage.contentType,
				contentLength: standardizedMessage.content.length,
			});

			// Process through central message processor
			const response =
				await messageProcessor.processMessage(standardizedMessage);

			console.log("📤 [Zalo] Received response from processor:", {
				contentType: response.contentType,
				contentLength: response.content.length,
				hasMetadata: !!response.metadata,
			});

			// Transform response for Zalo
			const zaloResponse = {
				response: response.content,
				contentType: response.contentType,
				metadata: response.metadata,
			};

			await this.sendResponse(zaloResponse, normalizedMessage);
			console.log(`✅ [Zalo] Message processed and response sent`);
		} catch (error) {
			console.error(`❌ [Zalo] Error processing message:`, {
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			});
			// Không thể gửi error response vì không có normalizedMessage trong scope này
			// Thay vào đó, chỉ log lỗi
		}
	}

	/**
	 * Send response back through Zalo
	 */
	private async sendResponse(
		response: any,
		originalMessage: any,
	): Promise<void> {
		const threadId = originalMessage.threadId;

		if (!threadId) {
			throw new Error("No thread ID found for Zalo response");
		}

		console.log("📤 [Zalo] Sending response to thread", {
			threadId,
			contentType: response.contentType,
			contentLength: response.response?.length || 0,
			hasMetadata: !!response.metadata,
		});

		try {
			// Default text message
			const messageText =
				response.response || "Xin lỗi, tôi không thể xử lý yêu cầu của bạn.";
			console.log("💬 [Zalo] Sending text response", {
				textLength: messageText.length,
				textPreview: `${messageText.substring(0, 50)}...`,
			});

			// Send message through Zalo API
			await this.api.sendMessage(messageText, threadId);

			console.log(`✅ [Zalo] Response sent successfully to thread ${threadId}`);
		} catch (error) {
			console.error(`❌ [Zalo] Error sending response to thread ${threadId}:`, {
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	}

	/**
	 * Send response via Zalo API (simplified)
	 */
	private async sendResponseViaApi(
		message: string,
		originalMessage: any,
	): Promise<void> {
		const threadId = originalMessage.threadId;
		try {
			await this.api.sendMessage(message, threadId);
		} catch (error) {
			console.error("❌ Failed to send Zalo response:", error);
		}
	}

	/**
	 * Validate message before processing
	 */
	private validateMessage(message: {
		content: string;
		senderId: string;
		timestamp: Date;
		messageId: string;
		threadId: string;
	}): boolean {
		console.log("🔍 [Zalo] Validating message", {
			messageId: message.messageId,
			senderId: message.senderId,
			contentLength: message.content.length,
		});

		// Check if message content is not empty
		if (!message.content || message.content.trim().length === 0) {
			console.log("❌ [Zalo] Message validation failed: Empty content");
			return false;
		}

		// Check if sender information is present
		if (!message.senderId || message.senderId === "unknown") {
			console.log("❌ [Zalo] Message validation failed: Missing sender ID");
			return false;
		}

		// Check message length against channel limits (Zalo limit: 4096)
		if (message.content.length > 4096) {
			console.log("❌ [Zalo] Message validation failed: Message too long", {
				length: message.content.length,
				limit: 4096,
			});
			return false;
		}

		console.log("✅ [Zalo] Message validation passed");
		return true;
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

		console.log("💓 [Zalo] Health monitoring started");
	}

	/**
	 * Perform health check
	 */
	private async performHealthCheck(): Promise<void> {
		try {
			if (!this.api || this._isShutdown) {
				return;
			}

			// Simple health check - verify API is available
			if (this.api?.listener) {
				this.updateHealthStatus(true);
				console.log("💓 [Zalo] Health check passed");
			} else {
				throw new Error("API or listener unavailable");
			}
		} catch (error) {
			console.error("❌ [Zalo] Health check failed:", error);
			this.updateHealthStatus(false);
			
			// Trigger reconnection if too many failures
			if (this.connectionHealth.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
				console.error("🚨 [Zalo] Too many failures, attempting reconnection");
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
		console.error("🚨 [Zalo] Connection error:", error);
		
		this.connectionHealth.lastError = error instanceof Error ? error.message : String(error);
		this.updateHealthStatus(false);
	}

	/**
	 * Attempt reconnection
	 */
	private async attemptReconnection(): Promise<void> {
		console.log("🔄 [Zalo] Attempting reconnection");

		try {
			// Wait before reconnection
			await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

			// Stop current listener
			if (this.api?.listener) {
				try {
					this.api.listener.stop();
				} catch (error) {
					console.warn("⚠️ [Zalo] Error stopping listener:", error);
				}
			}

			// Reconnect to Zalo
			await this.connectToZalo();
			
			this.updateHealthStatus(true);
			console.log("✅ [Zalo] Reconnection successful");
		} catch (error) {
			console.error("❌ [Zalo] Reconnection failed:", error);
			this.updateHealthStatus(false);
		}
	}

	/**
	 * Force shutdown (immediate cleanup)
	 */
	async forceShutdown(): Promise<void> {
		console.log("💥 [Zalo] Force shutdown initiated");
		this._isShutdown = true;
		
		if (this.healthCheck) {
			clearInterval(this.healthCheck);
			this.healthCheck = null;
		}
		
		if (this.api?.listener) {
			try {
				this.api.listener.stop();
			} catch (error) {
				console.warn("⚠️ [Zalo] Force stop error:", error);
			}
		}
		
		if (ZaloChannelAdapter.globalInstance === this) {
			ZaloChannelAdapter.globalInstance = null;
		}
		
		this.api = null;
		this.zalo = null;
		this.connectionHealth.isConnected = false;
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		if (this._isShutdown) {
			return;
		}

		console.log("🛑 [Zalo] Graceful shutdown");
		this._isShutdown = true;

		if (this.healthCheck) {
			clearInterval(this.healthCheck);
			this.healthCheck = null;
		}

		if (this.api?.listener) {
			try {
				this.api.listener.stop();
			} catch (error) {
				console.warn("⚠️ [Zalo] Shutdown cleanup error:", error);
			}
		}

		if (ZaloChannelAdapter.globalInstance === this) {
			ZaloChannelAdapter.globalInstance = null;
		}

		this.api = null;
		this.zalo = null;
		this.connectionHealth.isConnected = false;
		console.log("✅ [Zalo] Shutdown completed");
	}

	/**
	 * Handle incoming message - implements ChannelAdapter interface
	 */
	async handleMessage(rawMessage: any): Promise<void> {
		// This method would be called by the registry or webhook handler
		console.log("📥 Handling Zalo message:", rawMessage);

		if (rawMessage && typeof rawMessage === "object" && rawMessage.id) {
			await this.handleZaloMessage(rawMessage);
		}
	}

	/**
	 * Send message directly to Zalo thread
	 * For holding messages during parallel processing
	 */
	public async sendMessage(
		threadId: string,
		message: string,
	): Promise<boolean> {
		try {
			await this.api.sendMessage(message, threadId);
			console.log(`✅ [Zalo] Direct message sent to ${threadId}`);
			return true;
		} catch (error) {
			console.error(`❌ [Zalo] Failed to send direct message:`, error);
			return false;
		}
	}
}
