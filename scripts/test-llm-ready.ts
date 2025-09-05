/**
 * Unified test script: validate env, test agent, test LLM connection
 */

import path from "node:path";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables from .env file explicitly
const envPath = path.resolve(process.cwd(), ".env");
console.log("🔧  Loading .env from:", envPath);
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
	console.error("❌  Failed to load .env file:", result.error);
} else {
	console.log("✅  Successfully loaded .env file");
}

// Debug CHROMA variables
console.log("🔧  All CHROMA_ variables after dotenv load:");
Object.keys(process.env)
	.filter((key) => key.startsWith("CHROMA"))
	.forEach((key) => {
		console.log(`  ${key}: ${process.env[key]}`);
	});

import { ChromaVector } from "@mastra/chroma";

async function testProviderApi() {
	const baseUrl =
		process.env.VLLM_BASE_URL ||
		process.env.OPENAI_API_BASE_URL ||
		"http://localhost:8000/v1";
	const apiKey = process.env.VLLM_API_KEY || process.env.OPENAI_API_KEY;
	const model = process.env.GENERATE_MODEL || "gpt-oss-20b";
	const url = `${baseUrl.replace(/\/$/, "")}/completions`;
	console.log("\n==============================");
	console.log("🤖  [STEP 2] Testing LLM Provider API");
	console.log("------------------------------");
	console.log(`🌐  Base URL: \x1b[36m${baseUrl}\x1b[0m`);
	console.log(`🧠  Model: \x1b[33m${model}\x1b[0m`);
	if (apiKey) {
		console.log("🔑  API Key: \x1b[32mFound\x1b[0m");
	} else {
		console.log("🔑  API Key: \x1b[31mNot found (may not be required)\x1b[0m");
	}
	console.log("==============================\n");
	try {
		const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
		const res = await axios.post(
			url,
			{
				model,
				prompt: "Say hello from provider test",
				max_tokens: 20,
			},
			{ headers },
		);
		if (res.data?.choices?.[0]?.text) {
			console.log(
				`✅  Provider API response: "${res.data.choices[0].text.trim()}"`,
			);
			console.log("\x1b[32m🎉  Provider API test PASSED!\x1b[0m\n");
		} else {
			throw new Error("No valid completion in response");
		}
	} catch (error: unknown) {
		if (
			typeof error === "object" &&
			error !== null &&
			"response" in error &&
			typeof (error as { response?: unknown }).response === "object" &&
			(error as { response?: { data?: unknown } }).response !== null
		) {
			const errObj = error as { response: { data?: unknown } };
			if ("data" in errObj.response) {
				console.error(
					"\x1b[41m❌  Provider API test FAILED:\x1b[0m",
					errObj.response.data || error,
				);
			} else {
				console.error("\x1b[41m❌  Provider API test FAILED:\x1b[0m", error);
			}
		} else {
			console.error("\x1b[41m❌  Provider API test FAILED:\x1b[0m", error);
		}
		process.exit(1);
	}
}

async function testEmbedderApi() {
	let baseUrl = process.env.EMBEDDER_BASE_URL;
	const model = process.env.EMBEDDER_MODEL;
	const apiKey = process.env.EMBEDDER_API_KEY;
	if (!baseUrl) {
		console.log(
			"\x1b[33m⚠️  EMBEDDER_BASE_URL not set, skipping embedder test.\x1b[0m",
		);
		return;
	}
	console.log("\n==============================");
	console.log("🧪  [STEP 3] Testing Embedder API");
	console.log("------------------------------");
	console.log(`🌐  Embedder URL: \x1b[36m${baseUrl}\x1b[0m`);
	if (model) console.log(`🧠  Embedder Model: \x1b[33m${model}\x1b[0m`);
	if (apiKey) console.log("🔑  Embedder API Key: \x1b[32mFound\x1b[0m");
	else
		console.log(
			"🔑  Embedder API Key: \x1b[31mNot found (may not be required)\x1b[0m",
		);
	console.log("==============================\n");
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
		// Đảm bảo URL đúng cho embeddings API
		// Nếu baseUrl đã kết thúc bằng /embeddings thì không thêm nữa
		if (baseUrl.endsWith("/embeddings")) {
			// Không làm gì, URL đã đúng
		} else if (baseUrl.endsWith("/v1")) {
			// Thêm /embeddings vào
			baseUrl = `${baseUrl}/embeddings`;
		} else {
			// Thêm /v1/embeddings vào
			baseUrl = `${baseUrl.replace(/\/+$/, "")}/v1/embeddings`;
		}
		console.log(`🚀  Testing URL: ${baseUrl}`);
		const res = await axios.post(
			baseUrl,
			{
				input: ["hello from embedder test"],
				model,
			},
			{ headers },
		);
		if (
			res.data &&
			Array.isArray(res.data.data) &&
			res.data.data[0]?.embedding
		) {
			console.log(
				`✅  Embedder API response: embedding length = ${res.data.data[0].embedding.length}`,
			);
			console.log("\x1b[32m🎉  Embedder API test PASSED!\x1b[0m\n");
		} else {
			throw new Error("No valid embedding in response");
		}
	} catch (error) {
		console.error("\x1b[41m❌  Embedder API test FAILED:\x1b[0m", error);
		process.exit(1);
	}
}

async function testChromaDb() {
	console.log("\n==============================");
	console.log("🧪  [STEP 4] Testing ChromaDB (vector store)");
	console.log("------------------------------");
	try {
		// Tạo ChromaVector instance với config từ environment variables
		const CHROMA_HOST = process.env.CHROMA_HOST || "localhost";
		const CHROMA_PORT = process.env.CHROMA_PORT
			? Number(process.env.CHROMA_PORT)
			: 8000;
		const CHROMA_SSL = process.env.CHROMA_SSL === "true";

		console.log(`🌐  ChromaDB Host: ${CHROMA_HOST}`);
		console.log(`🌐  ChromaDB Port: ${CHROMA_PORT}`);
		console.log(`🌐  ChromaDB SSL: ${CHROMA_SSL}`);

		const chromaVector = new ChromaVector({
			host: CHROMA_HOST,
			port: CHROMA_PORT,
			ssl: CHROMA_SSL,
		});

		const indexName = "test-chroma-connection";
		await chromaVector.createIndex({
			indexName,
			dimension: 3,
			metric: "cosine",
		});
		await chromaVector.upsert({
			indexName,
			vectors: [[1, 2, 3]],
			ids: ["vec1"],
			documents: ["test document"],
		});
		const results = await chromaVector.query({
			indexName,
			queryVector: [1, 2, 3],
			topK: 1,
		});
		if (results && results.length > 0 && results[0]?.id) {
			console.log(`✅  ChromaDB query response: id = ${results[0].id}`);
			console.log("\x1b[32m🎉  ChromaDB test PASSED!\x1b[0m\n");
		} else {
			throw new Error("No result from ChromaDB");
		}
	} catch (error) {
		console.error("\x1b[41m❌  ChromaDB test FAILED:\x1b[0m", error);
		process.exit(1);
	}
}

async function main() {
	try {
		console.log("\n==============================");
		console.log("🧪  [STEP 1] Environment Validation");
		console.log("------------------------------");
		// Bước 1: validate env
		const required = [
			"VLLM_BASE_URL",
			"DATABASE_URL",
			"EMBEDDER_BASE_URL",
			"EMBEDDER_MODEL",
			"CHROMA_HOST",
			"CHROMA_PORT",
			"CHROMA_SSL",
		];
		const missing = required.filter((key) => !process.env[key]);
		if (missing.length > 0) {
			console.error(
				`\x1b[41m❌  Missing required environment variables:\x1b[0m`,
				missing,
			);
			console.log(
				"🔎  Please check your .env file and set the missing variables.",
			);
			process.exit(1);
		}
		console.log("\x1b[32m✅  Environment validation PASSED!\x1b[0m");
		console.log("==============================\n");

		// Bước 2: kiểm tra provider hoạt động bằng cách gọi API completions (OpenAI compatible)
		await testProviderApi();
		await testEmbedderApi();
		await testChromaDb();

		console.log("==============================");
		console.log("\x1b[42m🚀  ALL TESTS COMPLETED SUCCESSFULLY!\x1b[0m");
		console.log("==============================\n");
	} catch (error) {
		console.error("\x1b[41m❌  Unified test FAILED:\x1b[0m", error);
		process.exit(1);
	}
}

main();
