import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../components/Text";
import { C } from "../../components/ui";
import type { GrowthVisualProps } from "./types";

/** The Board owns the prompt, answers, help and feedback. This visual owns the
 * English stimulus/context. It has no answer controls or untracked demonstrations.
 */
export function LiteracyVisual({ question, showHelp, width }: GrowthVisualProps) {
  const building = !!question.tiles;
  const title = question.scene?.labels?.[0] ?? (building ? "Word workshop" : question.scene?.kind === "language" ? "An everyday moment" : "Read the clues");
  return (
    <View style={[styles.card, { maxWidth: Math.max(1, width), width: "100%" }]}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {question.context ? <Text style={styles.context}>{question.context}</Text> : null}
      {building ? (
        <View style={styles.workshop}>
          <Text style={styles.caption}>{showHelp ? "Join these parts in this order" : "Build with the tiles below"}</Text>
          <View style={styles.pieces}>
            {question.answer.split("|").map((piece, index) => (
              <View key={index} style={[styles.piece, showHelp && styles.helpPiece]}>
                <Text style={styles.pieceText}>{showHelp ? piece : "?"}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { alignSelf: "center", padding: 18, gap: 12, borderWidth: 1.5, borderColor: C.line, borderRadius: 20, backgroundColor: C.paper },
  title: { color: "#B84E5A", fontSize: 18, fontWeight: "800" },
  context: { color: C.ink, fontSize: 20, lineHeight: 30 },
  workshop: { gap: 10, marginTop: 4 },
  caption: { color: C.muted, fontSize: 16 },
  pieces: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  piece: { minWidth: 56, minHeight: 52, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.muted, backgroundColor: C.cream, justifyContent: "center", alignItems: "center" },
  helpPiece: { backgroundColor: C.soft, borderStyle: "solid", borderColor: C.teal },
  pieceText: { color: C.ink, fontSize: 24, fontWeight: "800" },
});
