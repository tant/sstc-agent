/**
 * Central message processor that handles messages from all channels
 * This is WHERE YOUR BUSINESS LOGIC LIVES
 */

import type { NormalizedMessage, ProcessedResponse } from '../models/message';
import { channelMessageWorkflow } from '../../workflows/message-processor';

export class CentralMessageProcessor {
  private processingQueue: Array<{
    message: NormalizedMessage;
    resolve: (response: ProcessedResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private isProcessing: boolean = false;
  private processedMessageIds: Set<string> = new Set(); // Thêm để deduplicate

  /**
   * Process a normalized message and return a response
   * THIS IS WHERE ALL YOUR BUSINESS LOGIC GOES
   */
  async processMessage(message: NormalizedMessage): Promise<ProcessedResponse> {
    const messageKey = `${message.channel.channelId}-${message.id}`;
    
    console.log('🔄 [Processor] Starting message processing', {
      messageKey,
      channelId: message.channel.channelId,
      messageId: message.id,
      senderId: message.sender.id,
      contentType: message.contentType,
      contentLength: message.content.length
    });
    
    // Kiểm tra nếu message đã được xử lý
    if (this.processedMessageIds.has(messageKey)) {
      console.log('🔄 [Processor] Message already processed, skipping', {
        messageKey,
        messageId: message.id,
        channelId: message.channel.channelId
      });
      // Trả về response mặc định
      return {
        content: 'Message already processed',
        contentType: 'text',
        metadata: { 
          processedBy: 'processor-duplicate-check',
          channelId: message.channel.channelId,
          originalMessageId: message.id
        }
      };
    }
    
    // Đánh dấu message đã được xử lý
    this.processedMessageIds.add(messageKey);
    console.log('🔄 [Processor] Processing message', {
      messageKey,
      channelId: message.channel.channelId,
      messageId: message.id,
      senderId: message.sender.id,
      contentType: message.contentType,
      content: message.content.substring(0, 50) + '...'
    });
    
    // Xóa message key sau 5 phút để tránh memory leak
    setTimeout(() => {
      console.log('🗑️ [Processor] Removing message from processed cache', { messageKey });
      this.processedMessageIds.delete(messageKey);
    }, 5 * 60 * 1000);
    
    try {
      // Use the Mastra workflow for processing
      console.log('🔄 [Processor] Creating workflow run for message processing');
      const run = await channelMessageWorkflow.createRunAsync();
      console.log('✅ [Processor] Workflow run created successfully');
      
      const workflowInput = {
        inputData: {
          channelId: message.channel.channelId as 'telegram' | 'whatsapp' | 'web' | 'zalo',
          message: {
            content: message.content,
            senderId: message.sender.id,
            timestamp: message.timestamp,
            attachments: message.attachments?.map(att => ({
              type: att.type,
              url: att.url,
              filename: att.filename
            }))
          }
        }
      };
      
      console.log('📤 [Processor] Starting workflow with input:', {
        channelId: workflowInput.inputData.channelId,
        messageLength: workflowInput.inputData.message.content.length,
        hasAttachments: !!workflowInput.inputData.message.attachments?.length,
        attachmentCount: workflowInput.inputData.message.attachments?.length || 0
      });
      
      const workflowResult = await run.start(workflowInput);

      console.log('📊 [Processor] Workflow execution completed', {
        status: workflowResult.status,
        hasResult: !!workflowResult.result,
        hasError: !!workflowResult.error
      });
      
      if (workflowResult.status === 'success') {
        const result = workflowResult.result;
        console.log('✅ [Processor] Message processed successfully via workflow', {
          responseLength: (result.response || result.text)?.length || 0,
          hasMetadata: !!result.metadata,
          metadataKeys: result.metadata ? Object.keys(result.metadata) : []
        });
        
        // Hiển thị user profile nếu có
        if (result.metadata && typeof result.metadata === 'object') {
          const userProfile = (result.metadata as any).userProfile;
          if (userProfile) {
            console.log('👤 [Processor] User Profile:', JSON.stringify(userProfile, null, 2));
          }
        }
        
        const responseContent = result.response || result.text || 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn.';
        console.log('📤 [Processor] Final response prepared', {
          contentLength: responseContent.length,
          contentType: result.contentType || 'text'
        });
        
        return {
          content: responseContent,
          contentType: result.contentType || 'text',
          metadata: {
            ...result.metadata,
            processedBy: 'workflow',
            channelId: message.channel.channelId
          }
        };
      } else {
        console.error('❌ [Processor] Workflow processing failed:', {
          error: workflowResult.error,
          status: workflowResult.status
        });
        return {
          content: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
          contentType: 'text',
          metadata: {
            error: workflowResult.error,
            processedBy: 'workflow-error',
            channelId: message.channel.channelId
          }
        };
      }
    } catch (error) {
      console.error('❌ [Processor] Error in processMessage:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return {
        content: 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        contentType: 'text',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          processedBy: 'processor-error',
          channelId: message.channel.channelId
        }
      };
    }
  }

  /**
   * Queue message for processing (for high-volume scenarios)
   */
  async queueMessage(message: NormalizedMessage): Promise<ProcessedResponse> {
    console.log('📥 [Processor] Queuing message', {
      channelId: message.channel.channelId,
      messageId: message.id
    });
    
    return new Promise((resolve, reject) => {
      this.processingQueue.push({ message, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    console.log('🔄 [Processor] Starting queue processing');
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const item = this.processingQueue.shift();
      if (!item) continue;
      const { message, resolve, reject } = item;
      
      try {
        console.log('🔄 Processing queued message', {
          channelId: message.channel.channelId,
          queueLength: this.processingQueue.length
        });
        
        const response = await this.processMessage(message);
        resolve(response);
      } catch (error) {
        console.error('❌ Error processing queued message:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
      
      // Add small delay to prevent overwhelming the system
      await new Promise(res => setTimeout(res, 10));
    }

    this.isProcessing = false;
    console.log('✅ [Processor] Queue processing completed');
  }
}

// Export singleton instance
export const messageProcessor = new CentralMessageProcessor();