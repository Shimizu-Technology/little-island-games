import React, { type ComponentType } from 'react';
import type { ChallengeCard, PackedBand, PackedChallenge, TypedRegistration } from '../../challenge/types';
import type { PackedOpen } from '../../cove/catalog';
import { packedBank } from '../../state/bankFacts';
import type { ChallengeProgress, ChallengeSession, PuzzleRef, SaveCatalog, SessionCodec, Terminal } from '../../state/challenge';
import { validChallengeSession } from '../../state/challenge';
import { prepareSessionContent } from '../../state/sessionContent';
import { asciiId, hashId, jsonBytes, plain, uint, unpack } from '../../state/saveBits';
import { bankLoader } from '../catalog';
import { BankError, type BankLoader } from '../loader';
import { sha256Hex } from '../sha256';
import type { PuzzleAdapter, PuzzleDescriptor } from '../types';
import { auditCount, decodeMarks, freshPayload, stepMarks, validShape, type MarkEvent, type MarkRules, type Marks, type MarksPayload } from './marks';

export type BankFacts = { slot: number; first: number; count: number; packHash: string; rules: number; band: string };
/** How a rung is shown in the band browser and on the board. */
export type RungLabel = { id: string; tier: 1 | 2 | 3 | 4 | 5 | 6; title: string; summary: string; size: string };
export type EdgeView<P> = { puzzle: P; board: Marks; helps: number; resets: number; title: string; teaches: string; rung: RungLabel | undefined };
export type EdgeBoardProps<P> = { view: EdgeView<P>; dispatch: (event: MarkEvent) => void; active: boolean; width: number };
/** The extras the Cove's packed browser reads: open one exact entry, describe a bank, and skip entries hidden on this device. */
export type EdgePacked = PackedChallenge & Required<PackedOpen>;

export function viewOf<P>(p: P, rules: MarkRules<P>, payload: unknown, title = '', teaches = '', rung?: RungLabel): EdgeView<P> | null {
  if (!validShape(payload)) return null;
  const board = decodeMarks(payload, p, rules);
  return board ? { puzzle: p, board, helps: auditCount(payload.audit, 'help'), resets: auditCount(payload.audit, 'reset'), title, teaches, rung } : null;
}
const refKey = (r: PuzzleRef) => `${r.bank}:${r.puzzle}:${r.engine}:${r.rules}:${r.hash}`;
const RESIDENT = 16;

/**
 * A Cove game over certified packed banks with an exact checkpoint codec. Descriptors become resident
 * only after the shared loader verified their row; a stored session waits for `prepare` before replay.
 */
export function defineEdgeGame<P>(config: {
  game: string; codec: string; context: string; family: string; banks: readonly BankFacts[]; rungs: readonly RungLabel[];
  adapter: PuzzleAdapter<P, unknown, unknown>; rules: MarkRules<P>; Board: ComponentType<EdgeBoardProps<P>>;
  finished: { together: string; helped: string; independent: string };
  loader?: () => Pick<BankLoader, 'entry' | 'savedHash'>;
}): TypedRegistration<MarksPayload, MarkEvent, EdgeView<P>> {
  const { game, adapter, rules, banks: facts } = config, loader = config.loader ?? bankLoader;
  if (!asciiId(config.codec) || !asciiId(config.context, 14) || !asciiId(config.family) || adapter.engine !== game) throw new Error('Invalid G5 registration.');
  const rungOf = (band: string) => config.rungs.find(r => r.id === band);
  const bands: PackedBand[] = facts.map(b => {
    const rung = rungOf(b.band);
    if (!rung || !uint(b.slot, 511) || !uint(b.first) || !uint(b.count, 1024) || !b.count || !hashId(b.packHash) || b.rules !== adapter.rules) throw new Error('Invalid G5 bank facts.');
    return { kind: 'band', bank: b.slot, path: 'endless', tier: rung.tier, title: rung.title, count: b.count };
  });
  type Resident = { ref: PuzzleRef; descriptor: PuzzleDescriptor<P> };
  const resident = new Map<string, Resident>();
  const lookup = (ref: PuzzleRef) => { const key = refKey(ref), hit = resident.get(key); if (hit) { resident.delete(key); resident.set(key, hit); } return hit; };
  const puzzleOf = (s: ChallengeSession) => lookup(s.puzzle)?.descriptor.payload;
  const bandOf = (bank: number) => bands.find(b => b.bank === bank);
  const factsOf = (bank: number) => facts.find(b => b.slot === bank);
  const rungOfBank = (bank: number) => { const f = factsOf(bank); return f ? rungOf(f.band) : undefined; };
  const viewFor = (s: ChallengeSession) => { const p = puzzleOf(s); return p === undefined ? null : viewOf(p, rules, s.payload); };
  const evaluate = (s: ChallengeSession): Terminal | null => {
    const p = puzzleOf(s), view = viewFor(s);
    if (p === undefined || !view || !rules.solved(p, view.board.marks)) return null;
    return { event: s.partner !== null ? 'together' : view.helps ? 'helped' : 'independent', awards: 0, dares: [], cost: null, solution: sha256Hex(rules.answer(view.board.marks)) };
  };
  const codec: SessionCodec = {
    game, cove: true, budget: { wrapper: 696, draft: 2600, undo: 0, audit: 400 }, validate: s => !!viewFor(s), evaluate,
    canStart: s => { const p = puzzleOf(s); return p !== undefined && s.result === null && JSON.stringify(s.payload) === JSON.stringify(freshPayload(p, rules)); },
    // Structural: recovery may run before content loads. Edits and audit totals never go backward.
    extends: (a, b) => {
      const before = a.payload, after = b.payload;
      if (!validShape(before) || !validShape(after)) return false;
      return after.edits >= before.edits && (['help', 'reset'] as const).every(k => auditCount(after.audit, k) >= auditCount(before.audit, k));
    },
  };
  const catalog: SaveCatalog = {
    banks: new Map(facts.map(b => [b.slot, { slot: b.slot, engine: game, rules: b.rules, first: b.first, count: b.count, family: config.family, packHash: b.packHash, awards: 0, cove: true }])),
    dares: new Map(), codecs: new Map([[config.codec, codec]]), contexts: new Set(bands.map(b => `${config.context}-${b.tier}`)),
  };
  const cardOf = (ref: PuzzleRef, b: PackedBand): ChallengeCard => ({ ref, source: { kind: 'endless', bank: b.bank, puzzle: ref.puzzle }, path: 'endless', tier: b.tier, title: `${b.title} ${ref.puzzle + 1}`, dares: [] });
  /** Decode, bind to the exact saved hash and run the Store's content check before anything opens. */
  async function resolve(ref: PuzzleRef | { bank: number; puzzle: number }): Promise<PuzzleRef> {
    const b = factsOf(ref.bank);
    if (!b || !uint(ref.puzzle, b.count - 1)) throw new BankError('unknown', 'That puzzle is not in this bank.');
    const want = 'hash' in ref ? ref : null;
    if (want && (want.engine !== game || want.rules !== b.rules)) throw new BankError('malformed', 'The saved puzzle needs a different engine revision.');
    if (want && lookup(want)) { await prepareSessionContent({ puzzle: want }, catalog, { loader: loader() }); return want; }
    const descriptor = await loader().entry(adapter, config.family, b.first + ref.puzzle) as PuzzleDescriptor<P>;
    const got = descriptor.ref;
    if (got.bank !== b.slot || got.puzzle !== ref.puzzle || got.engine !== game || got.rules !== b.rules || want && got.hash !== want.hash) throw new BankError('hash-mismatch', 'This puzzle does not match its saved fingerprint.');
    await prepareSessionContent({ puzzle: got }, catalog, { loader: loader() });
    resident.set(refKey(got), { ref: got, descriptor });
    while (resident.size > RESIDENT) resident.delete(resident.keys().next().value!);
    return got;
  }
  const rowHashes = new Map<number, readonly string[]>();
  /** Every entry's saved hash in one bank, read only when something is hidden; the loader verifies the pack once. */
  async function hashesOf(bank: number): Promise<readonly string[]> {
    const hit = rowHashes.get(bank);
    if (hit) return hit;
    const b = catalog.banks.get(bank), l = loader();
    if (!b || !packedBank(b)) throw new BankError('unknown', 'Unknown packed bank.');
    const hashes: string[] = [];
    for (let i = 0; i < b.count; i++) hashes.push(await l.savedHash(b, i));
    rowHashes.set(bank, hashes);
    return hashes;
  }
  /** Unopened entries first, then unfinished ones, in bank order from just after the last one played. Hidden ones are skipped unless all are. */
  const pickIn = (bank: number, progress: ChallengeProgress, avoid?: PuzzleRef, skip: ReadonlySet<number> = new Set()) => {
    const b = bandOf(bank);
    if (!b) throw new BankError('unknown', 'Unknown packed bank.');
    const states = unpack(progress.banks.find(r => r[0] === bank)?.[1] ?? '', b.count, 3) ?? Array<number>(b.count).fill(0);
    const recent = progress.recent.filter(([s]) => s === bank).map(([, p]) => p), last = recent.at(-1) ?? -1;
    const around = Array.from({ length: b.count }, (_, i) => (last + 1 + i) % b.count).filter(i => b.count === 1 || i !== avoid?.puzzle || avoid.bank !== bank);
    const order = around.some(i => !skip.has(i)) ? around.filter(i => !skip.has(i)) : around;
    return order.find(i => !states[i]) ?? order.find(i => states[i] === 1) ?? order.find(i => !recent.includes(i)) ?? order[0];
  };
  const packed: EdgePacked = {
    bands,
    card: ref => { const b = bandOf(ref.bank); return b && ref.engine === game && ref.rules === factsOf(ref.bank)!.rules && uint(ref.puzzle, b.count - 1) ? cardOf(ref, b) : undefined; },
    prepare: async ref => { if (bandOf(ref.bank)) await resolve(ref); },
    open: (bank, index) => resolve({ bank, puzzle: index }),
    teaches: ref => lookup(ref)?.descriptor.teaches[0],
    describe: bank => { const r = rungOfBank(bank); return r ? { size: r.size, summary: r.summary } : undefined; },
    choose: async (bank: number, progress: ChallengeProgress, avoid?: PuzzleRef) => resolve({ bank, puzzle: pickIn(bank, progress, avoid) }),
    hiddenRows: async (bank, hidden) => {
      if (!hidden.length) return new Set();
      const want = new Set(hidden), out = new Set<number>();
      (await hashesOf(bank)).forEach((h, i) => { if (want.has(h)) out.add(i); });
      return out;
    },
    chooseVisible: async (bank, progress, skip, avoid) => resolve({ bank, puzzle: pickIn(bank, progress, avoid, skip) }),
  };
  const Board = config.Board;
  const render = (s: ChallengeSession, dispatch: (action: unknown) => void, active: boolean, width: number) => {
    const hit = lookup(s.puzzle), b = bandOf(s.puzzle.bank);
    const view = hit && viewOf(hit.descriptor.payload, rules, s.payload, b ? cardOf(s.puzzle, b).title : '', hit.descriptor.teaches[0] ?? '', rungOfBank(s.puzzle.bank));
    return view ? <Board view={view} dispatch={dispatch} active={active} width={width}/> : null;
  };
  return {
    game, codec: config.codec, cove: true, puzzles: [], catalog, packed, helpUI: 'board',
    contextFor: ref => `${config.context}-${bandOf(ref.bank)?.tier ?? 1}`,
    controls: { help: () => ({ type: 'help' }), reset: () => ({ type: 'reset' }) },
    completionFacts: s => { const view = viewFor(s); return view ? { helpUsed: view.helps > 0, failed: false } : null; },
    completionText: (_ref, result) => result.event === 'together' ? config.finished.together : result.event === 'helped' ? config.finished.helped : config.finished.independent,
    start: (ref, owner, id, progress, _options, dares) => {
      const p = lookup(ref)?.descriptor.payload;
      if (p === undefined || dares.length) throw new Error('Unknown puzzle.');
      const s: ChallengeSession = { version: 1, owner, game, id, ordinal: progress.nextOrdinal, revision: 0, puzzle: ref, codec: config.codec, payload: freshPayload(p, rules), selectedDares: [], partner: null, result: null, credited: false };
      if (jsonBytes(s) > 4096 || !validChallengeSession(s, owner, catalog, owner.startsWith('cove-')) || !codec.canStart(s)) throw new Error('Invalid launch.');
      return s;
    },
    move: (s, action) => {
      try {
        if (!plain(action) || typeof action.type !== 'string' || !validChallengeSession(s, s.owner, catalog, s.owner.startsWith('cove-')) || s.result || s.credited) return null;
        const p = puzzleOf(s);
        if (p === undefined) return null;
        const payload = stepMarks(p, rules, s.payload as MarksPayload, action as MarkEvent);
        if (!payload || payload === s.payload) return null;
        const next: ChallengeSession = { ...s, revision: s.revision + 1, payload };
        const result = { ...next, result: evaluate(next) };
        return jsonBytes(result) <= 4096 && validChallengeSession(result, s.owner, catalog, s.owner.startsWith('cove-')) ? result : null;
      } catch { return null; }
    },
    render,
  };
}
