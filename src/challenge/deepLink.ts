import { challengeEntries } from './catalog';
import type { ChallengeEntry } from './types';
import { bankSize } from '../state/bankFacts';
import { packedOpen } from '../cove/catalog';

/** Resolve only canonical, zero-based bank rows offered by this compiled build. */
export async function resolvePuzzleLink(value: unknown, entries: readonly ChallengeEntry[] = challengeEntries) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,2}):(0|[1-9]\d{0,3})$/.test(value)) return null;
  const [bank, row] = value.split(':').map(Number);
  const entry = entries.find(e => e.catalog.banks.has(bank));
  const facts = entry?.catalog.banks.get(bank);
  if (!entry || !facts || row >= bankSize(facts)) return null;
  const inline = entry.puzzles.find(p => p.ref.bank === bank && p.ref.puzzle === row && !p.retired);
  if (inline) return { entry, card: inline };
  try {
    const ref = await packedOpen(entry)?.open?.(bank, row);
    const card = ref && entry.packed?.card(ref);
    return card && !card.retired ? { entry, card } : null;
  } catch { return null; }
}
