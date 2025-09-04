// LibSQL database provider for Mastra agent
// Reads config from .env and exports a factory/instance for LibSQL

const LIBSQL_URL = process.env.LIBSQL_URL || "";
const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN || "";

console.log("[LibSQL] url:", LIBSQL_URL);

export function getLibSQLConfig() {
	return {
		url: LIBSQL_URL,
		authToken: LIBSQL_AUTH_TOKEN,
	};
}
