import type { Technique } from './solver';

/**
 * The Bridges ladder. One rung is one packed bank (one save slot). `min`/`max` bound the hardest idea
 * a board needs; `needs` asks that the idea is really used, so a rung teaches what it says.
 */
export type BridgesRung = {
  id: string; tier: 1 | 2 | 3 | 4 | 5 | 6; width: number; height: number; islands: [number, number];
  title: string; summary: string; min: Technique; max: Technique; needs?: Technique; trials?: number;
};
const r = (id: string, tier: BridgesRung['tier'], width: number, height: number, islands: [number, number], title: string, summary: string, min: Technique, max: Technique, needs?: Technique, trials?: number): BridgesRung =>
  ({ id, tier, width, height, islands, title, summary, min, max, ...(needs ? { needs } : {}), ...(trials ? { trials } : {}) });
export const bridgesRungs: readonly BridgesRung[] = [
  r('ripple', 1, 5, 5, [5, 7], 'Ripple', 'A few islands. Some numbers can only be filled one way.', 'full', 'full'),
  r('shallows', 1, 6, 6, [7, 10], 'Shallows', 'More islands, still filled one island at a time.', 'full', 'full'),
  r('stepping', 2, 7, 7, [9, 13], 'Stepping Stones', 'Big numbers must reach every neighbour at least once.', 'must-reach', 'must-reach', 'must-reach'),
  r('sandbar', 3, 7, 8, [11, 15], 'Sandbar', 'Don’t close off a little group of islands from the rest.', 'isolation', 'isolation', 'isolation'),
  r('archipelago', 4, 9, 11, [20, 30], 'Archipelago', 'Big maps that use every idea so far, with no guessing.', 'isolation', 'way-out', 'isolation'),
  r('atoll', 5, 8, 10, [16, 24], 'Atoll', 'Think ahead: if this were a double bridge, could that island still be finished?', 'what-if', 'what-if', 'what-if'),
  r('channel', 6, 10, 12, [26, 38], 'Deep Channel', 'Grown-up maps. Follow one bridge through every rule until something breaks.', 'chain', 'chain', 'chain', 2),
];
export const bridgesRungFor = (band: string) => bridgesRungs.find(x => x.id === band);
