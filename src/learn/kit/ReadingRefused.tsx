import React from "react";
import { View } from "react-native";
import { C, Copy } from "../../components/ui";
import { REFUSED_TASK_TEXT } from "../reading/admit";

/**
 * What a reading board shows instead of content that did not come from an admitted or pinned inherited record: the
 * existing "could not open" words, with nothing to press, nothing spoken and nothing credited.
 */
export function ReadingRefused() {
  return (
    <View testID="reading-content-refused" accessibilityLiveRegion="polite" style={{ padding: 12, alignSelf: "stretch" }}>
      <Copy maxFontSizeMultiplier={1.4} style={{ color: C.ink, textAlign: "center" }}>{REFUSED_TASK_TEXT}</Copy>
    </View>
  );
}
