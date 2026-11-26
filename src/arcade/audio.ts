import { runEffects } from './games/lagoon-run/effects.generated';
import { createAudioPlayer, useAudioPlayer, type AudioSource, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { useSoundControls } from "../components/Audio";
import { feel } from "../components/feel";
import type { Settings } from "../state/validation";
import type { ArcadeId } from "./types";
const tones: Record<string, AudioSource> = {
  // Reuse the bundled dry tap for rail contact; wall callbacks always disable haptics.
  wall: require("../../assets/audio/tap.wav"),
  bump: require("../../assets/arcade/shell-0.wav"), coral: require("../../assets/arcade/coral.wav"), clear: require("../../assets/arcade/clear.wav"), sticker: require("../../assets/arcade/sticker.wav"),
  "shell-0": require("../../assets/arcade/shell-0.wav"), "shell-1": require("../../assets/arcade/shell-1.wav"), "shell-2": require("../../assets/arcade/shell-2.wav"), "shell-3": require("../../assets/arcade/shell-3.wav"), "shell-4": require("../../assets/arcade/shell-4.wav"), "shell-5": require("../../assets/arcade/shell-5.wav"),
};
const flightTones: Record<string, () => AudioSource> = {
  "flight-flap": () => require("../../assets/arcade/fruit-bat/flap.wav"),
  "flight-fruit": () => require("../../assets/arcade/fruit-bat/fruit.wav"),
  "flight-clear": () => require("../../assets/arcade/fruit-bat/clear.wav"),
  "flight-bump": () => require("../../assets/arcade/fruit-bat/bonk.wav"),
};
const lagoonTones: Record<string, () => AudioSource> = {
  "lagoon-snap": () => require("../../assets/arcade/lagoon-sfx/snap.wav"),
  "lagoon-shell": () => require("../../assets/arcade/lagoon-sfx/shell.wav"),
  "lagoon-power": () => require("../../assets/arcade/lagoon-sfx/power.wav"),
  "lagoon-thump": () => require("../../assets/arcade/lagoon-sfx/thump.wav"),
  "run-near": () => runEffects.near,
  "run-edge": () => require("../../assets/audio/tap.wav"),
};
const crabTones: Record<string, () => AudioSource> = {
  "crab-hop": () => require("../../assets/arcade/crab-sfx/hop.wav"),
  "crab-splash": () => require("../../assets/arcade/crab-sfx/splash.wav"),
  "crab-goal": () => require("../../assets/arcade/crab-sfx/goal.wav"),
};
const railTones: Record<string, () => AudioSource> = {
  "rail-step": () => require("../../assets/arcade/rail-sfx/step.wav"),
  "rail-chirp": () => require("../../assets/arcade/rail-sfx/chirp.wav"),
  "rail-nest": () => require("../../assets/arcade/rail-sfx/nest.wav"),
};
const musicSources = { reef: require("../../assets/arcade/reef-loop.wav"), song: require("../../assets/arcade/song-loop.wav") };
export function useArcadeAudio(game: ArcadeId, settings: Settings, music: boolean, active: boolean, sheetOpen = false) {
  // One preloaded player per effect. Swapping sources with replace() reloads the asset on the
  // main thread and stalled the frame on every flap/hop; rewinding a loaded player does not.
  const [effects] = useState<Record<string, AudioPlayer>>(() => {
    const players = Object.fromEntries(Object.entries(tones).map(([key, source]) => [key, createAudioPlayer(source)]));
    const gameTones = game === "fruit-bat-flight" ? flightTones
      : game === "lagoon-run" ? lagoonTones
      : game === "crab-crossing" ? crabTones
      : game === "rail-parade" ? railTones : {};
    for (const [key, source] of Object.entries(gameTones)) players[key] = createAudioPlayer(source());
    return players;
  });
  useEffect(() => () => { for (const player of Object.values(effects)) { try { player.remove(); } catch { /* Already released. */ } } }, [effects]);
  const loop = useAudioPlayer(game === "shell-song" ? musicSources.song : musicSources.reef);
  const speech = useSoundControls(settings.sound && active);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- SDK AudioPlayer properties intentionally mutate its native handle.
    loop.loop = true; loop.volume = .2;
    try { if (active && !sheetOpen && music && settings.sound) loop.play(); else loop.pause(); } catch { /* Browser playback may need the next touch. */ }
    return () => { try { loop.pause(); } catch { /* Unmounted player. */ } };
  }, [loop, music, settings.sound, active, sheetOpen]);
  useEffect(() => { if (!active || sheetOpen || !settings.sound || settings.effects === false) { for (const player of Object.values(effects)) { try { player.pause(); } catch { /* Disposed player. */ } } } }, [effects, settings.sound, settings.effects, active, sheetOpen]);
  const tone = useCallback((key: string, haptic = true) => {
    if (!active || sheetOpen) return;
    if (haptic) {
      if (key.startsWith("lagoon-")) {
        feel(key === "lagoon-thump" ? "warning" : key === "lagoon-power" ? "medium" : "tap");
      } else if (key === "flight-flap" || key === "flight-fruit" || key === "flight-clear") feel("tap");
      else if (key === "flight-bump") feel("warning");
      else if (key === "crab-hop" || key === "crab-splash") feel("tap");
      else if (key === "crab-goal") feel("success");
      else if (key === "rail-step" || key === "rail-chirp") feel("tap");
      else if (key === "rail-nest") feel("success");
      else feel(key === "clear" || key === "sticker" ? "success" : "select");
    }
    const player = effects[key];
    if (!settings.sound || settings.effects === false || !player) return;
    try { void player.seekTo(0).catch(() => {}); player.play(); } catch { /* Visible feedback always accompanies a sound. */ }
  }, [effects, settings.sound, settings.effects, active, sheetOpen]);
  const say = useCallback((key: string, automatic = false) => { const played = speech.play(key, automatic); return played; }, [speech]);
  return { tone, say, stop: speech.stop };
}
