import { useRef, useState } from "react";
import { sendChatMessage } from "../services/chatService";

const welcomeMessage = {
  id: 1,
  role: "assistant",
  content:
    "Welcome to MOTICH AI! Your personal AI assistant powered by a locally hosted language model.",
};

export default function useChat() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [modelMode, setModelMode] = useState("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRequest = useRef(null);

  async function handleSend(content) {
    if (activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;

    const timeout = setTimeout(() => controller.abort(), 250000);

    setError("");
    setIsLoading(true);

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content,
      },
    ]);

    try {
      const history = messages
        .filter((entry) => entry.id !== welcomeMessage.id)
        .filter(
          (entry) =>
            (entry.role === "user" || entry.role === "assistant") &&
            entry.content.length <= 4000,
        )
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));

      const result = await sendChatMessage(
        content,
        history,
        controller.signal,
        modelMode,
      );

      if (activeRequest.current !== controller) return;

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.response,
          modelType: result.modelType,
        },
      ]);
    } catch (requestError) {
      if (activeRequest.current !== controller) return;

      console.error("MOTICH AI chat request failed:", {
        name: requestError.name,
        code: requestError.code,
        status: requestError.status,
        message: requestError.message,
      });

      if (requestError.name === "AbortError") {
        setError("The AI request was canceled or timed out.");
      } else {
        setError(
          requestError.message ||
            "An unexpected error occurred while contacting MOTICH AI.",
        );
      }
    } finally {
      clearTimeout(timeout);

      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  function handleModelChange(event) {
    const nextMode = event.target.value;
    if (nextMode === modelMode) return;
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
    setModelMode(nextMode);
    setMessages([welcomeMessage]);
    setError("");
    setIsLoading(false);
  }

  function handleNewChat() {
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }

    setMessages([welcomeMessage]);
    setError("");
    setIsLoading(false);
  }

  return { messages, modelMode, isLoading, error, handleSend, handleModelChange, handleNewChat };
}
