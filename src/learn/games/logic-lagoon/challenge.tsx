import React, { lazy, Suspense } from 'react';
import type { BankLoader } from '../../../puzzles/loader';
import { defineReplayGame } from '../../../challenge/replay';
import type { AwardRule, Puzzle, ChallengeViewProps } from '../../../challenge/types';
import { taskAt, type LatinState } from './engine';
import { optionsAtLevel } from '../../levelOptions';
import { engine } from './engine';
import { sha256Hex } from '../../../puzzles/sha256';
import { lagoonLatinAdapter } from '../../../puzzles/adapters/lagoon-latin';
import { challengeEngine, type Descriptor, type Initial, type Action, type State } from './challenge-engine';
import facts from './packs.generated.json';
export type Payload = import('../../../challenge/types').ReplayPayload<Initial, Action>;
export type { Action, State } from './challenge-engine';
const Board = lazy(() => import('./challenge-view').then(m => ({ default: m.ChallengeBoard })));
const whole: AwardRule = { rule: { kind: 'whole' }, help: 'independent' }, clean: AwardRule = { rule: { kind: 'clean' }, help: 'independent' };
/** Fixed School samples in their own immutable banks; copied Sudoku rows earn no extra supply receipt. */
export const puzzles: Puzzle<Descriptor>[] = [1, 2, 3, 4, 5].flatMap(n => {
  const level = n as 1|2|3|4|5;
  return Array.from({ length: 4 }, (_, i) => {
    const s = engine.create(optionsAtLevel({ mode: 'solo', pace: 'easy' }, level), { rng: () => (17 + i * 7919) / 0xffffffff, skills: {}, starter: 0, today: 0 }) as LatinState;
    const t = taskAt(s); if (t.kind !== 'grid') throw new Error('Expected grid.');
    const bank = 263 + level - 1, descriptor: Descriptor = { puzzle: t.puzzle!, title: `Level ${level} · ${i + 1}`, ...(t.symbols[0] === 'shell' ? { symbols: t.symbols } : {}) };
    const award = level === 3 ? clean : level === 5 ? { rule: { kind: 'plan', max: 1 } as const, help: 'independent' as const } : whole;
    return { ref: { bank, puzzle: i, engine: 'logic-lagoon', rules: 2, hash: sha256Hex(JSON.stringify(descriptor)) }, source: { kind: 'school' as const, game: 'logic-lagoon', level, puzzle: `latin-${level}-${i}` }, path: 'endless' as const, tier: level, title: descriptor.title, descriptor,
      dares: [{ slot: 800 + (level - 1) * 4 + i, id: `lagoon-${level}-${i}`, label: level === 3 ? 'No help' : level === 5 ? 'One check only' : 'Check at the end', ...award }], awards: [award, null] as const };
  });
});
export const makeRegistration = (loader?: () => Pick<BankLoader, 'entry' | 'savedHash'>) => defineReplayGame({
  game: 'logic-lagoon', codec: 'lagoon-latin-2', context: 'lagoon', cove: false,
  budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 }, puzzles, engine: challengeEngine,
  helpUI: 'board', assistance: { bytes: 800, actions: 48, idempotentHelp: true, isAction: (a: Action) => a[0] === 'h' || a[0] === 'v' },
  Board: (p: ChallengeViewProps<State, Action>) => <Suspense fallback={null}><Board {...p}/></Suspense>, controls: { help: (): Action => ['h'], reset: (): Action => ['z'] },
  packed: { family: 'logic-lagoon', awards: 3, loader,
    banks: facts.map(f => ({ ...f, path: f.band === 'cages' ? 'endless' as const : 'deep-water' as const, tier: f.band === 'cages' ? 3 as const : f.band === 'wide-cages' ? 4 as const : 5 as const, title: f.band === 'cages' ? 'Cages without starters' : f.band === 'wide-cages' ? 'Six-wide cages' : 'Only arrows' })),
    open: async (loader, ordinal) => { const e = await loader.entry(lagoonLatinAdapter, 'logic-lagoon', ordinal); return { ref: e.ref, descriptor: { puzzle: e.payload, title: e.band === 'marks-only' ? 'Only arrows' : 'Sum cages' } }; },
    describe: () => ({ awards: [whole, clean] }),
  }, completionText: (_ref, result) => result.event === 'independent' ? 'You reasoned out the whole grid.' : 'You kept going and worked it out.',
});
export const registration = makeRegistration();
registration.dareHelp = 'Dares are optional. Check counts the squares to change; it never points them out. Hints keep your finish without a dare mark.';
