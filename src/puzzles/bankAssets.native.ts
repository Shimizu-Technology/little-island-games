import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { puzzleAssets } from '../content/puzzles/assets.generated';
import type { BankTransport } from './loader';
export const bankTransport: BankTransport = {
  async read(name) {
    const load = puzzleAssets[name];
    if (!load) throw new Error(`Unknown puzzle asset ${name}.`);
    const asset = Asset.fromModule(load());
    await asset.downloadAsync();
    return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
  },
};
