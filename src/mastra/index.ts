import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";

// Import agents
import { maiSale } from "./agents/mai-agent";

// Import workflows
import { channelMessageWorkflow } from "./workflows/message-processor";

console.log("🚀 [Mastra] Initializing with simplified configuration...");

export const mastra = new Mastra({
	workflows: {
		channelMessageWorkflow,
	},
	agents: {
		mai: maiSale,
	},
	storage: new LibSQLStore({
		url: ":memory:", // Use in-memory storage to avoid database issues
	}),
	logger: new PinoLogger({
		name: "SSTC-Agent",
		level: "info", // Reduce log noise
	}),
});

console.log("✅ [Mastra] Simple configuration loaded successfully");
console.log("📋 [Mastra] Available agents:", Object.keys(mastra.agents || {}));
console.log(
	"⚙️  [Mastra] Available workflows:",
	Object.keys(mastra.workflows || {}),
);
