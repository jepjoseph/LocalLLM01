const LLAMA_CPP_URL = "http://127.0.0.1:8080/v1/chat/completions";
const MODEL_ID =
  "D:\\FAU\\Session Fall 2026\\AI201\\LocalLLM01\\AI-Models-Storage\\general\\Qwen3.5-0.8B-Q8_0.gguf";

class LLMServiceError extends Error {
  constructor(code, message, details = {}) {
    super(message);

    this.name = "LLMServiceError";
    this.code = code;
    this.details = details;
  }
}

async function generateResponse(messages) {
  let response;

  // 1. Send the inference request.
  try {
    response = await fetch(LLAMA_CPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        stream: false,
        chat_template_kwargs: {
          enable_thinking: false,
        },
      }),
      signal: AbortSignal.timeout(240000),
    });
  } catch (error) {
    // 2. Classify timeout errors.
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new LLMServiceError(
        "LLM_TIMEOUT",
        "AI inference request timed out.",
        { timeoutMs: 240000 },
      );
    }

    // 3. Classify connection failures.
    throw new LLMServiceError(
      "LLM_CONNECTION_ERROR",
      "Unable to connect to the AI inference server.",
      { cause: error.message },
    );
  }

  // 4. Classify HTTP errors.
  if (!response.ok) {
    throw new LLMServiceError(
      "LLM_HTTP_ERROR",
      `AI inference server returned HTTP ${response.status}.`,
      { status: response.status },
    );
  }

  let data;

  // 5. Parse and validate JSON.
  try {
    data = await response.json();
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new LLMServiceError(
        "LLM_TIMEOUT",
        "AI inference response timed out.",
        { timeoutMs: 240000 },
      );
    }

    throw new LLMServiceError(
      "LLM_INVALID_JSON",
      "AI inference server returned invalid JSON.",
      { cause: error.message },
    );
  }

  // 6. Validate response structure.
  if (!data || !Array.isArray(data.choices) || !data.choices[0]?.message) {
    throw new LLMServiceError(
      "LLM_INVALID_RESPONSE",
      "AI inference server returned an invalid response structure.",
    );
  }

  const content = data.choices[0].message.content;

  // 7. Validate generated content.
  if (typeof content !== "string" || !content.trim()) {
    throw new LLMServiceError(
      "LLM_EMPTY_RESPONSE",
      "AI inference server returned an empty response.",
    );
  }

  return {
    model: data.model || MODEL_ID,
    content,
  };
}

module.exports = {
  generateResponse,
};
