import type { LearnEngine, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
import {
  bools,
  exact,
  familyResult,
  integer,
  phonemes,
  readingSkills,
  seat,
  wordEntry,
  wordsAt,
} from "../../kit/reading";
import { pictureFor } from "../../content/reading/clues";
import { LADDERS } from "../../content/reading/ladders";

export type BoatState = {
  warmups: string[];
  ladders: string[];
  starter: 0 | 1;
  index: number;
  clean: boolean[];
  count: number;
  loaded: number;
  stage: "count" | "letters" | "sail" | "done";
  assisted: boolean;
  feedback: "none" | "count" | "letter" | "hint";
};
export const boatWords = (s: BoatState): string[] => [
  ...s.warmups,
  ...s.ladders.flatMap((id) => [...LADDERS.find((l) => l.id === id)!.words]),
];
export function boatWord(s: BoatState) {
  return wordEntry(boatWords(s)[Math.min(s.index, 9)])!;
}
export function boatSlots(s: BoatState) {
  const words = boatWords(s),
    now = wordEntry(words[Math.min(s.index, 9)])!;
  const previous = s.index > 2 && s.index !== 6 ? wordEntry(words[s.index - 1]) : undefined;
  return now.tiles.map((tile, i) => (previous?.tiles[i] === tile ? tile : ""));
}
export const missingSlots = (s: BoatState) =>
  boatSlots(s)
    .map((v, i) => (v ? -1 : i))
    .filter((i) => i >= 0);
export const boatTurn = (s: BoatState, o: LearnOptions): 0 | 1 =>
  ((s.starter + s.index + (o.mode === "together" && s.stage !== "count" ? 1 : 0)) % 2) as 0 | 1;
export type BoatAction = { type: "add" | "remove" | "count" | "hint" | "next" } | { type: "letter"; tile: string };
export function boatMove(s: BoatState, a: BoatAction): BoatState {
  if (s.stage === "done") return s;
  const n = boatWord(s).tiles.length;
  if (a.type === "hint") return { ...s, assisted: true, feedback: "hint" };
  if (a.type === "add" && s.stage === "count" && s.count < 6) return { ...s, count: s.count + 1, feedback: "none" };
  if (a.type === "remove" && s.stage === "count" && s.count > 0) return { ...s, count: s.count - 1, feedback: "none" };
  if (a.type === "count" && s.stage === "count")
    return s.count === n ? { ...s, stage: "letters", feedback: "none" } : { ...s, assisted: true, feedback: "count" };
  if (a.type === "letter" && s.stage === "letters") {
    const expected = boatWord(s).tiles[missingSlots(s)[s.loaded]];
    if (a.tile !== expected) return { ...s, assisted: true, feedback: "letter" };
    const loaded = s.loaded + 1;
    return { ...s, loaded, stage: loaded === missingSlots(s).length ? "sail" : "letters", feedback: "none" };
  }
  if (a.type === "next" && s.stage === "sail") {
    const index = s.index + 1;
    return {
      ...s,
      index,
      clean: [...s.clean, !s.assisted],
      count: 0,
      loaded: 0,
      stage: index === 10 ? "done" : "count",
      assisted: false,
      feedback: "none",
    };
  }
  return s;
}
export const engine: LearnEngine<BoatState> = {
  id: "sound-boat",
  name: "Sound Boat",
  island: "reading",
  tagline: "Load a boat, one sound at a time.",
  description: "Hear a word, count its sounds and load its letters. Change one sound to sail along a word ladder.",
  help: "Hear the picture word. Add one box for each sound, then tap Load letters. Pick the letters for each empty box. Two letters can make one sound, like sh. In a ladder, keep the sounds that stay the same. A line under a vowel means silent e, as in a_e. Together, one person counts and says the sounds; the other loads letters. Swap jobs for the next word. Take turns: a rung without a hint or retry earns a point. There is no clock.",
  helpAudio: "sound-boat-help",
  color: "#386C9A",
  surface: "#E3EEF8",
  modes: ["solo", "together", "versus"],
  skills: readingSkills,
  paceHelp: {
    easy: "Short vowel words: cat, bed, pig, dog, sun.",
    medium: "Short vowels, digraphs and blends: ship, clap, ring.",
    hard: "Silent e and vowel teams: cake, sheep, boat.",
  },
  create(o, c) {
    const pool = wordsAt(o.pace).filter(
      (w) =>
        !!pictureFor(w.word) && w.tiles.length === phonemes(w.word).length && w.tiles.length >= 3 && w.tiles.length <= 5
    );
    const warmups = pickItems(pool, c.skills, 2, c.rng, c.today).map((w) => w.word);
    const available = LADDERS.filter((l) => l.pace === o.pace);
    const preferred = available.filter((l) => !c.previous?.ladders.includes(l.id));
    const ladders = pickItems(preferred.length >= 2 ? preferred : available, c.skills, 2, c.rng, c.today).map(
      (l) => l.id
    );
    return {
      warmups,
      ladders,
      starter: c.starter,
      index: 0,
      clean: [],
      count: 0,
      loaded: 0,
      stage: "count",
      assisted: false,
      feedback: "none",
    };
  },
  validate(v, o): v is BoatState {
    if (
      !exact(v, ["warmups", "ladders", "starter", "index", "clean", "count", "loaded", "stage", "assisted", "feedback"])
    )
      return false;
    if (
      !Array.isArray(v.warmups) ||
      v.warmups.length !== 2 ||
      new Set(v.warmups).size !== 2 ||
      !v.warmups.every(
        (w) =>
          typeof w === "string" &&
          wordsAt(o.pace).some(
            (e) =>
              e.word === w &&
              !!pictureFor(w) &&
              e.tiles.length >= 3 &&
              e.tiles.length <= 5 &&
              e.tiles.length === phonemes(w).length
          )
      )
    )
      return false;
    if (
      !Array.isArray(v.ladders) ||
      v.ladders.length !== 2 ||
      new Set(v.ladders).size !== 2 ||
      !v.ladders.every((id) => LADDERS.some((l) => l.id === id && l.pace === o.pace))
    )
      return false;
    if (
      !seat(v.starter) ||
      !integer(v.index, 10) ||
      !bools(v.clean, v.index) ||
      !integer(v.count, 6) ||
      !integer(v.loaded, 5) ||
      typeof v.assisted !== "boolean" ||
      !["count", "letters", "sail", "done"].includes(v.stage as string) ||
      !["none", "count", "letter", "hint"].includes(v.feedback as string)
    )
      return false;
    const s = v as BoatState;
    if (s.index === 10)
      return s.stage === "done" && s.count === 0 && s.loaded === 0 && !s.assisted && s.feedback === "none";
    if (s.stage === "done" || (s.feedback !== "none" && !s.assisted)) return false;
    if (s.stage === "count")
      return (
        s.loaded === 0 && s.feedback !== "letter" && (s.feedback !== "count" || s.count !== boatWord(s).tiles.length)
      );
    const missing = missingSlots(s).length;
    return (
      s.count === boatWord(s).tiles.length &&
      s.feedback !== "count" &&
      (s.stage === "sail" ? s.loaded === missing && s.feedback !== "letter" : s.loaded < missing)
    );
  },
  outcome(s, o) {
    return s.stage !== "done" ? null : o.mode === "versus" ? familyResult(s.clean, s.starter) : "done";
  },
  turn: boatTurn,
};
