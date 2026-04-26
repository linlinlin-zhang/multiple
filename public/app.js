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
const urlInput = document.querySelector("#urlInput");
const urlAnalyzeButton = document.querySelector("#urlAnalyzeButton");

const settingsPanel = document.querySelector("#settingsPanel");
const settingsBtn = document.querySelector("#settingsBtn");
const closeSettingsPanel = document.querySelector("#closeSettingsPanel");
const settingsForm = document.querySelector("#settingsForm");
const settingsResetBtn = document.querySelector("#settingsResetBtn");
const settingsTabs = document.querySelectorAll(".settings-tab");
const settingsEndpoint = document.querySelector("#settingsEndpoint");
const settingsModel = document.querySelector("#settingsModel");
const settingsApiKey = document.querySelector("#settingsApiKey");
const settingsTemperature = document.querySelector("#settingsTemperature");

const state = {
  sourceImage: null,
  sourceImageHash: null,
  sourceType: "image",         // "image" | "text" | "url"
  sourceText: null,            // for txt/md/json
  sourceDataUrl: null,         // for docx/pdf/pptx
  sourceUrl: null,             // for url sources
  fileName: "",
  latestAnalysis: null,
  chatMessages: [],
  nodes: new Map(),
  links: [],
  collapsed: new Set(),        // full collapse (double-click)
  selectiveHidden: new Set(),  // selective hide (single-click / auto-collapse)
  generatedCount: 0,
  view: {
    x: 0,
    y: 0,
    scale: 0.86
  }
};

const settingsCache = {
  currentRole: "analysis",
  analysis: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  chat: { endpoint: "", model: "", apiKey: "", temperature: 0.7 },
  image: { endpoint: "", model: "", apiKey: "", temperature: 0.7 }
};

let currentSessionId = null;
let autoSaveTimer = null;
let lastSavedStateHash = "";

const optionPositions = [
  { x: 850, y: 112, tilt: -1.5 },
  { x: 1300, y: 232, tilt: 1.2 },
  { x: 700, y: 792, tilt: 1.4 },
  { x: 1135, y: 835, tilt: -0.8 },
  { x: 1600, y: 612, tilt: 1.8 },
  { x: 1520, y: 1032, tilt: -1.1 }
];

init().catch(console.error);

async function init() {
  restoreNavState();
  registerNode("source", sourceNode, { x: 96, y: 88, width: 318, height: 326 });
  registerNode("analysis", analysisNode, { x: 452, y: 96, width: 318, height: 220 });

  makeDraggable(sourceNode, "source");
  makeDraggable(analysisNode, "analysis");
  wireControls();
  updateBoardTransform();
  checkHealth();
  setStatus("Ready", "ready");
  await loadSettings();
  await loadTheme();

  const urlParams = new URLSearchParams(window.location.search);
  const resumeSessionId = urlParams.get("session");
  if (resumeSessionId) {
    try {
      await loadSession(resumeSessionId);
    } catch {
      const url = new URL(window.location.href);
      url.searchParams.delete("session");
      window.history.replaceState({}, "", url);
    }
  }
}

function wireControls() {
  fileInput.addEventListener("change", handleFile);
  analyzeButton.addEventListener("click", analyzeSource);
  chatForm.addEventListener("submit", handleChatSubmit);
  navToggle.addEventListener("click", toggleNav);

  // Source tabs (file / url)
  document.querySelectorAll(".source-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      document.querySelectorAll(".source-tab").forEach(t => t.classList.toggle("active", t === tab));
      document.querySelector(".upload-target").classList.toggle("hidden", target !== "file");
      document.querySelector(".url-input-panel").classList.toggle("hidden", target !== "url");
    });
  });

  // URL input wiring
  urlInput?.addEventListener("input", () => {
    if (urlAnalyzeButton) urlAnalyzeButton.disabled = !urlInput.value.trim();
  });
  urlAnalyzeButton?.addEventListener("click", analyzeUrl);

  document.querySelector("#zoomInButton").addEventListener("click", () => zoomBy(0.08));
  document.querySelector("#zoomOutButton").addEventListener("click", () => zoomBy(-0.08));
  document.querySelector("#fitButton").addEventListener("click", resetView);
  document.querySelector("#saveButton")?.addEventListener("click", () => saveSession());

  document.querySelector("#chatAttachButton")?.addEventListener("click", handleAttachClick);

  document.querySelector("#exportBtn")?.addEventListener("click", async () => {
    if (!currentSessionId) {
      alert("请先保存会话后再导出。");
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${currentSessionId}/export`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(disposition);
      a.download = match ? match[1] : `session_${currentSessionId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("导出失败：" + (err instanceof Error ? err.message : String(err)));
    }
  });

  document.querySelector("#importBtn")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Import failed");
        window.location.href = `/?session=${data.sessionId}`;
      } catch (err) {
        alert("导入失败：" + (err instanceof Error ? err.message : String(err)));
      }
    };
    input.click();
  });

  document.querySelector("#historyToggle")?.addEventListener("click", () => {
    const panel = document.querySelector("#sessionPanel");
    if (panel) {
      const isHidden = panel.classList.contains("hidden");
      panel.classList.toggle("hidden", !isHidden);
      if (isHidden) renderSessionList();
    }
  });

  document.querySelector("#closeSessionPanel")?.addEventListener("click", () => {
    document.querySelector("#sessionPanel")?.classList.add("hidden");
  });

  // Settings panel wiring
  settingsBtn?.addEventListener("click", () => {
    settingsPanel?.classList.toggle("hidden");
    populateSettingsForm();
  });
  closeSettingsPanel?.addEventListener("click", () => {
    settingsPanel?.classList.add("hidden");
  });
  settingsTabs?.forEach(tab => {
    tab.addEventListener("click", () => {
      settingsTabs.forEach(t => t.classList.toggle("active", t === tab));
      settingsCache.currentRole = tab.dataset.role || "analysis";
      populateSettingsForm();
    });
  });
  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const role = settingsCache.currentRole;
    const payload = {
      [role]: {
        endpoint: settingsEndpoint?.value?.trim() || "",
        model: settingsModel?.value?.trim() || "",
        apiKey: settingsApiKey?.value?.trim() || "",
        temperature: Number(settingsTemperature?.value ?? 0.7)
      }
    };
    try {
      const data = await putJson("/api/settings", payload);
      if (data[role]) {
        settingsCache[role] = data[role];
      }
      showSaveConfirmation("已保存");
      checkHealth();
    } catch (err) {
      showSaveConfirmation("保存失败：" + (err instanceof Error ? err.message : String(err)));
    }
  });
  settingsResetBtn?.addEventListener("click", async () => {
    await loadSettings();
    populateSettingsForm();
    showSaveConfirmation("已重置");
  });

  // Theme toggle wiring
  const themeToggle = document.querySelector("#themeToggle");
  if (themeToggle) {
    themeToggle.checked = document.documentElement.getAttribute("data-theme") === "dark";
    themeToggle.addEventListener("change", () => {
      saveTheme(themeToggle.checked ? "dark" : "light");
    });
  }

  viewport.addEventListener("click", (event) => {
    if (!settingsPanel?.classList.contains("hidden") && event.target === viewport) {
      settingsPanel.classList.add("hidden");
    }
  });

  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomBy(event.deltaY < 0 ? 0.06 : -0.06);
    } else {
      let dx = event.deltaX;
      let dy = event.deltaY;
      if (event.shiftKey && Math.abs(dy) > 0 && dx === 0) {
        dx = dy;
        dy = 0;
      }
      state.view.x -= dx;
      state.view.y -= dy;
      updateBoardTransform();
    }
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
    modeBadge.title = health.mode === "demo" ? "未配置模型 API Key，当前使用 demo fallback" : "已连接已配置的大模型 API";
  } catch {
    modeBadge.textContent = "offline";
  }
}

function applyTheme(theme) {
  if (theme !== "light" && theme !== "dark") return;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("oryzae-theme", theme);
}

async function loadTheme() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.theme === "light" || data.theme === "dark") {
      applyTheme(data.theme);
    }
  } catch (e) {
    console.error("Failed to load theme", e);
  }
}

async function saveTheme(theme) {
  applyTheme(theme);
  try {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme })
    });
  } catch (e) {
    console.error("Failed to save theme", e);
  }
}

async function loadSettings() {
  try {
    const data = await getJson("/api/settings");
    for (const role of ["analysis", "chat", "image"]) {
      if (data[role]) {
        settingsCache[role] = {
          endpoint: data[role].endpoint || "",
          model: data[role].model || "",
          apiKey: data[role].apiKey || "",
          temperature: typeof data[role].temperature === "number" ? data[role].temperature : 0.7
        };
      }
    }
    if (data.theme === "light" || data.theme === "dark") {
      applyTheme(data.theme);
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

function populateSettingsForm() {
  const role = settingsCache.currentRole;
  const cfg = settingsCache[role];
  if (!cfg) return;
  if (settingsEndpoint) settingsEndpoint.value = cfg.endpoint || "";
  if (settingsModel) settingsModel.value = cfg.model || "";
  if (settingsApiKey) settingsApiKey.value = cfg.apiKey || "";
  if (settingsTemperature) settingsTemperature.value = String(typeof cfg.temperature === "number" ? cfg.temperature : 0.7);
}

function showSaveConfirmation(text) {
  const actions = document.querySelector(".settings-actions");
  if (!actions) return;
  let el = actions.querySelector(".settings-confirm");
  if (!el) {
    el = document.createElement("span");
    el.className = "settings-confirm";
    el.style.cssText = "font-size:13px;color:var(--ps-blue);align-self:center;";
    actions.appendChild(el);
  }
  el.textContent = text;
  setTimeout(() => {
    if (el) el.textContent = "";
  }, 2000);
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const isTextDoc = /\.(txt|md|json|docx|pdf|pptx)$/i.test(file.name);

  if (isImage) {
    setStatus("Compressing image", "busy");
    try {
      const image = await resizeImage(file, 1600, 0.88);
      state.sourceImage = image.dataUrl;
      state.sourceType = "image";
      state.sourceText = null;
      state.sourceDataUrl = null;
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
      setStatus("Image ready", "ready");
      updateSourceBadge();
      autoSave();
    } catch (error) {
      setStatus(error.message || "Image error", "error");
    }
    return;
  }

  if (isTextDoc) {
    setStatus("Reading document", "busy");
    try {
      state.fileName = file.name;
      state.sourceType = "text";
      state.sourceImage = null;
      state.sourceImageHash = null;

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isPlainText = ["txt", "md", "json"].includes(ext);

      if (isPlainText) {
        const text = await file.text();
        state.sourceText = text;
        state.sourceDataUrl = null;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeMap = {
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          pdf: "application/pdf",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        };
        const mime = mimeMap[ext] || "application/octet-stream";
        state.sourceDataUrl = `data:${mime};base64,${base64}`;
        state.sourceText = null;
      }

      // Show document preview in source node
      sourcePreview.src = "";
      sourcePreview.classList.remove("has-image");
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
      updateSourceBadge();
      setStatus("Document ready", "ready");
      autoSave();
    } catch (error) {
      setStatus(error.message || "Document error", "error");
    }
    return;
  }

  setStatus("Unsupported file type", "error");
}

async function analyzeSource() {
  if (state.sourceType === "image" && !state.sourceImage) return;
  if (state.sourceType === "text" && !state.sourceText && !state.sourceDataUrl) return;
  if (state.sourceType === "url" && !state.sourceUrl) return;

  setStatus(state.sourceType === "image" ? "Analyzing image" : state.sourceType === "url" ? "Analyzing URL" : "Analyzing document", "busy");
  analyzeButton.disabled = true;

  try {
    let data;
    if (state.sourceType === "image") {
      const sourceImageDataUrl = await getSourceImageDataUrl();
      data = await postJson("/api/analyze", {
        imageDataUrl: sourceImageDataUrl,
        fileName: state.fileName
      });
    } else if (state.sourceType === "url") {
      data = await postJson("/api/analyze-url", { url: state.sourceUrl });
    } else {
      data = await postJson("/api/analyze-text", {
        text: state.sourceText,
        dataUrl: state.sourceDataUrl,
        fileName: state.fileName
      });
    }

    renderAnalysis(data);
    renderOptions(data.options || []);
    state.latestAnalysis = data;
    setStatus("Branches ready", "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || "Analysis failed", "error");
  } finally {
    analyzeButton.disabled = false;
  }
}

async function analyzeUrl() {
  const url = urlInput?.value.trim();
  if (!url) return;
  setStatus("Analyzing URL", "busy");
  if (urlAnalyzeButton) urlAnalyzeButton.disabled = true;

  try {
    const data = await postJson("/api/analyze-url", { url });
    state.sourceType = "url";
    state.sourceUrl = url;
    state.fileName = new URL(url).hostname;
    state.latestAnalysis = data;

    // Render source preview as a link card
    renderUrlSource(url, data.title);
    renderAnalysis(data);
    renderOptions(data.options || []);
    setStatus("Branches ready", "ready");
    autoSave();
  } catch (error) {
    setStatus(error.message || "URL analysis failed", "error");
  } finally {
    if (urlAnalyzeButton) urlAnalyzeButton.disabled = false;
  }
}

function renderUrlSource(url, title) {
  sourcePreview.src = "";
  sourcePreview.classList.remove("has-image");
  emptyState.classList.add("hidden");

  // Remove any existing link card
  const existing = document.querySelector(".url-source-card");
  if (existing) existing.remove();

  const linkCard = document.createElement("a");
  linkCard.href = url;
  linkCard.target = "_blank";
  linkCard.rel = "noopener noreferrer";
  linkCard.className = "url-source-card";
  linkCard.textContent = title || url;
  sourcePreview.parentElement.appendChild(linkCard);

  sourceName.textContent = new URL(url).hostname;
  if (analyzeButton) analyzeButton.disabled = false;
  updateSourceBadge();
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = "";
  appendChatMessage("user", message);
  setStatus("Chat thinking", "busy");
  chatSendButton.disabled = true;

  try {
    const sourceImageDataUrl = await getSourceImageDataUrl();
    const data = await postJson("/api/chat", {
      message,
      imageDataUrl: sourceImageDataUrl,
      analysis: state.latestAnalysis,
      messages: state.chatMessages.slice(-8)
    });
    appendChatMessage("assistant", data.reply || "我已经读到你的想法了。");
    setStatus("Chat ready", "ready");
    autoSave();
  } catch (error) {
    appendChatMessage("assistant", error.message || "对话请求失败。");
    setStatus("Chat failed", "error");
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
    return;
  }

  for (const message of state.chatMessages.slice(-3)) {
    const line = document.createElement("span");
    line.className = `chat-line ${message.role}`;

    const role = document.createElement("span");
    role.className = "chat-role";
    role.textContent = message.role === "user" ? "You" : "AI";

    const text = document.createElement("span");
    text.textContent = ` ${message.content}`;

    line.append(role, text);
    chatMessages.appendChild(line);
  }
}

function renderAnalysis(data) {
  analysisSummary.textContent = data.summary || "已完成内容理解。";
  keywordList.replaceChildren(...(data.moodKeywords || []).slice(0, 8).map((keyword) => {
    const span = document.createElement("span");
    span.className = "keyword";
    span.textContent = keyword;
    return span;
  }));
  analysisNode.classList.remove("hidden");

  // Update analysis node eyebrow based on source type
  const eyebrow = analysisNode.querySelector(".eyebrow");
  if (eyebrow) {
    const labels = { image: "IMAGE READ", text: "DOCUMENT READ", url: "LINK READ" };
    eyebrow.textContent = labels[state.sourceType] || "MODEL READ";
  }
  const heading = analysisNode.querySelector("h2");
  if (heading) {
    const titles = { image: "图像理解", text: "文档理解", url: "链接理解" };
    heading.textContent = titles[state.sourceType] || "内容理解";
  }

  state.links = [{ from: "source", to: "analysis", kind: "analysis" }];
  state.selectiveHidden.clear();
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
  setStatus(`Generating ${option.title || "image"}`, "busy");

  try {
    const sourceImageDataUrl = await getSourceImageDataUrl();
    const data = await postJson("/api/generate", {
      imageDataUrl: sourceImageDataUrl,
      option
    });

    let imageUrl = data.imageDataUrl;
    if (data.imageDataUrl && data.imageDataUrl.startsWith("data:")) {
      const asset = await postJson("/api/assets", {
        dataUrl: data.imageDataUrl,
        kind: "generated"
      });
      node.imageHash = asset.hash;
      imageUrl = `/api/assets/${asset.hash}?kind=generated`;
    } else if (data.hash) {
      node.imageHash = data.hash;
      imageUrl = `/api/assets/${data.hash}?kind=generated`;
    }

    // Generate explanation
    let explanation = "";
    try {
      const explainRes = await postJson("/api/explain", {
        prompt: data.prompt || option.prompt,
        optionTitle: option.title,
        summary: state.latestAnalysis?.summary || ""
      });
      explanation = explainRes.explanation || "";
    } catch (e) {
      console.error("Failed to generate explanation:", e);
    }
    node.explanation = explanation;

    turnIntoGeneratedNode(element, option, imageUrl);
    node.width = element.offsetWidth;
    node.height = element.offsetHeight;
    node.generated = true;
    if (!wasGenerated) {
      state.generatedCount += 1;
    }

    // Auto-collapse unselected siblings
    const parentLink = state.links.find(l => l.to === id);
    if (parentLink) {
      const siblings = getChildren(parentLink.from);
      let hiddenAny = false;
      for (const sid of siblings) {
        if (sid === id) continue;
        const n = state.nodes.get(sid);
        if (n && !n.generated) {
          state.selectiveHidden.add(sid);
          hiddenAny = true;
        }
      }
      if (hiddenAny) {
        applyCollapseState();
        autoSave();
      }
    }

    applyCollapseState();
    updateCounts();
    setStatus("Image generated", "ready");
    autoSave();
  } catch (error) {
    element.classList.remove("loading");
    if (button) button.disabled = false;
    setStatus(error.message || "Generation failed", "error");
  }
}

function turnIntoGeneratedNode(element, option, imageDataUrl) {
  element.className = "node option-node generated-node";
  element.innerHTML = "";
  ensureCollapseControl(element.dataset.nodeId, element);

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
      state.selectiveHidden.delete(id);
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
  attachMultiClickCollapseHandler(button, id);
  element.prepend(button);
  return button;
}

function attachMultiClickCollapseHandler(button, nodeId) {
  let clicks = 0;
  let timer = null;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    clicks++;
    if (clicks === 1) {
      timer = setTimeout(() => {
        toggleSelectiveCollapse(nodeId);
        clicks = 0;
      }, 280);
    } else if (clicks === 2) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toggleCollapse(nodeId);
        clicks = 0;
      }, 280);
    } else if (clicks >= 3) {
      clearTimeout(timer);
      expandAllCollapsed();
      clicks = 0;
    }
  });
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
  autoSave();
}

function toggleSelectiveCollapse(id) {
  const descendants = getDescendants(id);
  if (!descendants.size) return;

  const unGeneratedDescendants = [...descendants].filter(did => {
    const n = state.nodes.get(did);
    return n && !n.generated;
  });

  if (!unGeneratedDescendants.length) return;

  const anyVisible = unGeneratedDescendants.some(did => !state.selectiveHidden.has(did) && !isHiddenByCollapsedAncestor(did));

  if (anyVisible) {
    for (const did of unGeneratedDescendants) {
      state.selectiveHidden.add(did);
    }
  } else {
    for (const did of unGeneratedDescendants) {
      state.selectiveHidden.delete(did);
    }
  }
  applyCollapseState();
  autoSave();
}

function expandAllCollapsed() {
  state.collapsed.clear();
  state.selectiveHidden.clear();
  applyCollapseState();
  autoSave();
}

function applyCollapseState() {
  for (const [id, node] of state.nodes.entries()) {
    const hiddenByAncestor = isHiddenByCollapsedAncestor(id);
    const selectivelyHidden = state.selectiveHidden.has(id);
    node.element.classList.toggle("collapsed-hidden", hiddenByAncestor);
    node.element.classList.toggle("selective-hidden", selectivelyHidden && !hiddenByAncestor);
  }
  updateCollapseControls();
  drawLinks();
}

function updateCollapseControls() {
  for (const [id, node] of state.nodes.entries()) {
    const button = Array.from(node.element.children).find((child) => child.classList?.contains("collapse-dot"));
    if (!button) continue;

    const descendants = getDescendants(id);
    const fullCollapsed = state.collapsed.has(id);

    const hiddenCount = [...descendants].filter(did => {
      const n = state.nodes.get(did);
      return n && (n.element.classList.contains("collapsed-hidden") || n.element.classList.contains("selective-hidden"));
    }).length;

    const hasChildren = descendants.size > 0;
    button.disabled = !hasChildren;
    button.textContent = (fullCollapsed || hiddenCount > 0) ? String(hiddenCount || descendants.size) : "";
    button.classList.toggle("is-collapsed", fullCollapsed || hiddenCount > 0);
    button.classList.toggle("has-children", hasChildren);
    button.title = hasChildren
      ? (fullCollapsed ? `展开 ${descendants.size} 个后续节点` : hiddenCount > 0 ? `展开 ${hiddenCount} 个后续节点` : `收起 ${descendants.size} 个后续节点`)
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
    autoSave();
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
    && !node.element.classList.contains("collapsed-hidden")
    && !node.element.classList.contains("selective-hidden");
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

function handleAttachClick() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,text/plain";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleAttachment(file);
  };
  input.click();
}

async function handleAttachment(file) {
  if (file.type.startsWith("image/")) {
    await handleFile({ target: { files: [file] } });
  } else if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".json")) {
    try {
      const text = await file.text();
      chatInput.value = text.slice(0, 2000);
      chatInput.focus();
    } catch (err) {
      alert("文件读取失败：" + (err instanceof Error ? err.message : String(err)));
    }
  } else {
    alert("暂不支持该文件类型，请上传图片或文本文件。");
  }
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

async function putJson(url, payload) {
  const response = await fetch(url, {
    method: "PUT",
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

function computeStateHash() {
  return JSON.stringify({
    nodes: Array.from(state.nodes.entries()).map(([k, v]) => [k, { x: v.x, y: v.y, width: v.width, height: v.height, generated: v.generated, option: v.option }]),
    links: state.links,
    collapsed: Array.from(state.collapsed),
    selectiveHidden: Array.from(state.selectiveHidden),
    chatMessages: state.chatMessages,
    view: state.view,
    sourceImage: state.sourceImage ? state.sourceImage.slice(0, 200) : null,
    latestAnalysis: state.latestAnalysis
  });
}

async function prepareStateForSave() {
  const payload = {
    sourceImage: state.sourceImage,
    sourceImageHash: state.sourceImageHash,
    sourceType: state.sourceType,
    sourceText: state.sourceText,
    sourceDataUrl: state.sourceDataUrl,
    sourceUrl: state.sourceUrl,
    fileName: state.fileName,
    latestAnalysis: state.latestAnalysis,
    chatMessages: state.chatMessages,
    nodes: {},
    links: state.links,
    collapsed: Array.from(state.collapsed),
    selectiveHidden: Array.from(state.selectiveHidden),
    generatedCount: state.generatedCount,
    view: state.view
  };

  for (const [id, node] of state.nodes.entries()) {
    payload.nodes[id] = {
      id,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      generated: node.generated || false,
      option: node.option || null,
      imageHash: node.imageHash || null,
      explanation: node.explanation || null
    };
  }

  return payload;
}

async function getSourceImageDataUrl() {
  if (state.sourceImage && state.sourceImage.startsWith("data:")) return state.sourceImage;
  if (state.sourceImageHash) {
    const response = await fetch(`/api/assets/${state.sourceImageHash}?kind=upload`);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
  return state.sourceImage;
}

function getSourceBadgeClass() {
  if (state.sourceType === "url") return "link";
  if (state.sourceType === "text") {
    const ext = (state.fileName || "").split(".").pop()?.toLowerCase();
    if (["docx", "pdf", "pptx"].includes(ext)) return "document";
    return "text";
  }
  return "image";
}

function getSourceBadgeLabel() {
  if (state.sourceType === "url") {
    return state.fileName || "LINK";
  }
  if (state.sourceType === "text") {
    const ext = (state.fileName || "").split(".").pop()?.toLowerCase();
    const map = { txt: "TXT", md: "MD", json: "JSON", docx: "DOCX", pdf: "PDF", pptx: "PPTX" };
    return map[ext] || "TEXT";
  }
  return "IMG";
}

function updateSourceBadge() {
  let badge = sourceNode.querySelector(".source-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "source-badge";
    sourceNode.querySelector(".node-caption")?.prepend(badge);
  }
  badge.className = `source-badge ${getSourceBadgeClass()}`;
  badge.textContent = getSourceBadgeLabel();
}

async function saveSession({ isAuto = false } = {}) {
  const saveStatus = document.querySelector("#saveStatus");
  if (saveStatus) saveStatus.textContent = isAuto ? "自动保存中..." : "保存中...";
  if (saveStatus) saveStatus.className = "save-status saving";

  try {
    if (state.sourceImage && state.sourceImage.startsWith("data:") && !state.sourceImageHash) {
      const asset = await postJson("/api/assets", {
        dataUrl: state.sourceImage,
        kind: "upload",
        fileName: state.fileName
      });
      state.sourceImageHash = asset.hash;
    }

    const payloadState = await prepareStateForSave();
    const aiTitle = state.latestAnalysis?.title?.trim();
    const body = {
      state: payloadState,
      title: aiTitle || (state.fileName ? `${state.fileName} 的探索` : "未命名会话"),
      isDemo: document.querySelector("#modeBadge")?.textContent === "demo"
    };

    let result;
    if (currentSessionId) {
      result = await putJson(`/api/sessions/${currentSessionId}`, body);
    } else {
      result = await postJson("/api/sessions", body);
      currentSessionId = result.sessionId;
      const url = new URL(window.location.href);
      url.searchParams.set("session", currentSessionId);
      window.history.replaceState({}, "", url);
    }

    lastSavedStateHash = computeStateHash();
    if (saveStatus) {
      saveStatus.textContent = `已保存 ${new Date(result.savedAt).toLocaleTimeString()}`;
      saveStatus.className = "save-status saved";
    }
  } catch (error) {
    console.error("Save failed:", error);
    if (saveStatus) {
      saveStatus.textContent = "保存失败";
      saveStatus.className = "save-status error";
    }
  }
}

function autoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  const currentHash = computeStateHash();
  if (currentHash === lastSavedStateHash) return;

  autoSaveTimer = setTimeout(() => {
    saveSession({ isAuto: true });
  }, 2000);
}

async function loadSession(sessionId) {
  setStatus("Loading session", "busy");
  try {
    const data = await getJson(`/api/sessions/${sessionId}`);

    clearOptions();
    state.chatMessages = [];
    state.links = [];
    state.collapsed.clear();
    state.selectiveHidden.clear();
    state.generatedCount = 0;
    state.sourceImage = null;
    state.sourceImageHash = null;
    state.sourceUrl = null;
    state.fileName = "";
    state.latestAnalysis = null;

    if (data.viewState) {
      state.view = { ...state.view, ...data.viewState };
      updateBoardTransform();
    }

    const sourceAsset = data.assets.find(a => a.kind === "upload");
    if (sourceAsset) {
      const isText = data.state?.sourceType === "text" || sourceAsset.mimeType?.startsWith("text/") || /\.(txt|md|json|docx|pdf|pptx)$/i.test(sourceAsset.fileName || "");
      state.sourceType = isText ? "text" : "image";
      state.fileName = sourceAsset.fileName || "";

      if (state.sourceType === "image") {
        state.sourceImage = `/api/assets/${sourceAsset.hash}?kind=upload`;
        state.sourceImageHash = sourceAsset.hash;
        sourcePreview.src = state.sourceImage;
        sourcePreview.classList.add("has-image");
      } else {
        state.sourceImage = null;
        state.sourceImageHash = null;
        state.sourceText = data.state?.sourceText || null;
        state.sourceDataUrl = data.state?.sourceDataUrl || null;
        sourcePreview.src = "";
        sourcePreview.classList.remove("has-image");
      }
      emptyState.classList.add("hidden");
      sourceName.textContent = trimMiddle(state.fileName, 28);
      analyzeButton.disabled = false;
      updateSourceBadge();
    } else if (data.state?.sourceType === "url" && data.state?.sourceUrl) {
      // Restore URL source without upload asset
      state.sourceType = "url";
      state.sourceUrl = data.state.sourceUrl;
      state.fileName = data.state.fileName || new URL(data.state.sourceUrl).hostname;
      state.sourceImage = null;
      state.sourceImageHash = null;
      state.sourceText = null;
      state.sourceDataUrl = null;

      renderUrlSource(state.sourceUrl, data.state?.latestAnalysis?.title || "");
      sourceName.textContent = trimMiddle(state.fileName, 28);
      analyzeButton.disabled = false;
      updateSourceBadge();
    } else {
      state.sourceType = "image";
      state.sourceImage = null;
      state.sourceImageHash = null;
      state.sourceText = null;
      state.sourceDataUrl = null;
      state.sourceUrl = null;
      sourcePreview.src = "";
      sourcePreview.classList.remove("has-image");
      emptyState.classList.remove("hidden");
      sourceName.textContent = "Source image";
      analyzeButton.disabled = true;
      updateSourceBadge();
    }

    const analysisNodeData = data.nodes.find(n => n.type === "analysis");
    if (analysisNodeData && analysisNodeData.data?.summary) {
      state.latestAnalysis = {
        title: analysisNodeData.data.title || "",
        summary: analysisNodeData.data.summary,
        detectedSubjects: analysisNodeData.data.detectedSubjects || [],
        moodKeywords: analysisNodeData.data.moodKeywords || [],
        options: []
      };
      renderAnalysis(state.latestAnalysis);
    } else {
      analysisNode.classList.add("hidden");
      state.latestAnalysis = null;
    }

    // Restore source fields from persisted state if present
    if (data.state?.sourceType) {
      state.sourceType = data.state.sourceType;
    }
    if (data.state?.sourceText) {
      state.sourceText = data.state.sourceText;
    }
    if (data.state?.sourceDataUrl) {
      state.sourceDataUrl = data.state.sourceDataUrl;
    }
    if (data.state?.sourceUrl) {
      state.sourceUrl = data.state.sourceUrl;
    }

    const optionNodes = data.nodes.filter(n => n.type === "option" || n.type === "generated");
    for (const n of optionNodes) {
      const option = n.data?.option || { title: "生成方向", description: "", tone: "cinematic", layoutHint: "square" };
      const position = optionPositions[optionNodes.indexOf(n) % optionPositions.length];
      const nodeId = n.nodeId;

      const fragment = optionTemplate.content.cloneNode(true);
      const element = fragment.querySelector(".option-node");
      element.dataset.nodeId = nodeId;
      element.style.left = `${n.x || position.x}px`;
      element.style.top = `${n.y || position.y}px`;
      element.style.setProperty("--tilt", `${position.tilt}deg`);
      element.querySelector(".option-tone").textContent = `${option.tone || "visual"} / ${option.layoutHint || "square"}`;
      element.querySelector(".option-title").textContent = option.title || "生成方向";
      element.querySelector(".option-description").textContent = option.description || "";

      const button = element.querySelector(".generate-button");
      button.addEventListener("click", () => generateOption(nodeId, option));

      board.appendChild(element);
      registerNode(nodeId, element, {
        x: n.x || position.x,
        y: n.y || position.y,
        width: n.width || 318,
        height: n.height || element.offsetHeight,
        option,
        generated: n.type === "generated"
      });

      if (n.type === "generated" && (n.data?.imageHash || n.data?.imageDataUrl)) {
        const hash = n.data?.imageHash || n.data?.imageDataUrl;
        const imageUrl = hash.startsWith("data:") ? hash : `/api/assets/${hash}?kind=generated`;
        turnIntoGeneratedNode(element, option, imageUrl);
        const node = state.nodes.get(nodeId);
        if (node) {
          node.generated = true;
          node.imageHash = n.data?.imageHash || null;
          node.explanation = n.data?.explanation || "";
          node.width = element.offsetWidth;
          node.height = element.offsetHeight;
        }
        state.generatedCount += 1;
      }

      state.links.push({ from: "analysis", to: nodeId, kind: "option" });
      makeDraggable(element, nodeId);
    }

    state.links = data.links.map(l => ({ from: l.fromNodeId, to: l.toNodeId, kind: l.kind }));
    if (analysisNodeData && !state.links.find(l => l.from === "source" && l.to === "analysis")) {
      state.links.unshift({ from: "source", to: "analysis", kind: "analysis" });
    }

    for (const n of data.nodes) {
      if (n.collapsed) state.collapsed.add(n.nodeId);
    }
    if (data.selectiveHidden) {
      for (const id of data.selectiveHidden) state.selectiveHidden.add(id);
    }

    state.chatMessages = data.chatMessages.map(m => ({ role: m.role, content: m.content }));
    renderChatMessages();

    applyCollapseState();
    updateCounts();

    currentSessionId = sessionId;
    lastSavedStateHash = computeStateHash();

    const url = new URL(window.location.href);
    url.searchParams.set("session", sessionId);
    window.history.replaceState({}, "", url);

    setStatus("Session loaded", "ready");
  } catch (error) {
    setStatus(error.message || "Load failed", "error");
  }
}

async function renderSessionList() {
  const list = document.querySelector("#sessionList");
  if (!list) return;
  list.innerHTML = "<span class='session-item-meta'>加载中...</span>";

  try {
    const data = await getJson("/api/history?limit=50");
    list.innerHTML = "";

    if (!data.sessions?.length) {
      list.innerHTML = "<span class='session-item-meta'>暂无历史会话</span>";
      return;
    }

    for (const session of data.sessions) {
      const item = document.createElement("div");
      item.className = "session-item";
      if (session.id === currentSessionId) item.classList.add("active");

      const title = document.createElement("div");
      title.className = "session-item-title";
      title.textContent = session.title || "未命名会话";

      if (session.isDemo) {
        const badge = document.createElement("span");
        badge.className = "session-item-demo";
        badge.textContent = "Demo";
        title.appendChild(badge);
      }

      const meta = document.createElement("div");
      meta.className = "session-item-meta";
      const date = new Date(session.updatedAt);
      meta.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} · ${session.nodeCount} 节点 · ${session.assetCount} 素材`;

      item.appendChild(title);
      item.appendChild(meta);
      item.addEventListener("click", () => {
        loadSession(session.id);
        document.querySelector("#sessionPanel")?.classList.add("hidden");
      });

      list.appendChild(item);
    }
  } catch (error) {
    list.innerHTML = "<span class='session-item-meta'>加载失败</span>";
  }
}
