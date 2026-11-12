/** Certify Lagoon's shipped hazard art: the baked PNG the runtime maps, drawn through the real poses. */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { hazardBox } from '../../src/arcade/games/lagoon-run/course';
import { spritePoint } from '../../src/arcade/games/scrolling/render';
import type { SpritePose } from '../../src/arcade/poses';

export type Png = { width: number; height: number; rgba: Uint8Array };
/** Minimal decoder for the bake's output: 8-bit RGBA, non-interlaced. */
export function decodePng(bytes: Uint8Array): Png {
  const view = Buffer.from(bytes);
  if (view.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let at = 8, width = 0, height = 0;
  const data: Buffer[] = [];
  while (at < view.length) {
    const length = view.readUInt32BE(at), type = view.toString('latin1', at + 4, at + 8), body = view.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) throw new Error('expected 8-bit RGBA, non-interlaced');
    } else if (type === 'IDAT') data.push(body);
    else if (type === 'IEND') break;
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data)), stride = width * 4, rgba = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[y * stride + x - 4] : 0, b = y ? rgba[(y - 1) * stride + x] : 0, c = x >= 4 && y ? rgba[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      rgba[y * stride + x] = (line[x] + predictor) & 255;
    }
  }
  return { width, height, rgba };
}

/** The runtime's kind → PNG mapping, read from the generated module (tests never load PNG requires). */
export function runtimeHazardFiles(): Record<string, string> {
  const source = readFileSync('src/arcade/games/lagoon-run/art.generated.ts', 'utf8');
  const block = source.slice(source.indexOf('export const hazardArt'), source.indexOf('export const shellArt'));
  return Object.fromEntries([...block.matchAll(/"([\w-]+)": \{ art: require\('\.\.\/\.\.\/\.\.\/\.\.\/(assets\/arcade\/lagoon\/[\w/-]+\.png)'\)/g)].map(m => [m[1], m[2]]));
}

/** Visible means at least 10% alpha. The ground band (shadow ellipse, post feet) sits under the
 * runner's shoes and is excluded: the bottom 10 of the 180-unit duck source. */
export const VISIBLE_ALPHA = 26, GROUND_BAND = 10 / 180;
/** Per box-x column, the lowest visible point (box units) above the ground band. React Native's
 * default `cover` resize maps the PNG into the box, exactly as BakedHazard draws it. */
export function obstructionProfile(png: Png, kind: string) {
  const box = hazardBox(kind), k = Math.max(box.width / png.width, box.height / png.height);
  const ox = (box.width - png.width * k) / 2, oy = (box.height - png.height * k) / 2, ground = box.height * (1 - GROUND_BAND);
  const columns: { x0: number; x1: number; bottom: number }[] = [];
  for (let x = 0; x < png.width; x++) {
    let bottom = -Infinity;
    for (let y = 0; y < png.height; y++) {
      const ly = oy + (y + 1) * k;
      if (png.rgba[(y * png.width + x) * 4 + 3] >= VISIBLE_ALPHA && oy + y * k < ground) bottom = Math.max(bottom, ly);
    }
    columns.push({ x0: ox + x * k, x1: ox + (x + 1) * k, bottom });
  }
  return { box, columns };
}

/**
 * Screen-space clearance between a rolling runner and a duck hazard, using both drawn poses: the
 * runner's art top (in its 80×132 frame, through HERO_SCALE about the shoes) against the lowest
 * visible pixel of the shipped hazard PNG above the runner's frame width. Positive means clear.
 */
export function duckClearance(profile: ReturnType<typeof obstructionProfile>, hazard: SpritePose, hero: SpritePose, heroArtTop: number) {
  const { box, columns } = profile;
  if ((hazard.angle ?? 0) !== 0 || (hero.angle ?? 0) !== 0) throw new Error('duck clearance expects upright poses');
  const left = spritePoint(hero, 80, 132, 0, 0).x, right = spritePoint(hero, 80, 132, 80, 0).x, top = spritePoint(hero, 80, 132, 40, heroArtTop).y;
  let lowest = -Infinity;
  for (const c of columns) {
    if (c.bottom === -Infinity) continue;
    const a = spritePoint(hazard, box.width, box.height, c.x0, 0).x, b = spritePoint(hazard, box.width, box.height, c.x1, 0).x;
    if (b > left && a < right) lowest = Math.max(lowest, spritePoint(hazard, box.width, box.height, 0, c.bottom).y);
  }
  return top - lowest;
}
