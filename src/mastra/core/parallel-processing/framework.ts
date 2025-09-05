import type { Agent } from "@mastra/core/agent";
import { TimeoutManager } from "./timeout-manager";

export interface ProcessingResult {
	status: "success" | "failed" | "timeout";
	data?: any;
	error?: string;
	processingTime?: number;
}

export interface ParallelProcessingFramework {
	initiateParallelProcessing(params: {
		specialistAgent: Agent;
		customerMessage: string;
		context: any;
		conversationId?: string;
	}): Promise<string>; // Returns processing ID

	waitForSpecialistData(
		processingId: string,
		timeoutMs: number,
	): Promise<ProcessingResult>;

	waitForSpecialistDataWithRetry(
		processingId: string,
		timeoutMs: number,
		retryOptions?: {
			maxRetries?: number;
			initialDelay?: number;
			circuitBreakerThreshold?: number;
		},
	): Promise<ProcessingResult>;

	handleTimeoutScenario(
		processingId: string,
		customerMessage: string,
	): Promise<ProcessingResult>;

	cancelProcessing(processingId: string): Promise<void>;
}

export class ParallelProcessingFrameworkImpl
	implements ParallelProcessingFramework
{
	private processingSessions: Map<
		string,
		{
			specialistAgent: Agent;
			customerMessage: string;
			context: any;
			startTime: number;
			promise: Promise<any>;
			resolve: Function;
			reject: Function;
			timeoutId?: NodeJS.Timeout;
		}
	> = new Map();

	async initiateParallelProcessing(params: {
		specialistAgent: Agent;
		customerMessage: string;
		context: any;
		conversationId?: string;
	}): Promise<string> {
		const { specialistAgent, customerMessage, context, conversationId } =
			params;

		// Generate unique processing ID
		const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		console.log("🔄 [ParallelProcessing] Initiating parallel processing", {
			processingId,
			agentName: specialistAgent.name,
			messageLength: customerMessage.length,
			conversationId,
		});

		// Create promise for processing
		let resolveFunc: Function;
		let rejectFunc: Function;

		const promise = new Promise((resolve, reject) => {
			resolveFunc = resolve;
			rejectFunc = reject;
		});

		// Store processing session với conversationId
		this.processingSessions.set(processingId, {
			specialistAgent,
			customerMessage,
			context: {
				...context,
				conversationId,
			},
			startTime: Date.now(),
			promise,
			resolve: resolveFunc!,
			reject: rejectFunc!,
		});

		// Start processing asynchronously
		this.processSpecialistRequest(processingId);

		return processingId;
	}

	private async processSpecialistRequest(processingId: string) {
		const session = this.processingSessions.get(processingId);
		if (!session) {
			console.warn("⚠️ [ParallelProcessing] Processing session not found", {
				processingId,
			});
			return;
		}

		const { specialistAgent, customerMessage, context } = session;
		const conversationId = context?.conversationId;

		try {
			console.log("🧠 [ParallelProcessing] Processing specialist request", {
				processingId,
				agentName: specialistAgent.name,
				conversationId,
			});

			// Prepare messages for specialist
			const messages = [{ role: "user", content: customerMessage }];

			// Add context if available
			if (context?.chatHistory) {
				const recentHistory = context.chatHistory.slice(-3);
				const historyMessages = recentHistory.map((msg: any) => ({
					role: msg.role,
					content: msg.content,
				}));
				messages.unshift(...historyMessages);
			}

			// Execute specialist agent với conversationId
			let result: any;
			if (
				typeof (specialistAgent as any).generateParallelResponse === "function"
			) {
				console.log(
					"⚙️ [ParallelProcessing] Using generateParallelResponse method",
				);
				const parallelResult = await (
					specialistAgent as any
				).generateParallelResponse(messages, {
					context,
					conversationId,
				});
				result = parallelResult;
			} else {
				console.log("⚙️ [ParallelProcessing] Using standard generate method");
				result = await specialistAgent.generate(messages as any, {});
			}

			console.log("✅ [ParallelProcessing] Specialist processing completed", {
				processingId,
				agentName: specialistAgent.name,
				resultLength: result.text?.length || 0,
				resultStatus: result.status || "unknown",
				conversationId,
			});

			// Clear any existing timeout
			if (session.timeoutId) {
				clearTimeout(session.timeoutId);
			}

			// Resolve the promise with result
			session.resolve({
				status: result.status || "success",
				data: result.data || result,
				processingTime: Date.now() - session.startTime,
			});

			// Clean up session
			this.processingSessions.delete(processingId);
		} catch (error: any) {
			console.error("❌ [ParallelProcessing] Specialist processing failed", {
				processingId,
				agentName: specialistAgent.name,
				errorMessage: error.message,
				conversationId,
			});

			// Clear any existing timeout
			if (session.timeoutId) {
				clearTimeout(session.timeoutId);
			}

			// Reject the promise with error
			session.reject({
				status: "failed",
				error: error.message,
				processingTime: Date.now() - session.startTime,
			});

			// Clean up session
			this.processingSessions.delete(processingId);
		}
	}

	async waitForSpecialistData(
		processingId: string,
		timeoutMs: number,
	): Promise<ProcessingResult> {
		const session = this.processingSessions.get(processingId);
		if (!session) {
			return {
				status: "failed",
				error: "Processing session not found",
			};
		}

		console.log("⏳ [ParallelProcessing] Waiting for specialist data", {
			processingId,
			timeoutMs,
		});

		// Create timeout promise
		const timeoutPromise = new Promise<ProcessingResult>((resolve) => {
			const timeoutId = setTimeout(() => {
				resolve({
					status: "timeout",
					error: `Processing timed out after ${timeoutMs}ms`,
				});
			}, timeoutMs);

			// Store timeout ID for cleanup
			session.timeoutId = timeoutId;
		});

		// Race between processing promise and timeout
		try {
			const result = await Promise.race([session.promise, timeoutPromise]);
			return result as ProcessingResult;
		} catch (error: any) {
			return {
				status: "failed",
				error: error.message,
				processingTime: Date.now() - session.startTime,
			};
		}
	}

	// Wait for specialist data with retry mechanism
	async waitForSpecialistDataWithRetry(
		processingId: string,
		timeoutMs: number,
		retryOptions: {
			maxRetries?: number;
			initialDelay?: number;
			circuitBreakerThreshold?: number;
		} = {},
	): Promise<ProcessingResult> {
		const session = this.processingSessions.get(processingId);
		if (!session) {
			return {
				status: "failed",
				error: "Processing session not found",
			};
		}

		console.log(
			"⏳ [ParallelProcessing] Waiting for specialist data with retry",
			{
				processingId,
				timeoutMs,
				retryOptions,
			},
		);

		// Hàm thử lại
		const attemptOperation = async (): Promise<ProcessingResult> => {
			// Create timeout promise
			const timeoutPromise = new Promise<ProcessingResult>((resolve) => {
				const timeoutId = setTimeout(() => {
					resolve({
						status: "timeout",
						error: `Processing timed out after ${timeoutMs}ms`,
					});
				}, timeoutMs);

				// Store timeout ID for cleanup
				if (session.timeoutId) {
					clearTimeout(session.timeoutId);
				}
				session.timeoutId = timeoutId;
			});

			// Race between processing promise and timeout
			const result = await Promise.race([session.promise, timeoutPromise]);
			return result as ProcessingResult;
		};

		// Sử dụng retry mechanism từ TimeoutManager
		const result = await TimeoutManager.retryWithCircuitBreaker(
			attemptOperation,
			{
				maxRetries: retryOptions.maxRetries,
				initialDelay: retryOptions.initialDelay,
				timeoutMs: timeoutMs,
				circuitBreakerThreshold: retryOptions.circuitBreakerThreshold,
			},
		);

		if (result) {
			return result;
		} else {
			return {
				status: "failed",
				error: "All retry attempts failed",
				processingTime: Date.now() - session.startTime,
			};
		}
	}

	async handleTimeoutScenario(
		processingId: string,
		customerMessage: string,
	): Promise<ProcessingResult> {
		const session = this.processingSessions.get(processingId);
		if (!session) {
			return {
				status: "failed",
				error: "Processing session not found",
			};
		}

		console.log("⏰ [ParallelProcessing] Handling timeout scenario", {
			processingId,
			messageLength: customerMessage.length,
		});

		// For now, we'll just return a timeout response
		// In a more sophisticated implementation, we might retry or provide partial data
		return {
			status: "timeout",
			error: "Processing taking longer than expected",
			processingTime: Date.now() - session.startTime,
		};
	}

	async cancelProcessing(processingId: string): Promise<void> {
		const session = this.processingSessions.get(processingId);
		if (session) {
			console.log("⏹️ [ParallelProcessing] Cancelling processing", {
				processingId,
			});

			// Clear any existing timeout
			if (session.timeoutId) {
				clearTimeout(session.timeoutId);
			}

			// Reject the promise
			session.reject({
				status: "failed",
				error: "Processing cancelled",
			});

			// Clean up session
			this.processingSessions.delete(processingId);
		}
	}

	// Get processing session info for monitoring
	getSessionInfo(processingId: string): {
		agentName: string;
		messageLength: number;
		processingTime: number;
		status: "active" | "completed" | "failed";
	} | null {
		const session = this.processingSessions.get(processingId);
		if (!session) {
			return null;
		}

		return {
			agentName: session.specialistAgent.name || "Unknown",
			messageLength: session.customerMessage.length,
			processingTime: Date.now() - session.startTime,
			status: "active",
		};
	}

	// Get all active processing sessions for monitoring
	getAllActiveSessions(): Array<{
		processingId: string;
		agentName: string;
		messageLength: number;
		processingTime: number;
	}> {
		const now = Date.now();
		return Array.from(this.processingSessions.entries()).map(
			([processingId, session]) => ({
				processingId,
				agentName: session.specialistAgent.name || "Unknown",
				messageLength: session.customerMessage.length,
				processingTime: now - session.startTime,
			}),
		);
	}
}

// Export singleton instance
export const parallelProcessingFramework =
	new ParallelProcessingFrameworkImpl();
