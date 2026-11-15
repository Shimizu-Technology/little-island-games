import type { StepId } from "./scope";

/** Tiles that sound alike are never offered against each other, so a wrong tile is really wrong. */
export const TILE_TWINS: readonly (readonly string[])[] = [
  ["c", "k", "ck"],
  ["ee", "ea"],
  ["ai", "a_e"],
  ["oa", "o_e"],
  ["s", "ss", "z"],
  ["l", "ll"],
  ["oo", "u"],
];
/** Look-alike tiles, by kind. A wrong tile always comes from the same family as the right one. */
export const TILE_FAMILIES: readonly (readonly string[])[] = [
  ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "x", "z"],
  ["a", "e", "i", "o", "u"],
  ["sh", "ch", "th", "ck", "ng", "ll"],
  ["a_e", "i_e", "o_e"],
  ["ee", "ea", "ai", "oa", "oo", "ar", "or"],
];
const vowels = new Set(["a", "e", "i", "o", "u"]);
const teams = new Set(["ee", "ea", "ai", "oa", "oo"]);
const silentE = /^[aiou]_e$/;
/** How a tile is written on screen: a silent-e vowel shows just its vowel (the e already sits at the end). */
export const tileLabel = (tile: string) => tile.replace(/_e$/, "");
export const isSilentETile = (tile: string) => silentE.test(tile);
const isConsonantTile = (t: string) => /^[bcdfghjklmnpqrstvwxyz]$/.test(t);
/** The word a run of tiles spells, putting a silent e back at the end. */
export function tilesSpell(tiles: readonly string[]): string {
  return tiles.map(tileLabel).join("") + (tiles.some(isSilentETile) ? "e" : "");
}
/** Every taught pattern a word's tiles show, in teaching order. Only single-syllable words are tagged this way. */
export function patternsOf(tiles: readonly string[]): StepId[] {
  const found: StepId[] = [];
  const add = (id: StepId) => found.includes(id) || found.push(id);
  for (const t of tiles) {
    if (t === "ar") add("r-ar");
    else if (t === "or") add("r-or");
    else if (teams.has(t)) add(`team-${t}` as StepId);
    else if (silentE.test(t)) add("silent-e");
    else if (t === "sh") add("digraph-sh");
    else if (t === "ch") add("digraph-ch");
    else if (t === "th") add("digraph-th");
    else if (t === "ck") add("digraph-ck");
    else if (t === "ng") add("ng");
  }
  if (tiles.length > 1 && isConsonantTile(tiles[0]) && isConsonantTile(tiles[1])) add("blend-start");
  if (tiles.length > 1 && isConsonantTile(tiles[tiles.length - 1]) && isConsonantTile(tiles[tiles.length - 2])) add("blend-end");
  const vowel = tiles.find((t) => vowels.has(t));
  if (vowel && !found.some((id) => id.startsWith("team-") || id === "silent-e" || id.startsWith("r-"))) add(`short-${vowel}` as StepId);
  return found;
}
const priority: readonly (readonly StepId[])[] = [
  ["r-ar", "r-or"],
  ["team-ee", "team-ea", "team-ai", "team-oa", "team-oo"],
  ["silent-e"],
  ["digraph-sh", "digraph-ch", "digraph-th", "digraph-ck", "ng"],
  ["blend-start", "blend-end"],
  ["short-a", "short-e", "short-i", "short-o", "short-u"],
];
/** The one pattern a word is filed under: the newest idea in it, in the order a child meets them. */
export function primaryPattern(tiles: readonly string[]): StepId | undefined {
  const all = patternsOf(tiles);
  for (const group of priority) {
    const hit = all.find((id) => group.includes(id));
    if (hit) return hit;
  }
  return undefined;
}
