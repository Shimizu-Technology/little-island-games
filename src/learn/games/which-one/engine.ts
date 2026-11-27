import type { LearnEngine } from "../../types";
import { pickItems } from "../../skills";
import {
  readingGrowthTracks,
  readingSentence,
  readingSentences,
  type ReadingQuestion,
  type ReadingSentence,
} from "../../reading/provenance";
import { levelOf } from "../../levelOptions";
import { bools, exact, familyResult, integer, readingSkills, seat, shuffle } from "../../kit/reading";
import {
  createWhichClue,
  isWhichClue,
  validWhichClue,
  whichClueOutcome,
  whichClueTurn,
  type ClueLevel,
  type WhichClueState,
} from "./stages";
export type WhichState = {
  ids: string[];
  orders: number[][];
  starter: 0 | 1;
  index: number;
  clean: boolean[];
  tried: boolean;
  wrong: number | null;
  solved: boolean;
};
/** The sentence on the board: the pinned inherited record with this saved id, never a copy or a string. */
export const whichItem = (s: WhichState): ReadingSentence => readingSentence(s.ids[Math.min(s.index, 7)])!;
export const whichAnswer = (s: WhichState) => s.orders[Math.min(s.index, 7)].indexOf(0);
/** Reading help uses the existing assisted-attempt flag; no fabricated wrong picture. */
export const whichHelp = (s: WhichState): WhichState =>
  s.solved || s.index === 8 ? s : { ...s, tried: true };
export function whichPick(s: WhichState, choice: number): WhichState {
  if (s.index === 8 || s.solved || !integer(choice, 2)) return s;
  return choice === whichAnswer(s) ? { ...s, solved: true, wrong: null } : { ...s, tried: true, wrong: choice };
}
export function whichNext(s: WhichState): WhichState {
  return !s.solved
    ? s
    : { ...s, index: s.index + 1, clean: [...s.clean, !s.tried], tried: false, wrong: null, solved: false };
}
export type WhichOneState = WhichState | WhichClueState;

const cluePool = (level: ClueLevel): readonly ReadingQuestion[] =>
  readingGrowthTracks()["which-one"]?.[level === 4 ? "stretch" : "deep"]?.questions ?? [];

export const whichClueItem = (s: Pick<WhichClueState, "level" | "ids" | "index">): ReadingQuestion | undefined =>
  cluePool(s.level).find((q) => q.id === s.ids[s.index]);

export const engine: LearnEngine<WhichOneState> = {
  id: "which-one",
  name: "Which One?",
  island: "reading",
  tagline: "Every word changes the picture.",
  description:
    "Read a short sentence, then choose its picture. Look closely: each other picture changes just one word, and later levels add multi-clue elimination.",
  help: "Read every word, then tap the picture that matches. Look at the animal, its size and colour, and where it is. If you pick another picture, the word that tells them apart lights up. Look again and try. At Levels 4 and 5, read all the clues, cross out cards that break a rule, and choose the card that fits every clue. Ask to hear the sentence or tap Help whenever you need it. Helped reading counts. In take turns, a correct first try earns a point. There is no clock.",
  helpAudio: "reading-v25-which-help",
  introAudio: "which-one-intro",
  color: "#C56D50",
  surface: "#F5E7D9",
  modes: ["solo", "versus"],
  nativeStages: true,
  skills: readingSkills,
  create(o, c) {
    if (o.stage) {
      const lvl = levelOf(o) as ClueLevel;
      return createWhichClue(lvl, cluePool(lvl), c);
    }
    const pool = readingSentences().filter((i) => i.pace === o.pace);
    const prevIds = !isWhichClue(c.previous) && c.previous?.ids ? c.previous.ids : [];
    const fresh = pool.filter((i) => !prevIds.includes(i.id));
    return {
      ids: pickItems(fresh.length >= 8 ? fresh : pool, c.skills, 8, c.rng, c.today).sort((a, b) => a.text.split(/\s+/).length - b.text.split(/\s+/).length).map((i) => i.id),
      orders: Array.from({ length: 8 }, () => shuffle([0, 1, 2], c.rng)),
      starter: c.starter,
      index: 0,
      clean: [],
      tried: false,
      wrong: null,
      solved: false,
    };
  },
  validate(v, o): v is WhichOneState {
    if (o.stage) {
      const lvl = levelOf(o) as ClueLevel;
      const pool = cluePool(lvl);
      return isWhichClue(v) && validWhichClue(v, lvl, (id) => pool.find((q) => q.id === id));
    }
    if (isWhichClue(v)) return false;
    if (!exact(v, ["ids", "orders", "starter", "index", "clean", "tried", "wrong", "solved"])) return false;
    if (
      !Array.isArray(v.ids) ||
      v.ids.length !== 8 ||
      new Set(v.ids).size !== 8 ||
      !v.ids.every((id) => readingSentence(id)?.pace === o.pace)
    )
      return false;
    if (
      !Array.isArray(v.orders) ||
      v.orders.length !== 8 ||
      !v.orders.every(
        (a) => Array.isArray(a) && a.length === 3 && a.every((n) => integer(n, 2)) && new Set(a).size === 3
      )
    )
      return false;
    if (
      !seat(v.starter) ||
      !integer(v.index, 8) ||
      !bools(v.clean, v.index) ||
      typeof v.tried !== "boolean" ||
      typeof v.solved !== "boolean" ||
      (v.wrong !== null && !integer(v.wrong, 2))
    )
      return false;
    const s = v as WhichState;
    if (s.index === 8) return !s.solved && !s.tried && s.wrong === null;
    if (s.solved) return s.wrong === null;
    return s.tried ? s.wrong === null || s.wrong !== whichAnswer(s) : s.wrong === null;
  },
  outcome(s, o) {
    if (isWhichClue(s)) return whichClueOutcome(s, o);
    return s.index < 8 ? null : o.mode === "versus" ? familyResult(s.clean, s.starter) : "done";
  },
  turn: (s) => (isWhichClue(s) ? whichClueTurn(s) : (((s.starter + s.index) % 2) as 0 | 1)),
};
