/**
 * This file exports all LLM functionality for easy importing.
 * Instead of importing from multiple files, you can import from here.
 */
/** biome-ignore-all assist/source/organizeImports: Không quan tâm **/
// Export the main adapter function
export { callModel } from "./adapter";

// Export the provider functions
export { createLLMProvider } from "./provider";

// Export the types
export type { LLMCallOptions } from "./adapter";
