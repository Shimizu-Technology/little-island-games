import React, { useReducer } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { Text } from "../../components/Text";
import { palette } from "../ui";
import { DISCOVERY_LAB_MAP } from "./registry";
import { LabButton, LabShell, LabStepper, ls, useLabFonts } from "./LabShell";
import {
  ISLAND_STAGES,
  VOLCANO_CHALLENGES,
  createVolcanoIslandState,
  reduceVolcanoIsland,
} from "./volcanoIslandEngine";

export function VolcanoIslandLabView({
  saved,
  onToggleSaved,
}: {
  sound: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const [state, dispatch] = useReducer(reduceVolcanoIsland, undefined, createVolcanoIslandState);
  const { displayBold, bodyFont } = useLabFonts();
  const meta = DISCOVERY_LAB_MAP["volcano-island-lab"];

  const stageInfo = ISLAND_STAGES[state.stage];
  const challenge = VOLCANO_CHALLENGES[state.challengeIndex];
  const challengeDone = challenge.check(state);

  // Peak vertical position rises smoothly as stages advance from deep ocean floor up into the sky!
  const peakY = Math.round(215 - stageInfo.elevationRatio * 155);
  const magmaGlow = 0.35 + (state.magmaHeat / 5) * 0.65;

  return (
    <LabShell
      meta={meta}
      discoveryTitle={`Stage ${state.stage + 1} of 6 · ${stageInfo.title}`}
      discoveryText={state.feedback}
      challengePrompt={challenge.prompt}
      challengeHint={challenge.hint}
      challengeDone={challengeDone}
      onNextChallenge={() => dispatch({ type: "next-challenge" })}
      onReset={() => dispatch({ type: "reset" })}
      saved={saved}
      onToggleSaved={onToggleSaved}
    >
      <View style={ls.stageCard}>
        {/* Pacific Ocean Cross-Section SVG */}
        <View style={{ width: "100%", height: 244, borderRadius: 20, overflow: "hidden", backgroundColor: state.stage >= 4 ? "#E4F3F7" : "#FBEBD0", position: "relative" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 116, height: 58, backgroundColor: state.reefWarmth >= 3 ? "#5FC0C8" : "#4E8EA8" }} />
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 173, height: 42, backgroundColor: "#2F6E8A" }} />
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 33, backgroundColor: "#5C443B" }} />
          <View style={{ flex: 1, zIndex: 1 }}>
            <Svg width="100%" height="100%" viewBox="0 0 360 240" accessible={false}>
              <Circle cx={56} cy={38} r={22} fill="#F5C954" />
              {/* Deep Magma Chamber */}
              <Ellipse cx={180} cy={234} rx={72 + state.magmaHeat * 8} ry={22 + state.pressure * 2} fill="#E85A34" opacity={magmaGlow} />
            <Ellipse cx={180} cy={236} rx={48 + state.magmaHeat * 5} ry={14} fill="#F7B32B" opacity={magmaGlow} />

            {/* Steam & Ash Plume during eruption */}
            {stageInfo.hasLava && state.stage === 2 && (
              <G>
                <Circle cx={158} cy={peakY - 26} r={16} fill="#FFFDF8" opacity={0.92} />
                <Circle cx={182} cy={peakY - 34} r={21} fill="#FFFDF8" opacity={0.94} />
                <Circle cx={204} cy={peakY - 24} r={15} fill="#FFFDF8" opacity={0.9} />
                <Circle cx={170} cy={peakY - 12} r={6} fill="#F7B32B" />
                <Circle cx={194} cy={peakY - 14} r={5} fill="#E85A34" />
              </G>
            )}

            {/* Rising Underwater Seamount / Volcanic Cone / Island */}
            <Path
              d={`M${68 - state.stage * 4} 214 L${160 - state.stage * 2} ${peakY} L${200 + state.stage * 2} ${peakY} L${292 + state.stage * 4} 214 Z`}
              fill={state.stage >= 5 ? "#6E8F5B" : "#5D524C"}
              stroke="#3D2B24"
              strokeWidth={3}
            />

            {/* Sandy beaches on Stage 5 */}
            {stageInfo.hasPalms && (
              <G>
                <Path d="M88 124Q132 104 180 106Q228 104 272 124Q228 134 180 132Q132 134 88 124Z" fill="#F2D7A0" stroke="#3D2B24" strokeWidth={2} />
                {/* Left Palm Tree */}
                <Path d="M134 114Q124 88 118 68" fill="none" stroke="#8C5D39" strokeWidth={5.5} strokeLinecap="round" />
                <Path d="M118 68Q98 62 88 76M118 68Q126 52 144 62M118 68Q104 78 96 92" fill="none" stroke="#3E8248" strokeWidth={5} strokeLinecap="round" />
                {/* Right Palm Tree */}
                <Path d="M226 114Q238 88 244 70" fill="none" stroke="#8C5D39" strokeWidth={5.5} strokeLinecap="round" />
                <Path d="M244 70Q264 62 274 78M244 70Q234 54 218 64M244 70Q256 80 264 94" fill="none" stroke="#3E8248" strokeWidth={5} strokeLinecap="round" />
                {/* Little coconuts under palms */}
                <Circle cx={118} cy={74} r={4} fill="#6E4427" />
                <Circle cx={242} cy={76} r={4} fill="#6E4427" />
              </G>
            )}

            {/* Central Magma Conduit & Glowing Lava */}
            {stageInfo.hasLava && (
              <G>
                <Path d={`M171 224 L175 ${peakY + 4} L185 ${peakY + 4} L189 224 Z`} fill="#E85A34" />
                <Path
                  d={`M164 ${peakY + 2} Q180 ${peakY - 12} 196 ${peakY + 2} L190 ${peakY + 22} Q180 ${peakY + 12} 170 ${peakY + 24} Z`}
                  fill="#F7A828"
                />
              </G>
            )}

            {/* Underwater Coral Reef Ring (Stages 4-5) */}
            {stageInfo.hasCoral && (
              <G>
                <Path d="M54 156Q72 136 92 152Q104 140 116 158H54Z" fill="#E67465" stroke="#3D2B24" strokeWidth={2} />
                <Path d="M244 158Q260 138 278 152Q294 140 308 158H244Z" fill="#EBA646" stroke="#3D2B24" strokeWidth={2} />
                <Circle cx={84} cy={146} r={5} fill="#F5D35C" />
                <Circle cx={276} cy={148} r={5} fill="#D9627B" />
                {/* Tiny reef fish */}
                <Ellipse cx={48} cy={136} rx={7} ry={4} fill="#F5D35C" stroke="#3D2B24" strokeWidth={1.5} />
                <Ellipse cx={314} cy={138} rx={7} ry={4} fill="#F28B50" stroke="#3D2B24" strokeWidth={1.5} />
              </G>
            )}

            {/* Ocean Surface Wave Line */}
            <Path
              d="M0 116Q30 108 60 116T120 116T180 116T240 116T300 116T360 116"
              fill="none"
              stroke="#FFFDF8"
              strokeWidth={4}
            />
            </Svg>
          </View>
        </View>

        {/* Stage Progress Pills */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {ISLAND_STAGES.map((entry) => {
            const reached = state.stage >= entry.stage;
            return (
              <View
                key={entry.stage}
                style={{
                  backgroundColor: reached ? "#B75C49" : "#F4E8D1",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[bodyFont, { fontSize: 12, color: reached ? "#FFFDF8" : palette.muted }]}
                >
                  {entry.stage + 1}. {entry.title.split(" ")[0]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Earth & Ocean Controls */}
        <View style={ls.row}>
          <LabStepper
            label="Magma Heat"
            value={state.magmaHeat}
            accentColor="#D95338"
            onChange={(value) => dispatch({ type: "set-heat", value })}
            testIDPrefix="volcano-heat"
          />
          <LabStepper
            label="Pressure"
            value={state.pressure}
            accentColor="#B86B22"
            onChange={(value) => dispatch({ type: "set-pressure", value })}
            testIDPrefix="volcano-pressure"
          />
          <LabStepper
            label="Reef Warmth"
            value={state.reefWarmth}
            accentColor="#1E6B66"
            onChange={(value) => dispatch({ type: "set-reef-warmth", value })}
            testIDPrefix="volcano-warmth"
          />
        </View>

        {/* Step-by-Step Island Builder Action Buttons */}
        <View style={ls.row}>
          <LabButton
            testID="volcano-erupt-btn"
            selected={state.stage < 2}
            accentColor="#D94A32"
            onPress={() => dispatch({ type: "erupt" })}
            style={{ flex: 1, minWidth: 132 }}
          >
            <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 16.5, color: state.stage < 2 ? "#FFFDF8" : palette.ink }]}>
              Erupt Volcano!
            </Text>
          </LabButton>
          <LabButton
            testID="volcano-cool-btn"
            selected={state.stage === 2}
            accentColor="#4C6670"
            onPress={() => dispatch({ type: "cool-lava" })}
            style={{ flex: 1, minWidth: 132 }}
          >
            Cool Lava Rock
          </LabButton>
          <LabButton
            testID="volcano-reef-btn"
            selected={state.stage === 3}
            accentColor="#1E6B66"
            onPress={() => dispatch({ type: "grow-reef" })}
            style={{ flex: 1, minWidth: 132 }}
          >
            Grow Coral Reef
          </LabButton>
          <LabButton
            testID="volcano-palms-btn"
            selected={state.stage === 4}
            accentColor="#3D7A47"
            onPress={() => dispatch({ type: "sprout-island" })}
            style={{ flex: 1, minWidth: 132 }}
          >
            Sprout Palms
          </LabButton>
        </View>
      </View>
    </LabShell>
  );
}
