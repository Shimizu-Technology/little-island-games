// Static checks for the island picture dictionary. Pure and dependency-free so the
// normal test run can use it; render-check.mjs adds the host rendering checks.
//   node scripts/art/pictures/check.mjs
// With LITTLE_ISLAND_PICTURE_W1_QUEUES=<W1 queues directory>, it also checks every word against
// the W1 queues and policy directly.
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INK, PALETTE, VIEWBOX } from './style.mjs';
import { OUT, ROOT, staleOutputs } from './build.mjs';
import { checkWords, readW1Queues } from './allowlist.mjs';
import { IDENTITY, boundsOf, multiply, parseDashes, parseNumber, parseTransform, principalScales, shapePoints, unionBounds } from './geometry.mjs';

export const LIMITS = { fileBytes: 4096, totalBytes: 1024 * 1024, minPictures: 400 };
const ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'polygon']);
const GEOMETRY = { path: ['d'], circle: ['cx', 'cy', 'r'], ellipse: ['cx', 'cy', 'rx', 'ry'], rect: ['x', 'y', 'width', 'height', 'rx'], polygon: ['points'], g: [], svg: ['xmlns', 'viewBox'] };
const PAINT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'transform'];

/** A strict parser for the small SVG subset the kit writes: elements, attributes, nothing else. */
export function parseSvg(text) {
  const root = { name: '#root', attrs: {}, children: [] }, stack = [root];
  let i = 0;
  const fail = message => { throw new Error(`${message} at ${i}`); };
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text[i] !== '<') fail('Text content is not allowed');
    if (text.startsWith('</', i)) {
      const end = text.indexOf('>', i), name = text.slice(i + 2, end);
      if (stack.at(-1).name !== name) fail(`Mismatched </${name}>`);
      stack.pop(); i = end + 1; continue;
    }
    if (text.startsWith('<!--', i) || text.startsWith('<?', i) || text.startsWith('<!', i)) fail('Comments, declarations and doctypes are not allowed');
    const m = /^<([a-zA-Z]+)((?:\s+[a-zA-Z:-]+="[^"<>]*")*)\s*(\/?)>/.exec(text.slice(i));
    if (!m) fail('Malformed tag');
    const attrs = {};
    for (const [, k, v] of m[2].matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) { if (k in attrs) fail(`Duplicate ${k}`); attrs[k] = v; }
    const node = { name: m[1], attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!m[3]) stack.push(node);
    i += m[0].length;
  }
  if (stack.length !== 1) throw new Error('Unclosed element');
  if (root.children.length !== 1 || root.children[0].name !== 'svg') throw new Error('Expected one <svg> root');
  return root.children[0];
}

const geometryKey = n => `${n.name}|${(GEOMETRY[n.name] ?? []).map(k => n.attrs[k]).join('|')}|${n.attrs.transform ?? ''}`;
/** Drawing beyond this, in frame units, is a spill; strokes and antialiasing may touch the edge. */
export const FRAME = { min: -1, max: 121 };

/** Every style-guide rule a machine can check, for one file. Returns a list of problems. */
export function checkPicture(text) {
  return inspectPicture(text).problems;
}

/**
 * The checks plus the unclipped drawing bounds after every transform and stroke.
 * @returns {{ problems: string[], bounds: { x0: number, y0: number, x1: number, y1: number } | null }}
 */
export function inspectPicture(text) {
  const problems = [];
  let svg;
  /** @type {{ x0: number, y0: number, x1: number, y1: number } | null} */
  let bounds = null;
  try { svg = parseSvg(text); } catch (e) { return { problems: [`does not parse: ${e.message}`], bounds }; }
  if (Object.keys(svg.attrs).sort().join() !== 'viewBox,xmlns' || svg.attrs.viewBox !== VIEWBOX || svg.attrs.xmlns !== 'http://www.w3.org/2000/svg') problems.push('root must be <svg xmlns viewBox="0 0 120 120"> only');
  const top = svg.children[0];
  if (svg.children.length !== 1 || top.name !== 'g' || top.attrs.stroke !== INK || top.attrs['stroke-width'] !== '3' || top.attrs.fill !== 'none' || top.attrs['stroke-linejoin'] !== 'round' || top.attrs['stroke-linecap'] !== 'round') problems.push('one top <g> must carry the ink defaults');
  if (/\d\.\d{3,}/.test(text)) problems.push('numbers need at most two decimals');
  const walk = (node, inherited) => {
    if (!ELEMENTS.has(node.name)) problems.push(`<${node.name}> is not allowed`);
    for (const k of Object.keys(node.attrs)) if (!(GEOMETRY[node.name] ?? []).includes(k) && !PAINT.includes(k) && !(node.name === 'g' && k === 'opacity')) problems.push(`attribute ${k} on <${node.name}> is not allowed`);
    if (node.attrs.opacity !== undefined) problems.push('opacity is not allowed');
    for (const k of ['fill', 'stroke']) { const v = node.attrs[k]; if (v !== undefined && v !== 'none' && !PALETTE.has(v)) problems.push(`${k} ${v} is not in the palette`); }
    let matrix = inherited.matrix, width = inherited.width;
    try { matrix = multiply(inherited.matrix, parseTransform(node.attrs.transform)); } catch (e) { problems.push(`bad geometry on <${node.name}>: ${e.message}`); }
    try { if (node.attrs['stroke-width'] !== undefined) { width = parseNumber(node.attrs['stroke-width']); if (width < 0) throw new Error(`stroke-width ${width} is negative`); } if (node.attrs['stroke-dasharray'] !== undefined) parseDashes(node.attrs['stroke-dasharray']); } catch (e) { problems.push(`bad geometry on <${node.name}>: ${e.message}`); }
    const state = { stroke: node.attrs.stroke ?? inherited.stroke, fill: node.attrs.fill ?? inherited.fill, width, matrix, scales: principalScales(matrix) };
    node.state = state;
    if (node.name !== 'g' && node.name !== 'svg') {
      try {
        const points = shapePoints(node.name, node.attrs);
        const stroked = state.stroke !== 'none';
        if (stroked || state.fill !== 'none') bounds = unionBounds(bounds, boundsOf(points, matrix, stroked ? (width / 2) * state.scales.max : 0));
      } catch (e) { problems.push(`bad geometry on <${node.name}>: ${e.message}`); }
    }
    node.children.forEach(c => walk(c, state));
    // Ink lines: 3 (2 for small detail), on both principal scales of the composed transform, so a
    // squash or shear cannot pass. A wider ink stroke is only the outline under a coloured stroke of the same shape.
    node.children.forEach((c, i) => {
      if (c.name === 'g' || c.state.stroke !== INK) return;
      const { min, max } = c.state.scales, lo = c.state.width * min, hi = c.state.width * max;
      if (lo >= 1.5 && hi <= 3.6) return;
      const next = node.children[i + 1];
      const overlay = next && next.state.stroke !== INK && next.state.stroke !== 'none' && geometryKey(next) === geometryKey(c);
      const gap = overlay ? (c.state.width - next.state.width) / 2 : 0;
      if (!overlay || gap * min < 1.4 || gap * max > 3.6) problems.push(`ink stroke ${lo.toFixed(2)}–${hi.toFixed(2)} wide on <${c.name}> is not an outline weight`);
    });
    if (node.name !== 'g' && state.fill === INK && !['circle', 'ellipse'].includes(node.name)) problems.push(`ink fill on <${node.name}>: ink fills are only for eyes and small dots`);
    if (node.attrs.fill === INK && Number(node.attrs.r ?? Math.max(node.attrs.rx ?? 0, node.attrs.ry ?? 0)) > 10) problems.push('ink dot larger than radius 10');
  };
  if (top) walk(top, { stroke: INK, fill: 'none', width: 3, matrix: IDENTITY });
  if (!bounds) problems.push('draws nothing');
  else if (bounds.x0 < FRAME.min || bounds.y0 < FRAME.min || bounds.x1 > FRAME.max || bounds.y1 > FRAME.max) problems.push(`draws outside the frame: ${['x0', 'y0', 'x1', 'y1'].map(k => `${k} ${bounds[k].toFixed(1)}`).join(', ')}`);
  if (Buffer.byteLength(text) > LIMITS.fileBytes) problems.push(`${Buffer.byteLength(text)} bytes is over ${LIMITS.fileBytes}`);
  return { problems, bounds };
}

/** The W1 queues directory (tiers.queue.json, local.queue.json, safety-policy.private.json). */
export const W1_QUEUES_ENV = 'LITTLE_ISLAND_PICTURE_W1_QUEUES';
const w1FromEnv = () => (process.env[W1_QUEUES_ENV] ? readW1Queues(process.env[W1_QUEUES_ENV]) : null);

const PICTURE_DIRS = ['src/content/pictures', 'content/pictures'];
/** True once any app source outside the dictionary itself imports it. */
export function dictionaryReachable(root = ROOT) {
  const files = [];
  const walk = dir => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.[cm]?[jt]sx?$/.test(e.name)) files.push(p);
    }
  };
  for (const d of ['src', 'content', 'modules', 'assets']) walk(join(root, d));
  const inside = rel => PICTURE_DIRS.some(d => rel === d || rel.startsWith(`${d}/`));
  for (const file of files) {
    const rel = relative(root, file).split(sep).join('/');
    if (inside(rel)) continue;
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/(?:\bfrom(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*|\bimport(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*\((?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*|\brequire(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*\((?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*|\bimport(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*)["'`]([^"'`]+)["'`]/g)) {
      if (inside(spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(rel), spec)) : spec) || /(?:^|\/)content\/pictures(?:\/|$)/.test(spec)) return true;
    }
  }
  return false;
}

/**
 * Whole-set checks: manifest, files, ids, sizes, allowlist and freshness.
 * W1 membership is checked only against the W1 queues themselves (`w1`, by default read from
 * the directory in LITTLE_ISLAND_PICTURE_W1_QUEUES); allowlist.json is never taken as proof.
 * Without the queues the result says `membership: 'not checked'`, and that is a failure once
 * app code imports the dictionary.
 * @param {{ w1?: { queues: Record<string, object[]>, policy: object } | null, reachable?: boolean }} [options]
 */
export function checkDictionary({ w1 = w1FromEnv(), reachable = dictionaryReachable() } = {}) {
  const problems = [];
  const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  const sources = JSON.parse(readFileSync(join(OUT, 'sources.json'), 'utf8'));
  const allow = JSON.parse(readFileSync(join(OUT, 'allowlist.json'), 'utf8'));
  const approvals = JSON.parse(readFileSync(join(OUT, 'approvals.json'), 'utf8'));
  const ids = manifest.pictures.map(p => p.id), words = manifest.pictures.map(p => p.word);
  if (new Set(ids).size !== ids.length) problems.push('picture ids are not unique');
  if (new Set(words).size !== words.length) problems.push('words are not unique');
  if (manifest.count !== ids.length || ids.length < LIMITS.minPictures) problems.push(`expected at least ${LIMITS.minPictures} pictures, found ${ids.length}`);
  let total = 0;
  for (const p of manifest.pictures) {
    if (!/^[a-z][a-z0-9-]*$/.test(p.id)) problems.push(`${p.id}: id must be lowercase letters, digits and hyphens`);
    if (!manifest.categories.includes(p.category)) problems.push(`${p.id}: unknown category`);
    if (!/^[A-Z]+$/.test(p.word)) problems.push(`${p.id}: word must be one uppercase English word`);
    if (typeof p.alt !== 'string' || p.alt.length < 12 || p.alt.length > 200 || !/[.]$/.test(p.alt)) problems.push(`${p.id}: alt text must be one or two plain sentences`);
    const text = readFileSync(join(OUT, 'svg', `${p.id}.svg`), 'utf8');
    if (Buffer.byteLength(text) !== p.bytes) problems.push(`${p.id}: byte size in manifest is wrong`);
    total += p.bytes;
    for (const issue of checkPicture(text)) problems.push(`${p.id}: ${issue}`);
    const entry = allow.words[p.word];
    if (!entry || entry.wordId !== `en-${p.word.toLowerCase()}` || !['tiers', 'local'].includes(entry.queue)) problems.push(`${p.id}: ${p.word} has no allowlist.json record`);
  }
  for (const word of Object.keys(allow.words)) if (!words.includes(word)) problems.push(`${word}: allowlist.json has a word with no picture`);
  let membership = 'not checked';
  if (w1) {
    membership = 'checked';
    const { results, failures } = checkWords(words, w1.queues, w1.policy);
    problems.push(...failures);
    const fields = ['wordId', 'queue', 'readerLevel'];
    for (const [word, found] of Object.entries(results)) {
      const committed = allow.words[word] ?? {};
      if (fields.some(k => committed[k] !== found[k])) problems.push(`${word}: allowlist.json differs from W1 (${fields.map(k => `${k} ${committed[k]} vs ${found[k]}`).join(', ')})`);
    }
    const byId = new Map(manifest.pictures.map(p => [p.id, p.word]));
    for (const s of sources.pictures) {
      const found = results[byId.get(s.id)];
      if (found && (s.wordId !== found.wordId || s.queue !== found.queue)) problems.push(`${s.id}: sources.json differs from W1`);
    }
  } else if (reachable) problems.push(`the dictionary is reachable from app code, so W1 membership must be checked: set ${W1_QUEUES_ENV} to the W1 queues directory`);
  if (total !== manifest.totalBytes) problems.push('manifest totalBytes is wrong');
  if (total > LIMITS.totalBytes) problems.push(`total ${total} bytes is over ${LIMITS.totalBytes}`);
  if (sources.pictures.length !== ids.length || approvals.pictures.length !== ids.length) problems.push('sources/approvals do not cover every picture');
  for (const a of approvals.pictures) if (a.leon.decision !== null && !['approved', 'redraw', 'drop'].includes(a.leon.decision)) problems.push(`${a.id}: unknown decision`);
  const stale = staleOutputs();
  if (stale.length) problems.push(`generated files are out of date: ${stale.slice(0, 5).join(', ')}`);
  return { problems, count: ids.length, totalBytes: total, membership, reachable };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { problems, count, totalBytes, membership } = checkDictionary();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`${count} pictures pass every static check; ${totalBytes} bytes of SVG.`);
  console.log(membership === 'checked' ? 'W1 membership: checked against the queues and policy themselves.' : `W1 membership: NOT checked. Only allowlist.json's shape was read; set ${W1_QUEUES_ENV} to verify.`);
}
