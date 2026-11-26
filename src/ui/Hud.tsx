import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Icon } from "./Icon";
import type { IconGlyph } from "./Icon";
import { IconButton } from "./IconButton";
import { PressTarget } from "./PressTarget";
import { Text } from "./Text";
import { ArrowCounterClockwise, ArrowLeft, DotsThree, Lightbulb } from "./icons";
import { theme } from "./theme";

/** Windows at least this wide (iPad, Web) show a short word under each HUD icon. */
const LABELLED_WIDTH = 700;

function HudAction({ glyph, label, labelled, onPress, disabled, testID }: { glyph: IconGlyph; label: string; labelled: boolean; onPress: () => void; disabled?: boolean; testID: string }) {
  if (!labelled) return <IconButton testID={testID} glyph={glyph} accessibilityLabel={label} disabled={disabled} onPress={onPress} />;
  return (
    <PressTarget testID={testID} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={styles.labelled}>
      <Icon glyph={glyph} />
      <Text variant="small" tone="muted">{label}</Text>
    </PressTarget>
  );
}

/**
 * The board HUD, one 56 pt row: `←` (save and leave), the game's name and difficulty in small muted text, then Undo,
 * Hint and `•••`. Icons only on phones, each labelled for VoiceOver; icons with short words on wide windows. Leave out
 * a handler to leave out its button. Nothing else crowds the board.
 */
export function Hud({ title, subtitle, onBack, onUndo, onHint, onMore, canUndo = true, backLabel = "Back", undoLabel = "Undo", hintLabel = "Hint", moreLabel = "More" }: {
  title: string;
  /** Usually the difficulty, such as "Medium 6×6". */
  subtitle?: string;
  onBack: () => void;
  onUndo?: () => void;
  onHint?: () => void;
  onMore?: () => void;
  canUndo?: boolean;
  backLabel?: string;
  undoLabel?: string;
  hintLabel?: string;
  moreLabel?: string;
}) {
  const labelled = useWindowDimensions().width >= LABELLED_WIDTH;
  return (
    <View testID="hud" style={styles.row}>
      <IconButton testID="hud-back" glyph={ArrowLeft} accessibilityLabel={backLabel} onPress={onBack} />
      <View style={styles.words}>
        <Text variant="caption" numberOfLines={1} style={styles.title}>{title}</Text>
        {subtitle && <Text variant="small" tone="muted" numberOfLines={1}>{subtitle}</Text>}
      </View>
      {onUndo && <HudAction testID="hud-undo" glyph={ArrowCounterClockwise} label={undoLabel} labelled={labelled} disabled={!canUndo} onPress={onUndo} />}
      {onHint && <HudAction testID="hud-hint" glyph={Lightbulb} label={hintLabel} labelled={labelled} onPress={onHint} />}
      {onMore && <HudAction testID="hud-more" glyph={DotsThree} label={moreLabel} labelled={labelled} onPress={onMore} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: theme.hud.height, flexDirection: "row", alignItems: "center", gap: theme.space.xs, paddingHorizontal: theme.space.sm },
  words: { flex: 1, minWidth: 0, paddingHorizontal: theme.space.xs },
  title: { fontWeight: "800" },
  labelled: { alignItems: "center", justifyContent: "center", paddingHorizontal: theme.space.sm, borderRadius: theme.radius.full },
});
