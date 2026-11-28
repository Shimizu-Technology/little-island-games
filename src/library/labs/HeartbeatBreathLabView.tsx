import React, { useEffect, useReducer, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { Text } from "../../components/Text";
import { palette } from "../ui";
import { DISCOVERY_LAB_MAP } from "./registry";
import { LabButton, LabShell, ls, useLabFonts } from "./LabShell";
import {
  ACTIVITY_BY_ID,
  BODY_ACTIVITIES,
  BREATH_PHASES,
  HEARTBEAT_CHALLENGES,
  createHeartbeatBreathState,
  effectiveBpm,
  reduceHeartbeatBreath,
} from "./heartbeatBreathEngine";
import { useLabActive } from "./useLabActive";

export function HeartbeatBreathLabView({
  active = true,
  saved,
  onToggleSaved,
}: {
  sound: boolean;
  active?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const [state, dispatch] = useReducer(reduceHeartbeatBreath, undefined, createHeartbeatBreathState);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [oxygenPhase, setOxygenPhase] = useState(0);
  const [bubbleProgress, setBubbleProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const bubbleElapsedMsRef = useRef(0);
  const isActive = useLabActive(active);
  const { displayBold, headingBold, bodyFont } = useLabFonts();
  const meta = DISCOVERY_LAB_MAP["heartbeat-breath-lab"];

  const bpm = effectiveBpm(state);
  const activeMeta = ACTIVITY_BY_ID[state.activity];
  const currentBreathStep = BREATH_PHASES[state.breathPhaseIndex];
  const challenge = HEARTBEAT_CHALLENGES[state.challengeIndex];
  const challengeDone = challenge.check(state);

  useEffect(() => {
    let mounted = true;
    if (typeof AccessibilityInfo?.isReduceMotionEnabled === "function") {
      void AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          if (mounted) setReduceMotion(!!enabled);
        })
        .catch(() => {});
    }
    const sub =
      typeof AccessibilityInfo?.addEventListener === "function"
        ? AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
            if (mounted) setReduceMotion(!!enabled);
          })
        : null;
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const liveRef = useRef({
    bpm,
    breathsPerMin: activeMeta.breathsPerMin,
    oxygenSpeed: activeMeta.oxygenSpeed,
    autoBubble: state.autoBubble,
    breathPhaseIndex: state.breathPhaseIndex,
    reduceMotion,
  });
  useEffect(() => {
    liveRef.current = {
      bpm,
      breathsPerMin: activeMeta.breathsPerMin,
      oxygenSpeed: activeMeta.oxygenSpeed,
      autoBubble: state.autoBubble,
      breathPhaseIndex: state.breathPhaseIndex,
      reduceMotion,
    };
  }, [bpm, activeMeta.breathsPerMin, activeMeta.oxygenSpeed, state.autoBubble, state.breathPhaseIndex, reduceMotion]);

  // Smooth requestAnimationFrame heart pulse, activity-driven lung breathing, oxygen flow,
  // and optional Calm Breath Bubble progression (zero setTimeout/setInterval).
  // Cancels cleanly on blur/background and resets elapsed timestamps on resume or manual step.
  useEffect(() => {
    if (!isActive) {
      bubbleElapsedMsRef.current = 0;
      return;
    }
    if (typeof requestAnimationFrame !== "function" || typeof cancelAnimationFrame !== "function") return;
    let rafId = 0;
    let lastTs = 0;

    const tick = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dtMs = Math.min(80, Math.max(0, ts - lastTs));
      lastTs = ts;

      const cur = liveRef.current;
      if (!cur.reduceMotion) {
        const beatsPerMs = cur.bpm / 60_000;
        const breathsPerMs = cur.breathsPerMin / 60_000;
        setPulsePhase((prev) => (prev + dtMs * beatsPerMs * Math.PI * 2) % (Math.PI * 2));
        setBreathPhase((prev) => (prev + dtMs * breathsPerMs * Math.PI * 2) % (Math.PI * 2));
        setOxygenPhase((prev) => (prev + dtMs * 0.0005 * cur.oxygenSpeed) % 1);
      }

      if (cur.autoBubble) {
        bubbleElapsedMsRef.current += dtMs;
        const phaseDuration = BREATH_PHASES[cur.breathPhaseIndex].durationMs;
        if (bubbleElapsedMsRef.current >= phaseDuration) {
          bubbleElapsedMsRef.current = 0;
          setBubbleProgress(0);
          dispatch({ type: "next-breath-phase" });
        } else {
          setBubbleProgress(Math.min(1, bubbleElapsedMsRef.current / phaseDuration));
        }
      } else {
        bubbleElapsedMsRef.current = 0;
        setBubbleProgress(0);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      bubbleElapsedMsRef.current = 0;
      cancelAnimationFrame(rafId);
    };
  }, [isActive]);

  const handleManualNextBreath = () => {
    bubbleElapsedMsRef.current = 0;
    setBubbleProgress(0);
    dispatch({ type: "next-breath-phase" });
  };

  const handleToggleAutoBubble = () => {
    bubbleElapsedMsRef.current = 0;
    setBubbleProgress(0);
    dispatch({ type: "toggle-auto-bubble" });
  };

  const handleReset = () => {
    bubbleElapsedMsRef.current = 0;
    setPulsePhase(0);
    setBreathPhase(0);
    setOxygenPhase(0);
    setBubbleProgress(0);
    dispatch({ type: "reset" });
  };

  // Heartbeat scale thump (sharp lub-dub peak; calm static scale under reduced motion)
  const beatWave = reduceMotion ? 0 : Math.pow(Math.max(0, Math.sin(pulsePhase)), 4);
  const heartScale = Number((1 + beatWave * 0.16).toFixed(3));

  // Activity-driven smooth lung expansion/contraction, seamlessly coordinated with Calm Breath Bubble
  let lungScale: number;
  let bubbleRadius: number;
  if (state.autoBubble && !reduceMotion) {
    if (currentBreathStep.id === "inhale") {
      lungScale = 0.88 + bubbleProgress * 0.22;
      bubbleRadius = 28 + bubbleProgress * 20;
    } else if (currentBreathStep.id === "hold") {
      lungScale = 1.1;
      bubbleRadius = 48;
    } else {
      lungScale = 1.1 - bubbleProgress * 0.22;
      bubbleRadius = 48 - bubbleProgress * 20;
    }
  } else if (state.activity === "calm-breath" || reduceMotion) {
    lungScale = currentBreathStep.id === "exhale" ? 0.88 : 1.08;
    bubbleRadius = currentBreathStep.id === "exhale" ? 28 : 48;
  } else {
    // Continuous sinusoidal breathing driven by activeMeta.breathsPerMin!
    lungScale = 0.96 + Math.sin(breathPhase) * 0.12;
    bubbleRadius = currentBreathStep.id === "exhale" ? 28 : 48;
  }
  const lungScaleRounded = Number(lungScale.toFixed(3));
  const bubbleRadiusRounded = Number(bubbleRadius.toFixed(1));

  return (
    <LabShell
      meta={meta}
      discoveryTitle={`${activeMeta.label} · ${bpm} Beats / Min · ${activeMeta.breathsPerMin} Breaths / Min`}
      discoveryText={activeMeta.discovery}
      challengePrompt={challenge.prompt}
      challengeHint={challenge.hint}
      challengeDone={challengeDone}
      onNextChallenge={() => dispatch({ type: "next-challenge" })}
      onReset={handleReset}
      saved={saved}
      onToggleSaved={onToggleSaved}
    >
      {/* Activity Selector */}
      <View style={ls.stageCard}>
        <Text maxFontSizeMultiplier={1.3} style={[headingBold, { fontSize: 16, color: palette.ink }]}>
          Pick what your body is doing:
        </Text>
        <View style={ls.row}>
          {BODY_ACTIVITIES.map((item) => (
            <LabButton
              key={item.id}
              testID={`body-activity-${item.id}`}
              selected={state.activity === item.id}
              accentColor={item.accentColor}
              onPress={() => dispatch({ type: "set-activity", activity: item.id })}
              style={{ flexGrow: 1, minWidth: 112 }}
            >
              {item.label}
            </LabButton>
          ))}
        </View>

        {/* Animated Heart, Lungs, and Oxygen Flow SVG */}
        <View style={{ width: "100%", height: 224, borderRadius: 20, overflow: "hidden", backgroundColor: activeMeta.tintColor }}>
          <Svg width="100%" height="100%" viewBox="0 0 360 220" accessible={false}>
            <Rect width={360} height={220} fill={activeMeta.tintColor} />

            {/* Blood Vessel Track from Lungs to Heart */}
            <Path
              d="M110 112 C 152 62, 208 62, 250 112 C 208 164, 152 164, 110 112 Z"
              fill="none"
              stroke="#E2A4AE"
              strokeWidth={10}
            />

            {/* Moving Oxygen Bubbles along the loop */}
            {[0, 0.25, 0.5, 0.75].map((offset) => {
              const t = (oxygenPhase + offset) % 1;
              const angle = t * Math.PI * 2;
              const ox = 180 + Math.cos(angle) * 68;
              const oy = 112 + Math.sin(angle) * 44;
              const oxygenated = Math.sin(angle) <= 0;
              return (
                <Circle
                  key={offset}
                  cx={ox}
                  cy={oy}
                  r={6.5}
                  fill={oxygenated ? "#4BA8D8" : "#D65A6C"}
                  stroke="#FFFDF8"
                  strokeWidth={2}
                />
              );
            })}

            {/* Pulsing Heart (Left) */}
            <G testID="heartbeat-heart-group" transform={`translate(96 112) scale(${heartScale}) translate(-96 -112)`}>
              <Circle cx={96} cy={112} r={50} fill="#F9D2DC" />
              <Path
                d="M96 146 C 52 118, 56 78, 79 78 C 89 78, 94 86, 96 92 C 98 86, 103 78, 113 78 C 136 78, 140 118, 96 146 Z"
                fill="#D64860"
                stroke="#3D2B24"
                strokeWidth={3}
              />
              <Path d="M78 96 Q 82 88 90 92" fill="none" stroke="#FFFDF8" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
            </G>

            {/* Breathing Lungs (Right) */}
            <G testID="heartbeat-lungs-group" transform={`translate(264 112) scale(${lungScaleRounded}) translate(-264 -112)`}>
              <Circle cx={264} cy={112} r={52} fill="#D9EFEA" />
              <Line x1={264} y1={72} x2={264} y2={100} stroke="#3D2B24" strokeWidth={4} strokeLinecap="round" />
              <Path d="M258 84 Q 232 88 230 124 Q 234 144 258 136 Z" fill="#F09BA8" stroke="#3D2B24" strokeWidth={2.5} />
              <Path d="M270 84 Q 296 88 298 124 Q 294 144 270 136 Z" fill="#F09BA8" stroke="#3D2B24" strokeWidth={2.5} />
            </G>
          </Svg>
        </View>

        {/* Big Kid-Friendly Metrics Row */}
        <View style={ls.row}>
          <View style={{ flex: 1, minWidth: 130, backgroundColor: "#FFF6E5", borderRadius: 16, padding: 12, alignItems: "center" }}>
            <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 26, color: activeMeta.accentColor }]}>
              {`${bpm} BPM`}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={[bodyFont, { fontSize: 13.5, color: palette.muted }]}>
              Heartbeats each minute
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 130, backgroundColor: "#E4F3EF", borderRadius: 16, padding: 12, alignItems: "center" }}>
            <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 26, color: "#1E6B66" }]}>
              {`${activeMeta.breathsPerMin}/min`}
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={[bodyFont, { fontSize: 13.5, color: palette.muted }]}>
              Breaths each minute
            </Text>
          </View>
        </View>
      </View>

      {/* Tap-Guided Calm Breath Bubble */}
      <View testID="calm-breath-bubble-card" style={[ls.stageCard, { backgroundColor: "#EDF7F4", borderColor: "#9BC7C2" }]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text maxFontSizeMultiplier={1.35} style={[displayBold, { fontSize: 20, color: "#1E6B66" }]}>
            Calm Breath Bubble
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={[headingBold, { fontSize: 14, color: palette.muted }]}>
            {`Calm breaths: ${state.calmBreathsCompleted}`}
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <View style={{ width: 126, height: 126, alignItems: "center", justifyContent: "center" }}>
            <Svg width={126} height={126} viewBox="0 0 126 126" accessible={false}>
              <Circle cx={63} cy={63} r={56} fill="#D5EFE8" stroke="#85BFB5" strokeWidth={2.5} strokeDasharray="5 5" />
              <Circle cx={63} cy={63} r={bubbleRadiusRounded} fill="#6BC0B2" fillOpacity={0.78} stroke="#1E6B66" strokeWidth={3} />
              <Circle cx={52} cy={52} r={bubbleRadiusRounded * 0.25} fill="#FFFDF8" opacity={0.65} />
            </Svg>
          </View>
          <View style={{ flex: 1, minWidth: 200, gap: 8 }}>
            <Text maxFontSizeMultiplier={1.4} style={[displayBold, { fontSize: 22, color: palette.ink }]}>
              {currentBreathStep.label}
            </Text>
            <Text style={[bodyFont, { fontSize: 16.5, lineHeight: 24, color: palette.muted }]}>
              {currentBreathStep.cue}
            </Text>
            <View style={ls.row}>
              <LabButton
                testID="breath-next-step-btn"
                selected
                accentColor="#1E6B66"
                onPress={handleManualNextBreath}
              >
                Next Breath Step
              </LabButton>
              <LabButton
                testID="breath-auto-toggle"
                selected={state.autoBubble}
                accentColor="#488261"
                onPress={handleToggleAutoBubble}
              >
                {state.autoBubble ? "Pause Bubble" : "Follow Calm Bubble"}
              </LabButton>
            </View>
          </View>
        </View>
      </View>
    </LabShell>
  );
}
