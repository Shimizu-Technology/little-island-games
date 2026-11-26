import React, { lazy, Suspense } from 'react';
import { defineReplayGame } from '../../../challenge/replay';
import type { ChallengeViewProps } from '../../../challenge/types';
import { labPuzzles } from './challenge-content';
import { challengeEngine, type Action, type State } from './challenge-engine';
export type { Payload, Action, State } from './challenge-engine';
const Board = lazy(() => import('./challenge-view').then(m => ({ default: m.ChallengeBoard })));
/** Only three Help stages are accepted, never reset by edits/Undo. Full completion is below 240 actions/4KiB even after abuse. */
export const labAssistance = { bytes: 192, actions: 4, idempotentHelp: false, isAction: (a: Action) => a[0] === 'h' };
export const registration = defineReplayGame({
  game: 'code-lab', codec: 'code-lab-v1', context: 'code-lab', cove: false, budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
  puzzles: labPuzzles, engine: challengeEngine, helpUI: 'board', assistance: labAssistance,
  Board: (props: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...props} /></Suspense>,
  controls: { help: (): Action => ['h', 3], reset: (): Action => ['z'] },
  completionText: (_ref, result) => result.event === 'independent' ? 'You followed the program and worked it out.' : 'You kept your work and found a working plan.',
});
registration.dareHelp = 'Dares are optional. Help always keeps your finish. These programs are for ages 9–14, with older learners and adults at the top.';
