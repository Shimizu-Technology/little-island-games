/** Word parts for Levels 4 and 5: what an ending or a start does to a base word, checked rather than claimed. */
export type SpellingChange = "none" | "drop-e" | "double" | "y-to-i";
export const SUFFIXES = ["s", "es", "ed", "ing", "er", "est", "ly", "ful"] as const;
export const PREFIXES = ["un", "re"] as const;
export type Suffix = (typeof SUFFIXES)[number];
export type Prefix = (typeof PREFIXES)[number];
const vowel = (c: string | undefined) => !!c && "aeiou".includes(c);
const startsWithVowel = (affix: string) => vowel(affix[0]);
/** A short vowel then one consonant, like hop or sit: the pattern that doubles before a vowel ending. */
const isDoubler = (base: string) =>
  base.length >= 3 && !vowel(base[base.length - 1]) && !"wxy".includes(base[base.length - 1]) &&
  vowel(base[base.length - 2]) && !vowel(base[base.length - 3]) && base.length <= 4 && !/[aeiou]{2}/.test(base);
/**
 * The word an ending or start makes from a base word under a spelling change, or null when the change does not
 * apply to that pair. This is the rule a record's own claim is checked against.
 */
export function applyAffix(base: string, affix: string, kind: "suffix" | "prefix", change: SpellingChange): string | null {
  if (kind === "prefix") return change === "none" ? affix + base : null;
  switch (change) {
    case "none":
      return base + affix;
    case "drop-e":
      return base.endsWith("e") && startsWithVowel(affix) ? base.slice(0, -1) + affix : null;
    case "double":
      return isDoubler(base) && startsWithVowel(affix) ? base + base[base.length - 1] + affix : null;
    case "y-to-i":
      return base.endsWith("y") && !vowel(base[base.length - 2]) && affix[0] !== "i" ? base.slice(0, -1) + "i" + affix : null;
  }
}
/** The base-word piece as it sits inside the finished word (mak in making, hopp in hopping, cri in cried). */
export function stemOf(word: string, affix: string, kind: "suffix" | "prefix"): string {
  return kind === "suffix" ? word.slice(0, word.length - affix.length) : word.slice(affix.length);
}
/**
 * Every ordering of tray pieces that spells a word, as lists of tray positions. A tray is fair only when every
 * way of spelling the word is a way that is accepted, so no clever wrong-looking tile can be right.
 */
export function spellings(tray: readonly string[], word: string, limit = 64): number[][] {
  const out: number[][] = [];
  const used = new Array<boolean>(tray.length).fill(false);
  const walk = (at: number, picked: number[]) => {
    if (out.length >= limit) return;
    if (at === word.length) {
      out.push([...picked]);
      return;
    }
    tray.forEach((piece, i) => {
      if (used[i] || !piece || !word.startsWith(piece, at)) return;
      used[i] = true;
      picked.push(i);
      walk(at + piece.length, picked);
      picked.pop();
      used[i] = false;
    });
  };
  walk(0, []);
  return out;
}
