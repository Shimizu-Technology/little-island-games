import React from "react";
import { ScrollView, View } from "react-native";
/** The story folds over the desk, leaving the drawing size and coordinates stable. */
export function StudioCard({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return <View style={{ display: "none" }}>{children}</View>;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{
        position: "absolute",
        bottom: 86,
        left: 10,
        right: 10,
        maxHeight: "70%",
        zIndex: 3,
        backgroundColor: "#FFFDF8",
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: "#E8D8BE",
        borderBottomWidth: 3.5,
        borderBottomColor: "rgba(61, 43, 36, 0.16)",
        shadowColor: "#3D2B24",
        shadowOpacity: 0.14,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 18,
        elevation: 6,
        boxShadow: "0 6px 20px rgba(61, 43, 36, 0.14)",
      }}
      contentContainerStyle={{ padding: 18, gap: 12 }}
    >
      {children}
    </ScrollView>
  );
}
