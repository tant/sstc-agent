export class TimeoutManager {
	static TIMEOUT_STRATEGY = {
		initial: 1000, // 1 giây cho truy vấn đơn giản
		extended: 3000, // 3 giây cho truy vấn phức tạp
		maximum: 5000, // Tối đa 5 giây
	};

	static RETRY_STRATEGY = {
		maxRetries: 3,
		initialDelay: 100,
		maxDelay: 5000,
		backoffMultiplier: 2,
	};

	static async waitForData<T>(
		promise: Promise<T>,
		timeoutMs: number,
	): Promise<T | null> {
		// Create timeout promise
		const timeoutPromise = new Promise<null>((resolve) => {
			setTimeout(() => {
				resolve(null);
			}, timeoutMs);
		});

		// Race between the actual promise and timeout
		const result = await Promise.race([promise, timeoutPromise]);
		return result;
	}

	static async progressiveRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		initialDelay: number = 100,
	): Promise<T | null> {
		let _lastError: any = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(
					`🔄 [TimeoutManager] Retry attempt ${attempt}/${maxRetries}`,
				);
				const result = await operation();
				console.log(
					`✅ [TimeoutManager] Retry successful on attempt ${attempt}`,
				);
				return result;
			} catch (error: any) {
				console.warn(
					`⚠️ [TimeoutManager] Retry attempt ${attempt} failed:`,
					error?.message,
				);
				_lastError = error;

				// Don't delay on the last attempt
				if (attempt < maxRetries) {
					// Exponential backoff
					const delay = Math.min(
						initialDelay *
							TimeoutManager.RETRY_STRATEGY.backoffMultiplier ** (attempt - 1),
						TimeoutManager.RETRY_STRATEGY.maxDelay,
					);
					console.log(
						`⏱️ [TimeoutManager] Waiting ${delay}ms before next retry`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		console.error("❌ [TimeoutManager] All retry attempts failed");
		return null;
	}

	// Retry với circuit breaker pattern
	static async retryWithCircuitBreaker<T>(
		operation: () => Promise<T>,
		options: {
			maxRetries?: number;
			initialDelay?: number;
			timeoutMs?: number;
			circuitBreakerThreshold?: number;
		} = {},
	): Promise<T | null> {
		const {
			maxRetries = TimeoutManager.RETRY_STRATEGY.maxRetries,
			initialDelay = TimeoutManager.RETRY_STRATEGY.initialDelay,
			timeoutMs = TimeoutManager.TIMEOUT_STRATEGY.maximum,
			circuitBreakerThreshold = 3,
		} = options;

		let consecutiveFailures = 0;
		let _lastError: any = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			// Circuit breaker check
			if (consecutiveFailures >= circuitBreakerThreshold) {
				console.warn(
					`⚠️ [TimeoutManager] Circuit breaker triggered after ${consecutiveFailures} consecutive failures`,
				);
				return null;
			}

			try {
				console.log(
					`🔄 [TimeoutManager] Circuit breaker retry attempt ${attempt}/${maxRetries}`,
				);

				// Wrap operation with timeout
				const result = await TimeoutManager.waitForData(operation(), timeoutMs);

				if (result !== null) {
					console.log(
						`✅ [TimeoutManager] Retry successful on attempt ${attempt}`,
					);
					consecutiveFailures = 0; // Reset consecutive failures
					return result;
				} else {
					throw new Error("Operation timed out");
				}
			} catch (error: any) {
				console.warn(
					`⚠️ [TimeoutManager] Retry attempt ${attempt} failed:`,
					error?.message,
				);
				_lastError = error;
				consecutiveFailures++;

				// Don't delay on the last attempt
				if (attempt < maxRetries) {
					// Exponential backoff with jitter
					const delay = Math.min(
						initialDelay *
							TimeoutManager.RETRY_STRATEGY.backoffMultiplier ** (attempt - 1),
						TimeoutManager.RETRY_STRATEGY.maxDelay,
					);

					// Add jitter (±25%)
					const jitter = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
					const jitteredDelay = Math.floor(delay * jitter);

					console.log(
						`⏱️ [TimeoutManager] Waiting ${jitteredDelay}ms before next retry`,
					);
					await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
				}
			}
		}

		console.error(
			"❌ [TimeoutManager] All retry attempts failed with circuit breaker",
		);
		return null;
	}

	// Retry với điều kiện cụ thể
	static async conditionalRetry<T>(
		operation: () => Promise<T>,
		shouldRetry: (error: any) => boolean,
		maxRetries: number = 3,
		initialDelay: number = 100,
	): Promise<T | null> {
		let _lastError: any = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(
					`🔄 [TimeoutManager] Conditional retry attempt ${attempt}/${maxRetries}`,
				);
				const result = await operation();
				console.log(
					`✅ [TimeoutManager] Retry successful on attempt ${attempt}`,
				);
				return result;
			} catch (error: any) {
				console.warn(
					`⚠️ [TimeoutManager] Retry attempt ${attempt} failed:`,
					error?.message,
				);
				_lastError = error;

				// Kiểm tra điều kiện retry
				if (!shouldRetry(error)) {
					console.log("⏭️ [TimeoutManager] Should not retry, stopping retries");
					break;
				}

				// Don't delay on the last attempt
				if (attempt < maxRetries) {
					// Exponential backoff
					const delay = Math.min(
						initialDelay *
							TimeoutManager.RETRY_STRATEGY.backoffMultiplier ** (attempt - 1),
						TimeoutManager.RETRY_STRATEGY.maxDelay,
					);
					console.log(
						`⏱️ [TimeoutManager] Waiting ${delay}ms before next retry`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		console.error("❌ [TimeoutManager] All conditional retry attempts failed");
		return null;
	}

	static getTimeoutForQuery(query: string): number {
		// Simple heuristic based on query complexity
		const length = query.length;
		const complexityKeywords = [
			"ram",
			"memory",
			"ddr4",
			"ddr5",
			"bộ nhớ",
			"laptop",
			"desktop",
			"nâng cấp",
		];
		const foundKeywords = complexityKeywords.filter((keyword) =>
			query.toLowerCase().includes(keyword.toLowerCase()),
		);

		// Base timeout
		let timeout = TimeoutManager.TIMEOUT_STRATEGY.initial;

		// Increase timeout based on query length
		if (length > 100) {
			timeout = TimeoutManager.TIMEOUT_STRATEGY.extended;
		}

		// Increase timeout based on complexity keywords
		if (foundKeywords.length > 2) {
			timeout = TimeoutManager.TIMEOUT_STRATEGY.maximum;
		}

		console.log("⏱️ [TimeoutManager] Determined timeout for query:", {
			queryLength: length,
			complexityKeywords: foundKeywords.length,
			timeoutMs: timeout,
		});

		return timeout;
	}

	static getTimeoutStrategy(): typeof this.TIMEOUT_STRATEGY {
		return TimeoutManager.TIMEOUT_STRATEGY;
	}

	static getRetryStrategy(): typeof this.RETRY_STRATEGY {
		return TimeoutManager.RETRY_STRATEGY;
	}
}
