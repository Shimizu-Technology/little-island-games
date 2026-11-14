import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { discoverInventory, readMatrix, readScope, renderMatrix, validateMatrix } from '../scripts/qa/matrix';

const matrix = readMatrix(), scope = readScope(), inventory = discoverInventory();
const check = () => validateMatrix(matrix, scope, inventory);
const without = (id: string) => ({ ...matrix, rows: matrix.rows.filter(row => row.id !== id) });

describe('QA-25 required coverage (runs in npm test)', () => {
  it('covers the real School, Hall, Arcade, Challenge and Cove registries, all 92 planned games and all 36 mechanics', () => {
    expect(check).not.toThrow();
    expect(inventory.games.length).toBeGreaterThan(0);
    expect(inventory.challenge).toContain('drop-puzzles');
    expect(inventory.cove).toContain('crossword'); // Metadata exists before implementation.
    expect(matrix.rows.filter(row => row.group === 'games').map(row => row.games[0]).sort()).toEqual(scope.games.map(game => game.id).sort());
  });
  it.each(['G-beep-bot', 'G-bridges', 'G-crossword', 'M01', 'J34', 'P11', 'RD11', 'H-A10', 'BP-slip-tide-0'])('rejects missing coverage: %s', id => {
    expect(() => validateMatrix(without(id), scope, inventory)).toThrow(/QA matrix:/);
  });
  it.each(['games', 'challenge', 'cove', 'mechanics'] as const)('detects a new uncovered %s registration without hand-editing the existing matrix', field => {
    expect(() => validateMatrix(matrix, scope, { ...inventory, [field]: [...inventory[field], 'new-registration'] })).toThrow(/missing/);
  });
  it('rejects unknown references even when called planned, and requires planned availability for unregistered games', () => {
    const unknown = structuredClone(matrix);
    unknown.rows.find(row => row.id === 'P01')!.games = ['typo-not-a-planned-game'];
    unknown.rows.find(row => row.id === 'P01')!.availability = 'planned';
    expect(() => validateMatrix(unknown, scope, inventory)).toThrow(/unknown game/);
    const notBuilt = structuredClone(matrix);
    notBuilt.rows.find(row => row.id === 'G-sail-fold')!.availability = 'registered';
    expect(() => validateMatrix(notBuilt, scope, inventory)).toThrow(/availability drift/);
  });
  it('requires the registry mechanic mapping, not just 36 arbitrary rows', () => {
    const missing = structuredClone(matrix);
    missing.rows.find(row => row.id === 'G-sudoku')!.mechanics = [];
    expect(() => validateMatrix(missing, scope, inventory)).toThrow(/game-to-mechanic/);
    const renamed = structuredClone(matrix);
    renamed.rows.find(row => row.id === 'M01')!.title = 'unrelated input';
    expect(() => validateMatrix(renamed, scope, inventory)).toThrow(/mechanic/);
    const drift = structuredClone(matrix);
    drift.rows.find(row => row.id === 'M01')!.games = [];
    expect(() => validateMatrix(drift, scope, inventory)).toThrow(/mapping drift/);
  });
  it('rejects fabricated passes from partial or superseded evidence and requires source/device/build citations', () => {
    const inflated = structuredClone(matrix), row = inflated.rows.find(row => row.id === 'G-slip-tide')!;
    row.status = 'passed';
    expect(() => validateMatrix(inflated, scope, inventory)).toThrow(/complete current evidence/);
    row.evidence[0].coverage = 'complete'; row.evidence[0].superseded = true;
    expect(() => validateMatrix(inflated, scope, inventory)).toThrow(/complete current evidence/);
    row.status = 'not run'; row.evidence[0].sha = '';
    expect(() => validateMatrix(inflated, scope, inventory)).toThrow(/incomplete evidence/);
  });
  it('requires one row for every actual packed bank stratum, including future banks', () => {
    expect(inventory.banks.length).toBeGreaterThan(0);
    expect(() => validateMatrix(matrix, scope, { ...inventory, banks: [...inventory.banks, { game: 'sudoku', slot: 999 }] })).toThrow(/published stratum/);
  });
  it('keeps the native allocation at 245 while preserving all three mechanic dimensions and two passes', () => {
    const groups = (group: string) => matrix.rows.filter(row => row.group === group);
    expect(groups('games').length + groups('mechanics').reduce((n, row) => n + row.executionCases!, 0) + groups('journeys').length + groups('play').length).toBe(245);
    expect(matrix.passesRequired).toBe(2);
    expect(groups('bank-sampling').every(row => row.sampling?.samples.length === 5)).toBe(true);
  });
  it('keeps the human-readable matrix and summary exactly in sync with the machine source', () => {
    expect(readFileSync('docs/QA_MATRIX.md', 'utf8')).toBe(renderMatrix(matrix));
  });
});
