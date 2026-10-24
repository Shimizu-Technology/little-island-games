import type { LearnEngine } from "../../types";
import { pickItems } from "../../skills";
import { STORIES } from "../../content/reading/stories";
import { exact, integer, readingSkills, seat, shuffle, tokens } from "../../kit/reading";
export type TaleState = {
  id: string;
  starter: 0 | 1;
  page: number;
  word: number;
  pointed: boolean;
  modelPages: number[];
  question: number;
  orders: number[][];
  wrong: number | null;
  solved: boolean;
  done: boolean;
};
export const tale = (s: TaleState) => STORIES.find((t) => t.id === s.id)!;
export const pageComplete = (s: TaleState) =>
  s.word === tokens(tale(s).pages[Math.min(s.page, tale(s).pages.length - 1)].text).length;
export const taleAnswer = (s: TaleState) => s.orders[Math.min(s.question, 1)].indexOf(0);
export function taleTurn(s: TaleState): 0 | 1 {
  const t = tale(s),
    before = t.pages.slice(0, s.page).reduce((n, p) => n + (p.text.match(/[.!?]/g)?.length ?? 1), 0);
  const current = t.pages[s.page]?.text.split(/\s+/).slice(0, s.word).join(" ") ?? "";
  const sentences = current.match(/[.!?]/g)?.length ?? 0;
  return ((s.starter + before + sentences) % 2) as 0 | 1;
}
export function taleTap(s: TaleState, index: number): TaleState {
  if (s.done || s.page === tale(s).pages.length || pageComplete(s)) return s;
  return index === s.word ? { ...s, word: s.word + 1, pointed: false } : { ...s, pointed: true };
}
export function taleModel(s: TaleState): TaleState {
  return s.page >= tale(s).pages.length || s.modelPages.includes(s.page)
    ? s
    : { ...s, modelPages: [...s.modelPages, s.page] };
}
export function talePage(s: TaleState): TaleState {
  return s.page < tale(s).pages.length && pageComplete(s) ? { ...s, page: s.page + 1, word: 0, pointed: false } : s;
}
export function talePick(s: TaleState, n: number): TaleState {
  if (s.done || s.page !== tale(s).pages.length || s.solved || !integer(n, 2)) return s;
  return n === taleAnswer(s) ? { ...s, solved: true, wrong: null } : { ...s, wrong: n };
}
export function taleNext(s: TaleState): TaleState {
  return !s.solved ? s : { ...s, question: s.question + 1, solved: false, wrong: null, done: s.question === 1 };
}
export const engine: LearnEngine<TaleState> = {
  id: "turtle-tales",
  name: "Turtle Tales",
  island: "reading",
  tagline: "A little story, one careful step at a time.",
  description:
    "Read a warm island tale. Tap each word in order to move the turtle. Then look for the pictures from the story.",
  help: "Tap each word in order as you read it. The turtle takes one step per word. The ear beside the next word speaks just that word. Read it to me first models this page once. When you finish the page, the picture comes alive. Look for two pictures from the story at the end. Together, take turns reading each sentence. Go at your own pace.",
  helpAudio: "turtle-tales-help",
  color: "#246858",
  surface: "#E5EFE5",
  modes: ["solo", "together"],
  skills: readingSkills,
  create(o, c) {
    const pool = STORIES.filter((t) => t.pace === o.pace && t.id !== c.previous?.id);
    return {
      id: pickItems(pool, c.skills, 1, c.rng, c.today)[0].id,
      starter: c.starter,
      page: 0,
      word: 0,
      pointed: false,
      modelPages: [],
      question: 0,
      orders: Array.from({ length: 2 }, () => shuffle([0, 1, 2], c.rng)),
      wrong: null,
      solved: false,
      done: false,
    };
  },
  validate(v, o): v is TaleState {
    if (
      !exact(v, [
        "id",
        "starter",
        "page",
        "word",
        "pointed",
        "modelPages",
        "question",
        "orders",
        "wrong",
        "solved",
        "done",
      ])
    )
      return false;
    const t = STORIES.find((t) => t.id === v.id && t.pace === o.pace);
    if (!t) return false;
    if (
      !seat(v.starter) ||
      !integer(v.page, t.pages.length) ||
      !integer(v.word, 30) ||
      typeof v.pointed !== "boolean" ||
      !integer(v.question, 2) ||
      typeof v.solved !== "boolean" ||
      typeof v.done !== "boolean" ||
      (v.wrong !== null && !integer(v.wrong, 2))
    )
      return false;
    if (
      !Array.isArray(v.modelPages) ||
      new Set(v.modelPages).size !== v.modelPages.length ||
      !v.modelPages.every((p) => integer(p, t.pages.length - 1) && p <= (v.page as number)) ||
      !v.modelPages.every((p, i, a) => i === 0 || p > a[i - 1])
    )
      return false;
    if (
      !Array.isArray(v.orders) ||
      v.orders.length !== 2 ||
      !v.orders.every(
        (a) => Array.isArray(a) && a.length === 3 && a.every((n) => integer(n, 2)) && new Set(a).size === 3
      )
    )
      return false;
    const s = v as TaleState;
    if (s.page < t.pages.length)
      return (
        s.word <= tokens(t.pages[s.page].text).length &&
        (!pageComplete(s) || !s.pointed) &&
        s.question === 0 &&
        !s.solved &&
        !s.done &&
        s.wrong === null
      );
    if (s.word !== 0 || s.pointed || s.done !== (s.question === 2)) return false;
    if (s.done) return !s.solved && s.wrong === null;
    return s.wrong === null || (!s.solved && s.wrong !== taleAnswer(s));
  },
  outcome: (s) => (s.done ? "done" : null),
  turn: taleTurn,
};
