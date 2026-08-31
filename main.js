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
 * upper third of the column takes the dot while reading, and the hash follows
 * along so the address stays meaningful without piling up history entries.
 */
(() => {
  const links = [...document.querySelectorAll('.page-link')];
  const panels = [...document.querySelectorAll('.panel')];
  const work = document.querySelector('.work');
  if (!links.length || !panels.length) return;

  /* Above the tablet breakpoint the right column scrolls on its own; below it
     the whole document does. */
  const wide = window.matchMedia('(min-width: 800px)');
  const scroller = () => (wide.matches && work ? work : document.scrollingElement);

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

  const setCurrent = (id) => {
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

  /* --- reading position --------------------------------------------------
   * While the page scrolls under its own steam, an observer marks whichever
   * panel is crossing a thin band near the top of the column. Fully torn down
   * during a jump (below) rather than just gated by a flag: an observer's
   * first notification after observe() is queued asynchronously and, on a
   * busy page, can be delivered a couple of seconds late — long enough to
   * land after a jump has already finished and quietly revert it with the
   * stale, pre-jump position it was carrying. Disconnecting outright drops
   * that queued notification instead of merely ignoring it once it arrives;
   * reconnecting once the jump settles asks fresh, so what comes back always
   * reflects where the page actually is.
   */
  let jumping = false;
  let observer = null;

  const watch = () => {
    if (jumping) return; // the jump itself reconnects with fresh state once it settles

    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      const arrived = entries.filter((entry) => entry.isIntersecting).pop();
      if (arrived) setCurrent(arrived.target.id);
    }, {
      root: wide.matches && work ? work : null,
      rootMargin: '-25% 0px -70% 0px',
    });

    panels.forEach((panel) => observer.observe(panel));
  };

  watch();
  wide.addEventListener('change', watch);

  /* --- jumping ------------------------------------------------------------
   * A page-link click carries its own eased scroll rather than the browser's
   * native smooth scrolling, whose fixed, un-eased duration makes a distant
   * jump (Portfolio to Testimonials, say) feel mechanical instead of like one
   * deliberate move. The dot itself does not travel: it is set on the
   * destination the instant the jump starts and simply fades out at the old
   * label and in at the new one, its own CSS transition doing that work.
   */

  /* A small cubic-bezier evaluator rather than a polynomial stand-in, so the
     scroll rides the exact curve the dot and flag already transition on
     (0.22, 1, 0.36, 1) — quick off the mark, then a long, soft settle, the
     same shape throughout the page rather than three approximations of it. */
  const bezierY = (p1x, p1y, p2x, p2y) => {
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const xForT = (t) => ((ax * t + bx) * t + cx) * t;
    const yForT = (t) => ((ay * t + by) * t + cy) * t;
    const dxForT = (t) => (3 * ax * t + 2 * bx) * t + cx;

    return (x) => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const dx = xForT(t) - x;
        if (Math.abs(dx) < 1e-4) break;
        const d = dxForT(t);
        if (Math.abs(d) < 1e-6) break;
        t -= dx / d;
      }
      return yForT(t);
    };
  };
  const EASE = bezierY(0.22, 1, 0.36, 1);

  const MIN_DURATION = 320;
  const MAX_DURATION = 720;
  const PX_PER_MS = 3.4;
  const SETTLE_BUFFER = 120; // ms of slack the safety net gives a slow frame before it steps in

  let jumpFrame = null;
  let settleTimer = null;

  const endJump = (el, target) => {
    if (jumpFrame !== null) { cancelAnimationFrame(jumpFrame); jumpFrame = null; }
    if (settleTimer !== null) { clearTimeout(settleTimer); settleTimer = null; }
    el.scrollTo({ top: target, behavior: 'auto' });
    jumping = false;
    watch();
  };

  const jumpTo = (id) => {
    const panel = panels.find((candidate) => candidate.id === id);
    if (!panel) return;

    const el = scroller();
    const start = el.scrollTop;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);

    /* The panel's offset from the top of the scroller's own content, independent
       of how far it is currently scrolled. document.scrollingElement's own
       rect moves as the page scrolls (it is what's being scrolled), unlike a
       plain overflow div, whose box stays put while its content moves inside
       it — so only the .work branch subtracts the container's rect. */
    const containerTop = (wide.matches && work) ? work.getBoundingClientRect().top : 0;
    const offset = panel.getBoundingClientRect().top - containerTop + start;

    /* scroll-margin-top would give this breathing room for free under native
       anchor scrolling; driving scrollTop by hand means applying it ourselves. */
    const margin = parseFloat(getComputedStyle(panel).scrollMarginTop) || 0;

    const target = Math.min(max, Math.max(0, offset - margin));
    const distance = target - start;

    setCurrent(id);

    /* Cancel whatever the previous jump left running before starting a new
       one — otherwise its own rAF loop and safety net keep writing to the
       same element alongside this one. */
    if (jumpFrame !== null) cancelAnimationFrame(jumpFrame);
    if (settleTimer !== null) clearTimeout(settleTimer);

    if (!distance) { jumping = false; return; }

    jumping = true;
    if (observer) { observer.disconnect(); observer = null; }

    const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.abs(distance) / PX_PER_MS));
    const t0 = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - t0) / duration);
      /* scroll-behavior: smooth on this element applies to a bare .scrollTop
         assignment too, per spec, which would queue every one of these frames
         as its own little animation and fight this one. scrollTo({behavior:
         'auto'}) opts each frame out explicitly. */
      el.scrollTo({ top: start + distance * EASE(progress), behavior: 'auto' });

      if (progress < 1) {
        jumpFrame = requestAnimationFrame(step);
      } else {
        jumpFrame = null;
        if (settleTimer !== null) { clearTimeout(settleTimer); settleTimer = null; }
        jumping = false;
        watch();
      }
    };

    jumpFrame = requestAnimationFrame(step);

    /* Safety net: if rAF stalls for any reason — a throttled background tab,
       a device under heavy load — this lands the scroll on the exact target
       a little after the animation should have finished, rather than leaving
       it stranded partway with the dot already pointing at the destination. */
    settleTimer = window.setTimeout(() => endJump(el, target), duration + SETTLE_BUFFER);
  };

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      jumpTo(link.getAttribute('href').slice(1));
    });
  });
})();

/* ------------------------------------------------------- compare slider
 * One frame, two states, a handle wiping between them. The range input is
 * the control — it already handles pointer, touch and arrow keys — so all
 * this does is mirror its value onto the property the clip and the handle
 * both read from.
 */
(() => {
  for (const slider of document.querySelectorAll('.compare')) {
    const input = slider.querySelector('.compare__input');
    if (!input) continue;

    const apply = () => slider.style.setProperty('--pos', `${input.value}%`);
    input.addEventListener('input', apply);
    apply();
  }
})();

/* ------------------------------------------------------------- carousel
 * One slide in the frame at a time, chosen from the thumbnails. The stage
 * never moves, so the eye keeps its place between slides — which is the
 * point of cross-fading rather than scrolling.
 *
 * The thumbnails are a tablist: arrow keys move between them, as they
 * would in any other tabbed thing, and only the selected one is in the tab
 * order so the whole strip is not a series of stops.
 */
(() => {
  for (const carousel of document.querySelectorAll('.carousel')) {
    const slides = [...carousel.querySelectorAll('.carousel__slide')];
    const thumbs = [...carousel.querySelectorAll('.carousel__thumb')];
    if (slides.length < 2 || slides.length !== thumbs.length) continue;

    const select = (index, focus) => {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      thumbs.forEach((t, i) => {
        t.setAttribute('aria-selected', String(i === index));
        t.tabIndex = i === index ? 0 : -1;
      });
      if (focus) thumbs[index].focus();
    };

    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => select(i));
      thumb.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        select((i + step + thumbs.length) % thumbs.length, true);
      });
    });

    select(Math.max(0, slides.findIndex((s) => s.classList.contains('is-active'))));
  }
})();
