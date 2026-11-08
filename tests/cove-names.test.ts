import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { coveEntries, gameInfo, infoFor } from '../src/cove/catalog';
import { presentationFor } from '../src/cove/presentation';
describe('Cove names and source boundary', () => {
  it('checks all active registrations and presentation names in CI', () => {
    const forbidden = /\b(?:kenken|picross|jumble|wordle|shanghai|binairo|takuzu)\b/i;
    for (const info of [...Object.values(gameInfo), ...coveEntries().map(e => presentationFor(e).info)]) {
      expect(info.name).not.toMatch(forbidden); expect(info.provenance).toBe('Original levels, clues and pictures');
    }
    for (const entry of coveEntries()) expect(infoFor(entry.game).name).not.toMatch(forbidden);
  });
  it('does not move School shelves or create a second Reef Sweep save', () => {
    const screen = readFileSync('src/cove/CoveScreen.tsx', 'utf8');
    expect(screen).toContain("openGame('reef-sweep')"); expect(screen).not.toMatch(/maze|memory/);
    expect(readFileSync('src/learn/home.ts', 'utf8')).not.toContain("from '../cove/");
  });
});
