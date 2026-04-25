const viewport = document.querySelector("#viewport");
const board = document.querySelector("#board");
const linkLayer = document.querySelector("#linkLayer");
const fileInput = document.querySelector("#fileInput");
const sourcePreview = document.querySelector("#sourcePreview");
const emptyState = document.querySelector("#emptyState");
const sourceName = document.querySelector("#sourceName");
const sourceNode = document.querySelector("#sourceNode");
const analysisNode = document.querySelector("#analysisNode");
const analysisSummary = document.querySelector("#analysisSummary");
const keywordList = document.querySelector("#keywordList");
const analyzeButton = document.querySelector("#analyzeButton");
const modeBadge = document.querySelector("#modeBadge");
const statusText = document.querySelector("#statusText");
const statusDot = document.querySelector(".status-dot");
const counts = document.querySelector("#counts");
const optionTemplate = document.querySelector("#optionTemplate");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatMessages = document.querySelector("#chatMessages");
const chatSendButton = document.querySelector("#chatSendButton");
const navToggle = document.querySelector("#navToggle");

const state = {
  sourceImage: null,
  fileName: "",
  latestAnalysis: null,
  chatMessages: [],
  nodes: new Map(),
  links: [],
  collapsed: new Set(),
  generatedCount: 0,
  view: {
    x: 0,
    y: 0,
    scale: 0.86
  }
};

const optionPositions = [
  { x: 850, y: 112, tilt: -1.5 },
  { x: 1300, y: 232, tilt: 1.2 },
  { x: 700, y: 792, tilt: 1.4 },
  { x: 1135, y: 835, tilt: -0.8 },
  { x: 1600, y: 612, tilt: 1.8 },
  { x: 1520, y: 1032, tilt: -1.1 }
];

init();

function init() {
  restoreNavState();
  registerNode("source", sourceNode, { x: 96, y: 88, width: 318, height: 326 });
  registerNode("analysis", analysisNode, { x: 452, y: 96, width: 318, height: 220 });

  makeDraggable(sourceNode, "source");
  makeDraggable(analysisNode, "analysis");
  wireControls();
  updateBoardTransform();
  checkHealth();
  setStatus("READY", "ready");
}

function wireControls() {
  fileInput.addEventListener("change", handleFile);
  analyzeButton.addEventListener("click", analyzeImage);
  chatForm.addEventListener("submit", handleChatSubmit);
  navToggle.addEventListener("click", toggleNav);

  document.querySelector("#zoomInButton").addEventListener("click", () => zoomBy(0.08));
  document.querySelector("#zoomOutButton").addEventListener("click", () => zoomBy(-0.08));
  document.querySelector("#fitButton").addEventListener("click", resetView);

  viewport.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.06 : -0.06);
  }, { passive: false });

  let panStart = null;
  viewport.addEventListener("pointerdown", (event) => {
    if (event.target !== viewport && event.target !== board && event.target !== linkLayer) return;
    panStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      viewX: state.view.x,
      viewY: state.view.y
    };
    viewport.classList.add("is-panning");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!panStart) return;
    state.view.x = panStart.viewX + event.clientX - panStart.x;
    state.view.y = panStart.viewY + event.clientY - panStart.y;
    updateBoardTransform();
  });

  viewport.addEventListener("pointerup", () => {
    panStart = null;
    viewport.classList.remove("is-panning");
  });
}

function restoreNavState() {
  const collapsed = localStorage.getItem("oryzae.navCollapsed") === "true";
  document.body.classList.toggle("nav-collapsed", collapsed);
  navToggle.setAttribute("aria-expanded", String(!collapsed));
  navToggle.setAttribute("aria-label", collapsed ? "展开导航" : "折叠导航");
}

function toggleNav() {
  const collapsed = !document.body.classList.contains("nav-collapsed");
  document.body.classList.toggle("nav-collapsed", collapsed);
  localStorage.setItem("oryzae.navCollapsed", String(collapsed));
  navToggle.setAttribute("aria-expanded", String(!collapsed));
  navToggle.setAttribute("aria-label", collapsed ? "展开导航" : "折叠导航");
}

async function checkHealth() {
  try {
    const health = await getJson("/api/health");
    modeBadge.textContent = health.mode;
    modeBadge.title = health.mode === "demo" ? "未配置 OPENAI_API_KEY，当前使用 demo fallback" : "已连接 OpenAI API";
  } catch {
    modeBadge.textContent = "offline";
  }
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  setStatus("COMPRESSING IMAGE", "busy");
  try {
    const image = await resizeImage(file, 1600, 0.88);
    state.sourceImage = image.dataUrl;
    state.fileName = file.name;

    sourcePreview.src = image.dataUrl;
    sourcePreview.classList.add("has-image");
    emptyState.classList.add("hidden");
    sourceName.textContent = trimMiddle(file.name, 28);
    analyzeButton.disabled = false;

    clearOptions();
    state.latestAnalysis = null;
    state.chatMessages = [];
    renderChatMessages();
    state.collapsed.clear();
    analysisNode.classList.add("hidden");
    state.links = [];
    applyCollapseState();
    updateCounts();
    setStatus("IMAGE READY", "ready");
  } catch (error) {
    setStatus(error.message || "IMAGE ERROR", "error");
  }
}

async function analyzeImage() {
  if (!state.sourceImage) return;
  setStatus("ANALYZING IMAGE", "busy");
  analyzeButton.disabled = true;

  try {
    const data = await postJson("/api/analyze", {
      imageDataUrl: state.sourceImage,
      fileName: state.fileName
    });

    renderAnalysis(data);
    renderOptions(data.options || []);
    state.latestAnalysis = data;
    setStatus("BRANCHES READY", "ready");
  } catch (error) {
    setStatus(error.message || "ANALYSIS FAILED", "error");
  } finally {
    analyzeButton.disabled = false;
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = "";
  appendChatMessage("user", message);
  setStatus("CHAT THINKING", "busy");
  chatSendButton.disabled = true;

  try {
    const data = await postJson("/api/chat", {
      message,
      imageDataUrl: state.sourceImage,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8)
    });
    appendChatMessage("assistant", data.reply || "我已经读到你的想法了。");
    setStatus("CHAT READY", "ready");
  } catch (error) {
    appendChatMessage("assistant", error.message || "对话请求失败。");
    setStatus("CHAT FAILED", "error");
  } finally {
    chatSendButton.disabled = false;
    chatInput.focus();
  }
}

function appendChatMessage(role, content) {
  state.chatMessages.push({ role, content });
  renderChatMessages();
}

function renderChatMessages() {
  chatMessages.replaceChildren();

  if (!state.chatMessages.length) {
    const placeholder = document.createElement("span");
    placeholder.className = "chat-placeholder";
    placeholder.textContent = "输入想继续探索的方向、风格或约束";
    chatMessages.appendChild(placeholder);
    return;
  }

  for (const message of state.chatMessages.slice(-3)) {
    const line = document.createElement("span");
    line.className = `chat-line ${message.role}`;

    const role = document.createElement("span");
    role.className = "chat-role";
    role.textContent = message.role === "user" ? "YOU" : "AI";

    const text = document.createElement("span");
    text.textContent = ` ${message.content}`;

    line.append(role, text);
    chatMessages.appendChild(line);
  }
}

function renderAnalysis(data) {
  analysisSummary.textContent = data.summary || "已完成图像理解。";
  keywordList.replaceChildren(...(data.moodKeywords || []).slice(0, 8).map((keyword) => {
    const span = document.createElement("span");
    span.className = "keyword";
    span.textContent = keyword;
    return span;
  }));
  analysisNode.classList.remove("hidden");

  state.links = [{ from: "source", to: "analysis", kind: "analysis" }];
  applyCollapseState();
}

function renderOptions(options) {
  clearOptions();

  options.forEach((option, index) => {
    const fragment = optionTemplate.content.cloneNode(true);
    const element = fragment.querySelector(".option-node");
    const position = optionPositions[index % optionPositions.length];
    const id = `option-${option.id || index}`;

    element.dataset.nodeId = id;
    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
    element.style.setProperty("--tilt", `${position.tilt}deg`);
    element.querySelector(".pin").classList.add(index % 2 ? "pin-teal" : "pin-gold");
    element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
    element.querySelector(".option-title").textContent = option.title || "生成方向";
    element.querySelector(".option-description").textContent = option.description || "";

    const button = element.querySelector(".generate-button");
    button.addEventListener("click", () => generateOption(id, option));

    board.appendChild(element);
    registerNode(id, element, {
      x: position.x,
      y: position.y,
      width: 318,
      height: element.offsetHeight,
      option
    });
    state.links.push({ from: "analysis", to: id, kind: "option" });
    makeDraggable(element, id);
  });

  applyCollapseState();
  updateCounts();
}

async function generateOption(id, option) {
  const node = state.nodes.get(id);
  if (!node || !state.sourceImage) return;

  const element = node.element;
  const wasGenerated = Boolean(node.generated);
  const button = element.querySelector(".generate-button");
  element.classList.add("loading");
  if (button) button.disabled = true;
  setStatus(`GENERATING ${option.title || "IMAGE"}`, "busy");

  try {
    const data = await postJson("/api/generate", {
      imageDataUrl: state.sourceImage,
      option
    });
    turnIntoGeneratedNode(element, option, data.imageDataUrl);
    node.width = element.offsetWidth;
    node.height = element.offsetHeight;
    node.generated = true;
    if (!wasGenerated) {
      state.generatedCount += 1;
    }
    applyCollapseState();
    updateCounts();
    setStatus("IMAGE GENERATED", "ready");
  } catch (error) {
    element.classList.remove("loading");
    if (button) button.disabled = false;
    setStatus(error.message || "GENERATION FAILED", "error");
  }
}

function turnIntoGeneratedNode(element, option, imageDataUrl) {
  element.className = "node option-node generated-node";
  element.innerHTML = "";
  ensureCollapseControl(element.dataset.nodeId, element);

  const pin = document.createElement("div");
  pin.className = "pin pin-teal";
  element.appendChild(pin);

  const img = document.createElement("img");
  img.className = "generated-image";
  img.src = imageDataUrl;
  img.alt = option.title || "生成图";
  element.appendChild(img);

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `${option.tone || "generated"} / generated`;
  element.appendChild(eyebrow);

  const title = document.createElement("h3");
  title.textContent = option.title || "生成结果";
  element.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "generated-description";
  desc.textContent = option.description || "";
  element.appendChild(desc);

  const actions = document.createElement("div");
  actions.className = "generated-actions";

  const download = document.createElement("button");
  download.className = "secondary-button";
  download.textContent = "下载";
  download.addEventListener("click", () => downloadImage(imageDataUrl, `${option.id || "generated"}.png`));

  const regenerate = document.createElement("button");
  regenerate.className = "secondary-button";
  regenerate.textContent = "重生成";
  regenerate.addEventListener("click", () => generateOption(element.dataset.nodeId, option));

  actions.append(download, regenerate);
  element.appendChild(actions);
}

function clearOptions() {
  for (const [id, node] of Array.from(state.nodes.entries())) {
    if (id.startsWith("option-")) {
      node.element.remove();
      state.nodes.delete(id);
      state.collapsed.delete(id);
    }
  }
  state.links = state.links.filter((link) => !link.to.startsWith("option-") && !link.from.startsWith("option-"));
  state.generatedCount = 0;
  applyCollapseState();
}

function registerNode(id, element, data) {
  state.nodes.set(id, { id, element, ...data });
  ensureCollapseControl(id, element);
  updateCollapseControls();
}

function ensureCollapseControl(id, element) {
  let button = Array.from(element.children).find((child) => child.classList?.contains("collapse-dot"));
  if (button) return button;

  button = document.createElement("button");
  button.type = "button";
  button.className = "collapse-dot";
  button.setAttribute("aria-label", "Collapse downstream nodes");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleCollapse(id);
  });
  element.prepend(button);
  return button;
}

function toggleCollapse(id) {
  const descendants = getDescendants(id);
  if (!descendants.size) return;

  if (state.collapsed.has(id)) {
    state.collapsed.delete(id);
  } else {
    state.collapsed.add(id);
  }
  applyCollapseState();
}

function applyCollapseState() {
  for (const [id, node] of state.nodes.entries()) {
    node.element.classList.toggle("collapsed-hidden", isHiddenByCollapsedAncestor(id));
  }
  updateCollapseControls();
  drawLinks();
}

function updateCollapseControls() {
  for (const [id, node] of state.nodes.entries()) {
    const button = Array.from(node.element.children).find((child) => child.classList?.contains("collapse-dot"));
    if (!button) continue;

    const count = getDescendants(id).size;
    const collapsed = state.collapsed.has(id);
    button.disabled = count === 0;
    button.textContent = collapsed ? String(count) : "";
    button.classList.toggle("is-collapsed", collapsed);
    button.classList.toggle("has-children", count > 0);
    button.title = count > 0
      ? (collapsed ? `展开 ${count} 个后续节点` : `收起 ${count} 个后续节点`)
      : "没有后续节点";
    button.setAttribute("aria-label", button.title);
  }
}

function getChildren(id) {
  return state.links.filter((link) => link.from === id).map((link) => link.to);
}

function getDescendants(id) {
  const descendants = new Set();
  const stack = [...getChildren(id)];

  while (stack.length) {
    const current = stack.pop();
    if (!current || descendants.has(current)) continue;
    descendants.add(current);
    stack.push(...getChildren(current));
  }

  return descendants;
}

function isHiddenByCollapsedAncestor(id) {
  for (const collapsedId of state.collapsed) {
    if (collapsedId === id) continue;
    if (getDescendants(collapsedId).has(id)) {
      return true;
    }
  }
  return false;
}

function makeDraggable(element, id) {
  let start = null;

  element.addEventListener("pointerdown", (event) => {
    const interactive = event.target.closest("button, input, label");
    if (interactive && event.target.tagName !== "SECTION") return;
    const node = state.nodes.get(id);
    if (!node) return;

    start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      nodeX: node.x,
      nodeY: node.y
    };
    element.classList.add("dragging");
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const node = state.nodes.get(id);
    if (!node) return;

    node.x = start.nodeX + (event.clientX - start.x) / state.view.scale;
    node.y = start.nodeY + (event.clientY - start.y) / state.view.scale;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    node.width = element.offsetWidth;
    node.height = element.offsetHeight;
    drawLinks();
  });

  element.addEventListener("pointerup", () => {
    start = null;
    element.classList.remove("dragging");
  });
}

function drawLinks() {
  const fragments = document.createDocumentFragment();

  state.links.forEach((link) => {
    const from = state.nodes.get(link.from);
    const to = state.nodes.get(link.to);
    if (!isNodeVisible(from) || !isNodeVisible(to)) return;

    const start = anchor(from, "right");
    const end = anchor(to, "left");
    const path = curvePath(start, end);
    const shadow = svgElement("path", { d: path, class: "link-shadow" });
    const line = svgElement("path", { d: path, class: "link" });
    const pinA = svgElement("circle", { cx: start.x, cy: start.y, r: 9, class: "link-pin" });
    const pinB = svgElement("circle", { cx: end.x, cy: end.y, r: 9, class: "link-pin" });

    fragments.append(shadow, line, pinA, pinB);
  });

  linkLayer.replaceChildren(fragments);
}

function isNodeVisible(node) {
  return Boolean(node)
    && !node.element.classList.contains("hidden")
    && !node.element.classList.contains("collapsed-hidden");
}

function anchor(node, side) {
  const element = node.element;
  const width = element.offsetWidth || node.width || 300;
  const height = element.offsetHeight || node.height || 220;
  const x = node.x + (side === "right" ? width - 18 : 18);
  const y = node.y + Math.min(height * 0.48, height - 32);
  return { x, y };
}

function curvePath(start, end) {
  const distance = Math.max(120, Math.abs(end.x - start.x) * 0.42);
  const c1x = start.x + distance;
  const c2x = end.x - distance;
  const c1y = start.y + (end.y - start.y) * 0.08;
  const c2y = end.y - (end.y - start.y) * 0.08;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

function svgElement(tag, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

async function resizeImage(file, maxSize, quality) {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.round(img.width * ratio);
    const height = Math.round(img.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return {
      width,
      height,
      dataUrl: canvas.toDataURL("image/jpeg", quality)
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = src;
  });
}

async function getJson(url) {
  const response = await fetch(url);
  return parseApiResponse(response);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || response.statusText);
  }
  return data;
}

function zoomBy(delta) {
  state.view.scale = clamp(state.view.scale + delta, 0.45, 1.35);
  updateBoardTransform();
}

function resetView() {
  state.view.x = 0;
  state.view.y = 0;
  state.view.scale = window.innerWidth < 820 ? 0.64 : 0.86;
  updateBoardTransform();
}

function updateBoardTransform() {
  board.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
}

function updateCounts() {
  const optionCount = Array.from(state.nodes.keys()).filter((id) => id.startsWith("option-")).length;
  counts.textContent = `方向 ${optionCount} / 成图 ${state.generatedCount}`;
}

function setStatus(text, tone = "ready") {
  statusText.textContent = text;
  statusDot.className = `status-dot ${tone}`;
}

function downloadImage(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function trimMiddle(value, maxLength) {
  if (!value || value.length <= maxLength) return value || "";
  const left = Math.ceil((maxLength - 1) / 2);
  const right = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
