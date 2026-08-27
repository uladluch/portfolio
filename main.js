'use strict';

const canHover = window.matchMedia('(hover: hover)');

/* --------------------------------------------------------------- the mark
 * Spins only while the pointer is over it, and keeps whatever angle it
 * reached when the pointer leaves.
 */
(() => {
  const mark = document.querySelector('.mark');
  if (!mark) return;

  const art = mark.querySelector('img');
  const DEGREES_PER_SECOND = 31.2;

  let angle = 0;
  let lastTime = null;
  let frameId = null;

  const step = (time) => {
    if (lastTime !== null) {
      angle = (angle + DEGREES_PER_SECOND * (time - lastTime) / 1000) % 360;
      art.style.transform = `rotate(${angle}deg)`;
    }
    lastTime = time;
    frameId = requestAnimationFrame(step);
  };

  const start = () => {
    if (frameId !== null) return;
    lastTime = null;
    frameId = requestAnimationFrame(step);
  };

  const stop = () => {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
    frameId = null;
  };

  mark.addEventListener('mouseenter', start);
  mark.addEventListener('mouseleave', stop);
})();

/* ------------------------------------------------------------ project reel
 * Each project holds a stack of frames. Hovering the stage walks through
 * them on the per-frame delay recorded in `data-hold`, then loops. Leaving
 * the stage snaps back to the cover.
 */
(() => {
  const projects = document.querySelectorAll('.project');
  if (!projects.length) return;

  projects.forEach((project) => {
    const stage = project.querySelector('.stage');
    const frames = [...project.querySelectorAll('.frame')];
    if (!stage || frames.length < 2) return;

    let index = 0;
    let timerId = null;

    const show = (next) => {
      const previous = frames[index];
      previous.classList.remove('is-active');

      const previousVideo = previous.querySelector('video');
      if (previousVideo) previousVideo.pause();

      index = next;
      const current = frames[index];
      current.classList.add('is-active');

      const video = current.querySelector('video');
      if (video) {
        video.currentTime = 0;
        const played = video.play();
        if (played) played.catch(() => {});
      }
    };

    const queue = () => {
      const hold = Number(frames[index].dataset.hold) || 800;
      timerId = window.setTimeout(() => {
        show((index + 1) % frames.length);
        queue();
      }, hold);
    };

    const start = () => {
      if (timerId !== null) return;
      show(1);
      queue();
    };

    const stop = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (index !== 0) show(0);
    };

    if (canHover.matches) {
      stage.addEventListener('mouseenter', start);
      stage.addEventListener('mouseleave', stop);
    }
  });
})();
