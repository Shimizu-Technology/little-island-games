/** Phase 1C: the shared Clean 4.0 UI kit in src/ui/ (docs/LITTLE_ISLAND_4_DESIGN.md). */
import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TextLayoutProvider } from "../src/components/Text";
import { Button, DifficultyPills, DIFFICULTY_WORDS, difficultyOptions, IconButton, PressTarget, Sheet, Text, Tile, ToggleRow, glyphs, sheetHeight, shouldDismiss, theme } from "../src/ui";

const env = vi.hoisted(() => ({
  window: { width: 393, height: 852, fontScale: 1 },
  reduced: false,
  withTiming: vi.fn((value: number) => value),
  withSpring: vi.fn((value: number) => value),
  impact: vi.fn(() => Promise.resolve()),
}));

vi.mock("react-native", () => {
  const style = (s: unknown): Record<string, unknown> => Array.isArray(s) ? Object.assign({}, ...s.map(style)) : (s && typeof s === "object" ? s as Record<string, unknown> : {});
  return {
    View: "div", Text: "span", Pressable: "button", ScrollView: "section", Modal: "dialog", Switch: "input",
    StyleSheet: { create: <T,>(s: T) => s, flatten: style, absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } },
    PanResponder: { create: (config: object) => ({ panHandlers: config }) },
    useWindowDimensions: () => env.window,
  };
});
vi.mock("react-native-reanimated", () => ({
  default: { View: "div", createAnimatedComponent: (component: unknown) => component },
  ReduceMotion: { System: "system" },
  useSharedValue: (initial: number) => { const box = { value: initial }; return { get: () => box.value, set: (v: number) => { box.value = v; } }; },
  useAnimatedStyle: (fn: () => object) => fn(),
  withTiming: env.withTiming,
  withSpring: env.withSpring,
}));
vi.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
vi.mock("expo-haptics", () => ({ impactAsync: env.impact, ImpactFeedbackStyle: { Light: "light" } }));
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
  vi.clearAllMocks();
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mount(element: React.ReactElement) {
  await act(async () => { root = create(<TextLayoutProvider>{element}</TextLayoutProvider>); });
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
    expect(pills.map(p => p.props.accessibilityState.selected)).toEqual([false, false, true, false, false, false]);
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
    const scrim = r.findAll(n => n.type === "button" && n.props.accessible === false)[0];
    await press(scrim);
    await act(async () => { r.findByProps({ testID: "sheet" }).props.onAccessibilityEscape(); });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("draws an in-game sheet in place, undimmed, never in a modal, at most 40% tall", async () => {
    const r = await mount(<Sheet visible mode="small" onClose={() => {}}><Text>Mistakes</Text></Sheet>);
    expect(host(r, "dialog")).toHaveLength(0);
    const sheet = r.findByProps({ testID: "sheet" });
    expect(sheet.props.accessibilityViewIsModal).toBe(false);
    expect(flat(sheet.props.style).maxHeight).toBeLessThanOrEqual(852 * 0.4);
    expect(r.findAll(n => n.type === "button" && n.props.accessible === false)).toHaveLength(0);
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
