const LLAMAFILE_URL = "http://127.0.0.1:8080/v1/chat/completions";
const MODEL_ID = "/zip/Qwen3.5-0.8B-Q8_0.gguf";

async function generateResponse(messages) {
  const response = await fetch(LLAMAFILE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages,
      max_tokens: 300,
      temperature: 0.7,
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("LLM returned an invalid response.");
  }

  return {
    model: data.model || MODEL_ID,
    content,
  };
}

module.exports = { generateResponse };
