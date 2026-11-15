import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import deepWater from '../src/learn/games/crab-commands/deep-content.json';
import { blockSolutions, crabPuzzles, deepPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { challengeEngine, execute, runPlan, solution, type Descriptor, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { greedyBot, worldSim } from '../src/learn/games/crab-commands/deep-proofs';
import { codes, crabSim } from '../src/learn/games/crab-commands/proofs';
import { blockBest, flatBest } from '../src/learn/games/crab-commands/search';
import { commands, step, start } from '../src/learn/games/crab-commands/engine';
import { decodeProgram, encodeProgram, type PackedProgram } from '../src/learn/program/codec';
import { nodeCost, type Program } from '../src/learn/program/model';
import { programOperations } from '../src/learn/program/operations';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));

type Entry = { role: string; descriptor: Descriptor; witness: unknown; cards: number };
const ideas = ['tide', 'key', 'songs', 'fog', 'two'] as const;
const entries = (idea: typeof ideas[number]) => (deepWater as unknown as Record<string, Entry[]>)[idea];
const W = codes(commands('medium'));
const options = { supportOff: false, ownRead: false };
const play = (d: Descriptor, actions: Parameters<typeof challengeEngine.step>[1][]) => {
  let s: State = challengeEngine.create(d, { version: 1 }, options);
  for (const a of actions) { const n = challengeEngine.step(s, a, d); if (!n) return null; s = n.state; }
  return s;
};

describe('C1d Deep Water: five ideas, each teach → develop → twist → short hard → easy', () => {
  it('registers 25 puzzles in banks 12–16 in that order, with no recursion anywhere', () => {
    expect(deepPuzzles).toHaveLength(25);
    for (const [b, idea] of ideas.entries()) {
      const rows = deepPuzzles.filter(p => p.ref.bank === 12 + b);
      expect(rows.map(p => p.ref.puzzle)).toEqual([0, 1, 2, 3, 4]);
      expect(entries(idea).map(e => e.role)).toEqual(['teach', 'develop', 'twist', 'short', 'easy']);
      // The easy finish sits back at the teaching tier; the short hard beach is the idea's top.
      expect(rows[4].tier).toBe(rows[0].tier); expect(Math.max(...rows.map(r => r.tier))).toBe(rows[3].tier);
      for (const p of rows) { expect(p.path).toBe('deep-water'); expect(p.source).toEqual({ kind: 'deep-water', collection: 12 + b, puzzle: p.ref.puzzle }); }
    }
    for (const p of deepPuzzles) for (const w of blockSolutions(p.descriptor)) expect(JSON.stringify(w)).not.toContain('"song":' + 99);
  });
  it('dares use only C1 slots 154–255 and never repeat', () => {
    const slots = deepPuzzles.flatMap(p => p.dares.map(d => d.slot));
    expect(slots.length).toBeGreaterThan(0);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots.every(s => s >= 154 && s <= 255)).toBe(true);
    expect(crabPuzzles.flatMap(p => p.dares.map(d => d.slot)).filter(s => s >= 154)).toEqual(slots);
  });
  it('the best possible is never shown before a win: no title or lesson names the par', () => {
    for (const p of deepPuzzles) if (p.par) {
      expect(p.title.replace(/\d of 5/, '') + p.descriptor.lesson).not.toMatch(new RegExp(`\\b${p.par.lower}\\b`));
      for (const d of p.dares) expect(d.label).not.toMatch(/\d/);
    }
  });
});

describe('C1d flat ideas, re-proved on the app engine', () => {
  for (const idea of ['tide', 'key', 'two'] as const) it(`${idea}: every witness wins with the fewest cards`, () => {
    for (const e of entries(idea)) {
      const plan = solution(e.descriptor)!;
      expect(plan, `${idea} ${e.role}`).not.toBeNull();
      expect(plan.length).toBe(e.cards);
      expect(execute(e.descriptor, e.witness as never).won).toBe(true);
      expect(flatBest(worldSim(e.descriptor), codes(commands(e.descriptor.level.pace)))!.cards).toBe(e.cards);
    }
  });
  it('tide: low sand floods by walked squares, and the twist cuts off the shortest route', () => {
    const [teach, , twist] = entries('tide');
    const l = teach.descriptor.level;
    let w = start(l);
    for (let i = 0; i < 4; i++) w = step(l, w, 'forward');
    expect(w.walked).toBe(4); expect(w.bump).toBe(false);
    const open = solution({ ...twist.descriptor, level: { ...twist.descriptor.level, tide: undefined } })!;
    expect(execute(twist.descriptor, open).won).toBe(false);
    expect(twist.cards).toBeGreaterThan(open.length);
    expect(solution({ ...twist.descriptor, level: { ...twist.descriptor.level, tide: 5 } })).toBeNull();
  });
  it('key: without the key no plan gets home, and the gate opens only once it is held', () => {
    for (const e of entries('key')) {
      const rows = e.descriptor.level.rows;
      expect(solution({ ...e.descriptor, level: { ...e.descriptor.level, rows: rows.map(r => r.replace('K', '.')) } }), e.role).toBeNull();
    }
  });
  it('two crabs: one card moves both, a blocked crab stays, and both must be on different homes', () => {
    const e = entries('two')[2], r = execute(e.descriptor, e.witness as never);
    expect(r.won).toBe(true); expect(r.walkers).toHaveLength(2);
    expect(r.walkers[0].pos).not.toBe(r.walkers[1].pos);
    const holds = r.worlds.slice(1).filter((world, i) => world.some((w, c) => w.pos === r.worlds[i][c].pos)).length;
    expect(holds).toBeGreaterThanOrEqual(2);
  });
});

describe('C1d block ideas: songs and foggy beaches', () => {
  it('songs: cards and songs only; no flat plan fits the tray and the song witness does', () => {
    for (const e of entries('songs')) {
      const d = e.descriptor, p = decodeProgram(e.witness)!;
      expect(d.tools).toEqual({ songs: true, repeat: false });
      expect(p.songs.length, e.role).toBeGreaterThan(0); expect(JSON.stringify(p)).not.toContain('repeat');
      expect(nodeCost(p)).toBeLessThanOrEqual(d.tray!);
      expect(flatBest(crabSim(d.level), W)!.cards).toBeGreaterThan(d.tray!);
      expect(runPlan(d, { program: [], blockDraft: e.witness as PackedProgram }).won).toBe(true);
      // Why Repeat is not offered here: on a 5×5 beach a Repeat plan fits the same tray (measured, not assumed).
      expect(blockBest(crabSim(d.level), W, d.tray!, { nest: 2 }).best, e.role).not.toBeNull();
      const looped: Program = { version: 1, body: [{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 4 }] }], songs: [] };
      expect(play(d, [['e', programOperations({ version: 1, body: [], songs: [] }, looped)]]), e.role).toBeNull();
    }
  });
  it('fog: no flat plan of any length brings the crab home on both beaches; the If witness does', () => {
    for (const e of entries('fog')) {
      const d = e.descriptor, p = decodeProgram(e.witness)!;
      expect(d.fog).toHaveLength(1);
      expect(JSON.stringify(p.body)).toContain('"kind":"if"');
      expect(flatBest(worldSim(d), W, 60), e.role).toBeNull();
      const loops = blockBest(worldSim(d), W, d.tray!, { nest: 2 });
      expect(loops.exhausted).toBe(false); expect(loops.best, e.role).toBeNull();
      expect(nodeCost(p)).toBeLessThanOrEqual(d.tray!);
      expect(runPlan(d, { program: [], blockDraft: e.witness as PackedProgram }).won).toBe(true);
      // One beach alone is not enough.
      const alone = solution({ ...d, fog: undefined });
      if (alone) expect(runPlan(d, { program: alone }).won).toBe(false);
    }
  });
  it('the replay engine refuses a block plan over the tray, a tool the puzzle does not offer, and flat cards past it', () => {
    const song = entries('songs')[0].descriptor, fog = entries('fog')[0].descriptor;
    const empty: Program = { version: 1, body: [], songs: [] };
    const tooBig: Program = { version: 1, body: Array.from({ length: song.tray! + 1 }, () => ({ kind: 'command' as const, command: 4 })), songs: [] };
    expect(play(song, [['e', programOperations(empty, tooBig)]])).toBeNull();
    const withSong: Program = { version: 1, body: [{ kind: 'call', song: 0 }], songs: [[{ kind: 'command', command: 4 }]] };
    expect(play(fog, [['e', programOperations(empty, withSong)]])).toBeNull();
    expect(play(song, Array.from({ length: song.tray! + 1 }, () => ['a', 4] as const))).toBeNull();
    // The certified witness plays through the shared replay and wins on Go.
    const witness = decodeProgram(entries('fog')[0].witness)!;
    const won = play(fog, [['e', programOperations(empty, witness)], ['g']])!;
    expect(won.won).toBe(true);
    expect(challengeEngine.inspect(won, fog).solved).toBe(true);
  });
});

describe('C1d difficulty: a flat greedy player with no loops fails the top rungs', () => {
  it('fails the twist and short hard beach of every idea, and every songs and fog beach', () => {
    for (const idea of ideas) for (const e of entries(idea)) {
      const fails = !greedyBot(e.descriptor).won;
      if (['twist', 'short'].includes(e.role) || idea === 'songs' || idea === 'fog') expect(fails, `${idea} ${e.role}`).toBe(true);
    }
  });
  it('documents how a child who finds Level 3 too easy steps up', () => {
    const doc = readFileSync('docs/CRAB_DEPTH.md', 'utf8');
    for (const phrase of ['Level 3', 'Level 4', 'Level 5', 'Deep Water', 'greedy']) expect(doc).toContain(phrase);
  });
  it('witnesses are stored in the same compact codec the board saves', () => {
    for (const idea of ['songs', 'fog'] as const) for (const e of entries(idea)) expect(encodeProgram(decodeProgram(e.witness)!)).toEqual(e.witness);
  });
});

describe('C1d block puzzles through the real Challenge registration', () => {
  it('a block plan, the whole help ladder and a winning Go fit one 4 KiB attempt', async () => {
    const { registration } = await import('../src/challenge/registrations/crab-commands');
    const { emptyChallenge } = await import('../src/state/challenge');
    const { jsonBytes } = await import('../src/state/saveBits');
    for (const p of deepPuzzles.filter(p => p.descriptor.tray !== undefined)) {
      let s = registration.start(p.ref, 'a', `c1d-${p.ref.bank}-${p.ref.puzzle}`, emptyChallenge(), options, []);
      const witness = blockSolutions(p.descriptor)[0];
      s = registration.move(s, ['e', programOperations({ version: 1, body: [], songs: [] }, witness)])!;
      expect(s, p.title).not.toBeNull();
      for (let i = 0; i < 3; i++) { s = registration.move(s, ['h'])!; expect(s, `${p.title} help ${i + 1}`).not.toBeNull(); }
      const won = registration.move(s, ['g'])!;
      expect(won.result, p.title).not.toBeNull();
      expect(jsonBytes(won)).toBeLessThanOrEqual(4096);
      expect(registration.completionText!(p.ref, won.result!, null)).not.toContain('best possible');
    }
    const flat = deepPuzzles.find(p => p.par && p.ref.bank === 12)!;
    expect(registration.completionText!(flat.ref, { event: "independent" } as never, null)).toContain(`best possible is ${flat.par!.lower} cards`);
  });
});

describe('C1d fix P2-1: initial drafts meet the same tray and tool limits as edits', () => {
  const song = () => deepPuzzles.find(p => p.ref.bank === 14 && p.ref.puzzle === 0)!;
  const fogP = () => deepPuzzles.find(p => p.ref.bank === 15 && p.ref.puzzle === 0)!;
  it('refuses an over-tray flat winner and a banned tool in a restored draft; old descriptors keep their drafts', () => {
    const d = song().descriptor, witness = blockSolutions(d)[0];
    // The same winning route as single cards: more blocks than the tray holds.
    const songPlan = decodeProgram(encodeProgram(witness))!;
    const route = songPlan.body.flatMap(n => n.kind === 'call' ? songPlan.songs[n.song] : [n]);
    const overTray = encodeProgram({ version: 1, body: route, songs: [] });
    expect(runPlan(d, { program: [], blockDraft: overTray }).won).toBe(true);
    expect(challengeEngine.validInitial({ version: 1, draft: overTray }, d)).toBe(false);
    const withRepeat = encodeProgram({ version: 1, body: [{ kind: 'repeat', times: 2, body: [{ kind: 'command', command: 4 }] }], songs: [] });
    expect(challengeEngine.validInitial({ version: 1, draft: withRepeat }, d)).toBe(false);
    const withSong = encodeProgram({ version: 1, body: [{ kind: 'call', song: 0 }], songs: [[{ kind: 'command', command: 4 }]] });
    expect(challengeEngine.validInitial({ version: 1, draft: withSong }, fogP().descriptor)).toBe(false);
    expect(challengeEngine.validInitial({ version: 1, draft: encodeProgram(witness) }, d)).toBe(true);
    // A descriptor without a tray keeps accepting drafts that only need to decode.
    const open = { ...fogP().descriptor, tray: undefined };
    expect(challengeEngine.validInitial({ version: 1, draft: withSong }, open)).toBe(true);
  });
  it('carries a valid block plan into a new attempt', async () => {
    const { registration } = await import('../src/challenge/registrations/crab-commands');
    const { emptyChallenge, validChallengeSession } = await import('../src/state/challenge');
    const p = fogP(), witness = blockSolutions(p.descriptor)[0];
    let s = registration.start(p.ref, 'a', 'carry', emptyChallenge(), options, []);
    s = registration.move(s, ['e', programOperations({ version: 1, body: [], songs: [] }, witness)])!;
    const next = registration.restart!(s, 'carry-2', { ...emptyChallenge(), nextOrdinal: 2 });
    expect((next.payload as { initial: { draft?: unknown } }).initial.draft).toEqual(encodeProgram(witness));
    expect(validChallengeSession(next, next.owner, registration.catalog)).toBe(true);
    expect(registration.move(next, ['g'])!.result).not.toBeNull();
  });
});
