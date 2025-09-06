import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { anDataAnalyst } from "./agents/an-data-analyst";
import { bareboneSpecialist } from "./agents/barebone-specialist";
import { clarificationAgent } from "./agents/clarification-agent";
import { cpuSpecialist } from "./agents/cpu-specialist";
import { desktopSpecialist } from "./agents/desktop-specialist";
import { maiSale } from "./agents/mai-agent";
import { ramSpecialist } from "./agents/ram-specialist";
import { ssdSpecialist } from "./agents/ssd-specialist";
import { TelegramChannelAdapter } from "./channels/telegram/adapter";
import { ZaloChannelAdapter } from "./channels/zalo";
import { channelRegistry } from "./core/channels/registry";
import { signalHandlerManager } from "./core/optimized-processing";
import { channelMessageWorkflow } from "./workflows/message-processor";

export const mastra = new Mastra({
	workflows: {
		channelMessageWorkflow,
	},
	agents: {
		maiSale,
		anDataAnalyst,
		clarification: clarificationAgent,
		ram: ramSpecialist,
		cpu: cpuSpecialist,
		ssd: ssdSpecialist,
		barebone: bareboneSpecialist,
		desktop: desktopSpecialist,
	},
	storage: new LibSQLStore({
		// stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
		url: ":memory:",
	}),
	logger: new PinoLogger({
		name: "Mastra",
		level: "debug",
	}),
});

// Initialize Telegram channel (singleton-managed)
let telegramCleanup: (() => Promise<void>) | null = null;
let telegramAdapter: TelegramChannelAdapter | null = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
	console.log("🔍 [Mastra] Attempting to initialize Telegram channel...");
	
	// Clean up stale states first
	channelRegistry.cleanupStaleStates().catch(error => {
		console.warn("⚠️ [Mastra] Failed to cleanup stale states:", error);
	});

	// Use factory method with singleton enforcement
	TelegramChannelAdapter.create({
		token: process.env.TELEGRAM_BOT_TOKEN,
		polling: true,
		pollingInterval: 2000, // 2 second polling
	}).then(async (adapter) => {
		if (adapter) {
			telegramAdapter = adapter;
			
			// Register with enhanced registry (with conflict detection)
			const registrationResult = await channelRegistry.registerWithLock(
				"telegram",
				adapter,
				{
					initTime: new Date().toISOString(),
					token: `${process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10)}...`,
					polling: true,
				}
			);

			if (registrationResult.success) {
				console.log("✅ [Mastra] Telegram channel registered successfully");
				
				// Store cleanup function
				telegramCleanup = async () => {
					console.log("🧹 [Mastra] Cleaning up Telegram channel...");
					if (telegramAdapter) {
						await channelRegistry.unregisterWithCleanup("telegram");
					}
				};
			} else {
				console.error("❌ [Mastra] Failed to register Telegram channel:", {
					reason: registrationResult.reason,
					conflictingProcess: registrationResult.conflictingProcess,
				});
				
				// Shutdown the adapter since registration failed
				await adapter.shutdown();
				telegramAdapter = null;
			}
		} else {
			console.error("❌ [Mastra] Failed to create Telegram adapter");
		}
	}).catch(error => {
		console.error("❌ [Mastra] Error initializing Telegram channel:", error);
	});
}

// Initialize Zalo channel when Mastra starts (if credentials are provided)
let zaloCleanup: (() => Promise<void>) | null = null;
let zaloAdapter: ZaloChannelAdapter | null = null;

if (
	process.env.ZALO_COOKIE &&
	process.env.ZALO_IMEI &&
	process.env.ZALO_USER_AGENT
) {
	console.log("🔍 [Mastra] Attempting to initialize Zalo channel...");
	
	// Clean up stale states first
	channelRegistry.cleanupStaleStates().catch(error => {
		console.warn("⚠️ [Mastra] Failed to cleanup stale states:", error);
	});

	// Use factory method with singleton enforcement
	ZaloChannelAdapter.create({
		cookie: process.env.ZALO_COOKIE,
		imei: process.env.ZALO_IMEI,
		userAgent: process.env.ZALO_USER_AGENT,
		selfListen: process.env.ZALO_SELF_LISTEN === "true",
		checkUpdate: process.env.ZALO_CHECK_UPDATE !== "false",
		logging: process.env.ZALO_LOGGING !== "false",
	}).then(async (adapter) => {
		if (adapter) {
			zaloAdapter = adapter;
			
			// Register with enhanced registry (with conflict detection)
			const registrationResult = await channelRegistry.registerWithLock(
				"zalo",
				adapter,
				{
					initTime: new Date().toISOString(),
					cookie: `${process.env.ZALO_COOKIE?.substring(0, 20)}...`,
					polling: true,
				}
			);

			if (registrationResult.success) {
				console.log("✅ [Mastra] Zalo channel registered successfully");
				
				// Store cleanup function
				zaloCleanup = async () => {
					console.log("🧹 [Mastra] Cleaning up Zalo channel...");
					if (zaloAdapter) {
						await channelRegistry.unregisterWithCleanup("zalo");
					}
				};
			} else {
				console.error("❌ [Mastra] Failed to register Zalo channel:", {
					reason: registrationResult.reason,
					conflictingProcess: registrationResult.conflictingProcess,
				});
				
				// Shutdown the adapter since registration failed
				await adapter.shutdown();
				zaloAdapter = null;
			}
		} else {
			console.error("❌ [Mastra] Failed to create Zalo adapter");
		}
	}).catch(error => {
		console.error("❌ [Mastra] Error initializing Zalo channel:", error);
	});
}

// Graceful shutdown
const shutdownHandler = async () => {
	// Check if shutdown is already in progress
	if (signalHandlerManager.isShuttingDown) {
		console.log("⚠️ Shutdown already in progress, skipping...");
		return;
	}

	console.log("\n🛑 Shutting down gracefully...");
	signalHandlerManager.isShuttingDown = true;

	try {
		// Cleanup Telegram if it was initialized
		if (telegramCleanup) {
			console.log("🧹 Cleaning up Telegram channel...");
			await telegramCleanup();
		}

		// Cleanup Zalo if it was initialized
		if (zaloCleanup) {
			console.log("🧹 Cleaning up Zalo channel...");
			await zaloCleanup();
		}

		// Shutdown all channels in registry
		console.log("🔌 Shutting down all channels...");
		await channelRegistry.shutdownAll();

		// Remove all signal handlers
		signalHandlerManager.cleanup();

		console.log("✅ All channels shut down");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error during shutdown:", error);
		process.exit(1);
	}
};

// Register signal handlers with manager
signalHandlerManager.register("SIGINT", shutdownHandler);
signalHandlerManager.register("SIGTERM", shutdownHandler);