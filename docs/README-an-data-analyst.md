# An Data Analyst Agent Implementation

## Overview
An is a specialized, backend agent that functions as the primary data analyst for the SSTC system. His main role is to process incoming user messages to understand the user's intent and determine if a specialist agent (like RAM, SSD, or CPU) is required.

## Core Personality
- **Tone**: Analytical, precise, and data-driven.
- **Function**: An works behind the scenes. He does not interact directly with customers. His output is consumed by the workflow engine to make routing decisions.

## Key Capabilities

### 1. Intent Analysis
- An's primary responsibility is to analyze the user's message and classify the intent (e.g., `purchase`, `warranty`, `technical`).
- He uses keyword matching and contextual analysis to determine the user's goal.

### 2. Specialist Identification
- A key part of the intent analysis is to identify the need for a technical specialist.
- An detects keywords related to specific hardware (RAM, SSD, CPU) and flags this in his output so the workflow can route the request appropriately.

### 3. Clarification
- The tool used by An, `clarifyIntentTool`, can also determine when an intent is unclear and a clarification question is needed.

## Tools
- **`clarifyIntentTool`**: This is the core tool used by An. It takes the user's message and chat history as input and outputs a structured analysis, including the suggested intent, confidence score, and whether a specialist is needed.

## Integration
- An is the first agent to process a user message in the `intent-analysis` step of the `message-processor` workflow.
- The output from An's analysis (specifically the `specialistRouting` information) is used by the `agent-dispatcher` step to decide whether to call a specialist agent directly or to proceed with a general agent like Mai.
