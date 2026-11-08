import { exactKeys, plain, uint } from '../../state/saveBits';
import { createGrid, decodeGrid, encodeGrid, gridAction, type GridAction, type GridSpec, type GridState, type PackedGrid } from './model';
export type GridEvent = GridAction | { type: 'check' } | { type: 'help' } | { type: 'reset' };
export type AuditKind = 'help' | 'check-ok' | 'check-miss' | 'reset';
export type GridCheckpoint = { version: 1; board: PackedGrid; checked: number | null; audit: [AuditKind, number][] };
export type GridRules = {
  spec: GridSpec;
  /** These callbacks must come from the adapter's pure engine. */
  solved: (state: GridState) => boolean;
  hint: (state: GridState) => GridAction | null;
  needsCheck: boolean;
};
export function isGridEvent(value: unknown, spec: GridSpec): value is GridEvent {
  if (!plain(value) || typeof value.type !== 'string') return false;
  if (['check', 'help', 'reset', 'undo', 'redo', 'pencil'].includes(value.type)) return exactKeys(value, ['type']);
  if (value.type === 'select') return exactKeys(value, ['type', 'cell']) && uint(value.cell, spec.rows * spec.columns - 1);
  if (value.type === 'tool') return exactKeys(value, ['type', 'value']) && uint(value.value, spec.symbols.length);
  return value.type === 'write' && (exactKeys(value, ['type', 'cells', 'value']) || exactKeys(value, ['type', 'cells', 'value', 'selected']) && uint(value.selected, spec.rows * spec.columns - 1)) && uint(value.value, spec.symbols.length) && Array.isArray(value.cells) && value.cells.length > 0 && value.cells.length <= spec.rows * spec.columns && value.cells.every(i => uint(i, spec.rows * spec.columns - 1));
}
export const newCheckpoint = (rules: GridRules): GridCheckpoint => ({ version: 1, board: encodeGrid(createGrid(rules.spec), rules.spec), checked: null, audit: [] });
const auditKinds = ['help', 'check-ok', 'check-miss', 'reset'];
export function validCheckpoint(value: unknown, rules: GridRules): value is GridCheckpoint {
  return plain(value) && exactKeys(value, ['version', 'board', 'checked', 'audit']) && value.version === 1 && (value.checked === null || uint(value.checked, 2147483647)) && decodeGrid(value.board, rules.spec) !== null && Array.isArray(value.audit) && value.audit.every((event, i, all) => Array.isArray(event) && event.length === 2 && auditKinds.includes(event[0]) && uint(event[1], 2147483647) && event[1] > 0 && (!i || all[i - 1][0] !== event[0])) && JSON.stringify(value).length <= 3400;
}
function append(audit: GridCheckpoint['audit'], kind: AuditKind): GridCheckpoint['audit'] {
  // Keep counts of every event after the ordered prefix reaches its bounded budget.
  if (audit.length >= 64) return auditKinds.flatMap(k => { const count = audit.filter(e => e[0] === k).reduce((sum, e) => sum + e[1], 0) + (k === kind ? 1 : 0); return count ? [[k as AuditKind, Math.min(2147483647, count)] as [AuditKind, number]] : []; });
  const last = audit.at(-1);
  return last?.[0] === kind ? [...audit.slice(0, -1), [kind, Math.min(2147483647, last[1] + 1)]] : [...audit, [kind, 1]];
}
/** No Check/help/reset event is undone or pruned when the bounded undo buffer fills. */
export function checkpointMove(before: GridCheckpoint, action: GridEvent, rules: GridRules): GridCheckpoint | null {
  if (!isGridEvent(action, rules.spec) || !validCheckpoint(before, rules)) return null;
  const state = decodeGrid(before.board, rules.spec)!; let board = state, audit = before.audit;
  if (action.type === 'check') audit = append(audit, rules.solved(state) ? 'check-ok' : 'check-miss');
  else if (action.type === 'help') { const hint = rules.hint(state); if (!hint) return before; audit = append(audit, 'help'); board = gridAction(state, hint, rules.spec); }
  else if (action.type === 'reset') { audit = append(audit, 'reset'); board = { ...createGrid(rules.spec), edits: state.edits + 1 }; }
  else board = gridAction(state, action, rules.spec);
  if (board === state && audit === before.audit) return before;
  try {
    const budget = Math.min(3000, 3300 - JSON.stringify(audit).length), next: GridCheckpoint = { version: 1, board: encodeGrid(board, rules.spec, budget), checked: action.type === 'check' && rules.solved(state) ? state.edits : board.edits === state.edits ? before.checked : null, audit };
    return validCheckpoint(next, rules) ? next : null;
  } catch { return null; }
}
export function checkpointFacts(checkpoint: GridCheckpoint, rules: GridRules) {
  const state = decodeGrid(checkpoint.board, rules.spec);
  if (!state || !validCheckpoint(checkpoint, rules)) return null;
  const count = (kind: AuditKind) => checkpoint.audit.filter(e => e[0] === kind).reduce((sum, e) => sum + e[1], 0);
  return { solved: rules.solved(state) && (!rules.needsCheck || checkpoint.checked === state.edits && count('check-ok') > 0), helpUsed: count('help') > 0, failed: count('check-miss') > 0, checks: count('check-ok') + count('check-miss'), resets: count('reset'), edits: state.edits };
}
/** Useful to exact codecs when recovering a later coalesced checkpoint after a crash. */
export function extendsAudit(before: GridCheckpoint, after: GridCheckpoint): boolean {
  return auditKinds.every(kind => { const count = (c: GridCheckpoint) => c.audit.filter(e => e[0] === kind).reduce((n, e) => n + e[1], 0); return count(after) >= count(before); });
}
