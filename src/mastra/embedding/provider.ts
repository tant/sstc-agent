
// Embedding provider for Mastra agent
// Reads config from .env and exports a proper EmbeddingModel object

const EMBEDDER_BASE_URL = process.env.EMBEDDER_BASE_URL || '';
const EMBEDDER_API_KEY = process.env.EMBEDDER_API_KEY || '';
const EMBEDDER_MODEL = process.env.EMBEDDER_MODEL || '';

console.log('[Embedding Provider] baseUrl:', EMBEDDER_BASE_URL);
console.log('[Embedding Provider] model:', EMBEDDER_MODEL);

// Minimal EmbeddingModel interface for type compatibility
export interface EmbeddingModel<T = any> {
  name: string;
  embed: (input: string | string[]) => Promise<T>;
}

// Mastra expects an EmbeddingModel object with an embed method
// Use generic type and cast as needed for compatibility
export const embedder: EmbeddingModel<any> = {
  name: EMBEDDER_MODEL,
  embed: async (input: string | string[]) => {
    const texts = Array.isArray(input) ? input : [input];
    const response = await fetch(EMBEDDER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(EMBEDDER_API_KEY ? { 'Authorization': `Bearer ${EMBEDDER_API_KEY}` } : {})
      },
      body: JSON.stringify({
        model: EMBEDDER_MODEL,
        input: texts
      })
    });
    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    // Giả sử API trả về { data: [{ embedding: [...] }] }
    return data.data.map((d: any) => d.embedding);
  }
};
