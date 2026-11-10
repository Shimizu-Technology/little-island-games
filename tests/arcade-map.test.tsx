import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LevelMap } from "../src/arcade/LevelMap";
import { arcadeGames } from "../src/arcade/registry";
import { songLevels } from "../src/arcade/games/shell-song/engine";
import { emptyArcadeLearner } from "../src/arcade/progress";
import { allLevelIds } from "../src/arcade/types";
const viewport = vi.hoisted(() => ({ width: 390, height: 844 }));
vi.mock("react-native", () => ({ View: ({ children, testID }: { children?: React.ReactNode; testID?: string }) => <div data-testid={testID}>{children}</div>, Switch: ({ value, accessibilityLabel }: { value: boolean; accessibilityLabel?: string }) => <input type="checkbox" aria-label={accessibilityLabel} checked={value} readOnly/>, useWindowDimensions: () => viewport }));
vi.mock("react-native-reanimated", () => ({ default: { View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }, useSharedValue: (value: unknown) => ({ value }), useAnimatedStyle: () => ({}), cancelAnimation: () => {}, Easing: {}, withDelay: () => {}, withRepeat: () => {}, withSequence: () => {}, withTiming: () => {} }));
vi.mock("react-native-svg", () => ({ default: () => null, Circle: () => null, Path: () => null, Rect: () => null }));
vi.mock("../src/components/ui", () => {
  const Text = ({ children }: { children?: React.ReactNode }) => <span>{children}</span>;
  const Button = ({ children, disabled, accessibilityLabel, testID }: { children?: React.ReactNode; disabled?: boolean; accessibilityLabel?: string; testID?: string }) => <button disabled={disabled} aria-label={accessibilityLabel} data-testid={testID}>{children}</button>;
  return { Button, Copy: Text, Heading: Text, PressableScale: Button, C: { line: "#ccc", paper: "#fff", ink: "#000" }, font: undefined };
});
vi.mock("../src/components/Text", () => ({ Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span> }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true }));
vi.mock("../src/arcade/Art", () => ({ StarDisplay: () => null }));
vi.mock("../src/arcade/Juice", () => ({ Hero: () => null, HudPill: ({ children }: { children?: React.ReactNode }) => <span>{children}</span> }));
vi.mock("../src/arcade/PlayScene", () => ({ PlayScene: () => null }));
vi.mock("../src/arcade/TreasureArt", () => ({ ChestArt: () => null }));
describe("shared 56-level map", () => {
  it.each([[390, 844], [1024, 768]])("renders seven world choices and only the selected world at %s×%s, with every level open", (width, height) => {
    Object.assign(viewport, { width, height });
    const props = { game: arcadeGames.find(g => g.id === "shell-song")!, person: emptyArcadeLearner(), levels: songLevels, onLevel: vi.fn(), onOutfits: vi.fn(), onChest: vi.fn(), active: false };
    const locked = renderToStaticMarkup(<LevelMap {...props}/>);
    // No lock art, locked label or disabled level remains anywhere in the map.
    expect(locked).not.toContain("locked"); expect(locked).not.toContain("stars to explore");
    for (let world = 1; world <= 6; world++) expect(locked).toContain(`World ${world}`);
    expect(locked).toContain("Discover"); expect(locked).toContain("Current level");
    expect(locked).toContain('data-testid="world-w1"');
    expect(locked).not.toContain('data-testid="world-w2"');
    for (const level of allLevelIds.filter(id => id.startsWith("w1-"))) expect(locked).toContain(`data-testid="level-${level}"`);
    expect((locked.match(/data-testid="level-/g) ?? []).length).toBe(8);
    expect(locked).not.toContain('disabled=""');
  });
});
describe("AR-10 dare marks and choices", () => {
  it("marks dare levels on the map, earned or waiting, in the accessible name", async () => {
    const { DareChoice, DareResult } = await import("../src/arcade/DareCard");
    const { arcadeDares } = await import("../src/arcade/dares");
    const props = { game: arcadeGames.find(g => g.id === "shell-song")!, person: emptyArcadeLearner(), levels: songLevels, onLevel: vi.fn(), onOutfits: vi.fn(), onChest: vi.fn(), active: false };
    const html = renderToStaticMarkup(<LevelMap {...props} dareMark={id => id === "w1-6" ? "open" : id === "w1-2" ? "earned" : null}/>);
    expect(html).toMatch(/aria-label="[^"]*level 6[^"]*, has a dare"/);
    expect(html).toMatch(/aria-label="[^"]*level 2[^"]*, dare earned"/);
    expect((html.match(/dare/g) ?? []).length).toBe(2);
    const [song] = arcadeDares.filter(d => d.game === "shell-song");
    const choice = renderToStaticMarkup(<DareChoice dares={[song]} selected={null} marked={() => false} onSelect={vi.fn()}/>);
    expect(choice).toContain("Want a dare?"); expect(choice).toContain("Stars count the same either way."); expect(choice).toContain("Dare: Listen-only song"); expect(choice).not.toContain("checked");
    expect(renderToStaticMarkup(<DareResult dare={song} proved marked/>)).toContain("Dare done: Listen-only song!");
    expect(renderToStaticMarkup(<DareResult dare={song} proved={false} marked={false}/>)).toContain("Your dare will wait for you. Try it any time!");
    expect(renderToStaticMarkup(<DareResult dare={song} proved={false} marked/>)).toContain("Your dare mark stays yours.");
    // Every dare title reads in the result line without a broken sentence.
    for (const d of arcadeDares) expect(renderToStaticMarkup(<DareResult dare={d} proved marked/>)).toContain(`Dare done: ${d.title}!`);
  });
});
