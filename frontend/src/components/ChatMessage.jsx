export default function ChatMessage({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`message ${isUser ? "message-user" : "message-ai"}`}>
      <div className="message-avatar">
        {isUser ? "U" : "M"}
      </div>

      <div className="message-body">
        <div className="message-author">
          {isUser ? "You" : "MOTICH AI"}
        </div>
        <div className="message-content">{content}</div>
      </div>
    </div>
  );
}
