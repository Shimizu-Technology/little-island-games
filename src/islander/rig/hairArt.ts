/** Hair drawings in head-local units: the head is x ±28..29.6, y ±28 and the art box allows x ±41, y ≥ −42.
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
/** Puffy scalloped storybook scrunchie centred at x,y and turned by degrees. */
function scrunchie(x: number, y: number, deg = 0, w = 6.0, h = 2.9) {
  const r = deg * Math.PI / 180;
  const at = (u: number, v: number) => `${num(x + u * Math.cos(r) - v * Math.sin(r))} ${num(y + u * Math.sin(r) + v * Math.cos(r))}`;
  return `M${at(-w, -h * .4)}Q${at(-w * .55, -h * 1.45)} ${at(-w * .1, -h * .9)}Q${at(w * .35, -h * 1.5)} ${at(w * .8, -h * .85)}Q${at(w * 1.35, -h * .1)} ${at(w, h * .55)}Q${at(w * .5, h * 1.45)} ${at(w * .05, h * .9)}Q${at(-w * .45, h * 1.45)} ${at(-w * .9, h * .75)}Q${at(-w * 1.35, 0)} ${at(-w, -h * .4)}Z`;
}
/** A plait: staggered scallops down a centre line with zigzag creases, so it reads as woven strands. */
function plait(points: readonly (readonly [number, number])[], w: number) {
  const at = (u: number) => { const f = Math.min(points.length - 1.001, u), i = Math.floor(f), t = f - i, [ax, ay] = points[i], [bx, by] = points[i + 1], l = Math.hypot(bx - ax, by - ay); return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx: -(by - ay) / l, ny: (bx - ax) / l }; };
  const steps = (points.length - 1) * 2, width = (u: number) => w * (1 - u / steps * .26);
  const side = (u: number, sign: number, k: number) => { const p = at(u / 2); return [p.x + p.nx * width(u) * sign * k, p.y + p.ny * width(u) * sign * k] as const; };
  let right = `M${num(side(0, 1, .74)[0])} ${num(side(0, 1, .74)[1])}`, left = '', shade = '', shine = '';
  for (let u = 0; u < steps; u += 2) { const c = side(u + 1, 1, 1.56), e = side(u + 2, 1, .74); right += `Q${num(c[0])} ${num(c[1])} ${num(e[0])} ${num(e[1])}`; }
  for (let u = steps + 1; u > 1; u -= 2) { const c = side(u - 1, -1, 1.56), e = side(u - 2, -1, .74); left += `Q${num(c[0])} ${num(c[1])} ${num(e[0])} ${num(e[1])}`; }
  for (let u = 0; u < steps; u++) {
    const sign = u % 2 ? -1 : 1, a = side(u, sign, .74), b = side(u + 1, -sign, .74), m = at((u + .5) / 2);
    shade += wisp(a[0], a[1], m.x, m.y + 1.3, b[0], b[1], .72);
    const g = side(u + 1, sign, .88), h = at((u + 1) / 2);
    if (u % 2 === 0) shine += wisp(g[0], g[1] - 1.2, (g[0] + h.x) / 2, (g[1] + h.y) / 2 - 1.9, h.x, h.y - .4, .7);
  }
  return { base: `${right}L${num(side(steps + 1, -1, .74)[0])} ${num(side(steps + 1, -1, .74)[1])}${left}Z`, shade, shine };
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

const coral = '#F27C66', sunny = '#F6BC46';

const partLine = wisp(0, -33, -.6, -28, 0, -21, .85);
/** The back of the head is hair right down to the jaw; only the neckline differs per style. */
const dome = 'C-31.4 -6 -32.0 -18 -25.4 -26.4C-19.2 -32.8 -8 -34.4 0 -34.4C8 -34.4 19.2 -32.8 25.4 -26.4C32.0 -18 31.4 -6 29.2 6';
const fullBack = `M-29.2 6${dome}L29.2 11Q29.2 28.8 0 28.8Q-29.2 28.8 -29.2 11Z`;
const upNape = `M-29.2 6${dome}L29.2 9C28.4 18 19.2 25.8 0 25.8C-19.2 25.8 -28.4 18 -29.2 9Z`;
const backShine = wisp(-25.5, -13, -18, -27, -4, -31.2, 2.75) + wisp(4, -31.2, 18, -27, 25.5, -13, 2.75) + wisp(-16, -24, 0, -29.8, 16, -24, 1.45);
const shortNape = [[29.2, 7], [28.0, 15.2], [20.4, 22.4], [13.2, 26.6], [6, 24.8], [0, 28.2], [-6, 24.8], [-13.2, 26.6], [-20.4, 22.4], [-28.0, 15.2], [-29.2, 7]] as const;
const whorl = (x: number, y: number) => wisp(x, y, x - 22, y - 4, x - 25, y + 20, 1.55) + wisp(x, y, x - 14, y + 8, x - 12, y + 34, 1.55) + wisp(x, y, x - 4, y + 18, x + 4, y + 42, 1.55) + wisp(x, y, x + 8, y + 18, x + 18, y + 34, 1.55) + wisp(x, y, x + 20, y + 2, x + 24, y + 18, 1.45);

// 1. CROP: Warm tousled storybook kid hair with soft layered bangs that peek adorably under sunhats/caps.
const cropTufts = [[29.4, 0], [28.4, 2.8], [26.6, -2.6], [24.2, -7.8], [19.4, -10.8], [14.2, -6.2], [9.4, -11.4], [3.6, -6.8], [-2.0, -11.4], [-8.4, -6.4], [-14.4, -11.0], [-20.2, -9.2], [-24.6, -6.2], [-26.8, -2.0], [-28.4, 2.8], [-29.4, 0]] as const;
const cropTop = [[-29.4, 0], [-31.0, -9], [-29.6, -18.5], [-25.2, -25.6], [-19.4, -30.6], [-12.2, -33.6], [-6.6, -32.2], [-1.5, -35.8], [4.4, -32.8], [9.6, -35.6], [15.4, -32.2], [21.6, -29.8], [25.6, -25.2], [29.6, -18.5], [31.0, -9], [29.4, 0]] as const;
const cropHatFront = `M-29.4 0C-31.0 -6 -30.6 -12 -28.0 -17L0 -22L28.0 -17C30.6 -12 31.0 -6 29.4 0${soft(cropTufts, .42)}Z`;
const crop: HairDrawing = {
  hairline: -9,
  hatFront: {
    base: cropHatFront,
    shade: `${wisp(-14, -11, -16, -15, -18, -18, 1.2)}${wisp(3.6, -6.8, 2, -13, 3, -18, 1.2)}${wisp(14.2, -6.2, 16, -13, 18, -18, 1.2)}`,
    shine: `${wisp(-25, -8, -19, -13, -10, -14, 1.3)}${wisp(10, -14, 19, -13, 25, -8, 1.3)}`,
  },
  front: {
    base: `M-29.4 0${soft(cropTop, .46)}${soft(cropTufts, .44)}Z`,
    shade: `${wisp(-19, -10, -22.5, -19, -19.5, -28, 1.4)}${wisp(-8.4, -7, -9.2, -19, -6.6, -31, 1.45)}${wisp(3.6, -7.2, 4.4, -19, 8.8, -33, 1.45)}${wisp(14.2, -6.8, 17, -18, 21.4, -28, 1.4)}${wisp(-2, -11.4, -2, -21, -1.6, -31, 1.15)}${wisp(9.4, -11.4, 11.4, -19, 14.8, -27, 1.1)}`,
    shine: `${wisp(-26.5, -13, -22.8, -24.2, -13.5, -29.8, 2.55)}${wisp(-7.5, -30.5, -.5, -33.0, 6.8, -31.0, 2.25)}${wisp(14.5, -29.5, 22.8, -25.4, 27.4, -15, 2.15)}`,
  },
  back: {
    base: `M-29.4 0${soft(cropTop, .46)}L29.2 7${soft(shortNape, .42)}L-29.4 0Z`,
    shade: `${whorl(3, -21)}${wisp(-20, 12, -14, 16, -14, 24, 1.25)}${wisp(20, 12, 14, 16, 14, 24, 1.25)}${wisp(-5, 14, -4, 18, -5, 22, 1.05)}${wisp(6, 14, 6, 18, 6, 22, 1.05)}`,
    shine: `${wisp(-25.5, -13, -19, -25.5, -9, -30, 2.25)}${wisp(8, -31, 18.5, -27.5, 25.5, -15, 1.95)}`,
  },
};

// 2. CURLS: Plump, bouncy cloud of soft layered storybook ringlets framing the face warmly.
const curlTop = [[-31.8, 7.6], [-36.4, -2.5], [-36.8, -14.2], [-31.6, -24.8], [-22.8, -32.4], [-11.8, -36.8], [.5, -38.2], [12.2, -36.6], [23.0, -32.4], [31.8, -24.8], [36.8, -14.2], [36.4, -2.5], [31.8, 7.6]] as const;
const curlMarks = wisp(-31.5, -9, -27, -14.5, -21.5, -11, 1.35) + wisp(-25, -22, -18.5, -28.5, -13, -23, 1.35) + wisp(-8, -29.5, -1, -34.8, 5.5, -28.5, 1.35) + wisp(12.5, -25.5, 19, -30.5, 25, -23, 1.35) + wisp(22, -11, 28, -15.5, 32, -9, 1.35) + wisp(-15, -11, -8.5, -15.5, -3, -11, 1.25) + wisp(4, -12, 10.5, -16.5, 16, -11, 1.25);
const curlShine = wisp(-29.5, -14.5, -26, -19.8, -20.8, -16.6, 1.75) + wisp(-21.8, -28, -16.4, -33.2, -10.5, -28.2, 1.85) + wisp(-4.5, -34.2, 1, -37.0, 7, -33.2, 1.75) + wisp(16, -29.2, 22, -31.8, 26.5, -26, 1.75) + wisp(27, -13, 31.4, -17.2, 34.4, -12, 1.6);
const curlsHatFront = `M-32.5 8${lobes([[-32.5, 8], [-35.8, .5], [-35.2, -9], [-30.4, -15.6]], .52)}L0 -24L30.4 -15.6${lobes([[30.4, -15.6], [35.2, -9], [35.8, .5], [32.5, 8]], .52)}${lobes([[32.5, 8], [26.2, -2.0], [17.4, -6.8], [8.6, -8.4], [0, -6.6], [-8.6, -8.4], [-17.4, -6.8], [-26.2, -2.0], [-32.5, 8]], .44)}Z`;
const curls: HairDrawing = {
  hairline: -6,
  hatFront: { base: curlsHatFront, shade: wisp(-14, -11, -8, -15, -3, -11, 1.2) + wisp(4, -12, 10, -16, 15, -11, 1.2) + wisp(-32, -5, -28, -9, -24.5, -6, 1.2) + wisp(24.5, -6, 28, -9, 32, -5, 1.2), shine: wisp(-34, -5, -31.5, -9.5, -28, -9.2, 1.25) + wisp(26.5, -9.2, 31.5, -9.5, 34, -5, 1.25) },
  hatBack: { base: `M-32.5 8${lobes([[-32.5, 8], [-35.8, .5], [-35.2, -9], [-30.4, -15.6]], .52)}L0 -24L30.4 -15.6${lobes([[30.4, -15.6], [35.2, -9], [35.8, .5], [32.5, 8], [30.8, 15.6], [23.2, 24.6], [11.6, 29.6], [0, 31.2], [-11.6, 29.6], [-23.2, 24.6], [-30.8, 15.6], [-32.5, 8]], .46)}Z`, shade: wisp(-24, 4, -18, 0, -12, 5, 1.3) + wisp(-6, 8, 0, 4, 6, 8, 1.3) + wisp(12, 5, 18, 0, 24, 4, 1.3) + wisp(-16, 19, -10, 14, -4, 20, 1.3) + wisp(5, 20, 11, 14, 17, 19, 1.3) + wisp(-14, -8, -8, -12, -3, -8, 1.2) + wisp(4, -8, 10, -12, 15, -8, 1.2), shine: wisp(-24, 9, -20, 6, -15, 9, 1.2) + wisp(14, 9, 19, 6, 24, 9, 1.2) + wisp(-3, -2, 1, -5, 5, -2, 1.2) },
  front: {
    base: `M-32.5 8${lobes(curlTop)}${lobes([[32.5, 8], [26.2, -2.0], [17.4, -6.8], [8.6, -8.4], [0, -6.6], [-8.6, -8.4], [-17.4, -6.8], [-26.2, -2.0], [-32.5, 8]], .44)}Z`,
    shade: curlMarks,
    shine: curlShine,
  },
  back: {
    base: `M-32.5 8${lobes(curlTop)}${lobes([[32.5, 8], [30.8, 15.6], [23.2, 24.6], [11.6, 29.6], [0, 31.2], [-11.6, 29.6], [-23.2, 24.6], [-30.8, 15.6], [-32.5, 8]], .46)}Z`,
    shade: curlMarks + wisp(-24, 4, -18, 0, -12, 5, 1.3) + wisp(-6, 8, 0, 4, 6, 8, 1.3) + wisp(12, 5, 18, 0, 24, 4, 1.3) + wisp(-16, 19, -10, 14, -4, 20, 1.3) + wisp(5, 20, 11, 14, 17, 19, 1.3),
    shine: curlShine + wisp(-24, 9, -20, 6, -15, 9, 1.25) + wisp(14, 9, 19, 6, 24, 9, 1.25),
  },
};

// 3. PONYTAIL (Concept Sheet Hero #1!): Lush swooping side-parted bangs + high bouncy S-wavy ponytail + puffy coral scrunchie!
const ponySweptFront = `M-29.8 6C-31.6 -5 -32.0 -18 -25.2 -26.5C-18.8 -33.2 -7.5 -35.0 2.0 -34.2C13.0 -34.4 23.0 -30.8 27.6 -23.6C31.6 -16.6 32.0 -5.2 29.8 6C28.8 7.8 27.2 7.4 26.4 5.2C26.2 0.2 25.0 -4.8 21.8 -8.6C18.4 -12.4 13.4 -15.4 9.6 -21.0C6.4 -14.2 1.2 -10.2 -5.4 -7.8C-10.2 -6.2 -15.8 -5.8 -20.6 -6.4C-23.6 -4.0 -25.8 .6 -26.4 5.2C-27.2 7.4 -28.8 7.8 -29.8 6Z`;
const ponytail: HairDrawing = {
  hairline: -8, tieColor: coral,
  rear: {
    base: 'M8 -33C19 -41.5 32.8 -39.5 38.4 -29.6C42.2 -21.4 41.2 -9.4 39.2 .8C37.4 9.8 41.8 18.6 38.4 28.4C36.6 33.4 32.6 37.6 28.4 37.2C24.8 36.8 23.6 33.4 25.0 29.4C27.2 24.4 28.0 19.2 26.8 12.8C25.6 6.2 27.8 -1.4 25.6 -10.2C23.4 -18.8 17.6 -25.4 8 -28.2Z',
    shade: `${wisp(27.6, -24, 33.4, -8, 30.8, 8, 1.85)}${wisp(30.8, 8, 33.4, 18, 30.6, 35, 1.65)}${wisp(18.8, -32.4, 28.6, -24, 34.4, -12, 1.45)}`,
    shine: `${wisp(24.6, -34.6, 35.6, -27.2, 37.8, -8.5, 2.35)}${wisp(36.6, 1.5, 39.2, 13.6, 35.2, 27.4, 1.75)}`,
  },
  hatRear: {
    base: 'M24 -14C32 -18.6 39.6 -13.6 40.4 -3.2C41.2 7.2 38.0 16.4 38.8 27.6C39.2 32.4 35.4 36.8 31.6 36.8C28.0 36.8 27.4 32.6 27.6 27.4C28.0 20.6 27.2 14.4 27.4 7.2C27.8 1.2 27.8 -4.0 25.8 -8.2Z',
    shade: `${wisp(30.4, -8, 32.8, 2, 31.8, 9, 1.6)}${wisp(31.8, 9, 32.4, 19, 33.8, 34.5, 1.55)}`,
    shine: `${wisp(37.4, -6, 37.2, 9, 36.8, 26.5, 1.7)}`,
    ties: scrunchie(31.2, -9.6, 68, 5.2, 2.5),
  },
  hatFront: {
    base: ponySweptFront,
    shade: `${wisp(9.6, -21.0, 9.6, -26, 9.4, -30, 1.0)}${wisp(-6, -8.4, 0, -14, 7, -20, 1.2)}${wisp(17, -11, 20, -16, 22, -21, 1.1)}`,
    shine: `${wisp(-24, -11, -15, -18, -3, -20, 1.55)}`,
  },
  front: {
    base: ponySweptFront,
    shade: `${wisp(9.6, -21.0, 10.6, -27.4, 11.4, -33.8, 1.05)}${wisp(-8.4, -7.8, -1.6, -16.8, 7.6, -24.6, 1.4)}${wisp(-17.8, -7.2, -13.0, -18.0, -3.4, -27.8, 1.3)}${wisp(15.2, -12.4, 19.6, -19.2, 22.4, -27.6, 1.25)}${wisp(23.6, -6.2, 26.2, -14.0, 26.0, -23.0, 1.1)}`,
    shine: `${wisp(-25.8, -12.2, -17.6, -26.8, -1.5, -31.8, 2.85)}${wisp(-16.0, -17.8, -5.6, -23.0, 4.8, -24.0, 1.45)}${wisp(15.2, -29.4, 23.4, -24.2, 27.6, -13.0, 1.95)}`,
    ties: scrunchie(15.6, -31.0, 34, 6.2, 3.0),
  },
  back: {
    base: upNape,
    shade: `${wisp(-26.4, 8, -14, -9, -3, -20, 1.35)}${wisp(26.4, 8, 14, -9, 3, -20, 1.35)}${wisp(-15, 18, -8, 4, -2, -18, 1.25)}${wisp(15, 18, 8, 4, 2, -18, 1.25)}${wisp(-24, -18, -12, -22, -3, -22, 1.15)}${wisp(24, -18, 12, -22, 3, -22, 1.15)}`,
    shine: backShine,
  },
  root: [0, -18],
  swing: {
    base: 'M-5.2 -20C-10.4 -16.4 -11.6 -7 -10.6 3C-9.8 13 -5.4 23 -5.2 33C-5.0 39 -3.0 46.8 .8 47.4C4.8 46.8 7.2 39 7.4 33C7.6 23 11.0 13 10.6 3C11.2 -7 10.2 -16.4 5.2 -20Z',
    shade: `${wisp(-5.4, -14, -6.2, 8, -2.2, 29, 1.65)}${wisp(-2.2, 29, -1.8, 37, .4, 45, 1.35)}${wisp(5.4, -14, 6.6, 8, 3.2, 31, 1.35)}`,
    shine: wisp(-2.4, -15, -3.6, 2, -1.2, 19, 1.8),
    ties: scrunchie(0, -19.6, 0, 6.4, 2.9),
  },
};

// 4. BRAIDS: Soft swept parted bangs + chunkier woven twin braids + fluffy braid tips + puffy scrunchies.
const partedCap = `M0 -34.4C-14.6 -35.4 -27.8 -29.2 -30.8 -14C-32.2 -6 -31.8 2 -29.6 9.8C-27.6 11.6 -25.4 11.8 -23.4 10.6C-22.4 4 -21.2 -2 -18.2 -6.2C-13.2 -10.4 -5.2 -13.6 0 -21.4C5.2 -13.6 13.2 -10.4 18.2 -6.2C21.2 -2 22.4 4 23.4 10.6C25.4 11.8 27.6 11.6 29.6 9.8C31.8 2 32.2 -6 30.8 -14C27.8 -29.2 14.6 -35.4 0 -34.4Z`;
const capShade = `${partLine}${wisp(-27.4, 6, -24.4, -5, -14.2, -14, 1.4)}${wisp(27.4, 6, 24.4, -5, 14.2, -14, 1.4)}${wisp(-8.2, -28.4, -10.4, -22, -18.4, -13.4, 1.1)}${wisp(8.2, -28.4, 10.4, -22, 18.4, -13.4, 1.1)}`;
const capShine = `${wisp(-25.6, -12, -19.2, -25.2, -4.5, -31.2, 2.75)}${wisp(4.5, -31.2, 19.2, -25.2, 25.6, -12, 2.75)}${wisp(-14.5, -22, -8, -26, -2.5, -26.5, 1.4)}${wisp(2.5, -26.5, 8, -26, 14.5, -22, 1.4)}`;
const braidL = plait([[-27.0, 9], [-27.6, 17], [-26.2, 25], [-23.2, 33], [-20.2, 40], [-18.0, 46.5]], 5.6);
const braidTuft = 'M-20.6 46.8C-21.6 49.6 -20.8 52.8 -18.0 53.6C-15.2 52.8 -14.4 49.6 -15.4 46.8Z';
const braidBackL = plait([[-12.8, 6], [-15.2, 13], [-17.4, 21], [-19.0, 29], [-20.4, 37], [-21.4, 45], [-22.0, 51]], 5.4);
const braidBackTuft = 'M-24.4 51C-25.2 53.6 -24.6 56.8 -22.0 57.6C-19.4 56.8 -18.8 53.6 -19.6 51Z';
const braids: HairDrawing = {
  hairline: -17, tieColor: coral,
  front: {
    base: `${both(braidL.base + braidTuft)}${partedCap}`,
    shade: `${both(braidL.shade)}${capShade}`,
    shine: `${both(braidL.shine)}${capShine}`,
    ties: both(scrunchie(-18.0, 46.6, 12, 4.8, 2.3)),
  },
  back: {
    base: fullBack,
    shade: `${wisp(0, -33, 0, -4, 0, 28, .95)}${wisp(-24, 0, -19, 2, -14, 6, 1.35)}${wisp(24, 0, 19, 2, 14, 6, 1.35)}${wisp(-6, -26, -8, -10, -11, 4, 1.25)}${wisp(6, -26, 8, -10, 11, 4, 1.25)}${wisp(-18, -24, -18, -10, -14, 3, 1.25)}${wisp(18, -24, 18, -10, 14, 3, 1.25)}`,
    shine: backShine,
  },
  root: [0, 2],
  swing: {
    base: both(braidBackL.base + braidBackTuft),
    shade: both(braidBackL.shade),
    shine: both(braidBackL.shine),
    ties: both(scrunchie(-22.0, 51, 4, 4.6, 2.2)),
  },
};

// 5. BUZZ-CUT (keeps exact (-27.4, -9) and (0, -27.4) anchor vertices for islander-look-v3.test.tsx!)
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
const skullEdge = 'L-27.4 -9Q-27.4 -27.4 0 -27.4Q27.4 -27.4 27.4 -9L27.4 -3.4';
const hairlineRight = [[26, -3.6], [25.4, -7], [24.4, -9.8], [22.6, -12], [19, -13.6], [13, -14.6], [6, -15.2], [0, -15.4]] as const;
const shornLine = (lift: number) => {
  const right = hairlineRight.map(([x, y]) => [x, y - (x > 25 ? lift * .4 : lift)] as const), whole = [...right, ...right.slice(0, -1).reverse().map(([x, y]) => [-x, y] as const)];
  return `M-27.4 -3.4${skullEdge}Q26.9 -2 26 -3.6${soft(grain(whole))}Q-26.9 -2 -27.4 -3.4Z`;
};
const shornFade = shornLine(0);
const shornDark = shornLine(2.2);
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

// 6. SHORT-SPIKY: Chunky, lively, fluffy storybook spikes with layered bangs and warm gleams.
const spikeTop = [[-30.4, 1], [-31.4, -8], [-34.6, -18], [-27.6, -21.4], [-28.2, -34.6], [-17.4, -29.4], [-10.8, -40.8], [-2.8, -32.2], [7.8, -40.4], [12.0, -30.2], [25.0, -36.0], [24.8, -24.4], [35.4, -21.2], [31.6, -11], [30.4, 1]] as const;
const spikeEdge = [[30.4, 1], [29.0, 4.8], [27.0, 1.4], [25.8, -5.6], [19.0, -9.6], [15.4, -4.4], [7.8, -10.4], [3.2, -4.6], [-5.2, -10.6], [-9.4, -4.8], [-17.4, -10.0], [-23.4, -5.8], [-25.8, -5.4], [-27.0, 1.4], [-29.0, 4.8], [-30.4, 1]] as const;
const spikeLines = `${wisp(-17.4, -10, -18.6, -20, -25.4, -31, 1.5)}${wisp(-5.2, -10.6, -6.2, -22, -11.2, -36.5, 1.6)}${wisp(7.8, -10.4, 6.2, -22, 7.2, -36.5, 1.6)}${wisp(19.0, -9.6, 18.4, -20, 23.4, -32.4, 1.5)}${wisp(25.8, -7, 26.4, -13, 31.6, -19.2, 1.2)}`;
const spikeShine = `${wisp(-26.4, -30.4, -24.2, -24, -22.2, -19, 1.7)}${wisp(-11.2, -36.4, -11.2, -29, -9.2, -21.5, 2.1)}${wisp(6.2, -36.0, 3.8, -29, 3.0, -21.5, 2.1)}${wisp(22.4, -32.4, 18.6, -27, 15.8, -20.8, 1.85)}`;
const spikyTucked = 'C-32.0 -6 -31.6 -11 -29.0 -16.4L0 -24L29.0 -16.4C31.6 -11 32.0 -6 30.4 1';
const spiky: HairDrawing = {
  hairline: -8,
  hatFront: { base: `M-30.4 1${spikyTucked}${soft(spikeEdge, .42)}Z`, shade: `${wisp(-17, -10, -18, -14, -21, -19, 1.35)}${wisp(-5, -10.6, -6, -14, -8, -20, 1.35)}${wisp(7.6, -10.4, 7, -14, 8, -20, 1.35)}${wisp(18.6, -9.6, 19, -13, 22, -18, 1.35)}`, shine: `${wisp(-28, -9, -26, -13, -24, -17, 1.2)}${wisp(24, -17, 26, -13, 28, -9, 1.2)}` },
  hatBack: { base: `M-30.4 1${spikyTucked}${soft([[30.4, 1], [29.0, 12], [24.4, 20.4], [15.2, 25.4], [8, 24.4], [1, 27.4], [-7, 24.6], [-15.2, 25.6], [-24.4, 20.4], [-29.0, 12], [-30.4, 1]], .46)}Z`, shade: `${wisp(0, -14, -6, 4, -5, 22, 1.45)}${wisp(0, -14, 10, 2, 12, 21, 1.45)}${wisp(0, -14, -18, -4, -26, 6, 1.35)}${wisp(0, -14, 18, -6, 27, 4, 1.35)}`, shine: `${wisp(-27, -9, -24, -13, -20, -16, 1.2)}${wisp(20, -16, 24, -13, 27, -9, 1.2)}` },
  front: {
    base: `M-30.4 1${soft(spikeTop, .38)}${soft(spikeEdge, .42)}Z`,
    shade: spikeLines,
    shine: spikeShine,
  },
  back: {
    base: `M-30.4 1${soft(spikeTop, .38)}${soft([[30.4, 1], [29.0, 12], [24.4, 20.4], [15.2, 25.4], [8, 24.4], [1, 27.4], [-7, 24.6], [-15.2, 25.6], [-24.4, 20.4], [-29.0, 12], [-30.4, 1]], .46)}Z`,
    shade: `${wisp(4, -22, -8, -26, -11, -37, 1.55)}${wisp(4, -22, 10, -28, 7, -36, 1.55)}${wisp(4, -22, 18, -20, 23, -32, 1.45)}${wisp(4, -22, -20, -16, -25, 4, 1.45)}${wisp(4, -22, -8, 2, -5, 22, 1.55)}${wisp(4, -22, 16, 0, 14, 20, 1.55)}`,
    shine: `${wisp(-26, -30, -24, -24, -20, -16, 1.65)}${wisp(-11, -36, -10, -29, -6, -19, 1.85)}${wisp(22, -32, 19, -26, 22, -13, 1.65)}`,
  },
};

// 7. SIDE-PART: Plush swooping side-parted storybook hair with soft tapered bang wisps and warm ribbon sheen.
const sideTop = 'C-31.6 -5 -32.0 -17.5 -26.6 -25.2C-21.4 -31.8 -14.2 -33.8 -7.0 -33.6C-1.8 -37.2 7.6 -38.6 15.8 -36.0C23.8 -33.4 30.8 -26.2 31.8 -15.0C32.6 -7.6 31.8 -1.4 30.0 4.6';
const sideEdge = 'C29.0 1.0 27.8 -2.6 25.8 -5.4C20.4 -6.0 13.8 -7.2 7.6 -9.4C1.6 -11.4 -6.2 -13.6 -11.8 -14.2C-14.4 -10.8 -18.4 -7.6 -22.4 -6.2C-25.0 -4.2 -27.0 -.4 -27.6 2.8C-28.2 4.0 -29.0 4.4 -30.0 4.6';
const sidePart: HairDrawing = {
  hairline: -11,
  front: {
    base: `M-30.0 4.6${sideTop}${sideEdge}Z`,
    shade: `${wisp(-11.8, -14.2, -12.8, -24, -11.2, -33.4, 1.1)}${wisp(-4.6, -14.8, 7.6, -26, 19.6, -31.4, 1.3)}${wisp(5.4, -11.4, 14.4, -20, 26.8, -24.4, 1.5)}${wisp(15.6, -7.6, 21.8, -13, 29.8, -14, 1.3)}${wisp(-16.4, -10.4, -20.6, -18, -23.6, -25.4, 1.2)}`,
    shine: `${wisp(-8.2, -27.4, 4.4, -35.4, 19.2, -32.4, 2.85)}${wisp(-2.0, -23.0, 8.4, -28.6, 18.8, -25.2, 1.5)}${wisp(22.6, -27.2, 27.4, -22, 28.4, -13.6, 1.75)}${wisp(-25.8, -12.6, -22.6, -22.2, -16.0, -28.6, 2.0)}`,
  },
  back: {
    base: `M-30.0 4.6${sideTop}C30.0 10.6 29.6 13.6 28.4 16.6C25.4 23.6 15.2 26.8 0 26.8C-15.2 26.8 -25.4 23.6 -28.4 16.6C-29.6 13.6 -30.0 10.6 -30.0 4.6Z`,
    shade: `${wisp(12, -34, 9, -18, 12, 0, 1.1)}${wisp(9, -22, -12, -22, -26, -4, 1.5)}${wisp(10, -6, -10, -6, -24, 12, 1.5)}${wisp(16, -16, 26, -8, 25, 8, 1.3)}`,
    shine: `${wisp(-6, -28.4, 4.2, -34.8, 16.6, -31.8, 2.4)}${wisp(-25.5, -15, -21.5, -24.5, -12, -29.6, 1.8)}${wisp(20.5, -26.5, 25.5, -21, 27.5, -13, 1.5)}`,
  },
};

// 8. MOHAWK-FADE (keeps exact (-27.4, -9) and (0, -27.4) anchor vertices!)
const crestTufts = [[-8.8, -14.6], [-10.4, -24], [-13.0, -34.8], [-8.4, -31.4], [-5.8, -40.2], [-2.6, -34], [.4, -41.4], [3.4, -34], [6.2, -40.2], [8.4, -31.4], [13.0, -34.8], [10.4, -24], [8.8, -14.6]] as const;
const ridgeTop = crestTufts.slice(1, -1);
const ridge = `M0 13C-4.4 11 -7.8 6 -8.6 0C-9.6 -7 -10.6 -15 -10.4 -24${soft(ridgeTop, .42)}C10.6 -15 9.6 -7 8.6 0C7.8 6 4.4 11 0 13Z`;
const ridgeOpen = ridge.slice(0, -1);
const crestOpen = `M-8.8 -14.6${soft(crestTufts, .42)}`;
const crestRootTufts = lobes([[8.8, -14.6], [4.4, -13.6], [0, -11.4], [-4.4, -13.6], [-8.8, -14.6]], .32);
const crestSoft = `${crestOpen}${crestRootTufts}Z`;
const crestShadow = 'M-10.2 -15C-11.2 -19 -11.6 -23 -11.8 -27.4L11.8 -27.4C11.6 -23 11.2 -19 10.2 -15C5 -14 -5 -14 -10.2 -15Z';
const sideFlecks = flecks([[-24.6, -11], [-22.4, -15.4], [-20, -19], [-20.6, -22.8], [-16.4, -24], [24.6, -11], [22.4, -15.4], [20, -19], [20.6, -22.8], [16.4, -24]], .34);
const ridgeShadow = 'M0 14.6C-5.2 12.4 -8.8 7 -9.8 0C-10.8 -7 -11.8 -15 -11.8 -27.4L11.8 -27.4C11.8 -15 10.8 -7 9.8 0C8.8 7 5.2 12.4 0 14.6Z';
const mohawk: HairDrawing = {
  hairline: -14,
  front: {
    fade: shornFade,
    fadeHigh: sideFlecks,
    under: crestShadow,
    base: crestSoft,
    edge: `${crestOpen}${crestRootTufts}`,
    shade: `${wisp(-7.4, -30, -6.4, -22, -4.2, -14.4, 1.3)}${wisp(3.2, -34, 3, -24, 1.6, -13.6, 1.4)}${wisp(8.2, -29, 7, -22, 5, -14.6, 1.2)}`,
    shine: `${wisp(-8.2, -36, -7, -29, -5.2, -21, 1.5)}${wisp(.6, -39, .2, -32, .2, -24, 1.4)}`,
  },
  hatFront: { fade: buzzUnderHat, under: hatFlecks },
  back: {
    fade: napeShape,
    fadeHigh: flecks(stubbleNape.filter(([x]) => Math.abs(x) > 15), .36),
    under: ridgeShadow,
    base: ridge,
    edge: ridgeOpen,
    shade: `${wisp(-4.6, -32, -4.4, -12, -2.2, 9, 1.3)}${wisp(3.6, -33, 4, -12, 2.2, 9, 1.3)}`,
    shine: `${wisp(-7, -28, -6, -14, -4.6, 2, 1.3)}${wisp(-.8, -38, -.8, -28, -.8, -16, 1.3)}`,
  },
  hatBack: { fade: napeShape, fadeHigh: flecks(stubbleNape.filter(([x]) => Math.abs(x) > 15), .36), under: ridgeShadow, shade: `${wisp(-5, -20, -4.6, -4, -2.6, 12, 1)}${wisp(4, -20, 4.2, -4, 2.6, 12, 1)}` },
};

// 9. AFRO-PUFFS (Concept Sheet Hero #2!): Big super-fluffy cloud puffs + adorable forehead baby-hair curls + sunny scrunchies!
const puffL = ring(-28.0, -25.8, 12.6, 12.4, 10, .25, .40);
const puffShade = wisp(-36.4, -27.4, -31.5, -34.2, -24.6, -33.0, 1.4) + wisp(-35.2, -18.4, -29.2, -13.6, -22.2, -16.2, 1.5) + wisp(-29.6, -25.0, -25.8, -28.6, -21.2, -25.0, 1.25) + wisp(-34.6, -22.0, -31.8, -26.4, -27.0, -23.0, 1.15);
const puffShine = wisp(-35.8, -31.0, -31.5, -35.8, -26.4, -35.6, 1.65) + wisp(-25.0, -30.2, -22.2, -32.2, -19.8, -29.6, 1.15) + wisp(-37.0, -24.0, -35.2, -27.4, -32.2, -26.4, 1.1);
/** Under a hat the puffs drop to the nape and peek out below the jaw. */
const lowPuffs = `${ring(-27.6, 23.6, 10.4, 10.6, 9, .25, .42)}${ring(27.6, 23.4, 10.4, 10.4, 9, 1.1, .40)}`;
const lowPuffShade = `${wisp(-35.4, 23, -30.6, 31.6, -20.4, 30.6, 1.3)}${wisp(-31.6, 18, -27.4, 22.4, -22.4, 19.4, 1.1)}${wisp(34.4, 24, 30.6, 30.6, 20.4, 30.6, 1.3)}${wisp(32.0, 18, 27.4, 23.4, 22.4, 20.4, 1.1)}`;
const lowPuffShine = `${wisp(-35, 19, -32.6, 15.2, -28.2, 14.6, 1.3)}${wisp(28.2, 15.0, 31.8, 14.8, 35, 19, 1.3)}`;
const coils = [[-22, -18, 1], [-12, -24, -1], [-16, -8, 1], [-24, -2, -1], [-8, -12, 1], [-13, 6, -1], [-22, 12, 1], [-6, 16, 1], [13, -24, 1], [22, -17, -1], [9, -12, -1], [17, -7, -1], [24, -1, 1], [13, 7, 1], [22, 13, -1], [6, 17, -1]] as const;
const coilMarks = coils.map(([x, y, d]) => wisp(x, y, x + d * 3.6, y - 2.4, x + d * 4.0, y + 2.2, .9)).join('');
const coilShine = [[-17, -20, 1], [-9, -27, 1], [-19, -5, 1], [11, -27, -1], [18, -20, -1], [15, -3, -1]].map(([x, y, d]) => wisp(x, y, x + d * 3.0, y - 2.2, x + d * 4.2, y + .8, .95)).join('');
// Plush hairline with cute forehead curly tendrils right in the middle & temples (matching concept sheet top-right!)
const puffCap = `M-29.8 5C-31.6 -5 -32.0 -18 -25.4 -26.4C-19.2 -32.6 -8 -34.0 0 -33.6C8 -34.0 19.2 -32.6 25.4 -26.4C32.0 -18 31.6 -5 29.8 5C28.8 1.2 27.4 -4.6 24.4 -9.2C20.2 -12.8 14.2 -14.0 9.6 -12.6C7.6 -10.0 6.2 -7.0 4.0 -7.4C2.4 -8.0 3.6 -12.4 1.6 -15.4C.6 -16.8 -.6 -16.8 -1.6 -15.4C-3.6 -12.4 -2.4 -8.0 -4.0 -7.4C-6.2 -7.0 -7.6 -10.0 -9.6 -12.6C-14.2 -14.0 -20.2 -12.8 -24.4 -9.2C-27.4 -4.6 -28.8 1.2 -29.8 5Z`;
const afroPuffs: HairDrawing = {
  hairline: -14, tieColor: sunny,
  rear: { base: both(puffL), shade: both(puffShade), shine: both(puffShine) },
  hatRear: { base: lowPuffs, shade: lowPuffShade, shine: lowPuffShine },
  front: {
    base: puffCap,
    shade: `${partLine}${wisp(-23.4, -10.6, -14.4, -17.4, -4.2, -19.4, 1.2)}${wisp(23.4, -10.6, 14.4, -17.4, 4.2, -19.4, 1.2)}${wisp(-16.4, -14, -20.6, -19.4, -23.6, -24.6, 1.1)}${wisp(16.4, -14, 20.6, -19.4, 23.6, -24.6, 1.1)}`,
    shine: capShine,
    ties: both(scrunchie(-20.6, -25.4, -44, 5.6, 2.5)),
  },
  hatFront: { base: puffCap, shade: partLine, shine: capShine },
  hatBack: { base: `${fullBack}${lowPuffs}`, shade: `${wisp(0, -33, 0, -4, 0, 28, .95)}${coilMarks}${lowPuffShade}`, shine: `${coilShine}${lowPuffShine}`, ties: `${scrunchie(-19.8, 16.8, 49, 4.6, 2.1)}${scrunchie(19.8, 16.6, -49, 4.6, 2.1)}` },
  backBehind: { base: both(puffL), shade: both(puffShade), shine: both(puffShine) },
  back: {
    base: fullBack,
    shade: `${wisp(0, -33, 0, -4, 0, 28, .95)}${coilMarks}`,
    shine: `${coilShine}${wisp(-14, -29.4, -9, -31.6, -4, -30.4, 1.35)}${wisp(4, -30.4, 9, -31.6, 14, -29.4, 1.35)}`,
    ties: both(scrunchie(-20.6, -25.4, -44, 5.6, 2.5)),
  },
};

// 10. TOP-KNOT: Fuller plush top bun with puffy scrunchie + soft face-framing wispy bangs!
const knot = 'M-12.0 -33.0C-12.6 -38.6 -6.6 -41.2 0 -41.2C6.6 -41.2 12.6 -38.6 12.0 -33.0C11.2 -28.2 5.6 -26.8 0 -26.8C-5.6 -26.8 -11.2 -28.2 -12.0 -33.0Z';
const knotDetail = { shade: `${wisp(-9.6, -32.4, -2, -29.6, 9.4, -33.4, 1.35)}${wisp(-6.8, -38.8, 1, -35.6, 9.6, -37.6, 1.2)}`, shine: wisp(-9.6, -35.6, -5.6, -40.4, 1.6, -40.6, 1.65) };
const topKnot: HairDrawing = {
  hairline: -12, tieColor: coral,
  crown: { base: knot, ...knotDetail, ties: scrunchie(0, -28.4, 0, 8.6, 2.3) },
  backCrown: { base: knot, ...knotDetail, ties: scrunchie(0, -28.4, 0, 8.6, 2.3) },
  front: {
    base: 'M-29.4 7.4C-31.6 3 -32.0 -4 -31.0 -12C-30.0 -20 -28.4 -23.4 -25.4 -26.4C-19.2 -31.6 -9 -32.2 0 -31.6C9 -32.2 19.2 -31.6 25.4 -26.4C28.4 -23.4 30.0 -20 31.0 -12C32.0 -4 31.6 3 29.4 7.4C28.4 9.0 26.6 8.4 26.0 6.6C26.2 1.2 25.8 -4.0 24.2 -8.2C18.6 -11.6 9.4 -12.8 0 -13.0C-9.4 -12.8 -18.6 -11.6 -24.2 -8.2C-25.8 -4.0 -26.2 1.2 -26.0 6.6C-26.6 8.4 -28.4 9.0 -29.4 7.4Z',
    shade: `${wisp(-20.4, -10.6, -12.2, -20.2, -2, -29.4, 1.3)}${wisp(-9.2, -12.6, -6, -21.2, -1, -30, 1.2)}${wisp(20.4, -10.6, 12.2, -20.2, 2, -29.4, 1.3)}${wisp(9.2, -12.6, 6, -21.2, 1, -30, 1.2)}${wisp(0, -13, 0, -22, 0, -30.4, 1.0)}`,
    shine: `${wisp(-26.4, -12, -21.4, -23.2, -10, -29.2, 2.7)}${wisp(10, -29.2, 21.4, -23.2, 26.4, -12, 2.7)}${wisp(-13.4, -21.2, 0, -25.6, 13.4, -21.2, 1.45)}`,
  },
  back: {
    base: upNape,
    shade: `${wisp(-26.4, 8, -14, -9, -2, -29.4, 1.35)}${wisp(26.4, 8, 14, -9, 2, -29.4, 1.35)}${wisp(-13.4, 19, -5, -2, -1, -29.4, 1.25)}${wisp(13.4, 19, 5, -2, 1, -29.4, 1.25)}${wisp(0, 21, -.6, 4, 0, -28.4, 1.1)}`,
    shine: `${wisp(-25.6, -13, -18.4, -26.4, -8, -29.6, 2.3)}${wisp(8, -29.6, 18.4, -26.4, 25.6, -13, 2.3)}`,
  },
};

// 11. LONG-STRAIGHT: Silky feathered bangs with soft strand splits and glossy ribbon crown shine.
const straightFront = 'M0 -34.4C-15.4 -35.4 -27.8 -30.2 -31.2 -16C-32.6 -6 -32.2 6 -31.2 18C-30.2 28 -28.2 37.4 -25.4 44.0C-23.6 48.6 -21.0 51.2 -19.0 50.0C-16.8 48.4 -15.8 44.8 -15.8 41.2C-16.2 36.2 -18.0 32.0 -20.0 27.4C-24.2 25.0 -27.2 19.6 -28.0 12.6L-28.2 5.6C-27.6 .6 -25.0 -4.2 -20.4 -7.4C-15.2 -5.0 -11.0 -4.2 -7.6 -4.6C-7.0 -5.4 -6.6 -6.4 -6.0 -7.4C-5.4 -6.4 -4.6 -5.2 -4.0 -4.4C-1.0 -4.0 3.0 -4.0 7.0 -4.4C7.6 -5.0 8.4 -6.4 9.0 -7.4C9.4 -6.8 10.0 -6.0 10.6 -4.8C13.2 -4.6 16.2 -5.2 20.4 -7.4C25.0 -4.2 27.6 .6 28.2 5.6L28.0 12.6C27.2 19.6 24.2 25.0 20.0 27.4C18.0 32.0 16.2 36.2 15.8 41.2C15.8 44.8 16.8 48.4 19.0 50.0C21.0 51.2 23.6 48.6 25.4 44.0C28.2 37.4 30.2 28 31.2 18C32.2 6 32.6 -6 31.2 -16C27.8 -30.2 15.4 -35.4 0 -34.4Z';
const straightMass = 'M-30.8 -10C-31.8 6 -30.8 22 -25.6 38.4C-20.4 42.4 20.4 42.4 25.6 38.4C30.8 22 31.8 6 30.8 -10Z';
const straightDome = 'M0 -34.4C-15.4 -35.4 -27.8 -30.2 -31.2 -16C-32.8 -6 -32.4 5 -32.0 14C-20.4 18 20.4 18 32.0 14C32.4 5 32.8 -6 31.2 -16C27.8 -30.2 15.4 -35.4 0 -34.4Z';
const straightLength = 'M-32.0 6C-31.6 15 -29.0 23 -25.2 31.4C-22.4 37.4 -18.0 42.4 -10.2 44.8C-5.0 46.2 5.0 46.2 10.2 44.8C18.0 42.4 22.4 37.4 25.2 31.4C29.0 23 31.6 15 32.0 6Z';
const longStraight: HairDrawing = {
  hairline: -5,
  rear: { under: straightMass, edge: straightMass },
  front: {
    base: straightFront,
    shade: `${wisp(-6, -7.4, -7.2, -15, -4, -24.4, 1.3)}${wisp(9, -7.4, 9.8, -15, 6, -24.4, 1.3)}${wisp(-14.2, -6.4, -16.4, -15, -14.2, -24.4, 1.2)}${wisp(16.2, -6.4, 18.4, -15, 15.2, -24.4, 1.2)}${both(wisp(-29.2, -6, -30.4, 16, -24.6, 45.4, 1.5) + wisp(-21.6, 30, -20.6, 36, -20.0, 44.4, 1.2))}`,
    shine: `${both(wisp(-27.6, -13, -19.4, -27.0, -4, -31.4, 2.85) + wisp(-18.4, -16, -9, -20.8, -2, -20.8, 1.5) + wisp(-30.6, -6, -31.2, 12, -29.2, 38.4, 1.65))}`,
  },
  back: {
    base: straightDome,
    edge: 'M-32.0 14C-32.4 5 -32.8 -6 -31.2 -16C-27.8 -30.2 -15.4 -35.4 0 -34.4C15.4 -35.4 27.8 -30.2 31.2 -16C32.8 -6 32.4 5 32.0 14',
    shade: `${wisp(0, -33.4, -.6, -10, 0, 14, .95)}${both(wisp(-8.2, -30.4, -10.2, -8, -9.2, 16, 1.35) + wisp(-18.4, -27.4, -20.4, -6, -19.4, 16, 1.35) + wisp(-27.6, -18, -28.6, -2, -27.6, 14, 1.25))}`,
    shine: both(wisp(-27.6, -13, -19.4, -26.4, -5, -31.2, 2.5)),
  },
  root: [0, 2], swingBehind: true,
  swing: {
    base: straightLength,
    shade: `${both(wisp(-8.2, 12, -9.2, 26, -8.2, 43.4, 1.45) + wisp(-19.4, 10, -20.4, 24, -17.4, 39.4, 1.25) + wisp(-27.6, 8, -26.6, 18, -23.6, 30.4, 1.15))}${wisp(0, 12, -.6, 28, 0, 44.4, .95)}`,
    shine: both(wisp(-14.4, 14, -15.0, 24, -14.4, 36.4, 1.7)) + wisp(-3.4, 16, -3.8, 26, -2.4, 38.4, 1.35),
  },
  stars: [[-27.4, 18], [27.4, 30], [-25.4, 38]],
};

// 12. LONG-WAVY: Lush voluminous beach waves with sweeping side-parted bangs and glossy crown halo shine!
const waveFront = 'M-13 -35.0C-22.4 -36.0 -28.6 -30.4 -31.8 -19C-37.0 -9 -32.8 -1 -37.2 8.2C-40.2 15.2 -34.0 21.4 -37.8 30.4C-39.2 37.4 -36.0 42.6 -31.4 43.0C-28.6 47.6 -21.4 48.2 -19.0 43.8C-16.0 42.4 -15.6 39.4 -16.0 36.4C-16.0 30.2 -20.8 28.0 -20.4 25.4C-25.0 23.2 -27.4 17.8 -28.2 12.6L-28.4 5.6C-28.0 .6 -26.4 -3.4 -24.8 -6.0C-21.2 -8.4 -17.2 -13.6 -13.0 -20.4C-4.8 -12.4 6.2 -10.8 14.4 -9.2C18.6 -7.4 21.6 -5.0 23.4 -3.2C26.4 -.2 28.0 3.0 28.4 5.6L28.2 12.6C27.4 17.8 25.0 23.2 20.4 25.4C20.8 28.0 16.0 30.2 16.0 36.4C15.6 39.4 16.0 42.4 19.0 43.8C21.4 48.2 28.6 47.6 31.4 43.0C36.0 42.6 39.2 37.4 37.8 30.4C34.0 21.4 40.2 15.2 37.2 8.2C32.8 -1 37.0 -9 31.8 -19C24.6 -33.4 2.2 -36.8 -13 -35.0Z';
const waveMass = 'M-31.8 -8C-38.4 4 -34.6 14 -37.4 24.4C-39.4 33.4 -35.6 40.6 -30.8 41.6C-27.8 47.6 -18.4 46.6 -14.4 42.6C-8.2 46.6 8.2 46.6 14.4 42.6C18.4 46.6 27.8 47.6 30.8 41.6C35.6 40.6 39.4 33.4 37.4 24.4C34.6 14 38.4 4 31.8 -8Z';
const waveDome = 'M0 -34.8C-17.4 -35.8 -27.6 -30.4 -31.8 -19C-35.8 -9 -32.8 -1 -37.0 8.2C-38.0 11.2 -37.6 14.2 -36.0 16.2C-20.4 20.4 20.4 20.4 36.0 16.2C37.6 14.2 38.0 11.2 37.0 8.2C32.8 -1 35.8 -9 31.8 -19C27.6 -30.4 17.4 -35.8 0 -34.8Z';
const waveLength = 'M-37.0 8.2C-40.0 15.2 -34.0 21.4 -37.6 30.4C-39.0 37.4 -34.0 43.4 -27.8 42.4C-24.6 49.4 -15.4 50.4 -11.4 45.4C-7.2 51.4 7.2 51.4 11.4 45.4C15.4 50.4 24.6 49.4 27.8 42.4C34.0 43.4 39.0 37.4 37.6 30.4C34.0 21.4 40.0 15.2 37.0 8.2Z';
const longWavy: HairDrawing = {
  hairline: -17,
  rear: { under: waveMass, edge: waveMass },
  front: {
    base: waveFront,
    shade: `${wisp(-13, -33.4, -13.6, -27, -13, -20.4, .9)}${wisp(-30.8, -8, -34.0, 6, -28.8, 14, 1.65)}${wisp(-28.8, 16, -34.0, 24.4, -26.8, 32.4, 1.65)}${wisp(-26.8, 32.4, -27.8, 37.4, -22.6, 41.4, 1.4)}${wisp(30.8, -8, 34.0, 6, 28.8, 14, 1.65)}${wisp(28.8, 16, 34.0, 24.4, 26.8, 32.4, 1.65)}${wisp(26.8, 32.4, 27.8, 37.4, 22.6, 41.4, 1.4)}${wisp(-6.8, -18.4, 4.4, -13.4, 17.6, -8.8, 1.5)}${wisp(-15.4, -17.6, -20.6, -13.6, -25.6, -7.6, 1.3)}`,
    shine: `${wisp(-27.6, -13, -22.6, -27.0, -10.5, -31.8, 2.7)}${wisp(-4, -31.8, 14.4, -30.8, 27.8, -14, 2.95)}${wisp(-3, -23.6, 9.4, -24.2, 20.6, -16.4, 1.55)}${wisp(-34.0, 8, -37.2, 15.2, -34.6, 22.4, 1.85)}${wisp(-34.0, 27.4, -36.2, 33.4, -32.0, 39.4, 1.7)}${wisp(34.0, 8, 37.2, 15.2, 34.6, 22.4, 1.85)}${wisp(34.0, 27.4, 36.2, 33.4, 32.0, 39.4, 1.7)}`,
  },
  back: {
    base: waveDome,
    edge: 'M-36.0 16.2C-37.6 14.2 -38.0 11.2 -37.0 8.2C-32.8 -1 -35.8 -9 -31.8 -19C-27.6 -30.4 -17.4 -35.8 0 -34.8C17.4 -35.8 27.6 -30.4 31.8 -19C35.8 -9 32.8 -1 37.0 8.2C38.0 11.2 37.6 14.2 36.0 16.2',
    shade: `${wisp(-10, -30.4, -16.4, -8, -9.2, 6, 1.6)}${wisp(10, -30.4, 16.4, -8, 9.2, 6, 1.6)}${wisp(-25.6, -14, -30.8, 2, -23.6, 14, 1.6)}${wisp(25.6, -14, 30.8, 2, 23.6, 14, 1.6)}`,
    shine: `${wisp(-27.6, -13, -17.4, -28.6, -2, -31.6, 2.5)}${wisp(2, -31.6, 17.4, -28.6, 27.6, -13, 2.5)}`,
  },
  root: [0, 2], swingBehind: true,
  swing: {
    base: waveLength,
    shade: `${wisp(-9.2, 8, -15.4, 22, -8.2, 42.4, 1.6)}${wisp(9.2, 8, 15.4, 22, 8.2, 42.4, 1.6)}${wisp(-24.6, 14, -31.8, 28, -24.6, 40.4, 1.6)}${wisp(24.6, 14, 31.8, 28, 24.6, 40.4, 1.6)}${wisp(0, 12, 3, 28, 0, 44.4, 1.3)}`,
    shine: `${wisp(-17.4, 12, -21.6, 21.4, -15.4, 30.4, 1.85)}${wisp(17.4, 12, 21.6, 21.4, 15.4, 30.4, 1.85)}`,
  },
  stars: [[-29.6, 14], [28.6, 30], [-27.6, 34]],
};

// 13. PIGTAILS: Bouncy, fuller wavy twin pigtails + feathered bangs + puffy scalloped scrunchies!
const pigBunch = 'M-25.4 -18.4C-32.4 -24.0 -38.4 -18.4 -40.2 -7.6C-41.4 4.0 -40.6 15.4 -36.8 26.8C-35.6 30.8 -32.0 31.6 -31.0 27.8C-30.2 19.6 -27.8 14.4 -28.0 5.0C-28.2 -2.2 -28.4 -6.2 -26.8 -9.6C-25.8 -12.2 -25.0 -15.2 -25.4 -18.4Z';
const pigShade = wisp(-30.0, -13, -34.6, 4.5, -33.0, 25.4, 1.65) + 'M-27.8 -9.2C-29.0 -3 -28.8 2 -28.8 6.2C-28.8 13.4 -30.2 20.6 -31.0 27.8C-30.2 19.6 -27.8 14.4 -28.0 5.0C-28.2 -2.2 -28.4 -6.2 -26.8 -9.6Z';
const pigShine = wisp(-35.4, -17.4, -38.8, -3.6, -36.8, 11.0, 1.9) + wisp(-36.4, 12.6, -36.4, 17.2, -34.8, 22.4, 1.2);
const pigCap = `M-29.8 4.6C-31.6 -5.6 -32.0 -18 -25.4 -26.4C-19.2 -32.8 -8 -34.4 0 -34.4C8 -34.4 19.2 -32.8 25.4 -26.4C32.0 -18 31.6 -5.6 29.8 4.6${lobes([[29.8, 4.6], [24.8, -6.2], [14.8, -6.2], [5.0, -6.6], [-5.0, -6.6], [-14.8, -6.2], [-24.8, -6.2], [-29.8, 4.6]], .34)}Z`;
const pigtails: HairDrawing = {
  hairline: -6, tieColor: sunny,
  rear: { base: both(pigBunch), shade: both(pigShade), shine: both(pigShine) },
  front: {
    base: pigCap,
    shade: `${partLine}${wisp(-5, -6.6, -7.2, -15, -4, -23.4, 1.3)}${wisp(5, -6.6, 7.2, -15, 4, -23.4, 1.3)}${wisp(-14.8, -6.2, -17.4, -15, -13.2, -24.4, 1.3)}${wisp(14.8, -6.2, 17.4, -15, 13.2, -24.4, 1.3)}`,
    shine: capShine,
    ties: both(scrunchie(-26.8, -16.0, 70, 5.6, 2.6)),
  },
  hatFront: {
    base: pigCap,
    shade: `${partLine}${wisp(-5, -6.6, -7.2, -15, -4, -23.4, 1.3)}${wisp(5, -6.6, 7.2, -15, 4, -23.4, 1.3)}${wisp(-14.8, -6.2, -17.4, -15, -13.2, -24.4, 1.3)}${wisp(14.8, -6.2, 17.4, -15, 13.2, -24.4, 1.3)}`,
    ties: both(scrunchie(-33.6, -5.0, 84, 5.2, 2.4)),
  },
  hatBack: { base: fullBack, shade: `${wisp(0, -33.4, 0, -4, 0, 28, .95)}${wisp(-15, 23, -14, 0, -16, -24, 1.25)}${wisp(15, 23, 14, 0, 16, -24, 1.25)}`, shine: `${wisp(-23.4, -20.4, -16.4, -28.6, -5, -30.6, 2.3)}${wisp(5, -30.6, 16.4, -28.6, 23.4, -20.4, 2.3)}` },
  backBehind: { base: both(pigBunch), shade: both(pigShade), shine: both(pigShine) },
  back: {
    base: fullBack,
    shade: `${wisp(0, -33.4, 0, -4, 0, 28, .95)}${wisp(-23.4, 7, -24.4, -4, -25.4, -15, 1.25)}${wisp(23.4, 7, 24.4, -4, 25.4, -15, 1.25)}${wisp(-15, 23, -14, 0, -16, -24, 1.25)}${wisp(15, 23, 14, 0, 16, -24, 1.25)}`,
    shine: `${wisp(-23.4, -20.4, -16.4, -28.6, -5, -30.6, 2.3)}${wisp(5, -30.6, 16.4, -28.6, 23.4, -20.4, 2.3)}`,
    ties: both(scrunchie(-26.8, -16.0, 70, 5.6, 2.6)),
  },
};

// 14. BOB: Lush rounded chin-skimming storybook bob with softly tucked ends and sweeping feathered bangs.
const bobFront = 'M0 -34.8C-17.4 -35.8 -31.8 -29.2 -34.4 -13C-36.0 -2 -36.0 10.4 -33.4 20.6C-31.8 24.8 -27.6 26.8 -23.4 25.2C-21.4 24.2 -20.8 22.0 -21.2 19.4C-22.4 13.2 -23.2 7.0 -22.8 .8C-22.6 -.8 -22.0 -2.2 -21.4 -3.2C-14.2 -3.6 -6.0 -6.4 1.2 -11.0C6.2 -14.0 10.4 -16.4 13.8 -19.2C16.0 -15.0 19.0 -10.4 20.8 -7.4C22.0 -4.8 22.6 -2.2 22.8 .8C23.2 7.0 22.4 13.2 21.2 19.4C20.8 22.0 21.4 24.2 23.4 25.2C27.6 26.8 31.8 24.8 33.4 20.6C36.0 10.4 36.0 -2 34.4 -13C31.8 -29.2 17.4 -35.8 0 -34.8Z';
const bob: HairDrawing = {
  hairline: -8,
  rear: { under: 'M-32.8 -6C-34.4 6 -33.8 16.4 -29.6 22.6C-20.4 25.8 20.4 25.8 29.6 22.6C33.8 16.4 34.4 6 32.8 -6Z', edge: 'M-32.8 -6C-34.4 6 -33.8 16.4 -29.6 22.6C-20.4 25.8 20.4 25.8 29.6 22.6C33.8 16.4 34.4 6 32.8 -6Z' },
  front: {
    base: bobFront,
    shade: `${wisp(13.8, -19.2, 13.8, -26.4, 12.4, -33.4, 1.0)}${wisp(5.2, -14, -2, -24.4, -12.4, -30.4, 1.4)}${wisp(-6, -6, -14.4, -15, -22.6, -22.4, 1.4)}${wisp(-15.4, -3, -21.6, -8, -27.8, -14, 1.3)}${wisp(19.4, -9, 23.6, -18, 21.6, -27.4, 1.3)}${both(wisp(-28.8, -7, -30.6, 8.2, -27.8, 22.6, 1.65) + 'M-22.8 .8C-23.2 7 -22.4 13.2 -21.2 19.4C-20.8 22 -21.4 24.2 -23.4 25.2C-24.2 18.4 -25.2 9 -25.0 .8Z')}`,
    shine: `${wisp(-26.8, -16, -14.4, -29.0, 6.8, -31.8, 2.85)}${wisp(-18.4, -14, -8.2, -20.8, 4.2, -22.4, 1.5)}${wisp(19.4, -30.4, 26.8, -24.4, 29.8, -13, 2.35)}${both(wisp(-31.8, -5, -33.0, 6.2, -31.4, 16.6, 1.95))}`,
  },
  back: {
    base: 'M0 -34.8C-17.4 -35.8 -31.8 -29.2 -34.4 -13C-36.0 -2 -36.0 8.2 -32.8 17.4C-30.4 23.6 -22.6 27.6 -12.2 28.2C-6.2 28.6 6.2 28.6 12.2 28.2C22.6 27.6 30.4 23.6 32.8 17.4C36.0 8.2 36.0 -2 34.4 -13C31.8 -29.2 17.4 -35.8 0 -34.8Z',
    shade: `${both(wisp(-8.2, -30.4, -11.4, -2, -7.2, 27.4, 1.4) + wisp(-18.4, -27.4, -22.2, -2, -16.4, 25.4, 1.4) + wisp(-28.8, -14, -30.8, 4, -25.6, 21.4, 1.3))}`,
    shine: `${both(wisp(-27.6, -13, -19.4, -26.4, -5, -31.2, 2.5) + wisp(-14.4, 0, -15.4, 8.2, -13.4, 17.4, 1.55))}`,
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
/** Shadow, base, shine and outline all come from the chosen colour. Browns get warm caramel-sunlit highlights; jet-black keeps luminous form. */
export function hairTones(color: IslanderLook['hairColor'], skin: IslanderLook['skinTone']): HairTones {
  const key = `${color}:${skin}`, found = toneCache.get(key); if (found) return found;
  const c = hairColors[color], s = skinTones[skin], l = light(c), dark = l < .2;
  const warmDark = color === 'espresso';
  const base = dark ? (warmDark ? mix(c, '#634234', .14) : mix(c, '#4E5774', .10)) : c;
  const shine = color === 'galaxy' ? '#A496F5'
    : warmDark ? mix(c, '#C78A5B', .46)
    : dark ? mix(c, '#B6C6EE', .48)
    : l > .62 ? mix(c, '#FFFDF6', .62)
    : mix(c, '#FFECC2', .48);
  const shade = color === 'galaxy' ? '#201C46' : dark ? mix(c, '#0E0707', .36) : l > .5 ? mix(c, '#6E3B3E', .38) : mix(c, '#2A1414', .36);
  const line = dark ? mix(c, '#160D0D', .56) : mix(c, '#3B2418', l > .62 ? .76 : .68);
  // A short fade stays visibly hair on every skin tone, even blonde on sand or silver on cocoa.
  const apart = (tone: string, deep = .5) => Math.abs(light(tone) - light(s)) >= .06 ? tone : light(s) > .42 ? mix(tone, line, .4) : mix(tone, '#120B0A', deep), cool = color === 'galaxy' ? '#6B5FC8' : warmDark ? '#5B3E31' : '#6F7892';
  const shorn = apart(dark ? mix(base, cool, .12) : mix(base, s, .04), .78);
  const tones = { base, under: mix(shorn, shade, light(shorn) < light(shade) ? .24 : .34), shade, shine: color === 'lightning-streak' ? '#FFD84D' : shine, sheen: mix(shorn, shine, dark ? .52 : .34), line, fade: apart(dark ? mix(mix(base, s, .2), cool, .06) : mix(base, s, .3), .55), fadeHigh: shorn, backFade: dark ? mix(base, s, .08) : mix(base, s, .3), napeFade: mix(base, s, dark ? .2 : .3) };
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
