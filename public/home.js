const journey = document.querySelector("[data-journey]");
const track = document.querySelector("[data-journey-track]");
const progressBar = document.querySelector("[data-progress-bar]");
const connectorSvg = document.querySelector("[data-connectors]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let latestProgress = 0;
let frameId = 0;

/* ─────────────── utilities ─────────────── */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCardPosition(card) {
  const x = parseFloat(card.style.getPropertyValue("--x")) || 0;
  const y = parseFloat(card.style.getPropertyValue("--y")) || 0;
  return { x, y };
}

function setCardPosition(card, x, y) {
  card.style.setProperty("--x", `${x}px`);
  card.style.setProperty("--y", `${y}px`);
}

/* ─────────────── scroll-driven horizontal pan ─────────────── */
function measureJourneyProgress() {
  if (!journey || !track || prefersReducedMotion.matches) return 0;
  const rect = journey.getBoundingClientRect();
  const maxScroll = Math.max(1, journey.offsetHeight - window.innerHeight);
  return clamp(-rect.top / maxScroll, 0, 1);
}

function renderJourney(progress) {
  if (!journey || !track) return;
  const sidePadding = Math.max(64, Math.min(160, window.innerWidth * 0.08));
  const travel = Math.max(0, track.scrollWidth - window.innerWidth + sidePadding);
  track.style.transform = `translate3d(${-travel * progress}px, 0, 0)`;
  journey.style.setProperty("--journey-progress", progress.toFixed(4));
  progressBar?.style.setProperty("--journey-progress", progress.toFixed(4));
}

function requestJourneyRender() {
  if (frameId) return;
  frameId = window.requestAnimationFrame(() => {
    frameId = 0;
    latestProgress = measureJourneyProgress();
    renderJourney(latestProgress);
  });
}

/* ─────────────── connector lines ─────────────── */
function updateSvgViewBox() {
  if (!connectorSvg || !track) return;
  const w = track.offsetWidth;
  const h = track.offsetHeight;
  connectorSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
}

function getPortPosition(card, side) {
  const pos = getCardPosition(card);
  const width = card.offsetWidth;
  const height = card.offsetHeight;
  if (side === "right") {
    return { x: pos.x + width, y: pos.y + height / 2 };
  }
  return { x: pos.x, y: pos.y + height / 2 };
}

function drawConnectors() {
  if (!connectorSvg) return;

  // Remove old paths (keep defs)
  const oldPaths = connectorSvg.querySelectorAll(".connector-line");
  oldPaths.forEach((p) => p.remove());

  const cards = Array.from(track.querySelectorAll("[data-card-id]"));
  const cardMap = new Map(cards.map((c) => [c.dataset.cardId, c]));

  cards.forEach((card) => {
    const targetId = card.dataset.connectsTo;
    if (!targetId) return;

    const target = cardMap.get(targetId);
    if (!target) return;

    const start = getPortPosition(card, "right");
    const end = getPortPosition(target, "left");

    const midX = (start.x + end.x) / 2;
    const d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${midX.toFixed(1)} ${start.y.toFixed(1)}, ${midX.toFixed(1)} ${end.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connector-line");
    path.setAttribute("d", d);
    path.setAttribute("marker-end", "url(#journey-arrow)");

    connectorSvg.appendChild(path);
  });
}

/* ─────────────── drag system ─────────────── */
function setupCardDragging() {
  const cards = track.querySelectorAll(".journey-card");

  cards.forEach((card) => {
    let isDragging = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startCardX = 0;
    let startCardY = 0;
    let originalTransition = "";

    function onStart(clientX, clientY) {
      isDragging = true;
      card.classList.add("is-dragging");
      originalTransition = card.style.transition;
      card.style.transition = "none";

      startMouseX = clientX;
      startMouseY = clientY;
      startCardX = parseFloat(card.style.getPropertyValue("--x")) || 0;
      startCardY = parseFloat(card.style.getPropertyValue("--y")) || 0;
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;

      const dx = clientX - startMouseX;
      const dy = clientY - startMouseY;

      let newX = startCardX + dx;
      let newY = startCardY + dy;

      const trackWidth = track.offsetWidth;
      const trackHeight = track.offsetHeight;
      const cardWidth = card.offsetWidth;
      const cardHeight = card.offsetHeight;

      newX = clamp(newX, 0, trackWidth - cardWidth);
      newY = clamp(newY, 0, trackHeight - cardHeight);

      setCardPosition(card, newX, newY);
      drawConnectors();
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove("is-dragging");
      card.style.transition = originalTransition;
    }

    card.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("a, button, input, textarea, select")) return;
      onStart(e.clientX, e.clientY);
      e.preventDefault();
    });

    card.addEventListener("touchstart", (e) => {
      if (e.target.closest("a, button, input, textarea, select")) return;
      const touch = e.touches[0];
      onStart(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    window.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      onMove(touch.clientX, touch.clientY);
      if (isDragging) e.preventDefault();
    }, { passive: false });

    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
  });
}

/* ─────────────── card reveal animations ─────────────── */
function setupCardReveals() {
  const cards = document.querySelectorAll(
    ".journey-card, .agent-bubble, .user-pin, .sticky-note"
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
  );

  cards.forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    observer.observe(card);
  });

  const style = document.createElement("style");
  style.textContent = `
    .journey-card.is-visible,
    .agent-bubble.is-visible,
    .user-pin.is-visible { opacity: 1 !important; transform: translateY(0) !important; }
    .sticky-note.is-visible { opacity: 1 !important; transform: rotate(var(--rotation, 0deg)) !important; }
  `;
  document.head.appendChild(style);
}

/* ─────────────── hero card priming ─────────────── */
function primeHeroCards() {
  document.querySelectorAll(".floating-card").forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 35, 280)}ms`;
    card.classList.add("is-ready");
  });
}

/* ─────────────── init ─────────────── */
window.addEventListener("scroll", requestJourneyRender, { passive: true });
window.addEventListener("resize", () => {
  requestJourneyRender();
  updateSvgViewBox();
  drawConnectors();
});
prefersReducedMotion.addEventListener?.("change", requestJourneyRender);

primeHeroCards();
updateSvgViewBox();
setupCardDragging();
drawConnectors();
setupCardReveals();
requestJourneyRender();
