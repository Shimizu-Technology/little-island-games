import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { partsWordIssues, validateReadingRecord } from "../scripts/words/core.mjs";
import { admitParts } from "../src/learn/reading/admitted";
import { partsWordIssues as kitIssues } from "../src/learn/reading/validate";
import type { PartsDraft, PartsWord, WordBank } from "../src/learn/reading/records";

/**
 * R1a fix 2 (lead contract change: W1 reading records): shipping and the app's admitted loader run one validator, so
 * reviewed content that passes the W1 gate can never throw when the app starts. Every fixture and draft record, and a
 * spread of broken versions of each, gets the same answer from both sides.
 */
const banks = ["tests/fixtures/reading/sound-boat-parts.fixture.json", "scripts/reading/drafts/sound-boat-parts.draft.json"].map(
  (file) => JSON.parse(readFileSync(file, "utf8")) as WordBank<PartsDraft>
);
const records: PartsWord[] = banks.flatMap((b) => b.records.map(({ status: _status, ...r }) => r));
const variants = (r: PartsWord): unknown[] => [
  r,
  { ...r, chunks: [r.chunks[0].slice(0, 1), r.chunks[0].slice(1) + r.chunks.slice(1).join("")] },
  { ...r, level: r.level === 4 ? 5 : 4 },
  { ...r, kind: r.kind === "compound" ? "syllables" : "compound" },
  { ...r, distractors: [r.chunks[0], ...r.distractors.slice(1)] },
  { ...r, distractors: [...r.distractors, r.distractors[0]] },
  { ...r, chunks: r.chunks.map((c) => [c]) },
  { ...r, id: 7 },
  { ...r, word: [r.word] },
  { ...r, gloss: r.gloss ? undefined : "a plain gloss" },
  { ...r, change: r.change === "drop-e" ? "none" : "drop-e" },
  { ...r, family: ["x"] },
  { ...r, alternates: [r.word] },
  { ...r, alternates: [[...r.chunks]] },
];
const shipping = (r: unknown) => {
  try {
    validateReadingRecord(r);
    return true;
  } catch {
    return false;
  }
};
const app = (r: unknown) => {
  try {
    admitParts([{ schemaVersion: 1, kind: "reading-parts", words: [r as never] }]);
    return true;
  } catch {
    return false;
  }
};

describe("one reading validator for shipping and the app", () => {
  it("the tooling loads the kit's own rules, not a copy", () => {
    for (const r of records.flatMap(variants)) expect(partsWordIssues(r)).toEqual(kitIssues(r as PartsWord));
  });
  it("whatever shipping admits, the app loader admits, and the other way round", () => {
    const all = records.flatMap(variants);
    expect(records.length).toBeGreaterThanOrEqual(24);
    let admitted = 0, refused = 0;
    for (const r of all) {
      expect(app(r), JSON.stringify(r)).toBe(shipping(r));
      if (shipping(r)) admitted++;
      else refused++;
    }
    expect(admitted).toBeGreaterThanOrEqual(records.length);
    expect(refused).toBeGreaterThan(records.length * 8);
  });
  it("the reviewer's probe: a compound split into a letter and the rest fails both sides, before any bake", () => {
    const probe = { id: "r-sunset", word: "sunset", level: 4, kind: "compound", chunks: ["s", "unset"], distractors: ["sin", "sit"] };
    expect(() => validateReadingRecord(probe)).toThrow(/a compound is two whole words/);
    expect(() => admitParts([{ schemaVersion: 1, kind: "reading-parts", words: [probe as never] }])).toThrow(/two whole words/);
  });
  // R3 (review note): the app loader holds the same closed record keys as shipping, so parity holds in both directions.
  it("the app loader refuses a record with fields shipping refuses", () => {
    const extra = { id: "r-sunset", word: "sunset", level: 4, kind: "compound", chunks: ["sun", "set"], distractors: ["sin", "sit"], status: "fixture" };
    expect(() => validateReadingRecord(extra)).toThrow(/unexpected fields/);
    expect(() => admitParts([{ schemaVersion: 1, kind: "reading-parts", words: [extra as never] }])).toThrow(/unexpected fields/);
    const { status: _, ...clean } = extra;
    expect(admitParts([{ schemaVersion: 1, kind: "reading-parts", words: [clean as never] }])).toHaveLength(1);
  });
});
