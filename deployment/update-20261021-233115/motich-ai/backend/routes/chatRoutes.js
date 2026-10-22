const express = require("express");
const { generateResponse } = require("../services/llmService");

const router = express.Router();

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CONTENT_LENGTH = 4000;

router.post("/", async (req, res) => {
  const { message, history = [] } = req.body ?? {};

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

  const messages = [
    {
      role: "system",
      content:
        "You are MOTICH AI, a helpful technical assistant. " +
        "Use the conversation history to answer follow-up questions accurately. " +
        "If information is missing, say so rather than inventing details.",
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
    const result = await generateResponse(messages);

    return res.status(200).json({
      model: result.model,
      response: result.content,
    });
  } catch (error) {
    console.error("Chat generation failed:", error);

    return res.status(502).json({
      error: "Unable to generate an AI response.",
    });
  }
});

module.exports = router;
