import { Base, Options, base, shuffle } from "./types";
import { legacyWordRescue } from "../../content/words/registry";
export const WORDS = legacyWordRescue;
export type WordState = Base & {
  game: "word-rescue";
  word: string;
  clue: string;
  category: string;
  pack?: string;
  guessed: string[];
  hints: number;
  custom: boolean;
  seen: string[];
};
export function createWord(options: Options, category = "All", previous: string[] = []): WordState {
  const pool = wordPool(options.difficulty, category);
  const fresh = pool.filter((w) => !previous.includes(w[0]));
  const chosen = shuffle(fresh.length ? fresh : pool)[0] ?? WORDS[0];
  return {
    ...base("word-rescue", { ...options, wordRules: options.wordRules ?? "challenge" }),
    game: "word-rescue",
    word: chosen[0],
    category: chosen[1],
    pack: category,
    clue: chosen[2],
    guessed: [],
    hints: 0,
    custom: false,
    seen: [...previous.slice(-59), chosen[0]],
  };
}
export function replayWord(state: WordState): WordState | null {
  return state.custom ? null : createWord(state.options, state.pack ?? "All", state.seen);
}
export function customWord(options: Options, raw: string, clue = ""): WordState | null {
  const word = raw.trim().toUpperCase();
  if (!/^[A-Z]{2,12}$/.test(word)) return null;
  return {
    ...base("word-rescue", { ...options, wordRules: options.wordRules ?? "challenge" }),
    game: "word-rescue",
    word,
    category: "Family word",
    clue: clue.trim().slice(0, 80) || "Someone picked this word just for you.",
    guessed: [],
    hints: 0,
    custom: true,
    seen: [],
  };
}
export const wordDone = (s: WordState) => [...s.word].every((letter) => s.guessed.includes(letter));
// Missing rules belong to pre-V2, unlimited Practice rounds. Never change a saved round's rules on update.
export const wordRules = (s: WordState) => s.options.wordRules ?? "practice";
export const wrongLetters = (s: WordState) => s.guessed.filter((letter) => !s.word.includes(letter));
export function wordStatus(s: WordState): "playing" | "won" | "lost" {
  if (wordRules(s) === "challenge" && wrongLetters(s).length >= 6) return "lost";
  return wordDone(s) ? "won" : "playing";
}
export function guessLetter(s: WordState, letter: string): WordState {
  if (!/^[A-Z]$/.test(letter) || s.guessed.includes(letter) || wordStatus(s) !== "playing") return s;
  return { ...s, guessed: [...s.guessed, letter] };
}
export function wordHint(s: WordState): WordState {
  if (wordStatus(s) !== "playing" || (wordRules(s) === "challenge" && s.hints >= 1)) return s;
  const letter = [...s.word].find((l) => !s.guessed.includes(l));
  return letter ? { ...guessLetter(s, letter), hints: s.hints + 1 } : s;
}

export function wordPool(difficulty: Options["difficulty"], category = "All") {
  const categoryWords = WORDS.filter((w) => category === "All" || w[1] === category);
  const available = categoryWords.length ? categoryWords : [...WORDS];
  const distance = (length: number) =>
    difficulty === "easy"
      ? Math.max(3 - length, length - 4, 0)
      : difficulty === "medium"
        ? Math.abs(length - 5)
        : Math.max(6 - length, 0);
  const closest = Math.min(...available.map((w) => distance(w[0].length)));
  return available.filter((w) => distance(w[0].length) === closest);
}
/** Keep all letters on one row unless accessible text needs a larger tile. */
export function wordTiles(length: number, available: number, fontScale = 1) {
  const gap = length >= 10 ? 4 : 6,
    floor = 22 * Math.max(1, fontScale);
  const rows = Math.min(
    length,
    Math.max(1, Math.ceil(length / Math.max(1, Math.floor((available + gap) / (floor + gap)))))
  );
  const count = Math.ceil(length / rows),
    tile = Math.min(48 * Math.max(1, fontScale), (available - gap * (count - 1)) / count);
  const sizes = Array.from(
    { length: rows },
    (_, i) => Math.floor(length / rows) + (i < length % rows ? 1 : 0)
  );
  return { gap, tile, sizes };
}
