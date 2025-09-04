module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>"],
	testMatch: ["**/*.test.ts"],
	collectCoverageFrom: ["**/*.test.ts"],
	verbose: true,
	testTimeout: 30000,
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
			},
		],
	},
};
