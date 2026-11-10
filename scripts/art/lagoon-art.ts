/**
 * Lagoon Run art sources (LG-S3). SVG is the source of truth; scripts/art/bake-lagoon.ts renders
 * each asset to PNG at its final on-screen density. Style rules: docs/lagoon/STYLE-GUIDE.md.
 * All shapes are original to Little Island.
 */
import type { LagoonLook } from '../../src/arcade/games/lagoon-run/look';
import { BOARD, FLOOR_PERIOD, DECK_U0, DECK_U1, type FloorBand } from '../../src/arcade/games/lagoon-run/floorBands';

/** Deterministic 0..1 noise for stable art. */
export function hash(n: number) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
const f = (n: number) => +n.toFixed(2);

/** Mix two #RRGGBB colours. */
export function mix(a: string, b: string, t: number) {
  const p = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/**
 * One periodic slice of deck for a camera band, in texture space: x is lanes (u0..u1), y is track
 * depth from far - period (top) to near (bottom). Two-board period: staggered planks, quiet seams,
 * lane cue dashes on alternate boards, darker edge trim, warm light on the sun side.
 */
export function floorBandSvg(band: FloorBand, look: LagoonLook, width: number, height: number) {
  const top = band.far - FLOOR_PERIOD, length = band.near - top;
  const X = (u: number) => f((u - band.u0) / (band.u1 - band.u0) * width), Y = (w: number) => f((w - top) / length * height);
  const [lit, base, mid, shade] = look.planks;
  const sunRight = look.sun[0] > .5;
  let planks = '', seams = '', grain = '', cues = '', nails = '';
  const first = Math.floor(top / BOARD) - 1, last = Math.ceil(band.near / BOARD) + 1;
  for (let k = first; k <= last; k++) {
    const parity = ((k % 2) + 2) % 2, w0 = k * BOARD, w1 = w0 + BOARD;
    // Plank joints alternate, like a real boardwalk, so the deck never reads as a ladder.
    const joints = parity ? [DECK_U0, .18, 1.02, 1.86, DECK_U1] : [DECK_U0, -.12, .62, 1.44, 2.22, DECK_U1];
    for (let j = 0; j < joints.length - 1; j++) {
      // Festival boards: some planks are painted (worn paint over wood); the rest stay bare.
      const painted = look.paint && (j + parity * 2) % 4 === 1 ? mix(look.paint[(j + parity) % look.paint.length], base, .5) : undefined;
      const tone = painted ?? [lit, base, mid, base, mid, lit][(j * 3 + parity * 2) % 6];
      const n = hash(parity * 31 + j * 7.3);
      const tint = mix(tone, n > .5 ? shade : '#FFF4DC', Math.abs(n - .5) * .22);
      planks += `<rect x="${X(joints[j])}" y="${Y(w0)}" width="${f(X(joints[j + 1]) - X(joints[j]))}" height="${f(Y(w1) - Y(w0)) + .6}" fill="${tint}"/>`;
      if (j > 0) seams += `<path d="M${X(joints[j])} ${Y(w0)}V${Y(w1)}" stroke="${look.seam}" stroke-opacity=".38" stroke-width="${f(Math.max(.6, width / 900))}"/>`;
      // Two quiet grain strokes per plank, light on top.
      for (let g = 0; g < 2; g++) {
        const gu = joints[j] + (joints[j + 1] - joints[j]) * (.2 + .5 * hash(parity * 13 + j * 3 + g)), gw = w0 + BOARD * (.3 + .35 * g);
        const len = (joints[j + 1] - joints[j]) * (.25 + .2 * hash(j + g * 5 + parity));
        grain += `<path d="M${X(gu)} ${Y(gw)}H${X(Math.min(joints[j + 1] - .03, gu + len))}" stroke="${g ? shade : '#FFF6DE'}" stroke-opacity="${g ? .16 : .22}" stroke-width="${f(Math.max(.5, height / length * BOARD * .07))}" stroke-linecap="round"/>`;
      }
      // Nail pairs at each plank end.
      for (const end of [joints[j] + .05, joints[j + 1] - .05]) if (end > DECK_U0 + .06 && end < DECK_U1 - .06) for (const t of [.28, .72]) nails += `<ellipse cx="${X(end)}" cy="${Y(w0 + BOARD * t)}" rx="${f(width / (band.u1 - band.u0) * .012)}" ry="${f(height / length * BOARD * .06)}" fill="${look.seam}" fill-opacity=".45"/>`;
    }
    seams += `<path d="M${X(DECK_U0)} ${Y(w0)}H${X(DECK_U1)}" stroke="${look.seam}" stroke-opacity=".5" stroke-width="${f(Math.max(.7, height / length * BOARD * .07))}"/>`;
    // Painted lane cues: a soft dash on every other board, centred on the two lane dividers.
    if (parity === 0) for (const u of [.5, 1.5]) cues += `<rect x="${X(u - .02)}" y="${Y(w0 + BOARD * .05)}" width="${f(X(u + .02) - X(u - .02))}" height="${f(Y(w1 + BOARD * .55) - Y(w0 + BOARD * .05))}" fill="${look.cue}" fill-opacity=".55"/>`;
  }
  // Edge trim boards and one clear light direction across the deck.
  const trim = `<rect x="${X(DECK_U0)}" y="0" width="${f(X(-.5) - X(DECK_U0))}" height="${height}" fill="${look.side}"/><rect x="${X(2.5)}" y="0" width="${f(X(DECK_U1) - X(2.5))}" height="${height}" fill="${look.side}"/><path d="M${X(-.5)} 0V${height}M${X(2.5)} 0V${height}" stroke="${mix(lit, '#FFFFFF', .3)}" stroke-opacity=".55" stroke-width="${f(Math.max(.8, width / 500))}"/>`;
  const light = `<defs><linearGradient id="l" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${sunRight ? look.shade : '#FFF4D8'}" stop-opacity="${sunRight ? .16 : .14}"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="${sunRight ? '#FFF4D8' : look.shade}" stop-opacity="${sunRight ? .14 : .16}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#l)"/>`;
  return `<rect width="${width}" height="${height}" fill="${base}"/>${planks}${grain}${seams}${nails}${cues}${trim}${light}`;
}

/* ---------- Scenery props: 100×240 frames, base at y=236, no ink (scenery is never touched). ---------- */
/** Contact shadow plus a long soft shadow cast away from the world's sun. */
const shadow = (look: LagoonLook, rx = 40) => { const dir = look.sun[0] > .5 ? -1 : 1; return `<ellipse cx="${50 + dir * 18}" cy="234" rx="${Math.min(48, rx * 1.35)}" ry="6" fill="${look.shade}" fill-opacity=".18"/><ellipse cx="50" cy="235" rx="${rx * .8}" ry="4.5" fill="${look.shade}" fill-opacity=".3"/>`; };
/** Festival props stand on small pier platforms, never on open water. */
const platform = (look: LagoonLook) => `<path d="M6 226H94V236H6Z" fill="#8C5A40"/><path d="M6 226H94V229H6Z" fill="#C08660"/><path d="M12 236V240M50 236V240M88 236V240" stroke="#5B3A2E" stroke-width="4"/><path d="M6 226H94" stroke="${look.glow}" stroke-opacity=".35"/>`;
function palm(look: LagoonLook, lean = 1) {
  const trunk = '#A8754A', trunkLit = '#D29A62', frond = '#2F8F5E', frondLit = '#6CC17A', frondShade = '#1F6B48';
  const top = { x: 50 + 6 * lean, y: 62 };
  const fronds = [[-44, 2], [-40, 28], [-26, 46], [-6, 52], [22, 46], [38, 28], [42, 0], [-20, -26], [16, -28]].map(([dx, dy], i) =>
    `<path d="M${top.x} ${top.y}Q${top.x + dx * .5} ${top.y + dy * .5 - 18} ${top.x + dx} ${top.y + dy}Q${top.x + dx * .55} ${top.y + dy * .4 - 4} ${top.x} ${top.y + 4}Z" fill="${i % 2 ? frond : frondShade}"/><path d="M${top.x} ${top.y}Q${top.x + dx * .5} ${top.y + dy * .5 - 18} ${top.x + dx} ${top.y + dy}" fill="none" stroke="${frondLit}" stroke-width="1.6" stroke-opacity=".8"/>`).join('');
  const rings = Array.from({ length: 9 }, (_, i) => { const t = (i + .5) / 9, x = 50 + (top.x - 50) * t * t, y = 232 - (232 - top.y) * t; return `<path d="M${x - 5} ${y}q5 3 10 0" stroke="#7C5232" stroke-width="1.4" fill="none" stroke-opacity=".7"/>`; }).join('');
  return `${shadow(look, 26)}<path d="M44 234Q${48 + 10 * lean} 140 ${top.x - 4} ${top.y + 6}L${top.x + 4} ${top.y + 8}Q${56 + 10 * lean} 140 56 234Z" fill="${trunk}"/><path d="M50 234Q${53 + 10 * lean} 140 ${top.x + 1} ${top.y + 8}L${top.x + 4} ${top.y + 8}Q${56 + 10 * lean} 140 56 234Z" fill="${trunkLit}"/>${rings}${fronds}<circle cx="${top.x - 4}" cy="${top.y + 8}" r="5" fill="#7A5634"/><circle cx="${top.x + 5}" cy="${top.y + 9}" r="4.5" fill="#94683F"/>`;
}
function hut(look: LagoonLook) {
  return `${shadow(look, 44)}
  <path d="M18 236V176M82 236V176M30 236V180M70 236V180" stroke="#7A5436" stroke-width="5"/>
  <path d="M12 180H88V186H12Z" fill="#B57A4A"/><path d="M12 180H88V182H12Z" fill="#E4B276"/>
  <path d="M18 180V128H82V180Z" fill="#E5BE85"/><path d="M60 180V128H82V180Z" fill="#C89A63"/>
  <path d="M28 136H46V164H28Z" fill="#5A4635"/><path d="M28 136H46V140H28Z" fill="#3E3128"/>
  <path d="M60 140H74V156H60Z" fill="#FFE3A3" fill-opacity=".85"/>
  <path d="M4 132L50 82L96 132Z" fill="#C99A55"/><path d="M50 82L96 132H62Z" fill="#A47A40"/>
  ${Array.from({ length: 7 }, (_, i) => `<path d="M${10 + i * 13} 131L${44 + i * 2} 90" stroke="#E7C27C" stroke-width="1.4" stroke-opacity=".7"/>`).join('')}
  <path d="M84 150Q96 168 90 196Q80 176 84 150Z" fill="#7DB8AE" fill-opacity=".75"/><path d="M85 156L93 178M89 154L88 190" stroke="#4E8B84" stroke-width="1"/>`;
}
function netRack(look: LagoonLook) {
  const mesh = Array.from({ length: 7 }, (_, i) => `<path d="M${22 + i * 9} 112Q${24 + i * 9} 150 ${20 + i * 9.5} 186" stroke="#3E7F78" stroke-width="1.1" fill="none"/>`).join('') + Array.from({ length: 6 }, (_, i) => `<path d="M20 ${122 + i * 12}Q50 ${128 + i * 12} 82 ${122 + i * 12}" stroke="#3E7F78" stroke-width="1.1" fill="none"/>`).join('');
  return `${shadow(look, 40)}<path d="M18 236V100M82 236V100" stroke="#8C603C" stroke-width="5"/><path d="M20 236V100" stroke="#C2915E" stroke-width="1.6"/><path d="M12 104H88" stroke="#8C603C" stroke-width="4"/>
  <path d="M18 108Q50 124 82 108L84 186Q50 204 16 186Z" fill="#8CCBC0" fill-opacity=".55"/>${mesh}
  ${[26, 44, 62, 78].map((x, i) => `<ellipse cx="${x}" cy="${190 + (i % 2) * 6}" rx="5" ry="4" fill="${i % 2 ? '#F28F6B' : '#F6CF6A'}"/>`).join('')}
  <path d="M30 236l6-16h10l6 16Z" fill="#B88A5A"/><path d="M30 236l6-16h4l-4 16Z" fill="#DDB27A"/>`;
}
function gullRock(look: LagoonLook) {
  return `${shadow(look, 44)}<path d="M8 236L18 196L40 176L64 182L86 204L94 236Z" fill="#7F9C9A"/><path d="M40 176L64 182L86 204L94 236H58Z" fill="#5E7E80"/><path d="M18 196L40 176L48 196L30 210Z" fill="#B5C9BF"/>
  <path d="M22 224q8-8 20-2q-8 6-20 2Z" fill="#2F8F7E" fill-opacity=".7"/><path d="M70 226l4-7l3 7l6 1l-5 3l1 6l-5-4l-5 3l2-5l-5-3Z" fill="#F08A5D"/>
  <path d="M46 176q-2-12 8-14q10 0 9 8l8 1l-7 4q-2 6-10 6q-8-1-8-5Z" fill="#F7F4EA"/><path d="M54 170q8-3 15 2l-12 4Z" fill="#B9C3C2"/><circle cx="51" cy="166" r="1.3" fill="#2B3A40"/><path d="M45 164l-6 1l6 2Z" fill="#F2B04C"/><path d="M52 180v6M57 180v6" stroke="#F2B04C" stroke-width="1.4"/>`;
}
function stall(look: LagoonLook) {
  const base = platform(look);
  const stripes = Array.from({ length: 6 }, (_, i) => `<path d="M${6 + i * 15} 126L${21 + i * 15} 126L${21 + i * 15} 138Q${13.5 + i * 15} 146 ${6 + i * 15} 138Z" fill="${i % 2 ? '#F4E6C2' : '#E9786E'}"/>`).join('');
  return `${shadow(look, 46)}${base}<path d="M12 226V126M88 226V126" stroke="#6E4A36" stroke-width="5"/>
  <path d="M8 182H92V226H8Z" fill="#B27650"/><path d="M66 182H92V226H66Z" fill="#8E5C3E"/><path d="M8 182H92V188H8Z" fill="#D9A06C"/><path d="M8 200H92M8 218H92" stroke="#8E5C3E" stroke-width="1.5"/>
  ${[22, 36, 50, 64, 78].map((x, i) => `<circle cx="${x}" cy="176" r="6.5" fill="${['#F6C760', '#F28B5E', '#9BD06A', '#F6C760', '#E9786E'][i]}"/><circle cx="${x - 2}" cy="174" r="2" fill="#FFF4D2" fill-opacity=".7"/>`).join('')}
  <path d="M2 128L50 98L98 128Z" fill="#E9786E"/><path d="M50 98L98 128H70Z" fill="#C85A55"/>${stripes}
  <circle cx="50" cy="150" r="16" fill="${look.glow}" fill-opacity=".28"/><path d="M50 128V140" stroke="#5B3A2E" stroke-width="1"/><ellipse cx="50" cy="148" rx="7" ry="9" fill="#F7A65C"/><path d="M43 148H57" stroke="#FFE19A" stroke-width="1.2"/>`;
}
function drum(look: LagoonLook) {
  return `${shadow(look, 36)}${platform(look)}<path d="M26 226L36 196M74 226L64 196M30 216H70" stroke="#6E4A36" stroke-width="4"/>
  <path d="M24 150Q22 176 30 198H70Q78 176 76 150Z" fill="#B86A48"/><path d="M52 150Q58 176 54 198H70Q78 176 76 150Z" fill="#8E4C38"/>
  ${[0, 1, 2, 3, 4].map(i => `<path d="M${28 + i * 11} 150L${33 + i * 9} 198" stroke="#F3C46B" stroke-width="2" stroke-opacity=".8"/>`).join('')}
  <ellipse cx="50" cy="150" rx="26" ry="8" fill="#F4E2BE"/><ellipse cx="50" cy="150" rx="26" ry="8" fill="none" stroke="#7A4B33" stroke-width="2"/><path d="M30 170H70" stroke="#F3C46B" stroke-width="3"/>
  <path d="M66 148l14-18M72 150l16-14" stroke="#7A4B33" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="130" r="3.5" fill="#F4E2BE"/><circle cx="88" cy="136" r="3.5" fill="#F4E2BE"/>
  <path d="M30 196V96" stroke="#6E4A36" stroke-width="2.5"/><path d="M31 96l22 8l-22 8Z" fill="#7FC8C4"/>`;
}
function lanternPole(look: LagoonLook) {
  const lantern = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="17" fill="${look.glow}" fill-opacity=".3"/><path d="M${x} ${y - 16}v5" stroke="#4E3328" stroke-width="1"/><ellipse cx="${x}" cy="${y}" rx="9" ry="11" fill="${c}"/><path d="M${x - 9} ${y}H${x + 9}M${x - 6} ${y - 7}H${x + 6}M${x - 6} ${y + 7}H${x + 6}" stroke="#FFE19A" stroke-width="1"/><path d="M${x - 4} ${y - 11}h8M${x - 4} ${y + 11}h8" stroke="#4E3328" stroke-width="2"/>`;
  return `${shadow(look, 22)}${platform(look)}<path d="M50 226V52" stroke="#5B3A2E" stroke-width="5"/><path d="M51 236V52" stroke="#9C6B4C" stroke-width="1.4"/><path d="M18 60H82" stroke="#5B3A2E" stroke-width="3"/><path d="M50 52L18 60M50 52L82 60" stroke="#5B3A2E" stroke-width="1.5"/>
  ${lantern(20, 84, '#F48A62')}${lantern(80, 92, '#F6C760')}${lantern(50, 118, '#E9786E')}<path d="M20 61v12M80 61v20M50 60v47" stroke="#4E3328" stroke-width="1"/>`;
}
function flowerArch(look: LagoonLook) {
  const flowers = Array.from({ length: 13 }, (_, i) => { const t = i / 12, a = Math.PI * (1 - t), x = 50 + Math.cos(a) * 38, y = 150 - Math.sin(a) * 52; return `<circle cx="${x}" cy="${y}" r="6" fill="${['#F9B9C4', '#FFE1A1', '#F6A3A0', '#FFFFFF'][i % 4]}"/><circle cx="${x}" cy="${y}" r="2" fill="#F2B04C"/>`; }).join('');
  return `${shadow(look, 44)}${platform(look)}<path d="M12 226V150Q12 92 50 92Q88 92 88 150V226" fill="none" stroke="#5E8F55" stroke-width="7"/><path d="M14 236V150Q14 96 50 96" fill="none" stroke="#8CC47A" stroke-width="2"/>
  ${Array.from({ length: 8 }, (_, i) => `<path d="M${i % 2 ? 88 : 12} ${160 + i * 9}q${i % 2 ? -10 : 10} -2 ${i % 2 ? -12 : 12} 6q${i % 2 ? 6 : -6} 2 ${i % 2 ? 12 : -12} -6Z" fill="#4E8A4F"/>`).join('')}${flowers}
  <path d="M30 150q10 16 20 0q10 16 20 0" fill="none" stroke="#F4E6C2" stroke-width="1.6"/>`;
}
/** Older worlds keep their three shapes until L3 draws them; proportions are now uniform. */
export const PROPS: Record<string, ((look: LagoonLook) => string)[]> = {
  morning: [look => palm(look, 1), hut, netRack, gullRock],
  festival: [stall, drum, lanternPole, flowerArch],
};
export const PROP_SIZE = { width: 100, height: 240 } as const;

/* ---------- Hazards (touchable: 3-unit ink). Same frames and silhouettes as the live art, baked. ---------- */
const INK = '#3E424F';
/** Frame (points) and viewBox per action: jump is low, roll is high with a gap below, lane is tall. */
export const HAZARD_FRAMES = { jump: { width: 72, height: 72, vb: [100, 100] }, duck: { width: 112, height: 129.6, vb: [100, 180] }, lane: { width: 72, height: 129.6, vb: [100, 180] } } as const;
const g = (body: string) => `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g>`;
function duckFrame(fill: string, inner: string) {
  return g(`<path d="M5 177V26L13 21V172M87 172V21L95 26V177" fill="#B48358"/><path d="M4 27L12 20H88L96 27V92L88 101H12L4 92Z" fill="${fill}"/><path d="M4 27L12 20H88L96 27Z" fill="#D2D998" stroke-width="0"/><path d="M88 29L96 27V92L88 101Z" fill="#214E52" fill-opacity=".3" stroke-width="0"/><path d="M4 27H96M12 101H88" stroke="#FFE2AA" stroke-width="5"/>${inner}<path d="M8 120V151M92 120V151" stroke="#F0C78B" stroke-width="2"/>`);
}
/** Redrawn fishing net (LG-S3): float line on top, sagging mesh, weights, a clear gap below to roll under. */
function net() {
  const mesh = Array.from({ length: 9 }, (_, i) => `<path d="M${10 + i * 10} 30Q${12 + i * 10} 66 ${9 + i * 10.2} 98" fill="none"/>`).join('') + Array.from({ length: 6 }, (_, i) => `<path d="M8 ${40 + i * 11}Q50 ${50 + i * 12} 92 ${40 + i * 11}" fill="none"/>`).join('');
  return g(`<path d="M5 177V22M95 177V22" stroke-width="3" fill="none"/><path d="M2 177V24H10V177ZM90 177V24H98V177Z" fill="#9A6B45"/><path d="M4 30V177" stroke="#D6A16B" stroke-width="2"/><path d="M92 30V177" stroke="#D6A16B" stroke-width="2"/>`
    + `<path d="M8 30Q50 42 92 30L92 96Q50 112 8 96Z" fill="#7FC2B8" fill-opacity=".45" stroke-width="2"/>`)
    + `<g stroke="#2F6F69" stroke-width="2" stroke-opacity=".9">${mesh}</g>`
    + g(`<path d="M6 30Q50 42 94 30" fill="none" stroke="#F4E6C2" stroke-width="3.5"/>${[18, 34, 50, 66, 82].map((x, i) => `<ellipse cx="${x}" cy="${34 + (i === 2 ? 3 : i % 2 ? 2 : 0)}" rx="6" ry="4.5" fill="${i % 2 ? '#F6CF6A' : '#F28F6B'}" stroke-width="2"/>`).join('')}${[14, 38, 62, 86].map(x => `<circle cx="${x}" cy="${100 + (x === 38 || x === 62 ? 6 : 2)}" r="3.5" fill="#6F7B80" stroke-width="2"/>`).join('')}<path d="M8 120V151M92 120V151" stroke="#F0C78B" stroke-width="2"/>`);
}
export const HAZARD_ART: Record<string, { action: 'jump' | 'duck' | 'lane'; svg: () => string; ball?: () => string }> = {
  log: { action: 'jump', svg: () => `<ellipse cx="50" cy="94" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + g(`<path d="M13 58L78 43L90 77L23 92Z" fill="#A77250"/><path d="M15 58L78 43L85 52L22 70Z" fill="#DDA56D"/><ellipse cx="22" cy="75" rx="15" ry="17" fill="#E9C38B"/><ellipse cx="22" cy="75" rx="7" ry="10" fill="none" stroke="#AF7D55"/><path d="M41 70L80 61M45 82L84 73" stroke="#7E5945" fill="none" stroke-width="2"/>`) },
  crate: { action: 'jump', svg: () => `<ellipse cx="50" cy="94" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + g(`<path d="M8 58L70 44L92 58V83L29 96L8 80Z" fill="#B88054"/><path d="M8 58L70 44L92 58L29 72Z" fill="#E7BE7C"/><path d="M29 72V96" fill="none"/><path d="M36 74L83 86M83 64L36 91" stroke="#F6D699" stroke-width="4"/>`) },
  cooler: { action: 'jump', svg: () => `<ellipse cx="50" cy="94" rx="44" ry="5" fill="#344B50" fill-opacity=".22"/>` + g(`<path d="M14 62Q14 52 24 52H76Q86 52 86 62V84Q86 92 78 92H22Q14 92 14 84Z" fill="#4FA0B8"/><path d="M60 52H76Q86 52 86 62V84Q86 92 78 92H60Z" fill="#3B7F96" stroke-width="0"/><path d="M10 54Q10 44 22 44H78Q90 44 90 54V58H10Z" fill="#F2F4E2"/><path d="M36 44V36Q36 31 41 31H59Q64 31 64 36V44" fill="none" stroke-width="4"/><path d="M22 70H40" stroke="#EAF7F4" stroke-width="4"/>`) },
  crab: { action: 'jump', svg: () => `<ellipse cx="50" cy="94" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + g(`<path d="M28 77L12 67L5 75M26 84L9 85L4 93M73 77L88 67L95 75M75 84L92 85L97 93" fill="none" stroke="#B96450" stroke-width="5"/><ellipse cx="50" cy="78" rx="27" ry="17" fill="#E28E6F"/><path d="M30 72L19 59L9 64L7 49L18 44L28 55M70 72L81 59L91 64L93 49L82 44L72 55" fill="#F3AC84"/><path d="M39 64V54M61 64V54" stroke-width="4"/><circle cx="39" cy="52" r="4" fill="#FFF0C6"/><circle cx="61" cy="52" r="4" fill="#FFF0C6"/><path d="M39 52h1M61 52h1" stroke-width="3"/><path d="M41 82Q50 87 59 82" fill="none" stroke-width="2"/>`) },
  coconut: { action: 'jump', svg: () => `<ellipse cx="50" cy="94" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>`, ball: () => g(`<circle cx="49" cy="72" r="23" fill="#AE7950"/><path d="M34 59Q49 44 63 61" stroke="#E4BA7D" stroke-width="5" fill="none"/><path d="M38 85Q35 69 48 55" stroke="#815743" fill="none"/>${[43, 51, 47].map((x, i) => `<circle cx="${x}" cy="${66 + i * 6}" r="2" fill="#493C37" stroke-width="0"/>`).join('')}`) },
  net: { action: 'duck', svg: () => `<ellipse cx="50" cy="175" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + net() },
  frond: { action: 'duck', svg: () => `<ellipse cx="50" cy="175" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + duckFrame('#568B66', `<g fill="#92BE78">${[12, 30, 48, 66, 84].map(x => `<path d="M${x} 32q15 17 7 58q-16-20-7-58Z"/>`).join('')}</g>`) },
  banner: { action: 'duck', svg: () => `<ellipse cx="50" cy="175" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + duckFrame('#DC8872', `<path d="M15 37L29 79L43 37L57 79L71 37L85 79" stroke="#FFE8AC" stroke-width="6" fill="none"/>`) },
  line: { action: 'duck', svg: () => `<ellipse cx="50" cy="175" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + duckFrame('#80B5A2', `<path d="M15 37L29 79L43 37L57 79L71 37L85 79" stroke="#FFE8AC" stroke-width="6" fill="none"/>`) },
  rock: { action: 'lane', svg: () => `<ellipse cx="50" cy="175" rx="47" ry="5" fill="#344B50" fill-opacity=".22"/>` + g(`<path d="M3 174Q0 140 12 118Q18 92 36 88Q44 70 62 74Q80 72 86 96Q99 112 97 140Q99 160 96 174Q50 182 3 174Z" fill="#C2A27C"/><path d="M62 74Q80 72 86 96Q99 112 97 140Q99 160 96 174Q74 179 56 178Q74 140 62 74Z" fill="#9B7C5C" stroke-width="0"/><path d="M14 120Q20 98 36 94Q30 108 26 126Z" fill="#E2CBA6" stroke-width="0"/><path d="M40 92Q48 80 60 80" fill="none" stroke="#E2CBA6" stroke-width="4"/><path d="M30 138L38 150L34 162M70 120L64 134" fill="none" stroke="#86684C" stroke-width="2"/><path d="M36 90Q46 78 62 76Q76 76 82 88Q66 82 50 86Q42 88 36 90Z" fill="#7FA36A" stroke-width="0"/>`) + `<g fill="#F2E9D8" stroke="#86684C" stroke-width="1.2">${[[18,156],[24,162],[14,164],[80,150],[86,158]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>` },
  wall: { action: 'lane', svg: () => `<ellipse cx="50" cy="175" rx="46" ry="5" fill="#344B50" fill-opacity=".22"/>` + g(`<path d="M4 177V64Q50 52 96 64V177Z" fill="#7B8C8C"/>` + [[6,150,30,26],[38,150,28,26],[68,150,26,26],[14,122,30,26],[46,122,34,26],[6,94,26,26],[34,94,30,26],[66,94,28,26],[18,66,32,26],[52,66,32,26]].map(([x,y,w,h],i)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${['#B8B2A2','#A39D8D','#C9C2B0','#9A9585'][i%4]}"/><path d="M${x+5} ${y+6}h${w*.5}" stroke="#E6E0CE" stroke-width="3" fill="none"/>`).join('') + `<path d="M2 62Q50 48 98 62" stroke="#7A5436" stroke-width="7" fill="none"/>`) },
};
/** Collectable shell, 32-unit source drawn at 30 points. */
export const SHELL_SVG = `<circle cx="16" cy="16" r="15" fill="#FFF1A0" fill-opacity=".24"/><path d="M8 24L3 14Q2 8 7 7Q9 2 14 5Q19 1 23 6Q30 5 29 13L24 24L19 28H13Z" fill="#FFD476" stroke="#9B693F" stroke-width="1.7"/><path d="M14 24L8 10M17 24V8M20 24L25 10" stroke="#FFF3BF" stroke-width="2" stroke-linecap="round"/><path d="M10 25H23L20 29H13Z" fill="#E9A957" stroke="#9B693F" stroke-width="1.3"/><circle cx="8" cy="9" r="2" fill="#FFFBE0"/>`;
export const POWER_SVG: Record<string, string> = {
  magnet: `<path d="M14 14V35Q15 56 32 56Q50 56 50 35V14H38V34Q38 43 32 43Q26 43 26 34V14Z" fill="#EF977F"/><path d="M14 23H26M38 23H50" stroke="#FFF7DA" stroke-width="6"/><path d="M5 14L10 19M54 20L60 14" stroke="#E4AA4E"/>`,
  kite: `<path d="M32 7L53 26L32 44L11 26Z" fill="#6FC0C8"/><path d="M32 7V44M11 26H53" fill="none" stroke="#FFE4A0"/><path d="M32 44Q17 49 35 57" fill="none"/><path d="M24 47L36 52M25 54L36 58" stroke="#EF977F"/>`,
  sandals: `<path d="M19 12Q26 12 25 25L20 36Q17 43 10 39Q6 35 11 26L13 16Q14 12 19 12M44 10Q52 11 50 25L46 35Q43 43 36 38Q32 35 36 26L38 14Q40 10 44 10" fill="#F4C86A"/><path d="M9 45L21 48L10 52L22 56M34 44L48 47L37 52L50 55" fill="none" stroke="#5B9A87"/>`,
  shield: `<path d="M32 9L52 18V34Q48 49 32 57Q16 49 12 34V18Z" fill="#8EBE85"/><ellipse cx="32" cy="31" rx="14" ry="17" fill="#4F8A76"/><path d="M24 19L32 27L41 20M32 27V43M19 34L32 27L46 34" fill="none" stroke="#D5E5A1"/>`,
};
export const powerSvg = (kind: string) => `<circle cx="32" cy="32" r="29" fill="#FFF4CD" stroke="${INK}" stroke-width="3"/><g stroke="${INK}" stroke-width="3" stroke-linejoin="round">${POWER_SVG[kind]}</g>`;

/** Rail post and rope span, 160×144 (post at x 8–24, rope to the next post at x 144). */
export const RAILS: Record<string, (look: LagoonLook) => string> = {
  morning: look => `<path d="M16 128L0 139H13L31 128Z" fill="${look.shade}" fill-opacity=".3"/><path d="M16 50Q80 84 144 50" fill="none" stroke="#F4E6C2" stroke-width="3"/>${[48, 80, 112].map((x, i) => `<path d="M${x} ${62 + (i === 1 ? 8 : 4)}v8" stroke="#F4E6C2" stroke-width="1.5"/><ellipse cx="${x}" cy="${76 + (i === 1 ? 8 : 4)}" rx="6" ry="4.5" fill="${i % 2 ? '#F6CF6A' : '#F28F6B'}" stroke="#3E424F" stroke-width="1.5"/>`).join('')}<path d="M8 128V30H24V128Z" fill="#A9774A" stroke="#5E3F2E" stroke-width="2"/><path d="M10 128V30" stroke="#DDAA70" stroke-width="3"/><path d="M5 30H27V38H5Z" fill="#7E5434" stroke="#5E3F2E" stroke-width="2"/><path d="M8 52H24M8 56H24" stroke="#F4E6C2" stroke-width="2"/>`,
  festival: look => `<path d="M16 128L0 139H13L31 128Z" fill="${look.shade}" fill-opacity=".35"/><path d="M16 46Q80 80 144 46" fill="none" stroke="#5B3A2E" stroke-width="2"/>${Array.from({ length: 7 }, (_, i) => { const t = (i + .5) / 7, x = 16 + 128 * t, y = 46 + Math.sin(t * Math.PI) * 17; return `<path d="M${x - 6} ${y}L${x + 6} ${y + 1}L${x} ${y + 12}Z" fill="${['#F6C760', '#EE8A7E', '#7FC8C4', '#F4E6C2', '#B79AE0'][i % 5]}"/>`; }).join('')}<path d="M8 128V36H24V128Z" fill="#7E4E36" stroke="#3E2432" stroke-width="2"/><path d="M10 128V36" stroke="#B57A52" stroke-width="3"/><circle cx="16" cy="24" r="22" fill="${look.glow}" fill-opacity=".28"/><path d="M16 34v-4" stroke="#3E2432" stroke-width="2"/><ellipse cx="16" cy="22" rx="10" ry="12" fill="#F48A62" stroke="#3E2432" stroke-width="1.5"/><path d="M6 22H26M9 14H23M9 30H23" stroke="#FFD57A" stroke-width="1.2"/><path d="M11 10h10M11 34h10" stroke="#3E2432" stroke-width="2.5"/>`,
};
