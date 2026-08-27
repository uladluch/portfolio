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

/* -------------------------------------------------------------- page marks
 * The panels run end to end in a single scroll, so there is nothing to switch
 * — the sidebar just reports where you are. Whichever section is crossing the
 * upper third of the column takes the dot, and the hash follows along so the
 * address stays meaningful without piling up history entries.
 */
(() => {
  const links = [...document.querySelectorAll('.page-link')];
  const panels = [...document.querySelectorAll('.panel')];
  const work = document.querySelector('.work');
  if (!links.length || !panels.length) return;

  /* Above the tablet breakpoint the right column scrolls on its own; below it
     the whole document does, and the observer has to watch the viewport. */
  const wide = window.matchMedia('(min-width: 800px)');

  const flag = document.querySelector('.page-flag');
  const flagLabel = flag && flag.querySelector('.page-flag__label');
  const FLAG_DWELL = 1600; // ms the name stays up once a page has arrived

  let flagTimer = null;

  /* The name shows itself as a page arrives and then withdraws. It is skipped
     on the very first mark, which only reports where the page opened. */
  const announce = (name) => {
    if (!flag || !flagLabel) return;

    flagLabel.textContent = name;
    flag.classList.add('is-visible');

    window.clearTimeout(flagTimer);
    flagTimer = window.setTimeout(() => {
      flag.classList.remove('is-visible');
    }, FLAG_DWELL);
  };

  /* --- current page ----------------------------------------------------- */

  let current = null;

  const mark = (id) => {
    if (id === current) return;
    const first = current === null;
    current = id;

    let name = id;

    links.forEach((link) => {
      if (link.getAttribute('href') === `#${id}`) {
        link.setAttribute('aria-current', 'page');
        name = link.textContent.trim();
      } else {
        link.removeAttribute('aria-current');
      }
    });

    history.replaceState(null, '', `#${id}`);
    if (!first) announce(name);
  };

  let observer = null;

  const watch = () => {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      /* A thin band near the top of the column decides the winner, so the dot
         turns over as a section arrives rather than when it is fully in view. */
      const arrived = entries.filter((entry) => entry.isIntersecting).pop();
      if (arrived) mark(arrived.target.id);
    }, {
      root: wide.matches && work ? work : null,
      rootMargin: '-25% 0px -70% 0px',
    });

    panels.forEach((panel) => observer.observe(panel));
  };

  watch();
  wide.addEventListener('change', watch);
})();
