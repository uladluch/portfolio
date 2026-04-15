'use strict';

// --- Logo spin on hover ---
const logoLink = document.querySelector('.hero__icon-link');
const logo = logoLink.querySelector('.hero__icon');

let angle = 0;
let rafId = null;
let lastTime = null;
const SPEED = 36; // degrees per second

function spin(timestamp) {
  if (lastTime !== null) {
    const delta = (timestamp - lastTime) / 1000;
    angle = (angle + SPEED * delta) % 360;
    logo.style.transform = `rotate(${angle}deg)`;
  }
  lastTime = timestamp;
  rafId = requestAnimationFrame(spin);
}

logoLink.addEventListener('mouseenter', () => {
  if (rafId) return;
  lastTime = null;
  rafId = requestAnimationFrame(spin);
});

logoLink.addEventListener('mouseleave', () => {
  cancelAnimationFrame(rafId);
  rafId = null;
  lastTime = null;
});
