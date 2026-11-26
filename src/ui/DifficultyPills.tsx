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

/** Index the arrow key moves the radio choice to, wrapping at both ends; `undefined` for any other key. */
export function nextRadioIndex(key: string, index: number, count: number): number | undefined {
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index + count - 1) % count;
  return undefined;
}

type KeyEvent = { key?: string; nativeEvent?: { key?: string }; currentTarget?: unknown; preventDefault?: () => void };

/**
 * Only the levels a game has, one pill each, wrapping to more rows rather than shrinking or clipping. A single-choice
 * radio group: the chosen pill is the one tab stop, and the arrow keys move the choice (Web).
 */
export function DifficultyPills({ options, value, onChange, label = "Difficulty" }: {
  options: readonly DifficultyOption[];
  value: DifficultyOption["key"];
  onChange: (key: DifficultyOption["key"]) => void;
  label?: string;
}) {
  const onKeyDown = (event: KeyEvent) => {
    const index = options.findIndex(option => option.key === value);
    const next = nextRadioIndex(event.key ?? event.nativeEvent?.key ?? "", Math.max(index, 0), options.length);
    if (next === undefined) return;
    event.preventDefault?.();
    onChange(options[next].key);
    const group = event.currentTarget as { querySelectorAll?: (selector: string) => ArrayLike<{ focus?: () => void }> } | undefined;
    group?.querySelectorAll?.('[role="radio"]')?.[next]?.focus?.();
  };
  // React Native Web forwards onKeyDown to the DOM; the native View type does not declare it.
  const webKeys = { onKeyDown } as object;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row} {...webKeys}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <PressTarget
            key={option.key}
            target="child"
            haptic
            role="radio"
            checked={selected}
            tabIndex={selected || !options.some(o => o.key === value) ? 0 : -1}
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
