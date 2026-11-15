import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "../../../components/Text";
import { C, PressableScale } from "../../../components/ui";
import { KIT_MAX } from "../model";

export type NumberPadProps = {
  /** Changing this clears what has been typed, e.g. the step the child is on. */
  resetKey: string | number;
  width: number;
  disabled?: boolean;
  maxDigits?: number;
  /** Largest number the pad will type. A digit that would pass it is refused, with a line saying so. */
  max?: number;
  /** Called with the typed whole number. The pad clears after any submit, right or wrong. */
  onSubmit: (n: number) => void;
  /** A number to pre-fill, as the last help stage does. The child still confirms it. */
  prefill?: number | null;
  /** Called on every key, for sound and haptics. */
  onKey?: () => void;
  /** Label spoken for the typed box. */
  prompt?: string;
};

/** Digits, delete and a Go key. Big targets, no clock, nothing is judged until Go. */
export function NumberPad({ resetKey, width, disabled, maxDigits = 3, max = KIT_MAX, onSubmit, prefill = null, onKey, prompt = "Your answer" }: NumberPadProps) {
  const [text, setText] = useState(prefill === null ? "" : String(prefill));
  const [refused, setRefused] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setText(prefill === null ? "" : String(prefill));
    setRefused(false);
  }, [resetKey, prefill]);
  // Five keys to a row keeps the whole pad to three rows, so the picture and the pad fit on one screen.
  const gap = 8, w = Math.min(width, 380), key = Math.floor((w - gap * 4) / 5), keyH = Math.max(48, Math.min(56, Math.round(key * 0.86)));
  const press = (k: string | number) => {
    if (disabled) return;
    onKey?.();
    if (k === "del") { setRefused(false); setText((t) => t.slice(0, -1)); }
    else if (k === "go") { setRefused(false); if (text.length) { const n = Number(text); setText(""); onSubmit(n); } }
    else {
      const next = text === "0" ? String(k) : text.length >= maxDigits ? text : text + k;
      // A number past the range is never typed, and the child is told why, so a key never seems to do nothing.
      if (Number(next) > max) { setRefused(true); return; }
      setRefused(false);
      setText(next);
    }
  };
  const keyStyle = (go: boolean, off: boolean) => ({
    width: key, minHeight: keyH, borderRadius: 14, borderWidth: 2, borderColor: go ? C.teal : C.line, backgroundColor: go ? C.teal : C.paper,
    alignItems: "center" as const, justifyContent: "center" as const, opacity: off ? 0.45 : 1,
    shadowColor: C.ink, shadowOpacity: 0.16, shadowOffset: { width: 0, height: 3 }, shadowRadius: 0, elevation: 3,
  });
  const render = (k: string | number) => {
    const go = k === "go", del = k === "del", off = !!disabled || (go && !text.length);
    return <PressableScale key={String(k)} accessibilityRole="button" accessibilityLabel={go ? "Check my answer" : del ? "Delete" : String(k)}
      accessibilityState={{ disabled: off }} disabled={off} onPress={() => press(k)} amount={0.94} style={keyStyle(go, off)}>
      <Text maxFontSizeMultiplier={1.4} style={{ fontSize: go || del ? 20 : 26, fontWeight: "900", color: go ? "#FFF" : C.ink }}>{go ? "Go" : del ? "⌫" : k}</Text>
    </PressableScale>;
  };
  return <View style={{ alignItems: "center", gap, alignSelf: "center", width: w }}>
    <View style={{ flexDirection: "row", gap }}>{[1, 2, 3, 4, 5].map(render)}</View>
    <View style={{ flexDirection: "row", gap }}>{[6, 7, 8, 9, 0].map(render)}</View>
    <View style={{ flexDirection: "row", gap, alignItems: "center" }}>
      <View accessible accessibilityLabel={text ? `${prompt}: ${text}` : `${prompt}: nothing typed yet`} accessibilityLiveRegion="polite"
        style={{ width: key * 3 + gap * 2, minHeight: keyH, borderRadius: 14, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.paper, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
        <Text maxFontSizeMultiplier={1.6} style={{ fontSize: 30, fontWeight: "900", color: text ? C.ink : C.line }}>{text || "?"}</Text>
      </View>
      {render("del")}
      {render("go")}
    </View>
    {refused && <View accessibilityLiveRegion="polite"><Text maxFontSizeMultiplier={1.4} style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>Answers go up to {max}.</Text></View>}
  </View>;
}
