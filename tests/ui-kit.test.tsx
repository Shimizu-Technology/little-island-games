/** Phase 1C: the shared Clean 4.0 UI kit in src/ui/ (docs/LITTLE_ISLAND_4_DESIGN.md). */
import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TextLayoutProvider } from "../src/components/Text";
import { Button, DifficultyPills, DIFFICULTY_WORDS, difficultyOptions, HoldButton, Hud, IconButton, nativeFormSheetOptions, nextRadioIndex, PageHeader, PressTarget, ProfilePill, Sheet, Text, Tile, ToggleRow, glyphs, sheetHeight, shouldDismiss, theme } from "../src/ui";

const env = vi.hoisted(() => ({
  window: { width: 393, height: 852, fontScale: 1 },
  reduced: false,
  withTiming: vi.fn((value: number) => value),
  withSpring: vi.fn((value: number) => value),
  impact: vi.fn(() => Promise.resolve()),
  notify: vi.fn(() => Promise.resolve()),
  os: "ios",
  screenReader: false,
}));

vi.mock("react-native", () => {
  const style = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(style)) : (s && typeof s === "object" ? s as Record<string, unknown> : {});
  return {
    View: "div", Text: "span", Pressable: "button", ScrollView: "section", Modal: "dialog",
    Platform: { get OS() { return env.os; } },
    AccessibilityInfo: { isScreenReaderEnabled: () => Promise.resolve(env.screenReader), addEventListener: () => ({ remove: () => undefined }) },
    StyleSheet: { create: <T,>(s: T) => s, flatten: style, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } },
    PanResponder: { create: (config: object) => ({ panHandlers: config }) },
    useWindowDimensions: () => env.window,
  };
});
vi.mock("react-native-reanimated", () => ({
  default: { View: "div", createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: "system", Never: "never" },
  Easing: { linear: "linear" },
  useAnimatedProps: (fn: () => object) => fn(),
  useSharedValue: (initial: number) => { const box = { value: initial }; return { get: () => box.value, set: (v: number) => { box.value = v; } }; },
  useAnimatedStyle: (fn: () => object) => fn(),
  withTiming: env.withTiming,
  withSpring: env.withSpring,
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle" }));
vi.mock("expo-haptics", () => ({ impactAsync: env.impact, notificationAsync: env.notify, ImpactFeedbackStyle: { Light: "light" }, NotificationFeedbackType: { Success: "success" } }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => env.reduced }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false, NunitoProvider: "div" }));
vi.mock("../src/ui/icons", () => {
  const glyph = (name: string) => Object.assign((props: object) => <svg data-glyph={name} {...props} />, { displayName: name });
  return Object.fromEntries(["ArrowLeft", "ArrowCounterClockwise", "Check", "DotsThree", "Heart", "HouseLine", "Lightbulb", "LockSimple", "MagnifyingGlass", "Play", "Star", "UsersThree", "X"].map(n => [n, glyph(n)]));
});

let root: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  env.window = { width: 393, height: 852, fontScale: 1 };
  env.reduced = false;
  env.os = "ios";
  env.screenReader = false;
  vi.clearAllMocks();
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(element: React.ReactElement, options?: Parameters<typeof create>[1]) {
  await act(async () => { root = create(<TextLayoutProvider>{element}</TextLayoutProvider>, options); });
  return root!.root;
}
const flat = (style: unknown): Record<string, any> => Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : (style && typeof style === "object" ? style as Record<string, any> : {});
const textOf = (n: ReactTestInstance): string => n.children.map(c => typeof c === "string" ? c : textOf(c)).join("");
const host = (r: ReactTestInstance, type: string) => r.findAll(n => n.type === type);
const press = async (n: ReactTestInstance, prop = "onPress") => { await act(async () => { n.props[prop]({ nativeEvent: {} }); }); };

/** WCAG relative luminance and contrast ratio. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

describe("tokens", () => {
  it("match the design spec", () => {
    const c = theme.colors;
    expect([c.bg, c.surface, c.ink, c.muted, c.lagoon, c.coral]).toEqual(["#FFFDF8", "#FFFFFF", "#173330", "#5B6B68", "#1E6B66", "#FF7A5C"]);
    expect(Object.values(theme.pastels)).toEqual(["#FFE3D6", "#DFF0FF", "#FFF2C2", "#F3E5FF", "#DDF5E6", "#FFE0EC"]);
    expect([theme.radius.tile, theme.radius.sheet, theme.radius.full]).toEqual([24, 28, 999]);
    expect(theme.target).toEqual({ child: 64, adult: 48, min: 44 });
    expect(Object.values(theme.type).map(t => t.fontSize)).toEqual([34, 28, 22, 17, 15, 13]);
    expect(theme.shadow).toMatchObject({ shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, shadowOpacity: 0.08 });
  });

  it("keep body text at 15 or more and give every size room for its line", () => {
    for (const [name, t] of Object.entries(theme.type)) {
      if (name !== "small") expect(t.fontSize, name).toBeGreaterThanOrEqual(15);
      expect(t.lineHeight, name).toBeGreaterThan(t.fontSize);
    }
  });

  it("meet WCAG AA for every text pair; white on coral does not, so coral takes ink", () => {
    const c = theme.colors;
    expect(contrast(c.ink, c.coral)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.surface, c.coral)).toBeLessThan(4.5);
    expect(contrast(c.ink, c.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(c.muted, c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.muted, c.lagoonSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.surface, c.lagoon)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.lagoon, c.surface)).toBeGreaterThanOrEqual(4.5);
    for (const status of [c.success, c.conflict]) {
      for (const ground of [c.bg, c.surface]) expect(contrast(status, ground)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(c.success, c.successSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.conflict, c.conflictSoft)).toBeGreaterThanOrEqual(4.5);
    for (const pastel of Object.values(theme.pastels)) expect(contrast(c.ink, pastel)).toBeGreaterThanOrEqual(7);
  });
});

describe("Text", () => {
  it("falls back to the system font at the variant's weight until Nunito loads", async () => {
    const r = await mount(<Text variant="display">Hello</Text>);
    const style = flat(host(r, "span")[0].props.style);
    expect(style).toMatchObject({ fontSize: 34, fontWeight: "800", color: theme.colors.ink });
    expect(style.fontFamily).toBeUndefined();
  });

  it("scales with Dynamic Type: reading text follows it, headings stop at 2x, line height grows with the size", async () => {
    env.window = { ...env.window, fontScale: 3.12 };
    const r = await mount(<><Text variant="body">Read this</Text><Text variant="display">Title</Text></>);
    const [body, display] = host(r, "span");
    expect(body.props.allowFontScaling).not.toBe(false);
    expect(flat(body.props.style).fontSize).toBe(17);
    expect(display.props.allowFontScaling).toBe(false);
    expect(flat(display.props.style)).toMatchObject({ fontSize: 68, lineHeight: 80 });
  });
});

describe("press targets", () => {
  it.each([["min", 44], ["adult", 48], ["child", 64]] as const)("%s floor is %i pt", async (target, size) => {
    const r = await mount(<PressTarget target={target} onPress={() => {}} accessibilityLabel="Go"><Text>Go</Text></PressTarget>);
    expect(flat(host(r, "button")[0].props.style)).toMatchObject({ minWidth: size, minHeight: size });
  });

  it("never lets a caller's style shrink a target below its floor, but lets it grow", async () => {
    const r = await mount(<>
      <PressTarget target="child" onPress={() => {}} accessibilityLabel="A" style={{ minWidth: 10, minHeight: 0 }}><Text>A</Text></PressTarget>
      <PressTarget target="adult" onPress={() => {}} accessibilityLabel="B" style={[{ minHeight: 30 }, { minWidth: 120 }]}><Text>B</Text></PressTarget>
    </>);
    const [a, b] = host(r, "button");
    expect(flat(a.props.style)).toMatchObject({ minWidth: 64, minHeight: 64 });
    expect(flat(b.props.style)).toMatchObject({ minWidth: 120, minHeight: 48 });
  });

  it("is an accessible button that fires onPress with a light haptic when asked", async () => {
    const onPress = vi.fn();
    const r = await mount(<PressTarget haptic onPress={onPress} accessibilityLabel="Go"><Text>Go</Text></PressTarget>);
    const button = host(r, "button")[0];
    expect(button.props.accessibilityRole).toBe("button");
    await press(button);
    expect(onPress).toHaveBeenCalledOnce();
    expect(env.impact).toHaveBeenCalledWith("light");
  });

  it("is inert and dimmed without a handler", async () => {
    const r = await mount(<PressTarget accessibilityLabel="Nothing"><Text>x</Text></PressTarget>);
    const button = host(r, "button")[0];
    expect(button.props.disabled).toBe(true);
    expect(flat(button.props.style).opacity).toBe(theme.opacity.disabled);
  });

  it("scales to 0.96 on touch-down", async () => {
    const r = await mount(<PressTarget onPress={() => {}} accessibilityLabel="Go"><Text>Go</Text></PressTarget>);
    await act(async () => { host(r, "button")[0].props.onPressIn(); });
    expect(env.withTiming).toHaveBeenCalledWith(0.96, expect.objectContaining({ duration: 140 }));
  });

  it("stays still under Reduce Motion but still presses", async () => {
    env.reduced = true;
    const onPress = vi.fn();
    const r = await mount(<PressTarget onPress={onPress} accessibilityLabel="Go"><Text>Go</Text></PressTarget>);
    const button = host(r, "button")[0];
    await act(async () => { button.props.onPressIn(); button.props.onPressOut(); });
    expect(env.withTiming).not.toHaveBeenCalled();
    await press(button);
    expect(onPress).toHaveBeenCalledOnce();
  });
});

describe("Button", () => {
  it("draws the primary action in coral with ink text, never white", async () => {
    const r = await mount(<Button label="Play" onPress={() => {}} />);
    const button = host(r, "button")[0];
    expect(flat(button.props.style)).toMatchObject({ backgroundColor: theme.colors.coral, borderRadius: 999, minHeight: 64 });
    expect(flat(host(r, "span")[0].props.style).color).toBe(theme.colors.ink);
    expect(button.props.accessibilityLabel).toBe("Play");
  });

  it("offers a soft secondary pill and a quiet lagoon text button, at adult size on request", async () => {
    const r = await mount(<><Button label="New puzzle" variant="secondary" target="adult" onPress={() => {}} /><Button label="Not now" variant="quiet" onPress={() => {}} /></>);
    const [secondary, quiet] = host(r, "button");
    expect(flat(secondary.props.style)).toMatchObject({ backgroundColor: theme.colors.lagoonSoft, minHeight: 48 });
    expect(flat(quiet.props.style).backgroundColor).toBe("transparent");
    const [secondaryText, quietText] = host(r, "span");
    expect(flat(secondaryText.props.style).color).toBe(theme.colors.ink);
    expect(flat(quietText.props.style).color).toBe(theme.colors.lagoon);
  });

  it("presses", async () => {
    const onPress = vi.fn();
    const r = await mount(<Button label="Play" onPress={onPress} />);
    await press(host(r, "button")[0]);
    expect(onPress).toHaveBeenCalledOnce();
  });
});

describe("IconButton", () => {
  it("is round, 48 pt by default and 64 pt for children, with its required label", async () => {
    const r = await mount(<><IconButton glyph={glyphs.ArrowLeft} accessibilityLabel="Back" onPress={() => {}} /><IconButton glyph={glyphs.Play} target="child" accessibilityLabel="Play" onPress={() => {}} /></>);
    const [adult, child] = host(r, "button");
    expect(flat(adult.props.style)).toMatchObject({ width: 48, height: 48, minWidth: 48, borderRadius: 999 });
    expect(flat(child.props.style)).toMatchObject({ width: 64, height: 64 });
    expect(adult.props.accessibilityLabel).toBe("Back");
  });

  it("hides its icon from VoiceOver so the label is read once", async () => {
    const r = await mount(<IconButton glyph={glyphs.ArrowLeft} accessibilityLabel="Back" onPress={() => {}} />);
    const hidden = r.findAll(n => n.type === "div" && n.props.accessibilityElementsHidden === true);
    expect(hidden).toHaveLength(1);
    expect(host(hidden[0], "svg")[0].props).toMatchObject({ weight: "bold", color: theme.colors.ink });
  });
});

describe("Tile", () => {
  const art = <div data-art />;

  it("shows the picture on its pastel with no border, and the name below", async () => {
    const r = await mount(<Tile name="Sudoku" pastel="puzzles" art={art} onPress={() => {}} />);
    const picture = r.findAll(n => n.type === "div" && flat(n.props.style).backgroundColor === theme.pastels.puzzles)[0];
    expect(flat(picture.props.style)).toMatchObject({ borderRadius: 24 });
    expect(flat(picture.props.style).borderWidth).toBeUndefined();
    expect(flat(picture.props.style).shadowOpacity).toBeUndefined();
    expect(textOf(host(r, "span")[0])).toBe("Sudoku");
    expect(flat(host(r, "button")[0].props.style).minHeight).toBeGreaterThanOrEqual(64);
  });

  it("takes the one soft shadow only when selected", async () => {
    const r = await mount(<Tile name="Sudoku" pastel="puzzles" art={art} selected onPress={() => {}} />);
    const picture = r.findAll(n => n.type === "div" && flat(n.props.style).backgroundColor === theme.pastels.puzzles)[0];
    expect(flat(picture.props.style).shadowOpacity).toBe(0.08);
    expect(host(r, "button")[0].props.accessibilityState.selected).toBe(true);
  });

  it("opens on press and favorites on long-press, each with a haptic", async () => {
    const onPress = vi.fn(), onLongPress = vi.fn();
    const r = await mount(<Tile name="Sudoku" pastel="puzzles" art={art} onPress={onPress} onLongPress={onLongPress} />);
    const button = host(r, "button")[0];
    await press(button);
    expect(onPress).toHaveBeenCalledOnce();
    expect(onLongPress).not.toHaveBeenCalled();
    await press(button, "onLongPress");
    expect(onLongPress).toHaveBeenCalledOnce();
    expect(env.impact).toHaveBeenCalledTimes(2);
  });

  it("offers VoiceOver a favorite action and says when a tile is a favorite", async () => {
    const onLongPress = vi.fn();
    const r = await mount(<Tile name="Sudoku" pastel="puzzles" art={art} favorite onPress={() => {}} onLongPress={onLongPress} />);
    const button = host(r, "button")[0];
    expect(button.props.accessibilityLabel).toBe("Sudoku, favorite");
    expect(button.props.accessibilityActions).toEqual([{ name: "longpress", label: "Remove from favorites" }]);
    await act(async () => { button.props.onAccessibilityAction({ nativeEvent: { actionName: "longpress" } }); });
    expect(onLongPress).toHaveBeenCalledOnce();
    expect(r.findAll(n => n.props.testID === "tile-favorite")).toHaveLength(1);
  });

  it("shows no badge when it is not a favorite", async () => {
    const r = await mount(<Tile name="Sudoku" pastel="puzzles" art={art} onPress={() => {}} />);
    expect(r.findAll(n => n.props.testID === "tile-favorite")).toHaveLength(0);
  });
});

describe("DifficultyPills", () => {
  const options = difficultyOptions(["4×4", "6×6", "9×9", "9×9", "9×9", "9×9"]);

  it("uses plain words for the six tiers", () => {
    expect(DIFFICULTY_WORDS).toEqual(["Easy", "Medium", "Hard", "Expert", "Master", "Master+"]);
    expect(options.map(o => o.label)).toEqual([...DIFFICULTY_WORDS]);
    expect(options[0]).toEqual({ key: 1, label: "Easy", tag: "4×4" });
  });

  it("shows only the levels a game has", async () => {
    const r = await mount(<DifficultyPills options={difficultyOptions(["4×4", "6×6"])} value={1} onChange={() => {}} />);
    expect(host(r, "button")).toHaveLength(2);
  });

  it("marks the selected pill and says word and size to VoiceOver", async () => {
    const r = await mount(<DifficultyPills options={options} value={3} onChange={() => {}} />);
    const pills = host(r, "button");
    expect(pills.map(p => p.props.accessibilityState.checked)).toEqual([false, false, true, false, false, false]);
    expect(pills.every(p => p.props.accessibilityRole === "radio")).toBe(true);
    expect(pills[0].props.accessibilityLabel).toBe("Easy, 4×4");
    expect(flat(pills[2].props.style).backgroundColor).toBe(theme.colors.lagoon);
    expect(flat(pills[0].props.style).backgroundColor).toBe(theme.colors.lagoonSoft);
    expect(pills.every(p => flat(p.props.style).minHeight === 64)).toBe(true);
  });

  it("selects the pill that is pressed", async () => {
    const onChange = vi.fn();
    const r = await mount(<DifficultyPills options={options} value={1} onChange={onChange} />);
    await press(host(r, "button")[3]);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("is a radio group with one tab stop, and arrow keys move the choice", async () => {
    const onChange = vi.fn();
    const r = await mount(<DifficultyPills options={options} value={2} onChange={onChange} />);
    const group = r.findAll(n => n.props.accessibilityRole === "radiogroup")[0];
    expect(host(r, "button").map(p => p.props.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1]);
    const focus = vi.fn();
    const key = (k: string) => group.props.onKeyDown({ key: k, preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => [{ focus: vi.fn() }, { focus: vi.fn() }, { focus }] } });
    await act(async () => { key("ArrowRight"); });
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(focus).toHaveBeenCalledOnce();
    await act(async () => { key("ArrowLeft"); });
    expect(onChange).toHaveBeenLastCalledWith(1);
    await act(async () => { key("Tab"); });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect([nextRadioIndex("ArrowLeft", 0, 4), nextRadioIndex("ArrowDown", 3, 4), nextRadioIndex("a", 0, 4)]).toEqual([3, 0, undefined]);
  });

  it("gives only the first pill the tab stop when no option is chosen, and arrows start there", async () => {
    const onChange = vi.fn();
    const r = await mount(<DifficultyPills options={options} value={99} onChange={onChange} />);
    expect(host(r, "button").map(p => p.props.tabIndex)).toEqual([0, -1, -1, -1, -1, -1]);
    const group = r.findAll(n => n.props.accessibilityRole === "radiogroup")[0];
    await act(async () => { group.props.onKeyDown({ key: "ArrowRight", preventDefault: vi.fn(), currentTarget: { querySelectorAll: () => [] } }); });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("moves arrows from the focused radio, and Space selects it on Web", async () => {
    const onChange = vi.fn();
    const r = await mount(<DifficultyPills options={options} value={1} onChange={onChange} />);
    const group = r.findAll(n => n.props.accessibilityRole === "radiogroup")[0];
    const radios = [0, 1, 2, 3].map(() => ({ focus: vi.fn(), contains: (_other?: unknown): boolean => false }));
    const focused = radios[2];
    focused.contains = () => true;
    const currentTarget = { querySelectorAll: () => radios };
    await act(async () => { group.props.onKeyDown({ key: "ArrowRight", preventDefault: vi.fn(), target: focused, currentTarget }); });
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(radios[3].focus).toHaveBeenCalledOnce();
    const preventDefault = vi.fn();
    await act(async () => { group.props.onKeyDown({ key: " ", preventDefault, target: focused, currentTarget }); });
    expect(preventDefault).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("wraps to more rows instead of shrinking at large text", async () => {
    const r = await mount(<DifficultyPills options={options} value={1} onChange={() => {}} />);
    expect(flat(r.findAll(n => n.props.accessibilityRole === "radiogroup")[0].props.style).flexWrap).toBe("wrap");
  });
});

describe("ToggleRow", () => {
  it("is a 64 pt switch row that toggles from anywhere on it", async () => {
    const onChange = vi.fn();
    const r = await mount(<ToggleRow glyph={glyphs.UsersThree} label="Play together" value={false} onChange={onChange} />);
    const row = host(r, "button")[0];
    expect(row.props).toMatchObject({ accessibilityRole: "switch", accessibilityLabel: "Play together", accessibilityState: { checked: false, disabled: false } });
    expect(flat(row.props.style).minHeight).toBe(64);
    await press(row);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("turns off when on, and ignores presses while disabled", async () => {
    const onChange = vi.fn();
    const r = await mount(<><ToggleRow label="Sound" value onChange={onChange} /><ToggleRow label="Music" value={false} disabled onChange={onChange} /></>);
    const [sound, music] = host(r, "button");
    await press(sound);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(music.props.disabled).toBe(true);
  });

  it("has no second keyboard stop: the switch is plain, hidden views, and the off track has an outline", async () => {
    const r = await mount(<><ToggleRow label="Sound" value onChange={() => {}} /><ToggleRow label="Music" value={false} onChange={() => {}} /></>);
    expect(host(r, "input")).toHaveLength(0);
    expect(host(r, "button")).toHaveLength(2);
    const [on, off] = r.findAll(n => n.props.testID === "toggle-track");
    expect(on.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(flat(on.props.style)).toMatchObject({ backgroundColor: theme.colors.lagoon, alignItems: "flex-end" });
    expect(flat(off.props.style)).toMatchObject({ backgroundColor: theme.colors.track, borderColor: theme.colors.muted, borderWidth: 2, alignItems: "flex-start" });
    expect(contrast(theme.colors.muted, theme.colors.surface)).toBeGreaterThanOrEqual(3);
  });

  it("toggles on Space on Web, and not while disabled", async () => {
    env.os = "web";
    const onChange = vi.fn();
    const r = await mount(<><ToggleRow label="Sound" value={false} onChange={onChange} /><ToggleRow label="Music" value disabled onChange={onChange} /></>);
    const [sound, music] = host(r, "button");
    const preventDefault = vi.fn();
    await act(async () => { sound.props.onKeyDown({ key: " ", preventDefault }); });
    expect(preventDefault).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(true);
    await act(async () => { sound.props.onKeyDown({ key: "a", preventDefault }); });
    await act(async () => { music.props.onKeyDown({ key: " ", preventDefault }); });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("moves the switch below the words at accessibility text sizes", async () => {
    env.window = { ...env.window, fontScale: 2 };
    const r = await mount(<ToggleRow label="Play together" value onChange={() => {}} />);
    expect(flat(host(r, "button")[0].props.style).flexDirection).toBe("column");
  });
});

describe("Sheet", () => {
  const dismiss = () => vi.fn();

  it("sizes start sheets near 55% and in-game sheets to at most 40%, on every phone", () => {
    for (const h of [568, 667, 852, 932]) {
      expect(sheetHeight(h, "small")).toBeLessThanOrEqual(h * 0.4);
      expect(sheetHeight(h, "dim")).toBeLessThanOrEqual(h * 0.55);
      expect(sheetHeight(h, "dim")).toBeGreaterThan(sheetHeight(h, "small"));
    }
  });

  it("opens a dimmed start sheet in a modal with a scrim, a grabber and a labelled close", async () => {
    const onClose = dismiss();
    const r = await mount(<Sheet visible onClose={onClose}><Text>Sudoku</Text></Sheet>);
    expect(host(r, "dialog")).toHaveLength(1);
    expect(r.findByProps({ testID: "sheet" }).props.accessibilityViewIsModal).toBe(true);
    expect(flat(r.findByProps({ testID: "sheet" }).props.style)).toMatchObject({ maxHeight: sheetHeight(852, "dim"), borderTopLeftRadius: 28, borderTopRightRadius: 28 });
    expect(r.findAll(n => n.props.testID === "sheet-grabber")).toHaveLength(1);
    expect(textOf(r.findByProps({ testID: "sheet" }))).toContain("Sudoku");
    const close = r.findAll(n => n.type === "button" && n.props.accessibilityLabel === "Close")[0];
    expect(flat(close.props.style).minHeight).toBeGreaterThanOrEqual(48);
    await press(close);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes from the scrim and from the VoiceOver escape gesture", async () => {
    const onClose = dismiss();
    const r = await mount(<Sheet visible onClose={onClose}><Text>x</Text></Sheet>);
    const scrim = r.findByProps({ testID: "sheet-backdrop" });
    await press(scrim, "onResponderRelease");
    await act(async () => { r.findByProps({ testID: "sheet" }).props.onAccessibilityEscape(); });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("draws an in-game sheet in place, undimmed, never in a modal, at most 40% tall", async () => {
    const r = await mount(<Sheet visible mode="small" onClose={() => {}}><Text>Mistakes</Text></Sheet>);
    expect(host(r, "dialog")).toHaveLength(0);
    const sheet = r.findByProps({ testID: "sheet" });
    expect(sheet.props.accessibilityViewIsModal).toBe(false);
    expect(flat(sheet.props.style).maxHeight).toBeLessThanOrEqual(852 * 0.4);
    expect(r.findAll(n => n.props.testID === "sheet-backdrop")).toHaveLength(0);
    expect(r.findAll(n => flat(n.props.style).backgroundColor === theme.colors.scrim)).toHaveLength(0);
  });

  it("leaves the board touchable around an in-game sheet", async () => {
    const r = await mount(<Sheet visible mode="small" onClose={() => {}}><Text>x</Text></Sheet>);
    const wrappers = r.findAll(n => n.type === "div" && n.props.pointerEvents === "box-none");
    expect(wrappers.length).toBeGreaterThan(0);
  });

  it("swipes down to close when dragged far or flicked, and settles back otherwise", async () => {
    expect(shouldDismiss(120, 0.1)).toBe(true);
    expect(shouldDismiss(20, 1.2)).toBe(true);
    expect(shouldDismiss(30, 0.2)).toBe(false);
    const onClose = dismiss();
    const r = await mount(<Sheet visible onClose={onClose}><Text>x</Text></Sheet>);
    const handle = r.findAll(n => n.type === "div" && n.props.onPanResponderRelease)[0];
    await act(async () => { handle.props.onPanResponderRelease({}, { dy: 30, vy: 0.2 }); });
    expect(onClose).not.toHaveBeenCalled();
    expect(env.withSpring).toHaveBeenCalled();
    await act(async () => { handle.props.onPanResponderRelease({}, { dy: 140, vy: 0.2 }); });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("only takes a mostly vertical downward drag", async () => {
    const r = await mount(<Sheet visible onClose={() => {}}><Text>x</Text></Sheet>);
    const handle = r.findAll(n => n.type === "div" && n.props.onMoveShouldSetPanResponder)[0];
    expect(handle.props.onMoveShouldSetPanResponder({}, { dx: 2, dy: 40 })).toBe(true);
    expect(handle.props.onMoveShouldSetPanResponder({}, { dx: 40, dy: 10 })).toBe(false);
    expect(handle.props.onMoveShouldSetPanResponder({}, { dx: 0, dy: -40 })).toBe(false);
  });

  it("unmounts after its exit and mounts again when reopened", async () => {
    vi.useFakeTimers();
    const el = (visible: boolean) => <TextLayoutProvider><Sheet visible={visible} mode="small" onClose={() => {}}><Text>x</Text></Sheet></TextLayoutProvider>;
    await act(async () => { root = create(el(true)); });
    expect(root!.root.findAll(n => n.props.testID === "sheet")).toHaveLength(1);
    await act(async () => { root!.update(el(false)); });
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(root!.root.findAll(n => n.props.testID === "sheet")).toHaveLength(0);
    await act(async () => { root!.update(el(true)); });
    expect(root!.root.findAll(n => n.props.testID === "sheet")).toHaveLength(1);
  });

  it("fades instead of sliding under Reduce Motion", async () => {
    env.reduced = true;
    const r = await mount(<Sheet visible onClose={() => {}}><Text>x</Text></Sheet>);
    const style = flat(r.findByProps({ testID: "sheet" }).props.style);
    expect(style.opacity).toBeDefined();
    expect(env.withSpring).not.toHaveBeenCalled();
    expect(env.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 120 }));
  });

  it("slides in on a spring when motion is allowed", async () => {
    const r = await mount(<Sheet visible onClose={() => {}}><Text>x</Text></Sheet>);
    expect(env.withSpring).toHaveBeenCalledWith(1, expect.objectContaining({ damping: 18, stiffness: 180 }));
    expect(flat(r.findByProps({ testID: "sheet" }).props.style).opacity).toBeUndefined();
  });

  it("renders nothing while closed", async () => {
    const r = await mount(<Sheet visible={false} onClose={() => {}}><Text>x</Text></Sheet>);
    expect(r.findAll(n => n.props.testID === "sheet")).toHaveLength(0);
  });
});

describe("Sheet on Web", () => {
  type Handler = (event: { key: string; defaultPrevented: boolean; preventDefault: () => void; stopPropagation: () => void }) => void;
  const setup = () => {
    env.os = "web";
    const opener = { focus: vi.fn(), isConnected: true };
    const handlers: Handler[] = [];
    const doc = {
      activeElement: opener,
      addEventListener: vi.fn((type: string, fn: Handler, capture: boolean) => { if (type === "keydown" && capture) handlers.push(fn); }),
      removeEventListener: vi.fn((type: string, fn: Handler) => { const i = handlers.indexOf(fn); if (type === "keydown" && i >= 0) handlers.splice(i, 1); }),
    };
    vi.stubGlobal("document", doc);
    const nodes: Record<string, { focus: ReturnType<typeof vi.fn> }> = {};
    const createNodeMock = (element: React.ReactElement) => (nodes[(element.props as { testID?: string }).testID ?? "?"] ??= { focus: vi.fn() });
    const escape = () => {
      const event = { key: "Escape", defaultPrevented: false, preventDefault: vi.fn(), stopPropagation: vi.fn() };
      handlers.forEach(h => h(event));
      return event;
    };
    return { opener, handlers, nodes, createNodeMock, escape };
  };

  it.each(["dim", "small"] as const)("closes a %s sheet on Escape, once", async (mode) => {
    const web = setup();
    const onClose = vi.fn();
    await mount(<Sheet visible mode={mode} onClose={onClose}><Text>x</Text></Sheet>, { createNodeMock: web.createNodeMock });
    expect(web.handlers).toHaveLength(1);
    const event = web.escape();
    expect(onClose).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalled();
    web.handlers.forEach(h => h({ key: "a", defaultPrevented: false, preventDefault: vi.fn(), stopPropagation: vi.fn() }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignores Escape while closed and stops listening once closed", async () => {
    const web = setup();
    const onClose = vi.fn();
    const el = (visible: boolean) => <TextLayoutProvider><Sheet visible={visible} mode="small" onClose={onClose}><Text>x</Text></Sheet></TextLayoutProvider>;
    await act(async () => { root = create(el(false), { createNodeMock: web.createNodeMock }); });
    expect(web.handlers).toHaveLength(0);
    await act(async () => { root!.update(el(true)); });
    expect(web.handlers).toHaveLength(1);
    await act(async () => { root!.update(el(false)); });
    expect(web.handlers).toHaveLength(0);
  });

  it("focuses its title on open and gives focus back to the opener on close", async () => {
    vi.useFakeTimers();
    const web = setup();
    const el = (visible: boolean) => <TextLayoutProvider><Sheet visible={visible} title="Sudoku" onClose={() => {}}><Text>x</Text></Sheet></TextLayoutProvider>;
    await act(async () => { root = create(el(true), { createNodeMock: web.createNodeMock }); });
    expect(web.nodes["sheet-title"].focus).toHaveBeenCalled();
    expect(web.nodes.sheet).toBeUndefined();
    expect(root!.root.findByProps({ testID: "sheet-title" }).props.accessibilityRole).toBe("header");
    expect(web.opener.focus).not.toHaveBeenCalled();
    await act(async () => { root!.update(el(false)); });
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(web.opener.focus).toHaveBeenCalledOnce();
  });

  it("remembers the opener, not the sheet, when it is visible on first mount, and restores only after the exit", async () => {
    vi.useFakeTimers();
    const web = setup();
    const doc = (globalThis as unknown as { document: { activeElement: unknown } }).document;
    for (const node of ["sheet-title", "sheet"]) web.nodes[node] = { focus: vi.fn(() => { doc.activeElement = web.nodes[node]; }) };
    const el = (visible: boolean) => <TextLayoutProvider><Sheet visible={visible} title="Sudoku" onClose={() => {}}><Text>x</Text></Sheet></TextLayoutProvider>;
    await act(async () => { root = create(el(true), { createNodeMock: web.createNodeMock }); });
    expect(doc.activeElement).toBe(web.nodes["sheet-title"]);
    await act(async () => { root!.update(el(false)); });
    // The dim Modal is still mounted and trapping focus while the exit plays.
    expect(web.opener.focus).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(web.opener.focus).toHaveBeenCalledOnce();
    expect(web.nodes["sheet-title"].focus).toHaveBeenCalledOnce();
  });

  it("focuses the sheet itself when it has no title, and a re-render does not steal focus back", async () => {
    const web = setup();
    const el = (onClose: () => void) => <TextLayoutProvider><Sheet visible mode="small" onClose={onClose}><Text>x</Text></Sheet></TextLayoutProvider>;
    await act(async () => { root = create(el(() => {}), { createNodeMock: web.createNodeMock }); });
    expect(web.nodes.sheet.focus).toHaveBeenCalled();
    expect(root!.root.findByProps({ testID: "sheet" }).props.tabIndex).toBe(-1);
    await act(async () => { root!.update(el(() => {})); });
    expect(web.opener.focus).not.toHaveBeenCalled();
  });

  it("keeps the scrim out of the tab order", async () => {
    setup();
    const r = await mount(<Sheet visible onClose={() => {}}><Text>x</Text></Sheet>);
    const scrim = r.findByProps({ testID: "sheet-backdrop" });
    expect(scrim.type).toBe("div");
    expect(scrim.props.tabIndex).toBeUndefined();
    expect(host(r, "button").map(b => b.props.accessibilityLabel)).toEqual(["Close"]);
  });

  it("takes no keyboard listener on native", async () => {
    env.os = "ios";
    const doc = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal("document", doc);
    await mount(<Sheet visible mode="small" onClose={() => {}}><Text>x</Text></Sheet>);
    expect(doc.addEventListener).not.toHaveBeenCalled();
  });
});

describe("Sheet and Reduce Motion", () => {
  it("never translates the panel while swiping, but still closes past the threshold", async () => {
    env.reduced = true;
    const onClose = vi.fn();
    const r = await mount(<Sheet visible onClose={onClose}><Text>x</Text></Sheet>);
    expect(flat(r.findByProps({ testID: "sheet" }).props.style).transform).toBeUndefined();
    const handle = r.findAll(n => n.type === "div" && n.props.onPanResponderRelease)[0];
    env.withSpring.mockClear();
    await act(async () => { handle.props.onPanResponderMove({}, { dy: 60, vy: 0.1 }); handle.props.onPanResponderRelease({}, { dy: 30, vy: 0.2 }); handle.props.onPanResponderTerminate(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(env.withSpring).not.toHaveBeenCalled();
    expect(flat(r.findByProps({ testID: "sheet" }).props.style).transform).toBeUndefined();
    await act(async () => { handle.props.onPanResponderRelease({}, { dy: 140, vy: 0.2 }); });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("nativeFormSheetOptions", () => {
  it("is a native formSheet with a grabber and the spec's detents", () => {
    expect(nativeFormSheetOptions()).toMatchObject({
      presentation: "formSheet",
      sheetAllowedDetents: [0.55],
      sheetInitialDetentIndex: 0,
      sheetGrabberVisible: true,
      sheetCornerRadius: 28,
      sheetExpandsWhenScrolledToEdge: false,
      gestureEnabled: true,
      headerShown: false,
    });
    expect(nativeFormSheetOptions("small").sheetAllowedDetents).toEqual([0.4]);
    expect(nativeFormSheetOptions("large").sheetAllowedDetents).toEqual([1]);
  });
});

describe("HoldButton", () => {
  const hold = async (r: ReactTestInstance) => { await act(async () => { host(r, "button")[0].props.onPressIn({}); }); };
  const release = async (r: ReactTestInstance) => { await act(async () => { host(r, "button")[0].props.onPressOut({}); }); };

  it("opens after a two-second hold, with a success haptic, and not before", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" onComplete={onComplete} />);
    await hold(r);
    expect(env.withTiming).toHaveBeenCalledWith(1, expect.objectContaining({ duration: 2000 }));
    await act(async () => { vi.advanceTimersByTime(1999); });
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(env.notify).toHaveBeenCalledWith("success");
    await release(r);
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("starts over when let go early", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" onComplete={onComplete} />);
    await hold(r);
    await act(async () => { vi.advanceTimersByTime(1500); });
    await release(r);
    expect(env.withTiming).toHaveBeenLastCalledWith(0, expect.objectContaining({ reduceMotion: "never" }));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("is a 64 pt button with a ring and a spoken hold hint", async () => {
    const r = await mount(<HoldButton label="Grown-ups" onComplete={() => {}} />);
    const button = host(r, "button")[0];
    expect(flat(button.props.style).minHeight).toBe(64);
    expect(button.props.accessibilityLabel).toBe("Grown-ups");
    expect(button.props.accessibilityHint).toBe("Hold to open");
    expect(r.findAll(n => n.props.testID === "hold-progress")).toHaveLength(1);
  });

  it("offers VoiceOver and Switch Control a confirm that is not timed", async () => {
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" onComplete={onComplete} />);
    const button = host(r, "button")[0];
    expect(button.props.accessibilityActions).toContainEqual({ name: "magicTap", label: "Confirm without holding" });
    await act(async () => { button.props.onAccessibilityAction({ nativeEvent: { actionName: "magicTap" } }); });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("opens on a plain activate while a screen reader is on", async () => {
    env.screenReader = true;
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" onComplete={onComplete} />);
    const button = host(r, "button")[0];
    expect(button.props.accessibilityHint).toBeUndefined();
    await press(button);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("does not open on a quick tap without a screen reader", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" onComplete={onComplete} />);
    await hold(r);
    await release(r);
    await press(host(r, "button")[0]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("opens from Enter or Space on Web, once even with a press event too", async () => {
    env.os = "web";
    env.screenReader = true;
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" onComplete={onComplete} />);
    const button = host(r, "button")[0];
    await act(async () => { button.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() }); });
    await press(button);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("drops an in-flight hold when it becomes disabled, including keyboard and accessibility confirms", async () => {
    vi.useFakeTimers();
    env.os = "web";
    const onComplete = vi.fn();
    const el = (disabled: boolean) => <TextLayoutProvider><HoldButton label="Grown-ups" disabled={disabled} onComplete={onComplete} /></TextLayoutProvider>;
    await act(async () => { root = create(el(false)); });
    await hold(root!.root);
    await act(async () => { vi.advanceTimersByTime(1000); });
    await act(async () => { root!.update(el(true)); });
    expect(env.withTiming).toHaveBeenLastCalledWith(0, expect.objectContaining({ reduceMotion: "never" }));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(onComplete).not.toHaveBeenCalled();
    const button = host(root!.root, "button")[0];
    await act(async () => { button.props.onKeyDown({ key: "Enter", preventDefault: vi.fn() }); });
    await act(async () => { button.props.onAccessibilityAction({ nativeEvent: { actionName: "magicTap" } }); });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("does nothing while disabled", async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const r = await mount(<HoldButton label="Grown-ups" disabled onComplete={onComplete} />);
    await hold(r);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe("PageHeader", () => {
  it("has a back button, a heading and an optional right slot", async () => {
    const onBack = vi.fn();
    const r = await mount(<PageHeader title="Puzzles" onBack={onBack} right={<div data-slot />} />);
    const back = host(r, "button")[0];
    expect(back.props.accessibilityLabel).toBe("Back");
    expect(flat(back.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
    expect(host(r, "span").filter(n => n.props.accessibilityRole === "header").map(textOf)).toEqual(["Puzzles"]);
    expect(r.findAll(n => n.props["data-slot"])).toHaveLength(1);
    await press(back);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("can close instead of go back, with its own label, and omits an empty slot", async () => {
    const r = await mount(<PageHeader title="Closet" close onBack={() => {}} />);
    expect(host(r, "button")[0].props.accessibilityLabel).toBe("Close");
    expect(host(r, "svg")[0].props["data-glyph"]).toBe("X");
    const custom = await mount(<PageHeader title="Closet" backLabel="Back to the map" onBack={() => {}} />);
    expect(host(custom, "button")[0].props.accessibilityLabel).toBe("Back to the map");
  });
});

describe("ProfilePill", () => {
  const face = <div data-face />;

  it("shows face and name at 64 pt on the map", async () => {
    const onPress = vi.fn();
    const r = await mount(<ProfilePill name="Mia" avatar={face} onPress={onPress} />);
    const pill = host(r, "button")[0];
    expect(flat(pill.props.style)).toMatchObject({ minWidth: 64, minHeight: 64, borderRadius: 999 });
    expect(pill.props.accessibilityLabel).toBe("Who is playing: Mia. Switch learner");
    expect(r.findAll(n => n.props["data-face"])).toHaveLength(1);
    expect(host(r, "span").map(textOf)).toEqual(["Mia"]);
    await press(pill);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("is face-only and at least 48 pt when compact, still saying the name aloud", async () => {
    const r = await mount(<ProfilePill compact name="Mia" avatar={face} onPress={() => {}} />);
    const pill = host(r, "button")[0];
    expect(flat(pill.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
    expect(host(r, "span")).toHaveLength(0);
    expect(pill.props.accessibilityLabel).toContain("Mia");
  });
});

describe("Hud", () => {
  const actions = () => ({ onBack: vi.fn(), onUndo: vi.fn(), onHint: vi.fn(), onMore: vi.fn() });

  it("is one 56 pt row: back, name and difficulty, Undo, Hint and More, each labelled", async () => {
    const a = actions();
    const r = await mount(<Hud title="Sudoku" subtitle="Medium 6×6" {...a} />);
    expect(flat(r.findByProps({ testID: "hud" }).props.style)).toMatchObject({ minHeight: 56, flexDirection: "row" });
    const buttons = host(r, "button");
    expect(buttons.map(b => b.props.accessibilityLabel)).toEqual(["Back", "Undo", "Hint", "More"]);
    expect(buttons.every(b => flat(b.props.style).minHeight >= 48)).toBe(true);
    expect(host(r, "span").map(textOf)).toEqual(["Sudoku", "Medium 6×6"]);
    for (const b of buttons) await press(b);
    expect(a.onBack).toHaveBeenCalledOnce();
    expect(a.onUndo).toHaveBeenCalledOnce();
    expect(a.onHint).toHaveBeenCalledOnce();
    expect(a.onMore).toHaveBeenCalledOnce();
  });

  it("shows icons only on a phone and short words on a wide window", async () => {
    const phone = await mount(<Hud title="Sudoku" {...actions()} />);
    expect(host(phone, "span").map(textOf)).toEqual(["Sudoku"]);
    env.window = { ...env.window, width: 820 };
    const ipad = await mount(<Hud title="Sudoku" {...actions()} />);
    expect(host(ipad, "span").map(textOf)).toEqual(["Sudoku", "Undo", "Hint", "More"]);
  });

  it("leaves out buttons it has no handler for, and dims Undo when there is nothing to undo", async () => {
    const r = await mount(<Hud title="Sudoku" onBack={() => {}} onUndo={() => {}} canUndo={false} />);
    const buttons = host(r, "button");
    expect(buttons.map(b => b.props.accessibilityLabel)).toEqual(["Back", "Undo"]);
    expect(buttons[1].props.disabled).toBe(true);
    expect(flat(buttons[1].props.style).opacity).toBe(theme.opacity.disabled);
  });
});
