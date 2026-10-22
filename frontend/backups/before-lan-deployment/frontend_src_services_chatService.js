const API_URL = "http://127.0.0.1:5005/api/chat";

export async function sendChatMessage(message, history, signal) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with HTTP ${response.status}`);
  }

  const data = await response.json();

  if (typeof data.response !== "string") {
    throw new Error("Invalid response from MOTICH AI backend.");
  }

  return data;
}
