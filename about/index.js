/* =========================================================
SCOTTCODE — SHARED ANIMATION ENGINE
File: /index.js
========================================================= */

(() => {
"use strict";

/* Prevent the engine from running twice on one page */
if (window.__scottCodeEngineLoaded) return;
window.__scottCodeEngineLoaded = true;

const reducedMotion = window.matchMedia(
"(prefers-reduced-motion: reduce)"
).matches;

/* =======================================================
1. ANIMATED STARFIELD
Works when the page contains <canvas id="stars"></canvas>
======================================================= */

function initStarfield() {
const canvas = document.getElementById("stars");
if (!canvas || canvas.dataset.engineInitialized === "true") return;

const ctx = canvas.getContext("2d");
if (!ctx) return;

canvas.dataset.engineInitialized = "true";

let width = 0;
let height = 0;
let stars = [];
let frame = null;
let running = false;

const maxStars = 125;

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const count = Math.min(
    maxStars,
    Math.floor((width * height) / 8500)
  );

  stars = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.35 + 0.3,
    speed: Math.random() * 0.2 + 0.035,
    alpha: Math.random() * 0.55 + 0.2,
    phase: Math.random() * Math.PI * 2
  }));
}

function draw(time) {
  if (!running) return;

  ctx.clearRect(0, 0, width, height);

  const lightMode = document.body.classList.contains("light");

  for (const star of stars) {
    const twinkle = 0.7 + Math.sin(
      time * 0.001 + star.phase
    ) * 0.3;

    const alpha = star.alpha * twinkle *
      (lightMode ? 0.55 : 1);

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);

    ctx.fillStyle = lightMode
      ? `rgba(43,116,183,${alpha})`
      : `rgba(170,218,255,${alpha})`;

    ctx.fill();

    if (!reducedMotion) {
      star.y -= star.speed;

      if (star.y < -3) {
        star.y = height + 3;
        star.x = Math.random() * width;
      }
    }
  }

  frame = requestAnimationFrame(draw);
}

function start() {
  if (running || document.hidden) return;
  running = true;
  frame = requestAnimationFrame(draw);
}

function stop() {
  running = false;

  if (frame !== null) {
    cancelAnimationFrame(frame);
    frame = null;
  }
}

resize();
start();

window.addEventListener("resize", resize, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stop();
  } else {
    start();
  }
});

}

/* =======================================================
2. SCROLL REVEAL
Add class="reveal" to elements you want animated.
======================================================= */

function initReveal() {
const elements = document.querySelectorAll(
".reveal:not([data-reveal-initialized])"
);

if (!elements.length) return;

elements.forEach(element => {
  element.dataset.revealInitialized = "true";
});

if (reducedMotion || !("IntersectionObserver" in window)) {
  elements.forEach(element => element.classList.add("visible"));
  return;
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12
});

elements.forEach(element => observer.observe(element));

}

/* =======================================================
3. SCROLL PROGRESS BAR
Looks for an element with id="progress".
======================================================= */

function initProgress() {
const progress = document.getElementById("progress");
if (!progress) return;

function update() {
  const documentHeight =
    document.documentElement.scrollHeight - window.innerHeight;

  const amount = documentHeight > 0
    ? (window.scrollY / documentHeight) * 100
    : 0;

  progress.style.width = Math.min(100, Math.max(0, amount)) + "%";
}

window.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update, { passive: true });

update();

}

/* =======================================================
4. BACK TO TOP BUTTON
Looks for a button with id="backTop".
======================================================= */

function initBackToTop() {
const button = document.getElementById("backTop");
if (!button) return;

function update() {
  button.classList.toggle("visible", window.scrollY > 450);
}

window.addEventListener("scroll", update, { passive: true });

button.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: reducedMotion ? "auto" : "smooth"
  });
});

update();

}

/* =======================================================
5. MOBILE NAVIGATION
Looks for #menuToggle and #navLinks.
======================================================= */

function initMobileMenu() {
const button = document.getElementById("menuToggle");
const menu = document.getElementById("navLinks");

if (!button || !menu) return;

button.addEventListener("click", () => {
  const open = menu.classList.toggle("open");

  button.setAttribute("aria-expanded", String(open));
  button.setAttribute(
    "aria-label",
    open ? "Close navigation menu" : "Open navigation menu"
  );

  button.textContent = open ? "✕" : "☰";
});

menu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    menu.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation menu");
    button.textContent = "☰";
  });
});

document.addEventListener("click", event => {
  if (
    !menu.contains(event.target) &&
    !button.contains(event.target)
  ) {
    menu.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
    button.textContent = "☰";
  }
});

}

/* =======================================================
6. FOOTER YEAR
Looks for <span id="year"></span>.
======================================================= */

function initFooterYear() {
const year = document.getElementById("year");

if (year) {
  year.textContent = new Date().getFullYear();
}

}

/* =======================================================
7. INITIALIZE ENGINE
======================================================= */

function initialize() {
initStarfield();
initReveal();
initProgress();
initBackToTop();
initMobileMenu();
initFooterYear();

document.documentElement.classList.add(
  "scottcode-engine-ready"
);

}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", initialize, {
once: true
});
} else {
initialize();
}
})();
