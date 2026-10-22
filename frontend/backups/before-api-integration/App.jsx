import { useState } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatComposer from "./components/ChatComposer";
import "./App.css";

const welcomeMessage = {
  id: 1,
  role: "assistant",
  content:
    "Welcome to MOTICH AI! Your personal AI assistant powered by a locally hosted language model.",
};

export default function App() {
  const [messages, setMessages] = useState([welcomeMessage]);

  function handleSend(content) {
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((current) => [...current, userMessage]);
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

        <button
          className="new-chat-button"
          onClick={() => setMessages([welcomeMessage])}
        >
          + New Chat
        </button>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Local AI Workspace
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
          </div>
        </section>

        <div className="composer-area">
          <ChatComposer onSend={handleSend} />
          <p className="composer-note">
            Local frontend prototype. Model responses will be enabled after
            backend integration.
          </p>
        </div>
      </main>
    </div>
  );
}
