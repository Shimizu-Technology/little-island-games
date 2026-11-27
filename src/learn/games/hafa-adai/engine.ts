import type { LearnEngine, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
import { chamoruRecord as chamoruWord, chamoruRecords, readingGrowthTracks, type ReadingQuestion } from "../../reading/provenance";
import { levelOf } from "../../levelOptions";
import {
  createPicnicContext,
  isPicnicContext,
  picnicContextDone,
  picnicContextOutcome,
  picnicContextTurn,
  validPicnicContext,
  type ContextLevel,
  type PicnicContextState,
} from "./stages";

export type IslandState = {
  items: string[];
  activity: "explore" | "spy";
  /** Bounded, replayable meaningful moves. Derived scores and targets are never trusted from storage. */
  taps: string[];
  starter: 0 | 1;
};
const countFor = (o: LearnOptions) => o.pace === "easy" ? 6 : o.pace === "medium" ? 8 : 12;
export const MAX_TAPS = 24;
export function islandProgress(s: IslandState) {
  let cursor = 0, missed = false;
  const scores: [number, number] = [0, 0], visited = new Set<string>();
  let lastCorrect = false;
  for (const id of s.taps) {
    visited.add(id);
    if (s.activity === "explore") { lastCorrect = true; continue; }
    lastCorrect = id === s.items[cursor];
    if (lastCorrect) {
      if (!missed) scores[(s.starter + cursor) % 2]++;
      cursor++;
      missed = false;
    } else missed = true;
  }
  return { cursor, scores, visited, missed, lastCorrect,
    player: ((s.starter + cursor) % 2) as 0 | 1,
    done: s.activity === "explore" ? visited.size === s.items.length : cursor === s.items.length };
}
export function tapItem(s: IslandState, id: string): IslandState {
  if (!s.items.includes(id) || islandProgress(s).done) return s;
  // A long exploration can always continue: keep only first visits. Spy misses of the same
  // picture consecutively add no information and do not consume bounded save space.
  if (s.activity === "explore" && s.taps.includes(id)) return s;
  if (s.activity === "spy" && islandProgress(s).missed && id !== s.items[islandProgress(s).cursor]) {
    return s.taps.at(-1) === id ? s : { ...s, taps: [...s.taps.slice(0, -1), id] };
  }
  if (s.taps.length >= MAX_TAPS) return s;
  return { ...s, taps: [...s.taps, id] };
}
export function chooseActivity(s: IslandState, activity: IslandState["activity"], o: LearnOptions): IslandState {
  if (o.mode !== "solo" || s.activity === activity) return s;
  return { ...s, activity, taps: [] };
}
export type HafaAdaiState = IslandState | PicnicContextState;

const contextPool = (level: ContextLevel): readonly ReadingQuestion[] =>
  readingGrowthTracks()["hafa-adai"]?.[level === 4 ? "stretch" : "deep"]?.questions ?? [];

export const picnicContextItem = (s: Pick<PicnicContextState, "level" | "ids" | "index">): ReadingQuestion | undefined =>
  contextPool(s.level).find((q) => q.id === s.ids[s.index]);

export const engine: LearnEngine<HafaAdaiState> = {
  id: "hafa-adai", name: "Håfa Adai Island", island: "reading",
  tagline: "Explore a picnic full of CHamoru words.",
  description: "Tap pictures to discover CHamoru words, play I spy, or match CHamoru words to everyday island moments. CHamoru words are text only.",
  help: "Explore: tap each picture at the picnic to see its CHamoru word and its English meaning. I spy: read the CHamoru word, then tap its picture. Gentle shows a small English helper on the word card; Growing and Challenge keep it behind Peek. At Levels 4 and 5, read the everyday island moment and tap the matching CHamoru picture card on the picnic. A different picture shows its own meaning so you can compare and try again. Take turns: finish one word, then pass the device. A first-try find earns a point. CHamoru words are text only.",
  helpAudio: "hafa-adai-help",
  introAudio: "hafa-adai-intro", color: "#A04F38", surface: "#FBEADF", modes: ["solo", "versus"],
  nativeStages: true,
  paceHelp: { easy: "Six pictures. A small English helper on the word card.", medium: "Eight pictures. Peek at English when you need it.", hard: "Twelve pictures. Read the CHamoru word, then find it." },
  skills: { "ch.colors": "CHamoru colors", "ch.numbers": "CHamoru numbers", "ch.food": "CHamoru food", "ch.body": "CHamoru body words", "ch.family": "CHamoru family words", "ch.greetings": "CHamoru greetings" },
  create(o, ctx) {
    if (o.stage) {
      const lvl = levelOf(o) as ContextLevel;
      return createPicnicContext(lvl, contextPool(lvl), {
        ...ctx,
        starter: o.mode === "versus" ? ctx.starter : 0,
      });
    }
    const pool = chamoruRecords().filter((w) => o.pace !== "easy" || w.category !== "numbers" || ["One", "Two", "Three", "Four", "Five"].includes(w.english));
    const categories = ["colors", "numbers", "food", "body_parts", "family", "greetings"];
    const anchors = categories.map(category => pickItems(pool.filter(w => w.category === category), ctx.skills, 1, ctx.rng, ctx.today)[0]);
    const rest = pickItems(pool.filter(w => !anchors.includes(w)), ctx.skills, countFor(o) - anchors.length, ctx.rng, ctx.today);
    const items = pickItems([...anchors, ...rest], ctx.skills, countFor(o), ctx.rng, ctx.today).map(w => w.id);
    const prevActivity = !isPicnicContext(ctx.previous) && ctx.previous?.activity ? ctx.previous.activity : "explore";
    return { items, activity: o.mode === "versus" ? "spy" : prevActivity, taps: [], starter: o.mode === "versus" ? ctx.starter : 0 };
  },
  validate(v, o): v is HafaAdaiState {
    if (o.stage) {
      const lvl = levelOf(o) as ContextLevel;
      const pool = contextPool(lvl);
      return isPicnicContext(v) && validPicnicContext(v, lvl, (id) => pool.find((q) => q.id === id), o);
    }
    if (isPicnicContext(v)) return false;
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const s = v as IslandState;
    if (Object.keys(s).sort().join() !== "activity,items,starter,taps" || !Array.isArray(s.items) || s.items.length !== countFor(o) || new Set(s.items).size !== s.items.length || !s.items.every(id => typeof id === "string" && !!chamoruWord(id)) || !["spy", "explore"].includes(s.activity) || ![0, 1].includes(s.starter) || (o.mode === "solo" && s.starter !== 0) || (o.mode === "versus" && s.activity !== "spy") || !Array.isArray(s.taps) || s.taps.length > MAX_TAPS) return false;
    if (new Set(s.items.map(id => chamoruWord(id)!.category)).size !== 6) return false;
    if (o.pace === "easy" && s.items.some(id => /^numbers\.(six|seven|eight|nine|ten)$/.test(id))) return false;
    let replay: IslandState = { ...s, taps: [] };
    for (const id of s.taps) {
      if (typeof id !== "string") return false;
      const next = tapItem(replay, id);
      if (next === replay) return false;
      replay = next;
    }
    return true;
  },
  outcome(s, o) {
    if (isPicnicContext(s)) return picnicContextOutcome(s, o);
    const p = islandProgress(s);
    return !p.done ? null : o.mode !== "versus" ? "done" : p.scores[0] === p.scores[1] ? "draw" : p.scores[0] > p.scores[1] ? 0 : 1;
  },
  turn: (s) => (isPicnicContext(s) ? (picnicContextDone(s) ? null : picnicContextTurn(s)) : islandProgress(s).done ? null : islandProgress(s).player),
};
