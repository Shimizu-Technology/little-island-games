import React from "react";
import { ColorLightLabView } from "./ColorLightLabView";
import { HeartbeatBreathLabView } from "./HeartbeatBreathLabView";
import { PlantGrowthLabView } from "./PlantGrowthLabView";
import { RampBalanceLabView } from "./RampBalanceLabView";
import { SoundRhythmLabView } from "./SoundRhythmLabView";
import { VolcanoIslandLabView } from "./VolcanoIslandLabView";
import type { DiscoveryLabId } from "./types";

export function DiscoveryLabView({
  labId,
  sound,
  active = true,
  saved,
  onToggleSaved,
}: {
  labId: DiscoveryLabId;
  sound: boolean;
  active?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  switch (labId) {
    case "color-light-lab":
      return <ColorLightLabView sound={sound} saved={saved} onToggleSaved={onToggleSaved} />;
    case "sound-rhythm-lab":
      return <SoundRhythmLabView sound={sound} active={active} saved={saved} onToggleSaved={onToggleSaved} />;
    case "volcano-island-lab":
      return <VolcanoIslandLabView sound={sound} saved={saved} onToggleSaved={onToggleSaved} />;
    case "ramp-balance-lab":
      return <RampBalanceLabView sound={sound} active={active} saved={saved} onToggleSaved={onToggleSaved} />;
    case "plant-growth-lab":
      return <PlantGrowthLabView sound={sound} saved={saved} onToggleSaved={onToggleSaved} />;
    case "heartbeat-breath-lab":
      return <HeartbeatBreathLabView sound={sound} active={active} saved={saved} onToggleSaved={onToggleSaved} />;
  }
}
