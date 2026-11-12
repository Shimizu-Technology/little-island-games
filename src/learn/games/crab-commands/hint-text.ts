import type { Command } from './engine';
import type { Hint } from './challenge-engine';
/** One repair step in words: change, insert before, add at the end, or remove. */
export function hintText(hint: Hint, length: number, label: Record<Command, string>, after = 'Keep the other cards.') {
  const edit = hint.edit;
  if (!edit) return hint.plan.length ? 'Your plan reaches home. Press Go to try it.' : 'No plan reaches home from here. Try Reset plan.';
  if (edit.op === 'remove') return `Remove card ${edit.at + 1}. ${after}`;
  if (edit.op === 'insert' && edit.at >= length) return `Add card ${edit.at + 1}: ${label[edit.card!]}. ${after}`;
  if (edit.op === 'insert') return `Insert before card ${edit.at + 1}: ${label[edit.card!]}. ${after}`;
  return `Change card ${edit.at + 1}: ${label[edit.card!]}. ${after}`;
}
