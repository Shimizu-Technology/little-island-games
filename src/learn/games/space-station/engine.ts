import type { LearnEngine } from "../../types";
import { levelOf } from "../../levelOptions";
import { makeEngine, type ScienceState } from "../weather-watch/model";
import { create, finished, validState, type InquiryState } from "../../inquiry/engine";
import { scienceSkills } from "../../kit/science";
import { investigations } from "./investigations";

/** The shared science engine. Saved version-1 rounds keep using it; fresh rounds are version-2 inquiry rounds. */
export const legacyEngine = makeEngine(
  "space-station",
  "Star Station",
  [7, 14],
  ["Day & night", "Moon phases", "Planet builder", "Gravity & orbits", "Light, tilt & eclipses"]
);
export { tasks, move, correct, currentTask } from "../weather-watch/model";
export type { ScienceState } from "../weather-watch/model";

export type StationState = ScienceState | InquiryState;
export const isInquiry = (s: unknown): s is InquiryState => !!s && typeof s === "object" && (s as { version?: unknown }).version === 2;

export const engine: LearnEngine<StationState> = {
  ...(legacyEngine as LearnEngine<StationState>),
  description: "Predict what the model will do, test it, then explain why. Five levels ask for more each time. Models simplify the real sky.",
  help: "Read the question and look at the model. Choose what you think will happen, or plan a setup, then tap Test. Explain what you saw by choosing the reason that fits the model. Hint shows where to look, then the model's rule, then an answer. Undo takes back a setting before you test. Models simplify the real world. Reading is never timed.",
  helpAudio: "space-station-help-v4",
  skills: { ...legacyEngine.skills, ...scienceSkills },
  levelNames: [
    { name: "Day & night", description: "Predict day or night from where the island faces." },
    { name: "Moon phases", description: "Predict how the Moon looks from where it is in its orbit." },
    { name: "Planet builder", description: "Compare planet sizes with Earth and sort rocky and giant planets." },
    { name: "Gravity lab", description: "Plan fair tests and find a mystery world from its weight." },
    { name: "Light, tilt & eclipses", description: "Reason with two conditions at once, including an eclipse surprise." },
  ],
  create: (o, c) => {
    const level = levelOf(o), seed = Math.floor(c.rng() * 1000000);
    return create(level, seed, investigations(level, seed));
  },
  validate: (x, o): x is StationState => {
    if (!isInquiry(x)) return legacyEngine.validate(x, o);
    const seed = (x as InquiryState).seed;
    return Number.isInteger(seed) && validState(x, levelOf(o), investigations(levelOf(o), seed));
  },
  outcome: (s, o) => (isInquiry(s) ? (finished(investigations(s.level, s.seed), s) ? "done" : null) : legacyEngine.outcome(s as ScienceState, o)),
};
