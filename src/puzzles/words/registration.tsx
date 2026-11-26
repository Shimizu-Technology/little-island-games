import React, { lazy, Suspense } from 'react';
import { defineReplayGame, type PackedReplay } from '../../challenge/replay';
import type { ChallengeViewProps, Puzzle, ReplayPayload } from '../../challenge/types';
import { bankLoader } from '../catalog';
import { jsonBytes, unpack } from '../../state/saveBits';
import type { PackedOpen } from '../../cove/catalog';
import { wordSearchAdapter } from './adapter';
import { searchEngine, type Action, type Initial, type State } from './game';
import type { SearchPuzzle } from './core';
import { searchBankShape } from './tiers';
const Board = lazy(() => import('./WordSearchBoard').then(m => ({ default: m.WordSearchBoard })));
export type SearchBank = { slot: number; first: number; count: number; packHash: string; rules: number; band: string; title: string; tier: 1 | 2 | 3 | 4 | 5 | 6;
  /** The baked grid size and direction count (2 across/down, 4 adds down-slants, 8 every way). Absent on older banks, which fall back by band. */
  size?: number; directionCount?: 2 | 4 | 8 };
/** Worst-case help: up to 24 words, each a ring, a direction and the word itself. The 552 bytes beyond the actions are the terminal result and wrapper, as before. */
const assistance = { bytes: 552 + 24 * 3 * 9, actions: 24 * 3 };
export function defineWordSearch(banks: readonly SearchBank[], puzzles: readonly Puzzle<SearchPuzzle>[] = [], loader?: PackedReplay<SearchPuzzle>['loader'], codec = 'word-search-v1') {
  const entry = defineReplayGame<SearchPuzzle, Initial, Action, State>({
    game: 'word-search', codec, context: 'word-search', cove: true,
    budget: { wrapper: 700, draft: 3396, undo: 0, audit: 0 },
    helpUI: 'board', assistance: { ...assistance, idempotentHelp: false, isAction: a => a[0] === 'help' || a[0] === 'hint' },
    puzzles, objectives: ['all-found'], engine: searchEngine,
    packed: banks.length ? { family: 'word-search', banks: banks.map(b => ({ ...b, path: 'endless' })), awards: 0,
      open: async (l, ordinal) => { const d = await l.entry(wordSearchAdapter(), 'word-search', ordinal); return { ref: d.ref, descriptor: d.payload }; },
      describe: () => ({ awards: [null, null] }), ...(loader ? { loader } : {}) } : undefined,
    Board: (props: ChallengeViewProps<State, Action> & { together?: boolean; resetKey?: string }) => <Suspense fallback={null}><Board {...props} together={props.together}/></Suspense>,
    controls: { help: () => ['help'], reset: () => ['undo'] },
    completionText: (_ref, result, facts) => result.event === 'together' ? 'You found every word together.' : facts?.helpUsed ? 'Every word found, with help along the way.' : 'You found every word.',
  });
  const packed = entry.packed && Object.assign(entry.packed, {
    open: async (bank: number, index: number) => {
      const b=banks.find(b=>b.slot===bank);if(!b || !Number.isInteger(index) || index<0 || index>=b.count)throw Error('Unknown puzzle.');
      const d=await (loader??bankLoader)().entry(wordSearchAdapter(),'word-search',b.first+index);await entry.packed!.prepare(d.ref);return d.ref;
    },
    describe: (bank: number) => {const b=banks.find(b=>b.slot===bank),t=b&&searchBankShape(b);return t?{size:t.size?`${t.size}×${t.size}`:'Large grid',summary:t.directions}:undefined;},
    hiddenRows: async (bank: number, hidden: readonly string[]) => {const b=entry.catalog.banks.get(bank),wanted=new Set(hidden),rows=new Set<number>();if(!b)return rows;for(let i=0;i<('count' in b?b.count:0);i++)if(wanted.has(await (loader??bankLoader)().savedHash(b as never,i)))rows.add(i);return rows;},
    chooseVisible: async (bank: number, progress: import('../../state/challenge').ChallengeProgress, skip: ReadonlySet<number>, avoid?: import('../../state/challenge').PuzzleRef) => {
      const b=banks.find(b=>b.slot===bank);if(!b)throw Error('Unknown bank.');const codes=unpack(progress.banks.find(([s])=>s===bank)?.[1]??'',b.count,3)??Array<number>(b.count).fill(0);
      const choices=Array.from({length:b.count},(_,i)=>i).filter(i=>!skip.has(i) && (avoid?.bank!==bank || avoid.puzzle!==i));
      const index=choices.find(i=>!codes[i])??choices.find(i=>codes[i]===1)??choices[0];
      if(index===undefined)return entry.packed!.choose(bank,progress,avoid);
      const d=await (loader??bankLoader)().entry(wordSearchAdapter(),'word-search',b.first+index);await entry.packed!.prepare(d.ref);return d.ref;
    },
  } satisfies PackedOpen);
  return { ...entry, serializeMoves: true,
    full: (s: Parameters<typeof entry.move>[0], action: unknown = ['undo']) => {
      const payload = s.payload as ReplayPayload<Initial, Action>;
      const next = { ...s, revision: s.revision + 1, payload: { ...payload, actions: [...payload.actions, action] } };
      return jsonBytes(next) > 4096 - assistance.bytes || next.payload.actions.length > 512 - assistance.actions;
    },
    // Legacy replays may contain repeated hearing. Coalesce only NEW input, preserving those saves.
    move: (s: Parameters<typeof entry.move>[0], a: unknown) => Array.isArray(a) && a[0] === 'hear' && (s.payload as ReplayPayload<Initial, Action>).actions.some(a => a[0] === 'hear') ? null : entry.move(s, a), ...(packed?{packed}:{}), render: (...args: Parameters<typeof entry.render>) => {
    const element = entry.render(...args) as React.ReactElement<ChallengeViewProps<State, Action> & { together?: boolean; resetKey?: string }> | null;
    return element ? React.cloneElement(element, { together: args[0].partner !== null, resetKey: `${args[0].owner}:${args[0].id}` }) : null;
  } };
}
