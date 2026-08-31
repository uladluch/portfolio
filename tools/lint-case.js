#!/usr/bin/env node
'use strict';

/*
 * Case study checks for luch.dev.
 *
 * The generator (tools/build.js) validates what it needs to render a page.
 * This checks what makes a case study *good* — the contract in the case-study
 * skill — and prints the graphics checklist at the end.
 *
 *   node tools/lint-case.js [slug ...]
 *
 * Every check here exists because it was got wrong by hand at least once:
 *
 *   - Body length. Counting words with `wc` counts raw HTML blocks and the
 *     briefs inside image placeholders as prose, which once reported 829
 *     words for a 650-word case. This counts what a reader actually reads,
 *     by walking the same markdown tokens the generator renders.
 *   - summary ≤ 160 (hard: meta description, home card, llms.txt all quote it)
 *     and tldr ≤ 260 (soft: the aside is a narrow column; past that it stops
 *     summarising and starts retelling the case).
 *   - Placeholders: duplicate ids, and which are still unresolved. The
 *     checklist at the end of a session is this list, not a hand-assembled one.
 *   - Leftovers: TODO markers still sitting in frontmatter, empty links,
 *     metrics with no label.
 *
 * Exits non-zero if any error is found; warnings alone exit zero.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'portfolio');
const ASSETS_DIR = path.join(ROOT, 'assets', 'projects');

const WORDS_MIN = 500;
const WORDS_MAX = 800;
const SUMMARY_MAX = 160;
const TLDR_MAX = 260;

// ---------------------------------------------------------------- report --

const RED = '\x1b[31m', YELLOW = '\x1b[33m', DIM = '\x1b[2m', OFF = '\x1b[0m';

class Report {
  constructor(name) { this.name = name; this.errors = []; this.warns = []; this.notes = []; }
  error(m) { this.errors.push(m); }
  warn(m) { this.warns.push(m); }
  note(m) { this.notes.push(m); }
  print() {
    console.log(`\n${this.name}`);
    for (const m of this.errors) console.log(`  ${RED}✗${OFF} ${m}`);
    for (const m of this.warns) console.log(`  ${YELLOW}~${OFF} ${m}`);
    for (const m of this.notes) console.log(`  ${DIM}·${OFF} ${m}`);
    if (!this.errors.length && !this.warns.length && !this.notes.length) {
      console.log(`  ${DIM}· nothing to flag${OFF}`);
    }
  }
}

// ------------------------------------------------------------- counting --

/* Words a reader reads. Headings, paragraphs, list items, quotes and table
   cells count; raw HTML blocks and image briefs do not — the brief is an
   instruction to whoever exports the graphic, never page copy. */
function proseWords(tokens) {
  let words = 0;

  const fromText = (s) => {
    const clean = String(s || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')   // images, brief and all
      .replace(/<[^>]+>/g, ' ')               // inline html
      .trim();
    return clean ? clean.split(/\s+/).length : 0;
  };

  const walk = (list) => {
    for (const t of list || []) {
      switch (t.type) {
        case 'heading':
        case 'paragraph':
          words += fromText(t.text);
          break;
        case 'list':
          for (const item of t.items) words += fromText(item.text);
          break;
        case 'blockquote':
          walk(t.tokens);
          break;
        case 'table':
          for (const c of t.header) words += fromText(c.text);
          for (const row of t.rows) for (const c of row) words += fromText(c.text);
          break;
        default:
          break; // html, code, space, hr — not prose
      }
    }
  };

  walk(tokens);
  return words;
}

/* Every placeholder in the body, in order.
 *
 * Two spellings, because the block library has two: markdown images, and the
 * raw HTML that blocks like Compare are written in. Scanning only the markdown
 * one silently shortens the graphics checklist — which is how a Compare
 * block's two figures went missing from it the first time this ran. */
function placeholders(body) {
  const out = [];

  const md = /!\[([^\]]*)\]\(placeholder:([^)\s"]+)(?:\s+"([^"]*)")?\)/g;
  let m;
  while ((m = md.exec(body)) !== null) {
    out.push({ at: m.index, brief: m[1], id: m[2], ratio: m[3] || '3:2' });
  }

  /* In HTML the three parts sit in separate tags, so each id takes the brief
     and ratio nearest above it rather than matching one rigid tag order. */
  const html = /<span class="figure__id">placeholder:([^<]+)<\/span>/g;
  while ((m = html.exec(body)) !== null) {
    const before = body.slice(0, m.index);
    const brief = [...before.matchAll(/<p class="figure__brief">([\s\S]*?)<\/p>/g)].pop();
    const ratio = [...before.matchAll(/--ar:\s*([^;"]+)/g)].pop();
    out.push({
      at: m.index,
      brief: brief ? brief[1].replace(/\s+/g, ' ').trim() : '',
      id: m[1].trim(),
      ratio: ratio ? ratio[1].trim().replace(/\s*\/\s*/, ':') : '3:2',
    });
  }

  return out.sort((a, b) => a.at - b.at);
}

/* Real images the body references from assets/projects/<slug>/ — markdown and
   raw HTML alike, for the same reason. */
function usedAssets(body) {
  const out = [];
  const md = /!\[([^\]]*)\]\((?!placeholder:)([^)\s"]+)(?:\s+"([^"]*)")?\)/g;
  let m;
  while ((m = md.exec(body)) !== null) out.push(m[2]);

  const html = /<img\b[^>]*\bsrc="([^"]+)"/g;
  while ((m = html.exec(body)) !== null) out.push(m[1]);

  return out;
}

// ----------------------------------------------------------------- checks --

function lint(file) {
  const slug = path.basename(file, '.md');
  const report = new Report(`content/portfolio/${slug}.md`);
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');

  const split = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!split) { report.error('no frontmatter'); return report; }

  let fm;
  try { fm = yaml.load(split[1]) || {}; }
  catch (e) { report.error(`bad YAML — ${e.message}`); return report; }
  const body = split[2];

  /* An archived case is not being worked on: holding it to the completeness
     rules would report work nobody intends to do. */
  if (fm.status === 'archived') {
    report.note('archived — not published, not checked');
    report.status = 'archived';
    report.slug = slug;
    report.pending = [];
    return report;
  }

  // --- frontmatter ---------------------------------------------------------

  for (const k of ['title', 'slug', 'headline', 'company', 'role', 'period', 'summary']) {
    if (!fm[k]) report.error(`${k} is empty`);
  }
  if (fm.slug && fm.slug !== slug) report.error(`slug "${fm.slug}" does not match the filename`);

  if (fm.summary && fm.summary.length > SUMMARY_MAX) {
    report.error(`summary is ${fm.summary.length} chars (max ${SUMMARY_MAX} — the build refuses to publish it)`);
  }
  if (fm.tldr && fm.tldr.length > TLDR_MAX) {
    report.warn(`tldr is ${fm.tldr.length} chars (aim under ${TLDR_MAX}: the aside is a narrow column, and past this it stops summarising and starts retelling)`);
  }
  if (!fm.tldr) report.note('no tldr — the page\'s TL;DR block falls back to summary');

  /* A TODO left in frontmatter is an unanswered interview question that will
     otherwise ship as page copy. */
  for (const [k, v] of Object.entries(fm)) {
    if (typeof v === 'string' && /\bTODO\b/i.test(v)) report.error(`${k} still carries a TODO`);
  }

  for (const l of fm.links || []) {
    if (!l.label || !l.url) report.error('a link has an empty label or url');
  }
  for (const m of fm.metrics || []) {
    if (!m.label) report.warn('a metric has no label');
  }
  if (fm['role-type'] && !['end-to-end', 'led', 'contributed'].includes(fm['role-type'])) {
    report.warn(`role-type "${fm['role-type']}" is not one of end-to-end | led | contributed`);
  }

  /* `role` is the job title held, not a sentence about what was achieved.
     A title does not start with a verb, and it does not enumerate duties —
     both read as invented, which costs more credibility than the claim buys.
     Ownership belongs in role-type; the work belongs in the body. */
  if (fm.role) {
    if (/^(led|designed|owned|built|drove|ran|managed|scaled|delivered|headed)\b/i.test(fm.role)) {
      report.error(`role "${fm.role}" describes the work; it should be the job title held`);
    } else if (/\s[—–-]\s/.test(fm.role) || fm.role.split(/,/).length > 2) {
      report.warn(`role "${fm.role}" enumerates duties; a title is enough`);
    }
  }

  // --- body ----------------------------------------------------------------

  const words = proseWords(marked.lexer(body));
  if (!words) report.error('body is empty');
  else if (words < WORDS_MIN) report.warn(`body is ${words} words (aim ${WORDS_MIN}–${WORDS_MAX})`);
  else if (words > WORDS_MAX) report.warn(`body is ${words} words (aim ${WORDS_MIN}–${WORDS_MAX})`);
  else report.note(`body is ${words} words`);

  /* A design case study with prose-only sections reads as thin. A section
     that is itself a quote or a code block is already something to look at;
     everything else needs a figure. */
  {
    const parts = body.split(/^##\s+/m).slice(1);
    for (const part of parts) {
      const title = part.split('\n')[0].trim();
      const rest = part.slice(title.length);
      const hasFigure = /!\[[^\]]*\]\(/.test(rest) || /<figure/.test(rest);
      const isQuote = /^\s*>/m.test(rest);
      const isCode = /^```/m.test(rest);
      if (!hasFigure && !isQuote && !isCode) {
        report.warn(`section "${title}" has no figure — every section carries one except a quote or a code block`);
      }
    }
  }

  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  const emptySections = headings.filter((h, i) => {
    const start = body.indexOf(`## ${h}`);
    const next = i + 1 < headings.length ? body.indexOf(`## ${headings[i + 1]}`) : body.length;
    return !body.slice(start + h.length + 3, next).trim();
  });
  for (const h of emptySections) report.error(`section "${h}" has no content`);

  // --- graphics ------------------------------------------------------------

  /* Compare panels are half the column wide; a multi-screen composition
     shrinks to illegible screens inside one. Every panel takes one screen. */
  const specPath = path.join(CONTENT_DIR, `${slug}.compositions.yaml`);
  let spec = {};
  if (fs.existsSync(specPath)) {
    try { spec = yaml.load(fs.readFileSync(specPath, 'utf8')) || {}; }
    catch (e) { report.error(`compositions.yaml — ${e.message}`); }
  }
  /* The compare div nests figure divs inside it, so match up to its own
     closing tag — the one that starts a line — rather than the first </div>. */
  for (const block of body.match(/<div class="compare">[\s\S]*?\n<\/div>/g) || []) {
    const ids = [
      ...[...block.matchAll(/placeholder:([^<"\s]+)/g)].map((m) => m[1]),
      ...[...block.matchAll(/\/([^/"]+)\.webp/g)].map((m) => m[1]),
    ];
    for (const id of ids) {
      const n = (spec[id]?.screens || []).length;
      if (n > 1) {
        report.error(`compare panel "${id}" uses a ${n}-screen composition; a panel is half the column, so it takes one screen`);
      }
    }
  }

  const marks = placeholders(body);
  const seen = new Set();
  for (const p of marks) {
    if (seen.has(p.id)) report.error(`placeholder id "${p.id}" is used more than once`);
    seen.add(p.id);
    if (!p.brief.trim()) report.error(`placeholder "${p.id}" has no brief — nothing to export from`);
  }

  const dir = path.join(ASSETS_DIR, slug);
  const have = fs.existsSync(dir) ? fs.readdirSync(dir) : [];

  /* A png sitting in the assets folder under a placeholder's id is the export
     round-trip's handoff: it is waiting to be converted and swapped in. */
  const ready = marks.filter((p) => have.includes(`${p.id}.png`));
  for (const p of ready) report.warn(`${p.id}.png has landed — convert to webp and swap the placeholder`);

  for (const ref of usedAssets(body)) {
    if (/^(https?:)?\//.test(ref)) continue;
    /* A raw-HTML figure (the Compare block) writes its own path, since the
       build only rewrites markdown image srcs — so it arrives here as
       ../../assets/projects/<slug>/<file> rather than a bare filename. */
    const m = /^\.\.\/\.\.\/assets\/projects\/([^/]+)\/(.+)$/.exec(ref);
    if (m) {
      if (m[1] !== slug) report.error(`body pulls an image from another case: ${ref}`);
      else if (!have.includes(m[2])) report.error(`body references ${m[2]}, which is not in assets/projects/${slug}/`);
      continue;
    }
    if (!have.includes(ref)) {
      report.error(`body references ${ref}, which is not in assets/projects/${slug}/`);
    }
  }
  if (fm.cover && !have.includes(fm.cover)) {
    report.error(`cover "${fm.cover}" is not in assets/projects/${slug}/`);
  }

  report.pending = marks.filter((p) => !have.includes(`${p.id}.png`));
  report.slug = slug;
  report.status = fm.status;
  return report;
}

// ------------------------------------------------------------------ main --

function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = fs.readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .filter((f) => !wanted.length || wanted.includes(path.basename(f, '.md')));

  if (!files.length) {
    console.error(`no case files matched${wanted.length ? ` (${wanted.join(', ')})` : ''}`);
    process.exit(1);
  }

  const reports = files.map(lint);
  for (const r of reports) r.print();

  const pending = reports.filter((r) => r.pending && r.pending.length);
  if (pending.length) {
    console.log('\n\nGraphics to prepare');
    console.log(`${DIM}export each as PNG 2x, name it <id>.png, drop it in assets/projects/<slug>/${OFF}`);
    for (const r of pending) {
      console.log(`\n  ${r.slug}`);
      for (const p of r.pending) {
        console.log(`    ${p.id}  ${DIM}${p.ratio}${OFF}`);
        console.log(`      ${DIM}${p.brief}${OFF}`);
      }
    }
  }

  const errors = reports.reduce((n, r) => n + r.errors.length, 0);
  const warns = reports.reduce((n, r) => n + r.warns.length, 0);
  const drafts = reports.filter((r) => r.status !== 'ready' && r.status !== 'archived').length;
  const archived = reports.filter((r) => r.status === 'archived').length;

  console.log(`\n\n${errors} error(s), ${warns} warning(s) across ${reports.length} case(s)` +
    `${drafts ? `, ${drafts} still draft` : ''}` +
    `${archived ? `, ${archived} archived` : ''}\n`);

  process.exit(errors ? 1 : 0);
}

main();
