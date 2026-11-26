import React from "react";
import { StyleSheet, View } from "react-native";
import { PressTarget } from "./PressTarget";
import { Text } from "./Text";
import { theme } from "./theme";

/** Plain difficulty words for tiers 1 to 6. Water-depth band names never reach the UI. */
export const DIFFICULTY_WORDS = ["Easy", "Medium", "Hard", "Expert", "Master", "Master+"] as const;

export type DifficultyOption = {
  /** Stable key, usually the tier number. */
  key: string | number;
  label: string;
  /** Size tag such as `4×4` or `9×9`. */
  tag?: string;
};

/** Options for the tiers a game has, `tags[i]` being tier i + 1's size tag. */
export const difficultyOptions = (tags: readonly (string | undefined)[]): DifficultyOption[] =>
  tags.slice(0, DIFFICULTY_WORDS.length).map((tag, i) => ({ key: i + 1, label: DIFFICULTY_WORDS[i], tag }));

/** Only the levels a game has, one pill each, wrapping to more rows rather than shrinking or clipping. */
export function DifficultyPills({ options, value, onChange, label = "Difficulty" }: {
  options: readonly DifficultyOption[];
  value: DifficultyOption["key"];
  onChange: (key: DifficultyOption["key"]) => void;
  label?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <PressTarget
            key={option.key}
            target="child"
            haptic
            selected={selected}
            testID={`difficulty-${option.key}`}
            accessibilityLabel={option.tag ? `${option.label}, ${option.tag}` : option.label}
            onPress={() => onChange(option.key)}
            style={[styles.pill, { backgroundColor: selected ? theme.colors.lagoon : theme.colors.lagoonSoft }]}
          >
            <Text variant="body" tone={selected ? "surface" : "ink"} style={styles.word}>{option.label}</Text>
            {option.tag && <Text variant="small" tone={selected ? "surface" : "muted"}>{option.tag}</Text>}
          </PressTarget>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.full,
  },
  word: { fontWeight: "800" },
});
