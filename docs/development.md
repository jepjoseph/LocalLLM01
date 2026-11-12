# LLM Update plan from 2.0 to 2.0.1

## What to improve first

| num | Component            | Recommended improvement                            | Priority |
| --- | -------------------- | -------------------------------------------------- | -------- |
| 1.  | Backend timeout      | Allow sufficient time for longer inference         | Critical |
| 2.  | Output tokens        | Increase from 300 to 1,024 initially               | High     |
| 3.  | Thinking mode        | Explicitly set enable_thinking false               | High     |
| 4.  | Error handling       | Distinguish timeout, HTTP error, and model failure | Critical |
| 5.  | Model identifier     | Verify compatibility with standalone llama.cpp     | High     |
| 6.  | Conversation history | Control history length and token usage             | High     |
| 7.  | Context window       | Test increasing from 4,096 to 8,192                | Medium   |
| 8.  | Additional models    | Add a larger general model and a coding specialist | Later    |
| 9.  | RAG Retrieve         | relevant information from your documents           | Later    |

# Actual system configuration

1. What we discovered
   Component Current development configuration Assessment
   Backend Express 5.3.0 Existing
   Backend port 5006 Configured
   llama.cpp endpoint 127.0.0.1:8080 Configured
   Model Qwen3.5-0.8B-Q8_0 Configured
   Output limit 300 tokens Increase to 1,024
   Backend timeout 120 seconds Test and potentially increase
   Thinking mode Disabled Already correct
   Conversation history Maximum 20 messages Needs token-aware management
   Error handling Generic HTTP/empty-response errors Improve
   Model ID Absolute GGUF path Verify against /v1/models

## MOTICH AI 2.0 — Development Improvement Plan

| File / Location                        | What We'll Change                                                           | Expected Improvement                                                        |
| -------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `backend/services/llmService.js`       | Increase `max_tokens` from 300 to 1,024                                     | Allow longer, more complete answers.                                        |
| `backend/services/llmService.js`       | Make the 120-second timeout configurable and test a longer limit            | Reduce failures on complicated questions.                                   |
| `backend/services/llmService.js`       | Improve HTTP, timeout, and invalid-response error handling                  | Identify the actual reason an AI request fails.                             |
| `backend/routes/chatRoutes.js`         | Return appropriate error codes and safe, meaningful messages                | Let the frontend distinguish different failures.                            |
| `frontend/src/App.jsx`                 | Replace the generic connection error and align the frontend timeout         | Show useful errors instead of incorrectly referencing llamafile.            |
| `frontend/src/services/chatService.js` | Inspect and improve request error propagation if needed                     | Preserve backend error details.                                             |
| `backend/routes/chatRoutes.js`         | Introduce token-aware conversation-history limits (later phase)             | Prevent oversized conversations from exhausting the model's context window. |
| `Start-LlamaCpp.ps1`                   | Test increasing the context window from 4,096 to 8,192 tokens (later phase) | Allow more conversation context, subject to available system memory.        |

## Exactly What We're Changing

**File:** `D:\FAU\Session Fall 2026\AI201\LocalLLM01\backend\routes\chatRoutes.js`

| Error from `llmService.js` | HTTP Status | Message Returned to Frontend                       |
| -------------------------- | ----------- | -------------------------------------------------- |
| `LLM_TIMEOUT`              | 504         | AI inference timed out. Please try again.          |
| `LLM_CONNECTION_ERROR`     | 503         | AI inference service is unavailable.               |
| `LLM_HTTP_ERROR`           | 502         | AI inference service returned an error.            |
| `LLM_INVALID_JSON`         | 502         | AI inference service returned invalid data.        |
| `LLM_INVALID_RESPONSE`     | 502         | AI inference service returned an invalid response. |
| `LLM_EMPTY_RESPONSE`       | 502         | AI inference service returned an empty response.   |
| Unexpected error           | 500         | An unexpected server error occurred.               |
