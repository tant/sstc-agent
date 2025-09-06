/**
 * Enhanced Channel Registry
 * Manages active channels with persistent state checking and lock management
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ChannelAdapter } from "./interface";

interface ChannelState {
	channelId: string;
	adapterType: string;
	processId: number;
	timestamp: number;
	lockId: string;
	status: "initializing" | "active" | "shutting_down" | "inactive";
	metadata?: Record<string, any>;
}

interface RegistrationResult {
	success: boolean;
	reason?: string;
	conflictingProcess?: number;
	existingLock?: ChannelState;
}

export class ChannelRegistry {
	private adapters = new Map<string, ChannelAdapter>();
	private persistentStatePath: string;
	private channelStates = new Map<string, ChannelState>();
	private readonly STATE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

	constructor() {
		// Setup persistent state file
		const tempDir = os.tmpdir();
		this.persistentStatePath = path.join(tempDir, "sstc-channels-state.json");
		
		console.log("📋 [ChannelRegistry] State file path:", this.persistentStatePath);
		
		// Load existing state
		this.loadPersistentState();
		
		// Cleanup on exit
		process.on("exit", () => {
			this.cleanupCurrentProcessChannels();
		});
		
		process.on("SIGINT", () => {
			this.cleanupCurrentProcessChannels();
		});
		
		process.on("SIGTERM", () => {
			this.cleanupCurrentProcessChannels();
		});
	}

	/**
	 * Register a channel adapter (basic registration)
	 */
	register(channelId: string, adapter: ChannelAdapter): void {
		this.adapters.set(channelId, adapter);
		console.log(`✅ Registered channel: ${channelId}`);
	}

	/**
	 * Register channel with advanced conflict detection
	 */
	async registerWithLock(
		channelId: string, 
		adapter: ChannelAdapter,
		metadata?: Record<string, any>
	): Promise<RegistrationResult> {
		console.log("🔐 [ChannelRegistry] Attempting to register channel with lock:", {
			channelId,
			adapterType: adapter.constructor.name,
			pid: process.pid,
		});

		try {
			// Check for global conflicts
			const globalCheck = await this.checkGlobalConflict(channelId);
			if (!globalCheck.success) {
				return globalCheck;
			}

			// Create channel state
			const channelState: ChannelState = {
				channelId,
				adapterType: adapter.constructor.name,
				processId: process.pid,
				timestamp: Date.now(),
				lockId: `${process.pid}-${Date.now()}`,
				status: "initializing",
				metadata: {
					...metadata,
					startTime: new Date().toISOString(),
				},
			};

			// Set persistent lock
			await this.setPersistentState(channelId, channelState);

			// Register in base registry
			this.register(channelId, adapter);

			// Update status to active
			channelState.status = "active";
			channelState.timestamp = Date.now();
			await this.setPersistentState(channelId, channelState);

			// Store locally
			this.channelStates.set(channelId, channelState);

			console.log("✅ [ChannelRegistry] Channel registered successfully:", {
				channelId,
				lockId: channelState.lockId,
				pid: process.pid,
			});

			return { success: true };
		} catch (error) {
			console.error("❌ [ChannelRegistry] Registration failed:", error);
			return {
				success: false,
				reason: `Registration error: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	/**
	 * Get a channel adapter by ID
	 */
	get(channelId: string): ChannelAdapter | undefined {
		return this.adapters.get(channelId);
	}

	/**
	 * Remove a channel adapter (basic unregistration)
	 */
	unregister(channelId: string): boolean {
		const removed = this.adapters.delete(channelId);
		if (removed) {
			console.log(`📤 Unregistered channel: ${channelId}`);
		}
		return removed;
	}

	/**
	 * Unregister channel with cleanup
	 */
	async unregisterWithCleanup(channelId: string): Promise<boolean> {
		console.log("🧹 [ChannelRegistry] Unregistering channel with cleanup:", channelId);

		try {
			// Get current state
			const state = this.channelStates.get(channelId);
			if (state) {
				// Mark as shutting down
				state.status = "shutting_down";
				state.timestamp = Date.now();
				await this.setPersistentState(channelId, state);
			}

			// Get adapter for shutdown
			const adapter = this.get(channelId);
			if (adapter && adapter.shutdown && !adapter.isShutdown?.()) {
				await adapter.shutdown();
			}

			// Remove from base registry
			const removed = this.unregister(channelId);

			// Remove persistent state
			await this.removePersistentState(channelId);

			// Remove local state
			this.channelStates.delete(channelId);

			console.log("✅ [ChannelRegistry] Channel unregistered successfully:", channelId);
			return removed;
		} catch (error) {
			console.error("❌ [ChannelRegistry] Unregistration failed:", error);
			return false;
		}
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
	 * Check for global conflicts across processes
	 */
	private async checkGlobalConflict(channelId: string): Promise<RegistrationResult> {
		// Load latest state
		this.loadPersistentState();

		const existingState = this.getChannelState(channelId);
		if (!existingState) {
			return { success: true };
		}

		// Check if state is still valid
		if (await this.isStateValid(existingState)) {
			// Same process - allow update
			if (existingState.processId === process.pid) {
				console.log("🔄 [ChannelRegistry] Updating channel for same process");
				return { success: true };
			}

			// Different process - conflict
			console.error("⚠️ [ChannelRegistry] Channel conflict detected:", {
				channelId,
				existingPid: existingState.processId,
				currentPid: process.pid,
				existingStatus: existingState.status,
			});

			return {
				success: false,
				reason: "Channel already active in another process",
				conflictingProcess: existingState.processId,
				existingLock: existingState,
			};
		} else {
			console.log("🧹 [ChannelRegistry] Cleaning up stale channel state:", channelId);
			await this.removePersistentState(channelId);
			return { success: true };
		}
	}

	/**
	 * Set persistent state
	 */
	private async setPersistentState(channelId: string, state: ChannelState): Promise<void> {
		try {
			// Load current state
			const allStates = this.loadAllStates();
			
			// Update state for this channel
			allStates[channelId] = state;
			
			// Write back to file
			fs.writeFileSync(
				this.persistentStatePath, 
				JSON.stringify(allStates, null, 2),
				"utf8"
			);

			console.log("💾 [ChannelRegistry] State persisted:", {
				channelId,
				lockId: state.lockId,
				status: state.status,
			});
		} catch (error) {
			console.error("❌ [ChannelRegistry] Failed to set persistent state:", error);
			throw error;
		}
	}

	/**
	 * Remove persistent state
	 */
	private async removePersistentState(channelId: string): Promise<void> {
		try {
			const allStates = this.loadAllStates();
			delete allStates[channelId];
			
			fs.writeFileSync(
				this.persistentStatePath,
				JSON.stringify(allStates, null, 2),
				"utf8"
			);

			console.log("🗑️ [ChannelRegistry] State removed:", channelId);
		} catch (error) {
			console.warn("⚠️ [ChannelRegistry] Failed to remove persistent state:", error);
		}
	}

	/**
	 * Load persistent state from file
	 */
	private loadPersistentState(): void {
		try {
			if (!fs.existsSync(this.persistentStatePath)) {
				return;
			}

			const stateData = fs.readFileSync(this.persistentStatePath, "utf8");
			const allStates = JSON.parse(stateData);

			// Update local states
			this.channelStates.clear();
			for (const [channelId, state] of Object.entries(allStates)) {
				this.channelStates.set(channelId, state as ChannelState);
			}

			console.log("📂 [ChannelRegistry] Persistent state loaded:", {
				channelCount: this.channelStates.size,
			});
		} catch (error) {
			console.warn("⚠️ [ChannelRegistry] Failed to load persistent state:", error);
		}
	}

	/**
	 * Load all states from file
	 */
	private loadAllStates(): Record<string, ChannelState> {
		try {
			if (!fs.existsSync(this.persistentStatePath)) {
				return {};
			}

			const stateData = fs.readFileSync(this.persistentStatePath, "utf8");
			return JSON.parse(stateData);
		} catch (error) {
			console.warn("⚠️ [ChannelRegistry] Failed to load all states:", error);
			return {};
		}
	}

	/**
	 * Get channel state
	 */
	private getChannelState(channelId: string): ChannelState | null {
		return this.channelStates.get(channelId) || null;
	}

	/**
	 * Check if channel state is still valid
	 */
	private async isStateValid(state: ChannelState): Promise<boolean> {
		// Check timeout
		const now = Date.now();
		if (now - state.timestamp > this.STATE_TIMEOUT_MS) {
			console.log("⏰ [ChannelRegistry] State expired due to timeout:", state.channelId);
			return false;
		}

		// Check if process still exists
		try {
			process.kill(state.processId, 0);
			return true;
		} catch (error) {
			console.log("💀 [ChannelRegistry] Process no longer exists:", {
				channelId: state.channelId,
				pid: state.processId,
			});
			return false;
		}
	}

	/**
	 * Cleanup channels for current process
	 */
	private cleanupCurrentProcessChannels(): void {
		console.log("🧹 [ChannelRegistry] Cleaning up channels for current process:", process.pid);

		try {
			const allStates = this.loadAllStates();
			const updatedStates: Record<string, ChannelState> = {};

			// Remove states for current process
			for (const [channelId, state] of Object.entries(allStates)) {
				if (state.processId !== process.pid) {
					updatedStates[channelId] = state;
				} else {
					console.log("🗑️ [ChannelRegistry] Removing state for:", channelId);
				}
			}

			// Write updated states
			fs.writeFileSync(
				this.persistentStatePath,
				JSON.stringify(updatedStates, null, 2),
				"utf8"
			);

			console.log("✅ [ChannelRegistry] Process cleanup completed");
		} catch (error) {
			console.error("❌ [ChannelRegistry] Cleanup failed:", error);
		}
	}

	/**
	 * Get all channel states
	 */
	getAllStates(): Map<string, ChannelState> {
		this.loadPersistentState();
		return new Map(this.channelStates);
	}

	/**
	 * Force cleanup of stale states
	 */
	async cleanupStaleStates(): Promise<void> {
		console.log("🧹 [ChannelRegistry] Cleaning up stale states");

		const allStates = this.loadAllStates();
		const validStates: Record<string, ChannelState> = {};

		for (const [channelId, state] of Object.entries(allStates)) {
			if (await this.isStateValid(state)) {
				validStates[channelId] = state;
			} else {
				console.log("🗑️ [ChannelRegistry] Removing stale state:", channelId);
			}
		}

		// Write cleaned states
		fs.writeFileSync(
			this.persistentStatePath,
			JSON.stringify(validStates, null, 2),
			"utf8"
		);

		console.log("✅ [ChannelRegistry] Stale state cleanup completed");
	}

	/**
	 * Shutdown all channels gracefully
	 */
	async shutdownAll(): Promise<void> {
		console.log("🛑 Shutting down all channels...");
		const shutdownPromises: Promise<void>[] = [];

		for (const [channelId, adapter] of Array.from(this.adapters.entries())) {
			// Check if adapter has isShutdown method and is already shutdown
			if (adapter.isShutdown?.()) {
				console.log(`⚠️ Channel ${channelId} already shutdown, skipping...`);
				continue;
			}

			if (adapter.shutdown) {
				console.log(`🔄 Shutting down channel: ${channelId}`);
				shutdownPromises.push(adapter.shutdown());
			}
		}

		await Promise.all(shutdownPromises);
		this.adapters.clear();

		// Cleanup all states for current process
		this.cleanupCurrentProcessChannels();

		console.log("✅ All channels shut down");
	}
}

// Export singleton instance
export const channelRegistry = new ChannelRegistry();
