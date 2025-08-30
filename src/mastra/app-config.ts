import { openai } from "@ai-sdk/openai";
import { ChromaVector } from "@mastra/chroma";
// Hàm khởi tạo ChromaVector (vector store) dùng config tập trung
export function getChromaVectorFromConfig() {
  // Lấy config từ biến môi trường
  const host = process.env.CHROMA_HOST || "localhost";
  const port = process.env.CHROMA_PORT ? Number(process.env.CHROMA_PORT) : 8000;
  const ssl = process.env.CHROMA_SSL === "true";
  return new ChromaVector({
    host,
    port,
    ssl,
  });
}

// Hàm khởi tạo embedder chỉ hỗ trợ openai-compatible
export function getEmbedderFromConfig(llmConfig?: PartialLLMConfig) {
  const embedderBaseUrl = llmConfig?.embedderBaseUrl || process.env.EMBEDDER_BASE_URL;
  const embedderModel = llmConfig?.embedderModel || "text-embedding-3-small";
  if (!embedderBaseUrl) throw new Error("Custom embedder requires EMBEDDER_BASE_URL");
  // Custom embedder function for OpenAI-compatible or any HTTP endpoint
  return {
    spec: "v1",
    async embed({ value }: { value: string }) {
      const response = await fetch(embedderBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: embedderModel,
          input: value,
          encoding_format: "float"
        })
      });
      const data = (await response.json()) as any;
      // Đảm bảo trả về đúng format cho AI SDK
      return { embedding: data.data?.[0]?.embedding || data.embedding };
    }
  };
}
// ...existing code...
/**
 * Application-level configuration (non-LLM specifics).
 * Centralizes database config and can be extended later.
 */

// LLM config types và default config chuyển từ llm-config.ts sang

export interface LLMConfig {
  baseUrl: string;
  apiKey: string | undefined;
  models: {
    generate: string;
    reasoning: string;
    small: string;
  };
  default: {
    timeoutMs: number;
    retries: number;
    backoffMs: number;
  };
  embedderProvider?: string; // "openai", ...
  embedderModel?: string; // "text-embedding-3-small", ...
    embedderBaseUrl?: string; // endpoint cho embedder custom kiểu openai
}

export type PartialLLMConfig = Partial<LLMConfig>;



export interface AppConfig {
  databaseUrl: string;
  llm?: PartialLLMConfig;
}
export const appConfig: AppConfig = {
  databaseUrl: process.env.DATABASE_URL || 'file:../mastra.db',
  llm: {
    baseUrl: process.env.VLLM_BASE_URL || process.env.OPENAI_API_BASE_URL || 'http://localhost:8000/v1',
    apiKey: process.env.VLLM_API_KEY || process.env.OPENAI_API_KEY,
    models: {
      generate: process.env.GENERATE_MODEL || 'gpt-oss-20b',
      reasoning: process.env.REASONING_MODEL || 'gpt-oss-20b',
      small: process.env.SMALL_GENERATE_MODEL || 'gpt-oss-20b'
    },
    default: {
      timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10),
      retries: parseInt(process.env.LLM_RETRIES || '1', 10),
      backoffMs: parseInt(process.env.LLM_BACKOFF_MS || '500', 10)
    },
    embedderProvider: process.env.EMBEDDER_PROVIDER || 'openai',
    embedderModel: process.env.EMBEDDER_MODEL || 'text-embedding-3-small',
  }
};
// Helper type for partial LLM config (nếu cần dùng ở nơi khác)
// export type PartialLLMConfig = Partial<import('./llm/llm-config').LLMConfig>;