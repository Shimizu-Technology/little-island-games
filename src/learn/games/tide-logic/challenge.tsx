import React from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { ChallengeViewProps } from '../../../challenge/types';
import { validChallengeSession, type ChallengeSession } from '../../../state/challenge';
import { jsonBytes } from '../../../state/saveBits';
import { HELP, RUN, CLEAR, challengeEngine, type Action, type Initial, type Payload, type State } from './challenge-engine';
import { tidePuzzles } from './challenge-content';
export type { Action, Payload, State } from './challenge-engine';

/**
 * Certified in tests/c4-tide-challenge.test.ts: from the ordinary ceiling (504 actions), three Help presses and the runs
 * they allow (at most six actions) still fit, under 4 bytes an action plus the result's bytes.
 */
export const ASSIST_ACTIONS = 8, ASSIST_BYTES = 4 * ASSIST_ACTIONS + 192;
export const tideAssistance = { bytes: ASSIST_BYTES, actions: ASSIST_ACTIONS, idempotentHelp: false, isAction: (a: Action) => a === HELP };
// The save catalog loads this file in plain Node tests; only a live screen needs the native board.
let board: typeof import('./challenge-view').ChallengeBoard | undefined;
function LazyBoard(props: ChallengeViewProps<State, Action>) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  board ??= (require('./challenge-view') as typeof import('./challenge-view')).ChallengeBoard;
  return React.createElement(board, props);
}
export const registration = defineReplayGame({
  game: 'tide-logic', codec: 'tide-logic-replay-v1', context: 'tide', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: [...tidePuzzles].sort((a, b) => a.ref.bank - b.ref.bank || a.ref.puzzle - b.ref.puzzle), objectives: [], engine: challengeEngine,
  helpUI: 'board', assistance: tideAssistance,
  Board: LazyBoard, controls: { help: (): Action => HELP, reset: (): Action => CLEAR },
  completionText: (_ref, result, facts) => result.event === 'independent' ? 'Your rule sorted every catch, first time on your own.' : facts?.failed && !facts.helpUsed ? 'You read the bug on the belt and fixed your rule.' : 'You kept going and the belt sorts right.',
});
// A continued attempt's earlier Help sits in its starting record, not in the new actions: it still counts as help, so a Help-only restart is never told it fixed a missed catch.
const replayFacts = registration.completionFacts;
registration.completionFacts = s => {
  const facts = replayFacts?.(s) ?? null, prior = (s.payload as Payload).initial.prior;
  return facts && prior && prior.hints > 0 ? { ...facts, helpUsed: true } : facts;
};
registration.dareHelp = 'Dares are optional. Help keeps your finish, but these dares need you to do it on your own.';
const find = (s: ChallengeSession) => tidePuzzles.find(p => p.ref.bank === s.puzzle.bank && p.ref.puzzle === s.puzzle.puzzle && p.ref.hash === s.puzzle.hash);
/** The attempt has used its ordinary room: the next edit could not be saved. Help can still finish; Keep my plan keeps editing. */
registration.full = (s, action) => {
  if (!find(s)) return false;
  const payload = s.payload as Payload;
  return jsonBytes({ ...s, revision: s.revision + 1, payload: { ...payload, actions: [...payload.actions, action ?? RUN] } }) > 4096 - ASSIST_BYTES || payload.actions.length + 1 > 512 - ASSIST_ACTIONS;
};
registration.restart = (session, id, progress) => {
  const puzzle = find(session);
  if (!puzzle || session.result || !validChallengeSession(session, session.owner, registration.catalog)) throw new Error('Invalid Tide Logic attempt.');
  const payload = session.payload as Payload;
  let state = challengeEngine.create(puzzle.descriptor, payload.initial, payload.options), failed = payload.initial.prior?.failed ?? false;
  for (const action of payload.actions) {
    const next = challengeEngine.step(state, action, puzzle.descriptor);
    if (!next) throw new Error('Invalid Tide Logic replay.');
    if (next.correct === false) failed = true;
    state = next.state;
  }
  // Help counts against independence, so Keep my plan cannot launder it.
  const prior = { runs: Math.min(65535, (payload.initial.prior?.runs ?? 0) + state.runs), failed: failed || state.hints > 0, hints: Math.min(65535, state.hints) };
  const initial: Initial = { version: 1, prior, draft: state.draft };
  const started = registration.start(session.puzzle, session.owner, id, progress, payload.options, session.selectedDares);
  return { ...started, payload: { ...(started.payload as Payload), initial }, revision: 0 };
};
