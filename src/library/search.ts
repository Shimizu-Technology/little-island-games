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
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++)
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
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
  return index
    .filter((e) => allowed.has(e.id) && (!category || e.category === category))
    .map((entry) => {
      const title = normalize(entry.title),
        aliases = entry.aliases.map(normalize);
      const scores = words.map((word) => {
        if (title.split(" ").includes(word) || aliases.includes(word)) return 100;
        if (entry.terms.some((term) => term.startsWith(word))) return 80;
        if (word.length >= 4 && entry.terms.some((term) => distance(word, term) <= (word.length >= 7 ? 2 : 1)))
          return 60;
        const sound = phonetic(word);
        if (word.length >= 4 && sound.length >= 3 && entry.sounds.includes(sound)) return 40;
        return 0;
      });
      return { entry, score: scores.length ? Math.min(...scores) : 1 };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .map((r) => r.entry);
}
