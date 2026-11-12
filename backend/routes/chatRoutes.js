const express = require("express");
const { generateResponse, resolveModel } = require("../services/llmService");
const { getSystemPrompt } = require("../services/promptService");
const { selectModel } = require("../services/modelRouterService");

const router = express.Router();

const MAX_MESSAGE_LENGTH = 20000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CONTENT_LENGTH = 4000;

router.post("/", async (req, res) => {
  const {
    message,
    history = [],
    model = "auto",
  } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "A non-empty message is required.",
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: "Message exceeds the maximum allowed length.",
    });
  }

  if (!Array.isArray(history) || history.length > MAX_HISTORY_MESSAGES) {
    return res.status(400).json({
      error: "History must be an array of at most 20 messages.",
    });
  }

  const validHistory = history.every(
    (entry) =>
      entry !== null &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      (entry.role === "user" || entry.role === "assistant") &&
      typeof entry.content === "string" &&
      entry.content.trim().length > 0 &&
      entry.content.length <= MAX_HISTORY_CONTENT_LENGTH
  );

  if (!validHistory) {
    return res.status(400).json({
      error: "History contains invalid messages.",
    });
  }

  let selected;

  try {
    selected = await selectModel(model, message.trim(), history);
  } catch (error) {
    return res.status(400).json({
      error: error.message,
      code: error.code || "LLM_INVALID_MODEL",
    });
  }

  const messages = [
    {
      role: "system",
      content: getSystemPrompt(selected.modelType),
    },
    ...history.map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    })),
    {
      role: "user",
      content: message.trim(),
    },
  ];

  try {
    const result = await generateResponse(messages, selected.modelType);

    return res.status(200).json({
      model: result.model,
      modelType: result.modelType,
      selectionMode: selected.selectionMode,
      routingMethod: selected.routingMethod,
      response: result.content,
    });
  } catch (error) {
    console.error("Chat generation failed:", {
      code: error.code || "UNEXPECTED_ERROR",
      message: error.message,
      details: error.details,
    });

    const errorMap = {
      LLM_TIMEOUT: {
        status: 504,
        message: "AI inference timed out. Please try again.",
      },
      LLM_CONNECTION_ERROR: {
        status: 503,
        message: "AI inference service is unavailable.",
      },
      LLM_HTTP_ERROR: {
        status: 502,
        message: "AI inference service returned an error.",
      },
      LLM_INVALID_JSON: {
        status: 502,
        message: "AI inference service returned invalid data.",
      },
      LLM_INVALID_RESPONSE: {
        status: 502,
        message: "AI inference service returned an invalid response.",
      },
      LLM_EMPTY_RESPONSE: {
        status: 502,
        message: "AI inference service returned an empty response.",
      },
    };

    const mappedError = errorMap[error.code] || {
      status: 500,
      message: "An unexpected server error occurred.",
    };

    return res.status(mappedError.status).json({
      error: mappedError.message,
      code: error.code && errorMap[error.code]
        ? error.code
        : "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;
