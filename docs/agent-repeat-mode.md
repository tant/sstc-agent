# Agent Repeat Mode

## Overview

The agent repeat mode is a feature that allows the AI agent to simply repeat back the user's message instead of generating a response. This can be useful for testing or debugging purposes.

## Enabling Repeat Mode

To enable repeat mode, set the following environment variable in your `.env` file:

```
AGENT_REPEAT_MODE=true
```

## Disabling Repeat Mode

To disable repeat mode (default behavior), either remove the environment variable or set it to false:

```
AGENT_REPEAT_MODE=false
```

## How it Works

When repeat mode is enabled, the workflow will bypass the AI agent and simply return a response in the format:

```
Bạn vừa nói: "{user_message}"
```

This allows you to test the message flow without consuming API credits or waiting for AI generation.

## Usage

This feature is particularly useful for:
- Testing message processing pipelines
- Debugging channel integrations
- Verifying that messages are correctly received and processed
- Reducing API costs during development and testing