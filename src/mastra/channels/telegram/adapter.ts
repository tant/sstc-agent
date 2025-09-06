/**
 * Telegram channel adapter for Mastra framework
 * INTEGRATES with existing maiSale agent and message workflows
 */

import TelegramBot from "node-telegram-bot-api";
import type { ChannelAdapter } from "../../core/channels/interface";
import { messageProcessor } from "../../core/optimized-processing";
import { type TelegramConfig, validateTelegramConfig } from "./config";

export class TelegramChannelAdapter implements ChannelAdapter {
	private bot: any;
	private config: TelegramConfig;
	private _isShutdown: boolean = false;

	channelId = "telegram";

	/**
	 * Check if adapter is shutdown
	 */
	isShutdown(): boolean {
		return this._isShutdown;
	}

	constructor(config: Partial<TelegramConfig>) {
		console.log("🔧 [Telegram] Initializing adapter with config", {
			hasToken: !!config.token,
			polling: config.polling ?? true,
			pollingInterval: config.pollingInterval,
		});

		// Use existing validation function
		this.config = validateTelegramConfig(config);

		// Initialize Telegram bot
		const botOptions: TelegramBot.ConstructorOptions = {
			polling: this.config.polling ?? true,
			// Force IPv4 only to avoid connection issues
			request: {
				url: "",
				family: 4,
			},
		};

		if (this.config.pollingInterval) {
			botOptions.polling = {
				interval: this.config.pollingInterval,
			};
		}

		console.log(
			`🔍 [Telegram] Creating bot with token: ${this.config.token.substring(0, 5)}...`,
		);
		// @ts-expect-error - TelegramBot default export issue
		this.bot = new (TelegramBot as any)(this.config.token, botOptions);

		// Set up message handlers
		this.setupMessageHandlers();

		console.log("✅ [Telegram] Adapter initialized successfully");
	}

	/**
	 * Set up Telegram message handlers
	 */
	private setupMessageHandlers(): void {
		console.log("⚙️ [Telegram] Setting up message handlers");

		// Text messages
		this.bot.on("message", this.handleTelegramMessage.bind(this));
		console.log("📝 [Telegram] Text message handler registered");

		// Callback queries (button presses)
		this.bot.on("callback_query", this.handleCallbackQuery.bind(this));
		console.log("⌨️ [Telegram] Callback query handler registered");

		// Photo messages
		this.bot.on("photo", this.handlePhotoMessage.bind(this));
		console.log("🖼️ [Telegram] Photo message handler registered");

		// Document messages
		this.bot.on("document", this.handleDocumentMessage.bind(this));
		console.log("📄 [Telegram] Document message handler registered");

		// Voice messages
		this.bot.on("voice", this.handleVoiceMessage.bind(this));
		console.log("🎤 [Telegram] Voice message handler registered");

		// Audio messages
		this.bot.on("audio", this.handleAudioMessage.bind(this));
		console.log("🎵 [Telegram] Audio message handler registered");

		// Video messages
		this.bot.on("video", this.handleVideoMessage.bind(this));
		console.log("🎬 [Telegram] Video message handler registered");

		// Animation messages (GIFs)
		this.bot.on("animation", this.handleAnimationMessage.bind(this));
		console.log("🎨 [Telegram] Animation message handler registered");

		// Sticker messages
		this.bot.on("sticker", this.handleStickerMessage.bind(this));
		console.log("張貼 [Telegram] Sticker message handler registered");

		// Video note messages
		this.bot.on("video_note", this.handleVideoNoteMessage.bind(this));
		console.log("📹 [Telegram] Video note message handler registered");

		// Error handling
		this.bot.on("polling_error", (error: any) => {
			console.error("❌ [Telegram] Polling error:", error);
		});

		this.bot.on("webhook_error", (error: any) => {
			console.error("❌ [Telegram] Webhook error:", error);
		});

		console.log("✅ [Telegram] All message handlers set up");
	}

	/**
	 * Normalize Telegram message to Mastra workflow format
	 * Handles all message types according to Telegram Bot API specification
	 */
	private normalizeMessage(telegramMessage: TelegramBot.Message): {
		content: string;
		contentType: string;
		senderId: string;
		timestamp: Date;
		messageId: string;
		chatId: string;
		attachments?: Array<{
			type: string;
			url: string;
			filename?: string;
			fileId?: string;
		}>;
	} {
		console.log("📝 [Telegram] Normalizing message", {
			messageId: telegramMessage.message_id,
			messageType: this.getMessageType(telegramMessage),
			hasText: !!telegramMessage.text,
			hasCaption: !!telegramMessage.caption,
			hasPhoto: !!telegramMessage.photo,
			hasDocument: !!telegramMessage.document,
			hasAudio: !!telegramMessage.audio,
			hasVideo: !!telegramMessage.video,
			hasVoice: !!telegramMessage.voice,
			hasSticker: !!telegramMessage.sticker,
			hasContact: !!telegramMessage.contact,
			hasLocation: !!telegramMessage.location,
		});

		// Determine content type and content text
		let contentType = "text";
		let content = "";

		// Use caption for media messages if no text
		const messageText = telegramMessage.text || telegramMessage.caption || "";

		// Determine primary content type based on message content
		if (telegramMessage.text) {
			contentType = "text";
			content = telegramMessage.text;
		} else if (telegramMessage.photo) {
			contentType = "image";
			content = messageText || "[Image message]";
		} else if (telegramMessage.document) {
			contentType = "document";
			content = messageText || "[Document message]";
		} else if (telegramMessage.audio) {
			contentType = "audio";
			content = messageText || "[Audio message]";
		} else if (telegramMessage.video) {
			contentType = "video";
			content = messageText || "[Video message]";
		} else if (telegramMessage.animation) {
			contentType = "animation";
			content = messageText || "[Animation message]";
		} else if (telegramMessage.voice) {
			contentType = "voice";
			content = messageText || "[Voice message]";
		} else if (telegramMessage.video_note) {
			contentType = "video_note";
			content = "[Video note message]";
		} else if (telegramMessage.sticker) {
			contentType = "sticker";
			content = messageText || "[Sticker message]";
		} else if (telegramMessage.contact) {
			contentType = "contact";
			content = "[Contact message]";
		} else if (telegramMessage.location) {
			contentType = "location";
			content = "[Location message]";
		} else if (telegramMessage.venue) {
			contentType = "venue";
			content = "[Venue message]";
		} else if (telegramMessage.poll) {
			contentType = "poll";
			content = "[Poll message]";
		} else if (telegramMessage.dice) {
			contentType = "dice";
			content = "[Dice message]";
		} else {
			contentType = "unknown";
			content = "[Unsupported message type]";
		}

		// Prepare attachments
		let attachments:
			| Array<{
					type: string;
					url: string;
					filename?: string;
					fileId?: string;
			  }>
			| undefined;

		try {
			// Note: We can't directly access bot token, so we'll use Telegram's file ID
			// The actual file URL needs to be obtained through getFile API call
			if (telegramMessage.photo) {
				// Get the largest photo (last in array)
				const photo = telegramMessage.photo[telegramMessage.photo.length - 1];
				attachments = [
					{
						type: "photo",
						// We'll need to get the actual file URL through bot.getFileLink(fileId)
						url: photo.file_id, // Placeholder - will resolve actual URL when needed
						filename: `telegram_photo_${photo.file_id}.jpg`,
						fileId: photo.file_id,
					},
				];
			} else if (telegramMessage.document) {
				attachments = [
					{
						type: "document",
						url: telegramMessage.document.file_id, // Placeholder
						filename:
							telegramMessage.document.file_name ||
							`document_${telegramMessage.document.file_id}`,
						fileId: telegramMessage.document.file_id,
					},
				];
			} else if (telegramMessage.audio) {
				attachments = [
					{
						type: "audio",
						url: telegramMessage.audio.file_id, // Placeholder
						filename: `audio_${telegramMessage.audio.file_id}`, // Audio doesn't have file_name
						fileId: telegramMessage.audio.file_id,
					},
				];
			} else if (telegramMessage.video) {
				attachments = [
					{
						type: "video",
						url: telegramMessage.video.file_id, // Placeholder
						filename: `video_${telegramMessage.video.file_id}`, // Video doesn't have file_name
						fileId: telegramMessage.video.file_id,
					},
				];
			} else if (telegramMessage.animation) {
				attachments = [
					{
						type: "animation",
						url: telegramMessage.animation.file_id, // Placeholder
						filename:
							telegramMessage.animation.file_name ||
							`animation_${telegramMessage.animation.file_id}`,
						fileId: telegramMessage.animation.file_id,
					},
				];
			} else if (telegramMessage.voice) {
				attachments = [
					{
						type: "voice",
						url: telegramMessage.voice.file_id, // Placeholder
						fileId: telegramMessage.voice.file_id,
					},
				];
			} else if (telegramMessage.video_note) {
				attachments = [
					{
						type: "video_note",
						url: telegramMessage.video_note.file_id, // Placeholder
						fileId: telegramMessage.video_note.file_id,
					},
				];
			} else if (telegramMessage.sticker) {
				attachments = [
					{
						type: "sticker",
						url: telegramMessage.sticker.file_id, // Placeholder
						filename: `sticker_${telegramMessage.sticker.file_id}.webp`,
						fileId: telegramMessage.sticker.file_id,
					},
				];
			}
		} catch (error) {
			console.error("❌ [Telegram] Error preparing attachments:", error);
		}

		const normalized = {
			content,
			contentType,
			senderId: telegramMessage.from?.id.toString() || "unknown",
			timestamp: new Date(telegramMessage.date * 1000),
			messageId: telegramMessage.message_id.toString(),
			chatId: telegramMessage.chat.id.toString(),
			attachments,
		};

		console.log("✅ [Telegram] Message normalized", {
			contentType: normalized.contentType,
			contentLength: normalized.content.length,
			hasAttachments: !!normalized.attachments,
			attachmentTypes: normalized.attachments?.map((a) => a.type) || [],
		});

		return normalized;
	}

	/**
	 * Get actual file URL from Telegram file ID
	 * @param fileId Telegram file ID
	 * @returns Actual file URL
	 */
	private async getFileUrl(fileId: string): Promise<string> {
		try {
			// If it's already a full URL, return it as is
			if (fileId.startsWith("http")) {
				return fileId;
			}

			// Otherwise, it's a file ID, get the actual file path
			const file = await this.bot.getFile(fileId);
			if (!file.file_path) {
				throw new Error("File path not available");
			}

			// Construct the full URL
			return `https://api.telegram.org/file/bot${this.config.token}/${file.file_path}`;
		} catch (error) {
			console.error("❌ [Telegram] Error getting file URL:", error);
			throw error;
		}
	}

	/**
	 * Helper method to determine message type
	 */
	private getMessageType(message: TelegramBot.Message): string {
		if (message.text) return "text";
		if (message.photo) return "photo";
		if (message.document) return "document";
		if (message.audio) return "audio";
		if (message.video) return "video";
		if (message.animation) return "animation";
		if (message.voice) return "voice";
		if (message.video_note) return "video_note";
		if (message.sticker) return "sticker";
		if (message.contact) return "contact";
		if (message.location) return "location";
		if (message.venue) return "venue";
		if (message.poll) return "poll";
		if (message.dice) return "dice";
		return "unknown";
	}

	/**
	 * Handle Telegram message through Mastra Workflow
	 */
	private async handleTelegramMessage(
		telegramMessage: TelegramBot.Message,
	): Promise<void> {
		console.log("📥 [Telegram] Received message:", {
			messageId: telegramMessage.message_id,
			chatId: telegramMessage.chat.id,
			from: {
				id: telegramMessage.from?.id,
				username: telegramMessage.from?.username,
				firstName: telegramMessage.from?.first_name,
			},
			text: `${telegramMessage.text?.substring(0, 50)}...`,
			timestamp: new Date(telegramMessage.date * 1000).toISOString(),
		});

		// Ignore messages from bots
		if (telegramMessage.from?.is_bot) {
			console.log("🤖 [Telegram] Ignoring bot message");
			return;
		}

		// Check if chat type is allowed
		if (
			this.config.allowedChatTypes &&
			!this.config.allowedChatTypes.includes(telegramMessage.chat.type as any)
		) {
			console.log(
				`🚫 [Telegram] Ignoring message from disallowed chat type: ${telegramMessage.chat.type}`,
			);
			return;
		}

		try {
			// Normalize message using shared types
			const normalizedMessage = this.normalizeMessage(telegramMessage);
			console.log("📝 [Telegram] Normalized message:", {
				id: normalizedMessage.messageId,
				senderId: normalizedMessage.senderId,
				contentLength: normalizedMessage.content.length,
				hasAttachments: !!normalizedMessage.attachments,
			});

			// Validate the message
			if (!this.validateMessage(normalizedMessage)) {
				console.log("❌ [Telegram] Message validation failed");
				await this.sendResponseViaBot(
					"Xin lỗi, tôi không thể xử lý tin nhắn của bạn. Vui lòng thử lại.",
					telegramMessage,
				);
				return;
			}

			console.log("✅ [Telegram] Message validation passed");

			// Create standardized message format
			const standardizedMessage = {
				id: normalizedMessage.messageId,
				content: normalizedMessage.content,
				contentType: normalizedMessage.contentType,
				sender: {
					id: normalizedMessage.senderId,
					username: telegramMessage.from?.username,
					displayName:
						telegramMessage.from?.first_name ||
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

			console.log("🔄 [Telegram] Sending to central processor:", {
				messageId: standardizedMessage.id,
				channelId: standardizedMessage.channel.channelId,
			});

			// Process through central message processor
			const response =
				await messageProcessor.processMessage(standardizedMessage);

			console.log("📤 [Telegram] Received response from processor:", {
				contentType: response.contentType,
				contentLength: response.content.length,
			});

			// Transform response for Telegram
			const telegramResponse = {
				response: response.content,
				contentType: response.contentType,
				metadata: response.metadata,
			};

			await this.sendResponse(telegramResponse, telegramMessage);
			console.log(`✅ [Telegram] Message processed and response sent`);
		} catch (error) {
			console.error(`❌ [Telegram] Error processing message:`, error);
			await this.sendErrorResponse(error, telegramMessage);
		}
	}

	/**
	 * Send response back through Telegram
	 * Handles various response types according to Telegram Bot API
	 */
	private async sendResponse(
		response: any,
		originalMessage: TelegramBot.Message,
	): Promise<void> {
		const chatId = originalMessage.chat.id.toString();

		if (!chatId) {
			throw new Error("No chat ID found for Telegram response");
		}

		console.log("📤 [Telegram] Sending response to chat", {
			chatId,
			contentType: response.contentType,
			contentLength: response.response?.length || response.text?.length,
		});

		try {
			// Handle different response types
			if (
				response.contentType === "quick_reply" &&
				response.quickReplies &&
				response.quickReplies.length > 0
			) {
				console.log("⌨️ [Telegram] Sending quick reply buttons");
				// Send message with quick replies (inline keyboard)
				const keyboard = {
					inline_keyboard: response.quickReplies.map((reply: any) => [
						{ text: reply.title, callback_data: reply.payload },
					]),
				};

				await this.bot.sendMessage(chatId, response.response || response.text, {
					reply_markup: keyboard,
				});
			} else if (
				response.contentType === "image" &&
				response.attachments &&
				response.attachments.length > 0
			) {
				console.log("🖼️ [Telegram] Sending image response");
				// Send image with caption
				const fileIdOrUrl = response.attachments[0].url;
				try {
					// Try to get actual file link if it's a file ID
					const actualUrl = await this.getFileUrl(fileIdOrUrl);
					await this.bot.sendPhoto(chatId, actualUrl, {
						caption: response.response || response.text,
					});
				} catch (_error) {
					// If it's already a URL, send it directly
					await this.bot.sendPhoto(chatId, fileIdOrUrl, {
						caption: response.response || response.text,
					});
				}
			} else if (
				response.contentType === "document" &&
				response.attachments &&
				response.attachments.length > 0
			) {
				console.log("📄 [Telegram] Sending document response");
				// Send document with caption
				const fileIdOrUrl = response.attachments[0].url;
				try {
					// Try to get actual file link if it's a file ID
					const actualUrl = await this.getFileUrl(fileIdOrUrl);
					await this.bot.sendDocument(chatId, actualUrl, {
						caption: response.response || response.text,
					});
				} catch (_error) {
					// If it's already a URL, send it directly
					await this.bot.sendDocument(chatId, fileIdOrUrl, {
						caption: response.response || response.text,
					});
				}
			} else if (
				response.contentType === "audio" &&
				response.attachments &&
				response.attachments.length > 0
			) {
				console.log("🎵 [Telegram] Sending audio response");
				// Send audio with caption
				const fileIdOrUrl = response.attachments[0].url;
				try {
					// Try to get actual file link if it's a file ID
					const actualUrl = await this.getFileUrl(fileIdOrUrl);
					await this.bot.sendAudio(chatId, actualUrl, {
						caption: response.response || response.text,
					});
				} catch (_error) {
					// If it's already a URL, send it directly
					await this.bot.sendAudio(chatId, fileIdOrUrl, {
						caption: response.response || response.text,
					});
				}
			} else if (
				response.contentType === "video" &&
				response.attachments &&
				response.attachments.length > 0
			) {
				console.log("🎬 [Telegram] Sending video response");
				// Send video with caption
				const fileIdOrUrl = response.attachments[0].url;
				try {
					// Try to get actual file link if it's a file ID
					const actualUrl = await this.getFileUrl(fileIdOrUrl);
					await this.bot.sendVideo(chatId, actualUrl, {
						caption: response.response || response.text,
					});
				} catch (_error) {
					// If it's already a URL, send it directly
					await this.bot.sendVideo(chatId, fileIdOrUrl, {
						caption: response.response || response.text,
					});
				}
			} else {
				// Default text message
				const messageText =
					response.response ||
					response.text ||
					"Xin lỗi, tôi không thể xử lý yêu cầu của bạn.";
				console.log("💬 [Telegram] Sending text response", {
					textLength: messageText.length,
				});

				// Try to send as Markdown first, fallback to plain text if it fails
				try {
					await this.bot.sendMessage(chatId, messageText, {
						parse_mode: "Markdown",
						reply_to_message_id: originalMessage.message_id,
					});
				} catch (_markdownError) {
					console.log(
						"⚠️ [Telegram] Markdown parsing failed, sending as plain text",
					);
					await this.bot.sendMessage(chatId, messageText, {
						reply_to_message_id: originalMessage.message_id,
					});
				}
			}

			console.log(`✅ [Telegram] Response sent successfully to chat ${chatId}`);
		} catch (error) {
			console.error(
				`❌ [Telegram] Error sending response to chat ${chatId}:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Send response via Telegram bot (simplified)
	 */
	private async sendResponseViaBot(
		message: string,
		originalMessage: TelegramBot.Message,
	): Promise<void> {
		const chatId = originalMessage.chat.id.toString();
		try {
			await this.bot.sendMessage(chatId, message, {
				parse_mode: "Markdown",
				reply_to_message_id: originalMessage.message_id,
			});
		} catch (error) {
			console.error("❌ Failed to send Telegram response:", error);
		}
	}

	/**
	 * Handle photo messages
	 */
	private async handlePhotoMessage(photo: TelegramBot.Message): Promise<void> {
		console.log("📸 [Telegram] Received photo message");
		// Process photo message directly
		await this.handleTelegramMessage(photo);
	}

	/**
	 * Handle document messages
	 */
	private async handleDocumentMessage(
		document: TelegramBot.Message,
	): Promise<void> {
		console.log("📄 [Telegram] Received document message");
		// Process document message directly
		await this.handleTelegramMessage(document);
	}

	/**
	 * Handle voice messages
	 */
	private async handleVoiceMessage(voice: TelegramBot.Message): Promise<void> {
		console.log("🎤 [Telegram] Received voice message");
		// Process voice message directly
		await this.handleTelegramMessage(voice);
	}

	/**
	 * Handle audio messages
	 */
	private async handleAudioMessage(audio: TelegramBot.Message): Promise<void> {
		console.log("🎵 [Telegram] Received audio message");
		// Process audio message directly
		await this.handleTelegramMessage(audio);
	}

	/**
	 * Handle video messages
	 */
	private async handleVideoMessage(video: TelegramBot.Message): Promise<void> {
		console.log("🎬 [Telegram] Received video message");
		// Process video message directly
		await this.handleTelegramMessage(video);
	}

	/**
	 * Handle animation messages (GIFs)
	 */
	private async handleAnimationMessage(
		animation: TelegramBot.Message,
	): Promise<void> {
		console.log("🎨 [Telegram] Received animation message");
		// Process animation message directly
		await this.handleTelegramMessage(animation);
	}

	/**
	 * Handle sticker messages
	 */
	private async handleStickerMessage(
		sticker: TelegramBot.Message,
	): Promise<void> {
		console.log("張貼 [Telegram] Received sticker message");
		// Process sticker message directly
		await this.handleTelegramMessage(sticker);
	}

	/**
	 * Handle video note messages
	 */
	private async handleVideoNoteMessage(
		videoNote: TelegramBot.Message,
	): Promise<void> {
		console.log("📹 [Telegram] Received video note message");
		// Process video note message directly
		await this.handleTelegramMessage(videoNote);
	}

	/**
	 * Handle callback queries (button presses)
	 */
	private async handleCallbackQuery(
		callbackQuery: TelegramBot.CallbackQuery,
	): Promise<void> {
		try {
			// Acknowledge the callback
			await this.bot.answerCallbackQuery(callbackQuery.id);

			// Create a synthetic message for the callback
			if (callbackQuery.message) {
				const syntheticMessage: TelegramBot.Message = {
					...callbackQuery.message,
					text: callbackQuery.data || "Button pressed",
					from: callbackQuery.from,
				};

				await this.handleTelegramMessage(syntheticMessage);
			}
		} catch (error) {
			console.error("❌ Error handling Telegram callback query:", error);
		}
	}

	/**
	 * Send error response
	 */
	private async sendErrorResponse(
		error: any,
		originalMessage: TelegramBot.Message,
	): Promise<void> {
		try {
			const chatId = originalMessage.chat.id.toString();
			await this.bot.sendMessage(
				chatId,
				`Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`,
			);
		} catch (sendError) {
			console.error("❌ Failed to send error response:", sendError);
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
		chatId: string;
	}): boolean {
		console.log("🔍 [Telegram] Validating message", {
			messageId: message.messageId,
			senderId: message.senderId,
			contentLength: message.content.length,
		});

		// Check if message content is not empty
		if (!message.content || message.content.trim().length === 0) {
			console.log("❌ [Telegram] Message validation failed: Empty content");
			return false;
		}

		// Check if sender information is present
		if (!message.senderId || message.senderId === "unknown") {
			console.log("❌ [Telegram] Message validation failed: Missing sender ID");
			return false;
		}

		// Check message length against channel limits (Telegram limit: 4096)
		if (message.content.length > 4096) {
			console.log("❌ [Telegram] Message validation failed: Message too long", {
				length: message.content.length,
				limit: 4096,
			});
			return false;
		}

		console.log("✅ [Telegram] Message validation passed");
		return true;
	}

	/**
	 * Cleanup method for graceful shutdown
	 */
	async shutdown(): Promise<void> {
		// Check if already shutdown
		if (this._isShutdown) {
			console.log("⚠️ [Telegram] Adapter already shut down, skipping...");
			return;
		}

		console.log("🛑 [Telegram] Shutting down adapter...");
		try {
			// Stop polling
			this.bot.stopPolling();

			// Delete webhook if exists
			await this.bot.deleteWebHook();

			// Mark as shutdown
			this._isShutdown = true;

			console.log("✅ [Telegram] Adapter shut down successfully");
		} catch (error) {
			console.error("❌ [Telegram] Error shutting down adapter:", error);
			// Still mark as shutdown to prevent repeated attempts
			this._isShutdown = true;
		}
	}

	/**
	 * Handle incoming message - implements ChannelAdapter interface
	 */
	async handleMessage(rawMessage: any): Promise<void> {
		// This method would be called by the registry or webhook handler
		// For polling-based Telegram, messages are handled automatically
		// But we implement it for consistency with the interface
		console.log("📥 Handling Telegram message:", rawMessage);

		if (rawMessage && typeof rawMessage === "object" && rawMessage.message_id) {
			await this.handleTelegramMessage(rawMessage);
		}
	}

	/**
	 * Get bot information
	 */
	async getBotInfo(): Promise<TelegramBot.User> {
		return await this.bot.getMe();
	}

	/**
	 * Set webhook (if using webhooks instead of polling)
	 */
	async setWebhook(url: string): Promise<boolean> {
		return await this.bot.setWebHook(url);
	}

	/**
	 * Delete webhook
	 */
	async deleteWebhook(): Promise<boolean> {
		return await this.bot.deleteWebHook();
	}

	/**
	 * Send message directly to Telegram chat
	 * For holding messages during parallel processing
	 */
	public async sendMessage(chatId: string, message: string): Promise<boolean> {
		try {
			await this.bot.sendMessage(chatId, message, {
				parse_mode: "Markdown",
			});
			console.log(`✅ [Telegram] Direct message sent to ${chatId}`);
			return true;
		} catch (error) {
			console.error(`❌ [Telegram] Failed to send direct message:`, error);
			return false;
		}
	}
}
