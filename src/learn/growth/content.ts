import type { LearnId } from "../types";
import { numberTracks } from "./numbers";
import { literacyTracks } from "./literacy";
import { discoveryTracks } from "./discovery";
import type { GrowthStage, GrowthTracks } from "./types";
export const growthTracks: GrowthTracks = { ...numberTracks, ...literacyTracks, ...discoveryTracks };
export const growthTrack = (game: LearnId, stage: GrowthStage) => growthTracks[game]?.[stage];

/** The label names a skill, while the persisted pace remains backward compatible. */
export const foundationLabels: Record<LearnId, readonly string[]> = {
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
  "beep-bot": ["Level 1", "Level 2", "Level 3"],
  "turtle-draw": ["Level 1", "Level 2", "Level 3"],
  "tide-logic": ["Colour gates", "Big or small", "Two clues"],
  "code-lab": ["Say and step", "Scores and loops", "Make a function"],
  "pattern-path": ["Level 1", "Level 2", "Level 3"],
  "shape-shift": ["Level 1", "Level 2", "Level 3"],
  "logic-lagoon": ["Level 1", "Level 2", "Level 3"],
  "weather-watch": ["Level 1", "Level 2", "Level 3"],
  "food-web": ["Level 1", "Level 2", "Level 3"],
  "space-station": ["Level 1", "Level 2", "Level 3"],
  "times-tide": ["Level 1", "Level 2", "Level 3"],
  "fraction-feast": ["Level 1", "Level 2", "Level 3"],
  "treasure-algebra": ["Level 1", "Level 2", "Level 3"],
  "letter-lagoon": ["Hello, letters", "Letter twins", "First sounds"],
  "word-workshop": ["Word joinery", "Word endings", "Meaning makers"],
  "story-studio": ["Picture sentences", "Sentence repairs", "Sentence artists"],
};
