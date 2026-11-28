import React, { useEffect, useReducer, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { Text } from "../../components/Text";
import { palette } from "../ui";
import { DISCOVERY_LAB_MAP } from "./registry";
import { LabButton, LabShell, ls, useLabFonts } from "./LabShell";
import {
  PHYSICS_CHALLENGES,
  RAMP_HEIGHTS,
  RAMP_SURFACES,
  WEIGHT_BY_ID,
  WEIGHT_OBJECTS,
  computeSeesawPhysics,
  createRampBalanceState,
  reduceRampBalance,
  type WeightObjectId,
} from "./rampBalanceEngine";
import { useLabActive } from "./useLabActive";

function IslandWeightIcon({ objectId, cx, cy }: { objectId: WeightObjectId; cx: number; cy: number }) {
  if (objectId === "coconut") {
    return (
      <G>
        <Circle cx={cx} cy={cy} r={12} fill="#7D5236" stroke="#3D2B24" strokeWidth={2.5} />
        <Circle cx={cx - 4} cy={cy - 3} r={2} fill="#3D2B24" />
        <Circle cx={cx + 3} cy={cy - 3} r={2} fill="#3D2B24" />
      </G>
    );
  }
  if (objectId === "pineapple") {
    return (
      <G>
        <Ellipse cx={cx} cy={cy} rx={11} ry={15} fill="#EBAD34" stroke="#3D2B24" strokeWidth={2.5} />
        <Path d={`M${cx} ${cy - 15}L${cx - 6} ${cy - 24}M${cx} ${cy - 15}L${cx} ${cy - 26}M${cx} ${cy - 15}L${cx + 6} ${cy - 24}`} stroke="#3D7A47" strokeWidth={3} strokeLinecap="round" />
      </G>
    );
  }
  if (objectId === "turtle") {
    return (
      <G>
        <Ellipse cx={cx} cy={cy + 2} rx={16} ry={11} fill="#4D8A65" stroke="#3D2B24" strokeWidth={2.5} />
        <Circle cx={cx + 16} cy={cy - 1} r={5} fill="#6CA678" stroke="#3D2B24" strokeWidth={2} />
      </G>
    );
  }
  return (
    <G>
      <Path d={`M${cx - 10} ${cy + 14}L${cx - 8} ${cy - 6}L${cx + 8} ${cy - 6}L${cx + 10} ${cy + 14}Z`} fill="#9B9388" stroke="#3D2B24" strokeWidth={2.5} />
      <Path d={`M${cx - 15} ${cy - 6}Q${cx} ${cy - 22} ${cx + 15} ${cy - 6}Z`} fill="#B5ACA0" stroke="#3D2B24" strokeWidth={2.5} />
    </G>
  );
}

export function RampBalanceLabView({
  active = true,
  saved,
  onToggleSaved,
}: {
  sound: boolean;
  active?: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const [state, dispatch] = useReducer(reduceRampBalance, undefined, createRampBalanceState);
  const [rollProgress, setRollProgress] = useState(0);
  const [rollEpoch, setRollEpoch] = useState(0);
  const completedEpochRef = useRef(0);
  const isActive = useLabActive(active);
  const { displayBold, headingBold, bodyFont } = useLabFonts();
  const meta = DISCOVERY_LAB_MAP["ramp-balance-lab"];

  // Animate ramp racer smoothly with requestAnimationFrame whenever a new run is triggered.
  // Uses a monotonic rollEpoch so Reset never collides with previous run counts and
  // cancels cleanly on Reset, blur, or unmount.
  useEffect(() => {
    if (!isActive || state.runCount === 0 || rollEpoch === 0 || rollEpoch === completedEpochRef.current) return;
    if (typeof requestAnimationFrame !== "function" || typeof cancelAnimationFrame !== "function") {
      completedEpochRef.current = rollEpoch;
      return;
    }
    let rafId = 0;
    let startTs = 0;
    const durationMs = 950;
    const targetEpoch = rollEpoch;
    const step = (ts: number) => {
      if (startTs === 0) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setRollProgress(eased);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        completedEpochRef.current = targetEpoch;
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [rollEpoch, state.runCount, isActive]);

  const handleRoll = () => {
    setRollProgress(0);
    setRollEpoch((prev) => prev + 1);
    dispatch({ type: "roll" });
  };

  const handleReset = () => {
    setRollProgress(0);
    dispatch({ type: "reset" });
  };

  const seesaw = computeSeesawPhysics(state.slots);
  const challenge = PHYSICS_CHALLENGES[state.challengeIndex];
  const challengeDone = challenge.check(state);

  const activeHeight = RAMP_HEIGHTS.find((h) => h.id === state.rampHeight) ?? RAMP_HEIGHTS[1];
  const activeSurface = RAMP_SURFACES.find((s) => s.id === state.rampSurface) ?? RAMP_SURFACES[1];

  // Racer position along ramp + flat track
  const targetRoll = state.lastRun ? state.lastRun.normalizedRoll : 0;
  const currentT = state.lastRun ? rollProgress : 0;
  const rampEndX = 112;
  const trackEndX = 334;
  let racerX = 28;
  let racerY = activeHeight.rampTopY - 12;
  if (state.lastRun) {
    if (currentT < 0.35) {
      const p = currentT / 0.35;
      racerX = 28 + (rampEndX - 28) * p;
      racerY = activeHeight.rampTopY - 12 + (152 - activeHeight.rampTopY) * p;
    } else {
      const p = (currentT - 0.35) / 0.65;
      racerX = rampEndX + (trackEndX - rampEndX) * targetRoll * p;
      racerY = 140;
    }
  }

  return (
    <LabShell
      meta={meta}
      discoveryTitle={
        state.mode === "seesaw"
          ? seesaw.isBalanced
            ? "Perfect Balance!"
            : `Left Torque ${seesaw.leftTorque} · Right Torque ${seesaw.rightTorque}`
          : state.lastRun
            ? `Rolled ${state.lastRun.distanceMeters} m · ${state.lastRun.speedRating}`
            : "Choose Ramp Height & Surface, then Tap Roll!"
      }
      discoveryText={
        state.mode === "seesaw"
          ? seesaw.discovery
          : state.lastRun
            ? state.lastRun.discovery
            : "Pick Low, Medium, or High and compare Slippery Ice, Smooth Wood, and Beach Sand!"
      }
      challengePrompt={challenge.prompt}
      challengeHint={challenge.hint}
      challengeDone={challengeDone}
      onNextChallenge={() => dispatch({ type: "next-challenge" })}
      onReset={handleReset}
      saved={saved}
      onToggleSaved={onToggleSaved}
    >
      {/* Mode Switcher */}
      <View style={ls.row}>
        <LabButton
          testID="physics-mode-seesaw"
          selected={state.mode === "seesaw"}
          accentColor="#9C6B21"
          onPress={() => dispatch({ type: "set-mode", mode: "seesaw" })}
          style={{ flex: 1 }}
        >
          Seesaw Balance
        </LabButton>
        <LabButton
          testID="physics-mode-ramp"
          selected={state.mode === "ramp"}
          accentColor="#2C7E9E"
          onPress={() => dispatch({ type: "set-mode", mode: "ramp" })}
          style={{ flex: 1 }}
        >
          Friction Ramp Race
        </LabButton>
      </View>

      {state.mode === "seesaw" ? (
        <View style={ls.stageCard}>
          {/* Seesaw SVG Visualization */}
          <View style={{ width: "100%", height: 222, borderRadius: 20, overflow: "hidden", backgroundColor: seesaw.isBalanced ? "#EAF5E6" : "#FBF1DC", position: "relative" }}>
            <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, backgroundColor: "#E7D2A7" }} />
            <View style={{ flex: 1, zIndex: 1 }}>
              <Svg width="100%" height="100%" viewBox="0 0 360 220" accessible={false}>
                {/* Center balance marker */}
              <Line x1={180} y1={32} x2={180} y2={122} stroke={seesaw.isBalanced ? "#3D8C4D" : "#D6C29C"} strokeWidth={2} strokeDasharray="4 4" />
              {/* Fulcrum triangle */}
              <Polygon points="154,180 180,124 206,180" fill="#B75C49" stroke="#3D2B24" strokeWidth={3} />
              <Circle cx={180} cy={128} r={6} fill="#FFFDF8" stroke="#3D2B24" strokeWidth={2.5} />

              {/* Tilting seesaw plank & placed treasures */}
              <G rotation={seesaw.tiltDegrees} origin="180,126">
                <Rect x={24} y={118} width={312} height={16} rx={8} fill="#D99B52" stroke="#3D2B24" strokeWidth={3} />
                {([1, 2, 3, 4] as const).map((dist) => {
                  const leftX = 180 - dist * 34;
                  const rightX = 180 + dist * 34;
                  const leftSlot = state.slots.find((s) => s.side === "left" && s.distance === dist);
                  const rightSlot = state.slots.find((s) => s.side === "right" && s.distance === dist);
                  return (
                    <G key={dist}>
                      <Circle cx={leftX} cy={126} r={3.5} fill="#3D2B24" />
                      <Circle cx={rightX} cy={126} r={3.5} fill="#3D2B24" />
                      {leftSlot && <IslandWeightIcon objectId={leftSlot.objectId} cx={leftX} cy={100} />}
                      {rightSlot && <IslandWeightIcon objectId={rightSlot.objectId} cx={rightX} cy={100} />}
                    </G>
                  );
                })}
              </G>
              </Svg>
            </View>
          </View>

          {/* Select Treasure to Place */}
          <Text maxFontSizeMultiplier={1.3} style={[headingBold, { fontSize: 15.5, color: palette.ink }]}>
            1. Pick an island object (each has a different weight):
          </Text>
          <View style={ls.row}>
            {WEIGHT_OBJECTS.map((obj) => (
              <LabButton
                key={obj.id}
                testID={`seesaw-obj-${obj.id}`}
                selected={state.selectedObject === obj.id}
                accentColor={obj.color}
                onPress={() => dispatch({ type: "select-object", objectId: obj.id })}
                style={{ flex: 1, minWidth: 120 }}
              >
                {`${obj.label} (${obj.weight})`}
              </LabButton>
            ))}
          </View>

          {/* Tap Left & Right Numbered Notches */}
          <Text maxFontSizeMultiplier={1.3} style={[headingBold, { fontSize: 15.5, color: palette.ink }]}>
            2. Tap a numbered notch to place or remove it:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <View style={{ flex: 1, minWidth: 230, gap: 6 }}>
              <Text maxFontSizeMultiplier={1.25} style={[bodyFont, { fontSize: 14, color: palette.muted }]}>
                Left Side (distance from center)
              </Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {([4, 3, 2, 1] as const).map((dist) => {
                  const placed = state.slots.find((s) => s.side === "left" && s.distance === dist);
                  const metaObj = placed ? WEIGHT_BY_ID[placed.objectId] : null;
                  return (
                    <Pressable
                      key={dist}
                      testID={`seesaw-slot-left-${dist}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Left notch ${dist}${metaObj ? `, holding ${metaObj.label}, tap to remove` : ", empty, tap to place"}`}
                      onPress={() => dispatch({ type: "toggle-slot", side: "left", distance: dist })}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 54,
                        borderRadius: 14,
                        backgroundColor: metaObj ? metaObj.color : "#FFF6E5",
                        borderWidth: 2,
                        borderColor: metaObj ? "#3D2B24" : "#DEC8A4",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 4,
                        opacity: pressed ? 0.78 : 1,
                      })}
                    >
                      <Text maxFontSizeMultiplier={1.2} style={[displayBold, { fontSize: 15, color: metaObj ? "#FFFDF8" : palette.ink }]}>
                        L{dist}
                      </Text>
                      <Text maxFontSizeMultiplier={1.1} style={[bodyFont, { fontSize: 11, color: metaObj ? "#FFFDF8" : palette.muted }]}>
                        {metaObj ? `wt ${metaObj.weight}` : "tap"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ flex: 1, minWidth: 230, gap: 6 }}>
              <Text maxFontSizeMultiplier={1.25} style={[bodyFont, { fontSize: 14, color: palette.muted }]}>
                Right Side (distance from center)
              </Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {([1, 2, 3, 4] as const).map((dist) => {
                  const placed = state.slots.find((s) => s.side === "right" && s.distance === dist);
                  const metaObj = placed ? WEIGHT_BY_ID[placed.objectId] : null;
                  return (
                    <Pressable
                      key={dist}
                      testID={`seesaw-slot-right-${dist}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Right notch ${dist}${metaObj ? `, holding ${metaObj.label}, tap to remove` : ", empty, tap to place"}`}
                      onPress={() => dispatch({ type: "toggle-slot", side: "right", distance: dist })}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 54,
                        borderRadius: 14,
                        backgroundColor: metaObj ? metaObj.color : "#FFF6E5",
                        borderWidth: 2,
                        borderColor: metaObj ? "#3D2B24" : "#DEC8A4",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 4,
                        opacity: pressed ? 0.78 : 1,
                      })}
                    >
                      <Text maxFontSizeMultiplier={1.2} style={[displayBold, { fontSize: 15, color: metaObj ? "#FFFDF8" : palette.ink }]}>
                        R{dist}
                      </Text>
                      <Text maxFontSizeMultiplier={1.1} style={[bodyFont, { fontSize: 11, color: metaObj ? "#FFFDF8" : palette.muted }]}>
                        {metaObj ? `wt ${metaObj.weight}` : "tap"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={ls.row}>
            <LabButton testID="seesaw-clear-btn" onPress={() => dispatch({ type: "clear-seesaw" })}>
              Clear Seesaw
            </LabButton>
          </View>
        </View>
      ) : (
        <View style={ls.stageCard}>
          {/* Friction Ramp Race Track SVG */}
          <View style={{ width: "100%", height: 210, borderRadius: 20, overflow: "hidden", backgroundColor: "#EBF5F7", position: "relative" }}>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 49,
                backgroundColor: activeSurface.trackColor,
                borderTopWidth: 4,
                borderTopColor: activeSurface.accentColor,
              }}
            />
            <View style={{ flex: 1, zIndex: 1 }}>
              <Svg width="100%" height="100%" viewBox="0 0 360 200" accessible={false}>
                <Circle cx={312} cy={34} r={20} fill="#F5CE62" />
                {/* Distance markers */}
              {[150, 200, 250, 300, 340].map((mx) => (
                <Line key={mx} x1={mx} y1={154} x2={mx} y2={170} stroke={activeSurface.accentColor} strokeWidth={2} />
              ))}
              {/* Ramp wedge */}
              <Polygon
                points={`14,154 14,${activeHeight.rampTopY} ${rampEndX},154`}
                fill="#D9A05B"
                stroke="#3D2B24"
                strokeWidth={3}
              />
              {/* Racer */}
              {state.racer === "car" ? (
                <G>
                  <Rect x={racerX - 16} y={racerY - 12} width={32} height={16} rx={7} fill="#E05A47" stroke="#3D2B24" strokeWidth={2.5} />
                  <Circle cx={racerX - 9} cy={racerY + 6} r={6} fill="#3D2B24" />
                  <Circle cx={racerX + 9} cy={racerY + 6} r={6} fill="#3D2B24" />
                </G>
              ) : (
                <G>
                  <Circle cx={racerX} cy={racerY} r={13} fill="#7D5236" stroke="#3D2B24" strokeWidth={2.5} />
                  <Circle cx={racerX - 3} cy={racerY - 3} r={2.2} fill="#3D2B24" />
                  <Circle cx={racerX + 4} cy={racerY - 2} r={2.2} fill="#3D2B24" />
                </G>
              )}
              </Svg>
            </View>
          </View>

          {/* Ramp Controls */}
          <View style={ls.row}>
            <Text maxFontSizeMultiplier={1.25} style={[headingBold, { fontSize: 15, color: palette.ink }]}>
              Ramp Height:
            </Text>
            {RAMP_HEIGHTS.map((h) => (
              <LabButton
                key={h.id}
                testID={`ramp-height-${h.id}`}
                selected={state.rampHeight === h.id}
                accentColor="#9C6B21"
                onPress={() => dispatch({ type: "set-height", height: h.id })}
              >
                {h.label}
              </LabButton>
            ))}
          </View>

          <View style={ls.row}>
            <Text maxFontSizeMultiplier={1.25} style={[headingBold, { fontSize: 15, color: palette.ink }]}>
              Surface:
            </Text>
            {RAMP_SURFACES.map((surface) => (
              <LabButton
                key={surface.id}
                testID={`ramp-surface-${surface.id}`}
                selected={state.rampSurface === surface.id}
                accentColor={surface.accentColor}
                onPress={() => dispatch({ type: "set-surface", surface: surface.id })}
              >
                {surface.label}
              </LabButton>
            ))}
          </View>

          <View style={ls.row}>
            <LabButton
              testID="ramp-racer-car"
              selected={state.racer === "car"}
              accentColor="#C85A3F"
              onPress={() => dispatch({ type: "set-racer", racer: "car" })}
            >
              Toy Car
            </LabButton>
            <LabButton
              testID="ramp-racer-coconut"
              selected={state.racer === "coconut"}
              accentColor="#7D5236"
              onPress={() => dispatch({ type: "set-racer", racer: "coconut" })}
            >
              Coconut
            </LabButton>
            <LabButton
              testID="ramp-roll-btn"
              selected
              accentColor="#1E6B66"
              onPress={handleRoll}
              style={{ flex: 1 }}
            >
              Roll Down Ramp!
            </LabButton>
          </View>

          {/* Recent Race Comparison Log */}
          {state.runHistory.length > 0 && (
            <View style={{ backgroundColor: "#FFF6E5", borderRadius: 16, padding: 12, gap: 6 }}>
              <Text maxFontSizeMultiplier={1.25} style={[headingBold, { fontSize: 14.5, color: palette.ink }]}>
                Recent Ramp Races:
              </Text>
              {state.runHistory.map((run, idx) => (
                <Text key={`${run.surface}-${run.height}-${idx}`} style={[bodyFont, { fontSize: 14, color: palette.muted }]}>
                  • {run.distanceMeters} m — {run.surface} ({run.height} ramp, {run.racer})
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </LabShell>
  );
}
