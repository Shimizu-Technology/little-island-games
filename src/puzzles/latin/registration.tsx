import React, { type ComponentType } from 'react';
import type { ChallengeCard, PackedBand, PackedChallenge, TypedRegistration } from '../../challenge/types';
import type { ChallengeProgress, ChallengeSession, PuzzleRef, SaveCatalog, SessionCodec, Terminal } from '../../state/challenge';
import { validChallengeSession } from '../../state/challenge';
import { prepareSessionContent } from '../../state/sessionContent';
import { asciiId, exactKeys, hashId, jsonBytes, plain, uint, unpack } from '../../state/saveBits';
import { bankLoader } from '../catalog';
import { BankError, type BankLoader } from '../loader';
import { sha256Hex } from '../sha256';
import type { PuzzleDescriptor } from '../types';
import { createGrid, decodeGrid, encodeGrid, gridAction, type GridAction, type GridSpec, type GridState, type PackedGrid, type Stroke } from '../grid/model';
import { isGridEvent } from '../grid/checkpoint';
import { latinAdapter } from './adapter';
import { cellsOf, maxValue, shapeOf, solved, type LatinKind, type LatinPuzzle } from './core';
import { planHint } from './solver';
import { rungFor } from './rungs';

/** Board events. Help records assistance without changing the board; Hint applies one taught move. */
export type LatinEvent = GridAction | { type: 'help' } | { type: 'hint' } | { type: 'reset' } | { type: 'fill-notes' };
export type AuditKind = 'help' | 'reset';
/** Exact session payload: the packed board (values, notes, selection, bounded undo) and an audit. */
export type LatinPayload = { version: 1; board: PackedGrid; audit: [AuditKind, number][] };
export type LatinView = { puzzle: LatinPuzzle; state: GridState; spec: GridSpec; helps: number; resets: number; title: string; teaches: string };
export type LatinBoardProps = { view: LatinView; dispatch: (event: LatinEvent) => void; active: boolean; width: number };
export type BankFacts = { slot: number; first: number; count: number; packHash: string; rules: number; band: string };

const symbols = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const gridSpec = (p: LatinPuzzle): GridSpec => ({ rows: p.size, columns: p.size, kind: 'digits', symbols: symbols.slice(0, maxValue(p)), givens: p.givens });
const MAX_AUDIT = 2147483647, BOARD_BYTES = 3000;
const auditCount = (audit: LatinPayload['audit'], kind: AuditKind) => audit.filter(a => a[0] === kind).reduce((n, a) => n + a[1], 0);
/** Counts never shrink; consecutive events of one kind share a row; at most 32 rows are kept in order. */
function record(audit: LatinPayload['audit'], kind: AuditKind): LatinPayload['audit'] {
  const last = audit.at(-1);
  if (last?.[0] === kind) return [...audit.slice(0, -1), [kind, Math.min(MAX_AUDIT, last[1] + 1)]];
  if (audit.length < 32) return [...audit, [kind, 1]];
  return (['help', 'reset'] as const).flatMap(k => { const n = auditCount(audit, k) + (k === kind ? 1 : 0); return n ? [[k, Math.min(MAX_AUDIT, n)] as [AuditKind, number]] : []; });
}
function validAudit(x: unknown): x is LatinPayload['audit'] {
  return Array.isArray(x) && x.length <= 32 && x.every((a, i, all) => Array.isArray(a) && a.length === 2 && (a[0] === 'help' || a[0] === 'reset') && uint(a[1], MAX_AUDIT) && a[1] > 0 && (!i || all[i - 1][0] !== a[0]));
}
/** Public candidates: each empty cell's numbers not already used by a filled peer. */
export function fillNotes(p: LatinPuzzle, state: GridState): GridState {
  const { peers } = shapeOf(p), stroke: Stroke = [], notes = [...state.notes];
  for (const i of cellsOf(p)) {
    if (p.givens[i] || state.values[i]) continue;
    let mask = 0;
    for (let v = 1; v <= maxValue(p); v++) if (!peers[i].some(j => state.values[j] === v)) mask |= 1 << (v - 1);
    if (mask !== notes[i]) { stroke.push([i, 0, notes[i], 0, mask]); notes[i] = mask; }
  }
  return stroke.length ? { ...state, notes, undo: [...state.undo, stroke].slice(-256), redo: [], edits: state.edits + 1 } : state;
}
/** One step of the real engine. Returns the same payload object when nothing changes. */
export function latinStep(p: LatinPuzzle, payload: LatinPayload, event: LatinEvent): LatinPayload | null {
  const spec = gridSpec(p), state = decodeGrid(payload.board, spec);
  if (!state || !validAudit(payload.audit)) return null;
  let board = state, audit = payload.audit;
  if (event.type === 'help') audit = record(audit, 'help');
  else if (event.type === 'reset') { audit = record(audit, 'reset'); board = { ...createGrid(spec), pencil: state.pencil, tool: state.tool, edits: state.edits + 1 }; }
  else if (event.type === 'fill-notes') board = fillNotes(p, state);
  else if (event.type === 'hint') {
    const plan = planHint(p, state.values);
    const move = plan.kind === 'place' ? { cell: plan.cell, value: plan.value } : plan.kind === 'clash' ? { cell: plan.erase, value: 0 } : plan.kind === 'mistake' ? { cell: plan.cell, value: 0 } : null;
    if (!move) return payload;
    // A taught move always places a number, even while notes are on.
    const placed = gridAction({ ...state, pencil: false }, { type: 'write', cells: [move.cell], value: move.value, selected: move.cell }, spec);
    if (placed === state) return payload;
    board = { ...placed, pencil: state.pencil };
    audit = record(audit, 'help');
  } else {
    if (!isGridEvent(event, spec) || ['check', 'help', 'reset'].includes(event.type)) return null;
    board = gridAction(state, event as GridAction, spec);
  }
  if (board === state && audit === payload.audit) return payload;
  try {
    return { version: 1, board: encodeGrid(board, spec, Math.min(BOARD_BYTES, 3300 - JSON.stringify(audit).length)), audit };
  } catch { return null; }
}
export const freshPayload = (p: LatinPuzzle): LatinPayload => ({ version: 1, board: encodeGrid(createGrid(gridSpec(p)), gridSpec(p)), audit: [] });
const validPayloadShape = (x: unknown): x is LatinPayload => plain(x) && exactKeys(x, ['version', 'board', 'audit']) && x.version === 1 && plain(x.board) && validAudit(x.audit) && JSON.stringify(x).length <= 3400;
export function viewOf(p: LatinPuzzle, payload: unknown, title = '', teaches = ''): LatinView | null {
  if (!validPayloadShape(payload)) return null;
  const spec = gridSpec(p), state = decodeGrid(payload.board, spec);
  return state ? { puzzle: p, state, spec, helps: auditCount(payload.audit, 'help'), resets: auditCount(payload.audit, 'reset'), title, teaches } : null;
}

const refKey = (r: PuzzleRef) => `${r.bank}:${r.puzzle}:${r.engine}:${r.rules}:${r.hash}`;
const RESIDENT = 16;
type Resident = { ref: PuzzleRef; descriptor: PuzzleDescriptor<LatinPuzzle> };
/**
 * A Cove game over certified packed banks with an exact checkpoint codec. Descriptors become resident
 * only after the shared loader verified their row; a stored session waits for `prepare` before replay.
 */
export function defineLatinGame(config: {
  kind: LatinKind; codec: string; context: string; family: string; banks: readonly BankFacts[];
  Board: ComponentType<LatinBoardProps>; loader?: () => Pick<BankLoader, 'entry' | 'savedHash'>;
}): TypedRegistration<LatinPayload, LatinEvent, LatinView> {
  const { kind, banks: facts } = config, game = kind, adapter = latinAdapter(kind), loader = config.loader ?? bankLoader;
  if (!asciiId(config.codec) || !asciiId(config.context, 14) || !asciiId(config.family)) throw new Error('Invalid Latin registration.');
  const bands: PackedBand[] = facts.map(b => {
    const rung = rungFor(kind, b.band);
    if (!rung || !uint(b.slot, 511) || !uint(b.first) || !uint(b.count, 1024) || !b.count || !hashId(b.packHash) || b.rules !== adapter.rules) throw new Error('Invalid Latin bank facts.');
    return { kind: 'band', bank: b.slot, path: 'endless', tier: rung.tier, title: rung.title, count: b.count };
  });
  const resident = new Map<string, Resident>();
  const lookup = (ref: PuzzleRef) => { const key = refKey(ref), hit = resident.get(key); if (hit) { resident.delete(key); resident.set(key, hit); } return hit; };
  const puzzleOf = (s: ChallengeSession) => lookup(s.puzzle)?.descriptor.payload;
  const bandOf = (bank: number) => bands.find(b => b.bank === bank);
  const factsOf = (bank: number) => facts.find(b => b.slot === bank);
  const evaluate = (s: ChallengeSession): Terminal | null => {
    const p = puzzleOf(s), view = p && viewOf(p, s.payload);
    if (!p || !view || !solved(p, view.state.values)) return null;
    return { event: s.partner !== null ? 'together' : view.helps ? 'helped' : 'independent', awards: 0, dares: [], cost: null, solution: sha256Hex(view.state.values.join('')) };
  };
  const validate = (s: ChallengeSession) => { const p = puzzleOf(s); return !!p && !!viewOf(p, s.payload); };
  const codec: SessionCodec = {
    game, cove: true, budget: { wrapper: 696, draft: 3000, undo: 0, audit: 400 }, validate, evaluate,
    canStart: s => { const p = puzzleOf(s); return !!p && s.result === null && JSON.stringify(s.payload) === JSON.stringify(freshPayload(p)); },
    // Structural: recovery may run before content loads. Edits and audit totals never go backward.
    extends: (a, b) => {
      if (!validPayloadShape(a.payload) || !validPayloadShape(b.payload)) return false;
      const before = a.payload, after = b.payload;
      return uint(before.board.edits) && uint(after.board.edits) && after.board.edits >= before.board.edits && (['help', 'reset'] as const).every(k => auditCount(after.audit, k) >= auditCount(before.audit, k));
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
    const descriptor = await loader().entry(adapter, config.family, b.first + ref.puzzle);
    const got = descriptor.ref;
    if (got.bank !== b.slot || got.puzzle !== ref.puzzle || got.engine !== game || got.rules !== b.rules || want && got.hash !== want.hash) throw new BankError('hash-mismatch', 'This puzzle does not match its saved fingerprint.');
    await prepareSessionContent({ puzzle: got }, catalog, { loader: loader() });
    resident.set(refKey(got), { ref: got, descriptor });
    while (resident.size > RESIDENT) resident.delete(resident.keys().next().value!);
    return got;
  }
  const packed: PackedChallenge & { open: (bank: number, index: number) => Promise<PuzzleRef>; teaches: (ref: PuzzleRef) => string | undefined } = {
    bands,
    card: ref => { const b = bandOf(ref.bank); return b && ref.engine === game && ref.rules === factsOf(ref.bank)!.rules && uint(ref.puzzle, b.count - 1) ? cardOf(ref, b) : undefined; },
    prepare: async ref => { if (bandOf(ref.bank)) await resolve(ref); },
    open: (bank, index) => resolve({ bank, puzzle: index }),
    teaches: ref => lookup(ref)?.descriptor.teaches[0],
    /** Unopened entries first, then unfinished ones, in bank order from just after the last one played. */
    choose: async (bank: number, progress: ChallengeProgress, avoid?: PuzzleRef) => {
      const b = bandOf(bank);
      if (!b) throw new BankError('unknown', 'Unknown packed bank.');
      const states = unpack(progress.banks.find(r => r[0] === bank)?.[1] ?? '', b.count, 3) ?? Array<number>(b.count).fill(0);
      const recent = progress.recent.filter(([s]) => s === bank).map(([, p]) => p), last = recent.at(-1) ?? -1;
      const order = Array.from({ length: b.count }, (_, i) => (last + 1 + i) % b.count).filter(i => b.count === 1 || i !== avoid?.puzzle || avoid.bank !== bank);
      const pick = order.find(i => !states[i]) ?? order.find(i => states[i] === 1) ?? order.find(i => !recent.includes(i)) ?? order[0];
      return resolve({ bank, puzzle: pick });
    },
  };
  const Board = config.Board;
  const render = (s: ChallengeSession, dispatch: (action: unknown) => void, active: boolean, width: number) => {
    const hit = lookup(s.puzzle), b = bandOf(s.puzzle.bank), view = hit && viewOf(hit.descriptor.payload, s.payload, b ? cardOf(s.puzzle, b).title : '', hit.descriptor.teaches[0] ?? '');
    return view ? <Board view={view} dispatch={dispatch} active={active} width={width}/> : null;
  };
  return {
    game, codec: config.codec, cove: true, puzzles: [], catalog, packed, helpUI: 'board',
    contextFor: ref => `${config.context}-${bandOf(ref.bank)?.tier ?? 1}`,
    controls: { help: () => ({ type: 'help' }), reset: () => ({ type: 'reset' }) },
    completionFacts: s => { const p = puzzleOf(s), view = p && viewOf(p, s.payload); return view ? { helpUsed: view.helps > 0, failed: false } : null; },
    completionText: (_ref, result) => result.event === 'together' ? 'You reasoned it out together.' : result.event === 'helped' ? 'Solved, with a hint along the way.' : 'Every number found by your own reasoning.',
    start: (ref, owner, id, progress, _options, dares) => {
      const p = lookup(ref)?.descriptor.payload;
      if (!p || dares.length) throw new Error('Unknown puzzle.');
      const s: ChallengeSession = { version: 1, owner, game, id, ordinal: progress.nextOrdinal, revision: 0, puzzle: ref, codec: config.codec, payload: freshPayload(p), selectedDares: [], partner: null, result: null, credited: false };
      if (jsonBytes(s) > 4096 || !validChallengeSession(s, owner, catalog, owner.startsWith('cove-')) || !codec.canStart(s)) throw new Error('Invalid launch.');
      return s;
    },
    move: (s, action) => {
      try {
        if (!plain(action) || typeof action.type !== 'string' || !validChallengeSession(s, s.owner, catalog, s.owner.startsWith('cove-')) || s.result || s.credited) return null;
        const p = puzzleOf(s);
        if (!p) return null;
        const payload = latinStep(p, s.payload as LatinPayload, action as LatinEvent);
        if (!payload || payload === s.payload) return null;
        const next: ChallengeSession = { ...s, revision: s.revision + 1, payload };
        const result = { ...next, result: evaluate(next) };
        return jsonBytes(result) <= 4096 && validChallengeSession(result, s.owner, catalog, s.owner.startsWith('cove-')) ? result : null;
      } catch { return null; }
    },
    render,
  };
}
