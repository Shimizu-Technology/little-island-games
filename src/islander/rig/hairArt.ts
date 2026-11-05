/** Hair drawings in head-local units: the head is x ±28, y ±28 and the art box allows x ±39, y ≥ −38.
 * Every shape is a compound path, so a style costs a few SVG nodes however detailed it is.
 * Paths use absolute M, L, C, Q and Z only, which lets mapPath bake hat and roll variants. */
import { hairColors, skinTones, type IslanderLook } from '../look';

type Pt = (x: number, y: number) => readonly [number, number];
const num = (v: number) => String(Math.round(v * 100) / 100);
export function mapPath(d: string, f: Pt): string {
  return d.replace(/(-?\d*\.?\d+)[ ,]*(-?\d*\.?\d+)/g, (_, x: string, y: string) => { const [a, b] = f(Number(x), Number(y)); return `${num(a)} ${num(b)}`; });
}
/** Same winding for every piece of a compound shape, so overlapping locks add up instead of punching holes. */
function sameWinding(d: string): string {
  return (d.match(/M[^M]*/g) ?? []).map(part => {
    const steps = [...part.matchAll(/([MLCQ])([^MLCQZ]*)/g)].map(m => ({ op: m[1], n: (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number) }));
    const ends = steps.map(({ n }) => [n[n.length - 2], n[n.length - 1]] as const);
    let area = 0; ends.forEach(([x, y], i) => { const [u, v] = ends[(i + 1) % ends.length]; area += x * v - u * y; });
    if (area >= 0) return part;
    let out = `M${ends[ends.length - 1].join(' ')}`;
    for (let i = steps.length - 1; i > 0; i--) {
      const { op, n } = steps[i], to = ends[i - 1].join(' ');
      out += op === 'L' ? `L${to}` : op === 'Q' ? `Q${n[0]} ${n[1]} ${to}` : `C${n[2]} ${n[3]} ${n[0]} ${n[1]} ${to}`;
    }
    return `${out}Z`;
  }).join('');
}
const flip = (d: string) => mapPath(d, (x, y) => [-x, y]);
const both = (d: string) => d + flip(d);
/** A tapered stroke drawn as a filled sliver, so lines stay soft instead of uniform. */
function wisp(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w = 1.2) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.max(.01, Math.hypot(dx, dy)), nx = -dy / l * w, ny = dx / l * w;
  return `M${num(x0)} ${num(y0)}Q${num(cx + nx)} ${num(cy + ny)} ${num(x1)} ${num(y1)}Q${num(cx - nx)} ${num(cy - ny)} ${num(x0)} ${num(y0)}Z`;
}
/** Soft lobes along a line. Lobes bulge to the left of travel, which is outward on a clockwise contour. */
function lobes(points: readonly (readonly [number, number])[], bulge = .62) {
  let d = '';
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], dx = bx - ax, dy = by - ay;
    const cx = (ax + bx) / 2 + dy * bulge, cy = (ay + by) / 2 - dx * bulge;
    d += `Q${num(cx)} ${num(cy)} ${num(bx)} ${num(by)}`;
  }
  return d;
}
const ring = (cx: number, cy: number, rx: number, ry: number, count: number, turn = 0, bulge = .5) => {
  const pts = Array.from({ length: count + 1 }, (_, i) => { const a = turn + i / count * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const; });
  return `M${num(pts[0][0])} ${num(pts[0][1])}${lobes(pts, bulge)}Z`;
};
/** A chain through points with every corner rounded, so tufts stay plump. Assumes the pen is at points[0]. */
function soft(points: readonly (readonly [number, number])[], k = .44) {
  let d = '';
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i], [ax, ay] = points[i - 1], [bx, by] = points[i + 1];
    d += `L${num(px + (ax - px) * k)} ${num(py + (ay - py) * k)}Q${num(px)} ${num(py)} ${num(px + (bx - px) * k)} ${num(py + (by - py) * k)}`;
  }
  const [lx, ly] = points[points.length - 1];
  return `${d}L${num(lx)} ${num(ly)}`;
}
/** Hair tie as a little rounded band, centred at x,y and turned by degrees. */
function tie(x: number, y: number, deg = 0, w = 5, h = 2.4) {
  const r = deg * Math.PI / 180, at = (u: number, v: number) => `${num(x + u * Math.cos(r) - v * Math.sin(r))} ${num(y + u * Math.sin(r) + v * Math.cos(r))}`;
  return `M${at(-w, -h)}Q${at(0, -h - 1)} ${at(w, -h)}Q${at(w + 1.6, 0)} ${at(w, h)}Q${at(0, h + 1)} ${at(-w, h)}Q${at(-w - 1.6, 0)} ${at(-w, -h)}Z`;
}
/** A plait: staggered scallops down a centre line with zigzag creases, so it reads as woven strands. */
function plait(points: readonly (readonly [number, number])[], w: number) {
  const at = (u: number) => { const f = Math.min(points.length - 1.001, u), i = Math.floor(f), t = f - i, [ax, ay] = points[i], [bx, by] = points[i + 1], l = Math.hypot(bx - ax, by - ay); return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx: -(by - ay) / l, ny: (bx - ax) / l }; };
  const steps = (points.length - 1) * 2, width = (u: number) => w * (1 - u / steps * .3);
  const side = (u: number, sign: number, k: number) => { const p = at(u / 2); return [p.x + p.nx * width(u) * sign * k, p.y + p.ny * width(u) * sign * k] as const; };
  let right = `M${num(side(0, 1, .72)[0])} ${num(side(0, 1, .72)[1])}`, left = '', shade = '', shine = '';
  for (let u = 0; u < steps; u += 2) { const c = side(u + 1, 1, 1.5), e = side(u + 2, 1, .72); right += `Q${num(c[0])} ${num(c[1])} ${num(e[0])} ${num(e[1])}`; }
  for (let u = steps + 1; u > 1; u -= 2) { const c = side(u - 1, -1, 1.5), e = side(u - 2, -1, .72); left += `Q${num(c[0])} ${num(c[1])} ${num(e[0])} ${num(e[1])}`; }
  for (let u = 0; u < steps; u++) {
    const sign = u % 2 ? -1 : 1, a = side(u, sign, .72), b = side(u + 1, -sign, .72), m = at((u + .5) / 2);
    shade += wisp(a[0], a[1], m.x, m.y + 1.2, b[0], b[1], .62);
    const g = side(u + 1, sign, .86), h = at((u + 1) / 2);
    if (u % 2 === 0) shine += wisp(g[0], g[1] - 1.2, (g[0] + h.x) / 2, (g[1] + h.y) / 2 - 1.8, h.x, h.y - .4, .62);
  }
  return { base: `${right}L${num(side(steps + 1, -1, .72)[0])} ${num(side(steps + 1, -1, .72)[1])}${left}Z`, shade, shine };
}

export type HairLayer = Readonly<{ base?: string; under?: string; shade?: string; shine?: string; ties?: string; fade?: string; fadeHigh?: string; /** Outline under the base, for a shape that sits on a shaved scalp. */ rim?: string; /** Outline for soft-edged styles; default is the whole base. */ edge?: string }>;
export type HairDrawing = Readonly<{
  /** Behind the body in front view. */ rear?: HairLayer;
  /** Over the body and in front of the shoulders. */ front: HairLayer;
  /** Whole hairstyle from behind. */ back: HairLayer;
  /** Puffs or bunches drawn behind the cap, seen from behind. */ backBehind?: HairLayer;
  /** Tail, braids or length that swings when running; pivots at root. */ swing?: HairLayer; root?: readonly [number, number];
  /** Long hair: the swinging length hangs behind the crown instead of over it. */ swingBehind?: boolean;
  /** Replaces the front or back art under a hat, for shapes a hat would fight. */ hatFront?: HairLayer; hatBack?: HairLayer;
  /** Bun or crown ornament that comes off under a hat. */ crown?: HairLayer; backCrown?: HairLayer;
  /** Replaces rear hair under a hat, where the usual shape would fight the brim. */ hatRear?: HairLayer;
  /** Bottom of the forehead hair at the centre, for overlays. */ hairline: number;
  /** Extra Galaxy stars on the length of the hair. */ stars?: readonly (readonly [number, number])[];
  tieColor?: string;
}>;

const coral = '#EF6F8E', sunny = '#F6B93B';

const partLine = wisp(0, -33, -.6, -28, 0, -22, .8);
/** The back of the head is hair right down to the jaw; only the neckline differs per style. */
const dome = 'C-31 -6 -31.5 -18 -25 -26C-19 -32.5 -8 -34 0 -34C8 -34 19 -32.5 25 -26C31.5 -18 31 -6 28.7 6';
const fullBack = `M-28.7 6${dome}L28.7 11Q28.7 28.7 0 28.7Q-28.7 28.7 -28.7 11Z`;
const upNape = `M-28.7 6${dome}L28.7 9C28 18 19 25.6 0 25.6C-19 25.6 -28 18 -28.7 9Z`;
const backShine = wisp(-25, -13, -18, -26, -5, -30, 2.1) + wisp(5, -30, 18, -26, 25, -13, 2.1);
const shortNape = [[28.7, 7], [27.6, 15], [20, 22], [13, 26.4], [6, 24.6], [0, 28], [-6, 24.6], [-13, 26.4], [-20, 22], [-27.6, 15], [-28.7, 7]] as const;
const whorl = (x: number, y: number) => wisp(x, y, x - 22, y - 4, x - 25, y + 20, 1.5) + wisp(x, y, x - 14, y + 8, x - 12, y + 34, 1.5) + wisp(x, y, x - 4, y + 18, x + 4, y + 42, 1.5) + wisp(x, y, x + 8, y + 18, x + 18, y + 34, 1.5) + wisp(x, y, x + 20, y + 2, x + 24, y + 18, 1.4);

const cropTufts = [[28.8, -3], [27.6, -.6], [26.4, -4], [24.6, -9.6], [19, -12.4], [12, -11.6], [6, -13.4], [0, -11.8], [-6, -13.6], [-12, -11.8], [-19, -12.6], [-24.6, -9.6], [-26.4, -4], [-27.6, -.6], [-28.8, -3]] as const;
const cropTop = [[-28.8, -3], [-29.6, -10], [-28.6, -18], [-24.6, -24.6], [-19, -29.6], [-12, -32.4], [-7, -31.4], [-2, -34.6], [4, -32], [9, -34.8], [15, -31.4], [21, -29], [24.6, -24.6], [28.6, -18], [29.6, -10], [28.8, -3]] as const;
const crop: HairDrawing = {
  hairline: -12,
  front: {
    base: `M-28.8 -3${soft(cropTop, .46)}${soft(cropTufts, .46)}Z`,
    shade: `${wisp(-19, -13, -22, -20, -19, -27, 1.3)}${wisp(-6, -14, -8.6, -22, -6.6, -30, 1.4)}${wisp(6, -14, 5, -22, 9, -32, 1.4)}${wisp(19, -13, 20, -20, 21, -27, 1.3)}${wisp(-12, -12, -13.6, -18, -11, -26, 1)}${wisp(0, -12, -1, -20, -2, -30, 1.1)}${wisp(12, -12, 13, -18, 15, -26, 1)}`,
    shine: `${wisp(-26, -14, -23, -23, -16, -28, 1.8)}${wisp(-7, -29, -2, -31, 3, -30, 1.5)}${wisp(15, -28, 22, -25, 26.6, -16, 1.5)}`,
  },
  back: {
    base: `M-28.8 -3${soft(cropTop, .46)}L28.7 7${soft(shortNape, .42)}L-28.8 -3Z`,
    shade: `${whorl(3, -21)}${wisp(-20, 12, -14, 16, -14, 24, 1.2)}${wisp(20, 12, 14, 16, 14, 24, 1.2)}${wisp(-5, 14, -4, 18, -5, 22, 1)}${wisp(6, 14, 6, 18, 6, 22, 1)}`,
    shine: `${wisp(-25, -13, -19, -25, -9, -29, 2)}${wisp(8, -30, 18, -27, 25, -15, 1.7)}`,
  },
};

const curlTop = [[-31.5, 7], [-36, -3], [-36.5, -14], [-31, -24], [-22.5, -31.5], [-11.5, -36], [.5, -37.6], [12, -35.8], [23, -31.5], [31.5, -24], [36.5, -14], [36, -3], [31.5, 7]] as const;
const curlMarks = wisp(-30, -9, -26, -14, -21, -11, 1.2) + wisp(-24, -21, -18, -27, -13, -22, 1.2) + wisp(-8, -28, -1, -33, 5, -27, 1.2) + wisp(12, -24, 18, -29, 24, -22, 1.2) + wisp(21, -11, 27, -15, 31, -9, 1.2) + wisp(-14, -12, -8, -16, -3, -12, 1.1) + wisp(4, -13, 10, -17, 15, -12, 1.1);
const curlShine = wisp(-28, -14, -25, -18, -21, -16, 1.1) + wisp(-21, -27, -16, -31, -11, -27, 1.2) + wisp(-4, -33, 1, -35, 6, -32, 1.1) + wisp(16, -28, 21, -30, 25, -25, 1.1) + wisp(26, -13, 30, -16, 33, -12, 1);
const curlsHatFront = `M-31.5 7${lobes([[-31.5, 7], [-34.6, 0], [-34, -9], [-29.6, -15.4]], .5)}L0 -24L29.6 -15.4${lobes([[29.6, -15.4], [34, -9], [34.6, 0], [31.5, 7]], .5)}${lobes([[31.5, 7], [25.6, -2.5], [17, -7.4], [8.5, -8.8], [0, -7.4], [-8.5, -8.8], [-17, -7.4], [-25.6, -2.5], [-31.5, 7]], .42)}Z`;
const curls: HairDrawing = {
  hairline: -7,
  hatFront: { base: curlsHatFront, shade: wisp(-14, -12, -8, -16, -3, -12, 1.1) + wisp(4, -13, 10, -17, 15, -12, 1.1) + wisp(-31, -5, -27, -9, -24, -6, 1.1) + wisp(24, -6, 27, -9, 31, -5, 1.1), shine: wisp(-33, -5, -31, -9, -28, -9, 1) + wisp(26, -9, 31, -9, 33, -5, 1) },
  hatBack: { base: `M-31.5 7${lobes([[-31.5, 7], [-34.6, 0], [-34, -9], [-29.6, -15.4]], .5)}L0 -24L29.6 -15.4${lobes([[29.6, -15.4], [34, -9], [34.6, 0], [31.5, 7], [30, 15], [22.6, 24], [11.4, 29], [0, 30.6], [-11.4, 29], [-22.6, 24], [-30, 15], [-31.5, 7]], .46)}Z`, shade: wisp(-24, 4, -18, 0, -12, 5, 1.2) + wisp(-6, 8, 0, 4, 6, 8, 1.2) + wisp(12, 5, 18, 0, 24, 4, 1.2) + wisp(-16, 19, -10, 14, -4, 20, 1.2) + wisp(5, 20, 11, 14, 17, 19, 1.2) + wisp(-14, -8, -8, -12, -3, -8, 1.1) + wisp(4, -8, 10, -12, 15, -8, 1.1), shine: wisp(-24, 9, -20, 6, -15, 9, 1) + wisp(14, 9, 19, 6, 24, 9, 1) + wisp(-3, -2, 1, -5, 5, -2, 1) },
  front: {
    base: `M-31.5 7${lobes(curlTop)}${lobes([[31.5, 7], [25.6, -2.5], [17, -7.4], [8.5, -8.8], [0, -7.4], [-8.5, -8.8], [-17, -7.4], [-25.6, -2.5], [-31.5, 7]], .42)}Z`,
    shade: curlMarks,
    shine: curlShine,
  },
  back: {
    base: `M-31.5 7${lobes(curlTop)}${lobes([[31.5, 7], [30, 15], [22.6, 24], [11.4, 29], [0, 30.6], [-11.4, 29], [-22.6, 24], [-30, 15], [-31.5, 7]], .46)}Z`,
    shade: curlMarks + wisp(-24, 4, -18, 0, -12, 5, 1.2) + wisp(-6, 8, 0, 4, 6, 8, 1.2) + wisp(12, 5, 18, 0, 24, 4, 1.2) + wisp(-16, 19, -10, 14, -4, 20, 1.2) + wisp(5, 20, 11, 14, 17, 19, 1.2),
    shine: curlShine + wisp(-24, 9, -20, 6, -15, 9, 1) + wisp(14, 9, 19, 6, 24, 9, 1),
  },
};

const pullBack = `M-29.4 4C-31 -6 -31.5 -18 -25 -26C-19 -32.5 -8 -34 1 -33.5C12 -34 22 -31 27 -24C31 -17 31.5 -6 29.4 4C28.6 0 27 -5 24 -9.5C18 -15 9 -17.4 0 -15.6C-9 -17.4 -18 -15 -24 -9.5C-27 -5 -28.6 0 -29.4 4Z`;
const ponytail: HairDrawing = {
  hairline: -16, tieColor: coral,
  rear: {
    base: 'M10 -33C21 -39 32 -37 36.8 -28C39.6 -20 39.8 -8 38.6 2C37.6 11 37.4 19 38.4 27C38.8 31 38 35.6 35 36C31.6 36 31 32 30.2 27C29 20 27.6 14 27.8 7C28.2 0 28.4 -7 26 -14C24 -21 19 -26 10 -28Z',
    shade: `${wisp(28, -22, 32, -6, 31.4, 8, 1.6)}${wisp(31.4, 8, 31.6, 18, 34.6, 34, 1.4)}`,
    shine: `${wisp(27, -32, 35.5, -24, 36.8, -6, 1.9)}${wisp(36.4, 0, 35, 12, 36.6, 26, 1.3)}`,
  },
  hatRear: {
    base: 'M24 -14C31 -18 38 -14 38.6 -4C39.6 6 37.6 16 38.4 27C38.8 31 38 35.6 35 36C31.6 36 31 32 30.2 27C29 20 27.6 14 27.8 7C28.2 1 28 -4 26 -8Z',
    shade: `${wisp(30, -8, 32, 2, 31.4, 8, 1.4)}${wisp(31.4, 8, 31.6, 18, 34.6, 34, 1.4)}`,
    shine: `${wisp(36.6, -6, 36.4, 8, 36.6, 26, 1.3)}`,
    ties: tie(31.6, -9.6, 70, 4.6, 2.3),
  },
  hatFront: { base: pullBack, shade: `${wisp(23, -9.5, 22, -13, 20, -16, 1)}` },
  front: {
    base: pullBack,
    shade: `${wisp(-23, -10, -10, -27, 15, -30, 1.1)}${wisp(-8, -15.6, 1, -25, 15, -29.5, 1.1)}${wisp(9, -14.6, 12, -22, 17, -29, 1)}${wisp(23, -9.5, 22, -19, 19, -28, 1)}`,
    shine: `${wisp(-25, -13, -18, -25, -4, -30, 2.2)}${wisp(19, -29, 25, -24, 28, -14, 1.3)}`,
    ties: tie(17.5, -30.5, 38, 4.8, 2.3),
  },
  back: {
    base: upNape,
    shade: `${wisp(-26, 8, -14, -9, -3, -20, 1.3)}${wisp(26, 8, 14, -9, 3, -20, 1.3)}${wisp(-15, 18, -8, 4, -2, -18, 1.2)}${wisp(15, 18, 8, 4, 2, -18, 1.2)}${wisp(-24, -18, -12, -22, -3, -22, 1.1)}${wisp(24, -18, 12, -22, 3, -22, 1.1)}`,
    shine: backShine,
  },
  root: [0, -18],
  swing: {
    base: 'M-4.6 -20C-9 -17 -10.4 -8 -9.6 2C-9 12 -4.4 22 -4.6 32C-4.8 38 -3 46 .6 46.6C4.4 46 6.4 38 6.6 32C6.8 22 9.8 12 9.6 2C10 -8 9 -17 4.6 -20Z',
    shade: `${wisp(-5, -14, -5.6, 8, -2, 28, 1.5)}${wisp(-2, 28, -1.6, 36, .4, 44, 1.2)}${wisp(5, -14, 6, 8, 3, 30, 1.2)}`,
    shine: wisp(-2, -15, -3, 2, -1, 18, 1.5),
    ties: tie(0, -19.5, 0, 5.4, 2.4),
  },
};

const partedCap = `M0 -34C-14 -35 -27 -29 -30 -14C-31.5 -6 -31 2 -29 9.6C-27 11.4 -25 11.6 -23 10.6C-22 4 -21 -2 -18 -6C-13 -11 -5 -15 0 -23C5 -15 13 -11 18 -6C21 -2 22 4 23 10.6C25 11.6 27 11.4 29 9.6C31 2 31.5 -6 30 -14C27 -29 14 -35 0 -34Z`;
const capShade = `${partLine}${wisp(-27, 6, -24, -5, -14, -14, 1.3)}${wisp(27, 6, 24, -5, 14, -14, 1.3)}${wisp(-8, -28, -10, -22, -18, -14, 1)}${wisp(8, -28, 10, -22, 18, -14, 1)}`;
const capShine = `${wisp(-25, -12, -19, -24, -5, -30, 2.2)}${wisp(5, -30, 19, -24, 25, -12, 2.2)}`;
const braidL = plait([[-26.6, 9], [-27, 17], [-25.6, 25], [-22.6, 33], [-19.6, 40], [-17.4, 46.5]], 5.2);
const braidTuft = 'M-19.8 46.8C-20.6 49.2 -20 52.2 -17.6 52.8C-15.2 52.2 -14.6 49.2 -15.4 46.8Z';
const braidBackL = plait([[-12.6, 6], [-15, 13], [-17, 21], [-18.6, 29], [-20, 37], [-21, 45], [-21.6, 51]], 5);
const braidBackTuft = 'M-23.8 51C-24.6 53.4 -24 56.4 -21.6 57C-19.2 56.4 -18.6 53.4 -19.4 51Z';
const braids: HairDrawing = {
  hairline: -18, tieColor: coral,
  front: {
    base: `${both(braidL.base + braidTuft)}${partedCap}`,
    shade: `${both(braidL.shade)}${capShade}`,
    shine: `${both(braidL.shine)}${capShine}`,
    ties: both(tie(-17.6, 46.6, 12, 4.4, 2.2)),
  },
  back: {
    base: fullBack,
    shade: `${wisp(0, -33, 0, -4, 0, 28, .9)}${wisp(-24, 0, -19, 2, -14, 6, 1.3)}${wisp(24, 0, 19, 2, 14, 6, 1.3)}${wisp(-6, -26, -8, -10, -11, 4, 1.2)}${wisp(6, -26, 8, -10, 11, 4, 1.2)}${wisp(-18, -24, -18, -10, -14, 3, 1.2)}${wisp(18, -24, 18, -10, 14, 3, 1.2)}`,
    shine: backShine,
  },
  root: [0, 2],
  swing: {
    base: both(braidBackL.base + braidBackTuft),
    shade: both(braidBackL.shade),
    shine: both(braidBackL.shine),
    ties: both(tie(-21.6, 51, 4, 4.2, 2.1)),
  },
};

const ticks = (pairs: readonly (readonly [number, number])[], w = .75) => pairs.map(([x, y]) => wisp(x, y, x + .3, y - 1.1, x + (x < 0 ? -.3 : .9), y - 2.5, w)).join('');
/** Stubble follows the growth: every tick leans away from a crown swirl. */
const stubble = (points: readonly (readonly [number, number])[], cx: number, cy: number, length: number, w: number) => points.map(([x, y]) => { const dx = x - cx, dy = y - cy, l = Math.max(.01, Math.hypot(dx, dy)), ux = dx / l * length, uy = dy / l * length; return wisp(x, y, x + ux / 2, y + uy / 2, x + ux, y + uy, w); }).join('');
/** Short hair ends in a grain, not a painted edge: tiny soft teeth along the line. */
function grain(points: readonly (readonly [number, number])[], depth = .8, step = 2.5) {
  const out: [number, number][] = [];
  let walked = 0, tooth = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i], length = Math.hypot(bx - ax, by - ay);
    while (walked <= length) {
      const u = walked / length, lift = tooth++ % 2 ? depth : 0;
      out.push([ax + (bx - ax) * u, ay + (by - ay) * u - lift]);
      walked += step;
    }
    walked -= length;
  }
  return out;
}
/** Shorn hair sits inside the head's own outline, so it has no line of its own: skin, then stubble, then the same head. */
const skullEdge = 'L-27.4 -9Q-27.4 -27.4 0 -27.4Q27.4 -27.4 27.4 -9L27.4 -3.4';
const hairlineRight = [[26, -3.6], [25.4, -7], [24.4, -9.8], [22.6, -12], [19, -13.6], [13, -14.6], [6, -15.2], [0, -15.4]] as const;
/** Small sideburns, rounded temples, the forehead left open. Lift raises it to make the darker layer of a fade. */
const shornLine = (lift: number) => {
  const right = hairlineRight.map(([x, y]) => [x, y - (x > 25 ? lift * .4 : lift)] as const), whole = [...right, ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y] as const)];
  return `M-27.4 -3.4${skullEdge}Q26.9 -2 26 -3.6${soft(grain(whole))}Q-26.9 -2 -27.4 -3.4Z`;
};
const shornFade = shornLine(0);
const shornDark = shornLine(2.2);
/** Tiny round flecks: stubble up close, a matte texture at real size. */
const flecks = (points: readonly (readonly [number, number])[], r = .42) => points.map(([x, y]) => `M${num(x - r)} ${num(y)}Q${num(x - r)} ${num(y - r)} ${num(x)} ${num(y - r)}Q${num(x + r)} ${num(y - r)} ${num(x + r)} ${num(y)}Q${num(x + r)} ${num(y + r)} ${num(x)} ${num(y + r)}Q${num(x - r)} ${num(y + r)} ${num(x - r)} ${num(y)}Z`).join('');
const stubbleSides = [[-24.6, -11], [-22.4, -15.4], [-25.4, -15], [-20, -19], [-23, -19.4], [-17.6, -22.6], [-20.6, -22.4], [-14.4, -24.6], [24.6, -11], [22.4, -15.4], [25.4, -15], [20, -19], [23, -19.4], [17.6, -22.6], [20.6, -22.4], [14.4, -24.6], [-17, -18.6], [17, -18.6]] as const;
const stubbleTop = [[-11, -25.6], [-6, -26], [-1, -26.2], [4, -26], [9, -25.6], [-13, -21.6], [-8, -22.4], [-3, -23], [2, -23], [7, -22.4], [12, -21.6], [-10, -19.2], [-5, -19.8], [0, -20], [5, -19.8], [10, -19.2]] as const;
const buzzSheen = `M-20.6 -17.6C-17 -24 -8 -26.4 2 -26C-6 -24.6 -14 -22 -20.6 -17.6Z${flecks([[-15, -20.4], [-9.6, -22.6], [-4, -24], [8, -24], [14, -21.6]], .5)}`;
const napeShape = 'M-27.4 4L-27.4 -9Q-27.4 -27.4 0 -27.4Q27.4 -27.4 27.4 -9L27.4 11Q27.4 27.4 0 27.4Q-27.4 27.4 -27.4 11Z';
const napeRight = [[27.4, 3], [26.4, 9], [22.6, 14], [15, 17.6], [7, 19.2], [0, 19.6]] as const;
const napeDark = `M-27.4 4L-27.4 -9Q-27.4 -27.4 0 -27.4Q27.4 -27.4 27.4 -9L27.4 4${soft(grain([...napeRight, ...napeRight.slice(0, -1).reverse().map(([x, y]) => [-x, y] as const)]))}Z`;
const stubbleNape = [[-20, -14], [-10, -18], [-3, -9], [11, -18], [20, -13], [-24, -2], [24, -2], [-14, -4], [14, -5], [-5, 6], [7, 5], [-17, 8], [17, 7], [-23, -9], [23, -8], [-6, -24], [8, -25], [-15, -22], [16, -22], [-1, 14], [-10, 13], [10, 13], [-20, 2], [20, 1], [3, -2], [-9, 0], [9, -10], [-19, 13], [19, 13], [-24, 7], [24, 7], [-4, -16], [5, -15]] as const;
const stubbleNapeLight = [[-14, -13], [-7, -5], [6, -8], [15, -12], [-19, -4], [19, -5], [-11, 6], [11, 8], [0, 3], [-3, -21], [3, 12], [-16, 2], [17, 3]] as const;
const buzzUnderHat = 'M-27.4 4L-27.4 -9Q-27.4 -27.4 0 -27.4Q27.4 -27.4 27.4 -9L27.4 4Q26.6 5.4 25.4 4C24.6 -2 23.6 -6 22 -9C10 -9.6 -10 -9.6 -22 -9C-23.6 -6 -24.6 -2 -25.4 4Q-26.6 5.4 -27.4 4Z';
const hatFlecks = flecks([[-25.4, -5], [-24.4, -1], [-26, 1.6], [25.4, -5], [24.4, -1], [26, 1.6], [-24, -7.4], [24, -7.4]]);
const buzz: HairDrawing = {
  hairline: -14,
  hatFront: { fadeHigh: buzzUnderHat, under: hatFlecks },
  front: {
    fade: shornFade,
    fadeHigh: shornDark,
    under: flecks([...stubbleSides, ...stubbleTop]),
    shine: buzzSheen,
  },
  back: {
    fade: napeShape,
    fadeHigh: napeDark,
    under: flecks(stubbleNape),
    shade: `${wisp(2, -19, 7, -21, 8, -15, .7)}${wisp(2, -19, -3, -17, -3, -22, .7)}`,
    shine: `${buzzSheen}${flecks(stubbleNapeLight, .5)}`,
  },
};

const spikeTop = [[-29.8, 0], [-30.6, -8], [-33.6, -18], [-27, -21], [-27.6, -34], [-17, -29], [-10.6, -40.6], [-3, -32], [7.6, -40], [11.6, -30], [24.6, -35.6], [24.4, -24], [34.6, -21], [31, -11], [29.8, 0]] as const;
const spikeEdge = [[29.8, 0], [28.6, 4.4], [26.8, 1], [25.6, -5.6], [18.6, -9.6], [15.4, -4.8], [7.6, -10.4], [3.4, -5], [-5, -10.6], [-9, -5.4], [-17, -10], [-23, -6], [-25.6, -5.6], [-26.8, 1], [-28.6, 4.4], [-29.8, 0]] as const;
const spikeLines = `${wisp(-17, -10, -18, -20, -25, -30, 1.4)}${wisp(-5, -10.6, -6, -22, -11, -36, 1.5)}${wisp(7.6, -10.4, 6, -22, 7, -36, 1.5)}${wisp(18.6, -9.6, 18, -20, 23, -32, 1.4)}${wisp(25.6, -7, 26, -13, 31, -19, 1.1)}`;
const spikeShine = `${wisp(-26, -30, -24, -24, -22, -19, 1.5)}${wisp(-11, -36, -11, -29, -9, -22, 1.8)}${wisp(6, -35.6, 3.6, -29, 3, -22, 1.8)}${wisp(22, -32, 18.4, -27, 15.6, -21, 1.6)}`;
const spikyTucked = 'C-31.4 -6 -31 -11 -28.6 -16.4L0 -24L28.6 -16.4C31 -11 31.4 -6 29.8 0';
const spiky: HairDrawing = {
  hairline: -8,
  hatFront: { base: `M-29.8 0${spikyTucked}${soft(spikeEdge, .42)}Z`, shade: `${wisp(-17, -10, -18, -14, -21, -19, 1.3)}${wisp(-5, -10.6, -6, -14, -8, -20, 1.3)}${wisp(7.6, -10.4, 7, -14, 8, -20, 1.3)}${wisp(18.6, -9.6, 19, -13, 22, -18, 1.3)}`, shine: `${wisp(-28, -9, -26, -13, -24, -17, 1.1)}${wisp(24, -17, 26, -13, 28, -9, 1.1)}` },
  hatBack: { base: `M-29.8 0${spikyTucked}${soft([[29.8, 0], [28.6, 12], [24, 20], [15, 25], [8, 24], [1, 27], [-7, 24.4], [-15, 25.4], [-24, 20], [-28.6, 12], [-29.8, 0]], .46)}Z`, shade: `${wisp(0, -14, -6, 4, -5, 22, 1.4)}${wisp(0, -14, 10, 2, 12, 21, 1.4)}${wisp(0, -14, -18, -4, -26, 6, 1.3)}${wisp(0, -14, 18, -6, 27, 4, 1.3)}`, shine: `${wisp(-27, -9, -24, -13, -20, -16, 1.1)}${wisp(20, -16, 24, -13, 27, -9, 1.1)}` },
  front: {
    base: `M-29.8 0${soft(spikeTop, .38)}${soft(spikeEdge, .42)}Z`,
    shade: spikeLines,
    shine: spikeShine,
  },
  back: {
    base: `M-29.8 0${soft(spikeTop, .38)}${soft([[29.8, 0], [28.6, 12], [24, 20], [15, 25], [8, 24], [1, 27], [-7, 24.4], [-15, 25.4], [-24, 20], [-28.6, 12], [-29.8, 0]], .46)}Z`,
    shade: `${wisp(4, -22, -8, -26, -11, -37, 1.5)}${wisp(4, -22, 10, -28, 7, -36, 1.5)}${wisp(4, -22, 18, -20, 23, -32, 1.4)}${wisp(4, -22, -20, -16, -25, 4, 1.4)}${wisp(4, -22, -8, 2, -5, 22, 1.5)}${wisp(4, -22, 16, 0, 14, 20, 1.5)}`,
    shine: `${wisp(-26, -30, -24, -24, -20, -16, 1.5)}${wisp(-11, -36, -10, -29, -6, -19, 1.7)}${wisp(22, -32, 19, -26, 22, -13, 1.5)}`,
  },
};

const sideTop = 'C-31 -6 -31.5 -17 -26 -24.5C-21 -31 -14 -33 -7 -33C-2 -36.4 7 -37.8 15 -35.4C23 -33 30 -26 31 -15C32 -8 31 -2 29.4 4';
const sideEdge = 'C28.4 0 27.5 -3 25.5 -5.6C20 -6.2 14 -7.6 8 -10C2 -12.4 -6 -14.6 -11.6 -14.6C-14 -11.6 -18 -8.6 -22 -6.8C-24.5 -5 -26.5 -1 -27 2C-27.6 3 -28.4 3.6 -29.4 4';
const sidePart: HairDrawing = {
  hairline: -12,
  front: {
    base: `M-29.4 4${sideTop}${sideEdge}Z`,
    shade: `${wisp(-11.6, -14.6, -12.6, -24, -11, -33, 1)}${wisp(-5, -15.6, 7, -26, 19, -31, 1.2)}${wisp(5, -12, 14, -20, 26, -24, 1.4)}${wisp(15, -8, 21, -13, 29, -14, 1.2)}${wisp(-16, -11, -20, -18, -23, -25, 1.1)}`,
    shine: `${wisp(-8, -27, 4, -34.4, 18, -31.6, 2.2)}${wisp(22, -27, 26.6, -22, 27.6, -14, 1.3)}${wisp(-25, -13, -22, -22, -15.6, -28, 1.5)}`,
  },
  back: {
    base: `M-29.4 4${sideTop}C29.4 10 29 13 28 16C25 23 15 26.4 0 26.4C-15 26.4 -25 23 -28 16C-29 13 -29.4 10 -29.4 4Z`,
    shade: `${wisp(12, -34, 9, -18, 12, 0, 1)}${wisp(9, -22, -12, -22, -26, -4, 1.4)}${wisp(10, -6, -10, -6, -24, 12, 1.4)}${wisp(16, -16, 26, -8, 25, 8, 1.2)}`,
    shine: `${wisp(-6, -28, 4, -34, 16, -31, 2.1)}${wisp(-25, -15, -21, -24, -12, -29, 1.6)}${wisp(20, -26, 25, -21, 27, -13, 1.3)}`,
  },
};

const crestTufts = [[-8.6, -14.6], [-10, -24], [-12.6, -34.6], [-8.2, -31.4], [-5.6, -40.6], [-2.6, -34], [.4, -42.4], [3.4, -34], [6, -40.8], [8.2, -31.4], [12.6, -34.8], [10, -24], [8.6, -14.6]] as const;
const ridgeTop = crestTufts.slice(1, -1);
const ridge = `M0 13C-4.4 11 -7.8 6 -8.6 0C-9.6 -7 -10.4 -15 -10 -24${soft(ridgeTop, .42)}C10.4 -15 9.6 -7 8.6 0C7.8 6 4.4 11 0 13Z`;
const ridgeOpen = ridge.slice(0, -1);
const crestOpen = `M-8.6 -14.6${soft(crestTufts, .42)}`;
const crestRootTufts = lobes([[8.6, -14.6], [4.2, -13.8], [0, -11.8], [-4.2, -13.8], [-8.6, -14.6]], .3);
const crestSoft = `${crestOpen}${crestRootTufts}Z`;
const crestShadow = 'M-10 -15C-11 -19 -11.4 -23 -11.6 -27.4L11.6 -27.4C11.4 -23 11 -19 10 -15C5 -14 -5 -14 -10 -15Z';
const sideFlecks = flecks([[-24.6, -11], [-22.4, -15.4], [-20, -19], [-20.6, -22.8], [-16.4, -24], [24.6, -11], [22.4, -15.4], [20, -19], [20.6, -22.8], [16.4, -24]], .34);
const ridgeShadow = 'M0 14.6C-5.2 12.4 -8.8 7 -9.8 0C-10.8 -7 -11.6 -15 -11.6 -27.4L11.6 -27.4C11.6 -15 10.8 -7 9.8 0C8.8 7 5.2 12.4 0 14.6Z';
const mohawk: HairDrawing = {
  hairline: -14,
  front: {
    fade: shornFade,
    fadeHigh: sideFlecks,
    under: crestShadow,
    base: crestSoft,
    edge: `${crestOpen}${crestRootTufts}`,
    shade: `${wisp(-7.4, -30, -6.4, -22, -4.2, -14.4, 1.2)}${wisp(3.2, -34, 3, -24, 1.6, -13.6, 1.3)}${wisp(8.2, -29, 7, -22, 5, -14.6, 1.1)}`,
    shine: `${wisp(-8.2, -36, -7, -29, -5.2, -21, 1.3)}${wisp(.6, -39, .2, -32, .2, -24, 1.2)}`,
  },
  hatFront: { fade: buzzUnderHat, under: hatFlecks },
  back: {
    fade: napeShape,
    fadeHigh: flecks(stubbleNape.filter(([x]) => Math.abs(x) > 15), .36),
    under: ridgeShadow,
    base: ridge,
    edge: ridgeOpen,
    shade: `${wisp(-4.6, -32, -4.4, -12, -2.2, 9, 1.2)}${wisp(3.6, -33, 4, -12, 2.2, 9, 1.2)}`,
    shine: `${wisp(-7, -28, -6, -14, -4.6, 2, 1.1)}${wisp(-.8, -38, -.8, -28, -.8, -16, 1.1)}`,
  },
  hatBack: { fade: napeShape, fadeHigh: flecks(stubbleNape.filter(([x]) => Math.abs(x) > 15), .36), under: ridgeShadow, shade: `${wisp(-5, -20, -4.6, -4, -2.6, 12, 1)}${wisp(4, -20, 4.2, -4, 2.6, 12, 1)}` },
};

const puffL = ring(-27, -24.4, 11.2, 11.2, 9, .3, .34);
const puffShade = wisp(-34, -26, -30, -32, -24, -31, 1.2) + wisp(-33, -18, -28, -14, -22, -16, 1.3) + wisp(-28, -24, -25, -27, -21, -24, 1.1);
const puffShine = wisp(-33.4, -29, -30, -33, -26, -33, 1.3) + wisp(-24, -28, -22, -29.6, -20, -27.6, .9);
/** Under a hat the puffs drop to the nape and peek out below the jaw: gathered hair, nothing near the ear. Not mirrored, so they stay lumpy. */
const lowPuffs = `${ring(-27, 23.4, 9.6, 10, 8, .25, .4)}${ring(27, 23.2, 9.8, 9.8, 9, 1.1, .36)}`;
const lowPuffShade = `${wisp(-34.6, 23, -30, 31, -20, 30, 1.2)}${wisp(-31, 18, -27, 22, -22, 19, 1)}${wisp(33.6, 24, 30, 30, 20, 30, 1.2)}${wisp(31.4, 18, 27, 23, 22, 20, 1)}`;
const lowPuffShine = `${wisp(-34, 19, -32, 15.6, -28, 15, 1.1)}${wisp(28, 15.4, 31, 15.2, 34, 19, 1.1)}`;
/** Afro texture for the back: short curling marks, never long straight strands. */
const coils = [[-22, -18, 1], [-12, -24, -1], [-16, -8, 1], [-24, -2, -1], [-8, -12, 1], [-13, 6, -1], [-22, 12, 1], [-6, 16, 1], [13, -24, 1], [22, -17, -1], [9, -12, -1], [17, -7, -1], [24, -1, 1], [13, 7, 1], [22, 13, -1], [6, 17, -1]] as const;
const coilMarks = coils.map(([x, y, d]) => wisp(x, y, x + d * 3.4, y - 2.2, x + d * 3.8, y + 2, .8)).join('');
const coilShine = [[-17, -20, 1], [-9, -27, 1], [-19, -5, 1], [11, -27, -1], [18, -20, -1], [15, -3, -1]].map(([x, y, d]) => wisp(x, y, x + d * 2.8, y - 2, x + d * 4, y + .6, .8)).join('');
const puffCap = `M-29.4 4C-31 -6 -31.5 -18 -25 -26C-19 -32 -8 -33.4 0 -33C8 -33.4 19 -32 25 -26C31.5 -18 31 -6 29.4 4C28.6 0 27 -5 24 -9.5C19 -14 8 -15 0 -18.4C-8 -15 -19 -14 -24 -9.5C-27 -5 -28.6 0 -29.4 4Z`;
const afroPuffs: HairDrawing = {
  hairline: -18, tieColor: sunny,
  rear: { base: both(puffL), shade: both(puffShade), shine: both(puffShine) },
  hatRear: { base: lowPuffs, shade: lowPuffShade, shine: lowPuffShine },
  front: {
    base: puffCap,
    shade: `${partLine}${wisp(-23, -11, -14, -17, -4, -19, 1.1)}${wisp(23, -11, 14, -17, 4, -19, 1.1)}${wisp(-16, -14, -20, -19, -23, -24, 1)}${wisp(16, -14, 20, -19, 23, -24, 1)}`,
    shine: capShine,
    ties: both(tie(-20.4, -25, -44, 5, 2.3)),
  },
  hatFront: { base: puffCap, shade: partLine, shine: capShine },
  hatBack: { base: `${fullBack}${lowPuffs}`, shade: `${wisp(0, -33, 0, -4, 0, 28, .9)}${coilMarks}${lowPuffShade}`, shine: `${coilShine}${lowPuffShine}`, ties: `${tie(-19.6, 16.6, 49, 4, 1.9)}${tie(19.6, 16.4, -49, 4, 1.9)}` },
  backBehind: { base: both(puffL), shade: both(puffShade), shine: both(puffShine) },
  back: {
    base: fullBack,
    shade: `${wisp(0, -33, 0, -4, 0, 28, .9)}${coilMarks}`,
    shine: `${coilShine}${wisp(-14, -29, -9, -31, -4, -30, 1.2)}${wisp(4, -30, 9, -31, 14, -29, 1.2)}`,
    ties: both(tie(-20.4, -25, -44, 5, 2.3)),
  },
};

const knot = 'M-10.8 -33C-11.4 -38.4 -6 -41.6 0 -41.6C6 -41.6 11.4 -38.4 10.8 -33C10.2 -28.4 5 -26.8 0 -26.8C-5 -26.8 -10.2 -28.4 -10.8 -33Z';
const knotDetail = { shade: `${wisp(-8.6, -32, -2, -29.4, 8.4, -33, 1.2)}${wisp(-6, -38, 1, -35, 8.6, -37, 1.1)}`, shine: wisp(-8.6, -35, -5, -39.6, 1, -39.8, 1.3) };
const topKnot: HairDrawing = {
  hairline: -13, tieColor: coral,
  crown: { base: knot, ...knotDetail, ties: tie(0, -28.2, 0, 7.8, 1.8) },
  backCrown: { base: knot, ...knotDetail, ties: tie(0, -28.2, 0, 7.8, 1.8) },
  front: {
    base: 'M-28.8 7C-31 3 -31.5 -4 -30.6 -12C-29.6 -20 -28 -23 -25 -26C-19 -31 -9 -31.6 0 -31C9 -31.6 19 -31 25 -26C28 -23 29.6 -20 30.6 -12C31.5 -4 31 3 28.8 7C28 8.4 26.2 8 25.8 6.4C26 1 25.8 -4 24.6 -8C19 -12 9 -13.6 0 -13.6C-9 -13.6 -19 -12 -24.6 -8C-25.8 -4 -26 1 -25.8 6.4C-26.2 8 -28 8.4 -28.8 7Z',
    shade: `${wisp(-20, -11, -12, -20, -2, -29, 1.2)}${wisp(-9, -13, -6, -21, -1, -29.6, 1.1)}${wisp(20, -11, 12, -20, 2, -29, 1.2)}${wisp(9, -13, 6, -21, 1, -29.6, 1.1)}${wisp(0, -13.6, 0, -22, 0, -30, .9)}`,
    shine: `${wisp(-26, -12, -21, -22, -11, -28, 2)}${wisp(11, -28, 21, -22, 26, -12, 2)}`,
  },
  back: {
    base: upNape,
    shade: `${wisp(-26, 8, -14, -9, -2, -29, 1.3)}${wisp(26, 8, 14, -9, 2, -29, 1.3)}${wisp(-13, 19, -5, -2, -1, -29, 1.2)}${wisp(13, 19, 5, -2, 1, -29, 1.2)}${wisp(0, 21, -.6, 4, 0, -28, 1)}`,
    shine: `${wisp(-25, -13, -18, -26, -8, -29, 2)}${wisp(8, -29, 18, -26, 25, -13, 2)}`,
  },
};

/** Soft blunt bangs with a slight smile and a few fine breaks, so the edge never looks ruled. */
const straightFront = 'M0 -34C-15 -35 -27 -30 -30.4 -16C-31.8 -6 -31.4 6 -30.4 18C-29.4 28 -27.4 37 -24.6 43.6C-23 48 -20.6 50.8 -18.6 49.6C-16.6 48 -15.6 44.6 -15.6 41C-16 36 -17.6 32 -19.6 27.4C-23.6 25 -26.6 20 -27.4 13L-27.6 6C-27 1 -24.6 -4 -20 -7.4C-15 -5.2 -11 -4.6 -7.6 -5C-7 -5.6 -6.6 -6.4 -6 -7.2C-5.4 -6.4 -4.6 -5.4 -4 -4.8C-1 -4.4 3 -4.4 7 -4.8C7.6 -5.2 8.4 -6.4 9 -7.4C9.4 -6.8 10 -6.2 10.6 -5.2C13 -5 16 -5.4 20 -7.4C24.6 -4 27 1 27.6 6L27.4 13C26.6 20 23.6 25 19.6 27.4C17.6 32 16 36 15.6 41C15.6 44.6 16.6 48 18.6 49.6C20.6 50.8 23 48 24.6 43.6C27.4 37 29.4 28 30.4 18C31.4 6 31.8 -6 30.4 -16C27 -30 15 -35 0 -34Z';
const straightMass = 'M-30 -10C-31 6 -30 22 -25 38C-20 42 20 42 25 38C30 22 31 6 30 -10Z';
const straightDome = 'M0 -34C-15 -35 -27 -30 -30.4 -16C-32 -6 -31.6 5 -31.4 14C-20 18 20 18 31.4 14C31.6 5 32 -6 30.4 -16C27 -30 15 -35 0 -34Z';
const straightLength = 'M-31.4 6C-31 15 -28.4 23 -24.6 31C-22 37 -17.6 42 -10 44.4C-5 45.8 5 45.8 10 44.4C17.6 42 22 37 24.6 31C28.4 23 31 15 31.4 6Z';
const longStraight: HairDrawing = {
  hairline: -6,
  rear: { under: straightMass, edge: straightMass },
  front: {
    base: straightFront,
    shade: `${wisp(-6, -7.2, -7, -15, -4, -24, 1.2)}${wisp(9, -7.4, 9.6, -15, 6, -24, 1.2)}${wisp(-14, -6.6, -16, -15, -14, -24, 1.1)}${wisp(16, -6.6, 18, -15, 15, -24, 1.1)}${both(wisp(-28.6, -6, -29.6, 16, -24, 45, 1.4) + wisp(-21, 30, -20, 36, -19.6, 44, 1.1))}`,
    shine: `${both(wisp(-27, -13, -19, -26, -5, -30.6, 2.2) + wisp(-30, -6, -30.6, 12, -28.6, 38, 1.2))}`,
  },
  back: {
    base: straightDome,
    edge: 'M-31.4 14C-31.6 5 -32 -6 -30.4 -16C-27 -30 -15 -35 0 -34C15 -35 27 -30 30.4 -16C32 -6 31.6 5 31.4 14',
    shade: `${wisp(0, -33, -.6, -10, 0, 14, .9)}${both(wisp(-8, -30, -10, -8, -9, 16, 1.3) + wisp(-18, -27, -20, -6, -19, 16, 1.3) + wisp(-27, -18, -28, -2, -27, 14, 1.2))}`,
    shine: both(wisp(-27, -13, -19, -26, -5, -30.6, 2.2)),
  },
  root: [0, 2], swingBehind: true,
  swing: {
    base: straightLength,
    shade: `${both(wisp(-8, 12, -9, 26, -8, 43, 1.4) + wisp(-19, 10, -20, 24, -17, 39, 1.2) + wisp(-27, 8, -26, 18, -23, 30, 1.1))}${wisp(0, 12, -.6, 28, 0, 44, .9)}`,
    shine: both(wisp(-14, 14, -14.6, 24, -14, 36, 1.5)) + wisp(-3.4, 16, -3.8, 26, -2.4, 38, 1.2),
  },
  stars: [[-27, 18], [27, 30], [-25, 38]],
};

const waveFront = 'M-13 -34.6C-22 -35.6 -28 -30 -31 -19C-36 -9 -32 -1 -36 8C-39 15 -33 21 -36.6 30C-38 37 -35 42 -30.6 42.4C-28 47 -21 47.6 -18.6 43.4C-15.6 42 -15.2 39 -15.6 36C-15.6 30 -20.4 28 -20 25.4C-24.4 23.4 -26.8 18 -27.4 13L-27.6 6C-27.4 1 -26 -3 -24.4 -5.6C-21 -8 -17 -14 -13 -21C-5 -13 6 -11.6 14 -10C18 -8 21 -5.6 22.8 -3.6C25.8 -.6 27.4 3 27.6 6L27.4 13C26.8 18 24.4 23.4 20 25.4C20.4 28 15.6 30 15.6 36C15.2 39 15.6 42 18.6 43.4C21 47.6 28 47 30.6 42.4C35 42 38 37 36.6 30C33 21 39 15 36 8C32 -1 36 -9 31 -19C24 -33 2 -36.4 -13 -34.6Z';
const waveMass = 'M-31 -8C-37.4 4 -33.6 14 -36.4 24C-38.4 33 -34.6 40 -30 41C-27 47 -18 46 -14 42C-8 46 8 46 14 42C18 46 27 47 30 41C34.6 40 38.4 33 36.4 24C33.6 14 37.4 4 31 -8Z';
const waveDome = 'M0 -34.5C-17 -35.5 -27 -30 -31 -19C-35 -9 -32 -1 -36 8C-37 11 -36.6 14 -35 16C-20 20 20 20 35 16C36.6 14 37 11 36 8C32 -1 35 -9 31 -19C27 -30 17 -35.5 0 -34.5Z';
const waveLength = 'M-36 8C-39 15 -33 21 -36.6 30C-38 37 -33 43 -27 42C-24 49 -15 50 -11 45C-7 51 7 51 11 45C15 50 24 49 27 42C33 43 38 37 36.6 30C33 21 39 15 36 8Z';
const longWavy: HairDrawing = {
  hairline: -19,
  rear: { under: waveMass, edge: waveMass },
  front: {
    base: waveFront,
    shade: `${wisp(-13, -33, -13.6, -27, -13, -21, .8)}${wisp(-30, -8, -33, 6, -28, 14, 1.5)}${wisp(-28, 16, -33, 24, -26, 32, 1.5)}${wisp(-26, 32, -27, 37, -22, 41, 1.3)}${wisp(30, -8, 33, 6, 28, 14, 1.5)}${wisp(28, 16, 33, 24, 26, 32, 1.5)}${wisp(26, 32, 27, 37, 22, 41, 1.3)}${wisp(-7, -19, 4, -14, 17, -9.6, 1.4)}${wisp(-15, -18, -20, -14, -25, -8, 1.2)}`,
    shine: `${wisp(-27, -13, -22, -26, -11, -31, 2)}${wisp(-4, -31, 14, -30, 27, -14, 2.3)}${wisp(-33, 8, -36, 15, -33.6, 22, 1.4)}${wisp(-33, 27, -35, 33, -31, 39, 1.3)}${wisp(33, 8, 36, 15, 33.6, 22, 1.4)}${wisp(33, 27, 35, 33, 31, 39, 1.3)}`,
  },
  back: {
    base: waveDome,
    edge: 'M-35 16C-36.6 14 -37 11 -36 8C-32 -1 -35 -9 -31 -19C-27 -30 -17 -35.5 0 -34.5C17 -35.5 27 -30 31 -19C35 -9 32 -1 36 8C37 11 36.6 14 35 16',
    shade: `${wisp(-10, -30, -16, -8, -9, 6, 1.5)}${wisp(10, -30, 16, -8, 9, 6, 1.5)}${wisp(-25, -14, -30, 2, -23, 14, 1.5)}${wisp(25, -14, 30, 2, 23, 14, 1.5)}`,
    shine: `${wisp(-27, -13, -17, -28, -2, -31, 2.2)}${wisp(2, -31, 17, -28, 27, -13, 2.2)}`,
  },
  root: [0, 2], swingBehind: true,
  swing: {
    base: waveLength,
    shade: `${wisp(-9, 8, -15, 22, -8, 42, 1.5)}${wisp(9, 8, 15, 22, 8, 42, 1.5)}${wisp(-24, 14, -31, 28, -24, 40, 1.5)}${wisp(24, 14, 31, 28, 24, 40, 1.5)}${wisp(0, 12, 3, 28, 0, 44, 1.2)}`,
    shine: `${wisp(-17, 12, -21, 21, -15, 30, 1.6)}${wisp(17, 12, 21, 21, 15, 30, 1.6)}`,
  },
  stars: [[-29, 14], [28, 30], [-27, 34]],
};

const pigBunch = 'M-25 -18C-31 -23 -36.6 -18 -38.4 -8C-39.4 3 -38.8 14 -35.6 25C-34.6 29 -31.6 30 -31 26.6C-30.4 19 -27.4 14 -27.6 5C-27.8 -2 -28 -6 -26.4 -9.4C-25.4 -12 -24.6 -15 -25 -18Z';
const pigShade = wisp(-29, -13, -33, 4, -32, 24, 1.5) + 'M-27.4 -9C-28.6 -3 -28.4 2 -28.4 6C-28.4 13 -30 20 -31 26.6C-30.4 19 -27.4 14 -27.6 5C-27.8 -2 -28 -6 -26.4 -9.4Z';
const pigShine = wisp(-34, -17, -37, -4, -35.4, 10, 1.6) + wisp(-35, 12, -35, 16, -33.6, 21, 1);
const pigCap = `M-29.2 4C-31 -6 -31.5 -18 -25 -26C-19 -32.4 -8 -34 0 -34C8 -34 19 -32.4 25 -26C31.5 -18 31 -6 29.2 4${lobes([[29.2, 4], [24.4, -6.4], [14.6, -6.6], [5, -6.8], [-5, -6.8], [-14.6, -6.6], [-24.4, -6.4], [-29.2, 4]], .3)}Z`;
const pigtails: HairDrawing = {
  hairline: -6, tieColor: sunny,
  rear: { base: both(pigBunch), shade: both(pigShade), shine: both(pigShine) },
  front: {
    base: pigCap,
    shade: `${partLine}${wisp(-5, -6.8, -7, -15, -4, -23, 1.2)}${wisp(5, -6.8, 7, -15, 4, -23, 1.2)}${wisp(-14.6, -6.6, -17, -15, -13, -24, 1.2)}${wisp(14.6, -6.6, 17, -15, 13, -24, 1.2)}`,
    shine: capShine,
    ties: both(tie(-26.4, -15.6, 70, 4.8, 2.3)),
  },
  hatFront: {
    base: pigCap,
    shade: `${partLine}${wisp(-5, -6.8, -7, -15, -4, -23, 1.2)}${wisp(5, -6.8, 7, -15, 4, -23, 1.2)}${wisp(-14.6, -6.6, -17, -15, -13, -24, 1.2)}${wisp(14.6, -6.6, 17, -15, 13, -24, 1.2)}`,
    ties: both(tie(-33, -5, 84, 4.6, 2.2)),
  },
  hatBack: { base: fullBack, shade: `${wisp(0, -33, 0, -4, 0, 28, .9)}${wisp(-15, 23, -14, 0, -16, -24, 1.2)}${wisp(15, 23, 14, 0, 16, -24, 1.2)}`, shine: `${wisp(-23, -20, -16, -28, -5, -30, 2)}${wisp(5, -30, 16, -28, 23, -20, 2)}` },
  backBehind: { base: both(pigBunch), shade: both(pigShade), shine: both(pigShine) },
  back: {
    base: fullBack,
    shade: `${wisp(0, -33, 0, -4, 0, 28, .9)}${wisp(-23, 7, -24, -4, -25, -15, 1.2)}${wisp(23, 7, 24, -4, 25, -15, 1.2)}${wisp(-15, 23, -14, 0, -16, -24, 1.2)}${wisp(15, 23, 14, 0, 16, -24, 1.2)}`,
    shine: `${wisp(-23, -20, -16, -28, -5, -30, 2)}${wisp(5, -30, 16, -28, 23, -20, 2)}`,
    ties: both(tie(-26.4, -15.6, 70, 4.8, 2.3)),
  },
};

const bobFront = 'M0 -34.5C-17 -35.5 -31 -29 -33.5 -13C-35 -2 -35 10 -32.5 20C-31 24 -27 26 -23 24.5C-21 23.5 -20.5 21.5 -20.8 19C-22 13 -22.6 7 -22.2 1C-22 -.6 -21.6 -2 -21 -3C-14 -3.4 -6 -6.4 1 -11C6 -14 10 -16.4 13.4 -19C15.6 -15 18.6 -10.6 20.4 -7.6C21.6 -5 22 -2.4 22.2 1C22.6 7 22 13 20.8 19C20.5 21.5 21 23.5 23 24.5C27 26 31 24 32.5 20C35 10 35 -2 33.5 -13C31 -29 17 -35.5 0 -34.5Z';
const bob: HairDrawing = {
  hairline: -8,
  rear: { under: 'M-32 -6C-33.6 6 -33 16 -29 22C-20 25 20 25 29 22C33 16 33.6 6 32 -6Z', edge: 'M-32 -6C-33.6 6 -33 16 -29 22C-20 25 20 25 29 22C33 16 33.6 6 32 -6Z' },
  front: {
    base: bobFront,
    shade: `${wisp(13.4, -19, 13.4, -26, 12, -33, .9)}${wisp(5, -14, -2, -24, -12, -30, 1.3)}${wisp(-6, -6, -14, -15, -22, -22, 1.3)}${wisp(-15, -3, -21, -8, -27, -14, 1.2)}${wisp(19, -9, 23, -18, 21, -27, 1.2)}${both(wisp(-28, -7, -29.6, 8, -27, 22, 1.5) + 'M-22.2 1C-22.6 7 -22 13 -20.8 19C-20.5 21.5 -21 23.5 -23 24.5C-23.6 18 -24.6 9 -24.4 1Z')}`,
    shine: `${wisp(-26, -16, -14, -28, 6, -31, 2.2)}${wisp(19, -30, 26, -24, 29, -13, 1.8)}${both(wisp(-31, -5, -32, 6, -30.6, 16, 1.5))}`,
  },
  back: {
    base: 'M0 -34.5C-17 -35.5 -31 -29 -33.5 -13C-35 -2 -35 8 -32 17C-29.6 23 -22 27 -12 27.6C-6 28 6 28 12 27.6C22 27 29.6 23 32 17C35 8 35 -2 33.5 -13C31 -29 17 -35.5 0 -34.5Z',
    shade: `${both(wisp(-8, -30, -11, -2, -7, 27, 1.3) + wisp(-18, -27, -21.6, -2, -16, 25, 1.3) + wisp(-28, -14, -30, 4, -25, 21, 1.2))}`,
    shine: `${both(wisp(-27, -13, -19, -26, -5, -30.6, 2.2) + wisp(-14, 0, -15, 8, -13, 17, 1.4))}`,
  },
};

export const hairDrawings: Readonly<Record<IslanderLook['hairStyle'], HairDrawing>> = {
  crop, curls, ponytail, braids, 'buzz-cut': buzz, 'short-spiky': spiky, 'side-part': sidePart, 'afro-puffs': afroPuffs, 'top-knot': topKnot, 'long-straight': longStraight, 'long-wavy': longWavy, pigtails, bob, 'mohawk-fade': mohawk,
};

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const light = (c: string) => { const [r, g, b] = hex(c); return (.2126 * r + .7152 * g + .0722 * b) / 255; };
export type HairTones = Readonly<{ base: string; under: string; shade: string; shine: string; sheen: string; line: string; fade: string; fadeHigh: string; backFade: string; napeFade: string }>;
const toneCache = new Map<string, HairTones>();
/** Shadow, base, shine and outline all come from the chosen colour. Dark hair gets a cool sheen so it keeps form. */
export function hairTones(color: IslanderLook['hairColor'], skin: IslanderLook['skinTone']): HairTones {
  const key = `${color}:${skin}`, found = toneCache.get(key); if (found) return found;
  const c = hairColors[color], s = skinTones[skin], l = light(c), dark = l < .2;
  const base = dark ? mix(c, '#5C6684', .1) : c;
  const shine = color === 'galaxy' ? '#8A7BE0' : dark ? mix(c, '#9DB2E6', .42) : l > .62 ? mix(c, '#FFFFFF', .55) : mix(c, '#FFEFD2', .36);
  const shade = color === 'galaxy' ? '#232149' : dark ? mix(c, '#000000', .3) : l > .5 ? mix(c, '#6B4656', .38) : mix(c, '#2A1A22', .3);
  const line = dark ? mix(c, '#05060A', .55) : mix(c, '#33262A', l > .62 ? .8 : .72);
  // A short fade stays visibly hair on every skin tone, even blonde on sand or silver on cocoa.
  const apart = (tone: string, deep = .5) => Math.abs(light(tone) - light(s)) >= .06 ? tone : light(s) > .42 ? mix(tone, line, .4) : mix(tone, '#120B0A', deep), cool = color === 'galaxy' ? '#6B5FC8' : '#6F7892';
  const shorn = apart(dark ? mix(base, cool, .12) : mix(base, s, .04), .78);
  const tones = { base, under: mix(shorn, shade, light(shorn) < light(shade) ? .22 : .32), shade, shine: color === 'lightning-streak' ? '#FFD84D' : shine, sheen: mix(shorn, shine, dark ? .5 : .3), line, fade: apart(dark ? mix(mix(base, s, .2), cool, .06) : mix(base, s, .3), .55), fadeHigh: shorn, backFade: dark ? mix(base, s, .08) : mix(base, s, .3), napeFade: mix(base, s, dark ? .2 : .3) };
  toneCache.set(key, tones);
  return tones;
}
/** Under a hat the crown packs down, so nothing pokes through the top. */
const pressed = (d: string) => mapPath(d, (x, y) => {
  const packed = y < -18 ? -18 + (y + 18) * .55 : y, side = Math.abs(x);
  return [x, Math.max(packed, side >= 24 ? -17 : side >= 19 ? -20 : -99)];
});
const rolled = (d: string) => mapPath(d, (x, y) => [x * 12 / 28, y * 12 / 28]);
const mapLayer = (layer: HairLayer | undefined, f: (d: string) => string): HairLayer | undefined => layer && Object.fromEntries(Object.entries(layer).map(([k, v]) => [k, f(k === 'base' ? sameWinding(v as string) : v as string)]));
const cache = new Map<string, HairDrawing>();
/** Memoized per style and fit, so a pose change costs only one group transform. */
export function hairFor(style: IslanderLook['hairStyle'], covered: boolean, compact: boolean): HairDrawing {
  const key = `${style}:${covered}:${compact}`, found = cache.get(key); if (found) return found;
  const raw = hairDrawings[style], f = (d: string) => { const a = covered ? pressed(d) : d; return compact ? rolled(a) : a; };
  const drawing: HairDrawing = { ...raw, rear: mapLayer(covered && raw.hatRear ? raw.hatRear : raw.rear, f), backBehind: mapLayer(covered && raw.hatRear && raw.backBehind ? raw.hatRear : raw.backBehind, f), front: mapLayer(covered && raw.hatFront ? raw.hatFront : raw.front, f)!, back: mapLayer(covered && raw.hatBack ? raw.hatBack : raw.back, f)!, swing: mapLayer(raw.swing, f), crown: covered ? undefined : mapLayer(raw.crown, f), backCrown: covered ? undefined : mapLayer(raw.backCrown, f), hairline: raw.hairline };
  cache.set(key, drawing);
  return drawing;
}
const star = (x: number, y: number, r: number) => `M${num(x)} ${num(y - r)}Q${num(x + r * .18)} ${num(y - r * .18)} ${num(x + r)} ${num(y)}Q${num(x + r * .18)} ${num(y + r * .18)} ${num(x)} ${num(y + r)}Q${num(x - r * .18)} ${num(y + r * .18)} ${num(x - r)} ${num(y)}Q${num(x - r * .18)} ${num(y - r * .18)} ${num(x)} ${num(y - r)}Z`;
/** Showpiece overlays for the two earned colours, placed from the style's own hairline. */
export function hairSpecial(style: IslanderLook['hairStyle'], color: IslanderLook['hairColor'], back: boolean, covered: boolean, compact: boolean) {
  if (color !== 'galaxy' && color !== 'lightning-streak') return undefined;
  const raw = hairDrawings[style], end = back ? -2 : Math.max(-27, raw.hairline - 1.5), f = (d: string) => { const a = covered ? pressed(d) : d; return compact ? rolled(a) : a; };
  if (color === 'lightning-streak') {
    const top = style === 'buzz-cut' || style === 'mohawk-fade' ? -26.6 : -31, t = (u: number) => top + (end - top) * u;
    const bolt = `M5.4 ${num(t(0))}L.6 ${num(t(.5))}L3.6 ${num(t(.46))}L.4 ${num(t(1))}L6.8 ${num(t(.4))}L3.8 ${num(t(.44))}L8 ${num(t(0))}Z`;
    // Short hair gives the bolt less height, so it gets more width.
    return { bolt: f(style === 'buzz-cut' ? mapPath(bolt, (x, y) => [4 + (x - 4) * 1.7, y]) : bolt) };
  }
  const crown: (readonly [number, number, number])[] = [[-14, -26, 2.6], [5, -29, 2], [16, -21, 2.8], [-5, Math.max(-24, end - 3), 1.7]];
  return { stars: f([...crown, ...(back || !raw.stars ? [] : raw.stars.map(([x, y]) => [x, y, 2.3] as const)), ...(back ? [[-13, -6, 2.2] as const, [11, -9, 1.8] as const] : [])].map(([x, y, r]) => star(x, y, r)).join('')) };
}
