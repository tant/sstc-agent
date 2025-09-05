/**
 * Proper Mastra server configuration with custom API routes
 * This follows Mastra best practices for exposing workflows via HTTP endpoints
 */

import cors from "cors";
import express from "express";
import { mastra } from "./mastra/index";
import {
	analyticsEndpoint,
	chatEndpoint,
	docsEndpoint,
	greetingStatusEndpoint,
	getUserHistoryEndpoint,
	healthEndpoint,
	resetUserMemoryEndpoint,
} from "./api-server-fixed";

const PORT = process.env.PORT || 3001;

console.log("🚀 Starting SSTC Agent with Mastra Server...");

// Create Mastra server with custom configuration
const app = express();

// Middleware configuration
app.use(cors({
	origin: process.env.CORS_ORIGIN || "*",
	credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
	console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
	next();
});

console.log("🔧 Configuring Mastra custom API routes...");

// Health check endpoint
app.get("/health", healthEndpoint);

// Main chat processing endpoint - uses proper Mastra workflow execution
app.post("/chat", chatEndpoint);

// Memory management endpoints
app.get("/memory/:userId/history", getUserHistoryEndpoint);
app.post("/memory/:userId/reset", resetUserMemoryEndpoint);

// Analytics and monitoring
app.get("/analytics", analyticsEndpoint);

// Greeting status
app.get("/greeting/:userId/status", greetingStatusEndpoint);

// API documentation
app.get("/", docsEndpoint);
app.get("/docs", docsEndpoint);

// Mastra workflow direct access (for debugging/testing)
app.post("/workflow/:workflowId", async (req, res) => {
	try {
		const { workflowId } = req.params;
		const triggerData = req.body;

		console.log(`🔄 [API] Direct workflow execution: ${workflowId}`);
		
		// Validate workflow exists
		if (!mastra.workflows || !mastra.workflows[workflowId]) {
			return res.status(404).json({
				error: "Workflow not found",
				availableWorkflows: Object.keys(mastra.workflows || {}),
			});
		}

		const result = await mastra.run({
			workflowId,
			triggerData,
		});

		res.json({
			success: true,
			workflowId,
			status: result?.status || "completed",
			data: result?.data || {},
			executedAt: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error(`❌ [API] Workflow execution failed:`, error);
		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
});

// Agent direct access (for testing/debugging)
app.post("/agent/:agentId", async (req, res) => {
	try {
		const { agentId } = req.params;
		const { message, context = {} } = req.body;

		console.log(`🤖 [API] Direct agent call: ${agentId}`);

		// Validate agent exists
		if (!mastra.agents || !mastra.agents[agentId]) {
			return res.status(404).json({
				error: "Agent not found",
				availableAgents: Object.keys(mastra.agents || {}),
			});
		}

		const agent = mastra.agents[agentId];
		const result = await agent.generate(message, context);

		res.json({
			success: true,
			agentId,
			result: {
				text: result.text,
				status: result.status || "success",
			},
			executedAt: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error(`❌ [API] Agent call failed:`, error);
		res.status(500).json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error("❌ [API] Unhandled error:", {
		error: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
	});

	res.status(500).json({
		success: false,
		error: "Internal server error",
		timestamp: new Date().toISOString(),
	});
});

// 404 handler
app.use("*", (req, res) => {
	res.status(404).json({
		error: "Endpoint not found",
		path: req.originalUrl,
		availableEndpoints: {
			"GET /": "API documentation",
			"GET /health": "Health check",
			"POST /chat": "Process chat message",
			"GET /memory/:userId/history": "Get user history",
			"POST /memory/:userId/reset": "Reset user memory",
			"GET /analytics": "System analytics",
			"GET /greeting/:userId/status": "Greeting status",
			"POST /workflow/:workflowId": "Direct workflow execution",
			"POST /agent/:agentId": "Direct agent call",
		},
		timestamp: new Date().toISOString(),
	});
});

// Start the server
app.listen(PORT, () => {
	console.log("🎉 SSTC Agent Mastra Server Started!");
	console.log(`🔗 Server URL: http://localhost:${PORT}`);
	console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
	console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
	console.log(`🔧 Mastra Integration: ✅ Enabled`);
	
	// Log available Mastra components
	console.log(`🤖 Available Agents: ${Object.keys(mastra.agents || {}).join(", ")}`);
	console.log(`⚙️  Available Workflows: ${Object.keys(mastra.workflows || {}).join(", ")}`);
	
	console.log("=" .repeat(60));
	console.log("🚀 Ready to process chat messages with parallel processing!");
});

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\n🛑 Received SIGINT. Graceful shutdown...");
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\n🛑 Received SIGTERM. Graceful shutdown...");
	process.exit(0);
});

export { app };