import "./Sidebar.css";
export default function Sidebar({ onNewChat }) {
  return <aside className="sidebar app-sidebar">
    <div className="brand"><div className="brand-icon">M</div><div><h1>MOTICH AI</h1><p>Personal Intelligence</p></div></div>
    <button className="new-chat-button" type="button" onClick={onNewChat}>+ New Chat</button>
    <div className="sidebar-footer"><div className="workspace-status"><span className="status-dot" /><span>Local AI Workspace</span></div><span className="app-version">{"MOTICH AI \u00b7 v2.2.0"}</span></div>
  </aside>;
}