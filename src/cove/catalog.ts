import type { ChallengeEntry, ChallengeCard } from '../challenge/types';
import { challengeEntries } from '../challenge/catalog';
import { bankSize } from '../state/bankFacts';
import { unpack } from '../state/saveBits';
import type { ChallengeProgress, PuzzleRef } from '../state/challenge';
import { fnv1a32, validCivilDate } from '../puzzles/today';

export const bands = ['Paddling', 'Shallows', 'Lagoon', 'Reef', 'Deep', 'Trench'] as const;
export const readers = ['Little', 'Growing', 'Strong', 'Grown-up'] as const;
export type Reader = typeof readers[number];
export const rowNames = ['Words', 'Numbers', 'Logic', 'Cards', 'Island originals'] as const;
export type RowName = typeof rowNames[number];
export type CoveInfo = { name: string; row: RowName; provenance: 'Original levels, clues and pictures'; role?: string };
const original = 'Original levels, clues and pictures' as const;
/** Metadata only: a game appears only after its real Challenge adapter is registered. */
export const gameInfo: Record<string, CoveInfo> = {
  'word-search': { name: 'Word Search', row: 'Words', provenance: original },
  crossword: { name: 'Crossword', row: 'Words', provenance: original },
  'word-ladder': { name: 'Word Ladder', row: 'Words', provenance: original, role: 'Say the next word aloud together, then type it.' },
  sudoku: { name: 'Sudoku', row: 'Numbers', provenance: original, role: 'Spotter says where to look. Placer decides what to put there. Swap when you like.' },
  'cage-math': { name: 'Cage Math', row: 'Numbers', provenance: original, role: 'Spotter says where to look. Placer decides what to put there. Swap when you like.' },
  'picture-grid': { name: 'Picture Grid', row: 'Logic', provenance: original, role: 'Guess the picture together before the reveal.' },
  bridges: { name: 'Bridges', row: 'Logic', provenance: original, role: 'Explain why a bridge belongs before placing it. Take turns.' },
  solitaire: { name: 'Solitaire', row: 'Cards', provenance: original, role: 'One person moves the cards. The other can offer advice.' },
};
export const infoFor = (game: string): CoveInfo => gameInfo[game] ?? { name: game.replace(/(^|-)(\w)/g, (_, gap: string, c: string) => `${gap ? ' ' : ''}${c.toUpperCase()}`), row: 'Logic', provenance: original };
export const coveEntries = (entries: readonly ChallengeEntry[] = challengeEntries) => entries.filter(e => e.cove && e.puzzles.length);
export const sameRef = (a: PuzzleRef, b: PuzzleRef) => a.bank === b.bank && a.puzzle === b.puzzle && a.engine === b.engine && a.rules === b.rules && a.hash === b.hash;
export const cardFor = (ref: PuzzleRef, entries = coveEntries()) => entries.flatMap(e => e.puzzles).find(p => sameRef(p.ref, ref));
export function completion(progress: ChallengeProgress, ref: PuzzleRef, entry: ChallengeEntry): number {
  const row = progress.banks.find(b => b[0] === ref.bank), bank = entry.catalog.banks.get(ref.bank);
  return row && bank ? unpack(row[1], bankSize(bank), 3)?.[ref.puzzle] ?? 0 : 0;
}
export const isSolved = (code: number) => code >= 2 && code <= 6;
export function suggested(entry: ChallengeEntry, progress: ChallengeProgress, tier = 1): ChallengeCard {
  const saved = progress.paused.find(s => s.game === entry.game && !s.result && !s.credited);
  return entry.puzzles.find(p => saved && sameRef(p.ref, saved.puzzle)) ?? entry.puzzles.find(p => p.tier === tier && !isSolved(completion(progress, p.ref, entry))) ?? entry.puzzles.find(p => p.tier === tier) ?? entry.puzzles[0];
}
/** Preserve immutable refs. A small final pack is combined with its predecessor when possible. */
export function packsFor(cards: readonly ChallengeCard[], size = 24): ChallengeCard[][] {
  if (!Number.isInteger(size) || size < 16 || size > 32) throw new Error('Cove packs contain 16–32 puzzles.');
  const packs: ChallengeCard[][] = [];
  for (let i = 0; i < cards.length; i += size) packs.push(cards.slice(i, i + size));
  if (packs.length > 1 && packs.at(-1)!.length < 16) {
    const last = packs.pop()!, previous = packs.pop()!, combined = [...previous, ...last];
    if (combined.length <= 32) packs.push(combined);
    else { const middle = Math.ceil(combined.length / 2); packs.push(combined.slice(0, middle), combined.slice(middle)); }
  }
  return packs;
}
export type TidePick = { size: 'Small' | 'Medium' | 'Large'; entry: ChallengeEntry; card: ChallengeCard };
/** Date-only shortcut. No expiry, played count or daily history. Monday selects gentler bands. */
export function tideTable(date: string, entries = coveEntries()): TidePick[] {
  if (!validCivilDate(date) || !entries.length) return [];
  const monday = new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
  const offset = fnv1a32(`LI-COVE-TIDE-V1|${date}`);
  return (['Small', 'Medium', 'Large'] as const).flatMap((size, i) => {
    const entry = entries[(offset + i) % entries.length], tier = Math.min(6, (monday ? 1 : 2) + i);
    const pool = entry.puzzles.filter(p => p.tier === tier), available = pool.length ? pool : entry.puzzles;
    return [{ size, entry, card: available[fnv1a32(`${date}|${size}|${entry.game}`) % available.length] }];
  });
}
/** Solved-technique practice uses existing refs only. A template occupies at most 25%. */
export function mixedPack(entry: ChallengeEntry, progress: ChallengeProgress, metadata: (card: ChallengeCard) => { technique: string; template: string }, seed = 0): ChallengeCard[] {
  const solved = entry.puzzles.filter(p => isSolved(completion(progress, p.ref, entry)));
  if (new Set(solved.map(p => metadata(p).technique)).size < 2) return [];
  const sorted = [...solved].sort((a, b) => fnv1a32(`${seed}|${a.ref.hash}`) - fnv1a32(`${seed}|${b.ref.hash}`));
  const byTemplate = new Map<string, ChallengeCard[]>();
  for (const p of sorted) { const key = metadata(p).template; byTemplate.set(key, [...(byTemplate.get(key) ?? []), p]); }
  if (byTemplate.size < 4) return [];
  const groups = [...byTemplate.values()], per = Math.min(8, ...groups.map(g => g.length));
  const result: ChallengeCard[] = [];
  for (let i = 0; i < per; i++) for (const group of groups) { if (result.length < 32) result.push(group[i]); }
  // Truncation could skew the last round; keep only complete rounds.
  return result.slice(0, Math.floor(result.length / groups.length) * groups.length);
}
