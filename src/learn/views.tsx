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
};
