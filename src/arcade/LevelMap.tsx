import { bestLabel, currentLevel } from "./presentation";
import React, { useEffect, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Button, Copy, Heading, PressableScale } from "../components/ui";
import { Text } from "../components/Text";
import { wordFitMultiplier } from "../components/wordFit";
import { useReducedMotion } from "../components/motion";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { StarDisplay } from "./Art";
import { Hero, HudPill } from "./Juice";
import { PlayScene, type ArcadeSceneProps } from "./PlayScene";
import { ChestArt } from "./TreasureArt";
import { DareMark } from "./DareCard";
import { type ArcadeGame, type ArcadeLevel, type LevelId, starCount } from "./types";
import { type ArcadeLearner, gameProgress, levelOpen, endlessOpen } from "./progress";

const INK = theme.colors.frame;
const SUBTLE_INK = "#6A5246";
const PAPER = "#FFFDF8";
const CREAM = "#FFF8EC";
const BORDER = "#E8D8BE";
const CORAL = theme.colors.coral;
const LAGOON = theme.colors.lagoon;

const cardShadow = "0 5px 0 rgba(61, 43, 36, 0.12), 0 10px 22px rgba(61, 43, 36, 0.08)";

function CurrentNode({ children, active }: { children: React.ReactNode; active: boolean }) {
  const reduced = useReducedMotion(), t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    if (active && !reduced) {
      t.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 430, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 430, easing: Easing.inOut(Easing.sin) }),
          withDelay(1800, withTiming(0, { duration: 1 })),
        ),
        -1,
        false,
      );
    }
    return () => cancelAnimation(t);
  }, [active, reduced, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: t.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function LevelMap({
  game,
  person,
  levels,
  onLevel,
  onOutfits,
  onChest,
  freeBest = 0,
  active = true,
  Scene,
  worldNote,
  learnerChip,
  dareMark,
}: {
  learnerChip?: React.ReactNode;
  dareMark?: (id: LevelId) => "open" | "earned" | null;
  game: ArcadeGame;
  person: ArcadeLearner;
  levels: readonly ArcadeLevel[];
  onLevel: (id: LevelId | "endless") => void;
  onOutfits: () => void;
  onChest: () => void;
  freeBest?: number;
  active?: boolean;
  Scene?: React.ComponentType<ArcadeSceneProps>;
  worldNote?: (world: ArcadeLevel["world"]) => string | undefined;
}) {
  const nunitoLoaded = useNunitoLoaded();
  const p = gameProgress(person, game.id);
  const { width } = useWindowDimensions();
  const compactPhone = width < 360;
  const heroSize = compactPhone ? 88 : 96;
  const pathWidth = Math.min(640, width - (width >= 600 ? 64 : 36));
  const unit = pathWidth / 4;
  const next = currentLevel(person, game.id, levels);
  // Title column sits beside the illustrated medallion inside page + card padding.
  const titleWidth = Math.max(112, width - 32 - 36 - heroSize - 14);
  const headingFace = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const [selectedWorld, setSelectedWorld] = useState(next?.world ?? game.worlds[0].id);
  const heroFirstName = game.hero.split(" the ")[0];
  const earnedStars = starCount(p.stars);
  const nextCode = next ? `${next.world === "learn" ? "Discover" : next.world.toUpperCase()}-${next.index}` : null;

  return (
    <View style={{ gap: 16, paddingBottom: 24, maxWidth: 740, width: "100%", alignSelf: "center" }}>
      {learnerChip && <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>{learnerChip}</View>}

      {/* Compact Warm Storybook Hero Banner Card */}
      <View
        testID="arcade-hero-banner"
        style={{
          marginHorizontal: 16,
          padding: compactPhone ? 14 : 18,
          gap: 14,
          borderRadius: 28,
          backgroundColor: PAPER,
          borderWidth: 1.5,
          borderColor: BORDER,
          boxShadow: cardShadow,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Hero game={game.id} size={heroSize} outfit={p.outfit} active={active} />
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <Heading
              maxFontSizeMultiplier={wordFitMultiplier(game.name, 26, titleWidth)}
              style={{ ...headingFace, color: INK, fontSize: 26, lineHeight: 31 }}
            >
              {game.name}
            </Heading>
            <HudPill maxFontSizeMultiplier={wordFitMultiplier(`★ ${earnedStars} · ${person.stickers.length} stickers`, 17, Math.max(88, titleWidth - 28))}>
              <Text style={{ color: "#D6941C" }}>★</Text> {earnedStars} · {person.stickers.length} stickers
            </HudPill>
            <Button
              quiet
              compact
              onPress={onOutfits}
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                minHeight: 44,
                paddingHorizontal: 14,
                paddingVertical: 6,
                backgroundColor: CREAM,
                borderWidth: 1.5,
                borderColor: BORDER,
              }}
              textStyle={{ color: INK, fontSize: 14, fontWeight: "700" }}
            >
              Dress {heroFirstName}
            </Button>
          </View>
        </View>

        {next && nextCode && (
          <Button
            onPress={() => onLevel(next.id)}
            label={`Play next level, ${nextCode}`}
            style={{
              width: "100%",
              minHeight: 52,
              borderRadius: 20,
              backgroundColor: CORAL,
              borderWidth: 1.5,
              borderColor: "#D95D42",
              boxShadow: "0 4px 0 #C8573D",
            }}
            textStyle={{ ...headingFace, color: INK, fontSize: 18 }}
          >
            Play · {nextCode}
          </Button>
        )}
      </View>

      {/* Waiting Sticker Chest Banner */}
      {person.chest?.game === game.id && (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Your sticker chest is waiting"
          onPress={onChest}
          style={{
            marginHorizontal: 16,
            padding: 12,
            borderRadius: 24,
            backgroundColor: "#FFF5D8",
            borderWidth: 2,
            borderColor: "#E5B552",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            boxShadow: "0 4px 0 rgba(196, 142, 42, 0.25)",
          }}
        >
          <ChestArt sticker={person.chest.sticker} size={84} active={active} />
          <Heading style={{ ...headingFace, fontSize: 20, color: INK }}>Your sticker chest →</Heading>
        </PressableScale>
      )}

      {/* Clean Single-Row Horizontal Scrollable World Selector */}
      <ScrollView
        testID="arcade-world-tabs"
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Choose a world"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}
      >
        {game.worlds.map((world, i) => {
          const isSelected = selectedWorld === world.id;
          return (
            <Button
              key={world.id}
              quiet
              compact
              selected={isSelected}
              onPress={() => setSelectedWorld(world.id)}
              style={{
                borderRadius: 999,
                minHeight: 44,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: isSelected ? LAGOON : PAPER,
                borderWidth: 1.5,
                borderColor: isSelected ? LAGOON : BORDER,
                boxShadow: isSelected ? "0 3px 0 rgba(21, 79, 75, 0.35)" : "0 2px 0 rgba(61, 43, 36, 0.08)",
              }}
              textStyle={{ color: isSelected ? PAPER : INK, fontSize: 15, fontWeight: "800" }}
            >
              {world.learning ? "Discover" : `World ${i + 1}`}
            </Button>
          );
        })}
      </ScrollView>

      {/* Elevated Warm Storybook World Path Card */}
      <View style={{ paddingHorizontal: 16 }}>
        {game.worlds.map((world, worldIndex) => {
          if (world.id !== selectedWorld) return null;
          const own = levels.filter(l => l.world === world.id), high = 312;
          const xs = [0, 1, 2, 3, 3, 2, 1, 0].map(c => c * unit + unit / 2), ys = [66, 48, 66, 86, 206, 224, 206, 188];
          const d = `M${xs[0]} ${ys[0]} C${xs[1]} 6 ${xs[2]} 28 ${xs[3]} ${ys[3]} Q${pathWidth + 8} 162 ${xs[4]} ${ys[4]} C${xs[5]} 268 ${xs[6]} 230 ${xs[7]} ${ys[7]}`;
          return (
            <View
              key={world.id}
              testID={`world-${world.id}`}
              style={{
                width: "100%",
                maxWidth: 700,
                alignSelf: "center",
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: BORDER,
                backgroundColor: PAPER,
                boxShadow: "0 6px 0 rgba(61, 43, 36, 0.14), 0 12px 24px rgba(61, 43, 36, 0.1)",
              }}
            >
              <PlayScene Scene={Scene} game={game.id} world={world.id} active={active} />
              {world.palette && (
                <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: world.palette[0], opacity: 0.34 }} />
              )}

              {/* Warm Cream-Ivory Floating Header Band (No Dark Navy Boxes) */}
              <View
                testID="world-header-plaque"
                style={{
                  marginTop: 14,
                  marginHorizontal: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 22,
                  backgroundColor: "rgba(255, 253, 248, 0.94)",
                  borderWidth: 1.5,
                  borderColor: BORDER,
                  gap: 3,
                  boxShadow: "0 3px 10px rgba(61, 43, 36, 0.1)",
                }}
              >
                <Copy style={{ color: LAGOON, fontSize: 12, lineHeight: 16, fontWeight: "800", letterSpacing: 1.4 }}>
                  {world.learning ? "PLAY & DISCOVER" : `WORLD ${worldIndex + 1}`}
                </Copy>
                <Heading style={{ ...headingFace, fontSize: 24, lineHeight: 29, color: INK }}>{world.name}</Heading>
                <Copy style={{ color: SUBTLE_INK, fontSize: 14, lineHeight: 19 }}>{worldNote?.(world.id) ?? world.detail}</Copy>
              </View>

              {/* Sandy Stepping-Stone Level Path */}
              <View style={{ width: pathWidth, height: high, alignSelf: "center", marginTop: 12, marginBottom: 8 }}>
                <Svg width={pathWidth} height={high} style={{ position: "absolute" }} accessible={false}>
                  <Path d={d} fill="none" stroke="#4F3626" strokeWidth={24} strokeLinecap="round" opacity={0.34} />
                  <Path d={d} fill="none" stroke="#F5DFAB" strokeWidth={16} strokeLinecap="round" />
                  <Path d={d} fill="none" stroke="#FFF8E2" strokeWidth={3} strokeDasharray="2 13" strokeLinecap="round" />
                </Svg>
                {own.map((level, i) => {
                  const stars = p.stars[level.id] ?? 0, current = next?.id === level.id, mark = dareMark?.(level.id) ?? null;
                  const face = (
                    <View
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 24,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: current ? "#FFD766" : stars ? "#2A7B74" : PAPER,
                        borderWidth: 3,
                        borderColor: current ? INK : stars ? PAPER : "#D8BE94",
                        boxShadow: current
                          ? "0 5px 0 rgba(61, 43, 36, 0.3)"
                          : stars
                            ? "0 5px 0 rgba(23, 74, 70, 0.45)"
                            : "0 5px 0 rgba(61, 43, 36, 0.22)",
                      }}
                    >
                      <Text style={{ color: stars && !current ? PAPER : INK, fontSize: 27, fontWeight: "900" }}>{level.index}</Text>
                    </View>
                  );
                  const node = (
                    <PressableScale
                      testID={`level-${level.id}`}
                      disabled={!levelOpen(p, level.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${world.name}, level ${level.index}, ${level.name}, ${stars} stars${mark === "earned" ? ", dare earned" : mark ? ", has a dare" : ""}`}
                      onPress={() => onLevel(level.id)}
                      style={{ width: 62, height: 62, borderRadius: 24 }}
                    >
                      {current ? <CurrentNode active={active}>{face}</CurrentNode> : face}
                      {mark && (
                        <View pointerEvents="none" style={{ position: "absolute", right: -13, top: -13 }}>
                          <DareMark earned={mark === "earned"} size={34} />
                        </View>
                      )}
                    </PressableScale>
                  );
                  return (
                    <View key={level.id} style={{ position: "absolute", left: xs[i] - unit / 2, top: ys[i] - 31, width: unit, alignItems: "center", gap: 4 }}>
                      {current && (
                        <View
                          style={{
                            position: "absolute",
                            top: -24,
                            backgroundColor: CORAL,
                            borderWidth: 1.5,
                            borderColor: INK,
                            paddingHorizontal: 9,
                            paddingVertical: 2,
                            borderRadius: 999,
                            zIndex: 2,
                          }}
                        >
                          <Text style={{ color: INK, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 }}>NEXT</Text>
                        </View>
                      )}
                      {node}
                      <StarDisplay stars={stars} size={18} />
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {/* Clean Warm Cream Free Play Card */}
      <View
        testID="arcade-free-play-card"
        style={{
          marginHorizontal: 16,
          padding: 20,
          backgroundColor: PAPER,
          borderRadius: 28,
          borderWidth: 1.5,
          borderColor: BORDER,
          gap: 10,
          boxShadow: cardShadow,
        }}
      >
        <Heading style={{ ...headingFace, fontSize: 24, color: INK }}>Free play</Heading>
        <Copy style={{ color: SUBTLE_INK }}>Your own pace. Stop whenever you like.</Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={{ backgroundColor: CREAM, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Copy style={{ color: INK, fontSize: 14, lineHeight: 19, fontWeight: "700" }}>Free-play record: {freeBest}</Copy>
          </View>
          <View style={{ backgroundColor: CREAM, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Copy style={{ color: INK, fontSize: 14, lineHeight: 19, fontWeight: "700" }}>
              {bestLabel}: {p.best}
            </Copy>
          </View>
        </View>
        <Copy style={{ fontSize: 13, lineHeight: 18, color: SUBTLE_INK }}>Historical scores include Helper and different level settings.</Copy>
        <Button
          disabled={!endlessOpen(p)}
          onPress={() => onLevel("endless")}
          style={{
            borderRadius: 18,
            minHeight: 48,
            backgroundColor: LAGOON,
            borderColor: LAGOON,
          }}
          textStyle={{ color: PAPER, fontSize: 16, fontWeight: "800" }}
        >
          Play freely
        </Button>
      </View>
    </View>
  );
}
