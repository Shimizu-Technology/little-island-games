import { readingBank } from "../../reading/provenance";
import { makeEngine } from "../letter-lagoon/puzzle";
export { move, current, choices, complete, type State, type Action } from "../letter-lagoon/puzzle";
export const levelNames = [
  { name: "Picture sentences", description: "Build a three-word picture sentence." },
  { name: "Sentence repairs", description: "Fix capitals and end marks." },
  { name: "Sentence artists", description: "Sort word roles and expand a sentence." },
  { name: "Comic editors", description: "Sequence a story and give its main idea." },
  { name: "Paragraph studio", description: "Build paragraphs, edit grammar and infer." },
];
/**
 * The five levels of tasks: the pinned inherited bank from `reading/provenance.ts`, frozen and branded. The board
 * refuses any task that is not one of these. Saved rounds keep indexes into it, so its order never changes.
 */
export const bank = readingBank("story-studio");
export const engine = makeEngine("story-studio", "Story Studio", [6, 14], levelNames, bank);
