import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "../../../components/Text";
import { C, PressableScale } from "../../../components/ui";

export type NumberPadProps = {
  /** Changing this clears what has been typed, e.g. the step the child is on. */
  resetKey: string | number;
  width: number;
  disabled?: boolean;
  maxDigits?: number;
  /** Called with the typed whole number. The pad clears after any submit, right or wrong. */
  onSubmit: (n: number) => void;
  /** A number to pre-fill, as the last help stage does. The child still confirms it. */
  prefill?: number | null;
  /** Called on every key, for sound and haptics. */
  onKey?: () => void;
  /** Label spoken for the typed box. */
  prompt?: string;
};
const KEYS: readonly (string | number)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, "del", 0, "go"];

/** Digits, delete and a Go key. Big targets, no clock, nothing is judged until Go. */
export function NumberPad({ resetKey, width, disabled, maxDigits = 3, onSubmit, prefill = null, onKey, prompt = "Your answer" }: NumberPadProps) {
  const [text, setText] = useState(prefill === null ? "" : String(prefill));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setText(prefill === null ? "" : String(prefill));
  }, [resetKey, prefill]);
  const gap = 8, key = Math.min(88, Math.floor((Math.min(width, 360) - gap * 2) / 3));
  const press = (k: string | number) => {
    if (disabled) return;
    onKey?.();
    if (k === "del") setText((t) => t.slice(0, -1));
    else if (k === "go") { if (text.length) { const n = Number(text); setText(""); onSubmit(n); } }
    else setText((t) => (t.length >= maxDigits || (t === "0") ? (t === "0" ? String(k) : t) : t + k));
  };
  return <View style={{ alignItems: "center", gap: 10, alignSelf: "center" }}>
    <View accessible accessibilityLabel={text ? `${prompt}: ${text}` : `${prompt}: nothing typed yet`} accessibilityLiveRegion="polite"
      style={{ minWidth: key * 2 + gap, minHeight: 56, borderRadius: 16, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.paper, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
      <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 34, fontWeight: "900", color: text ? C.ink : C.line }}>{text || "?"}</Text>
    </View>
    <View style={{ width: key * 3 + gap * 2, flexDirection: "row", flexWrap: "wrap", gap }}>
      {KEYS.map((k) => {
        const go = k === "go", del = k === "del";
        return <PressableScale key={String(k)} accessibilityRole="button" accessibilityLabel={go ? "Check my answer" : del ? "Delete" : String(k)}
          accessibilityState={{ disabled: !!disabled || (go && !text.length) }} disabled={disabled || (go && !text.length)} onPress={() => press(k)} amount={0.94}
          style={{ width: key, minHeight: Math.max(52, Math.round(key * 0.72)), borderRadius: 16, borderWidth: 2, borderColor: go ? C.teal : C.line, backgroundColor: go ? C.teal : C.paper, alignItems: "center", justifyContent: "center", opacity: go && !text.length ? 0.45 : 1, shadowColor: C.ink, shadowOpacity: 0.16, shadowOffset: { width: 0, height: 3 }, shadowRadius: 0, elevation: 3 }}>
          <Text maxFontSizeMultiplier={1.4} style={{ fontSize: go || del ? 22 : 28, fontWeight: "900", color: go ? "#FFF" : C.ink }}>{go ? "Go" : del ? "⌫" : k}</Text>
        </PressableScale>;
      })}
    </View>
  </View>;
}
