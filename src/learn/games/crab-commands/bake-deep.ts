/** Build-time only. Generates and certifies the five C1d Deep Water ideas on the app's own engine:
 * Rising tide, Key and gate, Songs, Foggy beach and Two crabs, each as teach, develop, twist, short hard,
 * easy finish. Run: node --import ./scripts/puzzles/register.mjs src/learn/games/crab-commands/bake-deep.ts */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRng } from '../../../puzzles/rng';
import { encodeProgram } from '../../program/codec';
import { nodeCost, validProgram, type Node, type Program } from '../../program/model';
import { commands, type Command, type Level } from './engine';
import { execute, fogLevels, runPlan, solution, type Descriptor } from './challenge-engine';
import { flatBest, runNodes } from './search';
import { codes, crabSim } from './proofs';
import { programCodes } from './program';
import { greedyBot, worldSim } from './deep-proofs';

// Each idea draws from its own seed, so re-baking one idea (CRAB_BAKE_ONLY) leaves the others exactly as they are.
let rng = createRng(0xc1dd33a7);
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
  // Teach and the easy finish call the song twice; develop and later call it three times.
  teach: ['SxS'], develop: ['SxSyS'], twist: ['xSySzS', 'SxSySz'], short: ['SxSyS'], easy: ['SxS'],
};
function songPuzzle(role: Role, id: string): unknown | null {
  const song = Array.from({ length: role === 'develop' || role === 'twist' ? 4 + rng.below(2) : 5 }, () => pick(W));
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
  const rows = rowsOf(cells), cost = nodeCost(program), tray = cost;
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
  develop: 'Try one card before the Repeat. Where should the crab face before it starts?',
  twist: 'This beach needs a longer plan. Try two cards in one branch.',
  short: 'Two foggy beaches and a tight tray with no spare block. The shortest plans from the last beaches will not work here.',
  easy: 'One more foggy walk home, with room to spare.',
};
const If = (yes: Node[], no: Node[]): Node => ({ kind: 'if', condition: { kind: 'blocked' }, yes, no });
/** What each rung asks for beyond the one before, as the program it needs:
 * teach: Repeat [If blocked: turn, otherwise: walk] · develop: a card before the Repeat · twist: a branch with two cards ·
 * Tight tray: a five-block program no earlier rung's shortest plan can stand in for · easy: the teaching shape, with room to spare. */
const fogFamily = (role: Role): Node[] => {
  const F = cmd(4), T = () => cmd(pick([5, 6])), X = () => cmd(pick(W)), k = pick([4, 6, 8]);
  const loop = (yes: Node[], no: Node[]): Node => ({ kind: 'repeat', times: k, body: [If(yes, no)] });
  if (role === 'teach' || role === 'easy') return [loop([T()], [F])];
  if (role === 'develop') return [X(), loop([T()], [F])];
  if (role === 'twist') return pick([[loop([T(), F], [F])], [loop([T()], [F, F])]]);
  // Tight tray: five-block shapes the earlier rungs do not teach (a card after the Repeat, or an If sharing the Repeat with cards).
  const rep = (body: Node[]): Node => ({ kind: 'repeat', times: k, body });
  return pick([[loop([T()], [F]), X()], [rep([F, If([T()], [F])])], [rep([If([T()], []), F, F])], [rep([If([T()], [F]), T()])], [rep([If([T()], []), F]), X()], [rep([F, F, If([T()], [])])], [loop([T(), T()], [F])]]);
};

/** Every program of up to five blocks the editor can build on a foggy beach: Walk, Turn left, Turn right, Repeat at its
 * button counts (2, 3, 4, 6, 8) and If blocked with both branches. Lists share their tails, so a run is memoized per list. */
type PNode = { id: number; k: 'c'; c: number } | { id: number; k: 'r'; n: number; body: PList } | { id: number; k: 'i'; yes: PList | null; no: PList | null };
type PList = { id: number; head: PNode; tail: PList | null; cost: number };
let pid = 0;
const pLists: PList[][] = [[]], pNodes: PNode[][] = [[]];
for (let cost = 1; cost <= 5; cost++) {
  const nodes: PNode[] = cost === 1 ? W.map(c => ({ id: pid++, k: 'c' as const, c })) : [];
  if (cost > 1) {
    for (const body of pLists[cost - 1]) for (const n of [2, 3, 4, 6, 8]) nodes.push({ id: pid++, k: 'r', n, body });
    for (let y = 0; y < cost; y++) for (const yes of y ? pLists[y] : [null]) for (const no of cost - 1 - y ? pLists[cost - 1 - y] : [null]) nodes.push({ id: pid++, k: 'i', yes, no });
  }
  pNodes.push(nodes);
  const lists: PList[] = [];
  for (let k = 1; k <= cost; k++) for (const head of pNodes[k]) for (const tail of k === cost ? [null] : pLists[cost - k]) lists.push({ id: pid++, head, tail, cost });
  pLists.push(lists);
}
const allPrograms = pLists.flat();
const toNodes = (l: PList | null): Node[] => l ? [toNode(l.head), ...toNodes(l.tail)] : [];
const toNode = (n: PNode): Node => n.k === 'c' ? cmd(n.c) : n.k === 'r' ? { kind: 'repeat', times: n.n, body: toNodes(n.body) } : If(toNodes(n.yes), toNodes(n.no));
const toProgram = (l: PList): Program => ({ version: 1, body: toNodes(l), songs: [] });
/** One beach as a raw grid machine: a bump fails the run, and the crab stops the moment it is home with every shell. */
function fogMachine(rows: string[]) {
  const cells = rows.join(''), shellAt = new Map([...cells].flatMap((c, i) => (c === 'S' ? [i] : [])).map((p, i) => [p, 1 << i]));
  const all = (1 << shellAt.size) - 1, FAIL = -1, memo = new Map<number, number>();
  const pos = (s: number) => (s >> 2) % 25, dir = (s: number) => s & 3, mask = (s: number) => Math.floor((s >> 2) / 25);
  const home = (s: number) => s >= 0 && cells[pos(s)] === 'H' && mask(s) === all;
  const move = (s: number, c: number) => {
    if (c !== 4) return (s & ~3) | ((dir(s) + (c === 5 ? 3 : 1)) % 4);
    const x = (pos(s) % 5) + [0, 1, 0, -1][dir(s)], y = Math.floor(pos(s) / 5) + [-1, 0, 1, 0][dir(s)];
    if (x < 0 || x > 4 || y < 0 || y > 4 || cells[y * 5 + x] === '#') return FAIL;
    const p = y * 5 + x;
    return ((mask(s) | (shellAt.get(p) ?? 0)) * 25 + p) * 4 + dir(s);
  };
  const runNode = (n: PNode, s: number): number => {
    if (n.k === 'c') return move(s, n.c);
    if (n.k === 'i') return runList(move(s, 4) === FAIL ? n.yes : n.no, s);
    for (let i = 0; i < n.n && s !== FAIL && !home(s); i++) s = runList(n.body, s);
    return s;
  };
  const runList = (l: PList | null, s: number): number => {
    if (!l || s === FAIL || home(s)) return s;
    const key = l.id * 4096 + s, hit = memo.get(key);
    if (hit !== undefined) return hit;
    const out = runList(l.tail, runNode(l.head, s));
    memo.set(key, out);
    return out;
  };
  const start = cells.indexOf('C') * 4 + 1;
  return (l: PList) => home(runList(l, start));
}
/** All of a foggy pair's winners within five blocks, and the fewest blocks among them. */
function fogWinners(d: Descriptor) {
  const beaches = fogLevels(d).map(l => fogMachine(l.rows));
  return { winners: allPrograms.filter(l => beaches.every(won => won(l))) };
}
const hasIfInRepeat = (nodes: Node[], inside = false): boolean => nodes.some(n => n.kind === 'if' ? inside || hasIfInRepeat([...n.yes, ...n.no], inside) : n.kind === 'repeat' ? hasIfInRepeat(n.body, true) : false);
/** Each rung's fewest-block winners (the grid machine's set, so the check is conservative), kept so a later rung can prove
 * that no earlier shortest plan stands in for its own. On the hard rungs the tray is the minimum, so these are all their winners. */
const fogEarlier: { role: Role; ids: Set<number> }[] = [];
const relaxed0 = (role: Role) => role === 'teach' || role === 'easy';
/** Tight tray's plan: any five-block palette program that is not a shortest winner of an earlier rung. */
const fogTightPlans = () => pLists[5].filter(l => !fogEarlier.some(e => e.ids.has(l.id)) && hasIfInRepeat(toNodes(l)) && validProgram(toProgram(l)));
let tightPlans: PList[] | null = null;
function fogPuzzle(role: Role, id: string): unknown | null {
  if (role === 'short') tightPlans ??= fogTightPlans();
  const body = role === 'short' ? toNodes(pick(tightPlans!)) : fogFamily(role);
  const program: Program = { version: 1, body, songs: [] };
  // Start from the school-spec foggy pair and move a few sandcastles; most random pairs share a flat route.
  const beach = (seed: string[]) => { const cells = seed.join('').replace('H', '.').split(''); for (let i = rng.below(6); i > 0; i--) { const at = 1 + rng.below(24); cells[at] = cells[at] === '#' ? '.' : '#'; } return cells; };
  // Harder rungs carve each beach from the program itself: run it on an open grid and settle every unknown If test at random,
  // a sandcastle ahead for "blocked", open sand otherwise. Two carvings make a foggy pair the program walks by construction.
  const carve = () => {
    const cells = Array.from({ length: 25 }, () => '?'); cells[0] = 'C';
    let pos = 0, dir = 1, ok = true;
    const ahead = () => { const x = (pos % 5) + [0, 1, 0, -1][dir], y = Math.floor(pos / 5) + [-1, 0, 1, 0][dir]; return x < 0 || x > 4 || y < 0 || y > 4 ? -1 : y * 5 + x; };
    const blocked = () => { const at = ahead(); if (at < 0) return true; if (cells[at] === '?') cells[at] = rng.below(5) < 2 ? '#' : '.'; return cells[at] === '#'; };
    const run = (nodes: Node[]) => { for (const n of nodes) { if (!ok) return;
      if (n.kind === 'command') { if (n.command === 4) { const at = ahead(); if (at < 0 || cells[at] === '#') { ok = false; return; } if (cells[at] === '?') cells[at] = '.'; pos = at; } else dir = (dir + (n.command === 5 ? 3 : 1)) % 4; }
      else if (n.kind === 'repeat') for (let i = 0; i < n.times; i++) run(n.body);
      else if (n.kind === 'if') run(blocked() ? n.yes : n.no);
    } };
    run(body);
    return ok ? cells.map(c => (c === '?' ? (rng.below(6) ? '.' : '#') : c)) : null;
  };
  const carved = relaxed0(role) ? null : [carve(), carve()];
  if (carved && (!carved[0] || !carved[1])) return reject('fog-carve');
  const a = carved ? carved[0]! : beach(['C.#..', '#....', '.....', 'H....', '..#.#']);
  const b = carved ? carved[1]! : beach(['C##..', '.....', '.....', 'H....', '..#.#']);
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
  const cost = nodeCost(program), relaxed = role === 'teach' || role === 'easy', tray = relaxed ? cost + 1 : cost;
  const d = describe(id, rowsOf(a), 'medium', {}, { blockEditor: true, tray, fog: [{ rows: rowsOf(b) }], tools: { condition: true } }, fogLessons[role]);
  const wins = (p: Program) => runPlan(d, { program: [], blockDraft: encodeProgram(p) }).won;
  if (!wins(program)) return reject('fog3');
  // No flat plan of any length brings both crabs home.
  if (flatBest(worldSim(d), W, 40)) return reject('fog4');
  // Every palette program of up to five blocks, run on both beaches by a raw grid machine. The app wins a subset of these:
  // it also refuses a plan whose cards run past 80 on a beach. Minimum and lessons use the app's winners; the shared-winner
  // check uses the grid machine's larger set, which is the stricter test.
  const grid = fogWinners(d).winners, app = grid.filter(l => wins(toProgram(l))), least = Math.min(...app.map(l => l.cost));
  if (least !== cost) return reject('fog-not-minimal');
  // Every winner within the tray uses If blocked inside a Repeat, as the teaching lesson says.
  const fits = app.filter(l => l.cost <= tray).map(toProgram);
  if (!fits.every(p => hasIfInRepeat(p.body))) return reject('fog-if-free');
  // A harder rung: none of an earlier rung's fewest-block winners also wins here, so each rung needs a program of its own.
  const sharedWith = relaxed ? undefined : fogEarlier.find(e => grid.some(l => e.ids.has(l.id)));
  if (sharedWith) return reject(`fog-shared-${sharedWith.role}`);
  if (role !== 'short' && role !== 'easy') fogEarlier.push({ role, ids: new Set(grid.filter(l => l.cost <= least).map(l => l.id)) });
  return { descriptor: d, witness: encodeProgram(program), cards: 0, solutions: [encodeProgram(program)], proof: { flat: null, blocks: cost, least, winners: fits.length, gridWinners: grid.length, loopsWithinTray: false } };
}

const rejected: Record<string, number> = {};
const reject = (why: string) => { rejected[why] = (rejected[why] ?? 0) + 1; return null; };
const ideas = { tide: tidePuzzle, key: keyPuzzle, songs: songPuzzle, fog: fogPuzzle, two: twoPuzzle } as const;
const out: Record<string, unknown[]> = {};
const only = process.env.CRAB_BAKE_ONLY?.split(',');
for (const [index, [name, make]] of Object.entries(ideas).entries()) {
  if (only && !only.includes(name)) continue;
  rng = createRng((0xc1dd33a7 ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
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
    for (const key of Object.keys(rejected)) delete rejected[key];
    out[name].push({ role, ...(made as object) });
    const p = made as { descriptor: Descriptor; cards: number; proof: unknown };
    console.log(name, role, tries, p.descriptor.level.rows.join('/'), p.descriptor.fog?.[0]?.rows.join('/') ?? '', 'tide', p.descriptor.level.tide ?? '-', 'tray', p.descriptor.tray ?? '-', 'cards', p.cards, JSON.stringify(p.proof));
  }
}
// With CRAB_BAKE_ONLY, the other ideas stay exactly as they were baked.
const file = new URL('./deep-content.json', import.meta.url), kept = only ? JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown> : {};
writeFileSync(file, JSON.stringify({ ...kept, version: 1, ...out }, null, 1) + '\n');
