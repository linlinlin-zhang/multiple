const journey = document.querySelector("[data-journey]");
const track = document.querySelector("[data-journey-track]");
const progressBar = document.querySelector("[data-progress-bar]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let latestProgress = 0;
let frameId = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function primeHeroCards() {
  document.querySelectorAll(".floating-card, .journey-card").forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 35, 280)}ms`;
    card.classList.add("is-ready");
  });
}

window.addEventListener("scroll", requestJourneyRender, { passive: true });
window.addEventListener("resize", requestJourneyRender);
prefersReducedMotion.addEventListener?.("change", requestJourneyRender);

primeHeroCards();
requestJourneyRender();
