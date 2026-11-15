import { readingBank } from "../../reading/provenance";
import { makeEngine } from "./puzzle";
export { move, current, choices, complete, type State, type Action } from "./puzzle";
export const levelNames = [
  { name: "Hello, letters", description: "Find friendly uppercase letters." },
  { name: "Letter twins", description: "Match big letters to little letters." },
  { name: "First sounds", description: "Find pictures with the same first sound." },
  { name: "Letter trails", description: "Trace a letter from start to finish." },
  { name: "Sound builders", description: "Build short words from letters and sounds." },
];
/**
 * The five levels of tasks: the pinned inherited bank from `reading/provenance.ts`, frozen and branded. The board
 * refuses any task that is not one of these. Saved rounds keep indexes into it, so its order never changes.
 */
export const bank = readingBank("letter-lagoon");
export const engine = makeEngine("letter-lagoon", "Letter Lagoon", [3, 6], levelNames, bank);
