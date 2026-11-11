// Geometry for the picture checks: strict grammars for path data, point lists, numbers and
// transforms, composed transform matrices, and unclipped drawing bounds. A typo in any of
// these must fail loudly, because a renderer quietly skips what it cannot read.
// Pure and dependency-free; check.mjs and render-check.mjs share it.

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
const TRANSFORM_ARGS = { matrix: [6], translate: [1, 2], scale: [1, 2], rotate: [1, 3], skewX: [1], skewY: [1] };

/** One finite number and nothing else, e.g. an attribute value. */
export function parseNumber(text) {
  NUMBER.lastIndex = 0;
  const m = NUMBER.exec(text);
  if (!m || m[0].length !== text.length) throw new Error(`"${text}" is not a number`);
  const value = Number(m[0]);
  if (!Number.isFinite(value)) throw new Error(`"${text}" is not finite`);
  return value;
}

/**
 * A reader over one attribute string that refuses anything it cannot consume. Separators follow
 * the SVG comma-wsp rule: whitespace, or at most one comma, and a comma only between two
 * arguments. A leading, repeated or dangling comma fails, because renderers drop or misplace
 * shapes they cannot read rather than reporting them.
 */
function reader(text, what) {
  let i = 0, afterArg = false, comma = false;
  const fail = message => { throw new Error(`${what}: ${message} at ${i} in "${text}"`); };
  const ws = () => { while (i < text.length && /\s/.test(text[i])) i++; };
  const startsNum = () => /[\d.+-]/.test(text[i] ?? '');
  // Reads one optional comma-wsp. A comma is remembered until the next argument consumes it.
  const sep = () => {
    ws();
    if (text[i] !== ',') return;
    if (!afterArg || comma) fail('unexpected comma');
    i++; ws();
    if (text[i] === ',') fail('repeated comma');
    comma = true;
  };
  const arg = read => { if (!comma) sep(); else ws(); comma = false; const value = read(); afterArg = true; return value; };
  return {
    done() { sep(); if (i >= text.length) { if (comma) fail('dangling comma'); return true; } return false; },
    take() { ws(); if (comma) fail('comma before a command'); const c = text[i]; i++; afterArg = false; return c; },
    number: () => arg(() => {
      NUMBER.lastIndex = i;
      const m = NUMBER.exec(text);
      if (!m) fail('expected a number');
      const value = Number(m[0]);
      if (!Number.isFinite(value)) throw new Error(`${what}: ${m[0]} is not finite`);
      i = NUMBER.lastIndex;
      return value;
    }),
    flag: () => arg(() => {
      const c = text[i];
      if (c !== '0' && c !== '1') fail('expected an arc flag');
      i++;
      return c === '1';
    }),
    startsNumber() { sep(); if (startsNum()) return true; if (comma) fail('dangling comma'); return false; },
  };
}

/** Path data to absolute segments. Every command needs whole argument groups; it must start with M. */
export function parsePath(d) {
  const r = reader(d, 'path data'), segments = [];
  let x = 0, y = 0, sx = 0, sy = 0, lastCubic = null, lastQuad = null;
  while (!r.done()) {
    const letter = r.take();
    let cmd = letter.toUpperCase();
    const rel = letter !== cmd;
    if (!(cmd in ARGS)) throw new Error(`path data: unknown command "${letter}" in "${d}"`);
    if (!segments.length && cmd !== 'M') throw new Error(`path data must start with M: "${d}"`);
    if (cmd === 'Z') {
      segments.push({ type: 'L', from: [x, y], to: [sx, sy] });
      x = sx; y = sy; lastCubic = lastQuad = null;
      continue;
    }
    // One or more whole argument groups; extra groups after M are line-tos.
    do {
      const a = [];
      for (let k = 0; k < ARGS[cmd]; k++) a.push(cmd === 'A' && (k === 3 || k === 4) ? Number(r.flag()) : r.number());
      const ox = rel ? x : 0, oy = rel ? y : 0, from = [x, y];
      let cubic = null, quad = null;
      if (cmd === 'M') {
        x = a[0] + ox; y = a[1] + oy; sx = x; sy = y;
        segments.push({ type: 'M', to: [x, y] });
      } else if (cmd === 'L') {
        x = a[0] + ox; y = a[1] + oy;
        segments.push({ type: 'L', from, to: [x, y] });
      } else if (cmd === 'H' || cmd === 'V') {
        if (cmd === 'H') x = a[0] + ox; else y = a[0] + oy;
        segments.push({ type: 'L', from, to: [x, y] });
      } else if (cmd === 'C' || cmd === 'S') {
        const c1 = cmd === 'C' ? [a[0] + ox, a[1] + oy] : lastCubic ? [2 * x - lastCubic[0], 2 * y - lastCubic[1]] : [x, y];
        const rest = cmd === 'C' ? a.slice(2) : a;
        cubic = [rest[0] + ox, rest[1] + oy];
        x = rest[2] + ox; y = rest[3] + oy;
        segments.push({ type: 'C', from, c1, c2: cubic, to: [x, y] });
      } else if (cmd === 'Q' || cmd === 'T') {
        quad = cmd === 'Q' ? [a[0] + ox, a[1] + oy] : lastQuad ? [2 * x - lastQuad[0], 2 * y - lastQuad[1]] : [x, y];
        const end = cmd === 'Q' ? a.slice(2) : a;
        x = end[0] + ox; y = end[1] + oy;
        segments.push({ type: 'Q', from, c: quad, to: [x, y] });
      } else {
        if (a[0] < 0 || a[1] < 0) throw new Error(`path data: negative arc radius in "${d}"`);
        x = a[5] + ox; y = a[6] + oy;
        segments.push({ type: 'A', from, rx: a[0], ry: a[1], angle: a[2], large: a[3] === 1, sweep: a[4] === 1, to: [x, y] });
      }
      lastCubic = cubic; lastQuad = quad;
      if (cmd === 'M') cmd = 'L';
    } while (r.startsNumber());
  }
  if (!segments.length) throw new Error('path data is empty');
  return segments;
}

/** A polygon's points: at least three finite x,y pairs. */
export function parsePoints(text) {
  const r = reader(text, 'points'), values = [];
  while (!r.done()) values.push(r.number());
  if (values.length < 6 || values.length % 2) throw new Error(`points need three or more x,y pairs: "${text}"`);
  const pts = [];
  for (let k = 0; k < values.length; k += 2) pts.push([values[k], values[k + 1]]);
  return pts;
}

/** A dash list: one or more finite, non-negative lengths, not all zero. */
export function parseDashes(text) {
  const r = reader(text, 'stroke-dasharray'), values = [];
  while (!r.done()) values.push(r.number());
  if (!values.length || values.some(v => v < 0) || values.every(v => v === 0)) throw new Error(`stroke-dasharray "${text}" is not a dash list`);
  return values;
}

/** A 2D affine matrix [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f. */
export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);
export const multiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const apply = (m, [px, py]) => [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]];

/** The full SVG transform-list grammar for the functions SVG defines; nothing unconsumed. */
export function parseTransform(text = '') {
  let m = IDENTITY, i = 0;
  const name = /([a-zA-Z]+)\s*\(/y;
  while (true) {
    const rest = /\s*(,?)\s*/y; rest.lastIndex = i; const between = rest.exec(text); i = rest.lastIndex;
    if (between[1] && (m === IDENTITY || i >= text.length)) throw new Error(`transform "${text}" has a stray comma`);
    if (i >= text.length) break;
    name.lastIndex = i;
    const n = name.exec(text);
    if (!n || !(n[1] in TRANSFORM_ARGS)) throw new Error(`transform "${text}" is not a valid transform list`);
    const close = text.indexOf(')', name.lastIndex);
    if (close < 0) throw new Error(`transform "${text}" is not closed`);
    const r = reader(text.slice(name.lastIndex, close), `transform ${n[1]}`), a = [];
    while (!r.done()) a.push(r.number());
    if (!TRANSFORM_ARGS[n[1]].includes(a.length)) throw new Error(`${n[1]}() takes ${TRANSFORM_ARGS[n[1]].join(' or ')} numbers, not ${a.length}`);
    const rad = v => (v * Math.PI) / 180;
    let t;
    if (n[1] === 'matrix') t = a;
    else if (n[1] === 'translate') t = [1, 0, 0, 1, a[0], a[1] ?? 0];
    else if (n[1] === 'scale') t = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (n[1] === 'skewX') t = [1, 0, Math.tan(rad(a[0])), 1, 0, 0];
    else if (n[1] === 'skewY') t = [1, Math.tan(rad(a[0])), 0, 1, 0, 0];
    else {
      const c = Math.cos(rad(a[0])), s = Math.sin(rad(a[0])), [cx, cy] = [a[1] ?? 0, a[2] ?? 0];
      t = multiply(multiply([1, 0, 0, 1, cx, cy], [c, s, -s, c, 0, 0]), [1, 0, 0, 1, -cx, -cy]);
    }
    if (!t.every(Number.isFinite)) throw new Error(`transform "${text}" is not finite`);
    m = multiply(m, t);
    i = close + 1;
  }
  return m;
}

/** The two principal scale factors of a matrix's linear part (its singular values). */
export function principalScales(m) {
  const [a, b, c, d] = m;
  const p = a * a + b * b + c * c + d * d, q = Math.abs(a * d - b * c);
  const max = Math.sqrt((p + Math.sqrt(Math.max(0, p * p - 4 * q * q))) / 2);
  return { min: max ? q / max : 0, max };
}

const STEPS = 48;
/** Points along a segment, dense enough that bounds are within a few hundredths of a unit. */
function sampleSegment(s) {
  if (s.type === 'M') return [s.to];
  if (s.type === 'L') return [s.from, s.to];
  if (s.type === 'A') return sampleArc(s);
  const out = [];
  for (let k = 0; k <= STEPS; k++) {
    const t = k / STEPS, u = 1 - t;
    if (s.type === 'Q') out.push([0, 1].map(j => u * u * s.from[j] + 2 * u * t * s.c[j] + t * t * s.to[j]));
    else if (s.type === 'C') out.push([0, 1].map(j => u * u * u * s.from[j] + 3 * u * u * t * s.c1[j] + 3 * u * t * t * s.c2[j] + t * t * t * s.to[j]));
  }
  return out;
}

/** SVG arc endpoint parameterisation to centre form (SVG 1.1 F.6.5), then sampled. */
function sampleArc({ from: [x1, y1], to: [x2, y2], rx, ry, angle, large, sweep }) {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return [[x1, y1], [x2, y2]];
  const phi = (angle * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * yp) / ry, cyp = (-coef * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const out = [];
  for (let k = 0; k <= STEPS; k++) {
    const t = t1 + (dt * k) / STEPS;
    out.push([cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos]);
  }
  return out;
}

const ring = (cx, cy, rx, ry) => Array.from({ length: STEPS * 2 }, (_, k) => {
  const t = (k / (STEPS * 2)) * 2 * Math.PI;
  return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
});

/**
 * Outline points of one shape element in its own coordinates, after checking every
 * geometry attribute. Throws on anything malformed, non-finite or degenerate.
 */
export function shapePoints(name, attrs) {
  const n = k => parseNumber(attrs[k] ?? '');
  if (name === 'path') return parsePath(attrs.d ?? '').flatMap(sampleSegment);
  if (name === 'polygon') return parsePoints(attrs.points ?? '');
  if (name === 'circle') {
    const r = n('r');
    if (r <= 0) throw new Error(`circle radius ${r} must be positive`);
    return ring(n('cx'), n('cy'), r, r);
  }
  if (name === 'ellipse') {
    const rx = n('rx'), ry = n('ry');
    if (rx <= 0 || ry <= 0) throw new Error('ellipse radii must be positive');
    return ring(n('cx'), n('cy'), rx, ry);
  }
  if (name === 'rect') {
    const x = n('x'), y = n('y'), w = n('width'), h = n('height'), rx = attrs.rx === undefined ? 0 : n('rx');
    if (w <= 0 || h <= 0 || rx < 0) throw new Error('rect size must be positive');
    const r = Math.min(rx, w / 2, h / 2);
    if (!r) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const corner = (cx, cy, start) => Array.from({ length: 13 }, (_, k) => { const t = ((start + (90 * k) / 12) * Math.PI) / 180; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });
    return [...corner(x + w - r, y + r, -90), ...corner(x + w - r, y + h - r, 0), ...corner(x + r, y + h - r, 90), ...corner(x + r, y + r, 180)];
  }
  return [];
}

/** Bounds of points after a matrix, grown by a stroke's reach in drawing units. */
export function boundsOf(points, m, reach = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) {
    const [px, py] = apply(m, p);
    x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  return { x0: x0 - reach, y0: y0 - reach, x1: x1 + reach, y1: y1 + reach };
}
export const unionBounds = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
