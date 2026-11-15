import React, { type ComponentType } from 'react';
import type { ChallengeSession, PuzzleRef, Terminal } from '../../../state/challenge';
import { validChallengeSession } from '../../../state/challenge';
import { exactKeys, jsonBytes, plain, uint } from '../../../state/saveBits';
import type { ChallengeViewProps, Evidence, Puzzle, ReplayPayload, TypedRegistration } from '../../../challenge/types';
import { proves } from '../../../challenge/evidence';
import { decodeGrid, encodeGrid, type PackedGrid } from '../../../puzzles/grid/model';
import { challengeEngine, replayEngine, type Action, type Descriptor, type Initial, type State } from './challenge-engine';
import { specFor } from './engine';

/** Game-owned bounded checkpoint. Legacy replay payloads remain readable and upgrade on the next edit. */
export type Payload = {
  version: 2; board: PackedGrid; helps: number; checks: number; failed: boolean; resets: number;
  checked: number | null; wrong: number | null; options: { supportOff: boolean; ownRead: boolean };
};
const key = (r: PuzzleRef) => `${r.bank}:${r.puzzle}:${r.hash}`;
const MAX = 2147483647, PAYLOAD_BYTES = 2596;
export function withCheckpoints(
  base: TypedRegistration<ReplayPayload<Initial, Action>, Action, State>,
  puzzles: readonly Puzzle<Descriptor>[], descriptors: Map<string, Descriptor>,
  Board: ComponentType<ChallengeViewProps<State, Action>>, reload: (ref: PuzzleRef) => Promise<void>,
): TypedRegistration<Payload | ReplayPayload<Initial, Action>, Action, State> {
  const original = base.catalog.codecs.get(base.codec)!;
  // Content preparation is keyed by the catalog object. Keep that identity while replacing this game-owned codec.
  const catalog = base.catalog, codecs = new Map(catalog.codecs);
  catalog.codecs = codecs;
  const descriptorOf = (s: ChallengeSession) => {
    const inline = puzzles.find(p => key(p.ref) === key(s.puzzle))?.descriptor; if (inline) return inline;
    const k = key(s.puzzle), hit = descriptors.get(k);
    if (hit) { descriptors.delete(k); descriptors.set(k, hit); }
    return hit;
  };
  function restore(s: ChallengeSession): { payload: Payload; state: State } | null {
    const d = descriptorOf(s), x = s.payload;
    if (!d || !plain(x)) return null;
    if (x.version === 1) {
      if (!original.validate(s)) return null;
      const old = x as ReplayPayload<Initial, Action>;
      let state = replayEngine.create(d, old.initial, old.options), checks = 0, failed = false, resets = 0;
      for (const a of old.actions) {
        const next = replayEngine.step(state, a, d); if (!next) return null;
        state = next.state;
        if (next.event === 'check') { checks++; failed ||= !next.correct; }
        if (next.event === 'reset') resets++;
      }
      return { payload: pack(state, { version: 2, board: encodeGrid(state.grid, specFor(d.puzzle)), helps: state.helps, checks, failed, resets, checked: state.checked, wrong: state.wrong, options: old.options }), state };
    }
    if (!exactKeys(x, ['version', 'board', 'helps', 'checks', 'failed', 'resets', 'checked', 'wrong', 'options']) || x.version !== 2 || !uint(x.helps, MAX) || !uint(x.checks, MAX) || !uint(x.resets, MAX) || typeof x.failed !== 'boolean' || !(x.checked === null || uint(x.checked, MAX)) || !(x.wrong === null || uint(x.wrong, d.puzzle.size ** 2)) || !plain(x.options) || !exactKeys(x.options, ['supportOff', 'ownRead']) || typeof x.options.supportOff !== 'boolean' || typeof x.options.ownRead !== 'boolean' || jsonBytes(x) > PAYLOAD_BYTES) return null;
    const grid = decodeGrid(x.board, specFor(d.puzzle));
    if (!grid || x.checked !== null && (x.checked !== grid.edits || !x.checks || x.wrong !== 0) || x.wrong !== null && !x.checks || x.failed && !x.checks || typeof x.wrong === 'number' && x.wrong > 0 && !x.failed || x.checks > 0 && !x.failed && x.checked === null) return null;
    const payload = x as Payload, state: State = { descriptor: d, grid, helps: payload.helps, checked: payload.checked, wrong: payload.wrong };
    if (payload.checked !== null && !challengeEngine.inspect(state, d).solved) return null;
    return { payload, state };
  }
  function pack(state: State, p: Payload): Payload {
    const header = { ...p, helps: state.helps, checked: state.checked, wrong: state.wrong };
    // Bounded undo is working memory; no help, Check or miss evidence is discarded.
    const overhead = jsonBytes({ ...header, board: null }) - 4;
    return { ...header, board: encodeGrid(state.grid, specFor(state.descriptor.puzzle), Math.min(2200, PAYLOAD_BYTES - overhead)) };
  }
  function facts(s: ChallengeSession): Evidence | null {
    const round = restore(s); if (!round) return null;
    const { payload: p, state } = round;
    return { ...challengeEngine.inspect(state, state.descriptor), ...p.options, helpUsed: p.helps > 0, heard: false, failed: p.failed, runs: p.checks, checks: p.checks, resets: p.resets, firstSolutions: [] };
  }
  const evaluate = (s: ChallengeSession): Terminal | null => {
    if (plain(s.payload) && s.payload.version === 1) return original.evaluate(s);
    const e = facts(s); if (!e?.solved) return null;
    const puzzle = puzzles.find(p => key(p.ref) === key(s.puzzle)), together = s.partner !== null;
    const awards = (puzzle?.awards ?? [{ rule: { kind: 'whole' }, help: 'independent' }, { rule: { kind: 'clean' }, help: 'independent' }] as const).reduce<number>((bits, a, i) => bits | (a && proves(a.rule, e, a.help, together) ? 1 << i : 0), 0);
    return { event: together ? 'together' : e.helpUsed || e.failed ? 'helped' : 'independent', awards, dares: s.selectedDares.filter(slot => { const d = puzzle?.dares.find(d => d.slot === slot); return !!d && proves(d.rule, e, d.help, together); }).sort((a, b) => a - b), cost: puzzle?.par ? e.metrics[puzzle.par.metric] ?? null : null, solution: e.solution };
  };
  codecs.set(base.codec, {
    ...original, validate: s => !!restore(s), evaluate,
    canStart: s => {
      if (plain(s.payload) && s.payload.version === 1) return original.canStart(s);
      const r = restore(s); if (!r || s.result) return false;
      const fresh = challengeEngine.create(r.state.descriptor, { version: 1 }, r.payload.options);
      return !r.payload.helps && !r.payload.checks && !r.payload.resets && !r.payload.failed && r.payload.checked === null && r.payload.wrong === null && JSON.stringify(r.payload.board) === JSON.stringify(pack(fresh, r.payload).board);
    },
    extends: (a, b) => {
      if (plain(b.payload) && b.payload.version === 1) return plain(a.payload) && a.payload.version === 1 && original.extends(a, b);
      const before = restore(a), after = restore(b);
      return !!before && !!after && after.state.grid.edits >= before.state.grid.edits && after.payload.helps >= before.payload.helps && after.payload.checks >= before.payload.checks && after.payload.resets >= before.payload.resets && (!before.payload.failed || after.payload.failed) && JSON.stringify(before.payload.options) === JSON.stringify(after.payload.options);
    },
  });
  return {
    ...base, catalog,
    ...(base.packed ? { packed: { ...base.packed, prepare: async (ref: PuzzleRef) => { await base.packed!.prepare(ref); if (!descriptors.has(key(ref))) await reload(ref); } } } : {}),
    start: (...args) => {
      const s = base.start(...args), r = restore(s); if (!r) throw new Error('Invalid Lagoon launch.');
      const grid = { ...r.state.grid, selected: Math.max(0, r.state.descriptor.puzzle.givens.indexOf(0)) };
      const next = { ...s, payload: pack({ ...r.state, grid }, r.payload) };
      if (jsonBytes(next) > 3296 || !validChallengeSession(next, next.owner, catalog, next.owner.startsWith('cove-')) || !codecs.get(base.codec)!.canStart(next)) throw new Error('Invalid Lagoon checkpoint launch.');
      return next;
    },
    completionFacts: s => { const e = facts(s); return e ? { helpUsed: e.helpUsed, failed: e.failed } : null; },
    move: (s, action) => {
      try {
        if (!challengeEngine.validAction(action) || s.result || s.credited || !validChallengeSession(s, s.owner, catalog, s.owner.startsWith('cove-'))) return null;
        const r = restore(s); if (!r) return null;
        const next = challengeEngine.step(r.state, action, r.state.descriptor); if (!next) return null;
        const p = { ...r.payload, checks: Math.min(MAX, r.payload.checks + Number(next.event === 'check')), failed: r.payload.failed || next.event === 'check' && !next.correct, resets: Math.min(MAX, r.payload.resets + Number(next.event === 'reset')) };
        const session: ChallengeSession = { ...s, revision: s.revision + 1, payload: pack(next.state, p) };
        session.result = evaluate(session);
        return jsonBytes(session) <= 4096 && validChallengeSession(session, s.owner, catalog, s.owner.startsWith('cove-')) ? session : null;
      } catch { return null; }
    },
    render: (s, dispatch, active, width, host) => {
      const r = restore(s); if (!r) return null;
      return <Board state={r.state} dispatch={dispatch} active={active} width={width} sessionKey={host?.key} onFresh={host?.onFresh} onSettled={host?.onSettled} header={host?.header} footer={host?.footer} commit={host ? async (action, expectedKey) => { const accepted = await host.commit(action, expectedKey), restored = accepted && restore(accepted.session); return restored ? { key: accepted!.key, state: restored.state } : null; } : undefined}/>;
    },
  };
}
export const rememberDescriptor = (descriptors: Map<string, Descriptor>, ref: PuzzleRef, descriptor: Descriptor) => {
  const k = key(ref); descriptors.delete(k); descriptors.set(k, descriptor);
  while (descriptors.size > 16) descriptors.delete(descriptors.keys().next().value!);
};
