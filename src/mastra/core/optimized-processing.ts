import type { Agent } from "@mastra/core/agent";
import { channelMessageWorkflow } from "../workflows/message-processor";
import type { NormalizedMessage, ProcessedResponse } from "./models/message";

/**
 * Optimized Processing Suite - Combines parallel processing, message processing, and timeout management
 */

// Core interfaces
export interface ProcessingResult {
	status: "success" | "failed" | "timeout";
	data?: any;
	error?: string;
	processingTime?: number;
}

// Timeout utilities
export class TimeoutUtils {
	static readonly TIMEOUTS = {
		fast: 1000,
		normal: 3000,
		slow: 5000,
	} as const;

	static async withTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number = TimeoutUtils.TIMEOUTS.normal
	): Promise<T | null> {
		const timeoutPromise = new Promise<null>(resolve => 
			setTimeout(() => resolve(null), timeoutMs)
		);
		return Promise.race([promise, timeoutPromise]);
	}

	static async retry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		delay: number = 100
	): Promise<T | null> {
		let lastError: any;
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error;
				if (attempt < maxRetries) {
					await new Promise(resolve => setTimeout(resolve, delay * attempt));
				}
			}
		}
		return null;
	}
}

// Parallel processing manager
export class ParallelProcessor {
	private sessions = new Map<string, {
		agent: Agent;
		startTime: number;
		resolve: (result: ProcessingResult) => void;
		reject: (error: Error) => void;
	}>();

	async process(
		agent: Agent,
		message: string,
		context: any = {},
		conversationId?: string
	): Promise<ProcessingResult> {
		const id = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
		const startTime = Date.now();

		try {
			// Simple agent execution with timeout
			const messages = [{ role: "user" as const, content: message }];
			const options = { context, conversationId };

			const result = await TimeoutUtils.withTimeout(
				agent.generate(messages, options),
				TimeoutUtils.TIMEOUTS.normal
			);

			const processingTime = Date.now() - startTime;

			if (result === null) {
				return { status: "timeout", processingTime };
			}

			return {
				status: "success",
				data: result,
				processingTime
			};
		} catch (error: any) {
			return {
				status: "failed",
				error: error.message,
				processingTime: Date.now() - startTime
			};
		}
	}
}

// Optimized message processor
export class OptimizedMessageProcessor {
	private processed = new Set<string>();
	private parallelProcessor = new ParallelProcessor();

	async processMessage(message: NormalizedMessage): Promise<ProcessedResponse> {
		const messageKey = `${message.channel.channelId}-${message.id}`;

		// Check for duplicates
		if (this.processed.has(messageKey)) {
			return {
				content: "Message already processed",
				contentType: "text",
				metadata: { processedBy: "duplicate-check" }
			};
		}

		// Mark as processed with auto-cleanup
		this.processed.add(messageKey);
		setTimeout(() => this.processed.delete(messageKey), 300000); // 5 minutes

		try {
			// Use workflow for processing
			const run = await channelMessageWorkflow.createRunAsync();
			const workflowInput = {
				inputData: {
					channelId: message.channel.channelId as "telegram" | "whatsapp" | "web" | "zalo",
					message: {
						content: message.content,
						senderId: message.sender.id,
						timestamp: message.timestamp,
						attachments: message.attachments?.map(att => ({
							type: att.type,
							url: att.url,
							filename: att.filename
						}))
					}
				}
			};

			const result = await run.start(workflowInput);

			if (result.status === "success") {
				return {
					content: result.result.response || "Unable to process request",
					contentType: "text",
					metadata: {
						processedBy: "workflow",
						channelId: message.channel.channelId,
						...result.result.metadata
					}
				};
			}

			throw new Error(`Workflow failed: ${result.error}`);

		} catch (error: any) {
			console.error("Message processing failed:", error);
			return {
				content: "Sorry, I couldn't process your request at the moment. Please try again.",
				contentType: "text",
				metadata: {
					processedBy: "error-handler",
					error: error.message,
					channelId: message.channel.channelId
				}
			};
		}
	}

	// Queue processing for high load scenarios
	async processQueue(messages: NormalizedMessage[]): Promise<ProcessedResponse[]> {
		const results = await Promise.allSettled(
			messages.map(msg => this.processMessage(msg))
		);

		return results.map(result => 
			result.status === "fulfilled" 
				? result.value 
				: {
					content: "Processing failed",
					contentType: "text" as const,
					metadata: { error: "queue-processing-failed" }
				}
		);
	}
}

// Simple signal manager
export class SignalManager {
	private static instance: SignalManager;
	private handlers = new Map<string, NodeJS.SignalsListener>();
	private shuttingDown = false;

	static getInstance(): SignalManager {
		if (!SignalManager.instance) {
			SignalManager.instance = new SignalManager();
		}
		return SignalManager.instance;
	}

	register(signal: string, handler: NodeJS.SignalsListener): void {
		// Remove existing handler if any
		if (this.handlers.has(signal)) {
			process.removeListener(signal as NodeJS.Signals, this.handlers.get(signal)!);
		}

		// Add new handler
		process.on(signal as NodeJS.Signals, handler);
		this.handlers.set(signal, handler);
	}

	cleanup(): void {
		this.handlers.forEach((handler, signal) => {
			process.removeListener(signal as NodeJS.Signals, handler);
		});
		this.handlers.clear();
	}

	get isShuttingDown(): boolean {
		return this.shuttingDown;
	}

	set isShuttingDown(value: boolean) {
		this.shuttingDown = value;
	}
}

// Export singleton instances
export const timeoutUtils = TimeoutUtils;
export const parallelProcessor = new ParallelProcessor();
export const messageProcessor = new OptimizedMessageProcessor();
export const signalManager = SignalManager.getInstance();

// Legacy compatibility exports
export const optimizedMessageProcessor = messageProcessor;
export const signalHandlerManager = signalManager;