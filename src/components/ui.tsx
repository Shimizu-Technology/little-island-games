import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export const C = {
  ink: "#183F39",
  muted: "#64716C",
  cream: "#FCFAF4",
  paper: "#FFFFFF",
  line: "#DBE3DA",
  teal: "#246858",
  soft: "#E5EFE5",
  coral: "#C56D50",
  gold: "#E1B251",
  blue: "#386C9A",
};
export const font = Platform.OS === "ios" ? "AvenirNext-Regular" : undefined;
export function Label({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}
export function Copy({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.copy, style]}>{children}</Text>;
}
export function Heading({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <Text accessibilityRole="header" style={[styles.heading, style]}>
      {children}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  quiet = false,
  disabled = false,
  selected = false,
  compact = false,
  label,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  label?: string;
  style?: ViewStyle;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        quiet && styles.quiet,
        compact && { minHeight: 44, paddingHorizontal: 13, paddingVertical: 9 },
        selected && { backgroundColor: C.teal, borderColor: C.teal },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.72 },
        focused && { outlineColor: C.blue, outlineWidth: 3 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, quiet && { color: C.ink }, selected && { color: C.paper }]}>{children}</Text>
    </Pressable>
  );
}
export function Chip({
  children,
  onPress,
  selected = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Button
      onPress={onPress}
      quiet
      selected={selected}
      style={{ borderRadius: 24, paddingHorizontal: 16, minHeight: 44, flexShrink: 0 }}
    >
      {children}
    </Button>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}
        >
          <View accessibilityViewIsModal style={styles.sheet}>
            <View style={styles.row}>
              <Heading style={{ fontSize: 25, flex: 1 }}>{title}</Heading>
              <Button onPress={onClose} quiet label={`Close ${title}`}>
                Close
              </Button>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 20, paddingBottom: 12, gap: 16 }}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
export function Status({ title, detail, success = false }: { title: string; detail?: string; success?: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={[styles.status, success && { backgroundColor: "#E3EFE3" }]}>
      <Heading style={{ fontSize: 20 }}>{title}</Heading>
      {detail && <Copy style={{ marginTop: 4, fontSize: 14, lineHeight: 21 }}>{detail}</Copy>}
    </View>
  );
}
export function Controls({ children }: { children: React.ReactNode }) {
  return <View style={[styles.row, { flexWrap: "wrap", justifyContent: "center", marginTop: 18 }]}>{children}</View>;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingHorizontal: 22, paddingBottom: 36 },
  heading: { fontFamily: font, fontSize: 32, fontWeight: "700", color: C.ink, letterSpacing: -0.6 },
  copy: { fontFamily: font, fontSize: 16, lineHeight: 25, color: C.muted },
  label: {
    fontFamily: font,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.teal,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.teal,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: { backgroundColor: C.paper, borderColor: C.line },
  buttonText: { fontFamily: font, fontSize: 15, fontWeight: "700", color: "#FFF" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(18,40,34,.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  sheet: { width: "100%", maxWidth: 560, maxHeight: "90%", padding: 22, borderRadius: 26, backgroundColor: C.cream },
  status: { alignSelf: "stretch", padding: 14, borderRadius: 18, backgroundColor: "#F0F1E8", marginBottom: 16 },
  board: { alignSelf: "center", overflow: "hidden", borderRadius: 20, borderWidth: 2, borderColor: C.ink },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 15,
    fontFamily: font,
    fontSize: 18,
    color: C.ink,
    backgroundColor: C.paper,
    minHeight: 52,
  },
});
