/**
 * Channel registry for managing active channels
 * This keeps track of which channels are currently active
 */

import { ChannelAdapter } from './interface';

export class ChannelRegistry {
  private adapters = new Map<string, ChannelAdapter>();

  /**
   * Register a channel adapter
   */
  register(channelId: string, adapter: ChannelAdapter): void {
    this.adapters.set(channelId, adapter);
    console.log(`✅ Registered channel: ${channelId}`);
  }

  /**
   * Get a channel adapter by ID
   */
  get(channelId: string): ChannelAdapter | undefined {
    return this.adapters.get(channelId);
  }

  /**
   * Remove a channel adapter
   */
  unregister(channelId: string): boolean {
    const removed = this.adapters.delete(channelId);
    if (removed) {
      console.log(`📤 Unregistered channel: ${channelId}`);
    }
    return removed;
  }

  /**
   * List all registered channels
   */
  listChannels(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a channel is registered
   */
  has(channelId: string): boolean {
    return this.adapters.has(channelId);
  }

  /**
   * Shutdown all channels gracefully
   */
  async shutdownAll(): Promise<void> {
    console.log('🛑 Shutting down all channels...');
    const shutdownPromises: Promise<void>[] = [];

    for (const [channelId, adapter] of this.adapters) {
      if (adapter.shutdown) {
        shutdownPromises.push(adapter.shutdown());
      }
    }

    await Promise.all(shutdownPromises);
    this.adapters.clear();
    console.log('✅ All channels shut down');
  }
}

// Export singleton instance
export const channelRegistry = new ChannelRegistry();
