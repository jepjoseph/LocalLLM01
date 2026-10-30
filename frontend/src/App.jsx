import { useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatComposer from "./components/ChatComposer";
import { sendChatMessage } from "./services/chatService";
import "./App.css";

const welcomeMessage = {
  id: 1,
  role: "assistant",
  content:
    "Welcome to MOTICH AI! Your personal AI assistant powered by a locally hosted language model.",
};

export default function App() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRequest = useRef(null);

  async function handleSend(content) {
    if (activeRequest.current) return;

    const controller = new AbortController();
    activeRequest.current = controller;

    const timeout = setTimeout(() => controller.abort(), 130000);

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

      const result = await sendChatMessage(content, history, controller.signal);

      if (activeRequest.current !== controller) return;

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.response,
        },
      ]);
    } catch (requestError) {
      if (activeRequest.current !== controller) return;

      setError(
        requestError.name === "AbortError"
          ? "The AI request timed out. Please try again."
          : "Unable to contact MOTICH AI. Check that Express and llamafile are running.",
      );
    } finally {
      clearTimeout(timeout);

      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">M</div>

          <div>
            <h1>MOTICH AI</h1>
            <p>Personal Intelligence</p>
          </div>
        </div>

        <button className="new-chat-button" onClick={handleNewChat}>
          + New Chat
        </button>

        <div className="sidebar-footer">
          <div className="workspace-status">
            <span className="status-dot" />
            <span>Local AI Workspace</span>
          </div>

          <span className="app-version">MOTICH AI · v1.0</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h2>MOTICH AI Assistant</h2>
            <p>Powered by MOTICH</p>
          </div>

          <span className="model-badge">Local Model</span>
        </header>

        <section className="chat-area" aria-label="Chat conversation">
          <div className="chat-messages">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}

            {isLoading && (
              <div className="message message-ai" role="status">
                <div className="message-avatar">M</div>
                <div className="message-body">
                  <div className="message-author">MOTICH AI</div>
                  <div className="message-content">Generating response...</div>
                </div>
              </div>
            )}

            {error && (
              <p role="alert" style={{ color: "#fca5a5" }}>
                {error}
              </p>
            )}
          </div>
        </section>

        <div className="composer-area">
          <ChatComposer onSend={handleSend} isLoading={isLoading} />
          <p className="composer-note">
            MOTICH AI uses a locally hosted language model. Responses may
            contain inaccuracies.
          </p>
        </div>
      </main>
    </div>
  );
}
