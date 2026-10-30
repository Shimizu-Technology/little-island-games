import type { ComponentType } from "react";
import type { BoardProps, LearnId } from "./types";
import * as reefRace from "./games/reef-race/view";
import * as islandMarket from "./games/island-market/view";
import * as soundBoat from "./games/sound-boat/view";
import * as turtleTales from "./games/turtle-tales/view";
import * as whichOne from "./games/which-one/view";
import * as tidePool from "./games/tide-pool/view";
import * as floatSink from "./games/float-sink/view";
import * as crabCommands from "./games/crab-commands/view";
import * as hafaAdai from "./games/hafa-adai/view";
import * as shellMath from "./games/shell-math/view";
import * as numberHop from "./games/number-hop/view";
import * as quickPractice from "./games/quick-practice/view";
import { stubView } from "./stubView";
import * as tideLogic from "./games/tide-logic/view";
import * as codeLab from "./games/code-lab/view";

import * as letterLagoon from "./games/letter-lagoon/view";
import * as wordWorkshop from "./games/word-workshop/view";
import * as storyStudio from "./games/story-studio/view";
export type LearnView = { Board: ComponentType<BoardProps<unknown>>; Art: ComponentType<{ size: number }> };
/** Screens for each learning game (React). Engines live in engines.ts. */
export const views: Record<LearnId, LearnView> = {
  "reef-race": reefRace as LearnView,
  "island-market": islandMarket as LearnView,
  "sound-boat": soundBoat as LearnView,
  "turtle-tales": turtleTales as LearnView,
  "which-one": whichOne as LearnView,
  "tide-pool": tidePool as LearnView,
  "float-sink": floatSink as LearnView,
  "crab-commands": crabCommands as LearnView,
  "hafa-adai": hafaAdai as LearnView,
  "shell-math": shellMath as LearnView,
  "number-hop": numberHop as LearnView,
  "quick-practice": quickPractice as LearnView,
  "beep-bot": stubView,
  "turtle-draw": stubView,
  "tide-logic": tideLogic as LearnView,
  "code-lab": codeLab as LearnView,
  "pattern-path": stubView,
  "shape-shift": stubView,
  "logic-lagoon": stubView,
  "weather-watch": stubView,
  "food-web": stubView,
  "space-station": stubView,
  "times-tide": stubView,
  "fraction-feast": stubView,
  "treasure-algebra": stubView,
  "letter-lagoon": letterLagoon as LearnView,
  "word-workshop": wordWorkshop as LearnView,
  "story-studio": storyStudio as LearnView,
};
