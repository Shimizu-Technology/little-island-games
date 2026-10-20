import { Base, Options, base, random } from "./types";
export type NumbersState = Base & {
  game: "numbers";
  maxNumber?: 6 | 9 | 12;
  available: number[];
  dice: number[];
  selected: number[];
  seed: number;
  turns: number;
  history: { available: number[]; dice: number[]; seed: number; turns: number }[];
};
export function createNumbers(options: Options): NumbersState {
  return {
    ...base("numbers", options),
    game: "numbers",
    maxNumber: options.difficulty === "easy" ? 6 : options.difficulty === "medium" ? 9 : 12,
    available: Array.from({ length: options.difficulty === "easy" ? 6 : options.difficulty === "medium" ? 9 : 12 }, (_, i) => i + 1),
    dice: [],
    selected: [],
    seed: Math.floor(Math.random() * 0x7fffffff),
    turns: 0,
    history: [],
  };
}
export const numberLimit = (s: NumbersState) => s.maxNumber ?? (s.options.difficulty === "easy" ? 6 : 9);
export function numberChoices(available: number[], target: number): number[][] {
  const result: number[][] = [];
  for (let bits = 1; bits < 1 << available.length; bits++) {
    const choice = available.filter((_, i) => bits & (1 << i));
    if (choice.reduce((a, b) => a + b, 0) === target) result.push(choice);
  }
  return result;
}
export const numberTarget = (s: NumbersState) => s.dice.reduce((a, b) => a + b, 0);
export const numbersStatus = (s: NumbersState): "won" | "stuck" | "playing" =>
  !s.available.length
    ? "won"
    : s.dice.length && !numberChoices(s.available, numberTarget(s)).length
      ? "stuck"
      : "playing";
export function rollNumbers(s: NumbersState): NumbersState {
  if (s.dice.length || !s.available.length) return s;
  const rng = random(s.seed),
    count = s.options.difficulty === "easy" ? 1 : 2;
  return {
    ...s,
    dice: Array.from({ length: count }, () => Math.floor(rng() * 6) + 1),
    seed: (s.seed + 1979) >>> 0,
    selected: [],
  };
}
export function selectNumber(s: NumbersState, n: number): NumbersState {
  if (!s.dice.length || !s.available.includes(n) || numbersStatus(s) !== "playing") return s;
  return { ...s, selected: s.selected.includes(n) ? s.selected.filter((v) => v !== n) : [...s.selected, n] };
}
export function closeNumbers(s: NumbersState): NumbersState {
  if (!s.dice.length || !s.selected.length || s.selected.reduce((a, b) => a + b, 0) !== numberTarget(s)) return s;
  return {
    ...s,
    available: s.available.filter((n) => !s.selected.includes(n)),
    dice: [],
    selected: [],
    turns: s.turns + 1,
    history: [...s.history, { available: s.available, dice: s.dice, seed: s.seed, turns: s.turns }],
  };
}
export function undoNumbers(s: NumbersState): NumbersState {
  if (!s.history.length) return s;
  const history = [...s.history],
    last = history.pop()!;
  return { ...s, ...last, selected: [], history };
}
