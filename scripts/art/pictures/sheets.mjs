// Contact sheets for person and reviewer checks, rendered on the host with rsvg-convert.
//   node scripts/art/pictures/sheets.mjs <new-output-dir> [--blind <seed> --key <new key.json>] [--ids a,b] [--per 50] [--scale 2]
// Labelled sheets show the word under each picture. Blind sheets shuffle every
// picture with the seed and show only a number; the key is written to --key,
// which must be outside the sheet folder so a reviewer can be given the folder alone.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT } from './build.mjs';

const TILE_BG = '#FFF9E6';
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };

function shuffled(list, seed) {
  let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const inner = text => text.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const escape = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** One sheet as SVG text: `points` is the on-screen size, `scale` the pixel density. */
export function sheetSvg(items, { points, scale, cols = 10, title }) {
  const tile = points * scale, pad = Math.round(6 * scale), label = Math.round(Math.max(11, points * 0.13) * scale);
  const cellW = tile + pad * 2, cellH = tile + pad * 2 + label + 4 * scale, head = Math.round(30 * scale);
  const rows = Math.ceil(items.length / cols), width = cols * cellW, height = head + rows * cellH;
  const cells = items.map((it, i) => {
    const x = (i % cols) * cellW + pad, y = head + Math.floor(i / cols) * cellH + pad;
    return `<rect x="${x}" y="${y}" width="${tile}" height="${tile}" rx="${Math.round(tile * 0.18)}" fill="${TILE_BG}"/>`
      + `<svg x="${x}" y="${y}" width="${tile}" height="${tile}" viewBox="0 0 120 120">${inner(it.svg)}</svg>`
      + `<text x="${x + tile / 2}" y="${y + tile + label}" font-family="Helvetica, Arial, sans-serif" font-size="${label * 0.82}" text-anchor="middle" fill="#254E4B">${escape(it.label)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#E6F0EC"/><text x="${pad}" y="${Math.round(head * 0.7)}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(16 * scale)}" fill="#254E4B">${escape(title)}</text>${cells}</svg>`;
}

if (process.argv[1]?.endsWith('sheets.mjs')) {
  const dir = process.argv[2];
  if (!dir || existsSync(dir)) { console.error('Give a new output directory.'); process.exit(1); }
  mkdirSync(dir, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  const only = arg('--ids') ? new Set(arg('--ids').split(',')) : null;
  let pics = manifest.pictures.filter(p => !only || only.has(p.id));
  const seed = arg('--blind'), per = Number(arg('--per', 50)), scale = Number(arg('--scale', 2));
  const keyPath = arg('--key');
  if (seed && (!keyPath || existsSync(keyPath) || keyPath.startsWith(dir))) { console.error('Blind sheets need a new --key path outside the sheet folder.'); process.exit(1); }
  if (seed) pics = shuffled(pics, seed);
  const key = {};
  for (let s = 0; s * per < pics.length; s++) {
    const chunk = pics.slice(s * per, (s + 1) * per);
    const items = chunk.map((p, i) => {
      const n = s * per + i + 1;
      key[n] = p.id;
      return { svg: readFileSync(join(OUT, 'svg', `${p.id}.svg`), 'utf8'), label: seed ? String(n) : p.word.toLowerCase() };
    });
    const tag = String(s + 1).padStart(2, '0');
    for (const points of [44, 120]) {
      const name = `sheet-${tag}-${points}pt`;
      const title = seed ? `Sheet ${tag} at ${points} pt (@${scale}x): what is each picture?` : `Island pictures, sheet ${tag}, ${points} pt at @${scale}x: ${chunk[0].word.toLowerCase()} to ${chunk.at(-1).word.toLowerCase()}`;
      writeFileSync(join(dir, `${name}.svg`), sheetSvg(items, { points, scale, cols: points === 44 ? 10 : 8, title }));
      const r = spawnSync('rsvg-convert', [join(dir, `${name}.svg`), '-o', join(dir, `${name}.png`)], { encoding: 'utf8' });
      if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
      if (seed) rmSync(join(dir, `${name}.svg`));
    }
  }
  if (seed) writeFileSync(keyPath, `${JSON.stringify({ seed, key: Object.fromEntries(Object.entries(key).map(([n, id]) => [n, { id, word: manifest.pictures.find(p => p.id === id).word }])) }, null, 2)}\n`);
  console.log(`${Math.ceil(pics.length / per)} sheets in ${dir}`);
}
