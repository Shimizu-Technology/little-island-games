import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { G, Path, Rect } from "react-native-svg";
import { Text } from "../components/Text";
import { Motif } from "../explore/ExploreArt";
import { exportBackup } from "../state/backup";
import { pendingPage, retainPageDraft } from "./drafts";
import type { DrawingStroke, LibraryCreation } from "./state";
import {
  editDrawing,
  normalizedPoint,
  pathForStroke,
  redoDrawing,
  undoDrawing,
  type Drawing,
  type DrawingHistory,
} from "./drawing";
import { StudioCard } from "./StudioCard";
import { LibraryGlyph } from "./LibraryGlyph";
import { Action, palette, s } from "./ui";
export const paintColors = [
  { value: "#254E4B", name: "dark green" },
  { value: "#408EAA", name: "sky blue" },
  { value: "#C2604D", name: "red" },
  { value: "#DBB04C", name: "sunny yellow" },
  { value: "#789B60", name: "leaf green" },
  { value: "#7E6A9A", name: "purple" },
];
export const DrawingArt = React.memo(function DrawingArt({
  drawing,
  viewport = { width: 1000, height: 650 },
}: {
  drawing: Drawing;
  viewport?: { width: number; height: number };
}) {
  const stampY = (viewport.width / Math.max(1, viewport.height)) * 0.65;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 1000 650" preserveAspectRatio="none" accessible={false}>
      <Rect width={1000} height={650} fill="#FFFFFF" />
      {drawing.strokes.map((stroke, i) => (
        <Path
          key={i}
          d={pathForStroke(stroke)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={(stroke.width * viewport.width) / 1000}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {drawing.stamps.map((stamp, i) => (
        <G
          key={i}
          transform={`translate(${stamp.x * 1000 - stamp.size * 500} ${stamp.y * 650 - stamp.size * 500 * stampY}) scale(${(stamp.size * 1000) / 120} ${((stamp.size * 1000) / 120) * stampY})`}
        >
          <Motif name={stamp.id} />
        </G>
      ))}
    </Svg>
  );
});
export function Maker({
  creation,
  onChange,
  saveError,
  saving,
  draftKey,
  wide = false,
}: {
  creation: LibraryCreation;
  onChange: (next: LibraryCreation) => boolean;
  draftKey: string;
  saveError: boolean;
  saving: boolean;
  wide?: boolean;
}) {
  const [draft, setDraft] = useState(() => pendingPage(draftKey) ?? creation);
  const [admitted, setAdmitted] = useState(() => !pendingPage(draftKey));
  const [history, setHistory] = useState<DrawingHistory>(() => ({
    present: { strokes: draft.strokes, stamps: draft.stamps },
    past: [],
    future: [],
  }));
  const [details, setDetails] = useState(false);
  const [stampTray, setStampTray] = useState(false);
  const [color, setColor] = useState(paintColors[0].value);
  const [brush, setBrush] = useState(10);
  const [stamp, setStamp] = useState("");
  const [liveStroke, setLiveStroke] = useState<DrawingStroke | null>(null);
  const [message, setMessage] = useState("");
  const size = useRef({ width: 1, height: 1 });
  const [viewport, setViewport] = useState({ width: 1000, height: 650 });
  const state = useRef({ history, color, brush, stamp, creation: draft, onChange });
  useLayoutEffect(() => {
    state.current = { history, color, brush, stamp, creation: draft, onChange };
  }, [history, color, brush, stamp, draft, onChange]);
  const active = useRef<DrawingStroke | null>(null);
  const frame = useRef<number | null>(null);
  const submit = (next: LibraryCreation) => {
    setDraft(next);
    state.current.creation = next;
    const accepted = state.current.onChange(next);
    setAdmitted(accepted);
    retainPageDraft(draftKey, next, accepted);
  };
  const update = (next: DrawingHistory) => {
    state.current.history = next;
    setHistory(next);
    submit({ ...state.current.creation, ...next.present, updatedAt: Date.now() });
  };
  const updateRef = useRef(update);
  useLayoutEffect(() => {
    updateRef.current = update;
  });
  const finish = () => {
    if (!active.current) return;
    const stroke = { ...active.current, points: active.current.points.map((point) => ({ ...point })) };
    active.current = null;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setLiveStroke(null);
    updateRef.current(
      editDrawing(state.current.history, {
        ...state.current.history.present,
        strokes: [...state.current.history.present.strokes, stroke],
      })
    );
  };
  const finishRef = useRef(finish);
  useLayoutEffect(() => {
    finishRef.current = finish;
  });
  // Recognition belongs to RNGH, not the JS responder. Pan owns drags in every
  // direction, including outside the page. Tap covers motionless iOS touches.
  // Both finalizers use the same idempotent commit; cancelled drags keep their ink.
  // eslint-disable-next-line react-hooks/refs -- These callbacks read refs only at touch time.
  const [gesture] = useState(() => {
    const begin = (event: { x: number; y: number }) => {
      finishRef.current();
      const current = state.current;
      const point = normalizedPoint(event.x, event.y, size.current.width, size.current.height);
      if (!point) return;
      if (current.stamp) {
        if (current.history.present.stamps.length >= 24) {
          setMessage("This page has room for 24 stamps. Undo one or make another page.");
          return;
        }
        updateRef.current(editDrawing(current.history, {
          ...current.history.present,
          stamps: [...current.history.present.stamps, { id: current.stamp, ...point, size: 0.17 }],
        }));
        return;
      }
      if (current.history.present.strokes.length >= 120) {
        setMessage("This page is full. You can undo or start another page.");
        return;
      }
      active.current = { color: current.color, width: current.brush, points: [point] };
      setLiveStroke({ ...active.current, points: [...active.current.points] });
    };
    const pan = Gesture.Pan().minDistance(0).maxPointers(1).shouldCancelWhenOutside(false).runOnJS(true)
      .onBegin(begin)
      .onUpdate((event) => {
        if (!active.current || active.current.points.length >= 256) return;
        const point = normalizedPoint(event.x, event.y, size.current.width, size.current.height);
        if (!point) return;
        active.current.points.push(point);
        if (frame.current === null)
          frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (active.current) setLiveStroke({ ...active.current, points: [...active.current.points] });
          });
      })
      .onFinalize(() => finishRef.current());
    const tap = Gesture.Tap().shouldCancelWhenOutside(false).runOnJS(true)
      .onEnd(() => finishRef.current());
    return Gesture.Race(pan, tap);
  });
  useEffect(
    () => () => {
      finishRef.current();
    },
    []
  );
  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: "#E8DDC7", padding: 8, gap: 6 }}>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column", gap: 8 }}>
        <View
          style={{
            width: wide ? 142 : "100%",
            gap: 6,
            padding: 6,
            backgroundColor: "#FCFAF4",
            borderRadius: 22,
            justifyContent: "center",
          }}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
            {paintColors.map(({ value, name }) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Draw with ${name}`}
                accessibilityState={{ selected: color === value && !stamp }}
                onPress={() => {
                  setColor(value);
                  setStamp("");
                }}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 22,
                  borderWidth: color === value && !stamp ? 2 : 0,
                  borderColor: palette.ink,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: value,
                    borderWidth: 3,
                    borderColor: "#FFFFFF",
                    boxShadow: "0 2px 0 #D4C8AF",
                  }}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
            {[4, 10, 22].map((value) => (
              <StudioTool
                key={value}
                label={`${value === 4 ? "Thin" : value === 10 ? "Medium" : "Thick"} brush`}
                selected={brush === value && !stamp}
                onPress={() => {
                  setBrush(value);
                  setStamp("");
                }}
              >
                <View
                  style={{
                    width: value / 1.3 + 4,
                    height: value / 1.3 + 4,
                    backgroundColor: palette.ink,
                    borderRadius: 20,
                  }}
                />
              </StudioTool>
            ))}
            <StudioTool
              label="Eraser"
              selected={color === "#FFFFFF" && !stamp}
              onPress={() => {
                setColor("#FFFFFF");
                setStamp("");
              }}
            >
              <LibraryGlyph name="eraser" />
            </StudioTool>
            <StudioTool label="Open stamps" selected={stampTray} onPress={() => setStampTray(!stampTray)}>
              <LibraryGlyph name="stamps" />
            </StudioTool>
            <StudioTool label="Undo" disabled={!history.past.length} onPress={() => update(undoDrawing(history))}>
              <LibraryGlyph name="undo" />
            </StudioTool>
            <StudioTool label="Redo" disabled={!history.future.length} onPress={() => update(redoDrawing(history))}>
              <LibraryGlyph name="redo" />
            </StudioTool>
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {stampTray && (
            <View
              style={[s.row, { justifyContent: "center", padding: 4, backgroundColor: "#FFFBEF", borderRadius: 18 }]}
            >
              {["turtle", "moon", "coral", "seagrass"].map((value) => (
                <StudioTool
                  key={value}
                  label={`Stamp ${value}`}
                  selected={stamp === value}
                  onPress={() => setStamp(stamp === value ? "" : value)}
                >
                  <Svg width={38} height={38} viewBox="0 0 120 110">
                    <Motif name={value} />
                  </Svg>
                </StudioTool>
              ))}
            </View>
          )}
          <GestureDetector gesture={gesture} touchAction="none">
          <View
            collapsable={false}
            testID="drawing-canvas"
            style={{
              flex: 1,
              minHeight: 260,
              backgroundColor: "white",
              borderWidth: 1,
              borderColor: palette.ink,
              borderRadius: 8,
              overflow: "hidden",
            }}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              size.current = { width, height };
              setViewport((previous) =>
                previous.width === width && previous.height === height ? previous : { width, height }
              );
            }}
            accessibilityLabel="Drawing page. Drag to draw. Choose a stamp then tap to place it."
          >
            <DrawingArt drawing={history.present} viewport={viewport} />
            {liveStroke && (
              <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <Svg width="100%" height="100%" viewBox="0 0 1000 650" preserveAspectRatio="none">
                  <Path
                    d={pathForStroke(liveStroke)}
                    fill="none"
                    stroke={liveStroke.color}
                    strokeWidth={(liveStroke.width * viewport.width) / 1000}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            )}
          </View>
          </GestureDetector>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Picture title and story"
        accessibilityState={{ expanded: details }}
        onPress={() => setDetails(!details)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 8,
          minHeight: 48,
          borderRadius: 18,
          backgroundColor: "#FFFBEF",
          gap: 8,
        }}
      >
        <LibraryGlyph name="make" size={24} />
        <Text style={[s.actionText, { flex: 1, textAlign: "left" }]}>{draft.title || "My page"}</Text>
        <LibraryGlyph name="details" size={24} />
      </Pressable>
      {(saveError || !admitted) && (
        <Action
          onPress={() => {
            submit(state.current.creation);
          }}
        >
          Retry saving this page
        </Action>
      )}
      <Text accessibilityLiveRegion="polite" style={[s.small, { textAlign: "center" }]}>
        {saveError || !admitted
          ? "Your picture is here. Saving needs a retry."
          : saving
            ? "Saving…"
            : "Saved in My Shelf"}
      </Text>
      {!!message && (
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {message}
        </Text>
      )}
      <StudioCard open={details}>
        <TextInput
          accessibilityLabel="Page title"
          maxLength={80}
          value={draft.title}
          onChangeText={(title) => submit({ ...state.current.creation, title, updatedAt: Date.now() })}
          style={s.input}
          placeholder="My page"
        />
        <TextInput
          accessibilityLabel="One or two sentences about your page"
          multiline
          maxLength={400}
          value={draft.sentences}
          onChangeText={(sentences) => submit({ ...state.current.creation, sentences, updatedAt: Date.now() })}
          style={[s.input, { minHeight: 100 }]}
          placeholder="Tell about your picture…"
        />
        <Text accessibilityLiveRegion="polite" style={s.small}>
          {saveError || !admitted
            ? "Your page is still here. Saving needs a retry above."
            : saving
              ? "Saving your page…"
              : "Your page is saved in My Shelf."}
        </Text>
        <Action
          onPress={() => {
            void exportBackup(JSON.stringify({ format: "little-island-page", version: 1, page: draft }, null, 2)).catch(
              () => setMessage("Export could not open. Your saved page is still in My Shelf.")
            );
          }}
        >
          Export my page
        </Action>
      </StudioCard>
    </View>
  );
}

function StudioTool({
  label,
  selected,
  disabled,
  onPress,
  children,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: selected ? "#D0E4DA" : "transparent",
        opacity: disabled ? 0.35 : pressed ? 0.65 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
