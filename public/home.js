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

const rowCount = 5;
const columnsPerLayer = 8;
const stepCount = rowCount * columnsPerLayer;
const endPaddingLayers = 0.05;
const scrollLimit = (stepCount - 1) / (columnsPerLayer * 2) + endPaddingLayers;
const cards = [];
const state = {
  auto: 0,
  current: initialScrollTarget(),
  target: initialScrollTarget(),
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

function initialScrollTarget() {
  if (window.location.hash === "#top") return -scrollLimit;
  if (window.location.hash === "#bottom") return scrollLimit;
  return 0;
}

function viewportModel() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = width < 900;

  return {
    centerX: compact ? width * 0.58 : width * 0.6,
    centerY: height * 0.5,
    radiusX: compact ? Math.max(150, width * 0.25) : Math.min(430, width * 0.19),
    radiusZ: compact ? 310 : 500,
    stepGap: compact ? 78 : 96,
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

function cardPoint(card, model, scrollProgress, spin) {
  const scrollSteps = scrollProgress * columnsPerLayer;
  const pathStep = card.step - scrollSteps;
  const centeredStep = pathStep - (stepCount - 1) / 2;
  const angle = pathStep * (Math.PI * 2 / columnsPerLayer) + spin;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const radiusPulse = 1;

  return {
    x: sin * model.radiusX * radiusPulse,
    y: centeredStep * model.stepGap,
    z: cos * model.radiusZ,
    angle,
    depth: cos,
    localY: centeredStep * model.stepGap,
    stepY: centeredStep * model.stepGap,
  };
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

  if (type === "vertical") {
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    const xMin = Math.min(a.x, b.x);
    const xMax = Math.max(a.x, b.x);
    const yPadding = model.stepGap * columnsPerLayer * 1.1;
    const xPadding = model.width * 0.2;

    return (
      layerDistance <= maxLayerDistance &&
      yMax > -yPadding &&
      yMin < model.height + yPadding &&
      xMax > -xPadding &&
      xMin < model.width + xPadding
    );
  }

  const maxScreenDistance = Math.min(560, model.width * 0.36);
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
  state.auto += dt * 0.032;
  state.current += (state.target - state.current) * 0.08;
  state.velocity *= 0.9;

  const scrollProgress = clamp(state.current + state.velocity, -scrollLimit, scrollLimit);
  const spin = state.auto;
  const model = viewportModel();
  const projected = [];

  for (const card of cards) {
    const point = cardPoint(card, model, scrollProgress, spin);
    const pos = project(point, model);
    const depthScale = clamp(pos.scale, 0.38, 1.28);
    const visible = pos.y > -360 && pos.y < model.height + 360;
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
  vortexValue.textContent = (Math.sin(spin) * 0.84).toFixed(1);
  heightValue.textContent = "18.06";

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
  state.target = clamp(state.target + event.deltaY * 0.006, -scrollLimit, scrollLimit);
  state.velocity = clamp(state.velocity + event.deltaY * 0.0003, -0.9, 0.9);
}, { passive: false });

window.addEventListener("pointerdown", (event) => {
  state.pointerDown = true;
  state.pointerY = event.clientY;
});

window.addEventListener("pointermove", (event) => {
  if (!state.pointerDown) return;
  const delta = event.clientY - state.pointerY;
  state.pointerY = event.clientY;
  state.target = clamp(state.target + delta * 0.012, -scrollLimit, scrollLimit);
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
