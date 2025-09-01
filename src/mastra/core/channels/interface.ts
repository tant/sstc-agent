/**
 * Channel adapter interface
 * This defines what all channel adapters must implement
 */

export interface ChannelAdapter {
  channelId: string;
  handleMessage: (rawMessage: any) => Promise<void>;
  shutdown?: () => Promise<void>;
  isShutdown?: () => boolean;
}
