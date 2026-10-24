import type { LearnEngine, LearnId } from "./types";
import { engine as reefRace } from "./games/reef-race/engine";
import { engine as islandMarket } from "./games/island-market/engine";
import { engine as soundBoat } from "./games/sound-boat/engine";
import { engine as turtleTales } from "./games/turtle-tales/engine";
import { engine as whichOne } from "./games/which-one/engine";
import { engine as tidePool } from "./games/tide-pool/engine";
import { engine as floatSink } from "./games/float-sink/engine";
import { engine as crabCommands } from "./games/crab-commands/engine";
import { engine as hafaAdai } from "./games/hafa-adai/engine";

/** Pure engines (no React): safe to import from save validation and tests. */
export const engines: Record<LearnId, LearnEngine<unknown>> = {
  "reef-race": reefRace as LearnEngine<unknown>,
  "island-market": islandMarket as LearnEngine<unknown>,
  "sound-boat": soundBoat as LearnEngine<unknown>,
  "turtle-tales": turtleTales as LearnEngine<unknown>,
  "which-one": whichOne as LearnEngine<unknown>,
  "tide-pool": tidePool as LearnEngine<unknown>,
  "float-sink": floatSink as LearnEngine<unknown>,
  "crab-commands": crabCommands as LearnEngine<unknown>,
  "hafa-adai": hafaAdai as LearnEngine<unknown>,
};

/** Every skill label across games, for the grown-up practice view. */
export const skillLabels = (): Record<string, string> =>
  Object.values(engines).reduce<Record<string, string>>((all, e) => ({ ...all, ...e.skills }), {});
