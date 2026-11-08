import { describe, expect, it } from 'vitest';
import { acceptTouch, createGrid, decodeGrid, encodeGrid, gridAction, gridGeometry, moveSelection, nearestCell, nearestEdge, paintLine, type GridSpec } from '../src/puzzles/grid/model';
const spec = (size: number, kind: GridSpec['kind'] = 'digits'): GridSpec => ({ rows: size, columns: size, symbols: kind === 'digits' ? ['1','2','3','4','5','6','7','8','9'] : ['Fill','×'], givens: Array(size * size).fill(0), kind });
describe('shared grid input and checkpoint draft', () => {
  it('keeps givens immutable, toggles compact notes and undoes/redoes a whole decision', () => {
    const grid = spec(9); grid.givens = [1, ...Array(80).fill(0)]; let state = createGrid(grid);
    expect(gridAction(state, { type: 'write', cells: [0], value: 2 }, grid)).toBe(state);
    state = gridAction(state, { type: 'pencil' }, grid); state = gridAction(state, { type: 'write', cells: [1], value: 9 }, grid);
    expect(state.notes[1]).toBe(256); expect(state.values[1]).toBe(0);
    const undo = gridAction(state, { type: 'undo' }, grid); expect(undo.notes[1]).toBe(0); expect(gridAction(undo, { type: 'redo' }, grid).notes).toEqual(state.notes);
    expect(decodeGrid(encodeGrid(undo, grid), grid)).toEqual(undo);
  });
  it.each([9, 15, 16, 25])('round-trips maximum %sx%s grids; 1001 paint strokes never refuse an edit', size => {
    const grid = spec(size, size === 9 ? 'digits' : 'paint'); let state = createGrid(grid);
    for (let i = 0; i < 1001; i++) { const next = gridAction(state, { type: 'write', cells: [i % (size * size)], value: i % 2 + 1 }, grid); if (next !== state) state = next; }
    const encoded = encodeGrid(state, grid), decoded = decodeGrid(encoded, grid); expect(decoded?.values).toEqual(state.values); expect(decoded?.edits).toBe(state.edits);
    expect(JSON.stringify(encoded).length).toBeLessThanOrEqual(3000);
    const undone = gridAction(decoded!, { type: 'undo' }, grid); expect(undone).not.toBe(decoded);
  });
  it('stores a full 9x9 board of nine candidates in compact per-cell fields', () => {
    const grid = spec(9); const state = { ...createGrid(grid), notes: Array(81).fill(511) };
    const encoded = encodeGrid(state, grid); expect(JSON.stringify(encoded).length).toBeLessThan(350); expect(decodeGrid(encoded, grid)).toEqual(state);
  });
  it('rejects malformed drafts, unknown fields, forged history, changed givens and bad notes', () => {
    const grid = spec(4), state = createGrid(grid), packed = encodeGrid(state, grid);
    expect(decodeGrid({ ...packed, owner: 'another' }, grid)).toBeNull(); expect(decodeGrid({ ...packed, version: 2 }, grid)).toBeNull(); expect(decodeGrid({ ...packed, undo: ['bad'] }, grid)).toBeNull();
    const changed = gridAction(state, { type: 'write', cells: [0], value: 1 }, grid), forged = { ...changed, values: [2, ...changed.values.slice(1)] };
    expect(decodeGrid(encodeGrid(forged, grid), grid)).toBeNull();
    const given = { ...grid, givens: [1, ...Array(15).fill(0)] }; expect(decodeGrid(packed, given)).toBeNull();
  });
  it('removes redo on a new edit and preserves the input object', () => {
    const grid = spec(4), original = createGrid(grid), before = JSON.stringify(original);
    const changed = gridAction(original, { type: 'write', cells: [1], value: 2 }, grid), undo = gridAction(changed, { type: 'undo' }, grid);
    expect(gridAction(undo, { type: 'write', cells: [3], value: 4 }, grid).redo).toEqual([]); expect(JSON.stringify(original)).toBe(before);
  });
  it('hits the nearest cell and edge including borders, locks paint axis and fills fast gaps', () => {
    expect(nearestCell(-5, -8, 40, spec(9))).toBe(0); expect(nearestCell(999, 999, 40, spec(9))).toBe(80); expect(nearestCell(39.9, 40, 40, spec(9))).toBe(9);
    expect(nearestEdge(400, 400, 40, 10, 10)).toEqual({ axis: 'h', row: 10, column: 9 });
    expect(paintLine(0, 4, 5, null)).toEqual({ axis: 'row', cells: [0,1,2,3,4] }); expect(paintLine(0, 24, 5, 'column')).toEqual({ axis: 'column', cells: [0,5,10,15,20] });
    expect(moveSelection(8, 'ArrowRight', spec(9))).toBe(8); expect(moveSelection(80, 'ArrowDown', spec(9))).toBe(80);
  });
  it('suppresses repeat state-changing touches only and requires zoom beyond comfortable fit', () => {
    expect(acceptTouch({ cell: 4, at: 1000 }, 4, 1100, true)).toBe(false); expect(acceptTouch({ cell: 4, at: 1000 }, 4, 1200, true)).toBe(true); expect(acceptTouch({ cell: 4, at: 1000 }, 4, 1100, false)).toBe(true);
    expect(gridGeometry(350, 400, spec(25), false).needsZoom).toBe(true); expect(gridGeometry(350, 400, spec(25), true).cell).toBeGreaterThanOrEqual(44);
    expect(gridGeometry(704, 620, spec(9), false).needsZoom).toBe(false);
  });
});
