$ErrorActionPreference = 'Stop'
$root = 'D:\FAU\Session Fall 2026\AI201\LocalLLM01'
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$paths = @{
  router = Join-Path $backend 'services\modelRouterService.js'
  route = Join-Path $backend 'routes\chatRoutes.js'
  app = Join-Path $frontend 'src\App.jsx'
  css = Join-Path $frontend 'src\App.css'
  chat = Join-Path $frontend 'src\services\chatService.js'
  registry = Join-Path $backend 'config\models.json'
  llm = Join-Path $backend 'services\llmService.js'
}
Write-Host '=== 1. Verify files and inspected version ===' -ForegroundColor Cyan
foreach ($key in @('route','app','css','chat','registry','llm')) {
  if (-not (Test-Path -LiteralPath $paths[$key] -PathType Leaf)) { throw "Missing $key : $($paths[$key])" }
}
if (Test-Path -LiteralPath $paths.router) { throw 'modelRouterService.js already exists. No changes made; inspect it before proceeding.' }
$original = @{}
foreach ($key in @('route','app','css','chat')) { $original[$key] = [IO.File]::ReadAllText($paths[$key]) }
function Assert-Once([string]$text,[string]$needle,[string]$label) {
  $first = $text.IndexOf($needle,[StringComparison]::Ordinal)
  if ($first -lt 0 -or $text.IndexOf($needle,$first + $needle.Length,[StringComparison]::Ordinal) -ge 0) {
    throw "Expected exactly one match for $label; no application files changed."
  }
}
Assert-Once $original.route 'model = "general",' 'route default'
Assert-Once $original.route 'selected = resolveModel(model);' 'route resolver'
Assert-Once $original.route 'const messages = [' 'route messages'
Assert-Once $original.route 'modelType: result.modelType,' 'route result'
Assert-Once $original.app 'const [messages, setMessages] = useState([welcomeMessage]);' 'app state'
Assert-Once $original.app 'const result = await sendChatMessage(content, history, controller.signal);' 'app request'
Assert-Once $original.app '<span className="model-badge">Local Model</span>' 'app badge'
Assert-Once $original.app 'function handleNewChat() {' 'new chat'
Assert-Once $original.chat 'export async function sendChatMessage(message, history, signal) {' 'chat signature'
Assert-Once $original.chat 'body: JSON.stringify({ message, history }),' 'chat payload'
Assert-Once $original.css '.model-badge {' 'css badge'
$registry = Get-Content -LiteralPath $paths.registry -Raw | ConvertFrom-Json
if (-not $registry.models.general.enabled -or -not $registry.models.coding.enabled) { throw 'Both models must be enabled.' }
$llm = [IO.File]::ReadAllText($paths.llm)
if (-not $llm.Contains('function resolveModel(') -or -not $llm.Contains('async function generateResponse(')) { throw 'LLM service differs from inspected version.' }

Write-Host '=== 2. Prepare model router ===' -ForegroundColor Cyan
$routerCode = @'
const { resolveModel } = require("./llmService");

const CLASSIFIER_TIMEOUT_MS = 12000;
const CODING_PATTERNS = [
  /```[\s\S]*?```/,
  /\b(?:write|create|generate|implement|debug|fix|refactor|optimize|review|test)\b.{0,90}\b(?:code|script|function|class|program|algorithm|api|component|query|regex|sql|python|javascript|typescript|java|react|node(?:\.js)?|powershell|bash|c\+\+|vhdl)\b/i,
  /\b(?:syntaxerror|typeerror|referenceerror|traceback|stack trace|npm err|exception|segmentation fault|compilation error)\b/i,
  /\b(?:git commit|git merge|dockerfile|useeffect|async\/await|select\s+.+\s+from\s+|def\s+\w+\s*\(|function\s+\w+\s*\()\b/i,
];
const GENERAL_PATTERNS = [
  /^(?:hi|hello|hey|thanks|thank you)[.!?\s]*$/i,
  /^(?:what is|who is|where is|when was|explain|tell me about)\s+(?:the\s+)?(?:capital|history|weather|meaning|definition|geography|solar system|photosynthesis)\b/i,
];

function parseClassification(text) {
  const normalized = String(text || "").trim().toLowerCase();
  const match = normalized.match(/^(general|coding)(?:\s*[.!])?$/);
  return match ? match[1] : null;
}

async function classifyWithGeneral(message, history) {
  const { config } = resolveModel("general");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLASSIFIER_TIMEOUT_MS);
  const recent = history.slice(-4).map((entry) => `${entry.role}: ${entry.content.slice(0, 350)}`).join("\n");
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You classify user requests for an AI assistant. Reply with exactly one lowercase word: coding or general. Choose coding for requests involving writing, editing, debugging, explaining specific code, programming tools, SQL queries, scripts, or software implementation. Choose general for other questions. Use conversation context only to disambiguate follow-up requests. Do not answer the user's question." },
          { role: "user", content: `Recent conversation:\n${recent || '(none)'}\n\nNew request:\n${message}\n\nClassification:` },
        ],
        temperature: 0,
        max_tokens: 12,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Classifier HTTP ${response.status}`);
    const data = await response.json();
    return parseClassification(data?.choices?.[0]?.message?.content);
  } finally {
    clearTimeout(timer);
  }
}

async function selectModel(mode, message, history = []) {
  if (!["auto", "general", "coding"].includes(mode)) {
    const error = new Error("Model must be auto, general, or coding.");
    error.code = "LLM_INVALID_MODEL";
    throw error;
  }
  if (mode !== "auto") {
    resolveModel(mode);
    return { modelType: mode, selectionMode: mode, routingMethod: "manual" };
  }
  if (CODING_PATTERNS.some((pattern) => pattern.test(message))) {
    return { modelType: "coding", selectionMode: "auto", routingMethod: "rule" };
  }
  if (GENERAL_PATTERNS.some((pattern) => pattern.test(message))) {
    return { modelType: "general", selectionMode: "auto", routingMethod: "rule" };
  }
  try {
    const classified = await classifyWithGeneral(message, history);
    if (classified) {
      resolveModel(classified);
      return { modelType: classified, selectionMode: "auto", routingMethod: "classifier" };
    }
  } catch (error) {
    console.warn("Model classification unavailable:", error.message);
  }
  resolveModel("general");
  return { modelType: "general", selectionMode: "auto", routingMethod: "fallback" };
}

module.exports = { selectModel, parseClassification };
'@

$newRoute = $original.route
$newRoute = $newRoute.Replace('const { getSystemPrompt } = require("../services/promptService");', 'const { getSystemPrompt } = require("../services/promptService");' + "`n" + 'const { selectModel } = require("../services/modelRouterService");')
$newRoute = $newRoute.Replace('model = "general",','model = "auto",')
$newRoute = $newRoute.Replace('selected = resolveModel(model);','selected = await selectModel(model, message.trim(), history);')
$newRoute = $newRoute.Replace('modelType: result.modelType,','modelType: result.modelType,' + "`n" + '      selectionMode: selected.selectionMode,' + "`n" + '      routingMethod: selected.routingMethod,')
$newApp = $original.app
$newApp = $newApp.Replace('const [messages, setMessages] = useState([welcomeMessage]);', 'const [messages, setMessages] = useState([welcomeMessage]);' + "`n" + '  const [modelMode, setModelMode] = useState("auto");')
$newApp = $newApp.Replace('const result = await sendChatMessage(content, history, controller.signal);','const result = await sendChatMessage(content, history, controller.signal, modelMode);')
$newApp = $newApp.Replace('content: result.response,','content: result.response,' + "`n" + '          modelType: result.modelType,')
$newApp = $newApp.Replace('  function handleNewChat() {', @'
  function handleModelChange(event) {
    const nextMode = event.target.value;
    if (nextMode === modelMode) return;
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
    setModelMode(nextMode);
    setMessages([welcomeMessage]);
    setError("");
    setIsLoading(false);
  }

  function handleNewChat() {
'@)
$newApp = $newApp.Replace('<span className="model-badge">Local Model</span>', @'
          <div className="model-control">
            <label htmlFor="model-mode">Model selection</label>
            <select id="model-mode" value={modelMode} onChange={handleModelChange}>
              <option value="auto">Auto - Intelligent routing (recommended)</option>
              <option value="general">General - Qwen3.5-0.8B</option>
              <option value="coding">Coding - Qwen3-Coder-30B-A3B</option>
            </select>
            <span className="model-help">
              {modelMode === "auto"
                ? "Backend automatically selects the best model for the question."
                : `All requests use the ${modelMode} model.`}
            </span>
          </div>
'@)
$newChat = $original.chat.Replace('export async function sendChatMessage(message, history, signal) {','export async function sendChatMessage(message, history, signal, model = "auto") {').Replace('body: JSON.stringify({ message, history }),','body: JSON.stringify({ message, history, model }),')
$newCss = $original.css + @'

/* Intelligent model selection */
.model-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  max-width: min(100%, 360px);
}
.model-control label { color: #cbd5e1; font-size: 12px; font-weight: 600; }
.model-control select {
  max-width: 100%; width: 100%;
  background: #17243a; color: #f8fafc;
  border: 1px solid #334155; border-radius: 9px;
  padding: 9px 10px; font: inherit; font-size: 12px;
}
.model-control select:focus-visible { outline: 2px solid #5eead4; outline-offset: 2px; }
.model-help { color: #94a3b8; font-size: 11px; }
@media (max-width: 700px) {
  .topbar { align-items: flex-start; flex-wrap: wrap; }
  .model-control { width: 100%; max-width: 100%; }
}
'@

Write-Host '=== 3. Back up originals ===' -ForegroundColor Cyan
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $root "Persistence\backups\intelligent-routing\$stamp"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
foreach ($key in @('route','app','css','chat')) { Copy-Item -LiteralPath $paths[$key] -Destination (Join-Path $backup "$key.original") }
Write-Host "Backup: $backup" -ForegroundColor Green

Write-Host '=== 4. Install and validate ===' -ForegroundColor Cyan
$utf8 = New-Object System.Text.UTF8Encoding($false)
try {
  [IO.File]::WriteAllText($paths.router,$routerCode,$utf8)
  [IO.File]::WriteAllText($paths.route,$newRoute,$utf8)
  [IO.File]::WriteAllText($paths.app,$newApp,$utf8)
  [IO.File]::WriteAllText($paths.css,$newCss,$utf8)
  [IO.File]::WriteAllText($paths.chat,$newChat,$utf8)
  & node --check $paths.router
  if ($LASTEXITCODE -ne 0) { throw 'Router syntax failed' }
  & node --check $paths.route
  if ($LASTEXITCODE -ne 0) { throw 'Chat route syntax failed' }
  Push-Location $backend
  try {
    $smoke = @'
const r = require("./services/modelRouterService");
Promise.all([
  r.selectModel("auto", "Write a Python function", []),
  r.selectModel("auto", "Hello", []),
  r.selectModel("coding", "Hello", [])
]).then((results) => {
  console.log(results);
  if (results[0].modelType !== "coding" ||
      results[1].modelType !== "general" ||
      results[2].routingMethod !== "manual") process.exitCode = 1;
}).catch((error) => { console.error(error); process.exitCode = 1; });
'@
    $smoke | & node -
    if ($LASTEXITCODE -ne 0) { throw 'Router smoke tests failed' }
  } finally { Pop-Location }
  Push-Location $frontend
  try {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
    & npm run lint
    if ($LASTEXITCODE -ne 0) { throw 'Frontend lint failed' }
  } finally { Pop-Location }
  Write-Host 'PASS: Intelligent router and frontend selector installed.' -ForegroundColor Green
} catch {
  Write-Host 'Validation failed; restoring original source files.' -ForegroundColor Red
  foreach ($key in @('route','app','css','chat')) { Copy-Item -LiteralPath (Join-Path $backup "$key.original") -Destination $paths[$key] -Force }
  if (Test-Path -LiteralPath $paths.router) { Remove-Item -LiteralPath $paths.router -Force }
  throw
}
Write-Host '=== 5. Git changes (do not commit yet) ===' -ForegroundColor Cyan
git -C $root status --short
git -C $root diff --stat
Write-Host 'Restart only the development Express backend before API tests.' -ForegroundColor Yellow
