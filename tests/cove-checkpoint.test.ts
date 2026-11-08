import { describe, expect, it } from 'vitest';
import { checkpointFacts, checkpointMove, extendsAudit, newCheckpoint, validCheckpoint, type GridRules } from '../src/puzzles/grid/checkpoint';
import { decodeGrid } from '../src/puzzles/grid/model';
const rules: GridRules = { spec: { rows: 1, columns: 1, kind: 'digits', symbols: ['1','2'], givens: [0] }, needsCheck: true, solved: s => s.values[0] === 1, hint: () => ({ type: 'write', cells: [0], value: 1 }) };
describe('checkpoint audit and engine-owned completion', () => {
  it('requires Check on the current final draft after an edit, undo, or replay', () => {
    let state = newCheckpoint(rules);
    state = checkpointMove(state, { type: 'write', cells: [0], value: 1 }, rules)!;
    expect(checkpointFacts(state, rules)?.solved).toBe(false);
    state = checkpointMove(state, { type: 'check' }, rules)!; expect(checkpointFacts(state, rules)?.solved).toBe(true);
    state = checkpointMove(state, { type: 'write', cells: [0], value: 2 }, rules)!;
    state = checkpointMove(state, { type: 'undo' }, rules)!;
    expect(checkpointFacts(state, rules)?.solved).toBe(false);
  });
  it('never erases failed checks, help or resets through ordinary undo and many edits', () => {
    const start = newCheckpoint(rules); let state = checkpointMove(start, { type: 'check' }, rules)!;
    state = checkpointMove(state, { type: 'help' }, rules)!;
    state = checkpointMove(state, { type: 'reset' }, rules)!;
    for (let i = 0; i < 1001; i++) state = checkpointMove(state, { type: 'write', cells: [0], value: i % 2 + 1 }, rules)!;
    expect(validCheckpoint(state, rules)).toBe(true); expect(checkpointFacts(state, rules)).toMatchObject({ helpUsed: true, failed: true, resets: 1 }); expect(extendsAudit(start, state)).toBe(true);
    expect(decodeGrid(state.board, rules.spec)?.edits).toBe(1003);
  });
  it('fails closed on malformed version/audit, and preserves its input', () => {
    const start = newCheckpoint(rules), raw = JSON.stringify(start);
    expect(validCheckpoint({ ...start, version: 2 }, rules)).toBe(false); expect(validCheckpoint({ ...start, audit: [['help', 0]] }, rules)).toBe(false);
    checkpointMove(start, { type: 'help' }, rules); expect(JSON.stringify(start)).toBe(raw);
  });
});

it('27 saturates audit evidence without ever refusing Check or Help', () => {
  const full: GridRules = { ...rules, spec: { rows: 9, columns: 9, kind: 'digits', symbols: ['1','2','3','4','5','6','7','8','9'], givens: Array(81).fill(0) } };
  let state = newCheckpoint(full);
  for (let i = 0; i < 1001; i++) { const before = state; state = checkpointMove(state, { type: i % 2 ? 'help' : 'check' }, full)!; expect(state).not.toBeNull(); expect(extendsAudit(before, state)).toBe(true); }
  expect(checkpointFacts(state, full)).toMatchObject({ helpUsed: true, failed: true });
  state = checkpointMove(state, { type: 'check' }, full)!; expect(checkpointFacts(state, full)?.solved).toBe(true);
});
