/* ------------------------------------------------------------------- lens
 * The belt's glass edge. Artwork that nears the top or bottom of the belt
 * fans outward from the belt's centreline and its red and blue channels drift
 * apart, the way a sheet of glass bends what sits at its rim. Scrolling
 * itself is untouched.
 *
 * Only the portfolio stages take it. Each is redrawn on one fixed WebGL canvas, positioned from the DOM
 * every frame; the real stage stays in the flow at opacity 0, so layout,
 * hover and the reel in main.js keep working and simply feed this their
 * current frame. The DOM stage is only hidden once its GL twin has actually
 * been painted — without WebGL, under reduced motion, or over file:// (where
 * images count as cross-origin and cannot be read into a texture) the page
 * stays exactly as it is without this file.
 */
(() => {
  /* Every way out of this file is silent by design — the page has to look
     finished without the effect. But silence is useless when it is meant to be
     running, so each exit says why, once. */
  const bail = (why) => { console.info('[lens] off: ' + why); };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches)
    return bail('the system asks for reduced motion');

  const belt = document.querySelector('.work');
  /* Portfolio only. The panels after it are plain type, and bending those
     would read as a glitch rather than as glass. */
  const stages = [...document.querySelectorAll('#portfolio .stage')];
  if (!belt || !stages.length) return bail('no portfolio stage on this page');

  const PARAMS = {
    fan: 0.42,       // how far the rim spreads, as a fraction of the distance from the centreline
    edgeZone: 0.22,  // depth of the rim, as a fraction of the viewport height
    edgePow: 1.8,    // how sharply the bend ramps up inside the rim
    chroma: 0.02     // red/blue drift at the very edge, in texture space
  };
  const ROWS = 48;   // the bend varies down a tile, so tiles are strips, not quads

  const VERT = `
    precision highp float;
    attribute vec2 uv;
    uniform vec2 uResolution;
    uniform vec4 uRect;          // left, top, width, height — css px
    uniform float uBandCentre;   // one shared centreline, so the belt bends as a single sheet
    uniform float uFan;
    uniform float uEdgeZone;
    uniform float uEdgePow;
    uniform float uTopGate;      // 0 when nothing lies past that end of the belt,
    uniform float uBottomGate;   // so its start and finish read flat
    varying vec2 vUv;
    varying vec2 vScreen;
    varying float vEdge;

    void main() {
      vUv = uv;
      vec2 screen = uRect.xy + uv * uRect.zw;
      vScreen = screen;
      float sy = screen.y / uResolution.y;
      float dist = min(sy, 1.0 - sy);
      float edge = pow(smoothstep(uEdgeZone, 0.0, dist), uEdgePow);
      edge *= mix(uTopGate, uBottomGate, step(0.5, sy));
      float blend = smoothstep(0.0, 0.35, edge);
      float x = uBandCentre + (screen.x - uBandCentre) * (1.0 + uFan * edge * blend);
      gl_Position = vec4(x / uResolution.x * 2.0 - 1.0,
                         1.0 - screen.y / uResolution.y * 2.0, 0.0, 1.0);
      vEdge = edge;
    }`;

  const FRAG = `
    precision highp float;
    uniform sampler2D tMap;
    uniform float uChroma;
    uniform float uUseTex;
    uniform vec4 uColor;
    uniform vec2 uUvScale;       // object-fit: cover crop
    uniform vec2 uUvOffset;
    uniform vec4 uClip;          // the stage box, css px — stands in for overflow: hidden
    varying vec2 vUv;
    varying vec2 vScreen;
    varying float vEdge;

    void main() {
      if (vScreen.x < uClip.x || vScreen.x > uClip.z ||
          vScreen.y < uClip.y || vScreen.y > uClip.w) discard;

      vec4 base = uColor;
      vec3 rgb = base.rgb;
      if (uUseTex > 0.5) {
        vec2 uv = uUvOffset + vUv * uUvScale;
        base = texture2D(tMap, uv);
        // The split widens toward the rim, so it reads as dispersion, not a flat offset.
        float fx = smoothstep(0.0, 0.5, vEdge);
        float ca = uChroma * fx * (0.4 + vEdge);
        float r = texture2D(tMap, uv + vec2(ca, 0.0)).r;
        float b = texture2D(tMap, uv - vec2(ca, 0.0)).b;
        rgb = mix(base.rgb, vec3(r, base.g, b), fx);
      }
      gl_FragColor = vec4(rgb * base.a, base.a);
    }`;

  /* ------------------------------------------------------------- context */
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  /* A canvas is a replaced element: inset alone would leave it at its buffer
     size, twice the viewport on a retina screen. Sits under the page flag. */
  canvas.style.cssText =
    'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:4;pointer-events:none';

  const attrs = { alpha: true, premultipliedAlpha: true, antialias: true };
  const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
  if (!gl) return bail('this browser gives no WebGL context');
  const mipmaps = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return bail('a shader would not compile');
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return bail('the shader program would not link');
  gl.useProgram(prog);

  const strip = [];
  for (let j = 0; j <= ROWS; j++) strip.push(0, j / ROWS, 1, j / ROWS);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(strip), gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uResolution', 'uRect', 'uBandCentre', 'uFan', 'uEdgeZone', 'uEdgePow', 'uTopGate',
   'uBottomGate', 'tMap', 'uChroma', 'uUseTex', 'uColor', 'uUvScale', 'uUvOffset', 'uClip']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  document.body.appendChild(canvas);

  /* ------------------------------------------------------------ textures */
  const textures = new WeakMap();
  let dead = false;

  const upload = (el) => {
    const isVideo = el.tagName === 'VIDEO';
    const key = isVideo ? el.currentTime : el.currentSrc;
    let entry = textures.get(el);
    if (entry && entry.key === key) return entry.tex;
    if (!entry) { entry = { tex: gl.createTexture(), key: null }; textures.set(el, entry); }

    gl.bindTexture(gl.TEXTURE_2D, entry.tex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    } catch (e) {
      // Over file:// every image counts as cross-origin and cannot be read into
      // a texture. Bow out; the untouched DOM stage stays on screen.
      dead = true;
      bail(location.protocol === 'file:'
        ? 'opened as a file, not from a server — the browser will not let WebGL read the artwork'
        : 'the artwork could not be read into WebGL (' + e.name + ')');
      return null;
    }
    const useMips = mipmaps && !isVideo;
    if (useMips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, useMips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    entry.key = key;
    return entry.tex;
  };

  const rgba = (str) => {
    const m = str.match(/[\d.]+/g);
    return m ? [m[0] / 255, m[1] / 255, m[2] / 255, m[3] === undefined ? 1 : +m[3]] : [0, 0, 0, 0];
  };

  /* --------------------------------------------------------------- tiles */
  const tile = (rect, tex, color, cover) => {
    gl.uniform4f(U.uRect, rect.left, rect.top, rect.width, rect.height);
    gl.uniform1f(U.uUseTex, tex ? 1 : 0);
    if (tex) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform2f(U.uUvScale, cover[0], cover[1]);
      gl.uniform2f(U.uUvOffset, cover[2], cover[3]);
    } else {
      gl.uniform4f(U.uColor, color[0] * color[3], color[1] * color[3], color[2] * color[3], color[3]);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, (ROWS + 1) * 2);
  };

  // object-fit: cover, as uv scale + offset
  const coverOf = (el, rect) => {
    const nw = el.naturalWidth || el.videoWidth, nh = el.naturalHeight || el.videoHeight;
    const boxAspect = rect.width / rect.height, srcAspect = nw / nh;
    if (srcAspect > boxAspect) { const s = boxAspect / srcAspect; return [s, 1, (1 - s) / 2, 0]; }
    const s = srcAspect / boxAspect;
    return [1, s, 0, (1 - s) / 2];
  };

  const ready = (el) => el.tagName === 'VIDEO'
    ? el.readyState >= 2 && el.videoWidth > 0
    : el.complete && el.naturalWidth > 0;

  /* --------------------------------------------------------------- frame */
  let lastSignature = '';

  const frame = () => {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const beltBox = belt.getBoundingClientRect();

    // Flat at the very start and end of the belt, like the reference.
    const own = belt.scrollHeight > belt.clientHeight + 4;
    const top = own ? belt.scrollTop : window.scrollY;
    const rest = own
      ? belt.scrollHeight - belt.clientHeight - belt.scrollTop
      : document.documentElement.scrollHeight - h - window.scrollY;
    const topGate = Math.min(1, Math.max(0, top / 160));
    const bottomGate = Math.min(1, Math.max(0, rest / 160));

    // Gather what would be drawn, and skip the GL work when nothing has moved.
    const jobs = [];
    let signature = [w, h, dpr, topGate.toFixed(3), bottomGate.toFixed(3),
                     PARAMS.fan, PARAMS.edgeZone, PARAMS.edgePow, PARAMS.chroma].join();
    stages.forEach((stage) => {
      const box = stage.getBoundingClientRect();
      if (box.bottom < 0 || box.top > h || !box.width) { jobs.push(null); return; }
      const parts = [...stage.querySelectorAll('.frame.is-active > *')];
      const ok = parts.length > 0 && parts.every((el) => el.tagName === 'SPAN' || ready(el));
      jobs.push(ok ? { stage, box, parts } : { stage, skip: true });
      signature += '|' + [box.left, box.top, box.width, box.height].map(Math.round).join() +
        parts.map((el) => el.currentSrc || el.className).join() +
        parts.map((el) => (el.tagName === 'VIDEO' ? el.currentTime : '')).join();
    });
    if (signature === lastSignature) return;
    lastSignature = signature;

    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uResolution, w, h);
    gl.uniform1f(U.uBandCentre, beltBox.left + beltBox.width / 2);
    gl.uniform1f(U.uFan, PARAMS.fan);
    gl.uniform1f(U.uEdgeZone, PARAMS.edgeZone);
    gl.uniform1f(U.uEdgePow, PARAMS.edgePow);
    gl.uniform1f(U.uChroma, PARAMS.chroma);
    gl.uniform1f(U.uTopGate, topGate);
    gl.uniform1f(U.uBottomGate, bottomGate);
    gl.uniform1i(U.tMap, 0);
    gl.activeTexture(gl.TEXTURE0);

    // The flare may spread past a stage but never out of the belt.
    gl.enable(gl.SCISSOR_TEST);
    const sTop = Math.max(0, beltBox.top), sBottom = Math.min(h, beltBox.bottom);
    gl.scissor(Math.round(beltBox.left * dpr), Math.round((h - sBottom) * dpr),
               Math.round(beltBox.width * dpr), Math.max(0, Math.round((sBottom - sTop) * dpr)));

    jobs.forEach((job) => {
      if (!job) return;
      if (job.skip) { job.stage.removeAttribute('data-lens'); return; }
      const { stage, box, parts } = job;

      // The stage ground is unclipped; its artwork is clipped to the stage box.
      gl.uniform4f(U.uClip, -1e6, -1e6, 1e6, 1e6);
      tile(box, null, rgba(getComputedStyle(stage).backgroundColor));

      gl.uniform4f(U.uClip, box.left, box.top, box.right, box.bottom);
      let painted = true;
      parts.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (el.tagName === 'SPAN') { tile(r, null, rgba(getComputedStyle(el).backgroundColor)); return; }
        const tex = upload(el);
        if (!tex) { painted = false; return; }
        tile(r, tex, null, coverOf(el, r));
      });

      // Only now may the DOM stage step aside.
      if (painted && !dead) stage.setAttribute('data-lens', '');
      else stage.removeAttribute('data-lens');
    });
    gl.disable(gl.SCISSOR_TEST);
  };

  /* ---------------------------------------------------------------- loop */
  let rafId = null;
  const shutdown = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    stages.forEach((s) => s.removeAttribute('data-lens'));
    canvas.remove();
  };
  const loop = () => {
    try { frame(); } catch (e) { dead = true; bail('a frame failed — ' + e.message); }
    if (dead) { shutdown(); return; }
    rafId = requestAnimationFrame(loop);
  };
  canvas.addEventListener('webglcontextlost', () => {
    dead = true; bail('the browser dropped the WebGL context'); shutdown();
  });
  rafId = requestAnimationFrame(loop);

  // Tuning handle: Lens.params.fan = 0.6 applies on the next frame.
  window.Lens = { params: PARAMS, frame: () => { lastSignature = ''; frame(); }, canvas };
})();
