import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PICTURE_WORDS } from "../src/learn/content/reading/clues";
import { LADDERS } from "../src/learn/content/reading/ladders";
import { WORDS } from "../src/learn/content/reading/words";
import { admittedParts, admitParts } from "../src/learn/reading/admitted";
import { loadReadingBank, readingBankIds, type ReadingBank } from "../content/words/registry";
import { applyAffix, spellings, stemOf } from "../src/learn/reading/morphology";
import { patternsOf, primaryPattern, tilesSpell } from "../src/learn/reading/graphemes";
import { INHERITED_DIGEST, inheritedWords } from "../src/learn/reading/inherited";
import type { PartsDraft, PartsWord, ReadingText, WordBank } from "../src/learn/reading/records";
import { SCOPE, levelOfPace, levelOfStep, partsSkills, stepForSkill, taughtThrough } from "../src/learn/reading/scope";
import * as validate from "../src/learn/reading/validate";
import { bankDigest, inheritedIssues, letterBankIssues, lexiconOf, partsBankIssues, partsWordIssues, textIssues } from "../src/learn/reading/validate";
import { readingEvidence } from "../src/learn/reading/evidence";
import { tapWord } from "../src/learn/reading/tap";
import { readingSkills } from "../src/learn/kit/reading";

const fixture = JSON.parse(readFileSync("tests/fixtures/reading/sound-boat-parts.fixture.json", "utf8")) as WordBank<PartsDraft>;
const draft = JSON.parse(readFileSync("scripts/reading/drafts/sound-boat-parts.draft.json", "utf8")) as WordBank<PartsDraft>;
const sample = (id: string) => structuredClone(fixture.records.find((r) => r.id === id)!) as PartsWord;

describe("scope and sequence", () => {
  it("runs in teaching order, five levels, one skill per step", () => {
    expect(SCOPE.map((s) => s.level)).toEqual([...SCOPE.map((s) => s.level)].sort());
    expect(new Set(SCOPE.map((s) => s.level))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(SCOPE.map((s) => s.skill)).size).toBe(SCOPE.length);
    expect(taughtThrough(2)).toContain("silent-e");
    expect(taughtThrough(2)).not.toContain("team-ee");
    expect(taughtThrough(5)).toHaveLength(SCOPE.length);
  });
  it("every step skill is labelled for the grown-up practice view", () => {
    for (const s of SCOPE) expect({ ...readingSkills, ...partsSkills }[s.skill], s.id).toBeTruthy();
    expect(stepForSkill("read.ng")).toBe("ng");
  });
});

describe("graphemes", () => {
  it("puts a silent e back at the end and tags what the tiles show", () => {
    expect(tilesSpell(["c", "a_e", "k"])).toBe("cake");
    expect(patternsOf(["s", "h", "i", "p"].slice(0, 0).concat(["sh", "i", "p"]))).toEqual(["digraph-sh", "short-i"]);
    expect(patternsOf(["c", "r", "a", "b"])).toEqual(["blend-start", "short-a"]);
    expect(primaryPattern(["b", "oa", "t"])).toBe("team-oa");
    expect(primaryPattern(["s", "t", "ar"])).toBe("r-ar");
  });
});

describe("the words that shipped, filed into the kit", () => {
  it("every shipped word is structurally sound and its tags are derived from its tiles", () => {
    expect(inheritedWords.records).toHaveLength(WORDS.length);
    expect(letterBankIssues(inheritedWords)).toEqual([]);
  });
  it("Level 1 is short-vowel words, Level 2 blends, digraphs and silent e, Level 3 vowel teams and r-controlled", () => {
    const by = (pace: string) => inheritedWords.records.filter((r) => WORDS.find((w) => w.word === r.word)!.pace === pace);
    const easy = by("easy"), medium = by("medium"), hard = by("hard");
    expect(easy.every((r) => r.level === 1 && r.step.startsWith("short-"))).toBe(true);
    // Level 1 is consonant-vowel-consonant. Three short function words (at, it, up) are vowel-consonant; nothing is longer.
    expect(easy.filter((r) => r.tiles.length !== 3).map((r) => r.word).sort()).toEqual(["at", "it", "up"]);
    for (const w of PICTURE_WORDS.easy) expect(inheritedWords.records.find((r) => r.word === w)!.tiles, w).toHaveLength(3);
    // One shipped word sits above its taught level: "rise" (silent e, Level 2) is in the hard pace. Recorded, not hidden.
    expect(medium.filter((r) => r.level !== 2)).toEqual([]);
    expect(hard.filter((r) => r.level !== 3).map((r) => r.word)).toEqual(["rise"]);
    expect(new Set(hard.map((r) => r.step)).size).toBeGreaterThanOrEqual(7);
  });
  it("only splash is filed differently from its shipped skill, and at the same level", () => {
    const moved = WORDS.filter((w) => inheritedWords.records.find((r) => r.word === w.word)!.step !== stepForSkill(w.skill)).map((w) => w.word);
    expect(moved).toEqual(["splash"]);
    for (const w of WORDS.filter((w) => w.word === "splash")) expect(levelOfStep(inheritedWords.records.find((r) => r.word === w.word)!.step)).toBe(levelOfPace(w.pace));
  });
  it("the Sound Boat picture words and ladder rungs are all inside the kit's bank at the right level", () => {
    const level = (w: string) => inheritedWords.records.find((r) => r.word === w)?.level;
    for (const [pace, words] of Object.entries(PICTURE_WORDS)) for (const w of words) expect(level(w), `${pace}:${w}`).toBeLessThanOrEqual(levelOfPace(pace as "easy")); 
    for (const l of LADDERS) for (const w of l.words) expect(level(w), `${l.id}:${w}`).toBeLessThanOrEqual(levelOfPace(l.pace as "easy"));
  });
  it("is admitted only by the pinned digest of the exact shipped data", () => {
    expect(bankDigest(inheritedWords)).toBe(INHERITED_DIGEST);
    expect(inheritedIssues(inheritedWords, INHERITED_DIGEST)).toEqual([]);
    expect(inheritedIssues(inheritedWords, "0".repeat(64))).not.toEqual([]);
    const tampered = { ...inheritedWords, records: inheritedWords.records.map((r, i) => (i === 0 ? { ...r, tiles: [...r.tiles].reverse() } : r)) };
    expect(inheritedIssues(tampered, INHERITED_DIGEST).map((i) => i.problem)).toContain("inherited records do not match the pinned shipped data");
  });
});

describe("spelling changes are checked, not claimed", () => {
  it("follows the four rules and refuses a pair they do not cover", () => {
    expect(applyAffix("play", "ing", "suffix", "none")).toBe("playing");
    expect(applyAffix("make", "ing", "suffix", "drop-e")).toBe("making");
    expect(applyAffix("hop", "ed", "suffix", "double")).toBe("hopped");
    expect(applyAffix("cry", "ed", "suffix", "y-to-i")).toBe("cried");
    expect(applyAffix("un", "do", "prefix", "none")).toBe("doun");
    expect(applyAffix("play", "ing", "suffix", "double")).toBeNull();
    expect(applyAffix("make", "ly", "suffix", "drop-e")).toBeNull();
    expect(applyAffix("jump", "ed", "suffix", "double")).toBeNull();
    expect(applyAffix("play", "ed", "suffix", "y-to-i")).toBeNull();
    expect(stemOf("making", "ing", "suffix")).toBe("mak");
    expect(stemOf("unlock", "un", "prefix")).toBe("lock");
  });
  it("finds every way a tray can spell a word, repeated pieces included", () => {
    expect(spellings(["ba", "na", "na", "bo"], "banana")).toHaveLength(2);
    expect(spellings(["big", "ger", "bigg", "er"], "bigger")).toHaveLength(2);
  });
});

describe("word-part banks", () => {
  it("the fixture and draft banks are structurally sound, with both levels playable", () => {
    expect(partsBankIssues(fixture)).toEqual([]);
    expect(partsBankIssues(draft)).toEqual([]);
    for (const bank of [fixture, draft]) for (const level of [4, 5]) expect(bank.records.filter((r) => r.level === level).length).toBeGreaterThanOrEqual(12);
  });
  it("catches each way a record can lie", () => {
    const fails = (r: PartsWord, problem: RegExp) => expect(partsWordIssues(r).map((i) => i.problem).join("; ")).toMatch(problem);
    fails({ ...sample("fx-sunset"), chunks: ["sun", "sat"] }, /do not spell the word/);
    fails({ ...sample("fx-sunset"), level: 5 }, /level should be 4/);
    fails({ ...sample("fx-making"), distractors: ["mac", "pin"] }, /unchanged base word must be on the tray/);
    fails({ ...sample("fx-making"), change: "double" }, /spelling change does not make this word/);
    fails({ ...sample("fx-making"), level: 4 }, /level should be 5/);
    fails({ ...sample("fx-sunset"), distractors: ["sun", "set"] }, /not right pieces/);
    fails({ ...sample("fx-sunset"), gloss: "x" }, /only an ending or a start/);
    fails({ ...sample("fx-jumped"), gloss: "Already Happened" }, /gloss/);
    fails({ ...sample("fx-sunset"), chunks: ["su", "nset"] }, /two whole words/);
    // A tray that can spell the word a second way is unfair: big+ger is not the accepted order.
    fails({ ...sample("fx-bigger"), distractors: ["big", "ger"] }, /not accepted/);
  });
  it("rejects duplicates and fixtures mixed into real banks", () => {
    const dup = { ...fixture, records: [fixture.records[0], { ...fixture.records[1], id: fixture.records[0].id }] };
    expect(partsBankIssues(dup).map((i) => i.problem)).toContain("duplicate id");
    const mixed = { ...draft, records: [...draft.records.slice(0, 2), { ...fixture.records[2] }] };
    expect(partsBankIssues(mixed).map((i) => i.problem)).toContain("fixture records cannot sit in a real bank");
  });
});

describe("reading admission is the detached W1 gate", () => {
  it("has no inline shipping path: no record carries review evidence and no validator accepts a claim of review", () => {
    for (const gone of ["assertShippable", "shippingIssues", "reviewIssues"]) expect(gone in validate, gone).toBe(false);
    const forged = { ...draft.records[0], status: "reviewed", review: { anything: true } };
    expect(partsWordIssues(forged as never)).toEqual([]); // structure only: nothing here can approve a record
    const source = readFileSync("src/learn/reading/admitted/index.ts", "utf8");
    expect(source).toMatch(/content\/words\/registry/);
    expect(source).not.toMatch(/reviewedPartsBanks|fixture|draft|\.json/);
  });
  it("the admitted list is exactly what the manifest registers, and the manifest registers no reading bank yet", () => {
    const manifest = JSON.parse(readFileSync("content/words/banks.manifest.json", "utf8")) as { banks: { kind?: string }[] };
    expect(manifest.banks.filter((b) => b.kind === "reading-parts")).toEqual([]);
    expect(readingBankIds).toEqual([]);
    expect(admittedParts).toEqual([]);
    expect(() => loadReadingBank("sound-boat-parts-fixture")).toThrow(/Unknown admitted reading bank/);
  });
  it("runs the kit's own rules over an admitted bank, and refuses anything malformed, repeated or mislabelled", () => {
    const projected = (r: PartsDraft) => { const { status: _s, ...rest } = r; return rest; };
    const bank = (words: object[]) => ({ schemaVersion: 1, kind: "reading-parts", words }) as unknown as ReadingBank;
    expect(admitParts([bank([projected(fixture.records[0]), projected(fixture.records[1])])]).map((r) => r.id)).toEqual([fixture.records[0].id, fixture.records[1].id]);
    expect(() => admitParts([bank([{ ...projected(fixture.records[0]), chunks: ["x", "y"] }])])).toThrow(/malformed/);
    expect(() => admitParts([bank([projected(fixture.records[0]), projected(fixture.records[0])])])).toThrow(/repeats/);
    expect(() => admitParts([{ schemaVersion: 1, kind: "words", words: [] } as unknown as ReadingBank])).toThrow(/wrong shape/);
    expect(() => admitParts([fixture as unknown as ReadingBank])).toThrow(/wrong shape/);
  });
  it("fixture and draft banks hold no approval and are never admitted by status", () => {
    for (const bank of [fixture, draft]) {
      expect(partsBankIssues(bank)).toEqual([]);
      for (const r of bank.records) expect(Object.keys(r).sort()).not.toEqual(expect.arrayContaining(["review"]));
    }
    expect(new Set(fixture.records.map((r) => r.status))).toEqual(new Set(["fixture"]));
    expect(new Set(draft.records.map((r) => r.status))).toEqual(new Set(["draft"]));
    expect(inheritedIssues(fixture as never, "x").map((i) => i.problem)).toContain("a fixture bank can never ship");
    expect(inheritedIssues(inheritedWords, INHERITED_DIGEST)).toEqual([]);
    expect(inheritedIssues({ ...inheritedWords, records: inheritedWords.records.slice(1) }, INHERITED_DIGEST).map((i) => i.problem)).toEqual(["inherited records do not match the pinned shipped data"]);
  });
});

describe("decodable texts", () => {
  const lex = lexiconOf(inheritedWords);
  const text = (over: Partial<ReadingText>): ReadingText => ({ id: "t-1", status: "fixture", kind: "sentence", text: "The cat sat.", level: 1, steps: ["short-a"], tricky: ["the"], ...over });
  it("accepts text made of words taught so far, plus the sight words it lists", () => {
    expect(textIssues(text({}), lex)).toEqual([]);
    expect(textIssues(text({ text: "The big ship sank.", level: 2, steps: ["digraph-sh", "short-i"], tricky: ["the"] }), lex).map((i) => i.problem)).toEqual(['"sank" is not a known decodable word']);
  });
  it("fails closed on unknown words, words above the level, stray sight words and bad steps", () => {
    const problems = (t: ReadingText) => textIssues(t, lex).map((i) => i.problem).join("; ");
    expect(problems(text({ text: "The dragon sat." }))).toMatch(/"dragon" is not a known/);
    expect(problems(text({ text: "The boat sat.", steps: ["team-oa"] }))).toMatch(/boat" needs Level 3/);
    expect(problems(text({ tricky: ["the", "said"] }))).toMatch(/sight word "said" is not in the text/);
    expect(problems(text({ steps: ["team-oa"] }))).toMatch(/steps must be taught/);
    expect(problems(text({ text: "The cat sat" }))).toMatch(/end in/);
    expect(problems(text({ text: "The cat sat 2." }))).toMatch(/digits/);
  });
});

describe("listening is not decoding", () => {
  it("only reading alone, unhelped and unmissed, is independent", () => {
    expect(readingEvidence(["prompt"]).independentDecoding).toBe(true);
    expect(readingEvidence([]).independentDecoding).toBe(true);
    for (const act of ["read-aloud", "help", "miss"] as const) expect(readingEvidence(["prompt", act]).independentDecoding, act).toBe(false);
    expect(readingEvidence(["read-aloud"])).toMatchObject({ listened: true, independentDecoding: false });
  });
});

describe("tap-a-word", () => {
  it("names the clip a word plays, ignoring marks, and says nothing for a lone mark", () => {
    expect(tapWord("Boat,")).toEqual({ word: "boat", key: "sound-boat-word-boat" });
    expect(tapWord("it's")).toMatchObject({ word: "it's" });
    expect(tapWord("—")).toBeNull();
  });
});
