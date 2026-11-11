// Host rendering checks (needs rsvg-convert and ImageMagick's magick):
//   node scripts/art/pictures/render-check.mjs <new report.json>
// Each picture must pass the strict geometry checks first: a renderer silently skips a path
// it cannot read, so a clean raster alone proves nothing. It is then rendered on a canvas
// widened to its unclipped drawing bounds (at least 12 units past the frame on every side),
// so nothing it draws can hide outside the measured area. It must draw nothing outside the
// 120-unit frame, render at 44 pt and 120 pt, and fill at least 70 units of the frame on its
// longer side so it still reads at 44 pt.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OUT } from './build.mjs';
import { FRAME, inspectPicture } from './check.mjs';
import { unionBounds } from './geometry.mjs';

const PAD = 12, MIN_FILL = 70, MAX_REACH = 2000;
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`); return r.stdout; };

/** The static problems, the unclipped drawing bounds, and a viewBox that contains both them and the padded frame. */
export function renderPlan(text) {
  const { problems, bounds } = inspectPicture(text);
  const reach = unionBounds({ x0: -PAD, y0: -PAD, x1: 120 + PAD, y1: 120 + PAD }, bounds);
  const clamp = v => Math.max(-MAX_REACH, Math.min(MAX_REACH, v));
  const x0 = Math.floor(clamp(reach.x0 - 2)), y0 = Math.floor(clamp(reach.y0 - 2));
  const x1 = Math.ceil(clamp(reach.x1 + 2)), y1 = Math.ceil(clamp(reach.y1 + 2));
  return { problems, bounds, viewBox: [x0, y0, x1 - x0, y1 - y0] };
}

/** Renders one picture and measures what it actually draws, in frame units. */
export function renderPicture(id, text) {
  const plan = renderPlan(text);
  const scratch = mkdtempSync(join(tmpdir(), 'pictures-render-'));
  try {
    const [vx, vy, vw, vh] = plan.viewBox;
    const wide = join(scratch, `${id}.svg`), png = join(scratch, `${id}.png`), plain = join(scratch, `${id}-plain.svg`);
    writeFileSync(wide, text.replace('viewBox="0 0 120 120"', `viewBox="${vx} ${vy} ${vw} ${vh}"`));
    writeFileSync(plain, text);
    try {
      run('rsvg-convert', ['-w', String(vw), '-h', String(vh), wide, '-o', png]);
      for (const size of [88, 240]) run('rsvg-convert', ['-w', String(size), '-h', String(size), plain, '-o', join(scratch, `${id}-${size}.png`)]);
      const [w, h, x, y] = run('magick', [png, '-alpha', 'extract', '-threshold', '8%', '-format', '%@', 'info:']).match(/(\d+)x(\d+)\+(\d+)\+(\d+)/).slice(1).map(Number);
      const box = { x: x + vx, y: y + vy, w, h };
      return { id, problems: plan.problems, ...box, spills: box.x < FRAME.min || box.y < FRAME.min || box.x + w > FRAME.max || box.y + h > FRAME.max, fill: Math.max(w, h) };
    } catch (e) { return { id, problems: plan.problems, error: e.message }; }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

/** Everything wrong with one rendered row. */
export function rowFailures(row) {
  const failures = row.problems.map(p => `${row.id}: fails the static geometry checks (${p})`);
  if (row.error) failures.push(`${row.id}: does not render (${row.error})`);
  else {
    if (row.spills) failures.push(`${row.id}: draws outside the frame ${JSON.stringify({ x: row.x, y: row.y, w: row.w, h: row.h })}`);
    if (row.fill < MIN_FILL) failures.push(`${row.id}: fills only ${row.fill} of 120 units`);
  }
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = process.argv[2];
  if (!report || existsSync(report)) { console.error('Give a new report path.'); process.exit(1); }
  const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
  const rows = manifest.pictures.map(p => renderPicture(p.id, readFileSync(join(OUT, 'svg', `${p.id}.svg`), 'utf8')));
  const failures = rows.flatMap(rowFailures);
  const fills = rows.filter(r => !r.error).map(r => r.fill).sort((a, b) => a - b);
  writeFileSync(report, `${JSON.stringify({ checkedAt: new Date().toISOString(), pictures: rows.length, rendered: fills.length, minFill: fills[0], medianFill: fills[Math.floor(fills.length / 2)], failures, rows }, null, 2)}\n`);
  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  console.log(`${rows.length} pictures pass the geometry checks, render at 44 pt and 120 pt, stay inside the frame and fill ${fills[0]}–${fills.at(-1)} units (median ${fills[Math.floor(fills.length / 2)]}).`);
}
