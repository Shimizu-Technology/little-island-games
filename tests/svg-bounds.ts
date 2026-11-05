/** Real extents of rendered SVG markup: curves are flattened, transforms composed and strokes included. */
type M = [number, number, number, number, number, number];
export type Extent = { left: number; top: number; right: number; bottom: number };
const multiply = (a: M, b: M): M => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const number = /-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gi;
function parseTransform(text: string): M {
  let m: M = [1, 0, 0, 1, 0, 0];
  for (const [, kind, args] of text.matchAll(/(translate|rotate|scale|matrix)\(([^)]*)\)/g)) {
    const v = (args.match(number) ?? []).map(Number);
    if (kind === 'translate') m = multiply(m, [1, 0, 0, 1, v[0], v[1] ?? 0]);
    else if (kind === 'scale') m = multiply(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
    else if (kind === 'matrix') m = multiply(m, v as M);
    else { const t = v[0]*Math.PI/180, r: M = [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), 0, 0]; m = multiply(multiply(multiply(m, [1, 0, 0, 1, v[1] ?? 0, v[2] ?? 0]), r), [1, 0, 0, 1, -(v[1] ?? 0), -(v[2] ?? 0)]); }
  }
  return m;
}
/** Sample points along a path: enough to bound the curve, not to draw it. */
export function pathPoints(d: string): [number, number][] {
  const out: [number, number][] = [];
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, last = '';
  for (const [, command, args] of d.matchAll(/([MLHVQCTSAZmlhvqctsaz])([^MLHVQCTSAZmlhvqctsaz]*)/g)) {
    const v = (args.match(number) ?? []).map(Number), rel = command === command.toLowerCase(), c = command.toUpperCase();
    if (c === 'Z') { x = sx; y = sy; out.push([x, y]); last = c; continue; }
    const size = { M: 2, L: 2, H: 1, V: 1, Q: 4, T: 2, C: 6, S: 4, A: 7 }[c as 'M'];
    for (let i = 0; i + size <= v.length; i += size) {
      const a = v.slice(i, i + size), ox = rel ? x : 0, oy = rel ? y : 0;
      if (c === 'M' || c === 'L' || c === 'T') { x = a[0]+ox; y = a[1]+oy; if (c === 'M' && i === 0) { sx = x; sy = y; } out.push([x, y]); }
      else if (c === 'H') { x = a[0]+ox; out.push([x, y]); }
      else if (c === 'V') { y = a[0]+oy; out.push([x, y]); }
      else if (c === 'Q') { const [p, q, e, f] = [a[0]+ox, a[1]+oy, a[2]+ox, a[3]+oy]; for (let s = 1; s <= 12; s++) { const t = s/12, u = 1-t; out.push([u*u*x+2*u*t*p+t*t*e, u*u*y+2*u*t*q+t*t*f]); } cx = p; cy = q; x = e; y = f; }
      else if (c === 'C' || c === 'S') {
        const [p, q] = c === 'C' ? [a[0]+ox, a[1]+oy] : last === 'C' || last === 'S' ? [2*x-cx, 2*y-cy] : [x, y], k = c === 'C' ? 2 : 0;
        const [r, w, e, f] = [a[k]+ox, a[k+1]+oy, a[k+2]+ox, a[k+3]+oy];
        for (let s = 1; s <= 16; s++) { const t = s/16, u = 1-t; out.push([u*u*u*x+3*u*u*t*p+3*u*t*t*r+t*t*t*e, u*u*u*y+3*u*u*t*q+3*u*t*t*w+t*t*t*f]); }
        cx = r; cy = w; x = e; y = f;
      } else if (c === 'A') { const e = a[5]+ox, f = a[6]+oy, r = Math.max(a[0], a[1]); out.push([x-r, y-r], [x+r, y+r], [e-r, f-r], [e+r, f+r]); x = e; y = f; }
      last = c;
    }
  }
  return out;
}
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
/** Walks the markup inside the root <svg>, in the root's own user units. */
export function svgExtent(markup: string): Extent {
  const e: Extent = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  const stack: { m: M; stroke: number; none: boolean }[] = [{ m: [1, 0, 0, 1, 0, 0], stroke: 0, none: true }];
  const plot = (points: [number, number][], m: M, stroke: number) => {
    const pad = stroke/2*Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
    for (const [px, py] of points) {
      const x = m[0]*px+m[2]*py+m[4], y = m[1]*px+m[3]*py+m[5];
      e.left = Math.min(e.left, x-pad); e.right = Math.max(e.right, x+pad); e.top = Math.min(e.top, y-pad); e.bottom = Math.max(e.bottom, y+pad);
    }
  };
  for (const [tag, closing, name, selfClosed] of markup.matchAll(/<(\/?)([a-z]+)\b[^>]*?(\/?)>/gi).map(m => [m[0], m[1], m[2].toLowerCase(), m[3]] as const)) {
    if (closing) { if (name !== 'path' && name !== 'rect' && name !== 'circle' && name !== 'ellipse' && name !== 'text') stack.pop(); continue; }
    const top = stack[stack.length-1];
    const transform = attr(tag, 'transform'), m = transform ? multiply(top.m, parseTransform(transform)) : top.m;
    const strokeAttr = attr(tag, 'stroke-width') ?? attr(tag, 'strokeWidth'), paint = attr(tag, 'stroke');
    const none = paint ? paint === 'none' : top.none, stroke = none ? 0 : strokeAttr !== undefined ? Number(strokeAttr) : top.stroke;
    if (name === 'path') { const d = attr(tag, 'd'); if (d) plot(pathPoints(d), m, stroke); }
    else if (name === 'rect') { const x = Number(attr(tag, 'x') ?? 0), y = Number(attr(tag, 'y') ?? 0), w = Number(attr(tag, 'width') ?? 0), h = Number(attr(tag, 'height') ?? 0); plot([[x, y], [x+w, y], [x, y+h], [x+w, y+h]], m, stroke); }
    else if (name === 'circle' || name === 'ellipse') { const x = Number(attr(tag, 'cx') ?? 0), y = Number(attr(tag, 'cy') ?? 0), rx = Number(attr(tag, 'r') ?? attr(tag, 'rx') ?? 0), ry = Number(attr(tag, 'r') ?? attr(tag, 'ry') ?? 0); plot([[x-rx, y], [x+rx, y], [x, y-ry], [x, y+ry]], m, stroke); }
    else if (name !== 'text' && !selfClosed) stack.push({ m, stroke: strokeAttr !== undefined ? Number(strokeAttr) : stroke, none });
  }
  return e;
}
