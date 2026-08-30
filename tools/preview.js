#!/usr/bin/env node
'use strict';

/*
 * Draft preview server for luch.dev.
 *
 * Builds every case — drafts included — into a throwaway directory and serves
 * the site from it, falling back to the repo for everything the build does not
 * generate (index.html, main.css, main.js, assets/).
 *
 * Two things it does that a plain static server does not:
 *
 *   - Drafts render. A case with `status: draft` is built as if it were ready,
 *     so it can be read as a real page long before it is published. Nothing is
 *     written into the repo: the build's own --out is the temp directory, and
 *     the status rewrite happens on a copy.
 *   - Nothing is cached. Every response carries `Cache-Control: no-store`.
 *     A browser holding on to a stale main.css once made a measurement of a
 *     just-changed layout report the *old* values — an error that reads as
 *     "verified" and is invisible in a screenshot.
 *
 * Sources are rebuilt when they change, so editing a case's markdown and
 * refreshing the browser is enough — no restart, no stale page.
 *
 *   node tools/preview.js [slug ...] [--port 4330]
 *
 * With no slug the whole site is served; with one or more, only those cases
 * are built (the rest of the site still serves from the repo).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'portfolio');
const BUILD = path.join(__dirname, 'build.js');

// ------------------------------------------------------------------ cli --

const argv = process.argv.slice(2);
const portIndex = argv.indexOf('--port');
const PORT = portIndex !== -1 && argv[portIndex + 1] ? Number(argv[portIndex + 1]) : 4330;
const slugs = argv.filter((a, i) => !a.startsWith('--') && i !== portIndex + 1);

// -------------------------------------------------------------- staging --

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'luch-preview-'));
const STAGE = path.join(WORK, 'content');
const SITE = path.join(WORK, 'site');
fs.mkdirSync(STAGE, { recursive: true });
fs.mkdirSync(SITE, { recursive: true });

const cleanup = () => fs.rmSync(WORK, { recursive: true, force: true });
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { cleanup(); process.exit(0); });
}

/* Which sources a rebuild depends on. Watched by mtime so an edit lands on the
   next page request rather than on a restart; build.js is in the set because
   changing the generator changes every page it makes. */
function sourceFiles() {
  const cases = fs.readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .filter((f) => !slugs.length || slugs.includes(path.basename(f, '.md')))
    .map((f) => path.join(CONTENT_DIR, f));
  return [...cases, BUILD];
}

const stamp = (files) => files
  .map((f) => `${f}:${fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0}`)
  .join('|');

/* A draft is a case that is finished enough to look at and not finished enough
   to publish — exactly what a preview is for. The rewrite touches only the
   status line inside the frontmatter block, never the body. */
function stage(files) {
  fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });

  for (const src of files) {
    if (src === BUILD) continue;
    const raw = fs.readFileSync(src, 'utf8');
    const text = raw.replace(
      /^(---\n[\s\S]*?)^status:[ \t]*\S+/m,
      (all, head) => `${head}status: ready`
    );
    fs.writeFileSync(path.join(STAGE, path.basename(src)), text);
  }

  /* Seeded so the generated llms.txt looks like the real one rather than a
     file containing nothing but the cases block. */
  const llms = path.join(ROOT, 'llms.txt');
  if (fs.existsSync(llms)) fs.copyFileSync(llms, path.join(SITE, 'llms.txt'));
}

let built = null;

function rebuild() {
  const files = sourceFiles();
  const now = stamp(files);
  if (now === built) return;

  stage(files);
  try {
    const out = execFileSync(
      process.execPath,
      [BUILD, '--content', STAGE, '--out', SITE],
      { cwd: ROOT, encoding: 'utf8' }
    );
    process.stdout.write(out);
  } catch (err) {
    // A failed build leaves the last good pages in place; the error is the
    // useful output, so print it and keep serving.
    process.stdout.write(err.stdout || '');
    process.stderr.write(err.stderr || String(err));
  }
  built = now;
}

// --------------------------------------------------------------- server --

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
};

/* Resolve inside a base directory, or null if the path climbs out of it. */
function within(base, rel) {
  const full = path.join(base, rel);
  const normal = path.normalize(full);
  return normal.startsWith(base) ? normal : null;
}

function resolve(urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  rel = rel.replace(/^\/+/, '');

  // The build's output wins; anything it does not make comes from the repo.
  for (const base of [SITE, ROOT]) {
    const file = within(base, rel);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

const server = http.createServer((req, res) => {
  // Only a page request can be stale in a way a rebuild fixes; assets are
  // served straight from the repo and are already current.
  if (!path.extname(req.url.split('?')[0]) || req.url.endsWith('.html')) rebuild();

  const file = resolve(req.url);
  if (!file) {
    res.writeHead(404, { 'Content-Type': TYPES['.txt'], 'Cache-Control': 'no-store' });
    res.end(`404 — nothing at ${req.url}\n`);
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});

rebuild();

server.listen(PORT, () => {
  const cases = fs.existsSync(path.join(SITE, 'portfolio'))
    ? fs.readdirSync(path.join(SITE, 'portfolio'))
    : [];
  console.log(`\npreview  http://localhost:${PORT}/`);
  for (const slug of cases) console.log(`   case  http://localhost:${PORT}/portfolio/${slug}/`);
  console.log('\ndrafts included · no caching · sources rebuilt on change · ^C to stop\n');
});
