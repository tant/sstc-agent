import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";

// Import pure Mastra agents
import { pureMaiAgent } from "./agents/pure-mai-agent";

// Import simple workflow
import { simpleMessageWorkflow } from "./workflows/simple-message-processor";

console.log("🚀 [Mastra] Initializing with simplified configuration...");

export const mastra = new Mastra({
	workflows: {
		simpleMessageWorkflow,
	},
	agents: {
		maiSale: pureMaiAgent,
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
console.log("⚙️  [Mastra] Available workflows:", Object.keys(mastra.workflows || {}));