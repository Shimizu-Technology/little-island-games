import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../../ui/theme';

export const ink = '#173A36', paper = theme.colors.paper, accent = '#F28270', quiet = '#E8E2F3';
export const cellFloor = 44;
export const controlRow = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 } as const;
type ControlProps = {
  title: string; label?: string; onPress: () => void; selected?: boolean; primary?: boolean;
  disabled?: boolean; testID?: string; style?: StyleProp<ViewStyle>;
};
export function Control({ title, label, onPress, selected, primary, disabled, testID, style }: ControlProps) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} accessibilityState={{ disabled, selected }}
    disabled={disabled} onPress={onPress} testID={testID}
    style={({ pressed }) => [styles.target, primary || selected ? styles.primary : styles.quiet, disabled && styles.disabled, pressed && styles.pressed, style]}>
    <Text style={styles.label} maxFontSizeMultiplier={2}>{title}</Text>
  </Pressable>;
}

export function MoveGrid({ movable, moving, onToggle }: { movable: boolean; moving: boolean; onToggle: () => void }) {
  return movable ? <Control title={moving ? 'Edit grid' : 'Move grid'} onPress={onToggle} selected={moving} /> : null;
}

export function Feedback({ children }: { children: string }) {
  return <View style={styles.feedback}><Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={2} style={styles.message}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  // A key's lip: a darker bottom edge, so a tool reads as something to press. It sinks a point while held.
  target: { minWidth: 44, minHeight: 48, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(61,43,36,0.2)' },
  label: { color: ink, fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  primary: { backgroundColor: accent },
  quiet: { backgroundColor: quiet },
  pressed: { opacity: 0.75, transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.47 },
  feedback: { backgroundColor: quiet, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'stretch' },
  message: { color: ink, fontSize: 15, textAlign: 'center' },
});
