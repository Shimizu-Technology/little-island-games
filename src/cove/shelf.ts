import type { ChallengeEntry, PackedBand } from '../challenge/types';
import type { PuzzleRef } from '../state/challenge';
import { latinRungs } from '../puzzles/latin/rungs';
import type { LatinKind } from '../puzzles/latin/core';
import { fnv1a32, validCivilDate } from '../puzzles/today';
import type { Pastel } from '../ui/theme';
import { cardFor, coveEntries, infoFor, packedOpen, shownCount, type CoveInfo, type TidePick } from './catalog';

/** Display metadata for first-class shelf variants sharing an existing Challenge registration (no separate save slot). */
const VARIANT_INFO: Record<string, CoveInfo> = {
  freecell: { name: 'FreeCell', row: 'Cards', provenance: 'Original levels, clues and pictures', role: 'All cards are face up. Plan free spaces together before moving a stack.' },
};
/** Display info for any shelf tile or Cove game (including FreeCell, which shares Solitaire's registration). */
export const tileInfoFor = (game: string): CoveInfo => VARIANT_INFO[game] ?? infoFor(game);

/**
 * The 4.0 Puzzles shelf (docs/LITTLE_ISLAND_4_DESIGN.md, Puzzles › Shelf). It shapes only the tile grid: a game that is
 * not listed here, or not registered yet, keeps every saved attempt, pin and link (Continue, `/cove?game=`, Choose a
 * puzzle all look games up in `coveEntries()`). A deferred game comes back by adding its id to a section.
 */
export const SECTIONS = [
  { id: 'numbers', title: 'Numbers', pastel: 'arcade', games: ['sudoku', 'killer', 'cage-math', 'greater-than'] },
  { id: 'words', title: 'Words', pastel: 'learn', games: ['word-search', 'crossword'] },
  { id: 'logic', title: 'Logic', pastel: 'puzzles', games: ['bridges', 'loop', 'pearl-loop', 'skyline', 'picture-grid', 'reef-sweep'] },
  { id: 'cards', title: 'Cards', pastel: 'hall', games: ['solitaire', 'freecell'] },
  { id: 'originals', title: 'Originals', pastel: 'home', games: ['slip-tide', 'canoe-seats', 'gate-crab', 'shell-scale'] },
] as const satisfies readonly { id: string; title: string; pastel: Pastel; games: readonly string[] }[];
export type SectionId = typeof SECTIONS[number]['id'];

/** Solitaire table variants kept inside the single `solitaire` Challenge registration (slots 100–109). */
export type SolitaireVariant = 'draw-1' | 'draw-3' | 'freecell';
export function matchesVariant(band: PackedBand, variant?: SolitaireVariant): boolean {
  if (!variant) return true;
  if (variant === 'freecell') return band.title.startsWith('FreeCell');
  if (variant === 'draw-1') return band.title.startsWith('Klondike draw 1');
  return band.title.startsWith('Klondike draw 3');
}
export function variantOfBand(band?: PackedBand): SolitaireVariant | undefined {
  if (!band) return undefined;
  if (band.title.startsWith('FreeCell')) return 'freecell';
  if (band.title.startsWith('Klondike draw 3')) return 'draw-3';
  if (band.title.startsWith('Klondike draw 1')) return 'draw-1';
  return undefined;
}
export function variantOfRef(entry: ChallengeEntry, ref: PuzzleRef): SolitaireVariant | undefined {
  return entry.game === 'solitaire' ? variantOfBand(entry.packed?.bands.find(b => b.bank === ref.bank)) : undefined;
}
export const variantLabel = (variant?: SolitaireVariant): string | undefined =>
  variant === 'freecell' ? 'FreeCell' : variant === 'draw-3' ? 'Draw 3' : variant === 'draw-1' ? 'Draw 1' : undefined;
/** Display game id and visible/accessible name for a paused attempt or pin (keeps `solitaire` save id intact). */
export function continueLabelFor(entry: ChallengeEntry, ref: PuzzleRef): { game: string; name: string } {
  const variant = variantOfRef(entry, ref);
  if (variant === 'freecell') return { game: 'freecell', name: tileInfoFor('freecell').name };
  if (variant === 'draw-1' || variant === 'draw-3') {
    return { game: entry.game, name: `${tileInfoFor(entry.game).name} · ${variantLabel(variant)}` };
  }
  return { game: entry.game, name: tileInfoFor(entry.game).name };
}

/** Reef Sweep stays a Challenge (`cove: false`): its tile opens the Hall's route as the current learner and is never a Cove entry. */
export const SHORTCUTS: Record<string, { name: string; route: { pathname: '/challenge'; params: { game: string } } }> = {
  'reef-sweep': { name: 'Reef Sweep', route: { pathname: '/challenge', params: { game: 'reef-sweep' } } },
};

export type ShelfTile =
  | { kind: 'cove'; id: string; name: string; entry: ChallengeEntry; variant?: SolitaireVariant }
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
    if (id === 'freecell') {
      const solitaire = entries.find(e => e.game === 'solitaire');
      return solitaire && shownCount(solitaire, hidden) && solitaire.packed?.bands.some(b => matchesVariant(b, 'freecell'))
        ? [{ kind: 'cove', id: 'freecell', name: tileInfoFor('freecell').name, entry: solitaire, variant: 'freecell' }]
        : [];
    }
    const entry = entries.find(e => e.game === id);
    if (entry) return shownCount(entry, hidden) ? [{ kind: 'cove', id, name: tileInfoFor(id).name, entry }] : [];
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
/** The tiers a game (or card variant) actually has, lowest first. */
export const tiersOf = (entry: ChallengeEntry, variant?: SolitaireVariant): number[] => {
  const bands = (entry.packed?.bands ?? []).filter(b => matchesVariant(b, variant));
  return [...new Set([...(variant ? [] : entry.puzzles.map(p => p.tier)), ...bands.map(b => b.tier)])].sort((a, b) => a - b);
};
/** The supported tier nearest the remembered band, the lower one on a tie. */
export function nearestTier(entry: ChallengeEntry, band: number, variant?: SolitaireVariant): number {
  const tiers = tiersOf(entry, variant);
  return [...tiers].sort((a, b) => Math.abs(a - band) - Math.abs(b - band) || a - b)[0] ?? band;
}
/** Preferred grown-up tier (>= 4): keeps a remembered grown-up band, otherwise starts at Master (5) or the highest available grown-up tier. */
export function grownUpTier(entry: ChallengeEntry, band: number, variant?: SolitaireVariant): number {
  const adult = tiersOf(entry, variant).filter(t => t >= 4);
  if (!adult.length) return nearestTier(entry, band, variant);
  if (band >= 4) return [...adult].sort((a, b) => Math.abs(a - band) - Math.abs(b - band) || b - a)[0];
  return adult.includes(5) ? 5 : adult.at(-1)!;
}
/** True when a shelf tile offers deep grown-up difficulty (Tier >= 4, plus Reef Sweep's Expert/Master boards). */
export function isGrownUpTile(tile: ShelfTile): boolean {
  if (tile.kind === 'cove') return tiersOf(tile.entry, tile.variant).some(t => t >= 4);
  return tile.kind === 'shortcut' && tile.id === 'reef-sweep';
}
/** Filter shelf sections to grown-up challenge puzzles, leaving empty sections out. */
export function filterGrownUpSections(sections: readonly ShelfSection[]): ShelfSection[] {
  return sections.map(s => ({ ...s, tiles: s.tiles.filter(isGrownUpTile) })).filter(s => s.tiles.length > 0);
}
/** Deterministically ordered Tier 5+ (Master / Master+) daily candidates across all eligible entries and non-empty banks. */
export function grownUpTodayPool(date: string, entries = coveEntries()): TidePick[] {
  if (!validCivilDate(date) || !entries.length) return [];
  const eligibleBands = (e: ChallengeEntry) => (e.packed?.bands ?? []).filter(b => b.tier >= 5 && b.count > 0);
  const pool = entries.filter(e => e.puzzles.some(p => p.tier >= 5) || eligibleBands(e).length > 0);
  if (!pool.length) return [];
  const startEntry = fnv1a32(`LI-COVE-GROWNUP-TODAY-V1|${date}`) % pool.length;
  const orderedEntries = [...pool.slice(startEntry), ...pool.slice(0, startEntry)];
  const picks: TidePick[] = [];
  for (const entry of orderedEntries) {
    const cards = entry.puzzles.filter(p => p.tier >= 5);
    if (cards.length) {
      const start = fnv1a32(`${date}|grownup|${entry.game}`) % cards.length;
      for (const card of [...cards.slice(start), ...cards.slice(0, start)]) {
        picks.push({ size: 'Large', entry, card, title: card.title });
      }
      continue;
    }
    const banks = eligibleBands(entry);
    if (!banks.length) continue;
    const start = fnv1a32(`${date}|grownup|${entry.game}`) % banks.length;
    for (const band of [...banks.slice(start), ...banks.slice(0, start)]) {
      picks.push({ size: 'Large', entry, card: null, bank: band.bank, title: band.title });
    }
  }
  return picks;
}
/** Date-only grown-up daily pick: strictly deals a Tier 5–6 (Master / Master+) puzzle from non-empty banks, or `undefined` if none exist. */
export function grownUpToday(date: string, entries = coveEntries()): TidePick | undefined {
  return grownUpTodayPool(date, entries)[0];
}
const latinOf = (game: string, b: PackedBand) => (latinRungs as Partial<Record<string, readonly { title: string; summary: string; size: number }[]>>)[game as LatinKind]?.find(r => r.title === b.title);
/** Accurate tier summaries for Picture Grid rungs (slots 110–113: 5×5, 8×8/10×10, 12×12, 15×15). */
const PICTURE_GRID_SUMMARIES: Readonly<Record<number, string>> = {
  1: '5×5 pictures solved straight from the row and column clues.',
  2: '8×8 and 10×10 pictures with longer runs and more gaps to place.',
  3: '12×12 pictures that combine several rounds of row and column logic.',
  4: '15×15 pictures for grown-ups: deep line deductions, no guessing.',
};
/** A bank's board size and one-line summary, from its adapter or the Latin rung list. */
export function bankFacts(entry: ChallengeEntry, b: PackedBand): { size: string; summary: string } | undefined {
  const own = packedOpen(entry)?.describe?.(b.bank);
  if (own) return own;
  const l = latinOf(entry.game, b);
  return l && { size: `${l.size}×${l.size}`, summary: l.summary };
}
/** A crisp, single-block authentic description for the chosen tier (from its first matching bank). */
export function tierSummary(entry: ChallengeEntry, tier: number, variant?: SolitaireVariant): string | undefined {
  const bands = (entry.packed?.bands ?? []).filter(b => b.tier === tier && matchesVariant(b, variant));
  for (const band of bands) {
    const summary = bankFacts(entry, band)?.summary?.trim();
    if (summary) return summary;
  }
  if (entry.game === 'picture-grid' && bands.length) {
    const fallback = PICTURE_GRID_SUMMARIES[tier];
    if (fallback) return fallback;
    const size = bankFacts(entry, bands[0])?.size;
    return size ? `${size} picture grid solved from row and column clues.` : undefined;
  }
  return undefined;
}
const GRID_SIZE = /^\d+×\d+$/, area = (size: string) => size.split('×').reduce((n, side) => n * Number(side), 1);
/** A tier's size tag: `6×6` when every bank in it has that board size, `5×5–6×6` when its board sizes differ. */
export function sizeTag(entry: ChallengeEntry, tier: number, variant?: SolitaireVariant): string | undefined {
  if (entry.game === 'solitaire') return undefined;
  const sizes = [...new Set((entry.packed?.bands ?? []).filter(b => b.tier === tier && matchesVariant(b, variant)).map(b => bankFacts(entry, b)?.size))];
  if (sizes.length === 1) return sizes[0];
  const grids = sizes.filter((s): s is string => !!s && GRID_SIZE.test(s)).sort((a, b) => area(a) - area(b));
  return grids.length === sizes.length && grids.length > 1 ? `${grids[0]}–${grids.at(-1)}` : undefined;
}
export const difficultyLabel = (entry: ChallengeEntry, tier: number, variant?: SolitaireVariant) => [difficultyWord(tier), sizeTag(entry, tier, variant)].filter(Boolean).join(' ');
export const difficultyOptionsFor = (entry: ChallengeEntry, variant?: SolitaireVariant) => tiersOf(entry, variant).map(tier => ({ key: tier, label: difficultyWord(tier), tag: sizeTag(entry, tier, variant) }));
/** The exact board size of the bank a ref came from, when it has one (`6×6`). */
const bankSize = (entry: ChallengeEntry, ref: PuzzleRef) => { const band = entry.packed?.bands.find(b => b.bank === ref.bank), size = band && bankFacts(entry, band)?.size; return size && GRID_SIZE.test(size) ? size : undefined; };
/** The difficulty of a puzzle being played, with its exact board size (`Easy 6×6`), or the tier's tag when it has none. */
export const playLabel = (entry: ChallengeEntry, ref: PuzzleRef, tier: number) => [difficultyWord(tier), bankSize(entry, ref) ?? sizeTag(entry, tier)].filter(Boolean).join(' ');
/**
 * The plain title a hosted board shows (`Hard · 9×9`, `Klondike draw 1 · Easy`), in place of its old bank title
 * (`Lagoon 1`, `Shallows 1`, `Deep Channel 3`). Refs, bank facts and saves are untouched.
 */
export function boardTitle(entry: ChallengeEntry, ref: PuzzleRef, tier: number): string {
  const band = entry.packed?.bands.find(b => b.bank === ref.bank), name = band ? plainTitle(band.title) : '', word = difficultyWord(tier);
  return [name && !DEPTH_WORD.test(name) && name !== word ? name : '', word, bankSize(entry, ref)].filter(Boolean).join(' · ');
}
/** The tier a saved ref was dealt at. */
export const tierOf = (entry: ChallengeEntry, ref: PuzzleRef) => cardFor(ref, [entry])?.tier ?? entry.packed?.bands.find(b => b.bank === ref.bank)?.tier;

const DEPTH = /^(?:Paddling|Shallows|Lagoon|Reef|Deep|Trench)$/, DEPTH_WORD = /\b(?:Paddling|Shallows|Lagoon|Reef|Deep|Trench)\b/;
/** A bank title without its old water-depth suffix (`Klondike draw 1 · Paddling` → `Klondike draw 1`). */
export const plainTitle = (title: string) => title.replace(/\s*·\s*(?:Paddling|Shallows|Lagoon|Reef|Deep|Trench)$/, '');
/** Names for the banks in one tier. Old depth-word pack names become `Set 1`, `Set 2`, … */
export function bankNames(bands: readonly PackedBand[]): string[] {
  const plain = bands.map(b => plainTitle(b.title));
  return plain.some(t => DEPTH.test(t) || !t) || new Set(plain).size < plain.length ? plain.map((_, i) => `Set ${i + 1}`) : plain;
}

const LATIN = Object.keys(latinRungs), EDGES = ['bridges', 'loop', 'pearl-loop'], TABLE = ['solitaire'], PICTURE = ['picture-grid'];
/**
 * What the HUD may send straight to an engine. A board that owns its help (`helpUI: 'board'`) hands the HUD its own
 * staged Hint and Undo through `BoardHud` instead, so nothing here can reveal or change a draft. Only a frame-help game
 * gets `controls.help()`, which records that help was asked for and changes nothing on the board.
 */
export function hudActions(entry: ChallengeEntry): { hint?: unknown } {
  return entry.helpUI === 'board' ? {} : { hint: entry.controls.help() };
}
/** Boards whose engine reset keeps the same attempt, its options and its help audit (Restart this puzzle). Word Search's `reset()` is an Undo, so it has none. */
export const engineReset = (entry: ChallengeEntry): unknown => LATIN.includes(entry.game) || EDGES.includes(entry.game) || TABLE.includes(entry.game) || PICTURE.includes(entry.game) ? entry.controls.reset() : undefined;
/** Boards that read the Mistakes choice (Friendly, Check when I ask, Rewind) live. Others leave it out of More. */
export const honorsMistakes = (entry: ChallengeEntry) => LATIN.includes(entry.game);

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
  freecell: ['All 52 cards start face up.', 'Park single cards in the four free spaces.', 'Build alternating colours down, and suits up from Ace.'],
  'word-search': ['Find every word in the grid.', 'Drag from the first letter to the last.'],
  'picture-grid': ['Numbers count filled squares in each row and column.', 'Leave a gap between separate groups.', 'Cross out squares that stay empty.'],
};
