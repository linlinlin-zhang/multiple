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

const rowCount = 14;
const columns = 2;
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
  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columns; column++) {
      const card = document.createElement("button");
      const inner = document.createElement("span");
      const width = column === 0 ? 218 : 188;
      const height = column === 0 ? 142 : 124;

      card.type = "button";
      card.className = "tube-card panel";
      card.dataset.row = String(row);
      card.dataset.column = String(column);
      card.style.setProperty("--card-w", `${width}px`);
      card.style.setProperty("--card-h", `${height}px`);
      card.style.setProperty("--panel-color", palette[(row * 2 + column) % palette.length]);

      inner.className = "tube-card-inner";
      card.appendChild(inner);
      world.appendChild(card);

      card.addEventListener("click", () => {
        focusImage.removeAttribute("src");
        focusImage.alt = "";
        focusOverlay.style.setProperty("--focus-color", palette[(row * 2 + column) % palette.length]);
        focusOverlay.classList.add("open", "color-open");
        focusOverlay.setAttribute("aria-hidden", "false");
      });

      cards.push({
        row,
        column,
        element: card,
        width,
        height,
        tilt: ((row % 5) - 2) * 2.5 + (column === 0 ? -2 : 2),
      });
    }
  }
}

function viewportModel() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const compact = width < 900;

  return {
    centerX: compact ? width * 0.58 : width * 0.57,
    centerY: height * 0.5,
    radiusX: compact ? Math.max(140, width * 0.23) : Math.min(390, width * 0.19),
    radiusZ: compact ? 310 : 470,
    rowGap: compact ? 128 : 156,
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
  const scrollRows = progress * 0.38;
  const rawRow = card.row - (rowCount - 1) / 2 - scrollRows;
  const wrappedRow = wrapRow(rawRow);
  const angle = progress * 0.82 + card.row * 0.52 + card.column * Math.PI;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  return {
    x: sin * model.radiusX,
    y: wrappedRow * model.rowGap,
    z: cos * model.radiusZ,
    angle,
    depth: cos,
    localY: wrappedRow * model.rowGap,
  };
}

function wrapRow(row) {
  const span = rowCount;
  return ((row + span / 2) % span + span) % span - span / 2;
}

function renderLines(projected, model) {
  const paths = [];
  const byCell = new Map(projected.map((item) => [`${item.row}-${item.column}`, item]));

  for (let row = 0; row < rowCount; row++) {
    const front = byCell.get(`${row}-0`);
    const back = byCell.get(`${row}-1`);
    if (front && back && shouldConnect(front, back, model, 2.4, 640)) {
      paths.push(linePath(front, back, 0.46));
    }
  }

  for (let row = 0; row < rowCount - 1; row++) {
    for (let column = 0; column < columns; column++) {
      const current = byCell.get(`${row}-${column}`);
      const next = byCell.get(`${row + 1}-${column}`);
      if (current && next && shouldConnect(current, next, model, 1.34, 360)) {
        paths.push(linePath(current, next, 0.34));
      }
    }
  }

  lineLayer.innerHTML = paths.join("");
}

function shouldConnect(a, b, model, rowMultiplier, maxScreenDistance) {
  const yDistance = Math.abs(a.localY - b.localY);
  const screenDistance = Math.hypot(a.x - b.x, a.y - b.y);
  const onScreen =
    a.y > -model.rowGap * 2 &&
    a.y < model.height + model.rowGap * 2 &&
    b.y > -model.rowGap * 2 &&
    b.y < model.height + model.rowGap * 2;

  return onScreen && yDistance <= model.rowGap * rowMultiplier && screenDistance <= maxScreenDistance;
}

function linePath(a, b, opacity) {
  return `<path d="M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)}" style="opacity:${opacity}" />`;
}

function render(now) {
  const dt = Math.min(0.04, (now - state.lastTime) / 1000);
  state.lastTime = now;
  state.auto += dt * 0.16;
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

    projected.push({
      row: card.row,
      column: card.column,
      x: pos.x,
      y: pos.y,
      z: point.z,
      localY: point.localY,
    });
  }

  renderLines(projected, model);
  vortexValue.textContent = (Math.sin(progress) * 0.84).toFixed(1);
  heightValue.textContent = (18.06 + Math.cos(progress * 0.4) * 0.34).toFixed(2);

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
  state.target += event.deltaY * 0.006;
  state.velocity += event.deltaY * 0.0004;
}, { passive: false });

window.addEventListener("pointerdown", (event) => {
  state.pointerDown = true;
  state.pointerY = event.clientY;
});

window.addEventListener("pointermove", (event) => {
  if (!state.pointerDown) return;
  const delta = event.clientY - state.pointerY;
  state.pointerY = event.clientY;
  state.target += delta * 0.012;
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
