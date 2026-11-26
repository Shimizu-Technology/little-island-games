import React, { useEffect, useId, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from "react-native-svg";
import { Copy } from "../components/ui";
import { useReducedMotion } from "../components/motion";
import { ArcadeArt, StarDisplay } from "./Art";
import type { ArcadeId } from "./types";
import type { OutfitId } from "./progress";

const revealStarPath =
  "M32 6.5 C35.6 6.5 38.4 18.8 41.8 22.1 C45.2 25.4 58.6 25.1 60 28.4 C61.4 31.7 50.3 39.2 49.4 43.7 C48.5 48.2 53.4 60.4 50.3 62.7 C47.2 65 36.4 57.2 32 57.2 C27.6 57.2 16.8 65 13.7 62.7 C10.6 60.4 15.5 48.2 14.6 43.7 C13.7 39.2 2.6 31.7 4 28.4 C5.4 25.1 18.8 25.4 22.2 22.1 C25.6 18.8 28.4 6.5 32 6.5 Z";

/** Small isolated transforms; no animated React state or layout. `active` stops decoration behind sheets. */
export function Hero({ game, size = 100, outfit, mood = "idle", cue = 0, active = true }: { game?: ArcadeId; size?: number; outfit?: OutfitId; mood?: "idle" | "happy" | "dizzy"; cue?: number | string; active?: boolean }) {
  const reduced = useReducedMotion(), move = useSharedValue(0), reaction = useSharedValue(0);
  useEffect(() => {
    move.value = 0;
    if (active && !reduced) move.value = withRepeat(withTiming(1, { duration: 2100, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(move);
  }, [active, reduced, move]);
  useEffect(() => {
    reaction.value = 0;
    if (active && !reduced && mood !== "idle") reaction.value = withSequence(withTiming(1, { duration: 100 }), withSpring(0, { damping: 7, stiffness: 170 }));
    return () => cancelAnimation(reaction);
  }, [cue, mood, active, reduced, reaction]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -move.value * 4 - (mood === "happy" ? reaction.value * 9 : 0) }, { rotate: `${mood === "dizzy" ? reaction.value * 12 : move.value * 2.5 - 1.25}deg` }, { scaleX: 1 + reaction.value * .06 }, { scaleY: 1 - reaction.value * .06 }] }));
  return (
    <View accessibilityLabel={mood === "happy" ? "Happy island friend" : mood === "dizzy" ? "Your friend is ready to try again" : undefined}>
      <Animated.View style={style}>
        <ArcadeArt game={game} size={size} outfit={outfit} happy={mood === "happy"} dizzy={mood === "dizzy"} />
      </Animated.View>
    </View>
  );
}

function RevealStar({ filled, index, reduced }: { filled: boolean; index: number; reduced: boolean }) {
  const uid = useId().replace(/:/g, "");
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = 1;
    if (filled && !reduced) {
      scale.value = withDelay(index * 360 + 100, withSequence(withTiming(1.28, { duration: 130 }), withSpring(1, { damping: 9, stiffness: 210 })));
    }
    return () => cancelAnimation(scale);
  }, [filled, index, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Svg width={64} height={68} viewBox="0 0 64 68" accessible={false}>
        <Defs>
          <LinearGradient id={`reveal-gold-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
            <Stop offset="0" stopColor="#FFE474" />
            <Stop offset="0.5" stopColor="#FFCE45" />
            <Stop offset="1" stopColor="#F5B425" />
          </LinearGradient>
        </Defs>
        <Path
          d={revealStarPath}
          fill={filled ? `url(#reveal-gold-${uid})` : "#E8DCC8"}
          stroke={filled ? "#3D2B24" : "#BFA98A"}
          strokeWidth={filled ? 3.2 : 2.6}
          strokeLinejoin="round"
        />
        {filled && (
          <>
            <Path d="M29 16 C26.5 23 22 26.5 14 28.5" stroke="#FFFCE8" strokeWidth={3.6} strokeLinecap="round" fill="none" opacity={0.92} />
            <Circle cx={44} cy={49} r={2.2} fill="#FFF7D4" opacity={0.85} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

export function StarReveal({ stars, onTone, active = true }: { stars: number; onTone: (tone: string) => void; active?: boolean }) {
  const reduced = useReducedMotion(), [shown, setShown] = useState(0), tone = useRef(onTone), revealed = useRef(0);
  useEffect(() => { tone.current = onTone; }, [onTone]);
  useEffect(() => {
    if (!active) return;
    const remaining = Math.max(0, stars - revealed.current);
    const timers = Array.from({ length: remaining }, (_, i) => setTimeout(() => { const next = ++revealed.current; setShown(next); tone.current(`shell-${next}`); }, reduced ? 0 : 220 + i * 360));
    return () => timers.forEach(clearTimeout);
  }, [stars, reduced, active]);
  return <View accessibilityLabel={`${stars} of 3 stars earned`} style={{ flexDirection: "row", gap: 10 }}>{[0, 1, 2].map(i => <RevealStar key={i} filled={i < shown} index={0} reduced={reduced}/>)}</View>;
}

export function HudPill({ icon, children, label, maxFontSizeMultiplier }: { icon?: React.ReactNode; children: React.ReactNode; label?: string; maxFontSizeMultiplier?: number }) {
  return (
    <View
      accessibilityLabel={label}
      style={{
        alignSelf: "flex-start",
        minHeight: 36,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: "#FFF6E5",
        borderWidth: 1.5,
        borderColor: "#E8D8BE",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon}
      <Copy maxFontSizeMultiplier={maxFontSizeMultiplier} style={{ color: "#3D2B24", fontWeight: "800", fontSize: 15, lineHeight: 20 }}>
        {children}
      </Copy>
    </View>
  );
}

export function MiniStars({ stars }: { stars: number }) { return <StarDisplay stars={stars} size={20}/>; }

function Particle({ index, fish, reduced, originY }: { index: number; fish: boolean; reduced: boolean; originY?: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.value = 0; if (!reduced) t.value = withDelay(index * 28, withTiming(1, { duration: fish ? 850 : 650, easing: Easing.out(Easing.quad) })); return () => cancelAnimation(t); }, [index, fish, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: reduced ? 1 : 1 - t.value, transform: [{ translateX: t.value * (fish ? -110 - index * 15 : (index % 2 ? 1 : -1) * (25 + index * 9)) }, { translateY: t.value * (-35 - index % 4 * 22) }, { scale: reduced ? 1 : 1 - t.value * .3 }] }));
  return <Animated.View style={[{ position: "absolute", left: `${12 + index * 12}%`, top: fish ? `${originY === undefined ? 24 + index % 3 * 18 : originY - 4 + index % 3 * 2}%` : "55%" }, style]}><Svg width={fish ? 44 : 24} height={fish ? 30 : 32} viewBox="0 0 44 32" accessible={false}>{fish ? <><Path d="M26 16L42 4V28Z" fill="#F58282" stroke="#7C5B68" strokeWidth={2}/><Ellipse cx={17} cy={16} rx={16} ry={12} fill={index % 2 ? "#FFE194" : "#ADF3DB"} stroke="#387D88" strokeWidth={2}/><Circle cx={11} cy={13} r={2.5} fill="#254E64"/></> : <><Path d="M12 31V9L29 4V23M12 9L29 4" stroke="#FFE9A4" strokeWidth={4} fill="none"/><Ellipse cx={7} cy={27} rx={6} ry={4} fill="#FFE9A4"/><Ellipse cx={24} cy={20} rx={6} ry={4} fill="#FFE9A4"/></>}</Svg></Animated.View>;
}

/** A keyed burst lives for 1.1 seconds; Reduce Motion keeps a still celebration. */
export function ActionBurst({ text, fish = false, originY }: { text: string; fish?: boolean; originY?: number }) {
  const reduced = useReducedMotion(), t = useSharedValue(0);
  useEffect(() => { if (!reduced) t.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }); return () => cancelAnimation(t); }, [reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: reduced ? 1 : t.value < .7 ? 1 : (1 - t.value) / .3, transform: [{ translateY: reduced ? 0 : -t.value * 34 }, { scale: reduced ? 1 : 1 + Math.sin(t.value * Math.PI) * .1 }] }));
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{Array.from({ length: fish ? 6 : 4 }, (_, i) => <Particle key={i} index={i} fish={fish} reduced={reduced} originY={originY}/>)}<Animated.View style={[{ position: "absolute", top: "32%", alignSelf: "center", backgroundColor: "#FFF5D8", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 9, borderWidth: 2.5, borderColor: "#E5B44B" }, style]}><Copy style={{ color: "#3D2B24", fontSize: 25, fontWeight: "900" }}>{text}</Copy></Animated.View></View>;
}
