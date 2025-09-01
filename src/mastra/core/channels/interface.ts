/**
 * Channel adapter interface
 * This defines what all channel adapters must implement
 */

import { NormalizedMessage } from '../../core/models/message';

export interface ChannelAdapter {
  channelId: string;
  handleMessage: (rawMessage: any) => Promise<void>;
  shutdown?: () => Promise<void>;
  isShutdown?: () => boolean;
}
