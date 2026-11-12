const { resolveModel } = require("./llmService");

const CLASSIFIER_TIMEOUT_MS = 12000;
const CODING_PATTERNS = [
  /```[\s\S]*?```/,
  /\b(?:write|create|generate|implement|debug|fix|refactor|optimize|review|test)\b.{0,90}\b(?:code|script|function|class|program|algorithm|api|component|query|regex|sql|python|javascript|typescript|java|react|node(?:\.js)?|powershell|bash|c\+\+|vhdl)\b/i,
  /\b(?:syntaxerror|typeerror|referenceerror|traceback|stack trace|npm err|exception|segmentation fault|compilation error)\b/i,
  /\b(?:git commit|git merge|dockerfile|useeffect|async\/await|select\s+.+\s+from\s+|def\s+\w+\s*\(|function\s+\w+\s*\()\b/i,
];
const GENERAL_PATTERNS = [
  /^(?:hi|hello|hey|thanks|thank you)[.!?\s]*$/i,
  /^(?:what is|who is|where is|when was|explain|tell me about)\s+(?:the\s+)?(?:capital|history|weather|meaning|definition|geography|solar system|photosynthesis)\b/i,
];

function parseClassification(text) {
  const normalized = String(text || "").trim().toLowerCase();
  const match = normalized.match(/^(general|coding)(?:\s*[.!])?$/);
  return match ? match[1] : null;
}

async function classifyWithGeneral(message, history) {
  const { config } = resolveModel("general");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLASSIFIER_TIMEOUT_MS);
  const recent = history.slice(-4).map((entry) => `${entry.role}: ${entry.content.slice(0, 350)}`).join("\n");
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You classify user requests for an AI assistant. Reply with exactly one lowercase word: coding or general. Choose coding for requests involving writing, editing, debugging, explaining specific code, programming tools, SQL queries, scripts, or software implementation. Choose general for other questions. Use conversation context only to disambiguate follow-up requests. Do not answer the user's question." },
          { role: "user", content: `Recent conversation:\n${recent || '(none)'}\n\nNew request:\n${message}\n\nClassification:` },
        ],
        temperature: 0,
        max_tokens: 12,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Classifier HTTP ${response.status}`);
    const data = await response.json();
    return parseClassification(data?.choices?.[0]?.message?.content);
  } finally {
    clearTimeout(timer);
  }
}

async function selectModel(mode, message, history = []) {
  if (!["auto", "general", "coding"].includes(mode)) {
    const error = new Error("Model must be auto, general, or coding.");
    error.code = "LLM_INVALID_MODEL";
    throw error;
  }
  if (mode !== "auto") {
    resolveModel(mode);
    return { modelType: mode, selectionMode: mode, routingMethod: "manual" };
  }
  if (CODING_PATTERNS.some((pattern) => pattern.test(message))) {
    return { modelType: "coding", selectionMode: "auto", routingMethod: "rule" };
  }
  if (GENERAL_PATTERNS.some((pattern) => pattern.test(message))) {
    return { modelType: "general", selectionMode: "auto", routingMethod: "rule" };
  }
  try {
    const classified = await classifyWithGeneral(message, history);
    if (classified) {
      resolveModel(classified);
      return { modelType: classified, selectionMode: "auto", routingMethod: "classifier" };
    }
  } catch (error) {
    console.warn("Model classification unavailable:", error.message);
  }
  resolveModel("general");
  return { modelType: "general", selectionMode: "auto", routingMethod: "fallback" };
}

module.exports = { selectModel, parseClassification };