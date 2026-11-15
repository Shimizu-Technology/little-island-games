import React, { createContext } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { ChallengeBoard } from "../src/learn/games/sound-boat/challenge-view";
import { challengeEngine } from "../src/learn/games/sound-boat/challenge-engine";
import { PartsBoard } from "../src/learn/games/sound-boat/parts-view";
import type { PartsState } from "../src/learn/games/sound-boat/parts";
import { letterTaskById, type MintedTask } from "../src/learn/reading/tasks";

/**
 * R3-1: each host checks the task itself before it hands it to the word board, so the board's own check is a second
 * layer, not the only one. The word board is replaced here by a recorder of what each host gives it.
 */
const drawn = vi.hoisted(() => [] as unknown[]);
vi.mock("../src/learn/games/sound-boat/BuildBoat", () => ({
  BuildBoat: (p: { task: unknown }) => { drawn.push(p.task); return null; },
  RefusedTask: () => React.createElement("refused"),
}));
vi.mock("react-native", () => ({ View: "div", useWindowDimensions: () => ({ fontScale: 1 }) }));
vi.mock("react-native-svg", () => ({ default: "svg", Circle: "circle", Rect: "rect", Path: "path", Ellipse: "ellipse", G: "g" }));
vi.mock("../src/components/ui", () => ({ Button: "button", IconButton: "button", PressableScale: "button", C: {}, Copy: "p", Heading: "h2" }));
vi.mock("../src/components/motion", () => ({ useReducedMotion: () => true, easeOut: () => 0, nativeDriver: false }));
vi.mock("../src/learn/stepReveal", () => ({ useStepReveal: () => undefined }));
vi.mock("../src/learn/art/Objects", () => ({ PictureObject: "picture" }));
vi.mock("../src/components/Audio", () => ({ AudioPreferences: createContext({ sound: true }), useSoundControls: () => ({ play: vi.fn(), stop: vi.fn() }) }));

let root: ReactTestRenderer | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; drawn.length = 0; });
const mount = async (el: React.ReactElement) => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); await act(async () => { root = create(el); }); };
const forged = { id: "r3-host", word: "sunset", level: 4, skill: "read.compound", tiles: ["sun", "set"], tray: ["sun", "set", "sin", "sit"], alternates: [], cue: null } as unknown as MintedTask;

it("the Challenge board never hands an unminted task to the word board", async () => {
  await mount(<ChallengeBoard state={challengeEngine.create(forged, { version: 1 }, { supportOff: false, ownRead: true })} dispatch={vi.fn()} active width={335} />);
  expect(drawn).toEqual([]);
  expect(root!.root.findAllByType("refused" as never)).toHaveLength(1);
  const minted = letterTaskById("w-cat")!;
  await act(async () => root!.update(<ChallengeBoard state={challengeEngine.create(minted, { version: 1 }, { supportOff: false, ownRead: true })} dispatch={vi.fn()} active width={335} />));
  expect(drawn.at(-1)).toBe(minted);
});

it("the School parts board never hands a word that is not admitted to the word board", async () => {
  const state = { kind: "parts", level: 4, ids: ["a", "b", "c", "d", "e", "f"], starter: 0, index: 0, answer: { draft: [], revision: 0, checkedRevision: null, checks: 0, misses: 0, solved: false, helped: false, needsVariant: false, last: null }, clean: [], heard: false } as PartsState;
  const session = { game: "sound-boat" as const, version: 1 as const, id: "h", revision: 1, options: { mode: "solo" as const, pace: "easy" as const, stage: "stretch" as const }, state };
  await mount(<PartsBoard session={session} skills={{}} update={vi.fn()} practice={vi.fn()} assistance={vi.fn()} sound={vi.fn()} stopSound={vi.fn()} soundOn width={335} height={800} active coach={{ active: false, done: vi.fn() }} cheer={vi.fn()} />);
  expect(drawn).toEqual([]);
  expect(root!.root.findAllByType("refused" as never)).toHaveLength(1);
});
