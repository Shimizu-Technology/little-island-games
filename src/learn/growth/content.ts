import type { LearnId } from "../types";
import { numberTracks } from "./numbers";
import { discoveryTracks } from "./discovery";
import { readingGrowthTracks } from "../reading/provenance";
import type { GrowthStage, GrowthTracks } from "./types";
/** The reading tracks are the inherited snapshot's branded, frozen questions (`reading/provenance.ts`), never the live source. */
export const growthTracks: GrowthTracks = { ...numberTracks, ...readingGrowthTracks(), ...discoveryTracks };
export const growthTrack = (game: LearnId, stage: GrowthStage) => growthTracks[game]?.[stage];
/**
 * Every growth track that is not maths or discovery is reading, and its questions must be branded records. Failing
 * closed: a new game's track counts as reading until it is named in one of those two sets.
 */
export const readingGrowth = (game: LearnId) => !Object.hasOwn(numberTracks, game) && !Object.hasOwn(discoveryTracks, game);

/** The label names a skill, while the persisted pace remains backward compatible. */
export const foundationLabels: Partial<Record<LearnId, readonly string[]>> = {
  "reef-race": ["Count to 30", "Count to 60", "Two-dice moves"],
  "island-market": ["Count & compare", "Tens & ones", "Add & make change"],
  "sound-boat": ["Short vowels", "Blends & digraphs", "Vowel teams"],
  "turtle-tales": ["Short-vowel stories", "Blend stories", "Vowel-team stories"],
  "which-one": ["Short-vowel sentences", "Blends & digraphs", "Vowel teams"],
  "tide-pool": ["Meet habitats", "Habitat changes", "Coral conditions"],
  "float-sink": ["First six objects", "Compare objects", "Shape & air"],
  "crab-commands": ["Arrow paths", "Turns & facing", "Repeat a command"],
  "hafa-adai": ["Words with English", "Words with Peek", "More words with Peek"],
  "shell-math": ["Within 10", "Within 20"], "number-hop": ["Within 10", "Within 20"], "quick-practice": ["Within 10", "Within 20"],
  "beep-bot": ["Arrow sequence", "Corners", "Obstacles"],
  "turtle-draw": ["Lines and angles", "Four-sided shapes", "Repeat a shape"],
  "tide-logic": ["Colour gates", "Big or small", "Two clues"],
  "code-lab": ["Say and step", "Scores and loops", "Make a function"],
  "pattern-path": ["Color patterns", "Growing patterns", "Skip and turn"],
  "shape-shift": ["Fit shapes", "Turn shapes", "Flip shapes"],
  "logic-lagoon": ["Two friends", "Picture grid", "Little sudoku"],
  "weather-watch": ["Weather wardrobe", "Season garden", "Water cycle"],
  "food-web": ["Reef feeding", "Food chains", "Branching webs"],
  "space-station": ["Day & night", "Moon phases", "Planet builder"],
  "times-tide": ["Equal groups", "Shell arrays", "Skip count"],
  "fraction-feast": ["Fair shares", "Fraction line", "Equivalent fractions"],
  "treasure-algebra": ["Positive steps", "Negative numbers", "Missing numbers"],
  "letter-lagoon": ["Hello, letters", "Letter twins", "First sounds"],
  "word-workshop": ["Word joinery", "Word endings", "Meaning makers"],
  "story-studio": ["Picture sentences", "Sentence repairs", "Sentence artists"],
};
