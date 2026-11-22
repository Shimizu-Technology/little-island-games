import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { random } from "../src/games/types";
import { engines } from "../src/learn/engines";
import { createGrowth, growthMove, growthProgress, growthQuestions, isGrowth } from "../src/learn/growth/engine";
import { optionsAtLevel } from "../src/learn/levelOptions";
import { levelInfo } from "../src/learn/levels";
import { creditSchool, independentRound, roundStars, type SchoolProgress } from "../src/learn/schoolProgress";
import { replaySession, startSession, validLearnSession } from "../src/learn/session";
import type { LearnId, LearnOptions, LearnSession } from "../src/learn/types";
import { createRound, mathMove, questionOf, type MathRound } from "../src/learn/games/shell-math/round";
import { mathAnswer } from "../src/math/questions";
import { engine as quickEngine, isQuickRound } from "../src/learn/games/quick-practice/engine";
import { engine as hopEngine, isHopRound } from "../src/learn/games/number-hop/engine";
import { answerOf, cueFor, sentenceOf, storyText } from "../src/learn/games/quick-practice/items";
import { createQuick } from "../src/learn/games/quick-practice/round2";
import { emptySave, parseSave } from "../src/state/validation";
import { finishMathRound } from "./helpers/shell-rounds";

const games = ["quick-practice", "number-hop"] as const;
const at = (level: 1 | 2 | 3 | 4 | 5): LearnOptions => ({ ...optionsAtLevel({ mode: "solo", pace: "easy" }, level), mathOperation: "mixed" });
const ctx = (seed: number) => ({ skills: {}, rng: random(seed), starter: 0 as const, today: 1 });

describe("K8 handover for Quick Practice and Number Hop", () => {
  it.each(games)("%s: a paused archived Level 4/5 question round still opens on the shared board and finishes with its stars", (game) => {
    for (const level of [4, 5] as const) {
      const options = at(level);
      let state = createGrowth(game, options, ctx(31));
      const raw = JSON.stringify(state);
      expect(engines[game].validate(state, options)).toBe(true);
      const session: LearnSession = { ...startSession(game, { options }, {}, 3), learner: "a", levelHelped: false, state };
      expect(validLearnSession(session)).toBe(true);
      // The frame picks its board from the saved state: a growth state never reaches the new board.
      expect(isGrowth(session.state)).toBe(true);
      expect(isQuickRound(session.state) || isHopRound(session.state)).toBe(false);
      expect(JSON.stringify(state)).toBe(raw);
      let qs = growthQuestions(game, options, state);
      while (growthProgress(state, qs).index < state.ids.length) {
        const p = growthProgress(state, qs);
        state = growthMove(state, { type: "answer", value: qs[p.index].answer }, qs);
        state = growthMove(state, { type: "next" }, qs);
        qs = growthQuestions(game, options, state);
      }
      expect(engines[game].outcome(state, options)).toBe("done");
      expect(independentRound({ ...session, state })).toBe(true);
      // A new round at the same level is the new mode.
      const fresh = engines[game].create(options, ctx(2));
      expect(isGrowth(fresh)).toBe(false);
      expect((fresh as { version: number; level: number })).toMatchObject({ version: 2, level });
      expect(engines[game].ownLevels).not.toBe(true);
      expect(engines[game].nativeStages).toBe(true);
    }
  });
  it.each(games)("%s: a saved version-1 round at Levels 1 to 3 keeps its own rules and board, and never carries a stage", (game) => {
    for (const pace of ["easy", "medium", "hard"] as const) {
      const options: LearnOptions = { mode: "solo", pace, mathOperation: "mixed" };
      const legacy = createRound(options, game, random(5));
      expect(engines[game].validate(legacy, options)).toBe(true);
      expect(isQuickRound(legacy) || isHopRound(legacy)).toBe(false);
      let s: MathRound = legacy;
      while (s.index < s.questions.length) {
        if (game !== "quick-practice") for (let n = 0; n < questionOf(s).b; n++) s = mathMove(s, game, { type: "step" });
        s = mathMove(s, game, { type: "answer", answer: mathAnswer(questionOf(s)) });
        s = mathMove(s, game, { type: "next" });
      }
      expect(engines[game].outcome(s, options)).toBe("done");
      expect(engines[game].validate(legacy, at(4))).toBe(false);
    }
  });
  it.each(games)("%s: fresh rounds are version 2 at every level, survive a save round trip, and replay into the same level", (game) => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const options = at(level), session = startSession(game, { options }, {}, 8);
      expect(session.state).toMatchObject({ version: 2, level, index: 0 });
      const save = { ...emptySave(), learn: { [game]: session } };
      expect(parseSave(JSON.stringify(save)).learn?.[game]).toEqual(session);
      const next = replaySession(session, {}, 9);
      expect(validLearnSession(next)).toBe(true);
      expect(next.state).toMatchObject({ version: 2, level, index: 0, history: [] });
    }
  });
  it.each(games)("%s: earned stars are unchanged by the move, and a clean new round earns them the same way", (game) => {
    const earned: SchoolProgress = { [game]: { 2: { stars: 3, completed: 4, independent: 2, days: [100, 101], rounds: ["old-1", "old-2"] }, 4: { stars: 2, completed: 1, independent: 1, days: [101], rounds: ["old-3"] } } };
    const frozen = JSON.stringify(earned);
    for (const level of [2, 4] as const) {
      const options = at(level), start = { ...startSession(game, { options }, {}, 4), learner: "a", levelHelped: false };
      const done: LearnSession = { ...start, id: `new-${level}`, state: finishMathRound(start.state, game) };
      expect(engines[game].outcome(done.state, options)).toBe("done");
      expect(independentRound(done)).toBe(true);
      expect(roundStars(done, 3)).toBe(3);
      const after = creditSchool(earned, done, 102);
      expect(after[game]![level]!.stars).toBe(level === 2 ? 3 : 3);
      expect(after[game]![level]!.completed).toBe(earned[game as LearnId]![level]!.completed + 1);
      // A helped round is one star and never lowers what was earned.
      const helped = creditSchool(earned, { ...done, id: `helped-${level}`, levelHelped: true }, 102);
      expect(helped[game]![level]!.stars).toBe(earned[game as LearnId]![level]!.stars);
    }
    expect(JSON.stringify(earned)).toBe(frozen);
  });
});

describe("wording and speech", () => {
  it("names five levels for each game, and the help the engine shows is the line staged for the audio batch", () => {
    const staged = JSON.parse(readFileSync("scripts/learn/n1b-numbers.json", "utf8")) as Record<string, string>;
    expect(Object.keys(staged).sort()).toEqual(["number-hop-help-v2", "quick-practice-help-v2"]);
    expect(staged[quickEngine.helpAudio!]).toBe(quickEngine.help);
    expect(staged[hopEngine.helpAudio!]).toBe(hopEngine.help);
    expect(existsSync("scripts/learn/n1b-numbers.stage"), "voiced in the W5a batch; the staging sidecar is gone").toBe(false);
    for (const g of games) {
      expect(engines[g].levelNames).toHaveLength(5);
      for (const level of [1, 2, 3, 4, 5] as const) expect(levelInfo(g, level).name).toBe(engines[g].levelNames![level - 1].name);
      // No clocks, no speed.
      expect(`${engines[g].help} ${engines[g].description}`).not.toMatch(/\b(fast|quick as|seconds?|timer|hurry|speed)\b/i);
    }
  });
  it("Help's first clue never says the answer unless the question already shows that number", () => {
    for (const level of [1, 2, 3, 4, 5] as const) for (let seed = 1; seed <= 200; seed++) {
      for (const i of createQuick(at(level), random(seed)).items) {
        const ans = String(answerOf(i)), shown = `${sentenceOf(i)} ${i[0] === 3 ? storyText(i) : ""}`;
        const cue = cueFor(i).replace(sentenceOf(i), "");
        if (new RegExp(`(^|\\D)${ans}(\\D|$)`).test(shown)) continue;
        expect(new RegExp(`(^|\\D)${ans}(\\D|$)`).test(cue), `${sentenceOf(i)}: ${cueFor(i)}`).toBe(false);
      }
    }
  });
});
