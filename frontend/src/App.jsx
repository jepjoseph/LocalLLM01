import Sidebar from "./components/layout/Sidebar/Sidebar";
import Header from "./components/layout/Header/Header";
import Footer from "./components/layout/Footer/Footer";
import Chat from "./pages/Chat/Chat";
import useChat from "./hooks/useChat";
import "./App.css";
export default function App() {
  const { messages, modelMode, isLoading, error, handleSend, handleModelChange, handleNewChat } = useChat();
  return <div className="app-shell app-viewport">
    <Sidebar onNewChat={handleNewChat} />
    <div className="main-panel app-main">
      <Header modelMode={modelMode} onModelChange={handleModelChange} />
      <Chat messages={messages} isLoading={isLoading} error={error} onSend={handleSend} />
      <Footer />
    </div>
  </div>;
}