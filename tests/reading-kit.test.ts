import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PICTURE_WORDS } from "../src/learn/content/reading/clues";
import { LADDERS } from "../src/learn/content/reading/ladders";
import { WORDS } from "../src/learn/content/reading/words";
import { admittedParts, admitParts } from "../src/learn/reading/admitted";
import { applyAffix, spellings, stemOf } from "../src/learn/reading/morphology";
import { patternsOf, primaryPattern, tilesSpell } from "../src/learn/reading/graphemes";
import { INHERITED_DIGEST, inheritedWords } from "../src/learn/reading/inherited";
import { contentHash, type PartsWord, type ReadingText, type ReviewEvidence, type WordBank } from "../src/learn/reading/records";
import { SCOPE, levelOfPace, levelOfStep, partsSkills, stepForSkill, taughtThrough } from "../src/learn/reading/scope";
import { assertShippable, bankDigest, letterBankIssues, lexiconOf, partsBankIssues, partsWordIssues, shippingIssues, textIssues } from "../src/learn/reading/validate";
import { readingEvidence } from "../src/learn/reading/evidence";
import { tapWord } from "../src/learn/reading/tap";
import { readingSkills } from "../src/learn/kit/reading";

const fixture = JSON.parse(readFileSync("tests/fixtures/reading/sound-boat-parts.fixture.json", "utf8")) as WordBank<PartsWord>;
const draft = JSON.parse(readFileSync("scripts/reading/drafts/sound-boat-parts.draft.json", "utf8")) as WordBank<PartsWord>;
const sample = (id: string) => structuredClone(fixture.records.find((r) => r.id === id)!) as PartsWord;
// TEST ONLY: a synthetic evidence block to prove the validator's accept path. It is never written to any data file.
const SYNTHETIC = (r: PartsWord): ReviewEvidence => {
  const h = (c: string) => c.repeat(64);
  const run = (n: string, model: string, c: string) => ({ id: n, family: "openai" as const, model, runId: `run-${n}`, verdict: "keep" as const, transcriptSha256: h(c), startedAt: "2026-11-01T00:00:00Z", finishedAt: "2026-11-01T00:05:00Z" });
  return { batchSha256: h("a"), contentSha256: contentHash(r), reviews: [run("a", "model-one", "b"), run("b", "model-two", "c")], lead: { reviewer: "lead", decision: "keep", reconciliationSha256: h("d"), startedAt: "2026-11-01T01:00:00Z", finishedAt: "2026-11-01T01:05:00Z" } };
};

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
    expect(shippingIssues(inheritedWords, { inheritedDigest: INHERITED_DIGEST })).toEqual([]);
    expect(shippingIssues(inheritedWords)).not.toEqual([]);
    const tampered = { ...inheritedWords, records: inheritedWords.records.map((r, i) => (i === 0 ? { ...r, tiles: [...r.tiles].reverse() } : r)) };
    expect(shippingIssues(tampered, { inheritedDigest: INHERITED_DIGEST }).map((i) => i.problem)).toContain("inherited records do not match the pinned shipped data");
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

describe("shipping validation fails closed", () => {
  it("never ships a fixture bank or unreviewed drafts, and says why", () => {
    expect(shippingIssues(fixture).map((i) => i.problem)).toEqual(["a fixture bank can never ship"]);
    const issues = shippingIssues(draft);
    expect(issues).toHaveLength(draft.records.length);
    expect(new Set(issues.map((i) => i.problem))).toEqual(new Set(["draft records are not reviewed"]));
    expect(() => assertShippable(draft)).toThrow(/cannot ship/);
    expect(() => assertShippable(fixture)).toThrow(/cannot ship/);
  });
  it("a record that merely says it is reviewed fails without evidence", () => {
    const forged = { ...draft, records: draft.records.map((r) => ({ ...r, status: "reviewed" as const })) };
    expect(new Set(shippingIssues(forged).map((i) => i.problem))).toEqual(new Set(["no review evidence"]));
  });
  it("accepts complete evidence bound to the exact content, and nothing less", () => {
    const base = { ...draft.records[0], status: "reviewed" as const };
    const ok = { ...base, review: SYNTHETIC(base) };
    const bank = (r: PartsWord): WordBank<PartsWord> => ({ ...draft, records: [r] });
    expect(shippingIssues(bank(ok))).toEqual([]);
    const problems = (r: PartsWord) => shippingIssues(bank(r)).map((i) => i.problem).join("; ");
    expect(problems({ ...ok, word: "xxxxxx" })).toMatch(/changed after review/);
    expect(problems({ ...ok, review: { ...ok.review!, reviews: [ok.review!.reviews[0], { ...ok.review!.reviews[1], model: "model-one" }] } })).toMatch(/two different models/);
    expect(problems({ ...ok, review: { ...ok.review!, reviews: [ok.review!.reviews[0], { ...ok.review!.reviews[1], runId: ok.review!.reviews[0].runId }] } })).toMatch(/separate runs/);
    expect(problems({ ...ok, review: { ...ok.review!, reviews: [ok.review!.reviews[0], { ...ok.review!.reviews[1], transcriptSha256: "zz" }] } })).toMatch(/transcript hash/);
    expect(problems({ ...ok, review: { ...ok.review!, lead: { ...ok.review!.lead, decision: "revise" as never } } })).toMatch(/lead/);
    expect(problems({ ...ok, review: { ...ok.review!, reviews: [{ ...ok.review!.reviews[0], verdict: "reject" as never }, ok.review!.reviews[1]] } })).toMatch(/both reviewers must keep/);
    expect(problems({ ...ok, review: { ...ok.review!, reviews: [{ ...ok.review!.reviews[0], finishedAt: "2020-01-01T00:00:00Z" }, ok.review!.reviews[1]] } })).toMatch(/impossible times/);
    expect(problems({ ...ok, review: undefined })).toMatch(/no review evidence/);
  });
  it("the app ships no word-part bank until one is admitted, and refuses to admit an unreviewed one", () => {
    expect(admittedParts).toEqual([]);
    expect(() => admitParts([fixture])).toThrow();
    expect(() => admitParts([draft])).toThrow(/cannot ship/);
    expect(() => admitParts([{ ...draft, records: [{ ...draft.records[0], chunks: ["x", "y"] }] }])).toThrow(/malformed/);
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
