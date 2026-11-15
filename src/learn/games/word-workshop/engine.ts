import { readingBank } from "../../reading/provenance";
import { makeEngine } from "../letter-lagoon/puzzle";
export { move, current, choices, complete, type State, type Action } from "../letter-lagoon/puzzle";
export const levelNames = [
  { name: "Word joinery", description: "Snap two words into a compound." },
  { name: "Word endings", description: "Build plurals and words with ed or ing." },
  { name: "Meaning makers", description: "Use prefixes and suffixes to change meanings." },
  { name: "Root detectives", description: "Connect Greek and Latin roots with meanings." },
  { name: "Context craft", description: "Use passage clues, meanings and homophones." },
];
/**
 * The five levels of tasks: the pinned inherited bank from `reading/provenance.ts`, frozen and branded. The board
 * refuses any task that is not one of these. Saved rounds keep indexes into it, so its order never changes.
 */
export const bank = readingBank("word-workshop");
export const engine = makeEngine("word-workshop", "Word Workshop", [7, 14], levelNames, bank);
