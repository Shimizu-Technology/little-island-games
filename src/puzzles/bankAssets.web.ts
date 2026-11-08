import { Asset } from 'expo-asset';
import { puzzleAssets } from '../content/puzzles/assets.generated';
import type { BankTransport } from './loader';
export const bankTransport: BankTransport = {
  async read(name) {
    const load = puzzleAssets[name];
    if (!load) throw new Error(`Unknown puzzle asset ${name}.`);
    const response = await fetch(Asset.fromModule(load()).uri);
    if (!response.ok) throw new Error(`Puzzle asset ${name} returned ${response.status}.`);
    return response.text();
  },
};
