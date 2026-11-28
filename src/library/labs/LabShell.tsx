import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../../components/Text";
import { useNunitoLoaded } from "../../ui/fonts";
import { theme } from "../../ui/theme";
import { LibraryIcon, palette } from "../ui";
import { LabCoverArt } from "./LabCoverArt";
import type { DiscoveryLabMeta } from "./types";

export function useLabFonts() {
  const nunitoLoaded = useNunitoLoaded();
  return {
    displayBold: nunitoLoaded
      ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
      : ({ fontWeight: "800" } as const),
    headingBold: nunitoLoaded
      ? ({ fontFamily: theme.fontFamily["700"], fontWeight: "normal" } as const)
      : ({ fontWeight: "700" } as const),
    bodyFont: nunitoLoaded
      ? ({ fontFamily: theme.fontFamily["600"], fontWeight: "normal" } as const)
      : undefined,
  };
}

export function LabButton({
  children,
  onPress,
  label,
  selected = false,
  disabled = false,
  accentColor,
  testID,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  accentColor?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { headingBold } = useLabFonts();
  const activeBg = accentColor ?? palette.lagoonInk;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ls.button,
        selected && { backgroundColor: activeBg, borderColor: activeBg, borderBottomColor: "#243D39" },
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          maxFontSizeMultiplier={1.35}
          style={[ls.buttonText, headingBold, selected && { color: "#FFFDF8" }]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function LabStepper({
  label,
  value,
  min = 1,
  max = 5,
  step = 1,
  unit = "",
  accentColor = palette.lagoonInk,
  onChange,
  testIDPrefix,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  accentColor?: string;
  onChange: (next: number) => void;
  testIDPrefix: string;
}) {
  const { headingBold, bodyFont } = useLabFonts();
  const count = Math.max(1, Math.floor((max - min) / step) + 1);
  const dots = Array.from({ length: count }, (_, i) => min + i * step);
  return (
    <View style={ls.stepperBox}>
      <View style={ls.stepperHeader}>
        <Text maxFontSizeMultiplier={1.35} style={[ls.stepperLabel, headingBold]}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={[ls.stepperValue, bodyFont, { color: accentColor }]}>
          {value}
          {unit}
        </Text>
      </View>
      <View style={ls.stepperRow}>
        <LabButton
          testID={`${testIDPrefix}-minus`}
          label={`Decrease ${label}`}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
          style={ls.stepBtn}
        >
          −
        </LabButton>
        <View style={ls.dotsRow} accessible={false}>
          {dots.map((dotVal) => (
            <Pressable
              key={dotVal}
              accessibilityRole="button"
              accessibilityLabel={`Set ${label} to ${dotVal}${unit}`}
              onPress={() => onChange(dotVal)}
              style={[
                ls.dotPill,
                {
                  backgroundColor: dotVal <= value ? accentColor : "#EFE3CE",
                  borderColor: dotVal <= value ? accentColor : "#D8C6A7",
                },
              ]}
            />
          ))}
        </View>
        <LabButton
          testID={`${testIDPrefix}-plus`}
          label={`Increase ${label}`}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + step))}
          style={ls.stepBtn}
        >
          +
        </LabButton>
      </View>
    </View>
  );
}

export function LabShell({
  meta,
  discoveryTitle,
  discoveryText,
  challengePrompt,
  challengeHint,
  challengeDone,
  onNextChallenge,
  onReset,
  saved,
  onToggleSaved,
  children,
}: {
  meta: DiscoveryLabMeta;
  discoveryTitle: string;
  discoveryText: string;
  challengePrompt: string;
  challengeHint: string;
  challengeDone: boolean;
  onNextChallenge: () => void;
  onReset: () => void;
  saved?: boolean;
  onToggleSaved?: () => void;
  children: React.ReactNode;
}) {
  const { displayBold, headingBold, bodyFont } = useLabFonts();
  return (
    <View testID={`discovery-lab-${meta.id}`} style={ls.shell}>
      {/* Hero Banner */}
      <View style={[ls.heroBanner, { borderColor: meta.borderColor }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LabCoverArt labId={meta.id} />
          <View style={ls.heroScrim} />
        </View>
        <View style={ls.heroTopRow}>
          <View style={[ls.heroBadge, { borderColor: meta.borderColor }]}>
            <Text maxFontSizeMultiplier={1.2} style={[ls.heroBadgeText, headingBold, { color: meta.accentColor }]}>
              Discovery Lab · {meta.playCue}
            </Text>
          </View>
          {onToggleSaved && (
            <LabButton
              testID={`lab-save-${meta.id}`}
              label={saved ? "Saved lab. Remove from My Shelf" : "Save lab to My Shelf"}
              selected={saved}
              accentColor="#D46A56"
              onPress={onToggleSaved}
              style={{ paddingHorizontal: 12 }}
            >
              <LibraryIcon name="heart" size={22} filled={!!saved} />
            </LabButton>
          )}
        </View>
        <Text maxFontSizeMultiplier={1.4} style={[ls.heroTitle, displayBold]}>
          {meta.title}
        </Text>
      </View>

      {/* Main interactive stage + controls */}
      {children}

      {/* Live Discovery Callout */}
      <View
        testID={`lab-discovery-${meta.id}`}
        accessibilityLiveRegion="polite"
        style={[ls.discoveryCard, { backgroundColor: meta.tintColor, borderColor: meta.borderColor }]}
      >
        <Text maxFontSizeMultiplier={1.35} style={[ls.discoveryTitle, displayBold, { color: meta.accentColor }]}>
          {discoveryTitle}
        </Text>
        <Text style={[ls.discoveryBody, bodyFont]}>{discoveryText}</Text>
      </View>

      {/* Try This! Mini-Challenge Card */}
      <View
        testID={`lab-challenge-${meta.id}`}
        style={[
          ls.challengeCard,
          challengeDone && { backgroundColor: "#E5F3E6", borderColor: "#7AB382" },
        ]}
      >
        <View style={ls.challengeHeader}>
          <View style={ls.challengeTitleRow}>
            <LibraryIcon name={challengeDone ? "check" : "sparkles"} size={22} />
            <Text maxFontSizeMultiplier={1.35} style={[ls.challengeHeading, displayBold]}>
              {challengeDone ? "You discovered it!" : "Try this!"}
            </Text>
          </View>
          <LabButton
            testID={`lab-next-challenge-${meta.id}`}
            label="Next Try This idea"
            onPress={onNextChallenge}
            style={{ paddingVertical: 8, paddingHorizontal: 14 }}
          >
            Next idea
          </LabButton>
        </View>
        <Text style={[ls.challengePrompt, headingBold]}>{challengePrompt}</Text>
        <Text style={[ls.challengeHint, bodyFont]}>{challengeHint}</Text>
      </View>

      {/* Reset / Try Again Footer */}
      <View style={ls.footerRow}>
        <LabButton
          testID={`lab-reset-${meta.id}`}
          label="Reset Lab"
          onPress={onReset}
          style={{ backgroundColor: "#FFFDF8" }}
        >
          Reset & Try Again
        </LabButton>
      </View>
    </View>
  );
}

export const ls = StyleSheet.create({
  shell: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    gap: 14,
    paddingBottom: 24,
  },
  heroBanner: {
    minHeight: 118,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 16,
    gap: 10,
    backgroundColor: "#FFFDF8",
    borderWidth: 1.5,
  },
  heroScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255, 252, 245, 0.78)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFDF8F5",
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: palette.ink,
  },
  stageCard: {
    backgroundColor: "#FFFDF8",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E8D8BE",
    borderBottomWidth: 3.5,
    borderBottomColor: "rgba(61, 43, 36, 0.16)",
    padding: 14,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#DEC8A4",
    borderBottomWidth: 3,
    borderBottomColor: "rgba(61, 43, 36, 0.18)",
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 21,
    color: palette.ink,
    textAlign: "center",
  },
  discoveryCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
  },
  discoveryTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  discoveryBody: {
    fontSize: 17,
    lineHeight: 25,
    color: palette.ink,
  },
  challengeCard: {
    backgroundColor: "#FFF9E8",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5CC94",
    padding: 16,
    gap: 8,
  },
  challengeHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  challengeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  challengeHeading: {
    fontSize: 18,
    lineHeight: 24,
    color: palette.ink,
  },
  challengePrompt: {
    fontSize: 17,
    lineHeight: 24,
    color: palette.ink,
  },
  challengeHint: {
    fontSize: 15,
    lineHeight: 21,
    color: palette.muted,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  stepperBox: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: "#FFF8EA",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#EADBC2",
    padding: 12,
    gap: 8,
  },
  stepperHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stepperLabel: {
    fontSize: 15.5,
    color: palette.ink,
  },
  stepperValue: {
    fontSize: 15.5,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dotsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dotPill: {
    flex: 1,
    height: 18,
    minHeight: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
});
