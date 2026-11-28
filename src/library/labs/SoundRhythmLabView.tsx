import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { Text } from "../../components/Text";
import { palette } from "../ui";
import { DISCOVERY_LAB_MAP } from "./registry";
import { LabButton, LabShell, ls, useLabFonts } from "./LabShell";
import {
  ISLAND_DRUMS,
  LOUDNESS_AMPLITUDE,
  PLUCK_STRINGS,
  RHYTHM_TRACKS,
  SOUND_CHALLENGES,
  XYLOPHONE_BARS,
  activeTracksOnBeat,
  buildWavePath,
  createSoundRhythmState,
  effectiveFrequency,
  reduceSoundRhythm,
  waveMetrics,
  type LoudnessLevel,
  type SoundPad,
  type StringTension,
} from "./soundRhythmEngine";
import { createLabSoundPlayer } from "./soundSynth";

export function SoundRhythmLabView({
  sound,
  saved,
  onToggleSaved,
}: {
  sound: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const [state, dispatch] = useReducer(reduceSoundRhythm, undefined, createSoundRhythmState);
  const [phase, setPhase] = useState(0);
  const { displayBold, headingBold, bodyFont } = useLabFonts();
  const meta = DISCOVERY_LAB_MAP["sound-rhythm-lab"];

  const synth = useMemo(() => createLabSoundPlayer(), []);
  useEffect(() => () => synth.dispose(), [synth]);

  const soundRef = useRef(sound);
  const stateRef = useRef(state);
  useEffect(() => {
    soundRef.current = sound;
    stateRef.current = state;
  }, [sound, state]);

  // Smooth requestAnimationFrame wave motion & optional 4-beat rhythm loop (zero setTimeout/setInterval).
  useEffect(() => {
    if (typeof requestAnimationFrame !== "function" || typeof cancelAnimationFrame !== "function") return;
    let rafId = 0;
    let lastTs = 0;
    let beatAccumMs = 0;

    const tick = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dtMs = Math.min(80, Math.max(0, ts - lastTs));
      lastTs = ts;

      const cur = stateRef.current;
      const speed = 0.004 + (cur.activeFrequencyHz / 520) * 0.008;
      setPhase((prev) => (prev + dtMs * speed) % (Math.PI * 2));

      if (cur.loopPlaying) {
        const beatMs = 60_000 / cur.tempoBpm;
        beatAccumMs += dtMs;
        if (beatAccumMs >= beatMs) {
          beatAccumMs -= beatMs;
          const nextBeat = (cur.currentBeat + 1) % 4;
          const hits = activeTracksOnBeat(cur.pattern, nextBeat);
          if (soundRef.current) {
            const amp = LOUDNESS_AMPLITUDE[cur.loudness];
            for (const track of hits) {
              synth.playTone(track.frequencyHz, track.voice, amp);
            }
          }
          dispatch({ type: "step-beat" });
        }
      } else {
        beatAccumMs = 0;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [synth]);

  const playPad = (pad: SoundPad) => {
    const freq = effectiveFrequency(pad, state.tension);
    if (sound) {
      synth.playTone(freq, pad.voice, LOUDNESS_AMPLITUDE[state.loudness]);
    }
    dispatch({ type: "play-pad", pad });
  };

  const stepBeatManually = () => {
    const nextBeat = (state.currentBeat + 1) % 4;
    if (sound) {
      const amp = LOUDNESS_AMPLITUDE[state.loudness];
      for (const track of activeTracksOnBeat(state.pattern, nextBeat)) {
        synth.playTone(track.frequencyHz, track.voice, amp);
      }
    }
    dispatch({ type: "step-beat" });
  };

  const metrics = waveMetrics(state.activeFrequencyHz, state.loudness);
  const wavePath = buildWavePath(state.activeFrequencyHz, state.loudness, phase);
  const challenge = SOUND_CHALLENGES[state.challengeIndex];
  const challengeDone = challenge.check(state);

  const pads =
    state.mode === "xylophone" ? XYLOPHONE_BARS : state.mode === "drums" ? ISLAND_DRUMS : PLUCK_STRINGS;

  return (
    <LabShell
      meta={meta}
      discoveryTitle={`${state.activeLabel} · ${metrics.pitchCategory} Pitch (${state.activeFrequencyHz} Hz)`}
      discoveryText={metrics.discovery}
      challengePrompt={challenge.prompt}
      challengeHint={challenge.hint}
      challengeDone={challengeDone}
      onNextChallenge={() => dispatch({ type: "next-challenge" })}
      onReset={() => dispatch({ type: "reset" })}
      saved={saved}
      onToggleSaved={onToggleSaved}
    >
      {/* Live Sound Wave Visualizer */}
      <View style={ls.stageCard}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 17, color: palette.ink }]}>
            Live Sound Wave
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={[bodyFont, { fontSize: 14, color: "#1E6B66" }]}>
            {metrics.loudnessLabel} · {state.activeFrequencyHz} Hz
          </Text>
        </View>
        <View style={{ width: "100%", height: 132, borderRadius: 18, overflow: "hidden", backgroundColor: "#1A3238" }}>
          <Svg width="100%" height="100%" viewBox="0 0 320 120" accessible={false}>
            <Rect width={320} height={120} fill="#1A3238" />
            {/* Reference midline & subtle grid */}
            <Line x1={0} y1={60} x2={320} y2={60} stroke="#4C7D85" strokeWidth={1.5} strokeDasharray="5 5" />
            <Line x1={80} y1={12} x2={80} y2={108} stroke="#2E545C" strokeWidth={1} />
            <Line x1={160} y1={12} x2={160} y2={108} stroke="#2E545C" strokeWidth={1} />
            <Line x1={240} y1={12} x2={240} y2={108} stroke="#2E545C" strokeWidth={1} />
            {/* Glowing secondary harmonic trail */}
            <Path
              d={buildWavePath(state.activeFrequencyHz, state.loudness, phase - 0.35)}
              fill="none"
              stroke="#6ED3C5"
              strokeOpacity={0.35}
              strokeWidth={7}
              strokeLinecap="round"
            />
            {/* Main crisp sound wave */}
            <Path d={wavePath} fill="none" stroke="#F8D26A" strokeWidth={4} strokeLinecap="round" />
            <Circle cx={12} cy={60} r={5} fill="#E06D53" />
            <Circle cx={308} cy={60} r={5} fill="#E06D53" />
          </Svg>
        </View>

        {/* Instrument Selector */}
        <View style={ls.row}>
          <LabButton
            testID="sound-mode-xylophone"
            selected={state.mode === "xylophone"}
            accentColor="#1E6B66"
            onPress={() => dispatch({ type: "set-mode", mode: "xylophone" })}
            style={{ flex: 1 }}
          >
            Bamboo Xylophone
          </LabButton>
          <LabButton
            testID="sound-mode-drums"
            selected={state.mode === "drums"}
            accentColor="#B75C49"
            onPress={() => dispatch({ type: "set-mode", mode: "drums" })}
            style={{ flex: 1 }}
          >
            Island Drums
          </LabButton>
          <LabButton
            testID="sound-mode-strings"
            selected={state.mode === "strings"}
            accentColor="#9C6B21"
            onPress={() => dispatch({ type: "set-mode", mode: "strings" })}
            style={{ flex: 1 }}
          >
            Pluck Strings
          </LabButton>
        </View>

        {/* Loudness (Amplitude) Controls */}
        <View style={ls.row}>
          <Text maxFontSizeMultiplier={1.25} style={[headingBold, { fontSize: 15, color: palette.ink }]}>
            Loudness:
          </Text>
          {(["soft", "medium", "loud"] as LoudnessLevel[]).map((level) => (
            <LabButton
              key={level}
              testID={`sound-loudness-${level}`}
              selected={state.loudness === level}
              accentColor="#1E6B66"
              onPress={() => dispatch({ type: "set-loudness", loudness: level })}
            >
              {level === "soft" ? "Soft" : level === "medium" ? "Medium" : "Loud"}
            </LabButton>
          ))}
        </View>

        {/* String Tension Control when in String mode */}
        {state.mode === "strings" && (
          <View style={ls.row}>
            <Text maxFontSizeMultiplier={1.25} style={[headingBold, { fontSize: 15, color: palette.ink }]}>
              String Tension:
            </Text>
            {(["loose", "normal", "tight"] as StringTension[]).map((t) => (
              <LabButton
                key={t}
                testID={`sound-tension-${t}`}
                selected={state.tension === t}
                accentColor="#9C6B21"
                onPress={() => dispatch({ type: "set-tension", tension: t })}
              >
                {t === "loose" ? "Loose (Lower)" : t === "normal" ? "Normal" : "Tight (Higher)"}
              </LabButton>
            ))}
          </View>
        )}

        {/* Playable Instrument Pads */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          {pads.map((pad) => {
            const freq = effectiveFrequency(pad, state.tension);
            return (
              <Pressable
                key={pad.id}
                testID={`sound-pad-${pad.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Play ${pad.label}, ${freq} Hertz`}
                onPress={() => playPad(pad)}
                style={({ pressed }) => [
                  {
                    flexGrow: 1,
                    flexBasis: state.mode === "xylophone" ? 96 : 136,
                    minHeight: state.mode === "xylophone" ? Math.round(68 + pad.barHeightRatio * 56) : 76,
                    borderRadius: 20,
                    backgroundColor: pad.color,
                    borderWidth: 2,
                    borderColor: pad.accentColor,
                    borderBottomWidth: 5,
                    padding: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    opacity: pressed ? 0.78 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 17, color: "#FFFDF8", textAlign: "center" }]}>
                  {pad.label}
                </Text>
                <Text maxFontSizeMultiplier={1.2} style={[bodyFont, { fontSize: 12.5, color: "#FFFDF8", opacity: 0.92 }]}>
                  {freq} Hz
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4-Beat Island Rhythm Loop Sequencer */}
      <View style={ls.stageCard}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text maxFontSizeMultiplier={1.35} style={[displayBold, { fontSize: 19, color: palette.ink }]}>
            4-Beat Island Rhythm Loop
          </Text>
          <View style={ls.row}>
            <LabButton
              testID="rhythm-play-toggle"
              selected={state.loopPlaying}
              accentColor="#1E6B66"
              onPress={() => dispatch({ type: "toggle-loop" })}
            >
              {state.loopPlaying ? "Stop Loop" : "Play Loop"}
            </LabButton>
            <LabButton testID="rhythm-step-beat" onPress={stepBeatManually}>
              Step Beat
            </LabButton>
            <LabButton testID="rhythm-clear" onPress={() => dispatch({ type: "clear-pattern" })}>
              Clear
            </LabButton>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {RHYTHM_TRACKS.map((track) => (
            <View key={track.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                maxFontSizeMultiplier={1.25}
                style={[headingBold, { width: 98, fontSize: 14.5, color: palette.ink }]}
              >
                {track.label}
              </Text>
              <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                {[0, 1, 2, 3].map((beat) => {
                  const active = state.pattern[track.id][beat];
                  const isNow = state.currentBeat === beat;
                  return (
                    <Pressable
                      key={beat}
                      testID={`rhythm-cell-${track.id}-${beat}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${track.label} beat ${beat + 1}, ${active ? "on" : "off"}`}
                      accessibilityState={{ selected: active }}
                      onPress={() => dispatch({ type: "toggle-beat", track: track.id, beat })}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 48,
                        minWidth: 48,
                        borderRadius: 14,
                        backgroundColor: active ? track.color : "#F7ECDA",
                        borderWidth: isNow ? 3 : 1.5,
                        borderColor: isNow ? "#3D2B24" : active ? track.color : "#DFCFAF",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.78 : 1,
                      })}
                    >
                      <Text
                        maxFontSizeMultiplier={1.2}
                        style={[displayBold, { fontSize: 15, color: active ? "#FFFDF8" : palette.muted }]}
                      >
                        {beat + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </View>
    </LabShell>
  );
}
