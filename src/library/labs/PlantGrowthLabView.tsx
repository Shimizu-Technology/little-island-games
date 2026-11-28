import React, { useReducer } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import { Text } from "../../components/Text";
import { palette } from "../ui";
import { DISCOVERY_LAB_MAP } from "./registry";
import { LabButton, LabShell, LabStepper, ls, useLabFonts } from "./LabShell";
import {
  ISLAND_PLANTS,
  PLANT_BY_ID,
  PLANT_CHALLENGES,
  createPlantGrowthState,
  reducePlantGrowth,
  stageTitle,
} from "./plantGrowthEngine";

export function PlantGrowthLabView({
  saved,
  onToggleSaved,
}: {
  sound: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const [state, dispatch] = useReducer(reducePlantGrowth, undefined, () => createPlantGrowthState("coconut-palm"));
  const { displayBold, bodyFont } = useLabFonts();
  const meta = DISCOVERY_LAB_MAP["plant-growth-lab"];

  const species = PLANT_BY_ID[state.plantId];
  const challenge = PLANT_CHALLENGES[state.challengeIndex];
  const challengeDone = challenge.check(state);

  const droop = state.mood === "thirsty" ? 14 : 0;
  const stemHeight = Math.round(18 + (state.growth / 100) * 96);
  const stemTopY = 154 - stemHeight;
  const rootDepth = Math.round(12 + (state.growth / 100) * 52);

  return (
    <LabShell
      meta={meta}
      discoveryTitle={`Day ${state.day} · ${stageTitle(state.stage, state.plantId)}`}
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
        {/* Choose Guam Island Plant */}
        <View style={ls.row}>
          {ISLAND_PLANTS.map((plant) => (
            <LabButton
              key={plant.id}
              testID={`plant-species-${plant.id}`}
              selected={state.plantId === plant.id}
              accentColor={plant.accentColor}
              onPress={() => dispatch({ type: "select-plant", plantId: plant.id })}
              style={{ flex: 1, minWidth: 118 }}
            >
              {plant.title}
            </LabButton>
          ))}
        </View>

        {/* Soil & Sky Garden Cross-Section SVG */}
        <View style={{ width: "100%", height: 248, borderRadius: 20, overflow: "hidden", backgroundColor: state.sunlight <= 1 ? "#CFDCE0" : state.sunlight >= 4 ? "#E2F4FB" : "#E8F2E4", position: "relative" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 88, height: 11, backgroundColor: "#6CA361" }} />
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 89, backgroundColor: state.mood === "thirsty" ? "#B08962" : "#80583C" }} />
          <View style={{ flex: 1, zIndex: 1 }}>
            <Svg width="100%" height="100%" viewBox="0 0 360 240" accessible={false}>
              {/* Sun */}
              <Circle cx={58} cy={42} r={14 + state.sunlight * 3.5} fill="#F7C948" opacity={0.45 + state.sunlight * 0.11} />
            {state.sunlight >= 3 && (
              <G stroke="#F2B830" strokeWidth={2.5} strokeLinecap="round">
                <Line x1={58} y1={10} x2={58} y2={18} />
                <Line x1={58} y1={66} x2={58} y2={74} />
                <Line x1={26} y1={42} x2={34} y2={42} />
                <Line x1={82} y1={42} x2={90} y2={42} />
              </G>
            )}

            {/* Rain Cloud & Raindrops */}
            <G opacity={state.rainwater >= 2 ? 1 : 0.35}>
              <Path d="M254 44Q246 28 264 26Q276 14 294 24Q312 22 314 38Q314 50 294 50H262Z" fill="#B5D7E4" stroke="#3D2B24" strokeWidth={2} />
              {Array.from({ length: state.rainwater }, (_, i) => (
                <Line
                  key={i}
                  x1={258 + i * 12}
                  y1={56}
                  x2={254 + i * 12}
                  y2={72}
                  stroke="#3B8AC4"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              ))}
            </G>

            {/* Puddle when soaked */}
            {state.mood === "soaked" && <Ellipse cx={180} cy={154} rx={58} ry={6} fill="#5AA9D6" opacity={0.78} />}

            {/* Seed & Growing Roots */}
            <Ellipse cx={180} cy={166} rx={11} ry={8} fill="#6E4427" stroke="#3D2B24" strokeWidth={2} />
            {state.stage >= 1 && (
              <G stroke="#EAD2A4" strokeWidth={3.5} strokeLinecap="round" fill="none">
                <Path d={`M180 170 Q 172 ${170 + rootDepth * 0.5} ${160 - state.stage * 4} ${170 + rootDepth}`} />
                <Path d={`M180 170 Q 182 ${170 + rootDepth * 0.6} 180 ${172 + rootDepth}`} />
                <Path d={`M180 170 Q 190 ${170 + rootDepth * 0.5} ${200 + state.stage * 4} ${170 + rootDepth}`} />
              </G>
            )}

            {/* Growing Plant Shoot / Trunk / Leaves / Fruit */}
            {state.stage >= 1 && (
              <G>
                <Path
                  d={`M180 156 Q ${state.plantId === "coconut-palm" ? 174 : 180} ${156 - stemHeight * 0.5} 180 ${stemTopY}`}
                  fill="none"
                  stroke={state.stage >= 3 && state.plantId !== "hibiscus" ? "#8C5D39" : "#3E8248"}
                  strokeWidth={state.stage >= 3 ? 9 : 6}
                  strokeLinecap="round"
                />
                {/* Leaves */}
                {state.stage >= 2 && (
                  <G>
                    <Path
                      d={`M179 ${stemTopY + 20} Q 146 ${stemTopY + 8 + droop} 138 ${stemTopY + 26 + droop} Q 162 ${stemTopY + 28} 179 ${stemTopY + 20} Z`}
                      fill="#529A58"
                      stroke="#3D2B24"
                      strokeWidth={2}
                    />
                    <Path
                      d={`M181 ${stemTopY + 14} Q 214 ${stemTopY + 2 + droop} 222 ${stemTopY + 20 + droop} Q 198 ${stemTopY + 22} 181 ${stemTopY + 14} Z`}
                      fill="#529A58"
                      stroke="#3D2B24"
                      strokeWidth={2}
                    />
                  </G>
                )}
                {/* Full Crown / Fronds / Blooms */}
                {state.stage >= 3 && state.plantId === "coconut-palm" && (
                  <G>
                    <Path
                      d={`M180 ${stemTopY} Q 142 ${stemTopY - 14 + droop} 120 ${stemTopY + 10 + droop}`}
                      fill="none"
                      stroke="#3E8248"
                      strokeWidth={7}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M180 ${stemTopY} Q 218 ${stemTopY - 14 + droop} 240 ${stemTopY + 10 + droop}`}
                      fill="none"
                      stroke="#3E8248"
                      strokeWidth={7}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M180 ${stemTopY} Q 164 ${stemTopY - 28} 142 ${stemTopY - 16 + droop}`}
                      fill="none"
                      stroke="#58A85D"
                      strokeWidth={6}
                      strokeLinecap="round"
                    />
                    <Path
                      d={`M180 ${stemTopY} Q 196 ${stemTopY - 28} 218 ${stemTopY - 16 + droop}`}
                      fill="none"
                      stroke="#58A85D"
                      strokeWidth={6}
                      strokeLinecap="round"
                    />
                    {state.stage === 4 && (
                      <G>
                        <Circle cx={173} cy={stemTopY + 8} r={7} fill="#7B4E2D" stroke="#3D2B24" strokeWidth={2} />
                        <Circle cx={187} cy={stemTopY + 8} r={7} fill="#7B4E2D" stroke="#3D2B24" strokeWidth={2} />
                        <Circle cx={180} cy={stemTopY + 15} r={7} fill="#7B4E2D" stroke="#3D2B24" strokeWidth={2} />
                      </G>
                    )}
                  </G>
                )}

                {state.stage >= 3 && state.plantId === "hibiscus" && (
                  <G>
                    <Circle cx={180} cy={stemTopY - 4} r={state.stage === 4 ? 14 : 8} fill="#E05263" stroke="#3D2B24" strokeWidth={2} />
                    {state.stage === 4 && (
                      <G>
                        <Circle cx={166} cy={stemTopY + 4} r={12} fill="#E05263" stroke="#3D2B24" strokeWidth={2} />
                        <Circle cx={194} cy={stemTopY + 4} r={12} fill="#E05263" stroke="#3D2B24" strokeWidth={2} />
                        <Circle cx={172} cy={stemTopY + 16} r={11} fill="#E05263" stroke="#3D2B24" strokeWidth={2} />
                        <Circle cx={188} cy={stemTopY + 16} r={11} fill="#E05263" stroke="#3D2B24" strokeWidth={2} />
                        <Circle cx={180} cy={stemTopY + 6} r={6} fill="#F7C948" stroke="#3D2B24" strokeWidth={1.8} />
                      </G>
                    )}
                  </G>
                )}

                {state.stage >= 3 && state.plantId === "mango-tree" && (
                  <G>
                    <Circle cx={180} cy={stemTopY - 4 + droop * 0.4} r={34} fill="#4A9152" stroke="#3D2B24" strokeWidth={2.5} />
                    <Circle cx={154} cy={stemTopY + 8 + droop * 0.4} r={22} fill="#5AA360" />
                    <Circle cx={206} cy={stemTopY + 8 + droop * 0.4} r={22} fill="#5AA360" />
                    {state.stage === 4 && (
                      <G>
                        <Ellipse cx={162} cy={stemTopY + 6} rx={7} ry={10} fill="#F2A92C" stroke="#3D2B24" strokeWidth={2} />
                        <Ellipse cx={196} cy={stemTopY + 2} rx={7} ry={10} fill="#F2A92C" stroke="#3D2B24" strokeWidth={2} />
                        <Ellipse cx={180} cy={stemTopY - 14} rx={7} ry={10} fill="#F2A92C" stroke="#3D2B24" strokeWidth={2} />
                      </G>
                    )}
                  </G>
                )}
              </G>
            )}
            </Svg>
          </View>
        </View>

        {/* Growth Progress Meter */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text maxFontSizeMultiplier={1.25} style={[bodyFont, { fontSize: 14, color: palette.ink }]}>
              Growth: {state.growth}%
            </Text>
            <Text maxFontSizeMultiplier={1.25} style={[bodyFont, { fontSize: 14, color: species.accentColor }]}>
              Mood: {state.mood === "thriving" ? "Happy & Healthy" : state.mood === "thirsty" ? "Thirsty!" : state.mood === "shady" ? "Needs Sun!" : "Very Puddly"}
            </Text>
          </View>
          <View style={{ height: 14, borderRadius: 7, backgroundColor: "#EFE3CE", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${state.growth}%`, backgroundColor: species.accentColor, borderRadius: 7 }} />
          </View>
        </View>

        {/* Sunlight & Rainwater Steppers */}
        <View style={ls.row}>
          <LabStepper
            label="Sunlight"
            value={state.sunlight}
            accentColor="#D49522"
            onChange={(value) => dispatch({ type: "set-sunlight", value })}
            testIDPrefix="plant-sun"
          />
          <LabStepper
            label="Rainwater"
            value={state.rainwater}
            accentColor="#2C7E9E"
            onChange={(value) => dispatch({ type: "set-rainwater", value })}
            testIDPrefix="plant-water"
          />
        </View>

        {/* User-Driven Next Day / Grow Button */}
        <LabButton
          testID="plant-next-day-btn"
          selected
          accentColor={species.accentColor}
          onPress={() => dispatch({ type: "next-day" })}
          style={{ width: "100%", minHeight: 54 }}
        >
          <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 18, color: "#FFFDF8" }]}>
            {state.stage === 4 ? "Keep Growing (Next Day)" : "Next Day — Grow!"}
          </Text>
        </LabButton>
      </View>
    </LabShell>
  );
}
