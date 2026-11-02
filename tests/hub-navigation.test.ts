import { describe, expect, it, vi } from 'vitest';
import { shelfGames } from '../src/learn/home';
import { arcadeIds } from '../src/arcade';
import { openGame, placeRoute } from '../src/hub/navigation';
const { push, shelf } = vi.hoisted(() => ({ push: vi.fn(), shelf: vi.fn() }));
vi.mock('expo-router', () => ({ router: { push } }));
vi.mock('../src/components/GameShelf', () => ({ openShelfGame: shelf }));
describe('hub route completeness', () => {
 it('keeps all seven existing destinations reachable', () => {
  expect(['school','library','arcade','hall','home','locker','badges'].map(id => placeRoute(id as Parameters<typeof placeRoute>[0]))).toEqual(['/school','/library','/arcade',{pathname:'/shelf',params:{island:'classic'}},'/island-home','/locker','/badges']);
 });
 it('launches every shared catalog item through its existing handler', () => {
  for (const game of shelfGames) {
   push.mockClear(); shelf.mockClear(); openGame(game.id);
   if ((arcadeIds as readonly string[]).includes(game.id)) { expect(push).toHaveBeenCalledExactlyOnceWith({ pathname:'/arcade',params:{game:game.id} }); expect(shelf).not.toHaveBeenCalled(); }
   else { expect(shelf).toHaveBeenCalledExactlyOnceWith(game.id); expect(push).not.toHaveBeenCalled(); }
  }
 });
});
