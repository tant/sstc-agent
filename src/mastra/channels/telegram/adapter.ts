/**
 * Telegram channel adapter for Mastra framework
 * INTEGRATES with existing maiSale agent and message workflows
 */

import { mastra } from '../../mastra';
import { channelMessageWorkflow } from '../../workflows/message-processor';
import { validateTelegramConfig, TelegramConfig } from './config';
import { ChannelAdapter } from '../../core/channels/interface';
import { NormalizedMessage, ProcessedResponse } from '../../core/models/message';
import { messageProcessor } from '../../core/processor/message-processor';
import TelegramBot from 'node-telegram-bot-api';

export class TelegramChannelAdapter implements ChannelAdapter {
  private bot: TelegramBot;
  private config: TelegramConfig;

  channelId = 'telegram';

  constructor(config: Partial<TelegramConfig>) {
    console.log('🔧 [Telegram] Initializing adapter with config', {
      hasToken: !!config.token,
      polling: config.polling ?? true,
      pollingInterval: config.pollingInterval
    });

    // Use existing validation function
    this.config = validateTelegramConfig(config);

    // Initialize Telegram bot
    const botOptions: TelegramBot.ConstructorOptions = {
      polling: this.config.polling ?? true
    };

    if (this.config.pollingInterval) {
      botOptions.polling = {
        interval: this.config.pollingInterval
      };
    }

    console.log(`🔍 [Telegram] Creating bot with token: ${this.config.token.substring(0, 5)}...`);
    this.bot = new TelegramBot(this.config.token, botOptions);

    // Set up message handlers
    this.setupMessageHandlers();

    console.log('✅ [Telegram] Adapter initialized successfully');
  }

  /**
   * Set up Telegram message handlers
   */
  private setupMessageHandlers(): void {
    console.log('⚙️ [Telegram] Setting up message handlers');

    // Text messages
    this.bot.on('message', this.handleTelegramMessage.bind(this));
    console.log('📝 [Telegram] Text message handler registered');

    // Callback queries (button presses)
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
    console.log('⌨️ [Telegram] Callback query handler registered');

    // Photo messages
    this.bot.on('photo', this.handlePhotoMessage.bind(this));
    console.log('🖼️ [Telegram] Photo message handler registered');

    // Document messages
    this.bot.on('document', this.handleDocumentMessage.bind(this));
    console.log('📄 [Telegram] Document message handler registered');

    // Voice messages
    this.bot.on('voice', this.handleVoiceMessage.bind(this));
    console.log('🎤 [Telegram] Voice message handler registered');

    // Error handling
    this.bot.on('polling_error', (error) => {
      console.error('❌ [Telegram] Polling error:', error);
    });

    this.bot.on('webhook_error', (error) => {
      console.error('❌ [Telegram] Webhook error:', error);
    });

    console.log('✅ [Telegram] All message handlers set up');
  }

  /**
   * Normalize Telegram message to Mastra workflow format
   */
  private normalizeMessage(telegramMessage: TelegramBot.Message): {
    content: string;
    senderId: string;
    timestamp: Date;
    messageId: string;
    chatId: string;
    attachments?: Array<{
      type: string;
      url: string;
      filename?: string;
    }>;
  } {
    console.log('📝 [Telegram] Normalizing message', {
      messageId: telegramMessage.message_id,
      hasText: !!telegramMessage.text,
      hasPhoto: !!telegramMessage.photo,
      hasDocument: !!telegramMessage.document,
      hasVoice: !!telegramMessage.voice
    });

    const normalized = {
      content: telegramMessage.text || '[Unsupported message type]',
      senderId: telegramMessage.from?.id.toString() || 'unknown',
      timestamp: new Date(telegramMessage.date * 1000),
      messageId: telegramMessage.message_id.toString(),
      chatId: telegramMessage.chat.id.toString(),
      attachments: telegramMessage.photo ? [{
        type: 'photo',
        url: `https://api.telegram.org/file/bot${this.bot.token}/${telegramMessage.photo[0].file_id}`,
        filename: `telegram_photo_${telegramMessage.photo[0].file_id}.jpg`
      }] : telegramMessage.document ? [{
        type: 'document',
        url: `https://api.telegram.org/file/bot${this.bot.token}/${telegramMessage.document.file_id}`,
        filename: telegramMessage.document.file_name
      }] : undefined
    };

    console.log('✅ [Telegram] Message normalized', {
      contentLength: normalized.content.length,
      hasAttachments: !!normalized.attachments
    });

    return normalized;
  }

  /**
   * Handle Telegram message through Mastra Workflow
   */
  private async handleTelegramMessage(telegramMessage: TelegramBot.Message): Promise<void> {
    console.log('📥 [Telegram] Received message:', {
      messageId: telegramMessage.message_id,
      chatId: telegramMessage.chat.id,
      from: {
        id: telegramMessage.from?.id,
        username: telegramMessage.from?.username,
        firstName: telegramMessage.from?.first_name
      },
      text: telegramMessage.text?.substring(0, 50) + '...',
      timestamp: new Date(telegramMessage.date * 1000).toISOString()
    });

    // Ignore messages from bots
    if (telegramMessage.from?.is_bot) {
      console.log('🤖 [Telegram] Ignoring bot message');
      return;
    }

    // Check if chat type is allowed
    if (this.config.allowedChatTypes &&
        !this.config.allowedChatTypes.includes(telegramMessage.chat.type as any)) {
      console.log(`🚫 [Telegram] Ignoring message from disallowed chat type: ${telegramMessage.chat.type}`);
      return;
    }

    try {
      // Normalize message using shared types
      const normalizedMessage = this.normalizeMessage(telegramMessage);
      console.log('📝 [Telegram] Normalized message:', {
        id: normalizedMessage.messageId,
        senderId: normalizedMessage.senderId,
        contentLength: normalizedMessage.content.length,
        hasAttachments: !!normalizedMessage.attachments
      });

      // Validate the message
      if (!this.validateMessage(normalizedMessage)) {
        console.log('❌ [Telegram] Message validation failed');
        await this.sendResponseViaBot('Xin lỗi, tôi không thể xử lý tin nhắn của bạn. Vui lòng thử lại.', telegramMessage);
        return;
      }

      console.log('✅ [Telegram] Message validation passed');

      // Create standardized message format
      const standardizedMessage = {
        id: normalizedMessage.messageId,
        content: normalizedMessage.content,
        contentType: 'text',
        sender: {
          id: normalizedMessage.senderId,
          username: telegramMessage.from?.username,
          displayName: telegramMessage.from?.first_name || telegramMessage.from?.username || 'Unknown User'
        },
        timestamp: normalizedMessage.timestamp,
        channel: {
          channelId: 'telegram',
          channelMessageId: normalizedMessage.messageId,
          metadata: {
            chatId: normalizedMessage.chatId,
            messageType: telegramMessage.text ? 'text' : 
                        telegramMessage.photo ? 'photo' : 
                        telegramMessage.document ? 'document' : 
                        telegramMessage.voice ? 'voice' : 'unknown'
          }
        },
        attachments: normalizedMessage.attachments
      };

      console.log('🔄 [Telegram] Sending to central processor:', {
        messageId: standardizedMessage.id,
        channelId: standardizedMessage.channel.channelId
      });

      // Process through central message processor
      const response = await messageProcessor.processMessage(standardizedMessage);
      
      console.log('📤 [Telegram] Received response from processor:', {
        contentType: response.contentType,
        contentLength: response.content.length
      });

      // Transform response for Telegram
      const telegramResponse = {
        response: response.content,
        contentType: response.contentType,
        metadata: response.metadata
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
   */
  private async sendResponse(response: any, originalMessage: TelegramBot.Message): Promise<void> {
    const chatId = originalMessage.chat.id.toString();
    
    if (!chatId) {
      throw new Error('No chat ID found for Telegram response');
    }

    console.log('📤 [Telegram] Sending response to chat', {
      chatId,
      contentType: response.contentType,
      contentLength: response.response?.length || response.text?.length
    });

    try {
      // Handle different response types
      if (response.contentType === 'quick_reply' && response.quickReplies && response.quickReplies.length > 0) {
        console.log('⌨️ [Telegram] Sending quick reply buttons');
        // Send message with quick replies (inline keyboard)
        const keyboard = {
          inline_keyboard: response.quickReplies.map((reply: any) => [{
            text: reply.title,
            callback_data: reply.payload
          }])
        };
        
        await this.bot.sendMessage(chatId, response.response || response.text, {
          reply_markup: keyboard
        });
      } else if (response.contentType === 'image' && response.attachments && response.attachments.length > 0) {
        console.log('🖼️ [Telegram] Sending image response');
        // Send image with caption
        const imageUrl = response.attachments[0].url;
        await this.bot.sendPhoto(chatId, imageUrl, {
          caption: response.response || response.text
        });
      } else if (response.contentType === 'document' && response.attachments && response.attachments.length > 0) {
        console.log('📄 [Telegram] Sending document response');
        // Send document with caption
        const docUrl = response.attachments[0].url;
        await this.bot.sendDocument(chatId, docUrl, {}, {
          caption: response.response || response.text
        });
      } else {
        // Default text message
        const messageText = response.response || response.text || 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn.';
        console.log('💬 [Telegram] Sending text response', {
          textLength: messageText.length
        });
        
        await this.bot.sendMessage(chatId, messageText, {
          parse_mode: 'Markdown',
          reply_to_message_id: originalMessage.message_id
        });
      }
      
      console.log(`✅ [Telegram] Response sent successfully to chat ${chatId}`);
    } catch (error) {
      console.error(`❌ [Telegram] Error sending response to chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Send response via Telegram bot (simplified)
   */
  private async sendResponseViaBot(message: string, originalMessage: TelegramBot.Message): Promise<void> {
    const chatId = originalMessage.chat.id.toString();
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_to_message_id: originalMessage.message_id
      });
    } catch (error) {
      console.error('❌ Failed to send Telegram response:', error);
    }
  }

  /**
   * Handle photo messages
   */
  private async handlePhotoMessage(photo: TelegramBot.Message): Promise<void> {
    // Process photo message directly
    await this.handleTelegramMessage(photo);
  }

  /**
   * Handle document messages
   */
  private async handleDocumentMessage(document: TelegramBot.Message): Promise<void> {
    // Process document message directly
    await this.handleTelegramMessage(document);
  }

  /**
   * Handle voice messages
   */
  private async handleVoiceMessage(voice: TelegramBot.Message): Promise<void> {
    // Process voice message directly
    await this.handleTelegramMessage(voice);
  }

  /**
   * Handle callback queries (button presses)
   */
  private async handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
    try {
      // Acknowledge the callback
      await this.bot.answerCallbackQuery(callbackQuery.id);

      // Create a synthetic message for the callback
      if (callbackQuery.message) {
        const syntheticMessage: TelegramBot.Message = {
          ...callbackQuery.message,
          text: callbackQuery.data || 'Button pressed',
          from: callbackQuery.from
        };

        await this.handleTelegramMessage(syntheticMessage);
      }
    } catch (error) {
      console.error('❌ Error handling Telegram callback query:', error);
    }
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(error: any, originalMessage: TelegramBot.Message): Promise<void> {
    try {
      const chatId = originalMessage.chat.id.toString();
      await this.bot.sendMessage(
        chatId,
        `Sorry, I encountered an error: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (sendError) {
      console.error('❌ Failed to send error response:', sendError);
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
    console.log('🔍 [Telegram] Validating message', {
      messageId: message.messageId,
      senderId: message.senderId,
      contentLength: message.content.length
    });

    // Check if message content is not empty
    if (!message.content || message.content.trim().length === 0) {
      console.log('❌ [Telegram] Message validation failed: Empty content');
      return false;
    }

    // Check if sender information is present
    if (!message.senderId || message.senderId === 'unknown') {
      console.log('❌ [Telegram] Message validation failed: Missing sender ID');
      return false;
    }

    // Check message length against channel limits (Telegram limit: 4096)
    if (message.content.length > 4096) {
      console.log('❌ [Telegram] Message validation failed: Message too long', {
        length: message.content.length,
        limit: 4096
      });
      return false;
    }

    console.log('✅ [Telegram] Message validation passed');
    return true;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 [Telegram] Shutting down adapter...');
    try {
      // Stop polling
      this.bot.stopPolling();
      
      // Delete webhook if exists
      await this.bot.deleteWebHook();
      
      console.log('✅ [Telegram] Adapter shut down successfully');
    } catch (error) {
      console.error('❌ [Telegram] Error shutting down adapter:', error);
    }
  }

  /**
   * Handle incoming message - implements ChannelAdapter interface
   */
  async handleMessage(rawMessage: any): Promise<void> {
    // This method would be called by the registry or webhook handler
    // For polling-based Telegram, messages are handled automatically
    // But we implement it for consistency with the interface
    console.log('📥 Handling Telegram message:', rawMessage);

    if (rawMessage && typeof rawMessage === 'object' && rawMessage.message_id) {
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
}