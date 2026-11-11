// Island picture dictionary: the drawing kit. Every picture is built from these
// helpers, so line weight, palette and rounded joins stay the same across all of
// them. content/pictures/STYLE.md explains the rules; check.mjs enforces them.

export const VIEWBOX = '0 0 120 120';
export const INK = '#254E4B';
/** Ink lines are 3 units at 120 (the Library icon weight); 2 only for small inner detail. */
export const INK_WIDTHS = [2, 3];

/** The whole palette. Library and hub colours, plus a few everyday colours objects need to be named. */
export const P = {
  ink: INK,
  paper: '#FCFAF4',
  cream: '#FFF3CC',
  sand: '#F0CF7C',
  gold: '#F0C86D',
  yellow: '#F2C94C',
  orange: '#EE9F4A',
  coral: '#E09A7E',
  red: '#D64F43',
  pink: '#F2B8B0',
  purple: '#A48FC0',
  sky: '#91C5D0',
  blue: '#5B9ABA',
  navy: '#386C9A',
  sea: '#5E9A9A',
  mint: '#B8D3AF',
  leaf: '#80A97D',
  forest: '#5E8F5F',
  wood: '#CB956D',
  brown: '#996445',
  stone: '#B9B4A2',
  slate: '#8C8A80',
  charcoal: '#3B3A40',
  skin: '#DDA77F',
  skinDeep: '#A86F4C',
};
export const PALETTE = new Set(Object.values(P));

const round = v => String(Math.round(v * 100) / 100);
/** Numbers inside path data, point lists and transforms are rounded to two places too. */
const tidy = s => s.replace(/-?\d*\.\d+(?:e-?\d+)?/gi, m => round(Number(m)));
const num = v => (typeof v === 'number' ? round(v) : typeof v === 'string' ? tidy(v) : v);
function attrs(map) {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${num(v)}"`)
    .join('');
}
/** Options shared by every shape: sw (ink width), stroke (colour or 'none'), cap, t (transform), op (opacity). */
function style(fill, o = {}) {
  return {
    fill: fill ?? undefined,
    stroke: o.ns ? 'none' : o.stroke,
    'stroke-width': o.sw,
    'stroke-linecap': o.cap,
    'stroke-dasharray': o.dash,
    opacity: o.op,
    transform: o.t,
  };
}
const el = (name, geometry, fill, o) => `<${name}${attrs({ ...geometry, ...style(fill, o) })}/>`;

export const circle = (cx, cy, r, fill, o) => el('circle', { cx, cy, r }, fill, o);
export const ellipse = (cx, cy, rx, ry, fill, o) => el('ellipse', { cx, cy, rx, ry }, fill, o);
export const rect = (x, y, width, height, rx, fill, o) => el('rect', { x, y, width, height, rx: rx || undefined }, fill, o);
export const path = (d, fill, o) => el('path', { d }, fill, o);
/** An ink line with no fill. */
export const line = (d, o) => el('path', { d }, undefined, o);
export const poly = (points, fill, o) => el('polygon', { points }, fill, o);
/** A filled shape with no outline, for shading, patches and highlights inside an outline. */
export const patch = (d, fill, o = {}) => el('path', { d }, fill, { ...o, ns: true });
/** An eye or small ink dot. */
export const dot = (cx, cy, r = 2.8) => el('circle', { cx, cy, r }, INK, { ns: true });
export const group = (o, ...children) => `<g${attrs({ transform: o.t, opacity: o.op, fill: o.fill, stroke: o.stroke, 'stroke-width': o.sw })}>${children.flat(Infinity).join('')}</g>`;
/** Mirror children left-to-right around the centre of the 120 box. */
export const mirror = (...children) => group({ t: 'matrix(-1 0 0 1 120 0)' }, ...children);

/** A friendly face: two eyes and an optional smile, used sparingly on animals. */
export function eyes(x1, y1, x2, y2, r = 2.8) {
  return dot(x1, y1, r) + dot(x2, y2, r);
}

/** The finished file: transparent background, ink outline defaults on one group. */
export function svg(children) {
  const body = children.flat(Infinity).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}"><g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
}

/** Points on a regular polygon or star, rounded to two places. */
export function ring(cx, cy, r, n, start = -90, inner = null) {
  const pts = [];
  const steps = inner ? n * 2 : n;
  for (let i = 0; i < steps; i++) {
    const a = ((start + (360 / steps) * i) * Math.PI) / 180;
    const rr = inner && i % 2 ? inner : r;
    pts.push(`${num(cx + rr * Math.cos(a))},${num(cy + rr * Math.sin(a))}`);
  }
  return pts.join(' ');
}
/** Short rays around a centre, for suns and sparkles. */
export function rays(cx, cy, r1, r2, n, start = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    d += `M${num(cx + r1 * Math.cos(a))} ${num(cy + r1 * Math.sin(a))}L${num(cx + r2 * Math.cos(a))} ${num(cy + r2 * Math.sin(a))}`;
  }
  return d;
}
