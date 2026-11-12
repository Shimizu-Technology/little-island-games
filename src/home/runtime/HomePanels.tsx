import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { gateAccepts, makeGate } from "../../state/grownUpGate";
import type { Scene } from "../scene/types";
import type { CharacterRender } from "./EntityArt";
import { FriendsIcon, Tool } from "./HomeChrome";

/** Explicit controls only: room/background taps never open a picker. */
export function HomePanels({
  more,
  friends,
  bottom,
  scene,
  renderCharacter,
  onClose,
  onFriends,
  onZoom,
  onBring,
  large = false,
  onLarge,
}: {
  /** HR-03: the larger-target mode, changed only behind the grown-up question. */
  large?: boolean;
  onLarge?: (on: boolean) => boolean;
  more: boolean;
  friends: boolean;
  bottom: number;
  scene: Scene;
  renderCharacter?: CharacterRender;
  onClose: () => void;
  onFriends: () => void;
  onZoom: (ratio: number) => void;
  onBring: (id: string, slot: number) => void;
}) {
  // HR-01: friends live in the friends drawer now; this panel is only More.
  void friends; void scene; void renderCharacter; void onBring;
  if (!more) return null;
  return (
    <View
      testID="more-home-controls"
      style={{
        position: "absolute",
        bottom,
        left: 8,
        right: 8,
        padding: 10,
        borderRadius: 18,
        backgroundColor: "#FFF8E9",
        zIndex: 40,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, color: "#284F4B", fontWeight: "700" }}>Home controls</Text>
        <Tool label="Close home controls" symbol="×" onPress={onClose} large={large} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-evenly" }}>
        <Tool label="Zoom in" symbol="+" onPress={() => onZoom(1.3)} large={large} />
        <Tool label="Zoom out" symbol="−" onPress={() => onZoom(1 / 1.3)} large={large} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Friends drawer"
          onPress={onFriends}
          style={[{ alignItems: "center", justifyContent: "center", minWidth: 100, minHeight: large ? 64 : 48 }, large && { borderRadius: 32, backgroundColor: "#F1E6CF" }]}
        >
          <FriendsIcon />
        </Pressable>
      </View>
      {onLarge && <GrownUpAccess large={large} onLarge={onLarge} />}
    </View>
  );
}
const ink = "#284F4B";
/** HR-03 (rule 62): a grown-up turns on 64 pt targets for a child who needs them. Typed, not chosen. */
export function GrownUpAccess({ large, onLarge }: { large: boolean; onLarge: (on: boolean) => boolean }) {
  const [asking, setAsking] = useState(false), [open, setOpen] = useState(false);
  const [gate, setGate] = useState(() => makeGate()), [answer, setAnswer] = useState(""), [note, setNote] = useState("");
  const check = () => {
    if (gateAccepts(gate, answer)) { setOpen(true); setNote(""); }
    else { setGate(makeGate()); setNote("A grown-up can try a new question."); }
    setAnswer("");
  };
  if (!asking)
    return (
      <Pressable testID="home-grown-ups" accessibilityRole="button" accessibilityLabel="For grown-ups" onPress={() => setAsking(true)}
        style={{ alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 12 }}>
        <Text style={{ color: ink, fontSize: 14, textDecorationLine: "underline" }}>For grown-ups</Text>
      </Pressable>
    );
  if (!open)
    return (
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <Text style={{ color: ink, fontSize: 15 }}>For grown-ups · {gate.a} × {gate.b} =</Text>
        <TextInput
          accessibilityLabel={`Grown-up question: ${gate.a} times ${gate.b}`}
          value={answer}
          onChangeText={(v) => setAnswer(v.replace(/[^0-9]/g, "").slice(0, 3))}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={check}
          autoComplete="off"
          textContentType="none"
          style={{ width: 80, minHeight: 44, borderWidth: 1, borderColor: "#477D60", borderRadius: 10, textAlign: "center", fontSize: 18, color: ink }}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Unlock grown-up choices" disabled={!answer} onPress={check}
          style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderRadius: 12, backgroundColor: "#E3EBC9", opacity: answer ? 1 : 0.5 }}>
          <Text style={{ color: ink, fontSize: 15 }}>Unlock</Text>
        </Pressable>
        {!!note && <Text accessibilityLiveRegion="polite" style={{ color: ink, fontSize: 14 }}>{note}</Text>}
      </View>
    );
  return (
    <Pressable
      testID="home-large-targets"
      accessibilityRole="switch"
      accessibilityLabel="Larger buttons for this child"
      accessibilityHint="Room, tray and friend buttons become at least 64 points."
      accessibilityState={{ checked: large }}
      onPress={() => { if (!onLarge(!large)) setNote("That could not be saved. Please try again."); }}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, marginTop: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: large ? "#D6E9C8" : "#F3EBDA" }}
    >
      <Text style={{ flex: 1, color: ink, fontSize: 15 }}>Larger buttons for this child</Text>
      <Text style={{ color: ink, fontSize: 15, fontWeight: "700" }}>{large ? "On" : "Off"}</Text>
      {!!note && <Text style={{ color: ink, fontSize: 13 }}>{note}</Text>}
    </Pressable>
  );
}
