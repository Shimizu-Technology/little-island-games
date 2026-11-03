/** Deterministic, bounded offline matching. The build writes this index, never child queries. */
export interface SearchEntry {
  id: string;
  title: string;
  category: string;
  aliases: string[];
  tags: string[];
}
export interface IndexedEntry extends SearchEntry {
  terms: string[];
  sounds: string[];
}
export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function phonetic(value: string) {
  return normalize(value)
    .replace(/ph/g, "f")
    .replace(/ck|qu/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/[aeiou]/g, "")
    .replace(/(.)\1+/g, "$1");
}
/** Bounded edit distance: cells outside the tolerance band cannot rescue a match. */
function distance(a: string, b: string, limit: number) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = Array<number>(b.length + 1).fill(limit + 1);
    current[0] = i;
    let minimum = limit + 1;
    for (let j = Math.max(1, i - limit); j <= Math.min(b.length, i + limit); j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      minimum = Math.min(minimum, current[j]);
    }
    if (minimum > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}
export function buildIndex(entries: SearchEntry[]): IndexedEntry[] {
  return entries.map((entry) => {
    const terms = [
      ...new Set(
        [entry.title, ...entry.aliases, ...entry.tags].flatMap((s) => normalize(s).split(" ")).filter(Boolean)
      ),
    ];
    return { ...entry, terms, sounds: terms.map(phonetic) };
  });
}
export function search(index: IndexedEntry[], query: string, allowed: ReadonlySet<string>, category?: string) {
  const words = normalize(query.slice(0, 120)).split(" ").filter(Boolean).slice(0, 8);
  // Full-text articles share many words. Compute each query/term distance once per search.
  const near = new Map(words.map(word => [word, new Map<string, boolean>()]));
  const sounds = new Map(words.map(word => [word, phonetic(word)]));
  const close = (word: string, term: string, limit: number) => {
    if (Math.abs(word.length - term.length) > limit) return false;
    const cache = near.get(word)!;
    if (!cache.has(term)) cache.set(term, distance(word, term, limit) <= limit);
    return cache.get(term)!;
  };
  return index
    .filter((e) => allowed.has(e.id) && (!category || e.category === category))
    .map((entry) => {
      const titleWords = normalize(entry.title).split(" ");
      const aliases = entry.aliases.map(normalize);
      const wordScore = (word: string) => {
        if (titleWords.includes(word) || aliases.includes(word)) return 100;
        if (entry.terms.some((term) => term.startsWith(word))) return 80;
        const limit = word.length >= 7 ? 2 : 1;
        if (
          word.length >= 4 &&
          entry.terms.some((term) => close(word, term, limit))
        )
          return 60;
        const sound = sounds.get(word)!;
        if (word.length >= 4 && sound.length >= 3 && entry.sounds.includes(sound)) return 40;
        return 0;
      };
      let score = words.length ? 100 : 1;
      for (const word of words) {
        const next = wordScore(word);
        // Every word is required, so later distance calculations cannot rescue this entry.
        if (!next) return { entry, score: 0 };
        score = Math.min(score, next);
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .map((r) => r.entry);
}
/**
 * Category chips narrow browsing only. Any typed word searches everything the learner is
 * allowed, so a category chosen earlier can never hide a match the child can not see.
 */
export const searchCategory = (query: string, category: string) =>
  normalize(query) || category === "all" ? undefined : category;
/** Typing clears a stale category (the chips are hidden while a query is present). */
export const categoryAfterTyping = (query: string, category: string) => (normalize(query) ? "all" : category);
