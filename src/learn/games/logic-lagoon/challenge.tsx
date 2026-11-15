import React, { lazy, Suspense } from 'react';
import type { BankLoader } from '../../../puzzles/loader';
import { bankLoader } from '../../../puzzles/catalog';
import { defineReplayGame } from '../../../challenge/replay';
import type { AwardRule, Puzzle, ChallengeViewProps } from '../../../challenge/types';
import { lagoonLatinAdapter } from '../../../puzzles/adapters/lagoon-latin';
import { replayEngine, type Descriptor, type Initial, type Action, type State } from './challenge-engine';
import facts from './packs.generated.json';
import samples from './challenge-puzzles.json';
import { withCheckpoints, rememberDescriptor } from './checkpoint';
const publicFacts = facts.filter(f => f.band !== 'school-cages');
export type Payload = import('./checkpoint').Payload | import('../../../challenge/types').ReplayPayload<Initial, Action>;
export type { Action, State } from './challenge-engine';
const Board = lazy(() => import('./challenge-view').then(m => ({ default: m.ChallengeBoard })));
const whole: AwardRule = { rule: { kind: 'whole' }, help: 'independent' }, clean: AwardRule = { rule: { kind: 'clean' }, help: 'independent' };
/** Fixed School samples in their own immutable banks; copied Sudoku rows earn no extra supply receipt. */
export const puzzles = samples as unknown as Puzzle<Descriptor>[];
export const makeRegistration = (loader?: () => Pick<BankLoader, 'entry' | 'savedHash'>) => {
const descriptors = new Map<string, Descriptor>();
const legacy = defineReplayGame({
  game: 'logic-lagoon', codec: 'lagoon-latin-2', context: 'lagoon', cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, puzzles, engine: replayEngine,
  helpUI: 'board', assistance: { bytes: 800, actions: 48, idempotentHelp: true, isAction: (a: Action) => a[0] === 'h' || a[0] === 'v' },
  Board: (p: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...p}/></Suspense>, controls: { help: (): Action => ['h'], reset: (): Action => ['z'] },
  packed: { family: 'logic-lagoon', awards: 3, loader,
    banks: publicFacts.map(f => ({ ...f, path: f.band === 'cages' ? 'endless' as const : 'deep-water' as const, tier: f.band === 'cages' ? 3 as const : f.band === 'wide-cages' ? 4 as const : 5 as const, title: f.band === 'cages' ? 'Cages without starters' : f.band === 'wide-cages' ? 'Six-wide cages' : 'Only arrows' })),
    open: async (loader, ordinal) => { const e = await loader.entry(lagoonLatinAdapter, 'logic-lagoon', ordinal); const descriptor = { puzzle: e.payload, title: e.band === 'marks-only' ? 'Only arrows' : 'Sum cages' }; rememberDescriptor(descriptors, e.ref, descriptor); return { ref: e.ref, descriptor }; },
    describe: () => ({ awards: [whole, clean] }),
  }, completionText: (_ref, result) => result.event === 'independent' ? 'You reasoned out the whole grid.' : 'You kept going and worked it out.',
});
// School-only content participates in packaged ownership, with no Challenge entry point.
const banks = new Map(legacy.catalog.banks);
for (const f of facts.filter(f => f.band === 'school-cages')) banks.set(f.slot, { slot: f.slot, first: f.first, count: f.count, packHash: f.packHash, rules: f.rules, family: 'logic-lagoon', engine: 'logic-lagoon', awards: 0, cove: false });
legacy.catalog.banks = banks;
return withCheckpoints(legacy, puzzles, descriptors, (p: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...p}/></Suspense>, async ref => {
  const f = publicFacts.find(f => f.slot === ref.bank); if (!f) throw new Error('Unknown Lagoon bank.');
  const e = await (loader ?? bankLoader)().entry(lagoonLatinAdapter, 'logic-lagoon', f.first + ref.puzzle);
  if (e.ref.hash !== ref.hash || e.ref.rules !== ref.rules || e.ref.engine !== ref.engine) throw new Error('The saved Lagoon fingerprint changed.');
  rememberDescriptor(descriptors, ref, { puzzle: e.payload, title: e.band === 'marks-only' ? 'Only arrows' : 'Sum cages' });
});
};
export const registration = makeRegistration();
registration.dareHelp = 'Dares are optional. Check counts the squares to fill or change; it never points them out. Hints keep your finish without a dare mark.';
