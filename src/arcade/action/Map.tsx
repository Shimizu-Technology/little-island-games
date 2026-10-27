import React, { useEffect, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, Copy, Heading, PressableScale } from "../../components/ui";
import { nativeDriver, useReducedMotion } from "../../components/motion";
import { StarDisplay } from "../Art";
import { endlessOpen, gameProgress, levelOpen, type ArcadeLearner } from "../progress";
import { starCount, type ArcadeGame, type ArcadeLevel, type LevelId } from "../types";
import { ActionHero, palettes, Scene } from "./Art";
export function Bob({ children, wiggle = false }: { children: React.ReactNode; wiggle?: boolean }) {
  const reduced = useReducedMotion(),
    [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      t.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: wiggle ? 550 : 1100, useNativeDriver: nativeDriver }),
        Animated.timing(t, { toValue: 0, duration: wiggle ? 550 : 1100, useNativeDriver: nativeDriver }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, t, wiggle]);
  return (
    <Animated.View
      style={{
        transform: wiggle
          ? [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) }]
          : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function ActionMap({
  game,
  person,
  levels,
  unlockAll,
  onLevel,
  onOutfits,
}: {
  game: ArcadeGame;
  person: ArcadeLearner;
  levels: readonly ArcadeLevel[];
  unlockAll: boolean;
  onLevel: (id: LevelId | "endless") => void;
  onOutfits: () => void;
}) {
  const { width } = useWindowDimensions(),
    tablet = width >= 760,
    cardWidth = Math.min(tablet ? (width - 64) / 2 : width - 28, 556),
    p = gameProgress(person, game.id),
    palm = game.id === "palm-patrol";
  return (
    <View style={{ gap: 18, width: "100%", alignItems: "center" }}>
      <View style={{ flexDirection: "row", gap: 15, alignItems: "center", padding: 8 }}>
        <Bob>
          <ActionHero palm={palm} size={100} outfit={p.outfit} />
        </Bob>
        <View style={{ gap: 6, flexShrink: 1 }}>
          <Heading style={{ fontSize: 29, color: "#FFF3CF" }}>{game.name}</Heading>
          <Copy style={{ color: "#CBEEE1" }}>
            ★ {starCount(p.stars)} · {person.stickers.length} stickers
          </Copy>
          <Button quiet compact onPress={onOutfits}>
            Dress {game.hero.split(" the ")[0]}
          </Button>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
        {game.worlds.map((world) => {
          const own = levels.filter((l) => l.world === world.id),
            next = own.find((l) => levelOpen(p, l.id, unlockAll) && !p.stars[l.id]),
            worldOpen = unlockAll || p.openWorlds.includes(world.id),
            x = (i: number) => cardWidth * [0.17, 0.5, 0.82, 0.73, 0.39, 0.17, 0.5, 0.82][i],
            y = (i: number) => [147, 159, 181, 267, 255, 335, 358, 350][i];
          return (
            <View
              key={world.id}
              style={{
                width: cardWidth,
                height: 442,
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: palettes[world.id][1],
              }}
            >
              <Scene palm={palm} world={world.id} width={cardWidth} height={442} />
              <View style={{ position: "absolute", top: 15, left: 18, right: 18, gap: 4 }}>
                <Heading style={{ color: "#FFEFBC", fontSize: 25 }}>{world.name}</Heading>
                <Copy style={{ color: "#FFF8DE", fontSize: 14 }}>
                  {worldOpen
                    ? world.learning
                      ? palm
                        ? "Match the number. Take your time."
                        : "Rally & count by 2s or 5s."
                      : world.detail
                    : `★ ${world.stars} to explore · ${starCount(p.stars)} so far`}
                </Copy>
              </View>
              <Svg width={cardWidth} height={442} style={{ position: "absolute" }} accessible={false}>
                <Path
                  d={`M${x(0)} ${y(0)}Q${x(1)} ${y(0) - 30} ${x(2)} ${y(2)}Q${cardWidth} ${y(3) + 30} ${x(3)} ${y(3)}Q${x(4)} ${y(4) - 35} ${x(5)} ${y(5)}Q${x(6)} ${y(6) + 35} ${x(7)} ${y(7)}`}
                  fill="none"
                  stroke="#754C3B"
                  strokeOpacity={0.25}
                  strokeWidth={16}
                  strokeLinecap="round"
                />
                <Path
                  d={`M${x(0)} ${y(0)}Q${x(1)} ${y(0) - 30} ${x(2)} ${y(2)}Q${cardWidth} ${y(3) + 30} ${x(3)} ${y(3)}Q${x(4)} ${y(4) - 35} ${x(5)} ${y(5)}Q${x(6)} ${y(6) + 35} ${x(7)} ${y(7)}`}
                  fill="none"
                  stroke="#FFEABB"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray="2 15"
                />
              </Svg>
              {own.map((level, i) => {
                const open = levelOpen(p, level.id, unlockAll),
                  stars = p.stars[level.id] ?? 0,
                  current = next?.id === level.id;
                const node = (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`${world.name}, level ${level.index}, ${level.name}, ${stars} stars${open ? (current ? ", next" : "") : ", locked"}`}
                    accessibilityState={{ disabled: !open }}
                    disabled={!open}
                    onPress={() => onLevel(level.id)}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 24,
                      backgroundColor: stars ? "#FFCE65" : open ? "#FFF5CD" : "#9EADA8",
                      borderWidth: current ? 4 : 3,
                      borderColor: current ? "#F08D55" : "#66533C",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0px 5px 0px #3F463A55",
                    }}
                  >
                    {open ? (
                      <Heading style={{ fontSize: 27, color: "#4B5948" }}>{level.index}</Heading>
                    ) : (
                      <Svg width={40} height={40} viewBox="0 0 40 40" accessible={false}>
                        <Path
                          d="M10 30Q1 13 10 10Q13 2 20 8Q27 2 30 10Q39 13 30 30Z"
                          fill="#CED5BE"
                          stroke="#647269"
                          strokeWidth={2}
                        />
                        <Path d="M13 29L10 13M20 29V10M27 29L30 13" stroke="#8B9E86" strokeWidth={2} />
                        <Rect
                          x={15}
                          y={21}
                          width={13}
                          height={11}
                          rx={2}
                          fill="#FAE5AF"
                          stroke="#5B675D"
                          strokeWidth={2}
                        />
                        <Path d="M18 21V18Q21 11 25 18V21" fill="none" stroke="#5B675D" strokeWidth={2} />
                        <Circle cx={21.5} cy={26} r={1.5} fill="#5B675D" />
                      </Svg>
                    )}
                  </PressableScale>
                );
                return (
                  <View
                    key={level.id}
                    style={{ position: "absolute", left: x(i) - 30, top: y(i) - 30, alignItems: "center" }}
                  >
                    {current ? <Bob>{node}</Bob> : node}
                    <StarDisplay stars={stars} size={17} />
                    {current && (
                      <Heading
                        style={{
                          color: "#FFF9DA",
                          fontSize: 13,
                          backgroundColor: "#225B58",
                          borderRadius: 9,
                          paddingHorizontal: 8,
                        }}
                      >
                        Next ↑
                      </Heading>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
      <View style={{ width: "100%", maxWidth: 600, gap: 8, backgroundColor: "#FFF0C7", borderRadius: 24, padding: 18 }}>
        <Heading style={{ fontSize: 23 }}>Free play ∞</Heading>
        <Copy>
          {endlessOpen(p, unlockAll)
            ? "Your own pace. Finish whenever you like."
            : "Clear the 8 sunny levels to explore freely."}
        </Copy>
        <Copy>Personal best · {p.best}</Copy>
        <Button disabled={!endlessOpen(p, unlockAll)} onPress={() => onLevel("endless")}>
          Play freely
        </Button>
      </View>
    </View>
  );
}
