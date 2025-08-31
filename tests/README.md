# SSTC Agent End-to-End Tests

This directory contains comprehensive end-to-end tests for the SSTC Agent.

## Test Categories

### 1. Basic Conversation Flow Tests
- Testing agent's response to greetings
- Product recommendations (SSD, GPU, Mainboard)
- Language switching capabilities

### 2. Advanced Scenarios
- Complex multi-turn conversations
- Handling difficult customers
- Upselling and cross-selling

### 3. Memory and Context Tests
- Working memory functionality
- Semantic recall
- Context preservation across topics

### 4. Edge Cases
- Special characters and emojis
- Very long and very short messages
- Mixed languages
- Stress testing

## Prerequisites

1. The SSTC Agent must be running on `http://localhost:4111`
2. All required services (vLLM, Embedding server, ChromaDB) must be accessible

## Running Tests

### Install Dependencies
```bash
cd tests
pnpm install
```

### Run All E2E Tests
```bash
pnpm test:e2e
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Specific Test Files
```bash
pnpm jest agent.e2e.test.ts
pnpm jest advanced-scenarios.e2e.test.ts
pnpm jest memory-context.e2e.test.ts
pnpm jest edge-cases.e2e.test.ts
```

## Test Logging

All tests automatically log their conversations and results for debugging purposes:

### Log Directory Structure
```
tests/logs/
├── test-results/          # Test results and summaries
└── conversation-logs/     # Detailed conversation logs
```

### Log Files

1. **Test Result Logs**: `tests/logs/test-results/{test-name}-{timestamp}.log`
   - Contains test execution information
   - Logs test pass/fail status
   - Includes error messages if any

2. **Conversation Logs**: `tests/logs/conversation-logs/{test-name}-{timestamp}-conversation.json`
   - Contains full conversation history
   - Logs input messages and agent responses
   - Includes response metadata (usage, finishReason, etc.)

3. **Test Reports**: `tests/logs/test-results/{test-name}-result.json`
   - Structured test result data
   - Timestamp and pass/fail status
   - Additional test details

### Example Log Content

**Conversation Log** (`conversation-logs/basic-greeting-2025-08-30T12-00-00-conversation.json`):
```json
{
  "timestamp": "2025-08-30T12:00:00.000Z",
  "testName": "basic-greeting",
  "input": [
    {
      "role": "user",
      "content": "Xin chào"
    }
  ],
  "output": {
    "text": "Xin chào quý khách! 👋 ...",
    "usage": {
      "promptTokens": 1067,
      "completionTokens": 86,
      "totalTokens": 1153
    },
    "finishReason": "stop"
  }
}
```

## Test Environment Variables

- `MASTRA_API_KEY`: API key for authentication (default: 'test-key')

## Test Structure

Each test file focuses on specific aspects:

1. **agent.e2e.test.ts**: Basic functionality and core conversation flows
2. **advanced-scenarios.e2e.test.ts**: Complex conversation patterns and business logic
3. **memory-context.e2e.test.ts**: Memory retention and context management
4. **edge-cases.e2e.test.ts**: Special cases and stress testing

## Test Timeouts

- Individual tests: 30 seconds
- Complex scenarios: 45-90 seconds
- Stress tests: Up to 90 seconds

## Coverage

Tests cover:
- ✅ Basic conversation flows
- ✅ Multi-turn dialogues
- ✅ Language switching
- ✅ Product recommendations
- ✅ Handling inappropriate questions
- ✅ Memory and context retention
- ✅ Complex scenarios
- ✅ Edge cases
- ✅ Performance under load
- ✅ Error recovery