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

const imageCards = [
  "/home-assets/ref-dog.jpg",
  "/home-assets/ref-kitchen.jpg",
  "/home-assets/ref-gradient.jpg",
];
const imageByColumn = new Map([
  [3, { src: imageCards[0], width: 96, height: 122 }],
  [4, { src: imageCards[1], width: 162, height: 116 }],
  [5, { src: imageCards[2], width: 82, height: 124 }],
]);

const rowCount = 6;
const columnsPerLayer = 8;
const stepCount = rowCount * columnsPerLayer;
const endPaddingLayers = 0.05;
const scrollLimit = (stepCount - 1) / (columnsPerLayer * 2) + endPaddingLayers;
const defaultScrollTarget = 0;
const cards = [];
const state = {
  auto: -0.89,
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
    const color = palette[step % palette.length];
    const column = step % columnsPerLayer;
    const media = imageByColumn.get(column) ?? null;
    const width = media?.width ?? 122 + (step % 4) * 14;
    const height = media?.height ?? 82 + (step % 3) * 9;

    card.type = "button";
    card.className = "tube-card panel";
    card.dataset.step = String(step);
    card.style.setProperty("--card-w", `${width}px`);
    card.style.setProperty("--card-h", `${height}px`);
    card.style.setProperty("--panel-color", color);

    inner.className = "tube-card-inner";
    if (media) {
      const image = document.createElement("img");
      image.src = media.src;
      image.alt = "";
      inner.appendChild(image);
      card.classList.add("has-image");
    }
    card.appendChild(inner);
    world.appendChild(card);

    card.addEventListener("click", () => {
      if (media) {
        focusImage.src = media.src;
        focusImage.alt = "";
        focusOverlay.classList.remove("color-open");
      } else {
        focusImage.removeAttribute("src");
        focusImage.alt = "";
        focusOverlay.style.setProperty("--focus-color", color);
        focusOverlay.classList.add("color-open");
      }
      focusOverlay.classList.add("open");
      focusOverlay.setAttribute("aria-hidden", "false");
    });

    cards.push({
      step,
      element: card,
      width,
      height,
      tilt: ((step % 7) - 3) * 1.4,
      media,
    });
  }
}

function initialScrollTarget() {
  if (window.location.hash === "#top") return -scrollLimit;
  if (window.location.hash === "#bottom") return scrollLimit;
  return defaultScrollTarget;
}

function viewportModel() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = width < 900;

  return {
    centerX: compact ? width * 0.54 : width * 0.526,
    centerY: height * 0.5,
    radiusX: compact ? Math.max(150, width * 0.25) : Math.min(390, width * 0.17),
    radiusZ: compact ? 310 : 500,
    stepGap: compact ? 70 : 86,
    travelGap: compact ? 86 : 132,
    perspective: compact ? 900 : 1120,
    width,
    height,
  };
}

function project(point, model, travelY = 0) {
  const scale = model.perspective / (model.perspective - point.z);
  return {
    x: model.centerX + point.x * scale,
    y: model.centerY + point.y * scale + travelY,
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
  const verticalPaths = [];
  const spiralPaths = [];
  const byStep = new Map(projected.map((item) => [item.step, item]));

  for (let step = 0; step < stepCount - 1; step++) {
    const column = step % columnsPerLayer;
    if (column === columnsPerLayer - 1) continue;

    const current = byStep.get(step);
    const next = byStep.get(step + 1);
    if (current && next && shouldConnect(current, next, model, "spiral")) {
      spiralPaths.push(linePath(current, next, 0.22, "tube-line-spiral"));
    }
  }

  for (let column = 0; column < columnsPerLayer; column++) {
    for (let row = 0; row < rowCount - 1; row++) {
      const current = byStep.get(row * columnsPerLayer + column);
      const nextLayer = byStep.get((row + 1) * columnsPerLayer + column);
      if (current && nextLayer && shouldConnect(current, nextLayer, model, "vertical")) {
        verticalPaths.push(linePath(current, nextLayer, 0.32, "tube-line-vertical"));
      }
    }
  }

  lineLayer.innerHTML = verticalPaths.concat(spiralPaths).join("");
}

function shouldConnect(a, b, model, type) {
  const layerDistance = Math.abs(a.stepY - b.stepY);
  const screenDistance = Math.hypot(a.x - b.x, a.y - b.y);
  const maxLayerDistance =
    type === "vertical" ? model.stepGap * columnsPerLayer * 1.12 : model.stepGap * 1.55;

  if (type === "vertical") {
    return (
      a.lineVisible &&
      b.lineVisible &&
      layerDistance <= maxLayerDistance &&
      screenDistance <= Math.min(640, model.height * 0.76) &&
      segmentTouchesViewport(a, b, model, 90)
    );
  }

  const maxScreenDistance = Math.min(420, model.width * 0.28);

  return (
    a.lineVisible &&
    b.lineVisible &&
    segmentTouchesViewport(a, b, model, 80) &&
    layerDistance <= maxLayerDistance &&
    screenDistance <= maxScreenDistance
  );
}

function linePath(a, b, opacity, className) {
  const start = cardEdgePoint(a, b);
  const end = cardEdgePoint(b, a);
  return `<path class="${className}" d="M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}" style="opacity:${opacity}" />`;
}

function cardEdgePoint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const halfWidth = (from.renderWidth ?? 0) / 2;
  const halfHeight = (from.renderHeight ?? 0) / 2;
  const xDistance = Math.abs(ux) > 0.001 ? halfWidth / Math.abs(ux) : Infinity;
  const yDistance = Math.abs(uy) > 0.001 ? halfHeight / Math.abs(uy) : Infinity;
  const distance = Math.min(xDistance, yDistance);

  return {
    x: from.x + ux * distance,
    y: from.y + uy * distance,
  };
}

function segmentTouchesViewport(a, b, model, padding) {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  return (
    maxX > -padding &&
    minX < model.width + padding &&
    maxY > -padding &&
    minY < model.height + padding
  );
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
  const travelY = (defaultScrollTarget - scrollProgress) * model.travelGap;
  const projected = [];

  for (const card of cards) {
    const point = cardPoint(card, model, scrollProgress, spin);
    const pos = project(point, model, travelY);
    const depthScale = clamp(pos.scale, 0.42, 1.16);
    const visible =
      pos.x > -260 &&
      pos.x < model.width + 260 &&
      pos.y > -360 &&
      pos.y < model.height + 360;
    const lineVisible =
      pos.x > -180 &&
      pos.x < model.width + 180 &&
      pos.y > -180 &&
      pos.y < model.height + 180;
    const side = Math.sin(point.angle);
    const yaw = -side * 48;
    const alpha = card.media ? 0.96 : clamp(0.36 + (point.depth + 1) * 0.3, 0.26, 0.88);

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

    projected.push({
      step: card.step,
      x: pos.x,
      y: pos.y,
      z: point.z,
      localY: point.localY,
      stepY: point.stepY,
      renderWidth: card.width * depthScale,
      renderHeight: card.height * depthScale,
      visible,
      lineVisible,
    });
  }

  renderLines(projected, model);
  vortexValue.textContent = "0.0";
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
  state.target = clamp(state.target + event.deltaY * 0.0014, -scrollLimit, scrollLimit);
  state.velocity = clamp(state.velocity + event.deltaY * 0.00007, -0.42, 0.42);
}, { passive: false });

window.addEventListener("pointerdown", (event) => {
  state.pointerDown = true;
  state.pointerY = event.clientY;
});

window.addEventListener("pointermove", (event) => {
  if (!state.pointerDown) return;
  const delta = event.clientY - state.pointerY;
  state.pointerY = event.clientY;
  state.target = clamp(state.target + delta * 0.004, -scrollLimit, scrollLimit);
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
