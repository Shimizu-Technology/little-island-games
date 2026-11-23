import { exactKeys, plain, uint } from '../../../state/saveBits';
import { runPython } from './python';
import type { LabProgram } from './content';
/** Every state-changing action is small; after 96 edits only progress toward a solution is accepted.
 * At most 4 further edits, 101 distinct checks, 3 Helps and 4 prediction picks can then finish.
 * This is an engine invariant, independent of the host's 500-action ordinary-edit ceiling.
 */
export const FREE_EDITS = 96;
export type Action = ['e', number, number] | ['p', number] | ['h', 1 | 2 | 3] | ['c'] | ['u'] | ['z'];
export type Attempt = { picks: number[]; undo: number[][]; prediction: number | null; wrong: number[]; checked: number[]; edits: number; help: number; won: boolean; runs: number; failed: boolean };
export const initialAttempt = (d: LabProgram): Attempt => ({ picks: d.slots.map(() => -1), undo: [], prediction: null, wrong: [], checked: [], edits: 0, help: 0, won: false, runs: 0, failed: false });
export const sourceFor = (d: LabProgram, picks: readonly number[]): string[] => d.lines.map((line, i) => { const slot = d.slots.findIndex(s => s.line === i); if (slot < 0) return line; const s = d.slots[slot]; return s.before + (picks[slot] < 0 ? '□' : s.choices[picks[slot]]) + s.after; });
export const ready = (s: Attempt, d: LabProgram) => d.mode === 'predict' ? s.prediction !== null : s.picks.every(i => i >= 0);
const key = (picks: readonly number[]) => picks.reduce((n, v) => n * 4 + v + 1, 0);
const checkedProofs = new WeakMap<LabProgram, Map<number, boolean>>();
export function solves(d: LabProgram, picks: readonly number[]): boolean {
  if (picks.length !== d.slots.length || picks.some((i, slot) => !Number.isInteger(i) || i < 0 || i >= d.slots[slot].choices.length)) return false;
  const signature = key(picks), proofs = checkedProofs.get(d) ?? new Map<number, boolean>();
  checkedProofs.set(d, proofs);
  if (proofs.has(signature)) return proofs.get(signature)!;
  const r = runPython(sourceFor(d, picks));
  const correct = !r.error && r.output.join('\n') === d.output && JSON.stringify(r.returned) === JSON.stringify(d.returned);
  proofs.set(signature, correct); return correct;
}
/** The saved check key is a base-four draft with no empty digits. */
function checkedPicks(signature: number, d: LabProgram): number[] | null {
  const picks = d.slots.map(() => 0);
  for (let i = picks.length - 1; i >= 0; i--) { picks[i] = signature % 4 - 1; signature = Math.floor(signature / 4); }
  return signature === 0 && picks.every((v, i) => v >= 0 && v < d.slots[i].choices.length) ? picks : null;
}

const cache = new WeakMap<LabProgram, number[][]>();
export function solutions(d: LabProgram): readonly number[][] {
  let rows = cache.get(d);
  if (!rows) {
    rows = [];
    const visit = (prefix: number[]) => { if (prefix.length === d.slots.length) { if (solves(d, prefix)) rows!.push(prefix); return; } for (let i = 0; i < d.slots[prefix.length].choices.length; i++) visit([...prefix, i]); };
    visit([]); cache.set(d, rows);
  }
  return rows;
}
/** Hamming distance is the exact minimum number of token taps, among all engine-proven solutions. */
export function nearest(d: LabProgram, picks: readonly number[]): { distance: number; winner: readonly number[]; slot: number } {
  let winner: readonly number[] = d.slots.map(s => s.answer), distance = Infinity;
  for (const candidate of solutions(d)) { const n = candidate.filter((v, i) => v !== picks[i]).length; if (n < distance) { winner = candidate; distance = n; } }
  return { distance, winner, slot: winner.findIndex((v, i) => v !== picks[i]) };
}
export function hint(d: LabProgram, s: Attempt): string {
  const proof = runPython(d.lines);
  if (d.mode === 'predict') {
    if (s.help === 1) return `Follow ${d.idea.toLowerCase()}. There are ${proof.output.length} printed ${proof.output.length === 1 ? 'line' : 'lines'}.`;
    if (s.help === 2) { const first = proof.trace.find(f => f.output.length); return first ? `Line ${first.line + 1} prints ${first.output[0]}. Keep following the values.` : 'The program prints nothing.'; }
    return `The trace prints:\n${proof.output.join('\n')}`;
  }
  const near = nearest(d, s.picks);
  if (!near.distance) return 'Your program matches the goal. Run code when you are ready.';
  const slot = d.slots[near.slot];
  if (s.help === 1) return `Your program is ${near.distance} ${near.distance === 1 ? 'change' : 'changes'} from a working plan. Look at line ${slot.line + 1}.`;
  if (s.help === 2) return `On line ${slot.line + 1}, try ${slot.choices[near.winner[near.slot]]}.`;
  return `One working plan:\n${sourceFor(d, near.winner).join('\n')}`;
}
export function validAction(v: unknown): v is Action {
  return Array.isArray(v) && Object.keys(v).length === v.length && (v[0] === 'e' ? v.length === 3 && uint(v[1], 3) && Number.isInteger(v[2]) && v[2] >= -1 && v[2] <= 2 : v[0] === 'p' ? v.length === 2 && uint(v[1], 3) : v[0] === 'h' ? v.length === 2 && [1, 2, 3].includes(v[1]) : v.length === 1 && ['c', 'u', 'z'].includes(v[0]));
}
export function step(s: Attempt, a: Action, d: LabProgram): Attempt | null {
  if (s.won) return null;
  if (a[0] === 'h') return a[1] <= s.help ? null : { ...s, help: a[1] };
  if (a[0] === 'p') return d.mode !== 'predict' || s.prediction === a[1] || s.wrong.includes(a[1]) || s.edits >= FREE_EDITS && a[1] !== d.answer ? null : { ...s, prediction: a[1], edits: s.edits + 1, help: s.edits + 1 >= FREE_EDITS ? Math.max(1, s.help) : s.help };
  if (a[0] === 'c') {
    if (!ready(s, d)) return null;
    const signature = d.mode === 'predict' ? s.prediction! : key(s.picks);
    if (s.checked.includes(signature)) return null;
    const won = d.mode === 'predict' ? s.prediction === d.answer : solves(d, s.picks);
    return { ...s, checked: [...s.checked, signature], won, runs: s.runs + 1, failed: s.failed || !won, wrong: d.mode === 'predict' && !won ? [...s.wrong, s.prediction!] : s.wrong, prediction: d.mode === 'predict' && !won ? null : s.prediction };
  }
  if (d.mode !== 'build') return null;
  let picks: number[], undo: number[][];
  if (a[0] === 'e') {
    if (a[1] >= d.slots.length || a[2] >= d.slots[a[1]].choices.length || s.picks[a[1]] === a[2]) return null;
    picks = s.picks.map((v, i) => i === a[1] ? a[2] : v); undo = [...s.undo.slice(-15), [...s.picks]];
  } else if (a[0] === 'u') { if (!s.undo.length) return null; picks = [...s.undo.at(-1)!]; undo = s.undo.slice(0, -1); }
  else if (a[0] === 'z') { if (s.picks.every(i => i === -1)) return null; picks = d.slots.map(() => -1); undo = [...s.undo.slice(-15), [...s.picks]]; }
  else return null;
  if (s.edits >= FREE_EDITS && nearest(d, picks).distance >= nearest(d, s.picks).distance) return null;
  return { ...s, picks, undo, edits: s.edits + 1, help: s.edits + 1 >= FREE_EDITS ? Math.max(1, s.help) : s.help };
}
export function validAttempt(v: unknown, d: LabProgram): v is Attempt {
  if (!plain(v) || !exactKeys(v, ['picks', 'undo', 'prediction', 'wrong', 'checked', 'edits', 'help', 'won', 'runs', 'failed'])) return false;
  const picks = (p: unknown): p is number[] => Array.isArray(p) && p.length === d.slots.length && p.every((n, i) => Number.isInteger(n) && n >= -1 && n < d.slots[i].choices.length);
  const nums = (p: unknown, max: number, length: number) => Array.isArray(p) && p.length <= length && new Set(p).size === p.length && p.every(n => uint(n, max));
  if (!picks(v.picks) || !Array.isArray(v.undo) || v.undo.length > 16 || !v.undo.every(picks) || !(v.prediction === null || uint(v.prediction, 3)) || !nums(v.wrong, 3, 3) || !nums(v.checked, 255, 104) || !uint(v.edits, 100) || !uint(v.help, 3) || !uint(v.runs, 104) || v.runs !== (v.checked as unknown[]).length || typeof v.won !== 'boolean' || typeof v.failed !== 'boolean') return false;
  const s = v as Attempt;
  if (s.edits >= FREE_EDITS && s.help === 0) return false;
  if (d.mode === 'predict') {
    if (s.undo.length || s.picks.some(i => i !== -1) || s.prediction !== null && s.wrong.includes(s.prediction) || s.checked.some(i => i > 3) || s.edits < s.runs) return false;
    const wrong = s.checked.filter(i => i !== d.answer), at = s.checked.indexOf(d.answer);
    return JSON.stringify(wrong) === JSON.stringify(s.wrong) && s.failed === (wrong.length > 0)
      && (s.won ? at === s.checked.length - 1 && at >= 0 && s.prediction === d.answer : at < 0);
  }
  if (s.prediction !== null || s.wrong.length) return false;
  const checks: boolean[] = [];
  for (const signature of s.checked) { const picks = checkedPicks(signature, d); if (!picks) return false; checks.push(solves(d, picks)); }
  const at = checks.indexOf(true);
  return s.failed === checks.includes(false) && (s.won ? at >= 0 && at === checks.length - 1 && s.checked.at(-1) === key(s.picks) && solves(d, s.picks) : at < 0);
}
