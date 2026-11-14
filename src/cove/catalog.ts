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
export type CoveInfo = { name: string; row: RowName; provenance: 'Original levels, clues and pictures' | null; role?: string };
const original = 'Original levels, clues and pictures' as const;
/** Metadata only: a game appears only after its real Challenge adapter is registered. */
export const gameInfo: Record<string, CoveInfo> = {
  'word-search': { name: 'Word Search', row: 'Words', provenance: original, role: 'Hunt together on the iPad, or take turns on a phone. Green solid and purple dotted trails show each hunter. There is no score.' },
  crossword: { name: 'Crossword', row: 'Words', provenance: original },
  'word-ladder': { name: 'Word Ladder', row: 'Words', provenance: original, role: 'Say the next word aloud together, then type it.' },
  sudoku: { name: 'Sudoku', row: 'Numbers', provenance: original, role: 'Spotter says where to look. Placer decides what to put there. Swap when you like.' },
  'cage-math': { name: 'Cage Math', row: 'Numbers', provenance: original, role: 'Spotter says where to look. Placer decides what to put there. Swap when you like.' },
  'greater-than': { name: 'Greater-Than Grid', row: 'Numbers', provenance: original, role: 'One person reads an arrow aloud. The other finds a number that fits it.' },
  skyline: { name: 'Skyline', row: 'Logic', provenance: original, role: 'Stand at one edge together and count the roofs you could see.' },
  killer: { name: 'Cage Sudoku', row: 'Numbers', provenance: original, role: 'One person adds up a cage. The other checks the row, column and box.' },
  'cross-sums': { name: 'Cross Sums', row: 'Numbers', provenance: original, role: 'Take turns choosing which run to work on next.' },
  'picture-grid': { name: 'Picture Grid', row: 'Logic', provenance: original, role: 'Guess the picture together before the reveal.' },
  bridges: { name: 'Bridges', row: 'Logic', provenance: original, role: 'Explain why a bridge belongs before placing it. Take turns.' },
  loop: { name: 'Loop', row: 'Logic', provenance: original, role: 'One person points at a number. The other says which sides must be lines.' },
  'pearl-loop': { name: 'Pearl Loop', row: 'Logic', provenance: original, role: 'Take turns choosing a pearl and saying which way the loop must go through it.' },
  solitaire: { name: 'Solitaire', row: 'Cards', provenance: original, role: 'One person moves the cards. The other can offer advice.' },
};
export const infoFor = (game: string): CoveInfo => gameInfo[game] ?? { name: game.replace(/(^|-)(\w)/g, (_, gap: string, c: string) => `${gap ? ' ' : ''}${c.toUpperCase()}`), row: 'Logic', provenance: null };
/** Packed banks count whole; their entries load only when one is opened. */
export const packedCount = (e: ChallengeEntry) => e.packed?.bands.reduce((n, b) => n + b.count, 0) ?? 0;
/** `packedHidden` is how many packed entries are hidden (see hiddenPackedCount); it is found lazily. */
export const shownCount = (e: ChallengeEntry, hidden: readonly string[] = [], packedHidden = 0) => e.puzzles.filter(p => !hidden.includes(p.ref.hash)).length + Math.max(0, packedCount(e) - packedHidden);
export const coveEntries = (entries: readonly ChallengeEntry[] = challengeEntries) => entries.filter(e => { if (!e.cove || !e.puzzles.length && !packedCount(e)) return false; if (!infoFor(e.game).provenance) throw new Error(`Missing Cove provenance: ${e.game}`); return true; });
export const sameRef = (a: PuzzleRef, b: PuzzleRef) => a.bank === b.bank && a.puzzle === b.puzzle && a.engine === b.engine && a.rules === b.rules && a.hash === b.hash;
export const cardFor = (ref: PuzzleRef, entries = coveEntries()) => entries.flatMap(e => e.puzzles).find(p => sameRef(p.ref, ref)) ?? entries.find(e => e.game === ref.engine)?.packed?.card(ref);
/**
 * Extras a packed registration offers: open one exact entry of a packed bank by index, describe a
 * rung, and find puzzles hidden on this device (stored by hash) so browsing, counts and dealing can skip them.
 */
export type PackedOpen = {
  open?: (bank: number, index: number) => Promise<PuzzleRef>; teaches?: (ref: PuzzleRef) => string | undefined;
  describe?: (bank: number) => { size: string; summary: string } | undefined;
  hiddenRows?: (bank: number, hidden: readonly string[]) => Promise<ReadonlySet<number>>;
  chooseVisible?: (bank: number, progress: ChallengeProgress, skip: ReadonlySet<number>, avoid?: PuzzleRef) => Promise<PuzzleRef>;
};
export const packedOpen = (e: ChallengeEntry) => (e.packed as (ChallengeEntry['packed'] & PackedOpen) | undefined);
/** Indexes of a bank's entries hidden on this device. Reads the bank only when something is hidden. */
export async function hiddenIn(entry: ChallengeEntry, bank: number, hidden: readonly string[]): Promise<ReadonlySet<number>> {
  const opener = packedOpen(entry);
  return hidden.length && opener?.hiddenRows ? opener.hiddenRows(bank, hidden) : new Set();
}
/** The next entry of a bank, never one hidden on this device unless every entry is. */
export async function dealPacked(entry: ChallengeEntry, bank: number, progress: ChallengeProgress, hidden: readonly string[] = [], avoid?: PuzzleRef): Promise<ChallengeCard | undefined> {
  const packed = entry.packed!, opener = packedOpen(entry), skip = await hiddenIn(entry, bank, hidden);
  return packed.card(skip.size && opener?.chooseVisible ? await opener.chooseVisible(bank, progress, skip, avoid) : await packed.choose(bank, progress, avoid));
}
/** How many of a packed game's entries are hidden on this device. */
export async function hiddenPackedCount(entry: ChallengeEntry, hidden: readonly string[]): Promise<number> {
  let n = 0;
  for (const b of entry.packed?.bands ?? []) n += (await hiddenIn(entry, b.bank, hidden)).size;
  return n;
}
/** The packed counterpart of `suggested`: the saved attempt (even if hidden: it is Continue), otherwise the next visible entry of a bank at or nearest this tier. */
export async function suggestedPacked(entry: ChallengeEntry, progress: ChallengeProgress, tier = 1, hidden: readonly string[] = []): Promise<ChallengeCard | undefined> {
  const packed = entry.packed;
  if (!packed?.bands.length) return undefined;
  const saved = progress.paused.find(s => s.game === entry.game && !s.result && !s.credited);
  if (saved) { await packed.prepare(saved.puzzle); return packed.card(saved.puzzle); }
  const band = [...packed.bands].sort((a, b) => Math.abs(a.tier - tier) - Math.abs(b.tier - tier) || a.tier - b.tier)[0];
  return dealPacked(entry, band.bank, progress, hidden);
}
/** Decode once per bank for an immutable render snapshot. */
export function completionLookup(progress: ChallengeProgress, entry: ChallengeEntry): (ref: PuzzleRef) => number {
  const decoded = new Map<number, number[]>();
  for (const [slot, state] of progress.banks) { const bank = entry.catalog.banks.get(slot); if (bank) decoded.set(slot, unpack(state, bankSize(bank), 3) ?? []); }
  return ref => decoded.get(ref.bank)?.[ref.puzzle] ?? 0;
}
export function completion(progress: ChallengeProgress, ref: PuzzleRef, entry: ChallengeEntry): number { return completionLookup(progress, entry)(ref); }
export const isSolved = (code: number) => code >= 2 && code <= 6;
export function suggested(entry: ChallengeEntry, progress: ChallengeProgress, tier = 1): ChallengeCard {
  const code = completionLookup(progress, entry);
  const saved = progress.paused.find(s => s.game === entry.game && !s.result && !s.credited);
  return entry.puzzles.find(p => saved && sameRef(p.ref, saved.puzzle)) ?? entry.puzzles.find(p => p.tier === tier && !isSolved(code(p.ref))) ?? entry.puzzles.find(p => p.tier === tier) ?? entry.puzzles[0];
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
export type TidePick = { size: 'Small' | 'Medium' | 'Large'; entry: ChallengeEntry; card: ChallengeCard | null; bank?: number; title: string };
/** Date-only shortcut. No expiry, played count or daily history. Monday selects gentler bands. */
export function tideTable(date: string, entries = coveEntries()): TidePick[] {
  if (!validCivilDate(date) || !entries.length) return [];
  const monday = new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
  const offset = fnv1a32(`LI-COVE-TIDE-V1|${date}`);
  const rows = [...new Set(entries.map(e => infoFor(e.game).row))];
  return (['Small', 'Medium', 'Large'] as const).flatMap((size, i): TidePick[] => {
    const row = rows[(offset + i) % rows.length], games = entries.filter(e => infoFor(e.game).row === row);
    const entry = games[fnv1a32(`${date}|${row}`) % games.length], tier = Math.min(6, (monday ? 1 : 2) + i);
    const pool = entry.puzzles.filter(p => p.tier === tier), available = pool.length ? pool : entry.puzzles;
    // A packed game offers today's bank; its next entry is dealt when the tile is opened.
    if (!available.length && entry.packed?.bands.length) {
      const banks = entry.packed.bands.filter(b => b.tier === tier), from = banks.length ? banks : entry.packed.bands, band = from[fnv1a32(`${date}|${size}|${entry.game}`) % from.length];
      return [{ size, entry, card: null, bank: band.bank, title: band.title }];
    }
    const card = available[fnv1a32(`${date}|${size}|${entry.game}`) % available.length];
    return [{ size, entry, card, title: card.title }];
  });
}
/** Solved-technique practice uses existing refs only. A template occupies at most 25%. */
export function mixedPack(entry: ChallengeEntry, progress: ChallengeProgress, metadata: (card: ChallengeCard) => { technique: string; template: string }, seed = 0, code = completionLookup(progress, entry)): ChallengeCard[] {
  const solved = entry.puzzles.filter(p => [2, 5, 6].includes(code(p.ref)));
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
