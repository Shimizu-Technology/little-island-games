import React from "react";
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { random } from "../src/games/types";
import { optionsAtLevel } from "../src/learn/levelOptions";
import { C, Button } from "../src/components/ui";
import { subjectTheme } from "../src/learn/LearnChrome";
import { engine as feast } from "../src/learn/games/fraction-feast/engine";
import { engine as times } from "../src/learn/games/times-tide/engine";
import { engine as tide } from "../src/learn/games/tide-logic/engine";
import { engine as algebra } from "../src/learn/games/treasure-algebra/engine";
import { engine as letter } from "../src/learn/games/letter-lagoon/engine";
import { engine as shapes } from "../src/learn/games/shape-shift/engine";
import { engine as codeLab } from "../src/learn/games/code-lab/engine";
import * as feastView from "../src/learn/games/fraction-feast/view";
import * as timesView from "../src/learn/games/times-tide/view";
import * as tideView from "../src/learn/games/tide-logic/view";
import * as algebraView from "../src/learn/games/treasure-algebra/view";
import * as letterView from "../src/learn/games/letter-lagoon/view";
import * as shapeView from "../src/learn/games/shape-shift/view";
import * as codeLabView from "../src/learn/games/code-lab/view";

const { renderToStaticMarkup } = createRequire(import.meta.url)("react-dom/server");
const renderRaw = (el: React.ReactElement) => renderToStaticMarkup(el);
const render = (el: React.ReactElement) => renderRaw(el).replaceAll("&quot;", '"');

const { tag } = vi.hoisted(() => ({
  tag: (name: string) =>
    function MockEl(props: Record<string, unknown>) {
      const { children, style, testID } = props;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
      return React.createElement(
        name,
        {
          "data-testid": typeof testID === "string" ? testID : undefined,
          "data-style": flat ? JSON.stringify(flat) : undefined,
        },
        children as React.ReactNode,
      );
    },
}));

vi.mock("react-native", () => ({
  View: tag("div"),
  Text: tag("span"),
  ScrollView: tag("div"),
  Pressable: tag("button"),
  TextInput: tag("input"),
  Switch: tag("input"),
  KeyboardAvoidingView: tag("div"),
  Modal: tag("div"),
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Platform: { OS: "ios", select: (o: Record<string, unknown>) => o.ios },
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: (s: unknown) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s),
    hairlineWidth: 1,
    absoluteFillObject: {},
  },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  Animated: {
    View: tag("div"),
    createAnimatedComponent: (c: unknown) => c,
    Value: class {
      setValue() {}
      stopAnimation() {}
      interpolate() {
        return 0;
      }
    },
    timing: () => ({ start() {}, stop() {} }),
  },
}));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => true }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaView: tag("div"),
}));
vi.mock("expo-haptics", () => ({ impactAsync: () => Promise.resolve(), notificationAsync: () => Promise.resolve(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
vi.mock("expo-speech", () => ({ speak: () => {}, stop: () => {}, isSpeakingAsync: async () => false }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: React.createContext({}) }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => false }));
vi.mock("../src/components/sheetPresence", () => ({ useSheetHold: () => {} }));
vi.mock("../src/components/Icon", () => ({
  Icon: ({ name, color }: { name: string; color?: string }) =>
    React.createElement("span", { "data-icon": name, "data-color": color }),
}));
vi.mock("react-native-gesture-handler", () => ({
  GestureDetector: ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children),
  Gesture: {
    Pan: () => ({
      minDistance() { return this; },
      onStart() { return this; },
      onUpdate() { return this; },
      onEnd() { return this; },
      onFinalize() { return this; },
    }),
  },
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: tag("div") },
  useSharedValue: (v: unknown) => ({ value: v, set() {} }),
  useAnimatedStyle: () => ({}),
  runOnJS: (fn: unknown) => fn,
}));
vi.mock("react-native-svg", () => ({
  default: "svg",
  Circle: "circle",
  Ellipse: "ellipse",
  G: "g",
  Line: "line",
  Path: "path",
  Polygon: "polygon",
  Polyline: "polyline",
  Rect: "rect",
  Text: "text",
}));

const ctx = (seed: number) => ({ rng: random(seed), skills: {}, starter: 0 as const, today: 21000 });
const boardProps = (game: string, options: ReturnType<typeof optionsAtLevel>, state: unknown) =>
  ({
    session: { game, version: 1, id: "t", revision: 0, options, state },
    skills: {},
    active: true,
    width: 358,
    height: 700,
    soundOn: false,
    update: vi.fn(),
    practice: vi.fn(),
    sound: vi.fn(),
    stopSound: vi.fn(),
    cheer: vi.fn(),
    coach: { active: false, done: vi.fn() },
  }) as Record<string, unknown>;
const board = (view: { Board: unknown }) => view.Board as React.ComponentType<Record<string, unknown>>;

const LEGACY_DARK_HEXES = ["#174A51", "#227B80", "#254B4B", "#23334D", "#315D88", "#287A82", "#277A87"];

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function styleForTestId(rawHtml: string, testId: string): Record<string, unknown> {
  const match = rawHtml.match(new RegExp(`data-testid="${testId}"[^>]*data-style="([^"]+)"`));
  expect(match, `expected rendered element with testID="${testId}"`).toBeTruthy();
  return JSON.parse(match![1].replaceAll("&quot;", '"')) as Record<string, unknown>;
}

describe("Phase 3A: Clean 4.0 core primitives & learning playfield visuals", () => {
  it("uses Warm Island Storybook tokens with AA coral foreground and coralFill primary Button", () => {
    expect(C.ink).toBe("#3D2B24");
    expect(C.muted).toBe("#665247");
    expect(C.cream).toBe("#FFF6E5");
    expect(C.paper).toBe("#FFFDF8");
    expect(C.line).toBe("#E8D8BE");
    expect(C.coral).toBe("#C0442B");
    expect(C.coralFill).toBe("#FF7A5C");
    expect(C.teal).toBe("#1E6B66");

    expect(contrastRatio(C.coral, C.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(C.coral, C.cream)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(C.ink, C.coralFill)).toBeGreaterThanOrEqual(4.5);

    const primaryHtml = render(<Button icon="star" onPress={() => {}}>Play</Button>);
    expect(primaryHtml).toContain("#FF7A5C");
    expect(primaryHtml).toContain('data-color="#3D2B24"');
    expect(primaryHtml).toContain('"color":"#3D2B24"');
    expect(primaryHtml).not.toContain('"color":"#FFFDF8"');

    const selectedHtml = render(<Button selected icon="flag" onPress={() => {}}>Picked</Button>);
    expect(selectedHtml).toContain("#1E6B66");
    expect(selectedHtml).toContain('data-color="#FFFDF8"');
    expect(selectedHtml).toContain('"color":"#FFFDF8"');
  });

  it("gives each of the 5 learning subjects a distinct warm accent in LearnChrome", () => {
    const subjects = ["reading", "numbers", "science", "thinking", "coding"] as const;
    const accents = subjects.map((s) => subjectTheme[s].accent);
    expect(new Set(accents).size).toBe(5);
    for (const s of subjects) {
      expect(subjectTheme[s].ink).toBe("#3D2B24");
    }
  });

  it("renders circular SVG food pie in Fraction Feast L1 and hides L5 answer spoiler across all extra modes", () => {
    const l1 = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const s1 = feast.create(l1, ctx(1)) as { tasks: { kind: string }[]; index: number };
    const shareIdx = Math.max(0, s1.tasks.findIndex((t) => t.kind === "share"));
    const l1Html = render(React.createElement(board(feastView), boardProps("fraction-feast", l1, { ...s1, index: shareIdx })));
    expect(l1Html).toContain("<svg");
    expect(l1Html).toContain("<circle");

    const l5 = optionsAtLevel({ mode: "solo", pace: "easy" }, 5);
    const s5 = feast.create(l5, ctx(4));
    expect(s5.tasks.every((t) => t.kind === "decimal")).toBe(true);
    for (const extra of [0, 1, 2] as const) {
      const idx = s5.tasks.findIndex((t) => t.kind === "decimal" && t.extra === extra);
      expect(idx, `L5 decimal task with extra=${extra}`).toBeGreaterThanOrEqual(0);
      const task = s5.tasks[idx];
      const l5Html = render(React.createElement(board(feastView), boardProps("fraction-feast", l5, { ...s5, index: idx, pieces: 35 })));
      if (extra === 0) expect(l5Html).toContain(`$0.${String(task.n).padStart(2, "0")}`);
      if (extra === 1) expect(l5Html).toContain(`${task.n}/100`);
      if (extra === 2) expect(l5Html).toContain(`${task.n}%`);
      expect(l5Html).toContain("35 of 100 squares shaded");
      expect(l5Html).not.toContain("35/100 = 0.35");
      expect(l5Html).not.toContain("= 35%");
    }
  });

  it("uses clean Add/Take off/Undo controls and SVG AreaGrid in Times Tide", () => {
    const l1 = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const s1 = times.create(l1, ctx(2));
    const l1Html = render(React.createElement(board(timesView), boardProps("times-tide", l1, s1)));
    expect(l1Html).toContain("+ Add");
    expect(l1Html).toContain("Undo");
    expect(l1Html).not.toContain("Take back");

    const l4 = optionsAtLevel({ mode: "solo", pace: "easy" }, 4);
    const s4 = times.create(l4, ctx(2)) as { tasks: { kind: string }[]; index: number };
    const areaIdx = Math.max(0, s4.tasks.findIndex((t) => t.kind === "area"));
    const l4Html = render(React.createElement(board(timesView), boardProps("times-tide", l4, { ...s4, index: areaIdx })));
    expect(l4Html).toContain("<svg");
    expect(l4Html).toContain("<rect");
    for (const hex of LEGACY_DARK_HEXES) expect(l4Html).not.toContain(hex);
  });

  it("eliminates raw emoji clues in Tide Logic V3 and dark teal/navy boards across learning games", () => {
    const l3 = optionsAtLevel({ mode: "solo", pace: "easy" }, 3);
    const tideHtml = render(React.createElement(board(tideView), boardProps("tide-logic", l3, tide.create(l3, ctx(5)))));
    expect(tideHtml).not.toContain("🔵");
    expect(tideHtml).not.toContain("🟠");
    expect(tideHtml).not.toContain("🔔");
    for (const hex of LEGACY_DARK_HEXES) expect(tideHtml).not.toContain(hex);

    const l1 = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const algHtml = render(React.createElement(board(algebraView), boardProps("treasure-algebra", l1, algebra.create(l1, ctx(1)))));
    const codeHtml = render(React.createElement(board(codeLabView), boardProps("code-lab", l1, codeLab.create(l1, ctx(1)))));
    const letterHtml = render(React.createElement(board(letterView), boardProps("letter-lagoon", l1, letter.create(l1, ctx(1)))));
    for (const html of [algHtml, codeHtml, letterHtml]) {
      for (const hex of LEGACY_DARK_HEXES) expect(html).not.toContain(hex);
    }
  });

  it("enlarges Letter Lagoon L4 trace checkpoints and Shape Shift tangram tray and action controls to >= 48pt", () => {
    const l4 = optionsAtLevel({ mode: "solo", pace: "easy" }, 4);
    const l4Html = render(React.createElement(board(letterView), boardProps("letter-lagoon", l4, letter.create(l4, ctx(2)))));
    expect(l4Html).not.toContain('font-size="4"');
    expect(l4Html).toContain('font-size="7.5"');

    const l3 = optionsAtLevel({ mode: "solo", pace: "easy" }, 3);
    const baseShape = shapes.create(l3, ctx(3));
    const tangramWithPlaced = {
      ...baseShape,
      mode: "tangram" as const,
      placed: [{ pieceIndex: 0, turns: 0 as const, flipped: false, x: 0, y: 0 }],
    };
    const shapeRawHtml = renderRaw(React.createElement(board(shapeView), boardProps("shape-shift", l3, tangramWithPlaced)));
    const shapeHtml = shapeRawHtml.replaceAll("&quot;", '"');
    expect(shapeHtml).not.toContain('"width":43,"height":43');
    const trayStyle = styleForTestId(shapeRawHtml, "shape-tray-1");
    expect(Number(trayStyle.minWidth)).toBeGreaterThanOrEqual(48);
    expect(Number(trayStyle.minHeight)).toBeGreaterThanOrEqual(48);
    for (const controlId of ["shape-turn", "shape-flip", "shape-undo", "shape-help-button"]) {
      const style = styleForTestId(shapeRawHtml, controlId);
      expect(Number(style.minHeight), `${controlId} minHeight`).toBeGreaterThanOrEqual(48);
    }
  });
});
