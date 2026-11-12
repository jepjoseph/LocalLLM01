const modelRegistry = require("../config/models.json");

class LLMServiceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "LLMServiceError";
    this.code = code;
    this.details = details;
  }
}

function resolveModel(modelType = modelRegistry.defaultModel) {
  if (typeof modelType !== "string") {
    throw new LLMServiceError(
      "LLM_INVALID_MODEL",
      "Model selection must be a string."
    );
  }

  const config = Object.prototype.hasOwnProperty.call(
    modelRegistry.models,
    modelType
  )
    ? modelRegistry.models[modelType]
    : null;

  if (!config || !config.enabled || !config.endpoint) {
    throw new LLMServiceError(
      "LLM_INVALID_MODEL",
      "The requested AI model is unavailable."
    );
  }

  const endpoint = new URL(config.endpoint);

  if (
    endpoint.protocol !== "http:" ||
    endpoint.hostname !== "127.0.0.1" ||
    !["8080", "8082"].includes(endpoint.port) ||
    endpoint.pathname !== "/v1/chat/completions"
  ) {
    throw new LLMServiceError(
      "LLM_INVALID_CONFIGURATION",
      "The AI model endpoint configuration is invalid."
    );
  }

  return { modelType, config };
}

async function generateResponse(messages, modelType) {
  const selected = resolveModel(modelType);
  const { config } = selected;

  // Keep the current timeout contract until the frontend
  // and backend timeouts are updated together.
  const timeoutMs = 240000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  let data;

  try {
    try {
      response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          stream: false,
          chat_template_kwargs: {
            enable_thinking: false,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        error.name === "TimeoutError" ||
        error.name === "AbortError"
      ) {
        throw new LLMServiceError(
          "LLM_TIMEOUT",
          "AI inference request timed out.",
          { timeoutMs, modelType: selected.modelType }
        );
      }

      throw new LLMServiceError(
        "LLM_CONNECTION_ERROR",
        "Unable to connect to the AI inference server.",
        { cause: error.message, modelType: selected.modelType }
      );
    }

    if (!response.ok) {
      throw new LLMServiceError(
        "LLM_HTTP_ERROR",
        `AI inference server returned HTTP ${response.status}.`,
        { status: response.status, modelType: selected.modelType }
      );
    }

    try {
      data = await response.json();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new LLMServiceError(
          "LLM_TIMEOUT",
          "AI inference response timed out.",
          { timeoutMs, modelType: selected.modelType }
        );
      }

      throw new LLMServiceError(
        "LLM_INVALID_JSON",
        "AI inference server returned invalid JSON.",
        { cause: error.message }
      );
    }
  } finally {
    clearTimeout(timeout);
  }

  if (!data || !Array.isArray(data.choices) || !data.choices[0]?.message) {
    throw new LLMServiceError(
      "LLM_INVALID_RESPONSE",
      "AI inference server returned an invalid response structure."
    );
  }

  const content = data.choices[0].message.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new LLMServiceError(
      "LLM_EMPTY_RESPONSE",
      "AI inference server returned an empty response."
    );
  }

  return {
    model: data.model || config.name,
    modelType: selected.modelType,
    content,
  };
}

module.exports = {
  generateResponse,
  resolveModel,
};
