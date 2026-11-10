import type { Strength } from "../board/types";
import type { PolicyGame } from "./types";
import { checkersPolicies, currentPolicy } from "./policies";

/**
 * A rival is a name and a way of playing. The words come from the policy that
 * really plays, so a rival never claims more or less than it does.
 */
export type Rival = { strength: Strength; name: string; who: string; plays: string };
const people: Record<Strength, { name: string; who: string }> = {
  gentle: { name: "Pebble", who: "a hermit crab" },
  growing: { name: "Coral", who: "a sea turtle" },
  challenge: { name: "Ray", who: "a manta ray" },
};
export function rivalFor(game: PolicyGame, strength: Strength): Rival {
  const plays =
    game === "checkers"
      ? checkersPolicies.find((p) => p.strength === strength)!.plays
      : currentPolicy(game, strength).plays;
  return { strength, ...people[strength], plays };
}
export const rivalNames = Object.values(people).map((p) => p.name);

/**
 * A head start is extra for the player, shown on the board and in the score.
 * The rival keeps its full strength. Sizes come from the benchmark in
 * docs/BOARD_POLICIES.md: each one makes a close game more likely, none makes it certain.
 */
export type HeadStart = { amount: number; label: string; detail: string };
export function headStarts(game: PolicyGame, size?: number): readonly HeadStart[] {
  switch (game) {
    case "coconut-drop":
      return [{ amount: 1, label: "One extra coconut", detail: "You begin with a coconut already in the middle column." }];
    case "shell-pits":
      return [4, 8].map((n) => ({ amount: n, label: `${n} shells ahead`, detail: `${n} shells are added to your store’s total at the end.` }));
    case "fishing-nets":
      return (size === 3 || size === undefined ? [1, 2] : [2, 3]).map((n) => ({
        amount: n,
        label: `${n} ${n === 1 ? "box" : "boxes"} ahead`,
        detail: `You start with ${n} ${n === 1 ? "box" : "boxes"} counted for you.`,
      }));
    case "hidden-canoes":
      return [1, 2].map((n) => ({
        amount: n,
        label: `Find ${7 - n} instead of 7`,
        detail: `${n === 1 ? "One canoe space counts" : "Two canoe spaces count"} as found before you start. Nothing hidden is shown.`,
      }));
    case "checkers":
      return [{ amount: 1, label: "One piece fewer for the rival", detail: "The rival starts without one back-row piece." }];
  }
}
export const headStartLabel = (game: PolicyGame, amount: number, size?: number) =>
  headStarts(game, size).find((h) => h.amount === amount)?.label ?? null;
