// Host rendering checks (needs rsvg-convert and ImageMagick's magick):
//   node scripts/art/pictures/render-check.mjs <new report.json>
// Each picture is rendered on a canvas 12 units larger on every side. It must render,
// draw nothing outside the 120-unit frame, and fill at least 70 units of the frame
// on its longer side so it still reads at 44 pt.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OUT } from './build.mjs';

const PAD = 12, MIN_FILL = 70;
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`); return r.stdout; };

const report = process.argv[2];
if (!report || existsSync(report)) { console.error('Give a new report path.'); process.exit(1); }
const manifest = JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'));
const scratch = mkdtempSync(join(tmpdir(), 'pictures-render-'));
const rows = [], failures = [];
try {
  for (const p of manifest.pictures) {
    const text = readFileSync(join(OUT, 'svg', `${p.id}.svg`), 'utf8');
    const wide = join(scratch, `${p.id}.svg`), png = join(scratch, `${p.id}.png`);
    writeFileSync(wide, text.replace('viewBox="0 0 120 120"', `viewBox="${-PAD} ${-PAD} ${120 + 2 * PAD} ${120 + 2 * PAD}"`));
    let row;
    try {
      run('rsvg-convert', ['-w', String(120 + 2 * PAD), '-h', String(120 + 2 * PAD), wide, '-o', png]);
      for (const size of [88, 240]) run('rsvg-convert', ['-w', String(size), '-h', String(size), join(OUT, 'svg', `${p.id}.svg`), '-o', join(scratch, `${p.id}-${size}.png`)]);
      const [w, h, x, y] = run('magick', [png, '-alpha', 'extract', '-threshold', '8%', '-format', '%@', 'info:']).match(/(\d+)x(\d+)\+(\d+)\+(\d+)/).slice(1).map(Number);
      const box = { x: x - PAD, y: y - PAD, w, h };
      row = { id: p.id, ...box, spills: box.x < -1 || box.y < -1 || box.x + w > 121 || box.y + h > 121, fill: Math.max(w, h) };
    } catch (e) { row = { id: p.id, error: e.message }; }
    rows.push(row);
    if (row.error) failures.push(`${p.id}: does not render (${row.error})`);
    else {
      if (row.spills) failures.push(`${p.id}: draws outside the frame ${JSON.stringify({ x: row.x, y: row.y, w: row.w, h: row.h })}`);
      if (row.fill < MIN_FILL) failures.push(`${p.id}: fills only ${row.fill} of 120 units`);
    }
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }
const fills = rows.filter(r => !r.error).map(r => r.fill).sort((a, b) => a - b);
writeFileSync(report, `${JSON.stringify({ checkedAt: new Date().toISOString(), pictures: rows.length, rendered: fills.length, minFill: fills[0], medianFill: fills[Math.floor(fills.length / 2)], failures, rows }, null, 2)}\n`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`${rows.length} pictures render at 44 pt and 120 pt, stay inside the frame and fill ${fills[0]}–${fills.at(-1)} units (median ${fills[Math.floor(fills.length / 2)]}).`);
