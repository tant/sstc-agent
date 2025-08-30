/**
 * Enhanced LLM adapter with improved error handling and documentation.
 * This builds upon the existing working adapter with better features.
 */

// Import types from Mastra
import type { CoreMessage } from "@mastra/core";

// Import our provider factory (this should match your existing import)
import { llmProviderFactory } from "./provider"; // Or from your agent file

/**
 * Options for LLM calls with better defaults
 */
export type LLMCallOptions = {
  timeoutMs?: number;    // Custom timeout (default: 15000ms)
  retries?: number;      // Custom retry count (default: 1)
  backoffMs?: number;    // Custom backoff time (default: 500ms)
};

/**
 * Type guard to check if an object is a ProviderClient
 */
type ProviderClient = {
  generate?: (opts: { messages: CoreMessage[] }) => Promise<unknown>;
  doGenerate?: (opts: { messages: CoreMessage[] }) => Promise<unknown>;
  createCompletion?: (opts: { messages: CoreMessage[] }) => Promise<unknown>;
};

function isProviderClient(obj: unknown): obj is ProviderClient {
  if (!obj || typeof obj !== "object") return false;
  const r = obj as Record<string, unknown>;
  return (
    typeof r.generate === "function" ||
    typeof r.doGenerate === "function" ||
    typeof r.createCompletion === "function"
  );
}

/**
 * Type guard to check if an object is a FunctionClient
 */
type FunctionClient = (opts: unknown) => Promise<unknown>;

function isFunctionClient(obj: unknown): obj is FunctionClient {
  return typeof obj === "function";
}

/**
 * Extracts text from LLM responses
 * This handles different response formats from different models
 */
export function extractText(resp: unknown): string {
  if (!resp) return "";
  if (typeof resp === "string") return resp;
  if (typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    if (typeof r.text === "string") return r.text;
    if (Array.isArray(r.data) && r.data.length > 0) {
      const d0 = r.data[0] as Record<string, unknown> | undefined;
      if (d0 && typeof d0.text === "string") return d0.text;
    }
    if (Array.isArray(r.choices) && r.choices.length > 0) {
      const c0 = r.choices[0] as Record<string, unknown> | undefined;
      if (c0 && typeof c0.text === "string") return c0.text;
      if (c0 && typeof c0.message === "object") {
        const m = c0.message as Record<string, unknown> | undefined;
        if (m && typeof m.content === "string") return m.content;
      }
    }
  }
  try {
    return JSON.stringify(resp);
  } catch {
    return String(resp);
  }
}

/**
 * Promise with timeout helper
 * This adds a timeout to any promise
 */
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("LLM call timeout")), ms),
    ),
  ]);
}

/**
 * Main function to call LLM models with enhanced features
 * This is the improved version of your existing callModel function
 */
export async function callModel(
  modelName: string,              // Model name to call
  messages: CoreMessage[],        // The conversation messages
  opts: LLMCallOptions = {}       // Custom options
): Promise<{ text: string; raw: unknown }> {
  // Extract options with defaults (matching your existing logic)
  const { timeoutMs = 15000, retries = 1, backoffMs = 500 } = opts;
  
  // Get the client from our provider (using the same pattern as your code)
  const client = llmProviderFactory(modelName) as unknown;
  
  // Validate inputs (added for better error handling)
  if (!modelName || !messages.length) {
    throw new Error("Model name and messages are required");
  }

  // Retry logic (same as your existing code)
  let attempt = 0;
  while (attempt <= retries) {
    try {
      // This is the actual call to the LLM (same as your existing code)
      const run = async () => {
        if (isProviderClient(client)) {
          if (typeof client.generate === "function") {
            return client.generate({ messages });
          }
          if (typeof client.doGenerate === "function") {
            return client.doGenerate({ messages });
          }
          if (typeof client.createCompletion === "function") {
            return client.createCompletion({ messages });
          }
        }

        if (isFunctionClient(client)) {
          return (client as FunctionClient)({
            inputFormat: "messages",
            prompt: { messages },
          });
        }

        throw new Error(
          "Provider client does not expose a supported generate method",
        );
      };

      // Execute with timeout (same as your existing code)
      const resp = await timeoutPromise(run(), timeoutMs);
      return { text: extractText(resp), raw: resp };
    } catch (error) {
      attempt++;

      // If we've exhausted retries, throw the error (same as your existing code)
      if (attempt > retries) {
        throw error;
      }

      // Wait before retrying with exponential backoff (same as your existing code)
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
    }
  }

  // This should never be reached due to the throw above, but TypeScript needs it
  throw new Error("Unexpected error in callModel");
}

// Create a custom embedder for external embedding server
export function createCustomEmbedder({ baseUrl, model }: { baseUrl?: string; model?: string }) {
  if (!baseUrl) throw new Error("Custom embedder requires baseUrl");
  return async (input: string | string[]) => {
    const texts = Array.isArray(input) ? input : [input];
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: texts, model }),
    });
    if (!res.ok) throw new Error(`Embedding server error: ${res.status}`);
    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !('data' in data)) throw new Error("Invalid embedding response");
    const arr = (data as { data: unknown }).data;
    if (!Array.isArray(arr)) throw new Error("Invalid embedding response");
    return arr.map((d) => {
      if (!d || typeof d !== "object" || !('embedding' in d)) throw new Error("Invalid embedding item");
      return (d as { embedding: number[] }).embedding;
    });
  };
}