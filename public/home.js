const world = document.querySelector("#tubeWorld");
const lineLayer = document.querySelector("#tubeLines");
const focusOverlay = document.querySelector("#focusOverlay");
const focusImage = document.querySelector("#focusImage");
const focusClose = document.querySelector("#focusClose");
const vortexValue = document.querySelector("#vortexValue");
const heightValue = document.querySelector("#heightValue");

const palette = [
  "#eef5f7",
  "#e66b5a",
  "#dce94f",
  "#8fe548",
  "#f0f4f5",
  "#cf8a86",
  "#dde8ed",
  "#f4ef43",
];

const rowCount = 12;
const columnsPerLayer = 8;
const stepCount = rowCount * columnsPerLayer;
const cards = [];
const state = {
  auto: 0,
  current: 0,
  target: 0,
  velocity: 0,
  lastTime: performance.now(),
  pointerDown: false,
  pointerY: 0,
};

function makeCards() {
  for (let step = 0; step < stepCount; step++) {
    const card = document.createElement("button");
    const inner = document.createElement("span");
    const width = 188 + (step % 3) * 18;
    const height = 118 + (step % 4) * 8;
    const color = palette[step % palette.length];

    card.type = "button";
    card.className = "tube-card panel";
    card.dataset.step = String(step);
    card.style.setProperty("--card-w", `${width}px`);
    card.style.setProperty("--card-h", `${height}px`);
    card.style.setProperty("--panel-color", color);

    inner.className = "tube-card-inner";
    card.appendChild(inner);
    world.appendChild(card);

    card.addEventListener("click", () => {
      focusImage.removeAttribute("src");
      focusImage.alt = "";
      focusOverlay.style.setProperty("--focus-color", color);
      focusOverlay.classList.add("open", "color-open");
      focusOverlay.setAttribute("aria-hidden", "false");
    });

    cards.push({
      step,
      element: card,
      width,
      height,
      tilt: ((step % 7) - 3) * 1.4,
    });
  }
}

function viewportModel() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = width < 900;

  return {
    centerX: compact ? width * 0.58 : width * 0.6,
    centerY: height * 0.5,
    radiusX: compact ? Math.max(140, width * 0.23) : Math.min(360, width * 0.16),
    radiusZ: compact ? 310 : 500,
    stepGap: compact ? 58 : 72,
    perspective: compact ? 900 : 1120,
    width,
    height,
  };
}

function project(point, model) {
  const scale = model.perspective / (model.perspective - point.z);
  return {
    x: model.centerX + point.x * scale,
    y: model.centerY + point.y * scale,
    scale,
  };
}

function cardPoint(card, model, progress) {
  const scrollSteps = progress * columnsPerLayer;
  const rawStep = card.step - (stepCount - 1) / 2 - scrollSteps;
  const wrappedStep = wrapRow(rawStep);
  const column = card.step % columnsPerLayer;
  const angle = progress * Math.PI * 2 + column * (Math.PI * 2 / columnsPerLayer);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const radiusPulse = 1 + Math.sin(column * 0.85) * 0.025;

  return {
    x: sin * model.radiusX * radiusPulse,
    y: wrappedStep * model.stepGap,
    z: cos * model.radiusZ,
    angle,
    depth: cos,
    localY: wrappedStep * model.stepGap,
    stepY: wrappedStep * model.stepGap,
  };
}

function wrapRow(row) {
  const span = stepCount;
  return ((row + span / 2) % span + span) % span - span / 2;
}

function renderLines(projected, model) {
  const paths = [];
  const byStep = new Map(projected.map((item) => [item.step, item]));

  for (let step = 0; step < stepCount - 1; step++) {
    const current = byStep.get(step);
    const next = byStep.get(step + 1);
    if (current && next && shouldConnect(current, next, model, "spiral")) {
      paths.push(linePath(current, next, 0.24, "tube-line-spiral"));
    }
  }

  for (let step = 0; step < stepCount - columnsPerLayer; step++) {
    const current = byStep.get(step);
    const nextLayer = byStep.get(step + columnsPerLayer);
    if (current && nextLayer && shouldConnect(current, nextLayer, model, "vertical")) {
      paths.push(linePath(current, nextLayer, 0.46, "tube-line-vertical"));
    }
  }

  lineLayer.innerHTML = paths.join("");
}

function shouldConnect(a, b, model, type) {
  const layerDistance = Math.abs(a.stepY - b.stepY);
  const screenDistance = Math.hypot(a.x - b.x, a.y - b.y);
  const maxLayerDistance =
    type === "vertical" ? model.stepGap * columnsPerLayer * 1.12 : model.stepGap * 1.55;
  const maxScreenDistance =
    type === "vertical" ? Math.min(model.height * 0.78, 680) : Math.min(480, model.width * 0.3);
  const onScreen =
    a.visible &&
    b.visible &&
    a.y > -model.stepGap * 2 &&
    a.y < model.height + model.stepGap * 2 &&
    b.y > -model.stepGap * 2 &&
    b.y < model.height + model.stepGap * 2;

  return (
    onScreen &&
    layerDistance <= maxLayerDistance &&
    screenDistance <= maxScreenDistance
  );
}

function linePath(a, b, opacity, className) {
  const start = edgePoint(a, b);
  const end = edgePoint(b, a);
  return `<path class="${className}" d="M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}" style="opacity:${opacity}" />`;
}

function edgePoint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const halfW = from.renderWidth / 2;
  const halfH = from.renderHeight / 2;

  if (absX < 0.001 && absY < 0.001) {
    return { x: from.x, y: from.y };
  }

  const ratioX = absX > 0 ? halfW / absX : Number.POSITIVE_INFINITY;
  const ratioY = absY > 0 ? halfH / absY : Number.POSITIVE_INFINITY;
  const ratio = Math.min(ratioX, ratioY);

  return {
    x: from.x + dx * ratio,
    y: from.y + dy * ratio,
  };
}

function render(now) {
  const dt = Math.min(0.04, (now - state.lastTime) / 1000);
  state.lastTime = now;
  state.auto += dt * 0.035;
  state.current += (state.target - state.current) * 0.08;
  state.velocity *= 0.9;

  const progress = state.auto + state.current + state.velocity;
  const model = viewportModel();
  const projected = [];

  for (const card of cards) {
    const point = cardPoint(card, model, progress);
    const pos = project(point, model);
    const depthScale = clamp(pos.scale, 0.44, 1.24);
    const visible = pos.y > -260 && pos.y < model.height + 260;
    const side = Math.sin(point.angle);
    const yaw = -side * 48;
    const alpha = clamp(0.36 + (point.depth + 1) * 0.3, 0.26, 0.96);

    card.element.style.transform = [
      `translate3d(${(pos.x - card.width / 2).toFixed(2)}px, ${(pos.y - card.height / 2).toFixed(2)}px, 0)`,
      `rotateY(${yaw.toFixed(2)}deg)`,
      `rotateZ(${card.tilt.toFixed(2)}deg)`,
      `scale(${depthScale.toFixed(3)})`,
    ].join(" ");
    card.element.style.opacity = visible ? alpha.toFixed(3) : "0";
    card.element.style.zIndex = String(Math.round(point.z + 2000));
    card.element.classList.toggle("is-near", point.depth > 0.15);
    card.element.classList.toggle("is-far", point.depth < -0.35);

    const rect = card.element.getBoundingClientRect();

    const screenVisible =
      rect.right > 0 &&
      rect.left < model.width &&
      rect.top > -12 &&
      rect.bottom < model.height + 12;

    projected.push({
      step: card.step,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      z: point.z,
      localY: point.localY,
      stepY: point.stepY,
      renderWidth: rect.width,
      renderHeight: rect.height,
      visible: screenVisible,
    });
  }

  renderLines(projected, model);
  vortexValue.textContent = (Math.sin(progress) * 0.84).toFixed(1);
  heightValue.textContent = (rowCount * columnsPerLayer * model.stepGap / 380).toFixed(2);

  requestAnimationFrame(render);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function closeFocus() {
  focusOverlay.classList.remove("open", "color-open");
  focusOverlay.setAttribute("aria-hidden", "true");
}

window.addEventListener("wheel", (event) => {
  event.preventDefault();
  state.target += event.deltaY * 0.0014;
  state.velocity += event.deltaY * 0.00012;
}, { passive: false });

window.addEventListener("pointerdown", (event) => {
  state.pointerDown = true;
  state.pointerY = event.clientY;
});

window.addEventListener("pointermove", (event) => {
  if (!state.pointerDown) return;
  const delta = event.clientY - state.pointerY;
  state.pointerY = event.clientY;
  state.target += delta * 0.0035;
});

window.addEventListener("pointerup", () => {
  state.pointerDown = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeFocus();
});

focusClose.addEventListener("click", closeFocus);
focusOverlay.addEventListener("click", (event) => {
  if (event.target === focusOverlay) closeFocus();
});

makeCards();
requestAnimationFrame(render);
