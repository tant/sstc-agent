/**
 * Central message processor that handles messages from all channels
 * This is WHERE YOUR BUSINESS LOGIC LIVES
 */

import type { NormalizedMessage, ProcessedResponse } from '../models/message';



export class CentralMessageProcessor {
  private processingQueue: Array<{
    message: NormalizedMessage;
    resolve: (response: ProcessedResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private isProcessing: boolean = false;

  /**
   * Process a normalized message and return a response
   * THIS IS WHERE ALL YOUR BUSINESS LOGIC GOES
   */
  async processMessage(message: NormalizedMessage): Promise<ProcessedResponse> {
    // Example: Just echo the message content for now
    return {
      content: `Echo: ${message.content}`,
      contentType: 'text',
      metadata: { channel: message.channel.channelId }
    };
  }

  /**
   * Queue message for processing (for high-volume scenarios)
   */
  async queueMessage(message: NormalizedMessage): Promise<ProcessedResponse> {
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

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const item = this.processingQueue.shift();
      if (!item) continue;
      const { message, resolve, reject } = item;
      try {
        const response = await this.processMessage(message);
        resolve(response);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
      // Add small delay to prevent overwhelming the system
      await new Promise(res => setTimeout(res, 10));
    }

    this.isProcessing = false;
  }
}

// Export singleton instance
export const messageProcessor = new CentralMessageProcessor();
