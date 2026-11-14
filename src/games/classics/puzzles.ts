import type { Puzzle } from "../../challenge/types";
import { sha256Hex } from "../../puzzles/sha256";
import { ticForkDescriptors } from "./ticForks";
import { checkersTacticsDescriptors } from "./checkersTactics";
import { memoryDareDescriptors } from "./memoryDares";
/** Reserved by lead, 13 November: banks 480–489, dares 3000–3099. Immutable append-only slots. */
const tactics = <D,>(game: string, bank: number, start: number, descriptors: readonly (D & { title: string })[]): readonly Puzzle<D>[] => descriptors.map((descriptor, i) => ({
  ref: { bank, puzzle: i, engine: game, rules: 1, hash: sha256Hex(JSON.stringify(descriptor)) },
  source: { kind: "play", game, content: `classics-${i + 1}`, rules: 1 }, path: "deep-water", tier: i < 3 ? 1 : i < 6 ? 2 : 3,
  title: `${i + 1} · ${descriptor.title}`, descriptor,
  dares: [{ slot: start + i, id: `${game}-${i + 1}-clean`, label: "Find it without help or a missed try", rule: { kind: "clean" }, help: "independent" }],
  awards: [null, null],
}));
export const ticForkPuzzles = tactics("tic-tac-toe", 480, 3000, ticForkDescriptors);
export const checkersTacticsPuzzles = tactics("checkers", 481, 3010, checkersTacticsDescriptors);
export const memoryDarePuzzles: readonly Puzzle<(typeof memoryDareDescriptors)[number]>[] = memoryDareDescriptors.map((descriptor, i) => ({
  ref: { bank: 482, puzzle: i, engine: "memory", rules: 1, hash: sha256Hex(JSON.stringify(descriptor)) },
  source: { kind: "play", game: "memory", content: `memory-deal-${i + 1}`, rules: 1 }, path: "deep-water", tier: descriptor.cards.length === 12 ? 1 : descriptor.cards.length === 16 ? 2 : 3,
  title: `${descriptor.cards.length / 2} pairs · ${descriptor.pack === "words" ? "Picture + English word" : descriptor.pack === "chamoru" ? "Picture + CHamoru word" : "Pictures"} · ${descriptor.preview ? "With preview" : "No preview"}`,
  descriptor,
  dares: [{ slot: 3040 + i, id: `memory-deal-${i + 1}-target`, label: `Suggested: ${descriptor.suggested} turns${descriptor.preview ? " after preview" : ", no preview"}`, rule: { kind: "pick-up", objective: "suggested-target" }, help: "independent" }],
  awards: [null, null],
}));
