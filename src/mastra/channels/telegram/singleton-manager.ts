/**
 * Telegram Singleton Manager
 * Đảm bảo chỉ có 1 instance Telegram Bot active trong toàn system
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import TelegramBot from "node-telegram-bot-api";
import type { TelegramConfig } from "./config";

interface BotLockInfo {
	pid: number;
	processName: string;
	timestamp: number;
	botToken: string; // Hash of token for identification
	lockId: string;
}

export class TelegramSingletonManager {
	private static instance: TelegramSingletonManager;
	private botInstance: TelegramBot | null = null;
	private lockFilePath: string;
	private currentLock: BotLockInfo | null = null;
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private isActive: boolean = false;

	// Lock timeout (5 minutes) - sau đó assume process đã dead
	private readonly LOCK_TIMEOUT_MS = 5 * 60 * 1000;
	private readonly HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds

	private constructor() {
		// Tạo lock file trong system temp directory
		const tempDir = os.tmpdir();
		this.lockFilePath = path.join(tempDir, "sstc-telegram-bot.lock");
		
		console.log("🔒 [TelegramSingleton] Lock file path:", this.lockFilePath);
		
		// Cleanup khi process exit
		process.on("exit", () => {
			this.releaseLock();
		});
		
		process.on("SIGINT", () => {
			this.releaseLock();
			process.exit(0);
		});
		
		process.on("SIGTERM", () => {
			this.releaseLock();
			process.exit(0);
		});
	}

	/**
	 * Get singleton instance (process-level)
	 */
	static getInstance(): TelegramSingletonManager {
		if (!TelegramSingletonManager.instance) {
			TelegramSingletonManager.instance = new TelegramSingletonManager();
		}
		return TelegramSingletonManager.instance;
	}

	/**
	 * Check if lock can be acquired (pre-validation)
	 */
	async canAcquireLock(config: TelegramConfig): Promise<{
		canAcquire: boolean;
		reason?: string;
		existingLock?: BotLockInfo;
		lockAge?: number;
	}> {
		try {
			if (!fs.existsSync(this.lockFilePath)) {
				return { canAcquire: true };
			}

			const existingLock = await this.readLockFile();
			if (!existingLock) {
				return { canAcquire: true };
			}

			const lockAge = Date.now() - existingLock.timestamp;
			const isValid = await this.isLockValid(existingLock);

			if (!isValid) {
				return { canAcquire: true, reason: "Stale lock detected" };
			}

			if (existingLock.botToken === this.hashToken(config.token) && 
				existingLock.pid !== process.pid) {
				return {
					canAcquire: false,
					reason: "Same bot token in use by another process",
					existingLock,
					lockAge,
				};
			}

			if (existingLock.pid === process.pid) {
				return { canAcquire: true, reason: "Same process can reuse lock" };
			}

			return { canAcquire: true };
		} catch (_error) {
			return { canAcquire: true, reason: "Lock check failed, assuming available" };
		}
	}

	/**
	 * Acquire system-wide lock with atomic operations
	 */
	async acquireLock(config: TelegramConfig): Promise<boolean> {
		const lockInfo: BotLockInfo = {
			pid: process.pid,
			processName: process.title || "node",
			timestamp: Date.now(),
			botToken: this.hashToken(config.token),
			lockId: `${process.pid}-${Date.now()}`,
		};

		console.log("🔒 [TelegramSingleton] Attempting to acquire lock:", {
			pid: lockInfo.pid,
			processName: lockInfo.processName,
			lockId: lockInfo.lockId,
		});

		try {
			// Atomic check and write
			const tempLockPath = `${this.lockFilePath}.tmp.${process.pid}`;
			
			// Pre-validation
			const canAcquire = await this.canAcquireLock(config);
			if (!canAcquire.canAcquire) {
				console.error("❌ [TelegramSingleton] Cannot acquire lock:", canAcquire.reason);
				return false;
			}

			// Write lock atomically using temp file
			fs.writeFileSync(tempLockPath, JSON.stringify(lockInfo, null, 2));
			fs.renameSync(tempLockPath, this.lockFilePath);
			
			this.currentLock = lockInfo;
			this.isActive = true;

			// Start health monitoring
			this.startHealthCheck();

			console.log("✅ [TelegramSingleton] Lock acquired successfully:", {
				lockId: lockInfo.lockId,
				pid: lockInfo.pid,
			});

			return true;
		} catch (error) {
			console.error("❌ [TelegramSingleton] Failed to acquire lock:", error);
			return false;
		}
	}

	/**
	 * Release system-wide lock
	 */
	async releaseLock(): Promise<void> {
		if (!this.isActive || !this.currentLock) {
			return;
		}

		console.log("🔓 [TelegramSingleton] Releasing lock:", {
			lockId: this.currentLock.lockId,
			pid: this.currentLock.pid,
		});

		try {
			// Stop health monitoring
			if (this.healthCheckInterval) {
				clearInterval(this.healthCheckInterval);
				this.healthCheckInterval = null;
			}

			// Shutdown bot if active
			if (this.botInstance) {
				await this.shutdownBot();
			}

			// Remove lock file
			await this.removeLockFile();
			
			this.currentLock = null;
			this.isActive = false;

			console.log("✅ [TelegramSingleton] Lock released successfully");
		} catch (error) {
			console.error("❌ [TelegramSingleton] Error releasing lock:", error);
		}
	}

	/**
	 * Create bot instance with singleton enforcement
	 */
	async createBot(config: TelegramConfig): Promise<TelegramBot | null> {
		if (!this.isActive || !this.currentLock) {
			console.error("❌ [TelegramSingleton] Cannot create bot - no active lock");
			return null;
		}

		if (this.botInstance) {
			console.log("♻️ [TelegramSingleton] Returning existing bot instance");
			return this.botInstance;
		}

		try {
			console.log("🤖 [TelegramSingleton] Creating new bot instance");
			
			const botOptions: TelegramBot.ConstructorOptions = {
				polling: config.polling ?? true,
				request: {
					url: "",
					family: 4, // Force IPv4
				},
			};

			if (config.pollingInterval) {
				botOptions.polling = {
					interval: config.pollingInterval,
				};
			}

			// @ts-expect-error - TelegramBot default export issue
			this.botInstance = new (TelegramBot as any)(config.token, botOptions);

			// Test connection
			const botInfo = await this.botInstance.getMe();
			console.log("✅ [TelegramSingleton] Bot connected successfully:", {
				username: botInfo.username,
				firstName: botInfo.first_name,
				id: botInfo.id,
			});

			// Setup error handlers
			this.botInstance.on("polling_error", (error: any) => {
				console.error("❌ [TelegramSingleton] Bot polling error:", error);
				this.handleBotError(error);
			});

			this.botInstance.on("webhook_error", (error: any) => {
				console.error("❌ [TelegramSingleton] Bot webhook error:", error);
				this.handleBotError(error);
			});

			return this.botInstance;
		} catch (error) {
			console.error("❌ [TelegramSingleton] Failed to create bot:", error);
			this.botInstance = null;
			return null;
		}
	}

	/**
	 * Get current bot instance (if exists)
	 */
	getBotInstance(): TelegramBot | null {
		return this.botInstance;
	}

	/**
	 * Check if manager has active lock
	 */
	isLocked(): boolean {
		return this.isActive && this.currentLock !== null;
	}

	/**
	 * Get lock information
	 */
	getLockInfo(): BotLockInfo | null {
		return this.currentLock;
	}

	/**
	 * Read lock file
	 */
	private async readLockFile(): Promise<BotLockInfo | null> {
		try {
			if (!fs.existsSync(this.lockFilePath)) {
				return null;
			}

			const lockData = fs.readFileSync(this.lockFilePath, "utf8");
			return JSON.parse(lockData);
		} catch (error) {
			console.warn("⚠️ [TelegramSingleton] Failed to read lock file:", error);
			return null;
		}
	}

	/**
	 * Write lock file
	 */
	private async writeLockFile(lockInfo: BotLockInfo): Promise<void> {
		try {
			fs.writeFileSync(this.lockFilePath, JSON.stringify(lockInfo, null, 2), "utf8");
		} catch (error) {
			console.error("❌ [TelegramSingleton] Failed to write lock file:", error);
			throw error;
		}
	}

	/**
	 * Remove lock file
	 */
	private async removeLockFile(): Promise<void> {
		try {
			if (fs.existsSync(this.lockFilePath)) {
				fs.unlinkSync(this.lockFilePath);
			}
		} catch (error) {
			console.warn("⚠️ [TelegramSingleton] Failed to remove lock file:", error);
		}
	}

	/**
	 * Check if lock is still valid
	 */
	private async isLockValid(lockInfo: BotLockInfo): Promise<boolean> {
		// Check timeout
		const now = Date.now();
		if (now - lockInfo.timestamp > this.LOCK_TIMEOUT_MS) {
			console.log("⏰ [TelegramSingleton] Lock expired due to timeout");
			return false;
		}

		// Check if process still exists
		try {
			// Send signal 0 to check if process exists
			process.kill(lockInfo.pid, 0);
			return true;
		} catch (_error) {
			console.log("💀 [TelegramSingleton] Process no longer exists:", lockInfo.pid);
			return false;
		}
	}

	/**
	 * Hash token for identification (security)
	 */
	private hashToken(token: string): string {
		const crypto = require("node:crypto");
		return crypto.createHash("sha256").update(token).digest("hex").substring(0, 16);
	}

	/**
	 * Start health check monitoring
	 */
	private startHealthCheck(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		this.healthCheckInterval = setInterval(async () => {
			await this.performHealthCheck();
		}, this.HEALTH_CHECK_INTERVAL);

		console.log("💓 [TelegramSingleton] Health monitoring started");
	}

	/**
	 * Perform health check
	 */
	private async performHealthCheck(): Promise<void> {
		try {
			if (!this.currentLock) {
				return;
			}

			// Update lock timestamp
			this.currentLock.timestamp = Date.now();
			await this.writeLockFile(this.currentLock);

			// Test bot connection if exists
			if (this.botInstance) {
				await this.botInstance.getMe();
			}

			console.log("💓 [TelegramSingleton] Health check passed");
		} catch (error) {
			console.error("❌ [TelegramSingleton] Health check failed:", error);
			this.handleBotError(error);
		}
	}

	/**
	 * Handle bot errors
	 */
	private async handleBotError(error: any): Promise<void> {
		console.error("🚨 [TelegramSingleton] Bot error detected:", error);

		// If critical error, release lock and shutdown
		if (error?.code === "EFATAL" || error?.message?.includes("401")) {
			console.error("💥 [TelegramSingleton] Critical error - releasing lock");
			await this.releaseLock();
		}
	}

	/**
	 * Shutdown bot instance
	 */
	private async shutdownBot(): Promise<void> {
		if (!this.botInstance) {
			return;
		}

		try {
			console.log("🛑 [TelegramSingleton] Shutting down bot instance");
			
			// Stop polling
			this.botInstance.stopPolling();
			
			// Delete webhook if exists
			await this.botInstance.deleteWebHook();
			
			this.botInstance = null;
			
			console.log("✅ [TelegramSingleton] Bot instance shutdown complete");
		} catch (error) {
			console.error("❌ [TelegramSingleton] Error shutting down bot:", error);
			this.botInstance = null; // Force cleanup
		}
	}
}