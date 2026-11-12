import ChatWindow from "../../components/chat/ChatWindow/ChatWindow";
import ChatComposer from "../../components/chat/ChatComposer/ChatComposer";
import "./Chat.css";
export default function Chat({ messages, isLoading, error, onSend }) {
  return <div className="chat-page">
    <ChatWindow messages={messages} isLoading={isLoading} error={error} />
    <div className="composer-area chat-page-composer"><ChatComposer onSend={onSend} isLoading={isLoading} /></div>
  </div>;
}