/**
 * ChannelRegistry manages all channel adapters
 * Allows registration and lookup of adapters by channelId
 */

import type { ChannelAdapter } from './interface';

export class ChannelRegistry {
  private adapters: Map<string, ChannelAdapter> = new Map();

  registerAdapter(adapter: ChannelAdapter): void {
    if (this.adapters.has(adapter.channelId)) {
      throw new Error(`Adapter for channelId '${adapter.channelId}' already registered.`);
    }
    this.adapters.set(adapter.channelId, adapter);
  }

  getAdapter(channelId: string): ChannelAdapter | undefined {
    return this.adapters.get(channelId);
  }

  getAllAdapters(): ChannelAdapter[] {
    return Array.from(this.adapters.values());
  }

  async shutdownAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      if (adapter.shutdown) {
        await adapter.shutdown();
      }
    }
  }
}

// Export singleton instance
export const channelRegistry = new ChannelRegistry();
