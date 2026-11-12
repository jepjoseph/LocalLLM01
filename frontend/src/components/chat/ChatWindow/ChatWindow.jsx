import ChatMessage from "../ChatMessage/ChatMessage";
import "./ChatWindow.css";
export default function ChatWindow({ messages, isLoading, error }) {
  return <section className="chat-area chat-window" aria-label="Chat conversation">
    <div className="chat-messages">
      {messages.map(message => <ChatMessage key={message.id} role={message.role} content={message.content} />)}
      {isLoading && <div className="message message-ai" role="status"><div className="message-avatar">M</div><div className="message-body"><div className="message-author">MOTICH AI</div><div className="message-content">Generating response...</div></div></div>}
      {error && <p role="alert" className="chat-error">{error}</p>}
    </div>
  </section>;
}