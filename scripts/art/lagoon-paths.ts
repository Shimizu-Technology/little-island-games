import type { SpritePose } from '../../src/arcade/poses';
/**
 * Outrigger canoe in its projected quad (LG-S3 redraw). It lies across its lane, so the runner sees
 * its whole side: a slim hull with upturned ends, the float behind it on two booms, lashed cargo
 * amidships. It stays inside its own lane (±0.39 lanes). a=near-left, b=near-right, c=far-right,
 * d=far-left.
 */
type P = { x: number; y: number };
export function canoePath(p: SpritePose[], index: number, part: string) {
  'worklet';
  const a = p[index], b = p[index + 1], c = p[index + 2], d = p[index + 3];
  if (!a || a.opacity === 0 || !b || !c || !d) return 'M0 0';
  const ns = a.scale ?? 1, fs = d.scale ?? 1;
  const lerp = (u: P, v: P, t: number) => ({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t });
  // t: along the hull, left (0) to right (1); u: near (0) to far (1); up: lift in track pixels.
  const at = (t: number, u: number, up: number) => { const m = lerp(lerp(a, d, u), lerp(b, c, u), t), s = ns + (fs - ns) * u; return { x: m.x, y: m.y - up * s }; };
  const f = (q: P) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  const ts = Array.from({ length: 13 }, (_, i) => -.15 + 1.3 * i / 12);
  // Upturned bow and stern: the gunwale rises toward both tips.
  const sheer = (t: number) => 17 + 11 * Math.pow(Math.abs(t - .5) / .65, 2.4);
  const keelDepth = (t: number) => 2 + 15 * Math.pow(Math.abs(t - .5) / .65, 1.6);
  const near = (t: number) => at(t, .3, sheer(t)), far = (t: number) => at(t, .55, sheer(t) - 1);
  const keel = (t: number) => at(t, .32, keelDepth(t));
  const line = (pts: P[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${f(q)}`).join('');
  if (part === 'shadow') { const r = (t: number) => .5 * Math.sqrt(Math.max(0, 1 - Math.pow((t - .5) / .68, 2))); return `${line(ts.map(t => at(t, .62 - r(t), -1)))}${ts.slice().reverse().map(t => `L${f(at(t, .62 + r(t) * 1.4, -1))}`).join('')}Z`; }
  if (part === 'hull') return `${line(ts.map(near))}${ts.slice().reverse().map(t => `L${f(keel(t))}`).join('')}Z`;
  if (part === 'side') return `${line(ts.slice(2, -2).map(t => at(t, .31, sheer(t) - 6)))}${ts.slice(2, -2).reverse().map(t => `L${f(keel(t))}`).join('')}Z`;
  if (part === 'inside') return `${line(ts.slice(1, -1).map(near))}${ts.slice(1, -1).reverse().map(t => `L${f(far(t))}`).join('')}Z`;
  if (part === 'rail') return `${line(ts.map(near))} ${line(ts.slice(1, -1).map(far))}`;
  if (part === 'cargo') {
    // A rolled sail lashed amidships (low and round: never a crate) and a paddle across the hull.
    const roll = (t: number, top: number) => at(t, .42, top);
    const ts2 = [.3, .36, .44, .5, .56, .64, .7];
    const body = `${line(ts2.map(t => roll(t, 26)))}${ts2.slice().reverse().map(t => `L${f(roll(t, 16))}`).join('')}Z`;
    const bands = [.38, .5, .62].map(t => `M${f(roll(t, 26))}L${f(roll(t, 16))}`).join('');
    // A short mast with the sail furled: the canoe is a go-around blocker, never a jump.
    const m0 = at(.5, .44, 18), m1 = at(.5, .44, 74), s0 = at(.47, .44, 28), s1 = at(.53, .44, 70);
    const mast = `M${f(m0)}L${f(m1)} M${f(s0)}L${f(at(.53, .44, 28))}L${f(s1)}L${f(at(.47, .44, 70))}Z`;
    return `${body} ${bands} ${mast}`;
  }
  if (part === 'float') {
    // Float behind the hull, joined by two booms.
    const fts = ts.slice(2, -2), ama = (t: number, up: number) => at(t, 1.0, up);
    const body = `${line(fts.map(t => ama(t, 7 + 3 * Math.pow(Math.abs(t - .5) / .5, 2))))}${fts.slice().reverse().map(t => `L${f(ama(t, 1))}`).join('')}Z`;
    const booms = [.2, .78].map(t => `M${f(at(t, .55, sheer(t) - 2))}L${f(at(t, 1.0, 6))}L${f(at(t + .03, 1.0, 6))}L${f(at(t + .03, .55, sheer(t + .03) - 2))}Z`).join(' ');
    return `${booms} ${body}`;
  }
  // Wake curls off both tips, only on the moving canoe.
  return `M${f(at(-.18, .1, 0))}q${-10 * ns} ${2 * ns} ${-22 * ns} ${12 * ns} M${f(at(-.1, .2, 0))}q${-6 * ns} ${4 * ns} ${-12 * ns} ${12 * ns} M${f(at(1.18, .1, 0))}q${10 * ns} ${2 * ns} ${22 * ns} ${12 * ns} M${f(at(1.1, .2, 0))}q${6 * ns} ${4 * ns} ${12 * ns} ${12 * ns}`;
}
