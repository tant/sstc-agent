/**
 * Signal handler manager for graceful shutdown
 * Prevents duplicate signal handlers and ensures proper cleanup
 */

class SignalHandlerManager {
	private static instance: SignalHandlerManager;
	private handlers: Array<{
		signal: string;
		listener: NodeJS.SignalsListener;
	}> = [];
	private isShuttingDown: boolean = false;

	private constructor() {}

	static getInstance(): SignalHandlerManager {
		if (!SignalHandlerManager.instance) {
			SignalHandlerManager.instance = new SignalHandlerManager();
		}
		return SignalHandlerManager.instance;
	}

	/**
	 * Register a signal handler
	 */
	registerHandler(signal: string, listener: NodeJS.SignalsListener): void {
		// Remove any existing handlers for this signal first
		this.removeHandler(signal);

		// Add the new handler
		process.on(signal as NodeJS.Signals, listener);
		this.handlers.push({ signal, listener });

		console.log(`✅ [SignalManager] Registered handler for ${signal}`);
	}

	/**
	 * Remove handler for a specific signal
	 */
	removeHandler(signal: string): void {
		this.handlers = this.handlers.filter((handler) => {
			if (handler.signal === signal) {
				process.removeListener(signal as NodeJS.Signals, handler.listener);
				console.log(`📤 [SignalManager] Removed handler for ${signal}`);
				return false;
			}
			return true;
		});
	}

	/**
	 * Remove all handlers
	 */
	removeAllHandlers(): void {
		this.handlers.forEach((handler) => {
			process.removeListener(
				handler.signal as NodeJS.Signals,
				handler.listener,
			);
			console.log(`📤 [SignalManager] Removed handler for ${handler.signal}`);
		});
		this.handlers = [];
	}

	/**
	 * Check if shutdown is in progress
	 */
	isShutdownInProgress(): boolean {
		return this.isShuttingDown;
	}

	/**
	 * Mark shutdown as in progress
	 */
	setShutdownInProgress(): void {
		this.isShuttingDown = true;
	}
}

export const signalHandlerManager = SignalHandlerManager.getInstance();
