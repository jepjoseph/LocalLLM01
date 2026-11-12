import ModelSelector from "../../models/ModelSelector/ModelSelector";
import "./Header.css";
export default function Header({ modelMode, onModelChange }) {
  return <header className="topbar app-header">
    <div><h2>MOTICH AI Assistant</h2><p>Powered by MOTICH</p></div>
    <div className="header-actions">
      <ModelSelector modelMode={modelMode} onModelChange={onModelChange} />
      <button className="login-button" type="button" disabled title="Authentication is not available yet">Login</button>
    </div>
  </header>;
}