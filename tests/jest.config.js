module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/e2e'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'e2e/**/*.ts'
  ],
  coverageDirectory: '../coverage',
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        "tsconfig": "tsconfig.json"
      }
    ]
  },
  setupFilesAfterEnv: []
};