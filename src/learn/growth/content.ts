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
};
