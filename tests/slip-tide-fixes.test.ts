import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { engine, startRound, swipeBoard, nextBoard, undoBoard, validSlip, ROUND, type SlipState } from '../src/learn/games/slip-tide/engine';
import { crabNames, crabsKey, dirOf, dirs, gridOf, HOME, homeAll, slideOn, tuplePuzzle, type Crabs, type Dir, type SlipPuzzle } from '../src/learn/games/slip-tide/rules';
import { describeBoard, slipHelpRules, slipView } from '../src/learn/games/slip-tide/help';
import { requestHint } from '../src/puzzles/hints';
import { ASSIST_ACTIONS, ASSIST_BYTES, HELP, MAX_HELP_ROUTE, ORDINARY_LIMIT, RESET, UNDO, hinted, packedBanks, puzzles, registration, type Action, type Payload } from '../src/learn/games/slip-tide/challenge';
import { emptyChallenge, type ChallengeSession } from '../src/state/challenge';
import { jsonBytes } from '../src/state/saveBits';
import { BankError } from '../src/puzzles/loader';
import { parsePack } from '../src/puzzles/bank';
import { readCatalog, productionDirs, readPackText } from '../scripts/puzzles/pipeline';

vi.mock('../src/puzzles/bankAssets', async () => {
  const { readFileSync: read } = await import('node:fs');
  return { bankTransport: { read: async (name: string) => read(`src/content/puzzles/assets/${name}.lipuzzle`, 'utf8') } };
});

const rng = (() => { let x = 11; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; })();
const options = (level: number) => ({ mode: 'solo' as const, pace: (['easy', 'medium', 'hard'] as const)[Math.min(level, 3) - 1], ...(level > 3 ? { stage: level === 4 ? 'stretch' as const : 'deep' as const } : {}) });

describe('R7: School saves bind to certified rows and a possible history', () => {
  const round = (level = 5) => startRound(level, rng);
  it('rejects a stored route replaced by an empty one, though no crab starts home', () => {
    const s = round();
    expect(validSlip(s)).toBe(true);
    expect(validSlip({ ...s, puzzles: s.puzzles.map(t => [...t.slice(0, 4), ''] as SlipState['puzzles'][number]) })).toBe(false);
  });
  it('rejects any board that is not a certified row of the saved level', () => {
    const s = round(5), other = round(4);
    expect(validSlip({ ...s, puzzles: [other.puzzles[0], ...s.puzzles.slice(1)], crabs: [...tuplePuzzle(other.puzzles[0])!.crabs] })).toBe(false);
    const p = tuplePuzzle(s.puzzles[0])!;
    const shifted = [p.size, s.puzzles[0][1], s.puzzles[0][2], s.puzzles[0][3], p.route + 'U'] as SlipState['puzzles'][number];
    expect(validSlip({ ...s, puzzles: [shifted, ...s.puzzles.slice(1)] })).toBe(false);
  });
  it('rejects an all-home board with zero swipes and a finished round of zero-swipe boards', () => {
    const s = round();
    expect(validSlip({ ...s, crabs: s.crabs.map(() => HOME), steps: 0 })).toBe(false);
    expect(validSlip({ ...s, index: ROUND, done: Array.from({ length: ROUND }, () => [0, 0] as [number, number]), crabs: [], undo: [] })).toBe(false);
  });
  it('rejects a finished board that beat its certified shortest route', () => {
    let s = round();
    const route = [...tuplePuzzle(s.puzzles[0])!.route].map(dirOf);
    s = nextBoard(route.reduce(swipeBoard, s));
    expect(validSlip(s)).toBe(true);
    expect(validSlip({ ...s, done: [[s.done[0][1] - 1, s.done[0][1]]] })).toBe(false);
    expect(validSlip({ ...s, done: [[s.done[0][0], s.done[0][1] + 1]] })).toBe(false);
  });
  it('rejects zero swipes away from the start and an Undo history that no swipe could make', () => {
    const s = round(), p = tuplePuzzle(s.puzzles[0])!, d = dirOf(p.route[0]), moved = swipeBoard(s, d);
    expect(validSlip(moved)).toBe(true);
    expect(validSlip({ ...moved, steps: 0, undo: [] })).toBe(false);
    expect(validSlip({ ...moved, undo: [moved.crabs] })).toBe(false);
    expect(validSlip(undoBoard(moved))).toBe(true);
  });
  it('rejects a round saved under a different level than its session options', () => {
    const s = round(4);
    expect(engine.validate(s, options(4))).toBe(true);
    expect(engine.validate(s, options(5))).toBe(false);
  });
  it('never repairs the original: validation leaves a frozen forged state untouched', () => {
    const forged = Object.freeze({ ...round(), crabs: Object.freeze([HOME, HOME, HOME, HOME].slice(0, round().crabs.length)), steps: 0 });
    const before = JSON.stringify(forged);
    expect(engine.validate(forged, options(5))).toBe(false);
    expect(JSON.stringify(forged)).toBe(before);
  });
  it('accepts every real round state from play, undo and finishing', () => {
    let s = round(3);
    for (let b = 0; b < ROUND; b++) {
      const p = tuplePuzzle(s.puzzles[s.index])!;
      const wrong = dirs.find(d => d !== dirOf(p.route[0]) && slideOn(gridOf(p), s.crabs, d) !== s.crabs);
      if (wrong !== undefined) { s = swipeBoard(s, wrong); expect(validSlip(s)).toBe(true); s = undoBoard(s); expect(validSlip(s)).toBe(true); }
      for (const letter of p.route) { s = swipeBoard(s, dirOf(letter)); expect(validSlip(s)).toBe(true); }
      s = nextBoard(s); expect(validSlip(s)).toBe(true);
    }
    expect(engine.outcome(s, options(3))).toBe('done');
  });
});

describe('R9: the accessible board and the help cues', () => {
  const p = puzzles.find(x => x.descriptor.puzzle.rocks.length >= 2 && x.descriptor.puzzle.crabs.length >= 2)!.descriptor.puzzle;
  it('lists the bounds, every rock, and each crab with its pool', () => {
    const text = describeBoard(slipView(p, p.crabs));
    expect(text).toContain(`${p.size} rows by ${p.size} columns`);
    expect(text).toContain('edges stop every crab');
    for (const rock of p.rocks) expect(text).toContain(`row ${Math.floor(rock / p.size) + 1}, column ${(rock % p.size) + 1}`);
    p.crabs.forEach((_, i) => expect(text).toContain(crabNames[i]));
    expect(text.match(/its pool at/g)).toHaveLength(p.crabs.length);
  });
  it('Look names the crab only; Think adds where it stops and what stops it; neither names a direction', async () => {
    const rules = slipHelpRules(p), view = slipView(p, p.crabs), signal = new AbortController().signal;
    const look = await requestHint(rules, view, 'look', signal, async () => {});
    const think = await requestHint(rules, view, 'think', signal, async () => {});
    if (look.status !== 'cue' || think.status !== 'cue') throw new Error('expected cues');
    expect(look.cue.text).toMatch(/^Look at the .+ crab with a/);
    expect(look.cue.focus).toHaveLength(1);
    expect(look.cue.focus[0]).toMatch(/^crab:\d$/);
    expect(look.cue.text).not.toMatch(/stop/i);
    expect(think.cue.text).toMatch(/^Think: the .+ crab/);
    expect(think.cue.focus[0]).toBe(look.cue.focus[0]);
    for (const text of [look.cue.text, think.cue.text]) expect(text).not.toMatch(/\b(up|down|left|right)\b/i);
  });
  it('names the blocking crab or rock that stops the chosen crab', () => {
    const rules = slipHelpRules(p);
    let named = 0;
    for (const x of puzzles) {
      const q = x.descriptor.puzzle, r = slipHelpRules(q), route = [...q.route].map(dirOf);
      const cue = r.routeCue!(slipView(q, q.crabs), 'think', route);
      if (cue.focus.some(f => f.startsWith('blocker:'))) { expect(cue.text).toMatch(/(A rock|The .+ crab with a .+) stops it there\./); named++; }
    }
    expect(named).toBeGreaterThan(0);
    expect(rules.unavailable).toContain('cannot get home');
  });
});

/** Distance to home from every reachable position: the worst any Show me can need. */
const memo = new Map<string, ReturnType<typeof explored>>();
const farthest = (p: SlipPuzzle) => { const k = JSON.stringify(p); let hit = memo.get(k); if (!hit) { hit = explored(p); memo.set(k, hit); } return hit; };
function explored(p: SlipPuzzle) {
  const g = gridOf(p), index = new Map<number, number>([[crabsKey(p.crabs), 0]]), list: Crabs[] = [p.crabs], edges: number[][] = [];
  for (let i = 0; i < list.length; i++) {
    const out: number[] = [];
    if (!homeAll(list[i])) for (const d of dirs) { const t = slideOn(g, list[i], d); if (t === list[i]) continue; let j = index.get(crabsKey(t)); if (j === undefined) { j = list.length; index.set(crabsKey(t), j); list.push(t); } out.push(j); }
    edges.push(out);
  }
  const dist = new Int32Array(list.length).fill(-1), back: number[][] = list.map(() => []), q: number[] = [];
  edges.forEach((o, i) => o.forEach(j => back[j].push(i)));
  list.forEach((s, i) => { if (homeAll(s)) { dist[i] = 0; q.push(i); } });
  for (let h = 0; h < q.length; h++) for (const i of back[q[h]]) if (dist[i] < 0) { dist[i] = dist[q[h]] + 1; q.push(i); }
  let far = 0;
  dist.forEach((d, i) => { if (d > dist[far]) far = i; });
  // A path from the start to the farthest position, by parent links of a forward search.
  const parent = new Int32Array(list.length).fill(-1), seen = new Uint8Array(list.length), queue = [0]; seen[0] = 1;
  const via = new Int8Array(list.length);
  for (let h = 0; h < queue.length; h++) for (const d of dirs) {
    const s = list[queue[h]]; if (homeAll(s)) continue;
    const t = slideOn(g, s, d); if (t === s) continue;
    const j = index.get(crabsKey(t))!; if (seen[j]) continue; seen[j] = 1; parent[j] = queue[h]; via[j] = d; queue.push(j);
  }
  const path: Dir[] = [];
  for (let at = far; at > 0; at = parent[at]) path.unshift(via[at] as Dir);
  return { max: dist[far], start: dist[0], path, at: list[far] };
}
const shortest = (p: SlipPuzzle, from: Crabs): Dir[] => {
  const g = gridOf(p), prev = new Map<number, [number, Dir]>(), seen = new Set([crabsKey(from)]), queue: Crabs[] = [from];
  for (let h = 0; h < queue.length; h++) {
    const s = queue[h];
    if (homeAll(s)) { const out: Dir[] = []; for (let k = crabsKey(s); prev.has(k);) { const [b, d] = prev.get(k)!; out.unshift(d); k = b; } return out; }
    for (const d of dirs) { const t = slideOn(g, s, d); if (t === s || seen.has(crabsKey(t))) continue; seen.add(crabsKey(t)); prev.set(crabsKey(t), [crabsKey(s), d]); queue.push(t); }
  }
  throw new Error('no route');
};
const { families } = readCatalog(productionDirs), manifest = families.get('slip-tide')!;
const packRows = (slot: number) => parsePack(readPackText(productionDirs, slot), manifest.packs.find(p => p[0] === slot)!, manifest)!.rows;
const refFor = (slot: number, index: number) => ({ bank: slot, puzzle: index, engine: 'slip-tide', rules: 1, hash: createHash('sha256').update(packRows(slot)[index]).digest('hex') });
const play = (s: ChallengeSession, actions: Action[]) => actions.reduce<ChallengeSession>((at, a, i) => { const next = registration.move(at, a); if (!next) throw new Error(`Refused ${a} at ${i}`); return next; }, s);
const opts = { supportOff: false, ownRead: false };

describe('R4: the assistance contract is certified', () => {
  it('MAX_HELP_ROUTE is the exact worst Show me over every registered Challenge board, including off-route positions', () => {
    let worstStart = 0, worst = 0;
    const boards = [...puzzles.map(p => p.descriptor.puzzle), ...packedBanks.flatMap(b => packRows(b.slot).map(row => tuplePuzzle(JSON.parse(row)[3])!))];
    expect(boards.length).toBe(30 + 1184);
    for (const p of boards) { const f = farthest(p); worst = Math.max(worst, f.max); worstStart = Math.max(worstStart, f.start); }
    expect(worstStart).toBe(51);
    expect(worst).toBe(MAX_HELP_ROUTE);
    expect(ASSIST_ACTIONS).toBe(1 + MAX_HELP_ROUTE);
  });
  it('the action count binds before bytes for the largest possible session, and the full help tail fits its byte reserve', () => {
    const owner = 'o'.repeat(40), hash = 'f'.repeat(64);
    const session = (actions: Action[], result: ChallengeSession['result']): ChallengeSession => ({
      version: 1, owner, game: 'slip-tide', id: `challenge-${owner}-2147483646`, ordinal: 2147483646, revision: 2147483647,
      puzzle: { bank: 299, puzzle: 1023, engine: 'slip-tide', rules: 1, hash }, codec: 'slip-tide-replay-v1',
      payload: { version: 1, initial: 0, options: { supportOff: true, ownRead: true }, firstSolutions: Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(64, 'a')), actions } satisfies Payload,
      selectedDares: [1258, 1259, 1257], partner: 'p'.repeat(40), result, credited: false,
    });
    const terminal = { event: 'independent' as const, awards: 3, dares: [1257, 1258, 1259], cost: 4096, solution: hash };
    const ordinary = Array<Action>(ORDINARY_LIMIT).fill(UNDO);
    expect(jsonBytes(session(ordinary, null))).toBeLessThanOrEqual(4096 - ASSIST_BYTES);
    const tail: Action[] = [HELP, ...Array<Action>(MAX_HELP_ROUTE).fill(hinted(3))];
    const full = session([...ordinary, ...tail], terminal);
    expect((full.payload as Payload).actions).toHaveLength(512);
    expect(jsonBytes(full)).toBeLessThanOrEqual(4096);
    const added = jsonBytes(full) - jsonBytes(session(ordinary, null));
    expect(added).toBeLessThanOrEqual(ASSIST_BYTES);
  });
  it('repeated Help records once and only advances the revision', () => {
    const p = puzzles[0], s = registration.start(p.ref, 'alex', 'c', emptyChallenge(), opts, []);
    const once = registration.move(s, HELP)!, twice = registration.move(once, HELP)!;
    expect((twice.payload as Payload).actions).toEqual([HELP]);
    expect(twice.revision).toBe(once.revision + 1);
  });
  async function exhaust(slot: number, pick: (f: ReturnType<typeof farthest>) => boolean, offRoute: boolean) {
    const rows = packRows(slot), index = rows.findIndex(row => pick(farthest(tuplePuzzle(JSON.parse(row)[3])!)));
    expect(index).toBeGreaterThanOrEqual(0);
    const ref = refFor(slot, index);
    await registration.packed!.prepare(ref);
    const p = tuplePuzzle(JSON.parse(rows[index])[3])!, f = farthest(p);
    let s = registration.start(ref, 'alex', 'cap', emptyChallenge(), opts, []);
    const g = gridOf(p), at = offRoute ? f.at : p.crabs, length = () => (s.payload as Payload).actions.length;
    // Swipe-and-Undo pairs leave the crabs where they are; Reset fixes the parity of the count.
    const pad = dirs.find(d => slideOn(g, at, d) !== at && !homeAll(slideOn(g, at, d)))!;
    if (offRoute) { s = play(s, f.path); if ((ORDINARY_LIMIT - f.path.length) % 2) s = play(s, [RESET, ...f.path]); }
    else if (ORDINARY_LIMIT % 2) {
      const mid = slideOn(g, at, pad), x = dirs.find(d => slideOn(g, mid, d) !== mid && !homeAll(slideOn(g, mid, d)))!;
      s = play(s, [pad, x, RESET]);
    }
    while (length() + 2 <= ORDINARY_LIMIT) s = play(s, [pad, UNDO]);
    expect((s.payload as Payload).actions.length).toBe(ORDINARY_LIMIT);
    expect(registration.move(s, UNDO)).toBeNull();
    const from = (registration.render(s, () => {}, true, 340) as { props: { state: { crabs: number[] } } }).props.state.crabs;
    const route = shortest(p, from);
    expect(route.length).toBeLessThanOrEqual(MAX_HELP_ROUTE);
    const done = play(s, [HELP, ...route.map(hinted)]);
    expect(done.result).toMatchObject({ event: 'helped', dares: [] });
    expect((done.payload as Payload).actions.length).toBeLessThanOrEqual(512);
    return { route: route.length, actions: (done.payload as Payload).actions.length };
  }
  it('after ordinary play reaches the limit, Show me still finishes the longest initial route (51)', async () => {
    const r = await exhaust(6, f => f.start === 51, false);
    expect(r.route).toBe(51);
  });
  it('after ordinary play reaches the limit, Show me still finishes from the farthest off-route position (74)', async () => {
    const r = await exhaust(6, f => f.max === MAX_HELP_ROUTE, true);
    expect(r.route).toBeGreaterThanOrEqual(MAX_HELP_ROUTE - 1);
    expect(r.actions).toBeLessThanOrEqual(512);
  });
});

describe('R8: Endless Tide plays the packed bank', () => {
  it('commits bank facts that match the packaged manifest exactly', () => {
    expect(packedBanks.map(b => b.slot)).toEqual([3, 4, 5, 6]);
    for (const b of packedBanks) {
      const row = manifest.packs.find(p => p[0] === b.slot)!;
      expect([b.first, b.count, b.packHash, b.rules]).toEqual([row[1], row[2], row[4], row[6]]);
      expect(registration.catalog.banks.get(b.slot)).toEqual({ slot: b.slot, engine: 'slip-tide', rules: 1, first: row[1], count: row[2], family: 'slip-tide', packHash: row[4], awards: 3, cove: false });
    }
    expect(registration.packed!.bands.map(b => [b.bank, b.tier, b.count])).toEqual([[3, 3, 400], [4, 4, 400], [5, 5, 256], [6, 6, 128]]);
    expect([...registration.catalog.dares.keys()].sort((a, b) => a - b)).toEqual(Array.from({ length: 60 }, (_, i) => 1200 + i));
    expect([...registration.catalog.banks.keys()].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 298, 299]);
  });
  it('chooses never-opened entries first, avoids the current one, and plays one through the real codec', async () => {
    const first = await registration.packed!.choose(3, emptyChallenge());
    expect(first).toEqual(refFor(3, 0));
    const progress = { ...emptyChallenge(), recent: [[3, 0]] as [number, number][] };
    expect((await registration.packed!.choose(3, progress, first)).puzzle).toBe(1);
    expect(registration.packed!.card(first)).toMatchObject({ title: 'Lagoon 1', tier: 3, path: 'endless', dares: [] });
    const p = tuplePuzzle(JSON.parse(packRows(3)[0])[3])!;
    const done = play(registration.start(first, 'alex', 'p', emptyChallenge(), opts, []), [...p.route].map(dirOf));
    expect(done.result).toMatchObject({ event: 'independent', awards: 3, dares: [], cost: p.route.length });
    expect(registration.catalog.codecs.get('slip-tide-replay-v1')!.validate(done)).toBe(true);
    expect(registration.contextFor(first)).toBe('slip-3');
  });
  it('refuses a saved ref whose hash does not match its packed row, and never makes it playable', async () => {
    const bad = { ...refFor(4, 7), hash: '0'.repeat(64) };
    await expect(registration.packed!.prepare(bad)).rejects.toBeInstanceOf(BankError);
    expect(() => registration.start(bad, 'alex', 'x', emptyChallenge(), opts, [])).toThrow();
    await expect(registration.packed!.prepare({ ...refFor(4, 7), puzzle: 400 })).rejects.toBeInstanceOf(BankError);
  });
  it('gives every Endless band hundreds of entries instead of four', () => {
    expect(registration.packed!.bands.reduce((n, b) => n + b.count, 0)).toBe(1184);
    expect(puzzles.filter(p => p.path === 'endless')).toHaveLength(16);
  });
});

describe('R5 record: Slip Tide identifiers', () => {
  it('keeps inline banks 298–299, dares 1200–1259 and packed slots 3–6', () => {
    expect(new Set(puzzles.map(p => p.ref.bank))).toEqual(new Set([298, 299]));
    expect(readFileSync('src/learn/games/slip-tide/challenge.tsx', 'utf8')).toContain('DEEP_BANK = 298, ENDLESS_BANK = 299, FIRST_DARE_SLOT = 1200');
  });
});
