import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { random } from "../src/games/types";
import { checkDecodability, phonemes, tokens, wordAudio, wordBank, type ReadingScene } from "../src/learn/kit/reading";
import { pictureFor } from "../src/learn/content/reading/clues";
import { LADDERS } from "../src/learn/content/reading/ladders";
import { SENTENCES } from "../src/learn/content/reading/sentences";
import { STORIES } from "../src/learn/content/reading/stories";
import { boatMove, boatSlots, boatWord, engine as boat, missingSlots } from "../src/learn/games/sound-boat/engine";
import { engine as which, whichAnswer, whichNext, whichPick } from "../src/learn/games/which-one/engine";
import {
  engine as tales,
  pageComplete,
  tale,
  taleAnswer,
  taleModel,
  taleNext,
  talePage,
  talePick,
  taleTap,
  taleTurn,
} from "../src/learn/games/turtle-tales/engine";
import type { LearnOptions, Pace } from "../src/learn/types";
const paces: Pace[] = ["easy", "medium", "hard"];
const ctx = (seed = 21) => ({ rng: random(seed), starter: 1 as const, skills: {}, today: 20000 });
const speech = JSON.parse(readFileSync(new URL("../scripts/learn/reading.json", import.meta.url), "utf8")) as Record<
  string,
  string
>;
const sameScene = (a: ReadingScene, b: ReadingScene) =>
  Object.keys(a).filter((k) => a[k as keyof ReadingScene] !== b[k as keyof ReadingScene]);

describe("curated reading content", () => {
  it("has at least 120 unique practice words, 20 four-word ladders, 60 sentences, and 12 six-page stories", () => {
    expect(wordBank.length).toBeGreaterThanOrEqual(120);
    expect(
      wordBank.filter((w) => pictureFor(w.word) && w.tiles.length >= 3 && w.tiles.length <= 5).length
    ).toBeGreaterThanOrEqual(120);
    expect(new Set(wordBank.map((w) => w.word)).size).toBe(wordBank.length);
    expect(LADDERS.length).toBeGreaterThanOrEqual(20);
    expect(SENTENCES.length).toBeGreaterThanOrEqual(60);
    expect(STORIES.length).toBe(12);
    for (const p of paces) {
      expect(STORIES.filter((t) => t.pace === p)).toHaveLength(4);
      expect(SENTENCES.filter((t) => t.pace === p)).toHaveLength(20);
    }
    for (const t of STORIES) {
      expect(t.pages.length).toBeGreaterThanOrEqual(4);
      expect(t.pages.length).toBeLessThanOrEqual(8);
      expect(t.questions).toHaveLength(2);
    }
  });
  it("rejects unknown words and patterns introduced at later paces", () => {
    expect(checkDecodability("The cat is on the mat.", "easy")).toEqual([]);
    expect(checkDecodability("The sheep is in the boat.", "easy")).toEqual(["sheep", "boat"]);
    expect(checkDecodability("The sheep is in the boat.", "hard")).toEqual([]);
    expect(checkDecodability("A unicorn teleports.", "hard")).toEqual(["unicorn", "teleports"]);
  });
  it("segments sounds rather than letters, and keeps silent e with the vowel", () => {
    expect(phonemes("ship")).toEqual(["sh", "i", "p"]);
    expect(phonemes("ring")).toEqual(["r", "i", "ng"]);
    expect(phonemes("clap")).toEqual(["k", "l", "a", "p"]);
    expect(phonemes("cake")).toEqual(["k", "long a", "k"]);
    expect(phonemes("sheep")).toEqual(["sh", "long e", "p"]);
    expect(phonemes("box")).toEqual(["b", "o", "k", "s"]);
    expect(phonemes("unknown")).toEqual([]);
    expect(wordBank.find((w) => w.word === "rose")?.tiles).toEqual(["r", "o_e", "s"]);
    expect(phonemes("rose")).toEqual(["r", "long o", "z"]);
  });
  for (const t of STORIES)
    it(`${t.id}: every title, page and question is decodable at ${t.pace}`, () => {
      for (const text of [t.title, ...t.pages.map((p) => p.text), ...t.questions.flatMap((q) => [q.text, q.prompt])])
        expect(checkDecodability(text, t.pace), text).toEqual([]);
      for (const p of t.pages) expect(tokens(p.text).length).toBeLessThanOrEqual(18);
    });
  it("checks every picture sentence and its near misses", () => {
    for (const item of SENTENCES) {
      expect(checkDecodability(item.text, item.pace), item.text).toEqual([]);
      for (const scene of item.scenes.slice(1)) expect(sameScene(item.scenes[0], scene)).toHaveLength(1);
    }
    for (const t of STORIES)
      for (const q of t.questions)
        for (const scene of q.scenes.slice(1)) expect(sameScene(q.scenes[0], scene)).toHaveLength(1);
  });
  it("every ladder changes exactly one sound per rung", () => {
    for (const ladder of LADDERS)
      for (let i = 0; i < ladder.words.length; i++) {
        const w = ladder.words[i];
        expect(checkDecodability(w, ladder.pace)).toEqual([]);
        if (i) {
          const a = phonemes(ladder.words[i - 1]),
            b = phonemes(w);
          expect(a.length, ladder.id).toBe(b.length);
          expect(
            a.filter((s, j) => s !== b[j]),
            `${ladder.words[i - 1]} → ${w}`
          ).toHaveLength(1);
        }
      }
  });
  it("bundles every word, segment, sentence, page and question with no missing audio", () => {
    const keys = ["sound-boat-help", "turtle-tales-help", "which-one-help"];
    for (const w of wordBank) keys.push(wordAudio(w.word), `sound-boat-segment-${w.word}`);
    for (const i of SENTENCES) {
      keys.push(`which-one-sentence-${i.id}`);
      for (const w of tokens(i.text)) keys.push(wordAudio(w));
    }
    for (const t of STORIES) {
      t.pages.forEach((p, i) => {
        keys.push(`turtle-tales-${t.id}-page-${i}`);
        for (const w of tokens(p.text)) keys.push(wordAudio(w));
      });
      t.questions.forEach((q, i) => {
        keys.push(`turtle-tales-${t.id}-question-${i}`);
        for (const w of tokens(q.text + " " + q.prompt)) keys.push(wordAudio(w));
      });
    }
    for (const key of keys) {
      expect(speech[key], key).toBeTruthy();
      expect(existsSync(new URL(`../assets/audio/${key}.m4a`, import.meta.url)), key).toBe(true);
    }
  });
});

describe("Sound Boat: count → letters → one-sound ladder → island", () => {
  for (const mode of boat.modes)
    for (const pace of paces)
      it(`${mode}/${pace}: completes ten words, persists each transition, and returns correct outcome`, () => {
        const o = { mode, pace };
        let s = boat.create(o, ctx());
        for (let i = 0; i < 10; i++) {
          expect(boat.validate(s, o)).toBe(true);
          const target = boatWord(s);
          const before = boatSlots(s);
          const missing = missingSlots(s);
          if (i > 2 && i !== 6) expect(missing).toHaveLength(1);
          for (let k = 0; k < target.tiles.length; k++) s = boatMove(s, { type: "add" });
          s = boatMove(s, { type: "count" });
          expect(s.stage).toBe("letters");
          expect(boat.validate(s, o)).toBe(true);
          for (const index of missing) {
            s = boatMove(s, { type: "letter", tile: target.tiles[index] });
            expect(boat.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
          }
          expect(s.stage).toBe("sail");
          expect(before.filter(Boolean).length + missing.length).toBe(target.tiles.length);
          s = boatMove(s, { type: "next" });
        }
        expect(boat.validate(s, o)).toBe(true);
        expect(boat.outcome(s, o)).toBe(mode === "versus" ? "draw" : "done");
        expect(boatMove(s, { type: "next" })).toBe(s);
      });
  it("wrong count, wrong letter and hint preserve the word and mark an assisted rung", () => {
    const o: LearnOptions = { mode: "versus", pace: "easy" };
    let s = boat.create(o, ctx());
    s = boatMove(s, { type: "count" });
    expect(s).toMatchObject({ stage: "count", assisted: true, feedback: "count" });
    for (let k = 0; k < boatWord(s).tiles.length; k++) s = boatMove(s, { type: "add" });
    s = boatMove(s, { type: "count" });
    s = boatMove(s, { type: "letter", tile: "not-the-letter" });
    expect(s.loaded).toBe(0);
    expect(s.feedback).toBe("letter");
    s = boatMove(s, { type: "hint" });
    for (const i of missingSlots(s)) s = boatMove(s, { type: "letter", tile: boatWord(s).tiles[i] });
    s = boatMove(s, { type: "next" });
    expect(s.clean).toEqual([false]);
    expect(boat.validate(s, o)).toBe(true);
  });
  it("rejects forged, oversized, contradictory, extra-field and wrong-pace saves", () => {
    const o: LearnOptions = { mode: "solo", pace: "easy" };
    const s = boat.create(o, ctx());
    const corrupt: unknown[] = [
      { ...s, extra: true },
      { ...s, index: 1 },
      { ...s, count: 999 },
      { ...s, loaded: 1 },
      { ...s, stage: "done" },
      { ...s, warmups: ["sheep", "boat"] },
      { ...s, ladders: ["easy-0", "easy-0"] },
      { ...s, assisted: false, feedback: "hint" },
      { ...s, clean: Array(100).fill(true) },
      { ...s, starter: 2 },
      { ...s, count: NaN },
    ];
    for (const bad of corrupt) expect(boat.validate(bad, o)).toBe(false);
  });
});

describe("Which One: careful first tries and untimed family turns", () => {
  for (const mode of which.modes)
    for (const pace of paces)
      it(`${mode}/${pace}: completes and survives reload`, () => {
        const o = { mode, pace };
        let s = which.create(o, ctx());
        for (let i = 0; i < 8; i++) {
          expect(which.turn!(s, o)).toBe((1 + i) % 2);
          if (i === 0) {
            s = whichPick(s, (whichAnswer(s) + 1) % 3);
            expect(s.tried).toBe(true);
            expect(which.validate(s, o)).toBe(true);
          }
          s = whichPick(s, whichAnswer(s));
          expect(which.validate(s, o)).toBe(true);
          expect(whichPick(s, 0)).toBe(s);
          s = whichNext(s);
          expect(which.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
        }
        expect(which.outcome(s, o)).toBe(mode === "versus" ? 0 : "done");
        expect(s.clean).toEqual([false, true, true, true, true, true, true, true]);
      });
  it("rejects inconsistent answers, non-permutations and out-of-range values", () => {
    const o: LearnOptions = { mode: "solo", pace: "easy" };
    const s = which.create(o, ctx());
    for (const bad of [
      { ...s, solved: true, wrong: 0 },
      { ...s, tried: true },
      { ...s, tried: true, wrong: whichAnswer(s) },
      { ...s, orders: Array(8).fill([0, 0, 2]) },
      { ...s, index: 8 },
      { ...s, ids: Array(8).fill(s.ids[0]) },
      { ...s, extra: 1 },
      { ...s, wrong: Infinity },
    ])
      expect(which.validate(bad, o)).toBe(false);
  });
});

describe("Turtle Tales: ordered words, model once per page and sentence turns", () => {
  for (const mode of tales.modes)
    for (const pace of paces)
      it(`${mode}/${pace}: reads six pages and two picture questions`, () => {
        const o = { mode, pace };
        let s = tales.create(o, ctx());
        const t = tale(s);
        for (let p = 0; p < t.pages.length; p++) {
          expect(taleTurn(s)).toBe((s.starter + p) % 2);
          const before = s.word;
          s = taleTap(s, before + 1);
          expect(s.word).toBe(before);
          expect(s.pointed).toBe(true);
          s = taleModel(s);
          expect(taleModel(s)).toBe(s);
          expect(tales.validate(s, o)).toBe(true);
          expect(talePage(s)).toBe(s);
          for (let j = 0; j < tokens(t.pages[p].text).length; j++) {
            s = taleTap(s, j);
            expect(tales.validate(JSON.parse(JSON.stringify(s)), o)).toBe(true);
          }
          expect(pageComplete(s)).toBe(true);
          expect(taleTap(s, 0)).toBe(s);
          s = talePage(s);
          expect(tales.validate(s, o)).toBe(true);
        }
        for (let q = 0; q < 2; q++) {
          s = talePick(s, (taleAnswer(s) + 1) % 3);
          expect(tales.validate(s, o)).toBe(true);
          s = talePick(s, taleAnswer(s));
          expect(tales.validate(s, o)).toBe(true);
          s = taleNext(s);
          expect(tales.validate(s, o)).toBe(true);
        }
        expect(tales.outcome(s, o)).toBe("done");
      });
  it("rejects skipping pages/questions, impossible word positions and future models", () => {
    const o: LearnOptions = { mode: "solo", pace: "easy" };
    const s = tales.create(o, ctx());
    for (const bad of [
      { ...s, word: 99 },
      { ...s, done: true },
      { ...s, question: 1 },
      { ...s, modelPages: [3] },
      { ...s, modelPages: [0, 0] },
      { ...s, wrong: 1 },
      { ...s, solved: true },
      { ...s, page: 6, word: 1 },
      { ...s, extra: 1 },
      { ...s, starter: -1 },
    ])
      expect(tales.validate(bad, o)).toBe(false);
  });
});
