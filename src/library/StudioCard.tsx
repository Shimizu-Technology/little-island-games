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
        left: 8,
        right: 8,
        maxHeight: "70%",
        zIndex: 3,
        backgroundColor: "#FFFBEF",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#A5BFB2",
        boxShadow: "0 4px 18px #254E4B22",
      }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
    >
      {children}
    </ScrollView>
  );
}
