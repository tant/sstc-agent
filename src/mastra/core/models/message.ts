/**
 * Standardized message models for multi-channel processing
 * This is the common language ALL channels speak
 */

export interface ChannelUser {
  id: string;           // Channel-specific user ID
  username?: string;    // Username if available
  displayName?: string; // Display name
  phoneNumber?: string; // Phone number if available
  email?: string;       // Email if available
}

export interface ChannelContext {
  channelId: string;        // Channel identifier (telegram, whatsapp, web, etc.)
  channelMessageId?: string; // Channel-specific message ID
  threadId?: string;        // Conversation thread ID if supported
  metadata: Record<string, unknown>; // Channel-specific metadata
}

export interface NormalizedMessage {
  id: string; // Unique message ID (channel-specific or generated)
  content: string; // Message content (text, etc.)
  contentType: 'text' | 'image' | 'document' | string;
  sender: ChannelUser;
  timestamp: Date;
  channel: ChannelContext;
  replyToMessage?: {
    id: string;
    content: string;
  };
  attachments?: Array<{
    url: string;
    type: 'image' | 'document' | string;
    filename?: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface ProcessedResponse {
  content: string;
  contentType: 'text' | 'image' | 'document' | 'quick_reply' | string;
  attachments?: Array<{
    url: string;
    type: 'image' | 'document' | string;
    filename?: string;
  }>;
  quickReplies?: Array<{
    title: string;
    payload: string;
  }>;
  metadata?: Record<string, unknown>;
}
