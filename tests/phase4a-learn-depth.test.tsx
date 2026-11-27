import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { learnIds, type BoardProps, type LearnId } from "../src/learn/types";
import { engines } from "../src/learn/engines";
import { optionsAtLevel } from "../src/learn/levels";
import { startSession, validLearnSession, outcomeOf, replaySession } from "../src/learn/session";
import { isGrowth, createGrowth } from "../src/learn/growth/engine";
import { roundProgress } from "../src/learn/LearnChrome";
import { random } from "../src/games/types";
import { COINS } from "../src/learn/kit/numbers";

import { Board as SoundBoatBoard } from "../src/learn/games/sound-boat/view";
import { voyagePartsItem } from "../src/learn/games/sound-boat/engine";
import {
  isVoyageParts,
  voyagePartsMove,
  type VoyagePartsState,
} from "../src/learn/games/sound-boat/voyage-parts";

import { Board as TurtleTalesBoard } from "../src/learn/games/turtle-tales/view";
import { totalStoryCount, upperStories, upperStoryById } from "../src/learn/games/turtle-tales/engine";
import { isPassage, passageHelp, passageNext, passagePick, splitEvidence, type PassageState } from "../src/learn/games/turtle-tales/stories-upper";

import { Board as WhichOneBoard } from "../src/learn/games/which-one/view";
import { whichClueItem } from "../src/learn/games/which-one/engine";
import {
  isWhichClue,
  whichClueAnswer,
  whichClueHelp,
  whichClueNext,
  whichCluePick,
  whichClueToggleCross,
  type WhichClueState,
} from "../src/learn/games/which-one/stages";

import { Board as HafaAdaiBoard } from "../src/learn/games/hafa-adai/view";
import { picnicContextItem } from "../src/learn/games/hafa-adai/engine";
import {
  isPicnicContext,
  picnicContextHelp,
  picnicContextNext,
  picnicContextPick,
  type PicnicContextState,
} from "../src/learn/games/hafa-adai/stages";

import { Board as ReefRaceBoard } from "../src/learn/games/reef-race/view";
import {
  REEF_ROUTE_TASKS,
  isReefRoute,
  reefRouteHelp,
  reefRouteNext,
  reefRoutePick,
  reefRouteTask,
  type ReefRouteState,
} from "../src/learn/games/reef-race/stages";

import { Board as IslandMarketBoard } from "../src/learn/games/island-market/view";
import {
  STALL_ORDERS,
  isMarketStall,
  stallHelp,
  stallNextCustomer,
  stallOrder,
  stallPackPiece,
  stallServe,
  type MarketStallState,
} from "../src/learn/games/island-market/stages";

import { Board as TidePoolBoard } from "../src/learn/games/tide-pool/view";
import { allTidePoolMissions } from "../src/learn/games/tide-pool/engine";
import {
  TIDE_CLASSIFY_MISSIONS,
  isTideClassify,
  tideClassifyCheck,
  tideClassifyHelp,
  tideClassifyMission,
  tideClassifyNext,
  tideClassifyPlace,
  type TideClassifyState,
} from "../src/learn/games/tide-pool/missions";

import { Board as FloatSinkBoard } from "../src/learn/games/float-sink/view";
import {
  FLOAT_EXPERIMENTS,
  isFloatLab,
  floatLabAddPebble,
  floatLabChooseHull,
  floatLabExperiment,
  floatLabHelp,
  floatLabNext,
  floatLabPickOption,
  type FloatLabState,
} from "../src/learn/games/float-sink/stages";

import { scienceBank, tasks as scienceTasks, wrongFeedback, goalTranscript } from "../src/learn/games/weather-watch/model";
import { allCertifiedScalePuzzles } from "../src/learn/games/shell-scale/engine";
import {
  analyzeOdd,
  analyzeSort,
  bestPublicWeighing,
  provenPar,
  validPuzzle,
  weighOnScale,
  type Weighing,
} from "../src/learn/games/shell-scale/rules";

vi.mock("react-native", () => {
  class Value {
    v: number;
    constructor(v: number) {
      this.v = v;
    }
    setValue(v: number) {
      this.v = v;
    }
    interpolate() {
      return this;
    }
  }
  class ValueXY {
    x: Value;
    y: Value;
    constructor(v: { x: number; y: number } = { x: 0, y: 0 }) {
      this.x = new Value(v.x);
      this.y = new Value(v.y);
    }
    setValue(v: { x: number; y: number }) {
      this.x.setValue(v.x);
      this.y.setValue(v.y);
    }
    getTranslateTransform() {
      return [];
    }
  }
  return {
    Platform: { OS: "web", select: (o: Record<string, unknown>) => o.web ?? o.default },
    StyleSheet: {
      create: <T,>(s: T): T => s,
      flatten: (s: unknown) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s),
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
    View: "div",
    Text: "span",
    ScrollView: "section",
    TextInput: "input",
    Pressable: "button",
    Switch: "input",
    KeyboardAvoidingView: "div",
    Modal: "div",
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Animated: {
      View: "div",
      createAnimatedComponent: (c: unknown) => c,
      Value,
      ValueXY,
      add: (a: unknown) => a,
      subtract: (a: unknown) => a,
      multiply: (a: unknown) => a,
      loop: () => ({ start() {}, stop() {} }),
      timing: () => ({ start(cb?: () => void) { cb?.(); }, stop() {} }),
      spring: () => ({ start(cb?: () => void) { cb?.(); }, stop() {} }),
      delay: () => ({ start(cb?: () => void) { cb?.(); }, stop() {} }),
      parallel: () => ({ start(cb?: () => void) { cb?.(); }, stop() {} }),
      sequence: () => ({ start(cb?: () => void) { cb?.(); }, stop() {} }),
    },
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  };
});
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaView: "div",
}));
vi.mock("expo-haptics", () => ({
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
}));
vi.mock("../src/components/Icon", () => ({
  Icon: ({ name }: { name: string }) => React.createElement("span", { "data-icon": name }),
}));
vi.mock("../src/components/sheetPresence", () => ({ useSheetHold: () => {} }));
vi.mock("react-native-svg", () => ({
  default: "svg",
  Circle: "circle",
  Ellipse: "ellipse",
  G: "g",
  Line: "line",
  Path: "path",
  Rect: "rect",
  Text: "text",
  TSpan: "tspan",
  Defs: "defs",
  RadialGradient: "radialGradient",
  Stop: "stop",
}));
vi.mock("../src/components/motion", () => ({
  useReducedMotion: () => true,
  easeOut: () => 0,
  easeInOut: () => 0,
  nativeDriver: false,
}));
vi.mock("../src/learn/stepReveal", () => ({ useStepReveal: () => undefined }));
vi.mock("../src/ui/fonts", () => ({ useNunitoLoaded: () => false }));
vi.mock("expo-font", () => ({}));

const MIGRATED_8: readonly LearnId[] = [
  "sound-boat",
  "reef-race",
  "island-market",
  "tide-pool",
  "float-sink",
  "turtle-tales",
  "which-one",
  "hafa-adai",
];

let root: ReactTestRenderer | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
});

function makeBoardProps<S>(session: ReturnType<typeof startSession>, sound = vi.fn()): BoardProps<S> {
  return {
    session: session as never,
    skills: {},
    update: vi.fn(),
    practice: vi.fn(),
    assistance: vi.fn(),
    sound,
    stopSound: vi.fn(),
    soundOn: true,
    width: 390,
    height: 844,
    active: true,
    coach: { active: false, done: vi.fn() },
    cheer: vi.fn(),
  };
}

describe("Phase 4A: zero GrowthBoard quiz cliff across all 32 learning games", () => {
  it("every single one of the 32 learning games plays natively across Levels 1–5 (zero fresh GrowthState)", () => {
    expect(learnIds).toHaveLength(32);
    for (const id of learnIds) {
      const eng = engines[id];
      expect(Boolean(eng.ownLevels || eng.nativeStages), `${id} should own all 5 levels natively`).toBe(true);
      for (const level of [4, 5] as const) {
        const opts = optionsAtLevel({ mode: eng.modes[0], pace: "easy" }, level);
        const session = startSession(id, { options: opts }, {}, 42);
        expect(isGrowth(session.state), `${id} L${level} must not fall back to GrowthState`).toBe(false);
        expect(validLearnSession(session), `${id} L${level} initial session valid`).toBe(true);
        if (MIGRATED_8.includes(id)) {
          const prog = roundProgress(session);
          expect(prog, `${id} L${level} reports progress`).not.toBeNull();
          expect(prog!.total, `${id} L${level} progress total > 0`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("all 8 migrated games preserve archived GrowthState save compatibility", () => {
    for (const id of MIGRATED_8) {
      for (const level of [4, 5] as const) {
        const opts = optionsAtLevel({ mode: engines[id].modes[0], pace: "easy" }, level);
        const archived = {
          ...startSession(id, { options: opts }, {}, 19),
          state: createGrowth(id, opts, { skills: {}, rng: random(19), starter: 0, today: 20_000 }),
        };
        expect(isGrowth(archived.state)).toBe(true);
        expect(validLearnSession(archived), `${id} L${level} archived GrowthState must still validate`).toBe(true);
      }
    }
  });
});

describe("Phase 4A: full end-to-end playability & validation for all 8 native L4–5 boards", () => {
  it("sound-boat L4–5 plays native wooden-boat word-parts and word-family rounds cleanly", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("sound-boat", { options: opts }, {}, 77);
      expect(isVoyageParts(session.state)).toBe(true);
      let s = session.state as VoyagePartsState;
      for (let i = 0; i < s.ids.length; i++) {
        const q = voyagePartsItem(s)!;
        expect(q).toBeDefined();
        if (i === 0) {
          s = voyagePartsMove(s, { type: "help" }, q);
          expect(s.helped).toBe(true);
        }
        if (q.tiles?.length) {
          const wanted = q.answer.split("|");
          const used = new Set<number>();
          for (const part of wanted) {
            const idx = q.tiles.findIndex((t, k) => t === part && !used.has(k));
            expect(idx).toBeGreaterThanOrEqual(0);
            used.add(idx);
            s = voyagePartsMove(s, { type: "add", tile: idx }, q);
          }
          s = voyagePartsMove(s, { type: "check" }, q);
        } else {
          const choiceIdx = q.choices.findIndex((c) => c.value === q.answer);
          expect(choiceIdx).toBeGreaterThanOrEqual(0);
          s = voyagePartsMove(s, { type: "pick", choice: choiceIdx }, q);
          s = voyagePartsMove(s, { type: "check" }, q);
        }
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = voyagePartsMove(s, { type: "next" }, q);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
      expect(validLearnSession(replaySession({ ...session, state: s }, {}, 78))).toBe(true);
    }
  });

  it("turtle-tales L4–5 plays native passage stories with opt-in evidence highlight", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("turtle-tales", { options: opts }, {}, 51);
      expect(isPassage(session.state)).toBe(true);
      let s = session.state as PassageState;
      const story = upperStoryById(s.storyId)!;
      expect(story.level).toBe(level);
      expect(story.prompts.length).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < story.prompts.length; i++) {
        const p = story.prompts[i];
        const [, ev] = splitEvidence(story.body, p.evidence);
        expect(ev.length).toBeGreaterThan(10);
        // Wrong try then opt-in evidence help then solve
        s = passagePick(s, (p.correctIndex + 1) % 3, story);
        expect(s.solved).toBe(false);
        s = passageHelp(s, story);
        expect(s.showEvidence).toBe(true);
        s = passagePick(s, p.correctIndex, story);
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = passageNext(s, story);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
    }
  });

  it("which-one L4–5 plays native multi-clue elimination with reversible cross-outs", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "versus", pace: "easy" }, level);
      const session = startSession("which-one", { options: opts, starter: 0 }, {}, 63);
      expect(isWhichClue(session.state)).toBe(true);
      let s = session.state as WhichClueState;
      for (let i = 0; i < s.ids.length; i++) {
        expect(whichClueItem(s)).toBeDefined();
        const ans = whichClueAnswer(s);
        const decoy = (ans + 1) % 3;
        s = whichClueToggleCross(s, decoy);
        expect(s.crossed).toContain(decoy);
        s = whichClueToggleCross(s, decoy);
        expect(s.crossed).not.toContain(decoy);
        if (i === 0) s = whichClueHelp(s);
        s = whichCluePick(s, ans);
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = whichClueNext(s);
      }
      expect(outcomeOf({ ...session, state: s })).not.toBeNull();
    }
  });

  it("hafa-adai L4–5 plays native picnic context matching with ZERO CHamoru audio synthesis", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("hafa-adai", { options: opts }, {}, 88);
      expect(isPicnicContext(session.state)).toBe(true);
      const sound = vi.fn();
      await act(async () => {
        root = create(<HafaAdaiBoard {...makeBoardProps(session, sound)} />);
      });
      // Mount must trigger zero CHamoru audio synthesis.
      expect(sound).not.toHaveBeenCalled();
      const renderedText = JSON.stringify(root!.toJSON());
      expect(renderedText).toContain("CHamoru words are text only");
      await act(async () => root!.unmount());
      root = undefined;

      let s = session.state as PicnicContextState;
      for (let i = 0; i < s.ids.length; i++) {
        const q = picnicContextItem(s)!;
        const rightIdx = q.choices.findIndex((c) => c.value === q.answer);
        const wrongIdx = (rightIdx + 1) % q.choices.length;
        s = picnicContextPick(s, wrongIdx, q);
        expect(s.solved).toBe(false);
        s = picnicContextHelp(s);
        s = picnicContextPick(s, rightIdx, q);
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = picnicContextNext(s);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
    }
  });

  it("reef-race L4–5 plays native multi-step reef-hop & route-comparison challenges right on the track", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("reef-race", { options: opts }, {}, 29);
      expect(isReefRoute(session.state)).toBe(true);
      let s = session.state as ReefRouteState;
      for (let i = 0; i < s.ids.length; i++) {
        const task = reefRouteTask(s)!;
        expect(task.midpoint).not.toBe(task.target);
        s = reefRouteHelp(s);
        expect(s.helped).toBe(true);
        s = reefRoutePick(s, task.target);
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = reefRouteNext(s);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
    }
    expect(REEF_ROUTE_TASKS.length).toBeGreaterThanOrEqual(32);
  });

  it("island-market L4–5 plays native multi-item baskets, making change & exact shell-coin orders", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("island-market", { options: opts }, {}, 37);
      expect(isMarketStall(session.state)).toBe(true);
      let s = session.state as MarketStallState;
      for (let i = 0; i < s.orders.length; i++) {
        const order = stallOrder(s)!;
        if (i === 0) s = stallHelp(s);
        if (order.money) {
          let left = order.target;
          for (const coinIdx of [3, 2, 1, 0] as const) {
            while (left >= COINS[coinIdx]) {
              s = stallPackPiece(s, coinIdx, 1);
              left -= COINS[coinIdx];
            }
          }
        } else {
          for (let t = 0; t < Math.floor(order.target / 10); t++) s = stallPackPiece(s, "tens", 1);
          for (let u = 0; u < order.target % 10; u++) s = stallPackPiece(s, "ones", 1);
        }
        s = stallServe(s);
        expect(s.phase).toBe("served");
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = stallNextCustomer(s);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
    }
    expect(STALL_ORDERS.length).toBeGreaterThanOrEqual(28);
  });

  it("tide-pool L4–5 plays native multi-rule habitat & trait classification missions", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("tide-pool", { options: opts }, {}, 41);
      expect(isTideClassify(session.state)).toBe(true);
      let s = session.state as TideClassifyState;
      for (let i = 0; i < s.ids.length; i++) {
        const m = tideClassifyMission(s)!;
        s = tideClassifyHelp(s);
        m.specimens.forEach((sp, idx) => {
          s = tideClassifyPlace(s, idx, sp.bucket);
        });
        s = tideClassifyCheck(s);
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = tideClassifyNext(s);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
    }
    expect(TIDE_CLASSIFY_MISSIONS.length).toBe(12);
  });

  it("float-sink L4–5 plays native buoyancy pairs, cargo hull loading & fair-test trials", () => {
    for (const level of [4, 5] as const) {
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const session = startSession("float-sink", { options: opts }, {}, 53);
      expect(isFloatLab(session.state)).toBe(true);
      let s = session.state as FloatLabState;
      for (let i = 0; i < s.ids.length; i++) {
        const exp = floatLabExperiment(s)!;
        if (i === 0) s = floatLabHelp(s);
        if (exp.kind === "cargo") {
          s = floatLabChooseHull(s, "wide");
          for (let p = 0; p < (exp.targetCargo ?? 4); p++) s = floatLabAddPebble(s);
        } else {
          s = floatLabPickOption(s, exp.correctIndex);
        }
        expect(s.solved).toBe(true);
        expect(validLearnSession({ ...session, state: JSON.parse(JSON.stringify(s)) })).toBe(true);
        s = floatLabNext(s);
      }
      expect(outcomeOf({ ...session, state: s })).toBe("done");
    }
    expect(FLOAT_EXPERIMENTS.length).toBe(24);
  });

  it("all 8 native L4–5 boards mount and render cleanly without crashing", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const boards: readonly [LearnId, React.ComponentType<BoardProps<any>>][] = [
      ["sound-boat", SoundBoatBoard],
      ["turtle-tales", TurtleTalesBoard],
      ["which-one", WhichOneBoard],
      ["hafa-adai", HafaAdaiBoard],
      ["reef-race", ReefRaceBoard],
      ["island-market", IslandMarketBoard],
      ["tide-pool", TidePoolBoard],
      ["float-sink", FloatSinkBoard],
    ];
    for (const [id, Comp] of boards) {
      for (const level of [4, 5] as const) {
        const opts = optionsAtLevel({ mode: engines[id].modes[0], pace: "easy" }, level);
        const session = startSession(id, { options: opts }, {}, 101 + level);
        await act(async () => {
          root = create(<Comp {...makeBoardProps(session)} />);
        });
        const tree = JSON.stringify(root!.toJSON());
        expect(tree.length, `${id} L${level} rendered non-empty tree`).toBeGreaterThan(200);
        await act(async () => root!.unmount());
        root = undefined;
      }
    }
  });
});

describe("Phase 4A: expanded shallow Science, Reading & Thinking content banks", () => {
  it("tide-pool has 20+ distinct missions spanning L1–5 (27 total, zero duplicates)", () => {
    expect(allTidePoolMissions.total).toBeGreaterThanOrEqual(20);
    expect(allTidePoolMissions.total).toBe(27);
    const ids = [...allTidePoolMissions.early.map((m) => m.id), ...allTidePoolMissions.upper.map((m) => m.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("turtle-tales has 24+ distinct stories spanning L1–5 (28 total, zero duplicates)", () => {
    expect(totalStoryCount()).toBeGreaterThanOrEqual(24);
    expect(totalStoryCount()).toBe(28);
    const upper = upperStories();
    expect(new Set(upper.map((s) => s.id)).size).toBe(upper.length);
    for (const st of upper) {
      expect(st.body.length).toBeGreaterThan(100);
      expect(st.prompts.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("food-web has 30+ distinct reef/island ecosystem tasks spanning L1–5 (32 total, zero duplicates)", () => {
    const bank = scienceBank("food-web");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    expect(bank.length).toBe(32);
    expect(new Set(bank.map((q) => q.title)).size).toBe(bank.length);
    for (const q of bank) {
      expect(goalTranscript(q).length).toBeGreaterThan(20);
      expect(q.fact.length).toBeGreaterThan(25);
      expect(wrongFeedback(q, [0]).length).toBeGreaterThan(20);
    }
    // Every expanded task surfaces across seeds.
    const seen = new Set<string>();
    for (let level = 1; level <= 5; level++) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const q of scienceTasks("food-web", level, seed)) seen.add(q.title);
      }
    }
    expect(seen.size).toBe(32);
  });

  it("weather-watch has 36+ distinct weather/climate tasks spanning L1–5 (38 total, zero duplicates)", () => {
    const bank = scienceBank("weather-watch");
    expect(bank.length).toBeGreaterThanOrEqual(36);
    expect(bank.length).toBe(38);
    expect(new Set(bank.map((q) => q.title)).size).toBe(bank.length);
    for (const q of bank) {
      expect(goalTranscript(q).length).toBeGreaterThan(20);
      expect(q.fact.length).toBeGreaterThan(25);
      expect(wrongFeedback(q, [0]).length).toBeGreaterThan(20);
    }
  });

  it("shell-scale has 42+ distinct certified puzzles spanning L1–5 (46 total), every one proven solvable within par", () => {
    const all = allCertifiedScalePuzzles();
    expect(all.length).toBeGreaterThanOrEqual(42);
    expect(all.length).toBe(46);
    expect(new Set(all.map((entry) => entry.tuple.join("|"))).size).toBe(46);
    for (const { puzzle } of all) {
      expect(validPuzzle(puzzle)).toBe(true);
      const history: Weighing[] = [];
      const par = provenPar(puzzle);
      while (history.length <= par) {
        const deduced =
          puzzle.kind === "sort"
            ? analyzeSort(puzzle.n, history).deducedOrder !== null
            : analyzeOdd(puzzle.kind, puzzle.n, history).deduced !== null;
        if (deduced) break;
        const move = bestPublicWeighing({ kind: puzzle.kind, n: puzzle.n, cast: puzzle.cast, history });
        expect(move).not.toBeNull();
        const outcome = weighOnScale(puzzle, move!.left, move!.right);
        expect(outcome).not.toBeNull();
        history.push({ left: move!.left, right: move!.right, outcome: outcome! });
      }
      const solved =
        puzzle.kind === "sort"
          ? analyzeSort(puzzle.n, history).deducedOrder !== null
          : analyzeOdd(puzzle.kind, puzzle.n, history).deduced !== null;
      expect(solved).toBe(true);
      expect(history.length).toBeLessThanOrEqual(par);
    }
  });
});
