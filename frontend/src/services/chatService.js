const API_URL = import.meta.env.PROD
  ? "/ai/api/chat"
  : "http://127.0.0.1:5006/api/chat";

export async function sendChatMessage(message, history, signal, model = "auto") {
  let response;

  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history, model }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    const connectionError = new Error(
      "Unable to connect to the MOTICH AI backend.",
    );

    connectionError.code = "BACKEND_CONNECTION_ERROR";
    throw connectionError;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    const parseError = new Error(
      "The MOTICH AI backend returned invalid JSON.",
    );

    parseError.code = "BACKEND_INVALID_JSON";
    parseError.status = response.status;

    throw parseError;
  }

  if (!response.ok) {
    const apiError = new Error(
      typeof data?.error === "string"
        ? data.error
        : `Chat request failed with HTTP ${response.status}.`,
    );

    apiError.code = data?.code || "BACKEND_HTTP_ERROR";
    apiError.status = response.status;

    throw apiError;
  }

  if (typeof data?.response !== "string" || !data.response.trim()) {
    const invalidError = new Error(
      "The MOTICH AI backend returned an invalid response.",
    );

    invalidError.code = "BACKEND_INVALID_RESPONSE";
    throw invalidError;
  }

  return data;
}
