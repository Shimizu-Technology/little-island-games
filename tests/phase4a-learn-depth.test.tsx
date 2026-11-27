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
import { COINS, sectionOf } from "../src/learn/kit/numbers";
import { admittedReading } from "../src/learn/reading/admit";

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
  FLOAT_LAB_VERSUS_ROUND,
  isFloatLab,
  floatLabAddPebble,
  floatLabChooseHull,
  floatLabExperiment,
  floatLabHelp,
  floatLabNext,
  floatLabPickOption,
  validFloatLab,
  type FloatLabState,
} from "../src/learn/games/float-sink/stages";

import {
  currentTask as scienceCurrentTask,
  expandedTasks as scienceExpandedTasks,
  move as scienceMove,
  roundTasks as scienceRoundTasks,
  scienceBank,
  tasks as scienceTasks,
  wrongFeedback,
  goalTranscript,
  type ScienceStateV1,
  type ScienceStateV2,
} from "../src/learn/games/weather-watch/model";
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

  it("turtle-tales has 20 admitted stories spanning L1–5 (12 picture + 8 pinned inherited upper stories, zero bypass)", () => {
    expect(totalStoryCount()).toBe(20);
    const upper = upperStories();
    expect(upper).toHaveLength(8);
    expect(new Set(upper.map((s) => s.id)).size).toBe(upper.length);
    for (const st of upper) {
      expect(st.body.length).toBeGreaterThan(100);
      expect(st.records.length).toBeGreaterThanOrEqual(3);
      expect(st.prompts.length).toBe(st.records.length);
      for (const rec of st.records) {
        expect(admittedReading(rec, "Turtle Tales test")).toBe(true);
      }
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
    // Every expanded task surfaces across seeds in version-2 expanded rounds.
    const seen = new Set<string>();
    for (let level = 1; level <= 5; level++) {
      for (let seed = 1; seed <= 12; seed++) {
        for (const q of scienceExpandedTasks("food-web", level, seed)) seen.add(q.title);
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

describe("Round 1 review regressions (R1-1 through R1-9)", () => {
  it("R1-1: every Reef Race L4 and L5 target stone, hint stone, and solved route token is reachable through rendered controls", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    // Minor wording nit: rr5-mix-4 must not say "Twin dice +14"
    const mix4 = REEF_ROUTE_TASKS.find((t) => t.id === "rr5-mix-4")!;
    expect(mix4.steps.map((st) => st.label).join(" ")).not.toMatch(/twin dice/i);

    for (const task of REEF_ROUTE_TASKS) {
      const level = task.level;
      const pool = REEF_ROUTE_TASKS.filter((t) => t.level === level && t.id !== task.id);
      const ids = [task.id, ...pool.slice(0, 5).map((t) => t.id)];
      const state: ReefRouteState = {
        kind: "reef-route",
        level,
        starter: 0,
        ids,
        index: 0,
        wrongCount: 0,
        lastWrong: null,
        helped: false,
        solved: false,
        clean: [],
      };
      const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
      const baseSession = { ...startSession("reef-race", { options: opts }, {}, 7), state };
      const update = vi.fn();

      await act(async () => {
        root = create(<ReefRaceBoard {...makeBoardProps(baseSession)} update={update} />);
      });

      if (task.end === 100) {
        // Verify all 4 section buttons exist with neutral labels and >=48pt touch targets, defaulting to anchor's section.
        const anchorSec = sectionOf(task.anchor, 100);
        for (let sec = 0; sec < 4; sec++) {
          const btn = root!.root.findByProps({ testID: `reef-section-${sec}` });
          expect(btn.props.accessibilityState?.selected, `${task.id} sec ${sec}`).toBe(sec === anchorSec);
          expect(btn.props.style.minHeight).toBeGreaterThanOrEqual(48);
          expect(btn.props.style.minWidth).toBeGreaterThanOrEqual(48);
        }
      }

      if (task.kind === "route") {
        // Route comparison: tap the winning route card and verify solved token lands in the viewed section.
        const winnerRoute = task.routes![task.target];
        const routeBtn = root!.root
          .findAll((n) => n.props.accessibilityRole === "button" && typeof n.props.accessibilityLabel === "string")
          .find((n) => (n.props.accessibilityLabel as string).startsWith(winnerRoute.label));
        expect(routeBtn, `${task.id} winning route button`).toBeDefined();
        await act(async () => {
          routeBtn!.props.onPress();
        });
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ solved: true }));
        const solvedSession = { ...baseSession, state: { ...state, solved: true } };
        await act(async () => {
          root!.update(<ReefRaceBoard {...makeBoardProps(solvedSession)} update={update} />);
        });
        const treeStr = JSON.stringify(root!.toJSON());
        expect(treeStr, `${task.id} solved winning token visible`).toContain(`stone ${winnerRoute.landing}`);
      } else {
        // Navigate via rendered section control if target stone is in another L5 section, then tap the actual Stone button!
        const targetSec = sectionOf(task.target, task.end);
        if (task.end === 100 && targetSec !== sectionOf(task.anchor, 100)) {
          const secBtn = root!.root.findByProps({ testID: `reef-section-${targetSec}` });
          await act(async () => {
            secBtn.props.onPress();
          });
        }
        const stoneBtn = root!.root
          .findAll((n) => n.props.accessibilityRole === "button" && typeof n.props.accessibilityLabel === "string")
          .find((n) => new RegExp(`^Stone ${task.target}(?:,|$)`).test(n.props.accessibilityLabel as string));
        expect(stoneBtn, `${task.id} Stone ${task.target} must be rendered & tappable`).toBeDefined();
        await act(async () => {
          stoneBtn!.props.onPress();
        });
        expect(update, `${task.id} tapping Stone ${task.target} solves`).toHaveBeenCalledWith(
          expect.objectContaining({ solved: true }),
        );

        // Verify opt-in Step 1 hint highlights the midpoint stone cleanly in its section.
        const helpedSession = { ...baseSession, state: { ...state, helped: true } };
        await act(async () => {
          root!.update(<ReefRaceBoard {...makeBoardProps(helpedSession)} update={update} />);
        });
        const midSec = sectionOf(task.midpoint, task.end);
        if (task.end === 100) {
          const midSecBtn = root!.root.findByProps({ testID: `reef-section-${midSec}` });
          await act(async () => {
            midSecBtn.props.onPress();
          });
        }
        const midStone = root!.root
          .findAll((n) => n.props.accessibilityRole === "button" && typeof n.props.accessibilityLabel === "string")
          .find((n) => new RegExp(`^Stone ${task.midpoint}(?:,|$)`).test(n.props.accessibilityLabel as string));
        expect(midStone, `${task.id} hint midpoint Stone ${task.midpoint} rendered`).toBeDefined();
        expect(midStone!.props.accessibilityLabel).toContain("tap this one next");
      }

      await act(async () => root!.unmount());
      root = undefined;
    }
  });

  it("R1-2: pre-PR version-1 Weather Watch and Food Web saves keep exact original tasks across non-1 seeds; new rounds use version-2 pinned taskIds", () => {
    // Exact reviewer reproduction: Weather Watch L1, seed 2, completed records [[0],[1],[2],[0]]
    const wwOpts = optionsAtLevel({ mode: "solo", pace: "easy" }, 1);
    const v1Repro: ScienceStateV1 = {
      version: 1,
      seed: 2,
      level: 1,
      index: 4,
      items: [0, 1, 2, 3],
      values: [],
      tested: false,
      actions: 0,
      records: [[0], [1], [2], [0]],
    };
    expect(engines["weather-watch"].validate(v1Repro, wwOpts)).toBe(true);
    expect(scienceRoundTasks("weather-watch", v1Repro).map((q) => q.title)).toEqual([
      "Sunny beach",
      "Rainy walk",
      "Cold mountain",
      "Stormy afternoon",
    ]);

    // Exhaustive pre-PR v1 compatibility across Weather Watch & Food Web, L1–5, multiple non-1 seeds, partial & completed
    for (const game of ["weather-watch", "food-web"] as const) {
      for (const level of [1, 2, 3, 4, 5] as const) {
        const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, level);
        for (const seed of [2, 3, 7, 19]) {
          const origTasks = scienceTasks(game, level, seed);
          // Partial save (at index 1 with 1 completed record)
          const partialV1: ScienceStateV1 = {
            version: 1,
            seed,
            level,
            index: 1,
            items: origTasks.map((_, i) => i),
            values: origTasks[1].target,
            tested: false,
            actions: 1,
            records: [origTasks[0].target],
          };
          expect(engines[game].validate(partialV1, opts), `${game} L${level} seed ${seed} partial v1`).toBe(true);
          expect(scienceCurrentTask(game, partialV1).title).toBe(origTasks[1].title);
          // Advancing a v1 save stays v1 and finishes cleanly
          let progressed = scienceMove(game, partialV1, { type: "test" });
          progressed = scienceMove(game, progressed, { type: "next" });
          expect(progressed.version).toBe(1);
          expect(engines[game].validate(progressed, opts)).toBe(true);
          // Completed v1 save
          const doneV1: ScienceStateV1 = {
            version: 1,
            seed,
            level,
            index: origTasks.length,
            items: origTasks.map((_, i) => i),
            values: [],
            tested: false,
            actions: 0,
            records: origTasks.map((q) => q.target),
          };
          expect(engines[game].validate(doneV1, opts), `${game} L${level} seed ${seed} done v1`).toBe(true);
          expect(engines[game].outcome(doneV1, opts)).toBe("done");
        }
      }
    }

    // Fresh rounds use version 2 with strict taskIds validation
    const freshWw = startSession("weather-watch", { options: wwOpts }, {}, 99).state as ScienceStateV2;
    expect(freshWw.version).toBe(2);
    expect(Array.isArray(freshWw.taskIds)).toBe(true);
    expect(engines["weather-watch"].validate(freshWw, wwOpts)).toBe(true);
    expect(engines["weather-watch"].validate({ ...freshWw, taskIds: ["unknown-id", ...freshWw.taskIds.slice(1)] }, wwOpts)).toBe(false);
    expect(engines["weather-watch"].validate({ ...freshWw, taskIds: [freshWw.taskIds[0], freshWw.taskIds[0], ...freshWw.taskIds.slice(2)] }, wwOpts)).toBe(false);
    expect(engines["weather-watch"].validate({ ...freshWw, taskIds: freshWw.taskIds.slice(0, 2) }, wwOpts)).toBe(false);
  });

  it("R1-4: Float/Sink L4–5 versus rounds give both players equal turns and tie on equal perfect play for both starters", () => {
    for (const level of [4, 5] as const) {
      for (const starter of [0, 1] as const) {
        const opts = optionsAtLevel({ mode: "versus", pace: "easy" }, level);
        const session = startSession("float-sink", { options: opts, starter }, {}, 42 + level);
        let s = session.state as FloatLabState;
        expect(s.ids).toHaveLength(FLOAT_LAB_VERSUS_ROUND);
        expect(FLOAT_LAB_VERSUS_ROUND % 2).toBe(0);
        const turns: number[] = [];
        for (let i = 0; i < s.ids.length; i++) {
          turns.push((s.starter + i) % 2);
          const exp = floatLabExperiment(s)!;
          if (exp.kind === "cargo") {
            s = floatLabChooseHull(s, "wide");
            for (let p = 0; p < (exp.targetCargo ?? 4); p++) s = floatLabAddPebble(s);
          } else {
            s = floatLabPickOption(s, exp.correctIndex);
          }
          s = floatLabNext(s);
        }
        expect(turns.filter((t) => t === 0)).toHaveLength(FLOAT_LAB_VERSUS_ROUND / 2);
        expect(turns.filter((t) => t === 1)).toHaveLength(FLOAT_LAB_VERSUS_ROUND / 2);
        expect(s.clean).toEqual(Array(FLOAT_LAB_VERSUS_ROUND).fill(true));
        expect(validLearnSession({ ...session, state: s })).toBe(true);
        expect(outcomeOf({ ...session, state: s })).toBe("draw");
      }
    }
  });

  it("R1-5: failed experiments never auto-reveal opt-in clues before Help is tapped (Float/Sink, Tide Pool, Which One, Håfa Adai) + coconut wording", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    // Minor wording nit on coconut experiment
    const coco = FLOAT_EXPERIMENTS.find((e) => e.id === "fl4-cmp-coconut-rock")!;
    expect(coco.options[0]).toBe("Whole coconut with fibrous husk");

    // Exact reproduction on fl4-cargo-6: clay bowl + 4 pebbles -> sank, missed: true, helped: false, NO barge reveal until Lab clue tapped
    const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, 4);
    const cargo6Exp = FLOAT_EXPERIMENTS.find((e) => e.id === "fl4-cargo-6")!;
    const baseState: FloatLabState = {
      kind: "float-lab",
      level: 4,
      starter: 0,
      ids: ["fl4-cargo-6", "fl4-cmp-clay", "fl4-cmp-bottle", "fl4-ft-clay", "fl4-ft-sponge"],
      index: 0,
      picked: null,
      shape: null,
      pebbles: 0,
      sank: false,
      missed: false,
      helped: false,
      solved: false,
      clean: [],
    };
    const baseSession = { ...startSession("float-sink", { options: opts }, {}, 11), state: baseState };
    // Pristine render: hint is NOT visible
    await act(async () => {
      root = create(<FloatSinkBoard {...makeBoardProps(baseSession)} />);
    });
    expect(JSON.stringify(root!.toJSON())).not.toContain(cargo6Exp.hint);
    expect(JSON.stringify(root!.toJSON())).toContain("Lab clue");

    // Wrong-answer path: bowl + 4 pebbles -> sinks, missed: true, helped stays false!
    let s = floatLabChooseHull(baseState, "bowl");
    for (let i = 0; i < 4; i++) s = floatLabAddPebble(s);
    expect(s.sank).toBe(true);
    expect(s.missed).toBe(true);
    expect(s.helped).toBe(false);
    expect(validFloatLab(s, 4, opts)).toBe(true);

    await act(async () => {
      root!.update(<FloatSinkBoard {...makeBoardProps({ ...baseSession, state: s })} />);
    });
    const sunkJson = JSON.stringify(root!.toJSON());
    expect(sunkJson).not.toContain(cargo6Exp.hint);
    expect(sunkJson).toContain("Lab clue");

    // Only after explicit opt-in Help does the clue appear
    const helpedState = floatLabHelp(s);
    expect(helpedState.helped).toBe(true);
    await act(async () => {
      root!.update(<FloatSinkBoard {...makeBoardProps({ ...baseSession, state: helpedState })} />);
    });
    expect(JSON.stringify(root!.toJSON())).toContain(cargo6Exp.hint);
    await act(async () => root!.unmount());
    root = undefined;

    // Cross-board audit: Tide Pool, Which One, and Håfa Adai also keep helped=false after a wrong try
    const tpSession = startSession("tide-pool", { options: optionsAtLevel({ mode: "solo", pace: "easy" }, 4) }, {}, 41);
    let tp = tpSession.state as TideClassifyState;
    const tpMission = tideClassifyMission(tp)!;
    tpMission.specimens.forEach((sp, i) => {
      tp = tideClassifyPlace(tp, i, (1 - sp.bucket) as 0 | 1);
    });
    tp = tideClassifyCheck(tp);
    expect(tp.checkedWrong).toBe(true);
    expect(tp.missed).toBe(true);
    expect(tp.helped).toBe(false);
    expect(validLearnSession({ ...tpSession, state: tp })).toBe(true);

    const woSession = startSession("which-one", { options: optionsAtLevel({ mode: "solo", pace: "easy" }, 4) }, {}, 63);
    let wo = woSession.state as WhichClueState;
    wo = whichCluePick(wo, (whichClueAnswer(wo) + 1) % 3);
    expect(wo.wrong).toHaveLength(1);
    expect(wo.helped).toBe(false);
    expect(validLearnSession({ ...woSession, state: wo })).toBe(true);

    const haSession = startSession("hafa-adai", { options: optionsAtLevel({ mode: "solo", pace: "easy" }, 4) }, {}, 88);
    let ha = haSession.state as PicnicContextState;
    const haQ = picnicContextItem(ha)!;
    const wrongHa = haQ.choices.findIndex((c) => c.value !== haQ.answer);
    ha = picnicContextPick(ha, wrongHa, haQ);
    expect(ha.wrong).toHaveLength(1);
    expect(ha.helped).toBe(false);
    expect(validLearnSession({ ...haSession, state: ha })).toBe(true);
  });

  it("R1-6: validFloatLab rejects impossible cargo states (solid ball holding cargo, excess loads, unreachable sinks)", () => {
    const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, 4);
    const validBase: FloatLabState = {
      kind: "float-lab",
      level: 4,
      starter: 0,
      ids: ["fl4-cargo-4", "fl4-cmp-clay", "fl4-cmp-bottle", "fl4-ft-clay", "fl4-ft-sponge"],
      index: 0,
      picked: null,
      shape: null,
      pebbles: 0,
      sank: false,
      missed: false,
      helped: false,
      solved: false,
      clean: [],
    };
    expect(validFloatLab(validBase, 4, opts)).toBe(true);
    const corrupted: FloatLabState[] = [
      // Exact reviewer probe: ball with 9 pebbles, sank: false, solved: true
      { ...validBase, shape: "ball", pebbles: 9, sank: false, solved: true },
      // Ball not marked sunk
      { ...validBase, shape: "ball", pebbles: 0, sank: false, missed: true, solved: false },
      // Ball with pebbles > 0
      { ...validBase, shape: "ball", pebbles: 1, sank: true, missed: true, solved: false },
      // Bowl (cap 3) claiming solved at 4 pebbles
      { ...validBase, shape: "bowl", pebbles: 4, sank: false, solved: true },
      // Wide boat (cap 6, target 4) claiming excess successful load of 6 pebbles
      { ...validBase, shape: "wide", pebbles: 6, sank: false, solved: true },
      // Wide boat (cap 6 >= target 4) marked sank (unreachable because target 4 solves first)
      { ...validBase, shape: "wide", pebbles: 7, sank: true, missed: true, solved: false },
      // Bowl (cap 3) marked sank at wrong pebble count (2 instead of 4)
      { ...validBase, shape: "bowl", pebbles: 2, sank: true, missed: true, solved: false },
      // Bowl (cap 3) marked sank without missed: true
      { ...validBase, shape: "bowl", pebbles: 4, sank: true, missed: false, solved: false },
      // No shape selected yet claiming solved
      { ...validBase, shape: null, pebbles: 4, sank: false, solved: true },
    ];
    for (const bad of corrupted) {
      expect(validFloatLab(bad, 4, opts), JSON.stringify(bad)).toBe(false);
    }
  });

  it("R1-7: all new compact help/clue/evidence buttons and Island Market basket removal targets enforce >=48pt", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const nodeText = (node: unknown): string => {
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (!node || typeof node !== "object") return "";
      const inst = node as { children?: unknown[] };
      return Array.isArray(inst.children) ? inst.children.map(nodeText).join(" ") : "";
    };
    const flatStyle = (st: unknown): Record<string, unknown> => {
      if (!st) return {};
      if (Array.isArray(st)) return Object.assign({}, ...st.map(flatStyle));
      return typeof st === "object" ? (st as Record<string, unknown>) : {};
    };
    const checkHelpTargets: readonly [LearnId, React.ComponentType<BoardProps<any>>, string][] = [
      ["reef-race", ReefRaceBoard, "Step 1 hint"],
      ["float-sink", FloatSinkBoard, "Lab clue"],
      ["tide-pool", TidePoolBoard, "Rule clue"],
      ["turtle-tales", TurtleTalesBoard, "Show evidence"],
      ["which-one", WhichOneBoard, "Clue helper"],
      ["hafa-adai", HafaAdaiBoard, "Peek"],
      ["island-market", IslandMarketBoard, "Step 1 hint"],
      ["sound-boat", SoundBoatBoard, "Help"],
    ];
    for (const [id, Comp, label] of checkHelpTargets) {
      const opts = optionsAtLevel({ mode: engines[id].modes[0], pace: "easy" }, 4);
      const session = startSession(id, { options: opts }, {}, 105);
      await act(async () => {
        root = create(<Comp {...makeBoardProps(session)} />);
      });
      const buttons = root!.root.findAll(
        (n) =>
          n.type === "button" &&
          n.props.accessibilityRole === "button" &&
          (nodeText(n).includes(label) || String(n.props.accessibilityLabel ?? "").includes(label)),
      );
      expect(buttons.length, `${id} renders "${label}" button`).toBeGreaterThan(0);
      const style = flatStyle(buttons[0].props.style);
      expect(Number(style.minHeight), `${id} "${label}" minHeight >= 48`).toBeGreaterThanOrEqual(48);
      await act(async () => root!.unmount());
      root = undefined;
    }

    // Populated Island Market L4 basket removal buttons (crates, mangoes, and shell coins) must be >= 48x48
    const mOpts = optionsAtLevel({ mode: "solo", pace: "easy" }, 4);
    const mSession = startSession("island-market", { options: mOpts }, {}, 37);
    let ms = mSession.state as MarketStallState;
    ms = stallPackPiece(stallPackPiece(ms, "tens", 1), "ones", 1);
    await act(async () => {
      root = create(<IslandMarketBoard {...makeBoardProps({ ...mSession, state: ms })} />);
    });
    const takeBtns = root!.root.findAll(
      (n) =>
        n.type === "button" &&
        n.props.accessibilityRole === "button" &&
        typeof n.props.accessibilityLabel === "string" &&
        (n.props.accessibilityLabel as string).startsWith("Take back"),
    );
    expect(takeBtns.length).toBeGreaterThanOrEqual(2);
    for (const btn of takeBtns) {
      const style = flatStyle(btn.props.style);
      expect(Number(style.minWidth)).toBeGreaterThanOrEqual(48);
      expect(Number(style.minHeight)).toBeGreaterThanOrEqual(48);
    }
    await act(async () => root!.unmount());
    root = undefined;
  });

  it("R1-9: Turtle Tales preserves misses across a correct retry without Show evidence so clean records false", () => {
    const opts = optionsAtLevel({ mode: "solo", pace: "easy" }, 4);
    const session = startSession("turtle-tales", { options: opts }, {}, 51);
    let s = session.state as PassageState;
    const story = upperStoryById(s.storyId)!;
    const p = story.prompts[0];

    // Wrong pick -> right pick -> Next WITHOUT calling passageHelp!
    s = passagePick(s, (p.correctIndex + 1) % 3, story);
    expect(s.missed).toBe(true);
    expect(s.showEvidence).toBe(false);
    expect(validLearnSession({ ...session, state: s })).toBe(true);

    s = passagePick(s, p.correctIndex, story);
    expect(s.solved).toBe(true);
    expect(s.wrong).toBeNull();
    expect(s.missed).toBe(true);
    expect(s.showEvidence).toBe(false);
    expect(validLearnSession({ ...session, state: s })).toBe(true);

    s = passageNext(s, story);
    expect(s.clean).toEqual([false]);
    expect(s.missed).toBe(false);
    expect(validLearnSession({ ...session, state: s })).toBe(true);

    // Next question answered right on first try without Help records clean: true
    const p1 = story.prompts[1];
    s = passagePick(s, p1.correctIndex, story);
    s = passageNext(s, story);
    expect(s.clean).toEqual([false, true]);
  });
});
