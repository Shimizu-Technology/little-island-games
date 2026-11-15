/** Build-time only. Generates and certifies the five C1d Deep Water ideas on the app's own engine:
 * Rising tide, Key and gate, Songs, Foggy beach and Two crabs, each as teach, develop, twist, short hard,
 * easy finish. Run: node --import ./scripts/puzzles/register.mjs src/learn/games/crab-commands/bake-deep.ts */
import { writeFileSync } from 'node:fs';
import { createRng } from '../../../puzzles/rng';
import { encodeProgram } from '../../program/codec';
import { nodeCost, type Node, type Program } from '../../program/model';
import { commands, type Command, type Level } from './engine';
import { execute, runPlan, solution, type Descriptor } from './challenge-engine';
import { blockBest, flatBest, runNodes } from './search';
import { codes, crabSim } from './proofs';
import { programCodes } from './program';
import { greedyBot, worldSim } from './deep-proofs';

const rng = createRng(0xc1dd33a7);
const pick = <T,>(items: readonly T[]) => items[rng.below(items.length)];
const rowsOf = (cells: string[]) => [0, 1, 2, 3, 4].map(r => cells.slice(r * 5, r * 5 + 5).join(''));
const blank = () => Array.from({ length: 25 }, () => '.');
const seen = new Set<string>();
const fresh = (key: string) => (seen.has(key) ? false : (seen.add(key), true));
type Role = 'teach' | 'develop' | 'twist' | 'short' | 'easy';
const roles: Role[] = ['teach', 'develop', 'twist', 'short', 'easy'];
const describe = (id: string, rows: string[], pace: Level['pace'], extra: Partial<Level>, d: Partial<Descriptor>, lesson: string): Descriptor =>
  ({ level: { id, rows, tier: 0, pace, skill: d.tray !== undefined ? 'think.loops' : 'think.sequence', facing: 1, ...extra }, budget: null, starter: [], lesson, ...d });
function scatter(cells: string[], mark: string, count: number) {
  for (let i = 0; i < count; i++) { for (let t = 0; t < 50; t++) { const at = rng.below(25); if (cells[at] === '.') { cells[at] = mark; break; } } }
}
const steppedOn = (d: Descriptor, plan: Command[], mark: string) => execute(d, plan).frames.some(w => d.level.rows.join('')[w.pos] === mark);

// ---- Rising tide ---------------------------------------------------------------------------
const tideLessons: Record<Role, string> = {
  teach: 'Low sand floods once the crab has walked the tide number of squares. Cross while it is dry.',
  develop: 'The tide is just long enough. Do not take extra steps.',
  twist: 'The shortest route gets cut off by the tide. Which shell should the crab visit first?',
  short: 'A short beach with a fast tide. Plan the route before you press Go.',
  easy: 'One last low-sand crossing, with time to spare.',
};
/** Hand-drawn tide beaches (the twist is the school-spec sample at tide 7); the short hard one is searched for. */
const tideAuthored: Partial<Record<Role, [string[], number]>> = {
  teach: [['C~~~H', '.....', '#####', '#####', '#####'], 4],
  develop: [['C....', '####~', 'H~~~~', '#####', '#####'], 9],
  twist: [['....C', 'S###.', '~H.S~', '...#.', '.~...'], 7],
  short: [['C.~S.', '###~.', '###H.', '#####', '#####'], 3],
  easy: [['.....', 'C~~H.', '.....', '#####', '#####'], 4],
};
function tidePuzzle(role: Role, id: string): unknown | null {
  const authored = tideAuthored[role];
  if (authored) {
    const [rows, tide] = authored, d = describe(id, rows, 'medium', { tide }, {}, tideLessons[role]), plan = solution(d), open = solution(describe(id, rows, 'medium', {}, {}, ''));
    if (!plan || !open || solution(describe(id, rows, 'medium', { tide: tide - 1 }, {}, '')) && role === 'develop') throw new Error(`Tide ${role} is not certified`);
    const cut = plan.length > open.length;
    if ((role === 'twist' || role === 'short') && (!cut || greedyBot(d).won)) throw new Error(`Tide ${role} must cut the short route and beat the greedy player`);
    return { descriptor: d, witness: plan, cards: plan.length, proof: { open: open.length, cut } };
  }
  const cells = blank();
  scatter(cells, 'C', 1); scatter(cells, 'H', 1);
  scatter(cells, 'S', role === 'teach' || role === 'easy' ? rng.below(2) : 1 + rng.below(2));
  const crab = cells.indexOf('C'), far = (p: number) => Math.abs((p % 5) - (crab % 5)) + Math.abs(Math.floor(p / 5) - Math.floor(crab / 5)) >= 2;
  for (let i = 0, n = 2 + rng.below(4); i < n; i++) { const p = rng.below(25); if (cells[p] === '.' && far(p)) cells[p] = '~'; }
  scatter(cells, '#', 1 + rng.below(4));
  const rows = rowsOf(cells);
  if (!rows.join('').includes('~')) return null;
  const base = describe(id, rows, 'medium', {}, {}, tideLessons[role]), open = solution(base);
  if (!open) return null;
  let tight: number | null = null;
  for (let t = 1; t <= 14; t++) if (solution(describe(id, rows, 'medium', { tide: t }, {}, ''))) { tight = t; break; }
  // A real race: the tide comes in after several squares, and the plan crosses low sand near the deadline.
  if (tight === null || tight < 3) return null;
  const easyRole = role === 'teach' || role === 'easy';
  const tide = easyRole ? tight + 1 : role === 'develop' ? tight : tight;
  const d = describe(id, rows, 'medium', { tide }, {}, tideLessons[role]), plan = solution(d);
  if (!plan || !steppedOn(d, plan, '~')) return null;
  const walk = execute(d, plan).frames, lastLow = walk.reduce((last, w, i) => (i && rows.join('')[w.pos] === '~' && w.pos !== walk[i - 1].pos ? (w.walked ?? 0) : last), 0);
  if (role !== 'short' && lastLow < tide - 2) return null;
  const cut = plan.length > open.length;
  if (easyRole && (cut || plan.length > (role === 'teach' ? 5 : 4) || plan.length < 2)) return null;
  if (role === 'develop' && (cut || plan.length < 5 || plan.length > 8)) return null;
  if (role === 'twist' && (!cut || plan.length < 8 || plan.length > 14 || greedyBot(d).won)) return null;
  if (role === 'short' && (!cut || plan.length > 10 || greedyBot(d).won)) return null;
  return { descriptor: d, witness: plan, cards: plan.length, proof: { open: open.length, tight, cut } };
}

// ---- Key and gate --------------------------------------------------------------------------
const keyLessons: Record<Role, string> = {
  teach: 'The gate opens once the crab holds the key. Walk over the key, then through the gate.',
  develop: 'The key is not on the way. Fetch it first, then come back to the gate.',
  twist: 'Shells, a key and a gate. Which should the crab visit first?',
  short: 'The gate is right beside the crab, but the key is not.',
  easy: 'Key, gate, home.',
};
function keyPuzzle(role: Role, id: string): unknown | null {
  const cells = blank();
  scatter(cells, 'C', 1); scatter(cells, 'K', 1); scatter(cells, 'G', 1); scatter(cells, 'H', 1);
  scatter(cells, 'S', role === 'twist' ? 1 + rng.below(2) : rng.below(2)); scatter(cells, '#', 4 + rng.below(6));
  const rows = rowsOf(cells), d = describe(id, rows, 'medium', {}, {}, keyLessons[role]), plan = solution(d);
  if (!plan) return null;
  const withoutKey = solution({ ...d, level: { ...d.level, rows: rows.map(r => r.replace('K', '.')) } });
  const gateOpen = solution({ ...d, level: { ...d.level, rows: rows.map(r => r.replace('G', '.')) } });
  if (withoutKey || !gateOpen || !steppedOn(d, plan, 'G')) return null;
  const detour = plan.length > gateOpen.length;
  if ((role === 'teach' || role === 'easy') && (detour || plan.length > (role === 'teach' ? 6 : 5))) return null;
  if (role === 'develop' && (!detour || plan.length < 6 || plan.length > 10)) return null;
  if (role === 'twist' && (!detour || plan.length < 10 || plan.length > 16 || greedyBot(d).won)) return null;
  if (role === 'short' && (!detour || plan.length > 8 || greedyBot(d).won)) return null;
  return { descriptor: d, witness: plan, cards: plan.length, proof: { gateOpen: gateOpen.length, detour } };
}

// ---- Two crabs -----------------------------------------------------------------------------
const twoLessons: Record<Role, string> = {
  teach: 'Two crabs, one plan. Every card moves both crabs. Bring each crab to a home.',
  develop: 'A crab that would bump just stays where it is. Use the edge to hold one crab still.',
  twist: 'Use a sandcastle to hold one crab while the other walks on.',
  short: 'A short plan for two crabs. Which crab should wait?',
  easy: 'Two crabs walking home together.',
};
function twoPuzzle(role: Role, id: string): unknown | null {
  const cells = blank();
  scatter(cells, 'C', 2); scatter(cells, 'H', 2);
  scatter(cells, 'S', role === 'twist' ? rng.below(2) : 0); scatter(cells, '#', role === 'teach' || role === 'easy' ? rng.below(2) : 1 + rng.below(4));
  const rows = rowsOf(cells), d = describe(id, rows, 'easy', {}, { crabs: 2 }, twoLessons[role]), plan = solution(d);
  if (!plan) return null;
  const r = execute(d, plan), holds = plan.filter((_, i) => r.worlds[i].some((w, crab) => w.pos === r.worlds[i + 1][crab].pos)).length;
  if ((role === 'teach' || role === 'easy') && (holds || plan.length < 2 || plan.length > 3)) return null;
  if (role === 'develop' && (holds !== 1 || plan.length < 3 || plan.length > 5)) return null;
  if (role === 'twist' && (holds < 2 || plan.length < 5 || plan.length > 8 || greedyBot(d).won)) return null;
  if (role === 'short' && (holds < 1 || plan.length > 5 || greedyBot(d).won)) return null;
  return { descriptor: d, witness: plan, cards: plan.length, proof: { holds } };
}

// ---- Songs ---------------------------------------------------------------------------------
const W = codes(commands('medium'));
const cmd = (c: number): Node => ({ kind: 'command', command: c });
const songLessons: Record<Role, string> = {
  teach: 'Build a group of cards, then press Make plan a song. Call the song wherever the group comes again.',
  develop: 'The same group of cards comes three times, with other cards between. A song saves blocks.',
  twist: 'Different cards sit between the groups. Find the group that comes back.',
  short: 'The tray is tight. Only one song fits.',
  easy: 'One song, called twice.',
};
/** A song captures a group that comes back. On a 5×5 beach a Repeat block can capture the same groups in as few
 * blocks (the bake measured it), so the Songs idea offers cards and songs only, never Repeat. */
// Plain strings: S calls the song, any other letter is a single card. (A table of single letters reads as a word grid.)
const templates: Record<Role, string[]> = {
  teach: ['SxSxS', 'SSxS'], develop: ['SxSyS'], twist: ['xSySzS', 'SxSySz'], short: ['SxSyS'], easy: ['SxSxS', 'SSxS'],
};
function songPuzzle(role: Role, id: string): unknown | null {
  const song = Array.from({ length: role === 'develop' || role === 'twist' ? 4 + rng.below(2) : role === 'short' ? 5 : 4 }, () => pick(W));
  if (song.filter(c => c === 4).length < 2 || song[0] === 5 || song[0] === 6 && song.at(-1) === 5) return null;
  const separators = rng.shuffle(W).slice(0, 3);
  let sep = 0;
  const same = role === 'teach' || role === 'easy';
  const main: Node[] = [...pick(templates[role])].map(t => (t === 'S' ? { kind: 'call', song: 0 } as Node : cmd(separators[same ? 0 : sep++])));
  const program: Program = { version: 1, body: main, songs: [song.map(cmd)] };
  const expanded = main.flatMap(n => (n.kind === 'call' ? song : n.kind === 'command' ? [n.command] : []));
  // Try every start square: a long plan fits a 5×5 beach only from a few of them.
  const starts = rng.shuffle([...Array(25).keys()]).flatMap(at => {
    const cells = blank(); cells[at] = 'C';
    const sim = crabSim({ id, rows: rowsOf(cells), tier: 0, pace: 'medium', skill: 'think.loops', facing: 1 }), route = [at];
    let w = sim.start;
    for (const c of expanded) { const n = sim.step(w, c); if (!n) return []; if (n.pos !== w.pos) route.push(n.pos); w = n; }
    return new Set(route).size === route.length && route.length >= 8 ? [route] : [];
  });
  if (!starts.length) return null;
  const route = starts[0], cells = blank();
  cells[route[0]] = 'C'; cells[route.at(-1)!] = 'H';
  for (const p of rng.shuffle(route.slice(1, -1)).slice(0, 1 + rng.below(3))) cells[p] = 'S';
  const near = [...new Set(route.flatMap(p => [p - 5, p + 5, p % 5 ? p - 1 : -1, p % 5 < 4 ? p + 1 : -1]))].filter(p => p >= 0 && p < 25 && !route.includes(p));
  for (const p of rng.shuffle(near).slice(0, 3 + rng.below(8))) cells[p] = '#';
  const rows = rowsOf(cells), cost = nodeCost(program), tray = role === 'teach' || role === 'easy' ? cost + 1 : cost;
  const d = describe(id, rows, 'medium', {}, { blockEditor: true, tray, tools: { songs: true, repeat: false } }, songLessons[role]);
  const flat = flatBest(crabSim(d.level), W)?.cards ?? null;
  if (flat === null || flat <= tray) return null;
  if (!runPlan(d, { program: expanded.map(c => programCodes[c]), blockDraft: encodeProgram(program) }).won) return null;
  if (role === 'short' && flat > 15) return null;
  if (greedyBot(d).won) return null;
  return { descriptor: d, witness: encodeProgram(program), cards: expanded.length, solutions: [encodeProgram(program)], proof: { flat, blocks: cost } };
}

// ---- Foggy beach ---------------------------------------------------------------------------
const fogLessons: Record<Role, string> = {
  teach: 'Fog hides which beach this is. One plan must work on both. Use If blocked inside a Repeat.',
  develop: 'Turn when the way is blocked, otherwise walk. Will that bring the crab home on both beaches?',
  twist: 'The sandcastles sit in different places. Choose what to do when blocked.',
  short: 'Two foggy beaches and a tight tray.',
  easy: 'One more foggy walk home.',
};
const If = (yes: Node[], no: Node[]): Node => ({ kind: 'if', condition: { kind: 'blocked' }, yes, no });
const fogFamily = (): Node[][] => {
  const R = cmd(6), L = cmd(5), F = cmd(4), k = pick([4, 6, 8]);
  return [
    [{ kind: 'repeat', times: k, body: [If([R], [F])] }],
    [{ kind: 'repeat', times: k, body: [If([L], [F])] }],
    [{ kind: 'repeat', times: k, body: [If([R, F], [F])] }],
    [{ kind: 'repeat', times: k, body: [If([L, F], [F])] }],
    [F, { kind: 'repeat', times: k, body: [If([R], [F])] }],
    [{ kind: 'repeat', times: k, body: [If([R], [F, F])] }],
  ];
};
function fogPuzzle(role: Role, id: string): unknown | null {
  const family = fogFamily(), body = pick(family);
  const program: Program = { version: 1, body, songs: [] };
  // Start from the school-spec foggy pair and move a few sandcastles; most random pairs share a flat route.
  const beach = (seed: string[]) => { const cells = seed.join('').replace('H', '.').split(''); for (let i = rng.below(4); i > 0; i--) { const at = 1 + rng.below(24); cells[at] = cells[at] === '#' ? '.' : '#'; } return cells; };
  const a = beach(['C.#..', '#....', '.....', 'H....', '..#.#']), b = beach(['C##..', '.....', '.....', 'H....', '..#.#']);
  // Each crab stops the moment it reaches home, so home is a square both routes reach: the deepest one they share.
  const route = (cells: string[]) => {
    const l: Level = { id, rows: rowsOf(cells), tier: 0, pace: 'medium', skill: 'think.loops', facing: 1 }, sim = crabSim(l), visits = [0];
    const trace = { ...sim, step: (w: ReturnType<typeof sim.step> & object, c: number) => { const n = sim.step(w, c); if (n && n.pos !== w.pos) visits.push(n.pos); return n; }, won: () => false };
    runNodes(trace as typeof sim, sim.start, body);
    return visits;
  };
  const ra = route(a), rb = route(b), shared = ra.filter((p, i) => i > 0 && rb.includes(p));
  if (!shared.length || a.join('') === b.join('')) return reject('fog1');
  const home = shared.reduce((best, p) => (Math.min(ra.indexOf(p), rb.indexOf(p)) > Math.min(ra.indexOf(best), rb.indexOf(best)) ? p : best));
  if (Math.min(ra.indexOf(home), rb.indexOf(home)) < 4) return reject('fog2');
  a[home] = 'H'; b[home] = 'H';
  const tray = nodeCost(program);
  if ((role === 'teach' || role === 'easy' || role === 'short') && tray > 5) return reject('fog6');
  if ((role === 'twist' || role === 'develop') && tray < 5) return reject('fog7');
  const d = describe(id, rowsOf(a), 'medium', {}, { blockEditor: true, tray, fog: [{ rows: rowsOf(b) }], tools: { condition: true } }, fogLessons[role]);
  if (!runPlan(d, { program: [], blockDraft: encodeProgram(program) }).won) return reject('fog3');
  // No flat plan of any length brings both crabs home, and no plan of cards and Repeats fits the tray.
  if (flatBest(worldSim(d), W, 40)) return reject('fog4');
  const loops = blockBest(worldSim(d), W, tray, { nest: 2, work: 600_000 });
  if (loops.exhausted || loops.best !== null) return reject('fog5');
  return { descriptor: d, witness: encodeProgram(program), cards: 0, solutions: [encodeProgram(program)], proof: { flat: null, blocks: nodeCost(program), loopsWithinTray: false } };
}

const rejected: Record<string, number> = {};
const reject = (why: string) => { rejected[why] = (rejected[why] ?? 0) + 1; return null; };
const ideas = { tide: tidePuzzle, key: keyPuzzle, songs: songPuzzle, fog: fogPuzzle, two: twoPuzzle } as const;
const out: Record<string, unknown[]> = {};
const only = process.env.CRAB_BAKE_ONLY?.split(',');
for (const [name, make] of Object.entries(ideas)) {
  if (only && !only.includes(name)) continue;
  out[name] = [];
  for (const [i, role] of roles.entries()) {
    let made: unknown = null;
    let tries = 0;
    for (; !made && tries < Number(process.env.CRAB_BAKE_TRIES ?? 200000); tries++) {
      if (tries && tries % 20000 === 0) console.error(`${name} ${role}: ${tries} tries`);
      const p = make(role, `${name}-${i + 1}`) as { descriptor: Descriptor } | null;
      if (p && fresh(JSON.stringify([p.descriptor.level.rows, p.descriptor.fog?.map(f => f.rows)]))) made = p;
    }
    if (!made) throw new Error(`No ${name} ${role} after ${tries} tries ${JSON.stringify(rejected)}`);
    out[name].push({ role, ...(made as object) });
    const p = made as { descriptor: Descriptor; cards: number; proof: unknown };
    console.log(name, role, tries, p.descriptor.level.rows.join('/'), p.descriptor.fog?.[0]?.rows.join('/') ?? '', 'tide', p.descriptor.level.tide ?? '-', 'tray', p.descriptor.tray ?? '-', 'cards', p.cards, JSON.stringify(p.proof));
  }
}
if (!only) writeFileSync(new URL('./deep-content.json', import.meta.url), JSON.stringify({ version: 1, ...out }, null, 1) + '\n');
