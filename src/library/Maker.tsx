import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanResponder, Pressable, TextInput, View } from "react-native";
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
import { Action, palette, s } from "./ui";
const colors = ["#254E4B", "#408EAA", "#C2604D", "#DBB04C", "#789B60", "#7E6A9A"];
export const DrawingArt = React.memo(function DrawingArt({ drawing }: { drawing: Drawing }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 1000 650" accessible={false}>
      <Rect width={1000} height={650} fill="#FFFFFF" />
      {drawing.strokes.map((stroke, i) => (
        <Path
          key={i}
          d={pathForStroke(stroke)}
          fill="none"
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {drawing.stamps.map((stamp, i) => (
        <G
          key={i}
          transform={`translate(${stamp.x * 1000 - stamp.size * 500} ${stamp.y * 650 - stamp.size * 500}) scale(${(stamp.size * 1000) / 120})`}
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
}: {
  creation: LibraryCreation;
  onChange: (next: LibraryCreation) => boolean;
  draftKey: string;
  saveError: boolean;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(() => pendingPage(draftKey) ?? creation);
  const [admitted, setAdmitted] = useState(() => !pendingPage(draftKey));
  const [history, setHistory] = useState<DrawingHistory>(() => ({
    present: { strokes: draft.strokes, stamps: draft.stamps },
    past: [],
    future: [],
  }));
  const [color, setColor] = useState(colors[0]);
  const [brush, setBrush] = useState(7);
  const [stamp, setStamp] = useState("");
  const [liveStroke, setLiveStroke] = useState<DrawingStroke | null>(null);
  const [message, setMessage] = useState("");
  const size = useRef({ width: 1, height: 1 });
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
    setHistory(next);
    submit({ ...state.current.creation, ...next.present, updatedAt: Date.now() });
  };
  const updateRef = useRef(update);
  useLayoutEffect(() => {
    updateRef.current = update;
  });
  const finish = () => {
    if (!active.current) return;
    const stroke = active.current;
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
  // PanResponder stores these event callbacks; it never executes them during render.
  // eslint-disable-next-line react-hooks/refs
  const [gesture] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const current = state.current;
        const point = normalizedPoint(
          event.nativeEvent.locationX,
          event.nativeEvent.locationY,
          size.current.width,
          size.current.height
        );
        if (current.stamp) {
          if (current.history.present.stamps.length >= 24) {
            setMessage("This page has room for 24 stamps. Undo one or make another page.");
            return;
          }
          updateRef.current(
            editDrawing(current.history, {
              ...current.history.present,
              stamps: [...current.history.present.stamps, { id: current.stamp, ...point, size: 0.17 }],
            })
          );
          return;
        }
        if (current.history.present.strokes.length >= 120) {
          setMessage("This page is full. You can undo or start another page.");
          return;
        }
        active.current = { color: current.color, width: current.brush, points: [point] };
        setLiveStroke(active.current);
      },
      onPanResponderMove: (event) => {
        if (!active.current || active.current.points.length >= 256) return;
        active.current.points.push(
          normalizedPoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            size.current.width,
            size.current.height
          )
        );
        if (frame.current === null)
          frame.current = requestAnimationFrame(() => {
            frame.current = null;
            if (active.current) setLiveStroke({ ...active.current, points: [...active.current.points] });
          });
      },
      onPanResponderRelease: () => finish(),
      onPanResponderTerminate: () => finish(),
    })
  );
  useEffect(
    () => () => {
      finishRef.current();
    },
    []
  );
  return (
    <View style={{ gap: 14 }}>
      <Text style={s.title}>My page</Text>
      <TextInput
        accessibilityLabel="Page title"
        maxLength={80}
        value={draft.title}
        onChangeText={(title) => submit({ ...state.current.creation, title, updatedAt: Date.now() })}
        style={s.input}
        placeholder="My page"
      />
      <View style={s.row}>
        {colors.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Draw with ${value}`}
            accessibilityState={{ selected: color === value && !stamp }}
            onPress={() => {
              setColor(value);
              setStamp("");
            }}
            style={{
              width: 46,
              height: 46,
              backgroundColor: value,
              borderRadius: 23,
              borderWidth: color === value ? 4 : 1,
              borderColor: color === value ? "#DBB04C" : "#FFFFFF",
            }}
          />
        ))}
        <Action
          selected={color === "#FFFFFF"}
          onPress={() => {
            setColor("#FFFFFF");
            setStamp("");
          }}
        >
          Eraser
        </Action>
        {[4, 10, 22].map((value) => (
          <Action key={value} selected={brush === value} label={`Brush size ${value}`} onPress={() => setBrush(value)}>
            {value === 4 ? "Thin" : value === 10 ? "Medium" : "Thick"}
          </Action>
        ))}
      </View>
      <View
        style={{
          width: "100%",
          aspectRatio: 1000 / 650,
          borderWidth: 2,
          borderColor: palette.ink,
          borderRadius: 18,
          overflow: "hidden",
        }}
        onLayout={(event) => {
          size.current = event.nativeEvent.layout;
        }}
        {...gesture.panHandlers}
        accessibilityLabel="Drawing page. Drag to draw. Choose a stamp then tap to place it."
      >
        <DrawingArt drawing={history.present} />
        {liveStroke && (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            <Svg width="100%" height="100%" viewBox="0 0 1000 650">
              <Path
                d={pathForStroke(liveStroke)}
                fill="none"
                stroke={liveStroke.color}
                strokeWidth={liveStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}
      </View>
      <View style={s.row}>
        <Action disabled={!history.past.length} onPress={() => update(undoDrawing(history))}>
          Undo
        </Action>
        <Action disabled={!history.future.length} onPress={() => update(redoDrawing(history))}>
          Redo
        </Action>
        {["turtle", "moon", "coral", "seagrass"].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Stamp ${value}`}
            accessibilityState={{ selected: stamp === value }}
            onPress={() => setStamp(stamp === value ? "" : value)}
            style={[s.action, stamp === value && s.selected, { width: 64, height: 60 }]}
          >
            <Svg width={44} height={40} viewBox="0 0 120 110">
              <Motif name={value} />
            </Svg>
          </Pressable>
        ))}
      </View>
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
      {(!admitted || saveError) && (
        <Action onPress={() => submit(state.current.creation)}>Retry saving this page</Action>
      )}
      {!!message && <Text style={s.small}>{message}</Text>}
      <Action
        onPress={() => {
          void exportBackup(JSON.stringify({ format: "little-island-page", version: 1, page: draft }, null, 2)).catch(
            () => setMessage("Export could not open. Your saved page is still in My Shelf.")
          );
        }}
      >
        Export my page
      </Action>
    </View>
  );
}
