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

  if (prefersReducedMotion.matches) {
    document.querySelectorAll("[data-appear-start]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "";
    });
    document.querySelectorAll(".connector-line").forEach((path) => {
      path.style.strokeDashoffset = "0";
    });
    return;
  }

  // Scroll-triggered element reveals: aggregation & disconnection
  document.querySelectorAll("[data-appear-start]").forEach((el) => {
    const appearStart = parseFloat(el.dataset.appearStart);
    const appearEnd = parseFloat(el.dataset.appearEnd);
    const fadeStart = parseFloat(el.dataset.fadeStart || "1");
    const fadeEnd = parseFloat(el.dataset.fadeEnd || "1");

    let opacity = 1;
    let translateX = 0;
    let translateY = 0;
    let scale = 1;

    const isAgent = el.classList.contains("agent-bubble");
    const isSticky = el.classList.contains("sticky-note");
    const isUserPin = el.classList.contains("user-pin");
    const isComment = el.classList.contains("comment-bubble");
    const isReaction = el.classList.contains("reaction");

    // Enter phase: elements arrive from different directions
    if (progress < appearStart) {
      opacity = 0;
      scale = 0.86;
      if (isAgent) {
        translateX = -40;
        translateY = -140;
      } else if (isSticky) {
        translateX = -80;
        translateY = -20;
      } else if (isUserPin) {
        translateX = 80;
        translateY = 20;
      } else if (isComment) {
        translateX = -60;
        translateY = 10;
      } else if (isReaction) {
        translateX = 60;
        translateY = -10;
      } else {
        translateY = 120;
      }
    } else if (progress < appearEnd) {
      const t = (progress - appearStart) / (appearEnd - appearStart);
      const ease = 1 - Math.pow(1 - t, 3);
      opacity = ease;
      scale = 0.86 + ease * 0.14;
      if (isAgent) {
        translateX = (1 - ease) * -40;
        translateY = (1 - ease) * -140;
      } else if (isSticky) {
        translateX = (1 - ease) * -80;
        translateY = (1 - ease) * -20;
      } else if (isUserPin) {
        translateX = (1 - ease) * 80;
        translateY = (1 - ease) * 20;
      } else if (isComment) {
        translateX = (1 - ease) * -60;
        translateY = (1 - ease) * 10;
      } else if (isReaction) {
        translateX = (1 - ease) * 60;
        translateY = (1 - ease) * -10;
      } else {
        translateY = (1 - ease) * 120;
      }
    }

    // Exit phase (disconnection): elements drift away
    if (progress > fadeStart) {
      const t = clamp((progress - fadeStart) / (fadeEnd - fadeStart), 0, 1);
      const ease = t * t * t;
      opacity = 1 - ease;
      scale = 1 - ease * 0.1;
      if (isAgent) {
        translateX = ease * 30;
        translateY = -ease * 80;
      } else if (isSticky) {
        translateX = -ease * 60;
        translateY = -ease * 20;
      } else if (isUserPin) {
        translateX = ease * 60;
        translateY = ease * 20;
      } else if (isComment) {
        translateX = -ease * 40;
      } else if (isReaction) {
        translateX = ease * 40;
      } else {
        translateY = -ease * 80;
      }
    }

    const rotation = isSticky ? `rotate(var(--rotation, 0deg))` : "";
    el.style.opacity = opacity;
    el.style.transform = `${rotation} translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`.trim();
  });

  // Connector line draw animation
  document.querySelectorAll(".connector-line").forEach((path) => {
    const drawStart = parseFloat(path.dataset.drawStart || "0");
    const drawEnd = parseFloat(path.dataset.drawEnd || "0.1");
    const length = parseFloat(path.dataset.pathLength) || 0;
    if (!length) return;

    let drawProgress = 0;
    if (progress > drawStart) {
      drawProgress = Math.min(1, (progress - drawStart) / (drawEnd - drawStart));
    }
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length * (1 - drawProgress)}`;
  });
}

function requestJourneyRender() {
  if (frameId) return;
  frameId = window.requestAnimationFrame(() => {
    frameId = 0;
    latestProgress = measureJourneyProgress();
    renderJourney(latestProgress);
    drawConnectors();
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
  const cardRect = card.getBoundingClientRect();
  const trackRect = track.getBoundingClientRect();

  const x = cardRect.left - trackRect.left + (side === "right" ? cardRect.width : 0);
  const y = cardRect.top - trackRect.top + cardRect.height / 2;

  return { x, y };
}

function drawConnectors() {
  if (!connectorSvg) return;

  const cards = Array.from(track.querySelectorAll("[data-card-id]"));
  const cardMap = new Map(cards.map((c) => [c.dataset.cardId, c]));
  const connections = [];

  cards.forEach((card) => {
    const targetId = card.dataset.connectsTo;
    if (!targetId) return;
    const target = cardMap.get(targetId);
    if (!target) return;
    connections.push({ from: card, to: target });
  });

  let paths = Array.from(connectorSvg.querySelectorAll(".connector-line"));

  while (paths.length < connections.length) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connector-line");
    path.setAttribute("marker-end", "url(#journey-arrow)");
    connectorSvg.appendChild(path);
    paths.push(path);
  }
  while (paths.length > connections.length) {
    paths.pop().remove();
  }

  connections.forEach((conn, i) => {
    const path = paths[i];
    const start = getPortPosition(conn.from, "right");
    const end = getPortPosition(conn.to, "left");
    const midX = (start.x + end.x) / 2;
    const d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${midX.toFixed(1)} ${start.y.toFixed(1)}, ${midX.toFixed(1)} ${end.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    path.setAttribute("d", d);

    const drawStart = Math.max(
      parseFloat(conn.from.dataset.appearEnd || "0"),
      parseFloat(conn.to.dataset.appearEnd || "0")
    );
    path.dataset.drawStart = String(drawStart);
    path.dataset.drawEnd = String(drawStart + 0.08);

    // Cache path length for draw animation
    path.dataset.pathLength = String(path.getTotalLength());
  });
}

/* ─────────────── drag system ─────────────── */
function setupCardDragging() {
  const cards = track.querySelectorAll(".canvas-frame, .canvas-card");

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

/* ─────────────── card reveal animations (for detail section only) ─────────────── */
function setupCardReveals() {
  const cards = document.querySelectorAll(
    ".detail-grid article, .stat-card, .closing-band"
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
    .detail-grid article.is-visible,
    .stat-card.is-visible,
    .closing-band.is-visible { opacity: 1 !important; transform: translateY(0) !important; }
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
setupCardReveals();
requestJourneyRender();

// Draw connectors after a short delay so layout is stable
setTimeout(() => {
  drawConnectors();
}, 100);
