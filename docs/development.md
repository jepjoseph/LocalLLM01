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
