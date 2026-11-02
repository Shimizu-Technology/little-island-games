import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Exhibit, ExhibitProps } from "../src/library/Exhibit";
import { canObserve, keepObservation, observationLabel, skyLabel, waterDestinations } from "../src/library/exhibits";
import { FOOD_CHAIN, HABITATS, LabAction, PLACES, WATER_ACTIONS, WaterPlace, labAction, newLab } from "../src/explore/activities";
import { WorldId } from "../src/explore/content";
import { labAudioKey } from "../src/explore/labAudio";

// Exercise the real Library boards, activity engine and vectors; replace native hosts and presentation tokens.
vi.mock("react-native", () => ({
  View: "View", Text: "Text", Pressable: "Pressable", ScrollView: "ScrollView",
  StyleSheet: { create: (styles: object) => styles, absoluteFill: {} },
  PanResponder: { create: (handlers: object) => ({ panHandlers: handlers }) },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
}));
vi.mock("react-native-svg", () => ({
  default: "Svg", Circle: "Circle", Ellipse: "Ellipse", G: "G", Path: "Path", Rect: "Rect", Line: "Line", Text: "SvgText",
}));
vi.mock("../src/components/Text", () => ({ Text: "Text" }));
vi.mock("../src/library/ui", () => ({ s: { small: {}, heading: {}, actionText: {} } }));
vi.mock("../src/components/ui", () => ({
  C: { ink: "#183F39", teal: "#246858", coral: "#C56D50", cream: "#FCFAF4", paper: "#fff", line: "#DBE3DA", success: "#E3EFE3" },
  Copy: "Copy", Heading: "Heading", Label: "Label", PressableScale: "Pressable",
  Button: ({ onPress, disabled, children }: { onPress: () => void; disabled: boolean; children: React.ReactNode }) =>
    <button onClick={onPress} disabled={disabled}>{children}</button>,
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let renderer: ReactTestRenderer | undefined;
afterEach(async () => { if (renderer) await act(async () => renderer!.unmount()); renderer = undefined; });

async function mount(world: WorldId, initial = newLab(), extra: Partial<ExhibitProps> = {}) {
  let state = initial;
  const actions: LabAction[] = [];
  const onAction = (action: LabAction) => {
    actions.push(action);
    state = labAction(state, action);
    renderer!.update(<Exhibit world={world} state={state} onAction={onAction} sound={false} {...extra} />);
  };
  await act(async () => { renderer = create(<Exhibit world={world} state={state} onAction={onAction} sound={false} {...extra} />); });
  return { state: () => state, actions };
}
function control(label: string) {
  return renderer!.root.findAll((node) => String(node.type) === "Pressable" && node.props.accessibilityLabel === label)[0];
}
async function press(label: string) {
  const button = control(label);
  expect(button, label).toBeDefined();
  expect(button.props.disabled, label).not.toBe(true);
  await act(async () => button.props.onPress());
}
function output() { return JSON.stringify(renderer!.toJSON()); }

describe("bounded visit-only comparison observations", () => {
  it("deep-copies valid snapshots, deduplicates by the model, and bounds the retained comparisons", () => {
    const original = labAction(newLab(), { type: "chain", item: FOOD_CHAIN[0] });
    const first = keepObservation([], "oceans", original);
    expect(first[0].state).toEqual(original);
    expect(first[0].state).not.toBe(original);
    original.chain.push(FOOD_CHAIN[1]);
    expect(first[0].state.chain).toEqual([FOOD_CHAIN[0]]);
    expect(keepObservation(first, "oceans", { ...first[0].state, message: "different feedback" })).toEqual(first);
    const second = keepObservation(first, "oceans", original);
    const third = keepObservation(second, "oceans", labAction(original, { type: "chain", item: FOOD_CHAIN[2] }));
    expect(third).toHaveLength(2);
    expect(third.map((item) => item.state.chain.length)).toEqual([2, 3]);
    expect(first[0].state.chain).toEqual([FOOD_CHAIN[0]]);
  });

  it("uses real Store admission to reject impossible chains, water journeys and turn values", () => {
    const bad = [
      { ...newLab(), chain: ["Larger fish"] },
      { ...newLab(), water: "ice", journey: ["ocean", "cloud", "ice"] },
      { ...newLab(), journey: ["cloud"] },
      { ...newLab(), turn: 8 },
      { ...newLab(), turn: NaN },
      { ...newLab(), habitat: 1, matched: [] },
    ];
    for (const state of bad) expect(keepObservation([], "weather", state)).toEqual([]);
    for (const value of [null, {}, [], "state", { ...newLab(), message: "x".repeat(601) }])
      expect(keepObservation([], "space", value)).toEqual([]);
    const valid = keepObservation([], "space", newLab())[0];
    expect(keepObservation([null, { ...valid, version: 2 }], "animals", newLab())).toEqual([]);
    expect(keepObservation([{ ...valid, world: "unknown" }], "world", newLab())).toEqual([]);
    expect(canObserve("animals")).toBe(false);
    expect(canObserve("world")).toBe(false);
  });

  it("retains only admitted lab fields without copying unrelated or circular caller data", () => {
    const state = { ...newLab(), unrelated: {} };
    state.unrelated = state;
    const observations = keepObservation([], "space", state);
    expect(observations[0].state).toEqual(newLab());
    expect(observations[0].state).not.toHaveProperty("unrelated");
    expect(state.unrelated).toBe(state);
  });

  it("keeps alternate water routes distinct even when both end in the ocean", () => {
    let frozen = newLab();
    for (const action of ["freeze", "melt"]) frozen = labAction(frozen, { type: "water", action });
    const observations = keepObservation(keepObservation([], "weather", newLab()), "weather", frozen);
    expect(observations).toHaveLength(2);
    expect(observationLabel(observations[1])).toBe("Ocean → Ice → Ocean");
    expect(frozen.water).toBe("ocean");
  });

  it("highlights precisely the engine's available water destinations and both daylight edges", () => {
    for (const place of Object.keys(WATER_ACTIONS) as WaterPlace[])
      expect(waterDestinations(place)).toEqual(WATER_ACTIONS[place].map((choice) => choice.next));
    expect(skyLabel(2)).toBe(skyLabel(6));
    expect(skyLabel(2)).toContain("edge");
    expect(skyLabel(0)).toContain("nighttime");
    expect(skyLabel(4)).toContain("daytime");
  });
});

describe("controlled cross-platform Exhibit", () => {
  it("requires the engine's food order, gives its hint, and permits correction after completion", async () => {
    const model = await mount("oceans");
    await press("Larger fish");
    expect(model.state().chain).toEqual([]);
    expect(output()).toContain(model.state().message);
    for (const item of FOOD_CHAIN) await press(item);
    expect(model.state().chain).toEqual(FOOD_CHAIN);
    expect(control("Larger fish").props.disabled).toBe(true);
    await press("Remove last link");
    expect(model.state().chain).toHaveLength(4);
    await press("Larger fish");
    await press("Reset model");
    expect(model.state()).toEqual(newLab());
    expect(control("Remove last link").props.disabled).toBe(true);
  });

  it("keeps two pictures across reset, compares a changed path, and clears them on request or world change", async () => {
    const model = await mount("weather");
    await press("Keep this observation");
    expect(control("Observation kept").props.disabled).toBe(true);
    await press("Cool below freezing");
    await press("Keep this observation");
    expect(output()).toContain("Ocean → Ice");
    await press("Reset model");
    expect(model.state()).toEqual(newLab());
    expect(output()).toContain("Observation 2");
    expect(output()).toContain("Ocean → Ice");
    await press("Clear observations");
    expect(output()).not.toContain("Observation 1");
    await press("Keep this observation");
    await act(async () => renderer!.update(<Exhibit world="space" state={newLab()} onAction={() => {}} sound={false} />));
    expect(output()).not.toContain("Observation 1");
  });

  it("offers each real water branch with the exact engine explanation and offline audio key", async () => {
    const hear = vi.fn();
    for (const place of Object.keys(WATER_ACTIONS) as WaterPlace[]) for (const choice of WATER_ACTIONS[place]) {
      // One-place journeys are valid bounded suffixes of a longer recorded journey.
      const model = await mount("weather", { ...newLab(), water: place, journey: [place] }, { sound: true, onHear: hear });
      for (const available of WATER_ACTIONS[place]) expect(control(available.label).props.disabled).toBe(false);
      await press(choice.label);
      expect(model.state().water).toBe(choice.next);
      expect(output()).toContain(choice.explain);
      await press("Hear this");
      expect(hear).toHaveBeenLastCalledWith(labAudioKey(choice.explain));
      await act(async () => renderer!.unmount());
      renderer = undefined;
    }
  });

  it("steps Earth both ways, preserves a reference picture, and keeps the original diagram tappable", async () => {
    const model = await mount("space");
    await press("Keep this observation");
    await press("Turn back");
    expect(model.state().turn).toBe(7);
    await press("Turn Earth ⅛");
    expect(model.state().turn).toBe(0);
    await press("Turn Earth one eighth. Follow the coral place dot.");
    expect(model.state().turn).toBe(1);
    await press("Keep this observation");
    expect(output()).toContain("1 / 8 · The dot has nighttime");
    expect(output()).toContain("2 / 8 · The dot has nighttime");
  });

  it("consumes a sky swipe and its synthetic click once, then accepts the next tap", async () => {
    const model = await mount("space");
    const board = renderer!.root.find((node) => String(node.type) === "View" && !!node.props.onPanResponderRelease);
    await act(async () => {
      board.props.onPanResponderRelease({}, { dx: -90 });
      control("Turn Earth one eighth. Follow the coral place dot.").props.onPress();
    });
    expect(model.state().turn).toBe(1);
    expect(model.actions).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await press("Turn Earth one eighth. Follow the coral place dot.");
    expect(model.state().turn).toBe(2);
  });

  it("retains all six habitat feedback/next steps and does not put a legacy explanation under the next animal", async () => {
    const model = await mount("animals");
    await press("Freshwater pond");
    expect(model.state().habitat).toBe(0);
    for (const animal of HABITATS) {
      await press(animal.home);
      expect(model.state().message).toBe(animal.why);
      expect(output()).toContain(animal.why);
      expect(control(animal.home)).toBeUndefined();
      await press(model.state().habitat === HABITATS.length ? "See all matches" : "Next animal");
    }
    expect(model.state().matched).toEqual([0, 1, 2, 3, 4, 5]);
    expect(output()).toContain("You found a suitable place for each animal.");
    await act(async () => renderer!.unmount());
    renderer = undefined;
    await mount("animals", { ...newLab(), habitat: 1, matched: [0], message: HABITATS[0].why });
    expect(output()).not.toContain(HABITATS[0].why);
    expect(output()).toContain(HABITATS[1].animal);
  });

  it("keeps every map clue and numbered button reachable, including recovery from a wrong choice", async () => {
    const model = await mount("world");
    await press("2. Japan");
    expect(model.state().expedition).toBe(0);
    for (const [i, place] of PLACES.entries()) {
      expect(output()).toContain(place.clue);
      await press(`${i + 1}. ${place.name}`);
      expect(model.state().message).toBe(place.fact);
    }
    expect(model.state().visited).toEqual(PLACES.map((place) => place.id));
    expect(output()).toContain("Start again to revisit the route.");
    await press("Reset model");
    expect(output()).toContain(PLACES[0].clue);
  });

  it("exposes authored limits and readable hints with sound off, and forwards existing guidance keys", async () => {
    const hear = vi.fn();
    await mount("weather", newLab(), { onHear: hear, limits: "Authored limits supplied by the caller." });
    expect(output()).toContain("Authored limits supplied by the caller.");
    expect(output()).toContain("Sound is off.");
    await press("Hints & word help");
    expect(output()).toContain("Follow one drop of water.");
    const buttons = renderer!.root.findAllByType("button");
    expect(buttons.some((button) => button.props.disabled)).toBe(true);
    expect(hear).not.toHaveBeenCalled();
    await act(async () => renderer!.unmount());
    renderer = undefined;
    await mount("weather", newLab(), { sound: true, onHear: hear, speaking: "lab-weather" });
    await press("Hints & word help");
    const listen = renderer!.root.findAllByType("button").find((button) => button.children.includes("Listen "))!;
    expect(listen).toBeDefined();
    await act(async () => listen.props.onClick());
    expect(hear).toHaveBeenLastCalledWith("lab-weather");
  });
});
