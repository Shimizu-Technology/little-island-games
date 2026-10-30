import { engine as spaceStation } from "./games/space-station/engine";
import { engine as foodWeb } from "./games/food-web/engine";
import { engine as weatherWatch } from "./games/weather-watch/engine";
import type { LearnEngine, LearnId , Island } from "./types";
import { withGrowth } from "./growth/engine";
import { engine as reefRace } from "./games/reef-race/engine";
import { engine as islandMarket } from "./games/island-market/engine";
import { engine as soundBoat } from "./games/sound-boat/engine";
import { engine as turtleTales } from "./games/turtle-tales/engine";
import { engine as whichOne } from "./games/which-one/engine";
import { engine as tidePool } from "./games/tide-pool/engine";
import { engine as floatSink } from "./games/float-sink/engine";
import { engine as crabCommands } from "./games/crab-commands/engine";
import { engine as hafaAdai } from "./games/hafa-adai/engine";
import { engine as shellMath } from "./games/shell-math/engine";
import { engine as numberHop } from "./games/number-hop/engine";
import { engine as quickPractice } from "./games/quick-practice/engine";
import { stubEngine } from "./stub";

/** Pure engines (no React): safe to import from save validation and tests. */
import { engine as letterLagoon } from "./games/letter-lagoon/engine";
import { engine as wordWorkshop } from "./games/word-workshop/engine";
import { engine as storyStudio } from "./games/story-studio/engine";
const originalEngines: Record<LearnId, LearnEngine<unknown>> = {
  "reef-race": reefRace as LearnEngine<unknown>,
  "island-market": islandMarket as LearnEngine<unknown>,
  "sound-boat": soundBoat as LearnEngine<unknown>,
  "turtle-tales": turtleTales as LearnEngine<unknown>,
  "which-one": whichOne as LearnEngine<unknown>,
  "tide-pool": tidePool as LearnEngine<unknown>,
  "float-sink": floatSink as LearnEngine<unknown>,
  "crab-commands": crabCommands as LearnEngine<unknown>,
  "hafa-adai": hafaAdai as LearnEngine<unknown>,
  "shell-math": shellMath as LearnEngine<unknown>,
  "number-hop": numberHop as LearnEngine<unknown>,
  "quick-practice": quickPractice as LearnEngine<unknown>,
  "beep-bot": stubEngine({ id: "beep-bot", name: "Beep Bot", island: "coding" as Island, tagline: "Tap arrows. Help Beep get the shell.", description: "Tap arrows. Help Beep get the shell.", help: "Tap arrows. Help Beep get the shell.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [4, 6], ownLevels: true }) as LearnEngine<unknown>,
  "turtle-draw": stubEngine({ id: "turtle-draw", name: "Turtle Draw", island: "coding" as Island, tagline: "Code a turtle to draw shapes.", description: "Code a turtle to draw shapes.", help: "Code a turtle to draw shapes.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [6, 11], ownLevels: true }) as LearnEngine<unknown>,
  "tide-logic": stubEngine({ id: "tide-logic", name: "Tide Logic", island: "coding" as Island, tagline: "If this, then that: sort the tide.", description: "If this, then that: sort the tide.", help: "If this, then that: sort the tide.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [7, 12], ownLevels: true }) as LearnEngine<unknown>,
  "code-lab": stubEngine({ id: "code-lab", name: "Code Lab", island: "coding" as Island, tagline: "Variables, loops and functions.", description: "Variables, loops and functions.", help: "Variables, loops and functions.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [9, 14], ownLevels: true }) as LearnEngine<unknown>,
  "pattern-path": stubEngine({ id: "pattern-path", name: "Pattern Path", island: "thinking" as Island, tagline: "Spot what comes next.", description: "Spot what comes next.", help: "Spot what comes next.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [4, 11], ownLevels: true }) as LearnEngine<unknown>,
  "shape-shift": stubEngine({ id: "shape-shift", name: "Shape Shift", island: "thinking" as Island, tagline: "Fit the shapes. Flip and turn.", description: "Fit the shapes. Flip and turn.", help: "Fit the shapes. Flip and turn.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [4, 13], ownLevels: true }) as LearnEngine<unknown>,
  "logic-lagoon": stubEngine({ id: "logic-lagoon", name: "Logic Lagoon", island: "thinking" as Island, tagline: "Clues, grids and number puzzles.", description: "Clues, grids and number puzzles.", help: "Clues, grids and number puzzles.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [6, 14], ownLevels: true }) as LearnEngine<unknown>,
  "weather-watch": weatherWatch as LearnEngine<unknown>,
  "food-web": foodWeb as LearnEngine<unknown>,
  "space-station": spaceStation as LearnEngine<unknown>,
  "times-tide": stubEngine({ id: "times-tide", name: "Times Tide", island: "numbers" as Island, tagline: "Groups, arrays and times tables.", description: "Groups, arrays and times tables.", help: "Groups, arrays and times tables.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [6, 11], ownLevels: true }) as LearnEngine<unknown>,
  "fraction-feast": stubEngine({ id: "fraction-feast", name: "Fraction Feast", island: "numbers" as Island, tagline: "Share pies. Fractions and decimals.", description: "Share pies. Fractions and decimals.", help: "Share pies. Fractions and decimals.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [7, 13], ownLevels: true }) as LearnEngine<unknown>,
  "treasure-algebra": stubEngine({ id: "treasure-algebra", name: "Treasure Algebra", island: "numbers" as Island, tagline: "Negatives, patterns and equations.", description: "Negatives, patterns and equations.", help: "Negatives, patterns and equations.", color: "#2F6F6A", surface: "#E6F0EC", modes: ["solo"], ages: [9, 14], ownLevels: true }) as LearnEngine<unknown>,
  "letter-lagoon": letterLagoon as LearnEngine<unknown>,
  "word-workshop": wordWorkshop as LearnEngine<unknown>,
  "story-studio": storyStudio as LearnEngine<unknown>,
};

/** Typical age span of Levels 1–5 for the original twelve games (new games declare their own). */
const originalAges: Partial<Record<LearnId, readonly [number, number]>> = {
  "reef-race": [4, 9], "island-market": [4, 9], "sound-boat": [5, 9], "turtle-tales": [5, 10], "which-one": [5, 9], "tide-pool": [4, 9],
  "float-sink": [4, 9], "crab-commands": [5, 10], "hafa-adai": [4, 12], "shell-math": [4, 9], "number-hop": [4, 9], "quick-practice": [5, 9],
};
export const engines = Object.fromEntries(Object.entries(originalEngines).map(([id, engine]) => [id, withGrowth({ ...engine, ages: engine.ages ?? originalAges[id as LearnId] })])) as Record<LearnId, LearnEngine<unknown>>;

/** Every skill label across games, for the grown-up practice view. */
export const skillLabels = (): Record<string, string> =>
  Object.values(engines).reduce<Record<string, string>>((all, e) => ({ ...all, ...e.skills }), {});
