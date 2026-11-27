import { validSession } from '../src/state/validation';
import { describe, expect, it } from 'vitest';
import { createMemory, flipCard, memoryDone, memoryKey, replayMemory } from '../src/games/memory';
import { defaultOptions } from '../src/games/types';
import { readFileSync } from 'node:fs';
const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
describe('gentle Memory starts', () => {
  for (const pairs of [2, 4] as const) it(`${pairs} pairs can complete and replay`, () => {
    let state = createMemory(defaultOptions, 0, 'pictures', pairs);
    expect(state.cards).toHaveLength(pairs * 2);
    expect(validSession(JSON.parse(JSON.stringify(state)))).toBe(true);
    expect(validSession({ ...state, starterPairs: 6 })).toBe(false);
    expect(validSession({ ...state, starterPairs: undefined })).toBe(false);
    for (const key of new Set(state.cards.map(memoryKey))) {
      const indices = state.cards.flatMap((card, i) => memoryKey(card) === key ? [i] : []);
      state = flipCard(flipCard(state, indices[0]), indices[1]);
    }
    expect(memoryDone(state)).toBe(true);
    expect(validSession(state)).toBe(true);
    expect(replayMemory(state).cards).toHaveLength(pairs * 2);
  });
});
it('labels a hub resume with its game name and pauses background travel', () => {
  const hub = source('hub/HubScreen.tsx');
  expect(hub).toContain('dock(`Play ${shelfGames.find');
  expect(hub).toContain('active={focused && !settings && clear && foreground}');
  expect(hub).not.toContain("dock('School'");
});
it('Fishing Nets rules describe the two-dot input', () => {
  expect(source('board/index.ts')).toContain('Tap a dot, then a neighboring dot');
  expect(source('board/Boards.tsx')).toContain('Tap a dot, then its neighbor');
});
it('keeps technique names out of puzzle status', () => {
  expect(source('puzzles/ui/PuzzleStatus.tsx')).not.toContain('skill: ${');
});
it('asks before clearing an active drawing and explains its lifetime', () => {
  const draw = source('puzzles/picture-grid/DrawBoard.tsx');
  expect(draw).toContain('Just for this turn — hand over to play!');
  expect(draw).toContain('Clear your drawing for a new size?');
});
it('uses warm tutorial frames for fallback, Cargo, action and grid demos', () => {
  for (const path of ['arcade/Teaching.tsx', 'arcade/games/canoe-cargo/Teaching.tsx', 'arcade/action/Teaching.tsx', 'arcade/games/grid/Teaching.tsx']) {
    expect(source(path)).toContain('board/WarmUI');
    expect(source(path)).not.toMatch(/#266E78|#225F68|#263C5C/);
  }
});
