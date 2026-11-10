// Static checks for the island picture dictionary. Pure and dependency-free so the
// normal test run can use it; render-check.mjs adds the host rendering checks.
//   node scripts/art/pictures/check.mjs
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INK, PALETTE, VIEWBOX } from './style.mjs';
import { OUT, staleOutputs } from './build.mjs';

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

function scaleOf(transform = '') {
  let s = 1;
  for (const [, a, b] of transform.matchAll(/scale\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/g)) s *= Math.sqrt(Math.abs(Number(a) * Number(b ?? a)));
  for (const [, a, b, c, d] of transform.matchAll(/matrix\(([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)[ ,]+([-\d.]+)/g)) s *= Math.sqrt(Math.abs(Number(a) * Number(d) - Number(b) * Number(c)));
  return s;
}
const geometryKey = n => `${n.name}|${(GEOMETRY[n.name] ?? []).map(k => n.attrs[k]).join('|')}|${n.attrs.transform ?? ''}`;

/** Every style-guide rule a machine can check, for one file. Returns a list of problems. */
export function checkPicture(text) {
  const problems = [];
  let svg;
  try { svg = parseSvg(text); } catch (e) { return [`does not parse: ${e.message}`]; }
  if (Object.keys(svg.attrs).sort().join() !== 'viewBox,xmlns' || svg.attrs.viewBox !== VIEWBOX || svg.attrs.xmlns !== 'http://www.w3.org/2000/svg') problems.push('root must be <svg xmlns viewBox="0 0 120 120"> only');
  const top = svg.children[0];
  if (svg.children.length !== 1 || top.name !== 'g' || top.attrs.stroke !== INK || top.attrs['stroke-width'] !== '3' || top.attrs.fill !== 'none' || top.attrs['stroke-linejoin'] !== 'round' || top.attrs['stroke-linecap'] !== 'round') problems.push('one top <g> must carry the ink defaults');
  if (/\d\.\d{3,}/.test(text)) problems.push('numbers need at most two decimals');
  const walk = (node, inherited) => {
    if (!ELEMENTS.has(node.name)) problems.push(`<${node.name}> is not allowed`);
    for (const k of Object.keys(node.attrs)) if (!(GEOMETRY[node.name] ?? []).includes(k) && !PAINT.includes(k) && !(node.name === 'g' && k === 'opacity')) problems.push(`attribute ${k} on <${node.name}> is not allowed`);
    if (node.attrs.opacity !== undefined) problems.push('opacity is not allowed');
    for (const k of ['fill', 'stroke']) { const v = node.attrs[k]; if (v !== undefined && v !== 'none' && !PALETTE.has(v)) problems.push(`${k} ${v} is not in the palette`); }
    const state = {
      stroke: node.attrs.stroke ?? inherited.stroke,
      width: node.attrs['stroke-width'] !== undefined ? Number(node.attrs['stroke-width']) : inherited.width,
      scale: inherited.scale * scaleOf(node.attrs.transform),
    };
    node.state = state;
    node.children.forEach(c => walk(c, state));
    // Ink lines: 3 (2 for small detail). A wider ink stroke is only the outline under a coloured stroke of the same shape.
    node.children.forEach((c, i) => {
      if (c.name === 'g' || c.state.stroke !== INK) return;
      const w = c.state.width * c.state.scale;
      if (w >= 1.5 && w <= 3.6) return;
      const next = node.children[i + 1];
      const overlay = next && next.state.stroke !== INK && next.state.stroke !== 'none' && geometryKey(next) === geometryKey(c);
      const gap = overlay ? (c.state.width - next.state.width) * c.state.scale / 2 : 0;
      if (!overlay || gap < 1.4 || gap > 3.6) problems.push(`ink stroke ${w.toFixed(2)} wide on <${c.name}> is not an outline weight`);
    });
    if (node.attrs.fill === INK && !['circle', 'ellipse'].includes(node.name)) problems.push(`ink fill on <${node.name}>: ink fills are only for eyes and small dots`);
    if (node.attrs.fill === INK && Number(node.attrs.r ?? Math.max(node.attrs.rx ?? 0, node.attrs.ry ?? 0)) > 10) problems.push('ink dot larger than radius 10');
  };
  walk(top, { stroke: INK, width: 3, scale: 1 });
  if (Buffer.byteLength(text) > LIMITS.fileBytes) problems.push(`${Buffer.byteLength(text)} bytes is over ${LIMITS.fileBytes}`);
  return problems;
}

/** Whole-set checks: manifest, files, ids, sizes, allowlist and freshness. */
export function checkDictionary() {
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
    if (!entry || entry.wordId !== `en-${p.word.toLowerCase()}` || !['tiers', 'local'].includes(entry.queue)) problems.push(`${p.id}: ${p.word} has no W1 allowlist record`);
  }
  if (total !== manifest.totalBytes) problems.push('manifest totalBytes is wrong');
  if (total > LIMITS.totalBytes) problems.push(`total ${total} bytes is over ${LIMITS.totalBytes}`);
  if (sources.pictures.length !== ids.length || approvals.pictures.length !== ids.length) problems.push('sources/approvals do not cover every picture');
  for (const a of approvals.pictures) if (a.leon.decision !== null && !['approved', 'redraw', 'drop'].includes(a.leon.decision)) problems.push(`${a.id}: unknown decision`);
  const stale = staleOutputs();
  if (stale.length) problems.push(`generated files are out of date: ${stale.slice(0, 5).join(', ')}`);
  return { problems, count: ids.length, totalBytes: total };
}

if (process.argv[1]?.endsWith('check.mjs')) {
  const { problems, count, totalBytes } = checkDictionary();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`${count} pictures pass every static check; ${totalBytes} bytes of SVG.`);
}
