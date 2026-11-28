import React, { useReducer } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { Text } from "../../components/Text";
import { palette } from "../ui";
import {
  COLOR_LIGHT_CHALLENGES,
  LIGHT_BEAM_OPTIONS,
  MAX_PAINT_DROPS,
  PIGMENT_OPTIONS,
  computeLightMix,
  computePaintMix,
  createColorLightState,
  reduceColorLight,
} from "./colorLightEngine";
import { DISCOVERY_LAB_MAP } from "./registry";
import { LabButton, LabShell, LabStepper, ls, useLabFonts } from "./LabShell";

const RAINBOW_BANDS = ["#EF4444", "#F97316", "#FACC15", "#22C55E", "#3B82F6", "#6366F1", "#A855F7"] as const;

export function ColorLightLabView({
  saved,
  onToggleSaved,
}: {
  sound: boolean;
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const [state, dispatch] = useReducer(reduceColorLight, undefined, createColorLightState);
  const { displayBold, headingBold, bodyFont } = useLabFonts();
  const meta = DISCOVERY_LAB_MAP["color-light-lab"];

  const paintMix = computePaintMix(state.drops);
  const lightMix = computeLightMix(state.beams, state.prismAngle, state.sunlightThroughPrism);
  const challenge = COLOR_LIGHT_CHALLENGES[state.challengeIndex];
  const challengeDone = challenge.check(state);

  const swirlAngle = (state.stirCount * 55) % 360;

  return (
    <LabShell
      meta={meta}
      discoveryTitle={state.mode === "paint" ? paintMix.colorName : lightMix.colorName}
      discoveryText={state.mode === "paint" ? paintMix.discovery : lightMix.discovery}
      challengePrompt={challenge.prompt}
      challengeHint={challenge.hint}
      challengeDone={challengeDone}
      onNextChallenge={() => dispatch({ type: "next-challenge" })}
      onReset={() => dispatch({ type: "reset" })}
      saved={saved}
      onToggleSaved={onToggleSaved}
    >
      {/* Mode Switcher */}
      <View style={ls.row}>
        <LabButton
          testID="color-mode-paint"
          selected={state.mode === "paint"}
          accentColor="#C85A3F"
          onPress={() => dispatch({ type: "set-mode", mode: "paint" })}
          style={{ flex: 1 }}
        >
          Paint Mixing Bowl
        </LabButton>
        <LabButton
          testID="color-mode-light"
          selected={state.mode === "light"}
          accentColor="#2A6F8E"
          onPress={() => dispatch({ type: "set-mode", mode: "light" })}
          style={{ flex: 1 }}
        >
          Rainbow Prism & Light
        </LabButton>
      </View>

      {state.mode === "paint" ? (
        <View style={ls.stageCard}>
          {/* Interactive Mixing Bowl Stage */}
          <View style={{ width: "100%", height: 224, borderRadius: 20, overflow: "hidden", backgroundColor: "#FDF4E3", position: "relative" }}>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 60,
                backgroundColor: "#EBD5B0",
                borderTopWidth: 2.5,
                borderTopColor: "#D4B587",
              }}
            />
            <View style={{ flex: 1, zIndex: 1 }}>
              <Svg width="100%" height="100%" viewBox="0 0 360 220" accessible={false}>
              {/* Decorative splashes around bowl when stirred */}
              {paintMix.totalDrops > 0 && (
                <G opacity={0.85}>
                  <Circle cx={64} cy={176} r={9} fill={paintMix.hex} />
                  <Circle cx={82} cy={186} r={5} fill={paintMix.hex} />
                  <Circle cx={292} cy={178} r={8} fill={paintMix.hex} />
                  <Circle cx={274} cy={190} r={4.5} fill={paintMix.hex} />
                </G>
              )}
              {/* Bowl shadow */}
              <Ellipse cx={180} cy={176} rx={96} ry={18} fill="#3D2B24" opacity={0.14} />
              {/* Ceramic mixing bowl */}
              <Path d="M84 96Q90 176 180 176Q270 176 276 96Z" fill="#FFFDF8" stroke="#3D2B24" strokeWidth={3.5} />
              <Path d="M102 126Q120 156 170 162" fill="none" stroke="#EFE2C8" strokeWidth={6} strokeLinecap="round" />
              {/* Mixed paint pool */}
              <Ellipse cx={180} cy={96} rx={94} ry={28} fill="#EFE3CD" stroke="#3D2B24" strokeWidth={3.5} />
              <Ellipse cx={180} cy={98} rx={84} ry={22} fill={paintMix.hex} />
              {/* Gloss & stir swirl */}
              <G rotation={swirlAngle} origin="180,98">
                <Path
                  d="M142 96Q164 86 184 98T222 96"
                  fill="none"
                  stroke="#FFFDF8"
                  strokeOpacity={0.5}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </G>
              {/* Wooden stirring spoon */}
              <G rotation={state.stirCount % 2 === 0 ? -12 : 12} origin="206,92">
                <Path
                  d="M214 96L252 24C256 17 267 22 262 30L224 100Z"
                  fill="#C48F59"
                  stroke="#3D2B24"
                  strokeWidth={3}
                />
              </G>
              </Svg>
            </View>
            {/* Clean aligned HUD pill badges */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 14,
                top: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FFFDF8",
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: "#E8D8BE",
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: paintMix.hex,
                  borderWidth: 1.5,
                  borderColor: "#3D2B24",
                }}
              />
              <Text maxFontSizeMultiplier={1.15} style={[headingBold, { fontSize: 12.5, color: palette.ink }]}>
                {paintMix.hex}
              </Text>
            </View>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                right: 14,
                top: 14,
                backgroundColor: "#FFFDF8",
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: "#E8D8BE",
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text maxFontSizeMultiplier={1.15} style={[headingBold, { fontSize: 12.5, color: palette.ink }]}>
                {paintMix.totalDrops}/{MAX_PAINT_DROPS} drops
              </Text>
            </View>
          </View>

          {/* Pigment Drop Buttons */}
          <Text maxFontSizeMultiplier={1.3} style={[headingBold, { fontSize: 16, color: palette.ink }]}>
            Tap to add paint drops:
          </Text>
          <View style={ls.row}>
            {PIGMENT_OPTIONS.map((pigment) => {
              const count = state.drops[pigment.id];
              return (
                <Pressable
                  key={pigment.id}
                  testID={`paint-drop-${pigment.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${pigment.label} paint drop. ${count} in bowl`}
                  onPress={() => dispatch({ type: "add-drop", pigment: pigment.id })}
                  style={({ pressed }) => [
                    {
                      flexGrow: 1,
                      minWidth: 96,
                      minHeight: 56,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: pigment.hex,
                      borderWidth: 2,
                      borderColor: pigment.id === "white" ? "#D5C3A5" : "#3D2B24",
                      borderBottomWidth: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={[displayBold, { fontSize: 16, color: pigment.textColor }]}>
                    {pigment.label}
                  </Text>
                  <Text maxFontSizeMultiplier={1.2} style={[bodyFont, { fontSize: 12.5, color: pigment.textColor, opacity: 0.92 }]}>
                    {count > 0 ? `${count} ${count === 1 ? "drop" : "drops"}` : "+ Drop"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={ls.row}>
            <LabButton
              testID="paint-stir-btn"
              accentColor="#C85A3F"
              selected={state.stirCount > 0}
              disabled={paintMix.totalDrops === 0}
              onPress={() => dispatch({ type: "stir" })}
              style={{ flex: 1 }}
            >
              Stir & Splash!
            </LabButton>
            <LabButton
              testID="paint-clear-btn"
              disabled={paintMix.totalDrops === 0}
              onPress={() => dispatch({ type: "clear-bowl" })}
            >
              Rinse Bowl
            </LabButton>
          </View>
        </View>
      ) : (
        <View style={ls.stageCard}>
          {/* Interactive Additive RGB Beams & Glass Prism Stage */}
          <View style={{ width: "100%", height: 236, borderRadius: 20, overflow: "hidden", backgroundColor: "#162033" }}>
            <Svg width="100%" height="100%" viewBox="0 0 360 230" accessible={false}>
              <Rect width={360} height={230} fill="#162033" />
              {/* Twinkling darkroom stars */}
              <Circle cx={34} cy={26} r={2} fill="#FFF3C7" opacity={0.55} />
              <Circle cx={128} cy={22} r={1.8} fill="#FFF3C7" opacity={0.45} />
              <Circle cx={322} cy={30} r={2} fill="#FFF3C7" opacity={0.5} />

              {state.sunlightThroughPrism ? (
                <G>
                  {/* Sunbeam hitting glass prism */}
                  <Path d="M0 108L152 108L152 124L0 124Z" fill="#FFF7D6" opacity={0.92} />
                  {lightMix.rainbowVisible ? (
                    RAINBOW_BANDS.map((bandColor, i) => {
                      const spread = 14 + lightMix.rainbowSpread * 24;
                      const offsetTop = (i - 3.5) * spread * 0.45;
                      const offsetBot = (i - 2.5) * spread * 0.45;
                      return (
                        <Polygon
                          key={bandColor}
                          points={`188,116 360,${116 + offsetTop * 2.2} 360,${116 + offsetBot * 2.2}`}
                          fill={bandColor}
                          opacity={0.86}
                        />
                      );
                    })
                  ) : (
                    <Path d="M188 109L360 109L360 123L188 123Z" fill="#FFF7D6" opacity={0.85} />
                  )}
                  {/* Rotating glass prism */}
                  <G rotation={(state.prismAngle - 30) * 0.6} origin="172,116">
                    <Polygon
                      points="172,64 218,154 126,154"
                      fill="#DCEFF7"
                      fillOpacity={0.32}
                      stroke="#E9F7FF"
                      strokeWidth={3}
                    />
                    <Line x1={172} y1={72} x2={192} y2={148} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.5} />
                  </G>
                </G>
              ) : (
                <G>
                  {/* Additive overlapping light spotlights */}
                  {state.beams.red && (
                    <G>
                      <Polygon points="20,42 150,74 150,152 20,66" fill="#FF4D4D" opacity={0.32} />
                      <Circle cx={166} cy={96} r={54} fill="#FF4D4D" opacity={0.62} />
                    </G>
                  )}
                  {state.beams.green && (
                    <G>
                      <Polygon points="20,110 176,84 176,164 20,132" fill="#2ECC71" opacity={0.32} />
                      <Circle cx={204} cy={96} r={54} fill="#2ECC71" opacity={0.62} />
                    </G>
                  )}
                  {state.beams.blue && (
                    <G>
                      <Polygon points="20,174 166,118 202,184 20,196" fill="#3B82F6" opacity={0.32} />
                      <Circle cx={185} cy={136} r={54} fill="#3B82F6" opacity={0.62} />
                    </G>
                  )}
                  {/* Center combined glow circle */}
                  <Circle
                    cx={185}
                    cy={112}
                    r={32}
                    fill={lightMix.hex}
                    stroke="#FFFDF8"
                    strokeOpacity={lightMix.activeCount > 0 ? 0.9 : 0.25}
                    strokeWidth={3}
                  />
                  {/* Mini rainbow fan if all 3 RGB beams make white light + prism angled */}
                  {lightMix.rainbowVisible && (
                    <G>
                      <Polygon points="256,82 282,138 230,138" fill="#DCEFF7" fillOpacity={0.32} stroke="#E9F7FF" strokeWidth={2} />
                      {RAINBOW_BANDS.map((bandColor, i) => (
                        <Line
                          key={bandColor}
                          x1={270}
                          y1={112}
                          x2={356}
                          y2={66 + i * 16}
                          stroke={bandColor}
                          strokeWidth={5}
                          strokeLinecap="round"
                        />
                      ))}
                    </G>
                  )}
                </G>
              )}
            </Svg>
          </View>

          {/* Light Beam Toggles */}
          <View style={ls.row}>
            {LIGHT_BEAM_OPTIONS.map((beam) => {
              const on = !state.sunlightThroughPrism && state.beams[beam.id];
              return (
                <LabButton
                  key={beam.id}
                  testID={`light-beam-${beam.id}`}
                  selected={on}
                  accentColor={beam.hex}
                  onPress={() => dispatch({ type: "toggle-beam", beam: beam.id })}
                  style={{ flex: 1, minWidth: 100 }}
                >
                  {on ? `${beam.label} ON` : beam.label}
                </LabButton>
              );
            })}
          </View>

          <View style={ls.row}>
            <LabButton
              testID="light-sunlight-prism"
              selected={state.sunlightThroughPrism}
              accentColor="#D48926"
              onPress={() => dispatch({ type: "toggle-sunlight" })}
              style={{ flex: 1 }}
            >
              {state.sunlightThroughPrism ? "Sunlight Prism ON" : "Shine Sunlight Through Prism"}
            </LabButton>
          </View>

          <LabStepper
            label="Prism Angle"
            value={state.prismAngle}
            min={0}
            max={60}
            step={15}
            unit="°"
            accentColor="#2A6F8E"
            onChange={(next) => dispatch({ type: "set-prism-angle", angle: next })}
            testIDPrefix="prism-angle"
          />
        </View>
      )}
    </LabShell>
  );
}
