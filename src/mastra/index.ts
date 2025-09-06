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
					token: process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) + "...",
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
	try {
		console.log("🔍 Attempting to initialize Zalo channel...");
		// Check if Zalo channel is already registered
		if (channelRegistry.has("zalo")) {
			console.log("⚠️ Zalo channel already registered, skipping initialization");
		} else {
			zaloAdapter = new ZaloChannelAdapter({
				cookie: process.env.ZALO_COOKIE,
				imei: process.env.ZALO_IMEI,
				userAgent: process.env.ZALO_USER_AGENT,
				selfListen: process.env.ZALO_SELF_LISTEN === "true",
				checkUpdate: process.env.ZALO_CHECK_UPDATE !== "false",
				logging: process.env.ZALO_LOGGING !== "false",
			});

			// Start the Zalo adapter
			zaloAdapter
				.start()
				.then(() => {
					if (zaloAdapter) {
						channelRegistry.register("zalo", zaloAdapter);
						console.log("✅ Zalo channel registered in Mastra");
					}
				})
				.catch((error) => {
					console.error("❌ Failed to start Zalo adapter:", error);
				});

			// Store cleanup function for graceful shutdown
			zaloCleanup = async () => {
				console.log("🧹 Cleaning up Zalo channel...");
				if (zaloAdapter) {
					await zaloAdapter.shutdown();
				}
			};
		}
	} catch (error) {
		console.error("❌ Failed to initialize Zalo channel:", error);
	}
}

// Graceful shutdown
const shutdownHandler = async () => {
	// Check if shutdown is already in progress
	if (signalHandlerManager.isShutdownInProgress()) {
		console.log("⚠️ Shutdown already in progress, skipping...");
		return;
	}

	console.log("\n🛑 Shutting down gracefully...");
	signalHandlerManager.setShutdownInProgress();

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
		signalHandlerManager.removeAllHandlers();

		console.log("✅ All channels shut down");
		process.exit(0);
	} catch (error) {
		console.error("❌ Error during shutdown:", error);
		process.exit(1);
	}
};

// Register signal handlers with manager
signalHandlerManager.registerHandler("SIGINT", shutdownHandler);
signalHandlerManager.registerHandler("SIGTERM", shutdownHandler);