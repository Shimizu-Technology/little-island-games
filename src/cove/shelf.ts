import type { ChallengeEntry, PackedBand } from '../challenge/types';
import type { PuzzleRef } from '../state/challenge';
import { latinRungs } from '../puzzles/latin/rungs';
import type { LatinKind } from '../puzzles/latin/core';
import type { Pastel } from '../ui/theme';
import { cardFor, coveEntries, infoFor, packedOpen, shownCount } from './catalog';

/**
 * The 4.0 Puzzles shelf (docs/LITTLE_ISLAND_4_DESIGN.md, Puzzles › Shelf). It shapes only the tile grid: a game that is
 * not listed here, or not registered yet, keeps every saved attempt, pin and link (Continue, `/cove?game=`, Choose a
 * puzzle all look games up in `coveEntries()`). A deferred game comes back by adding its id to a section.
 */
export const SECTIONS = [
  { id: 'numbers', title: 'Numbers', pastel: 'arcade', games: ['sudoku', 'killer'] },
  { id: 'words', title: 'Words', pastel: 'learn', games: ['word-search', 'crossword'] },
  { id: 'logic', title: 'Logic', pastel: 'puzzles', games: ['bridges', 'loop', 'picture-grid', 'reef-sweep'] },
  { id: 'cards', title: 'Cards', pastel: 'hall', games: ['solitaire'] },
  { id: 'originals', title: 'Originals', pastel: 'home', games: ['slip-tide', 'canoe-seats', 'gate-crab', 'shell-scale'] },
] as const satisfies readonly { id: string; title: string; pastel: Pastel; games: readonly string[] }[];
export type SectionId = typeof SECTIONS[number]['id'];

/** Reef Sweep stays a Challenge (`cove: false`): its tile opens the Hall's route as the current learner and is never a Cove entry. */
export const SHORTCUTS: Record<string, { name: string; route: { pathname: '/challenge'; params: { game: string } } }> = {
  'reef-sweep': { name: 'Reef Sweep', route: { pathname: '/challenge', params: { game: 'reef-sweep' } } },
};

export type ShelfTile =
  | { kind: 'cove'; id: string; name: string; entry: ChallengeEntry }
  | { kind: 'shortcut'; id: string; name: string; route: typeof SHORTCUTS[string]['route'] }
  /** A School original (same game, same save as Learn), opened through the map's own route. */
  | { kind: 'school'; id: string; name: string };
export type ShelfSection = { id: SectionId; title: string; pastel: Pastel; tiles: ShelfTile[] };

/** Sections with only the games that exist on this build; a section with nothing to show is left out. */
export function shelfSections({ entries = coveEntries(), hidden = [], originals = [], registered }: {
  entries?: readonly ChallengeEntry[];
  hidden?: readonly string[];
  /** School games in the "originals" group, by id. */
  originals?: readonly { id: string; name: string }[];
  /** Whether a Challenge registration exists, for shortcuts. */
  registered: (game: string) => boolean;
}): ShelfSection[] {
  return SECTIONS.map(section => ({ id: section.id, title: section.title, pastel: section.pastel, tiles: section.games.flatMap((id): ShelfTile[] => {
    const entry = entries.find(e => e.game === id);
    if (entry) return shownCount(entry, hidden) ? [{ kind: 'cove', id, name: infoFor(id).name, entry }] : [];
    const shortcut = SHORTCUTS[id];
    if (shortcut) return registered(id) ? [{ kind: 'shortcut', id, name: shortcut.name, route: shortcut.route }] : [];
    const school = originals.find(g => g.id === id);
    return school ? [{ kind: 'school', id, name: school.name }] : [];
  }) })).filter(s => s.tiles.length);
}
/** Cove entries on the 4.0 shelf: Today and new suggestions draw only from these. */
export const shelfEntries = (entries: readonly ChallengeEntry[] = coveEntries()) => entries.filter(e => SECTIONS.some(s => (s.games as readonly string[]).includes(e.game)));
export const sectionOf = (game: string) => SECTIONS.find(s => (s.games as readonly string[]).includes(game));
/** The pastel a game's picture sits on; a deferred game uses the Puzzles door's. */
export const pastelFor = (game: string): Pastel => sectionOf(game)?.pastel ?? 'puzzles';

/** Tiers 1–6 as plain words, the kit's `DIFFICULTY_WORDS` (kept here so this file stays free of React Native). Presentation only: saves keep the numeric band. */
export const DIFFICULTY_WORDS = ['Easy', 'Medium', 'Hard', 'Expert', 'Master', 'Master+'] as const;
export const difficultyWord = (tier: number) => DIFFICULTY_WORDS[Math.min(DIFFICULTY_WORDS.length, Math.max(1, Math.round(tier))) - 1];
/** The tiers a game actually has, lowest first. */
export const tiersOf = (entry: ChallengeEntry): number[] => [...new Set([...entry.puzzles.map(p => p.tier), ...(entry.packed?.bands.map(b => b.tier) ?? [])])].sort((a, b) => a - b);
/** The supported tier nearest the remembered band, the lower one on a tie. */
export function nearestTier(entry: ChallengeEntry, band: number): number {
  const tiers = tiersOf(entry);
  return [...tiers].sort((a, b) => Math.abs(a - band) - Math.abs(b - band) || a - b)[0] ?? band;
}
const latinOf = (game: string, b: PackedBand) => (latinRungs as Partial<Record<string, readonly { title: string; summary: string; size: number }[]>>)[game as LatinKind]?.find(r => r.title === b.title);
/** A bank's board size and one-line summary, from its adapter or the Latin rung list. */
export function bankFacts(entry: ChallengeEntry, b: PackedBand): { size: string; summary: string } | undefined {
  const own = packedOpen(entry)?.describe?.(b.bank);
  if (own) return own;
  const l = latinOf(entry.game, b);
  return l && { size: `${l.size}×${l.size}`, summary: l.summary };
}
/** A tier's size tag (`6×6`) when every bank in it has the same board size. */
export function sizeTag(entry: ChallengeEntry, tier: number): string | undefined {
  const sizes = new Set((entry.packed?.bands ?? []).filter(b => b.tier === tier).map(b => bankFacts(entry, b)?.size));
  const [only] = [...sizes];
  return sizes.size === 1 && only ? only : undefined;
}
export const difficultyLabel = (entry: ChallengeEntry, tier: number) => [difficultyWord(tier), sizeTag(entry, tier)].filter(Boolean).join(' ');
export const difficultyOptionsFor = (entry: ChallengeEntry) => tiersOf(entry).map(tier => ({ key: tier, label: difficultyWord(tier), tag: sizeTag(entry, tier) }));
/** The tier a saved ref was dealt at. */
export const tierOf = (entry: ChallengeEntry, ref: PuzzleRef) => cardFor(ref, [entry])?.tier ?? entry.packed?.bands.find(b => b.bank === ref.bank)?.tier;

const DEPTH = /^(?:Paddling|Shallows|Lagoon|Reef|Deep|Trench)$/;
/** A bank title without its old water-depth suffix (`Klondike draw 1 · Paddling` → `Klondike draw 1`). */
export const plainTitle = (title: string) => title.replace(/\s*·\s*(?:Paddling|Shallows|Lagoon|Reef|Deep|Trench)$/, '');
/** Names for the banks in one tier. Old depth-word pack names become `Set 1`, `Set 2`, … */
export function bankNames(bands: readonly PackedBand[]): string[] {
  const plain = bands.map(b => plainTitle(b.title));
  return plain.some(t => DEPTH.test(t) || !t) || new Set(plain).size < plain.length ? plain.map((_, i) => `Set ${i + 1}`) : plain;
}

/**
 * Board actions the HUD can send for a game, per engine family. Every Cove board brings its own tool row; the HUD
 * repeats only the actions its engine already accepts: grid and edge boards take `{ type: 'undo' }` and a taught
 * `{ type: 'hint' }`; the card table takes `{ type: 'undo' }` (its hint needs a chosen card, so it stays on the table).
 */
const LATIN = Object.keys(latinRungs), EDGES = ['bridges', 'loop', 'pearl-loop'], TABLE = ['solitaire'];
export function hudActions(entry: ChallengeEntry): { undo?: unknown; hint?: unknown } {
  if (LATIN.includes(entry.game) || EDGES.includes(entry.game)) return { undo: { type: 'undo' }, hint: { type: 'hint' } };
  if (TABLE.includes(entry.game)) return { undo: { type: 'undo' } };
  return entry.helpUI === 'board' ? {} : { hint: entry.controls.help() };
}

/** Picture tips for How to play: a few words each, never a paragraph. */
export const TIPS: Record<string, readonly string[]> = {
  sudoku: ['Each row holds every number once.', 'Each column too.', 'And each box.'],
  killer: ['Numbers in a cage add up to its sum.', 'No number twice in a cage.', 'Rows, columns and boxes as Sudoku.'],
  'cage-math': ['Each cage makes its number.', 'No number twice in a row or column.'],
  'greater-than': ['Arrows point to the smaller number.', 'No number twice in a row or column.'],
  skyline: ['Taller roofs hide shorter ones.', 'Edge numbers count the roofs you see.'],
  bridges: ['Each island needs its number of bridges.', 'Bridges never cross.', 'Every island joins up.'],
  loop: ['Draw one loop with no ends.', 'A number counts the lines around it.'],
  'pearl-loop': ['Draw one loop through every pearl.', 'Turn on black pearls.', 'Go straight through white pearls.'],
  solitaire: ['Build down, red on black.', 'Move kings to empty spaces.', 'Put every card home, ace first.'],
  'word-search': ['Find every word in the grid.', 'Drag from the first letter to the last.'],
};
