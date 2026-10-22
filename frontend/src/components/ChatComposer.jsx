import { useState } from "react";

export default function ChatComposer({ onSend, isLoading }) {
  const [input, setInput] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isLoading) return;

    onSend(message);
    setInput("");
  }

  return (
    <form className="chat-composer" onSubmit={handleSubmit}>
      <label htmlFor="chat-input" className="sr-only">
        Your message
      </label>

      <textarea
        id="chat-input"
        placeholder="Ask MOTICH AI anything..."
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={2}
        disabled={isLoading}
      />

      <button type="submit" disabled={!input.trim() || isLoading}>
        {isLoading ? "Thinking..." : "Send"}
      </button>
    </form>
  );
}
