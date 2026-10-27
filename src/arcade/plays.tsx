import React from "react";
import { wordEntry } from "../learn/kit/reading";
import type { ArcadeId, ArcadeLevel, ArcadeResult, LevelId } from "./types";
import type { OutfitId } from "./progress";
import { createReef, reefLevel, reefLevels } from "./games/reef-builder/engine";
import { ReefBoard } from "./games/reef-builder/View";
import { createSong, songLevel, songLevels } from "./games/shell-song/engine";
import { SongBoard } from "./games/shell-song/View";
import { createCargo, cargoLevel, cargoLevels } from "./games/canoe-cargo/engine";
import { CargoBoard } from "./games/canoe-cargo/View";

/** Everything the shared game screen needs to start and frame one round of a game. */
export type ArcadeBoardProps = {
  level: ArcadeLevel | "endless";
  seed: number;
  helper: boolean;
  active: boolean;
  outfit: OutfitId;
  onResult: (result: ArcadeResult, helped?: boolean) => void;
  onTone: (tone: string, haptic?: boolean) => void;
  onSay: (key: string, automatic?: boolean) => boolean;
  debug: boolean;
};
export type ArcadePlay = {
  levels: readonly ArcadeLevel[];
  level: (id: LevelId) => ArcadeLevel;
  /** Speech key for the teaching sheet and the level-start button. */
  speech: (learning: boolean) => string;
  /** Optional different key spoken when a round starts (e.g. the level goal). */
  startSpeech?: (learning: boolean) => string;
  clearedTitle: string;
  /** Skill credited when a learning-world level is cleared. */
  learningSkill: (level: ArcadeLevel) => { skill: string; subject: "reading" | "math" };
  Board: (props: ArcadeBoardProps) => React.ReactElement;
};

/**
 * One entry per playable game. Adding a game means adding an entry here; the shared
 * screen (ArcadeScreen) never branches on game ids.
 */
export const arcadePlays: Partial<Record<ArcadeId, ArcadePlay>> = {
  "reef-builder": {
    levels: reefLevels,
    level: reefLevel,
    speech: learning => (learning ? "arcade-reef-ten" : "arcade-reef-intro"),
    clearedTitle: "A happier little reef",
    learningSkill: () => ({ skill: "num.make-ten", subject: "math" }),
    Board: p => <ReefBoard initial={createReef(p.level === "endless" ? p.level : reefLevel(p.level.id), p.seed, p.helper)} active={p.active} helper={p.helper} onResult={p.onResult} onTone={p.onTone} />,
  },
  "shell-song": {
    levels: songLevels,
    level: songLevel,
    speech: learning => (learning ? "arcade-song-word" : "arcade-song-intro"),
    clearedTitle: "A song worth sharing",
    learningSkill: level => ({ skill: wordEntry(songLevel(level.id).word!)!.skill, subject: "reading" }),
    Board: p => <SongBoard initial={createSong(p.level === "endless" ? p.level : songLevel(p.level.id), p.seed, p.helper)} active={p.active} helper={p.helper} outfit={p.outfit} onResult={p.onResult} onTone={p.onTone} onSay={p.onSay} debug={p.debug} />,
  },
  "canoe-cargo": {
    levels: cargoLevels,
    level: cargoLevel,
    speech: learning => (learning ? "arcade-cargo-sum" : "arcade-cargo-intro"),
    startSpeech: learning => (learning ? "arcade-cargo-sum-goal" : "arcade-cargo-goal"),
    clearedTitle: "Cargo away, captain!",
    learningSkill: level => {
      const sum = cargoLevel(level.id).targetSum ?? 10;
      return { skill: `num.add-within-${sum <= 10 ? 10 : sum <= 20 ? 20 : 100}`, subject: "math" };
    },
    Board: p => <CargoBoard initial={createCargo(p.level === "endless" ? p.level : cargoLevel(p.level.id), p.seed, p.helper)} active={p.active} helper={p.helper} outfit={p.outfit} onResult={p.onResult} onTone={p.onTone} debug={p.debug} />,
  },
};
