import "./ModelSelector.css";
export default function ModelSelector({ modelMode, onModelChange }) {
  return <div className="model-control"><label htmlFor="model-mode">Model selection</label>
    <select id="model-mode" value={modelMode} onChange={onModelChange}>
      <option value="auto">Auto - Intelligent routing (recommended)</option>
      <option value="general">General - Qwen3.5-0.8B</option>
      <option value="coding">Coding - Qwen3-Coder-30B-A3B</option>
    </select>
    <span className="model-help">{modelMode === "auto" ? "Backend automatically selects the best model for the question." : `All requests use the ${modelMode} model.`}</span>
  </div>;
}