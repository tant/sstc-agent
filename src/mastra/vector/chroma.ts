
import { ChromaVector } from "@mastra/chroma";

const CHROMA_HOST = process.env.CHROMA_HOST || "localhost";
const CHROMA_PORT = process.env.CHROMA_PORT ? Number(process.env.CHROMA_PORT) : 8000;
const CHROMA_SSL = process.env.CHROMA_SSL === "true";
const CHROMA_API_KEY = process.env.CHROMA_API_KEY;
const CHROMA_TENANT = process.env.CHROMA_TENANT;
const CHROMA_DATABASE = process.env.CHROMA_DATABASE;

console.log('[Chroma Vector] host:', CHROMA_HOST, 'port:', CHROMA_PORT, 'ssl:', CHROMA_SSL);

export const chromaVector = new ChromaVector({
  host: CHROMA_HOST,
  port: CHROMA_PORT,
  ssl: CHROMA_SSL,
  apiKey: CHROMA_API_KEY,
  tenant: CHROMA_TENANT,
  database: CHROMA_DATABASE,
});
