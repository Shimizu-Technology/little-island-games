import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Build-time JS for the picture dictionary; no path from the app's dependency graph.
import { checkDictionary, checkPicture, dictionaryReachable } from "../scripts/art/pictures/check.mjs";
import { renderPicture, renderPlan, rowFailures } from "../scripts/art/pictures/render-check.mjs";
import { svg, path, line, circle, group, P } from "../scripts/art/pictures/style.mjs";
import { createPictureLoader, pictureIndex } from "../src/content/pictures";

// Regressions from the W4 code review (review-code/REVIEW.md findings 1–5).
const shape = circle(60, 60, 35, P.sky);
const problemsOf = (body: string[]) => checkPicture(svg([shape, ...body])).join("\n");
const hasRenderer = ["rsvg-convert", "magick"].every((tool) => spawnSync(tool, ["--version"]).status === 0);

describe("picture loader integrity (finding 1)", () => {
  const first = pictureIndex[0];
  const xml = readFileSync(`content/pictures/svg/${first.id}.svg`, "utf8");

  it("refuses same-length content whose digest differs from the manifest", async () => {
    const colour = xml.match(/#[0-9A-F]{6}/g)!.find((c) => c !== P.ink)!;
    const swapped = xml.replace(colour, colour === P.red ? P.gold : P.red);
    expect(swapped).not.toBe(xml);
    expect(new TextEncoder().encode(swapped).length).toBe(first.bytes);
    const loader = createPictureLoader({ read: async () => swapped }, { [first.id]: () => 1 });
    await expect(loader.load(first.id)).rejects.toThrow(/does not match/);
    expect(loader.cached()).toBe(0);
    const good = createPictureLoader({ read: async () => xml }, { [first.id]: () => 1 });
    await expect(good.load(first.id)).resolves.toBe(xml);
  });
});

describe("W1 membership is read from the queues, not from allowlist.json (finding 2)", () => {
  const allow = JSON.parse(readFileSync("content/pictures/allowlist.json", "utf8")).words as Record<string, { wordId: string; queue: string; readerLevel: string }>;
  // Synthetic W1-shaped records: fixture data only, never the private queues.
  const record = (word: string, readerLevel = allow[word]?.readerLevel ?? "Little") => ({
    schemaVersion: 1, id: allow[word]?.wordId ?? `en-${word.toLowerCase()}`, spelling: word, lemma: word, language: "en", sense: "test fixture",
    readerLevel, knownBand: 1, readBand: 1, spellBand: 1, clueBand: 1, theme: "test", topic: "test", guamFit: 0, audio: null,
    source: { id: "fixture", revision: "0", sha256: "0".repeat(64) }, form: "lemma", properNoun: false, abbreviation: false, british: [], locale: "en-US",
  });
  const fixture = (words: string[], change: (r: ReturnType<typeof record>) => ReturnType<typeof record> = (r) => r) => {
    const queues: Record<string, object[]> = { tiers: [], local: [] };
    for (const w of words) queues[allow[w].queue].push(change(record(w)));
    return { queues, policy: { exact: [] as string[], lemmas: [] as string[], scan: [] as string[] } };
  };
  const words = Object.keys(allow);

  it("passes when every word is in the supplied W1 queues with the committed record", () => {
    const result = checkDictionary({ w1: fixture(words) });
    expect(result.membership).toBe("checked");
    expect(result.problems).toEqual([]);
  }, 60000);

  it("fails a word that allowlist.json claims but no W1 queue holds", () => {
    const result = checkDictionary({ w1: fixture(words.filter((w) => w !== "DOG")) });
    expect(result.problems.join("\n")).toMatch(/DOG: not in any W1 queue/);
  }, 60000);

  it("fails when the committed record differs from the queue record or W1 policy blocks the word", () => {
    const changed = checkDictionary({ w1: fixture(words, (r) => (r.spelling === "DOG" ? { ...r, readerLevel: "Strong" } : r)) });
    expect(changed.problems.join("\n")).toMatch(/DOG: allowlist\.json differs from W1/);
    const blocked = fixture(words);
    blocked.policy.exact = ["DOG"];
    expect(checkDictionary({ w1: blocked }).problems.join("\n")).toMatch(/DOG: answerAllowed/);
  }, 60000);

  it("says membership was not checked without the queues, and requires it once app code imports the dictionary", () => {
    const unchecked = checkDictionary({ w1: null, reachable: false });
    expect(unchecked.membership).toBe("not checked");
    expect(unchecked.problems).toEqual([]);
    expect(checkDictionary({ w1: null, reachable: true }).problems.join("\n")).toMatch(/reachable from app code/);
  }, 60000);

  it("finds app code that imports the dictionary", () => {
    const root = mkdtempSync(join(tmpdir(), "pictures-reach-"));
    try {
      mkdirSync(join(root, "src/games/cross"), { recursive: true });
      mkdirSync(join(root, "src/content/pictures"), { recursive: true });
      writeFileSync(join(root, "src/content/pictures/index.ts"), 'import m from "../../../content/pictures/manifest.json";\n');
      writeFileSync(join(root, "src/games/cross/Clue.tsx"), 'import { x } from "../../ui";\n');
      expect(dictionaryReachable(root)).toBe(false);
      writeFileSync(join(root, "src/games/cross/Clue.tsx"), 'import { createPictureLoader } from "../../content/pictures";\n');
      expect(dictionaryReachable(root)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("invalid geometry fails the static and render checks (finding 3)", () => {
  const bad: [string, string[]][] = [
    ["not path data", [path("THIS IS NOT PATH DATA", P.gold)]],
    ["a missing argument", [path("M10 10L20", P.gold)]],
    ["no initial moveto", [path("L10 10H40Z", P.gold)]],
    ["a non-finite number", [path("M10 10L1e999 5Z", P.gold)]],
    ["a non-numeric radius", [circle(60, 60, NaN, P.gold)]],
    ["an odd point list", ['<polygon points="10,10 20,20 30" fill="#F0C86D"/>']],
    ["an unknown transform", [group({ t: "madeup(3)" }, circle(60, 60, 10, P.gold))]],
    ["a wrong transform argument count", [group({ t: "rotate(10 20)" }, circle(60, 60, 10, P.gold))]],
    ["trailing transform syntax", [group({ t: "translate(2 2) junk" }, circle(60, 60, 10, P.gold))]],
  ];
  for (const [name, body] of bad) {
    it(`rejects ${name} beside a valid visible shape`, () => {
      expect(problemsOf(body)).toMatch(/geometry|path data|transform|number|points|finite|radius/i);
      expect(renderPlan(svg([shape, ...body])).problems.length).toBeGreaterThan(0);
    });
  }

  it("still accepts every path form the kit writes", () => {
    expect(problemsOf([line("M29 23A44 44 0 0 0 91 85"), path("M40 74L32 66A12 8 0 1 0 44 70Z", P.gold), line("M10 60q5-5 10 0t10 0", { sw: 2 }), line("M10 10h10v10l5 5m5 5H40V50", { sw: 2 })])).toBe("");
    expect(problemsOf([group({ t: "translate(96 24) rotate(-80) scale(1.1)" }, circle(0, 0, 8, P.gold))])).toBe("");
  });

  it.skipIf(!hasRenderer)("host render check fails a file with malformed path data", () => {
    const row = renderPicture("probe", svg([shape, path("THIS IS NOT PATH DATA", P.gold)]));
    expect(row.error).toBeUndefined();
    expect(rowFailures(row).join("\n")).toMatch(/fails the static geometry checks \(.*path data/);
  });
});

describe("stroke width is checked on both principal scales (finding 4)", () => {
  it("rejects anisotropic scaling and shear of an ink outline", () => {
    expect(problemsOf([group({ t: "scale(2 0.5)" }, path("M10 10H50V50Z", P.gold))])).toMatch(/outline weight/);
    expect(problemsOf([group({ t: "matrix(1 0 1 1 0 0)" }, path("M10 10H50V50Z", P.gold))])).toMatch(/outline weight/);
    expect(problemsOf([group({ t: "skewX(40)" }, path("M10 10H50V50Z", P.gold))])).toMatch(/outline weight/);
  });

  it("accepts rotation, reflection and small uniform scales", () => {
    expect(problemsOf([group({ t: "rotate(30 60 60) scale(1.1)" }, path("M30 30H80V80Z", P.gold))])).toBe("");
    expect(problemsOf([group({ t: "matrix(-1 0 0 1 120 0)" }, path("M30 30H80V80Z", P.gold))])).toBe("");
  });
});

describe("the spill check sees geometry beyond any padding (finding 5)", () => {
  const far = svg([shape, circle(500, 500, 20, P.gold)]);

  it("static check rejects a disconnected far-off component", () => {
    expect(checkPicture(far).join("\n")).toMatch(/outside the frame/);
    expect(problemsOf([group({ t: "translate(400 0)" }, circle(60, 60, 10, P.gold))])).toMatch(/outside the frame/);
  });

  it("render plan widens the canvas to the unclipped drawing bounds", () => {
    const plan = renderPlan(far);
    expect(plan.bounds!.x1).toBeGreaterThan(500);
    expect(plan.viewBox[0] + plan.viewBox[2]).toBeGreaterThan(520);
  });

  it.skipIf(!hasRenderer)("host render check reports the spill from real pixels", () => {
    type Measured = { id: string; problems: string[]; spills: boolean; x: number; w: number };
    const row = renderPicture("probe", far) as Measured;
    expect(row.spills).toBe(true);
    expect(row.x + row.w).toBeGreaterThan(500);
    expect(rowFailures(row).join("\n")).toMatch(/draws outside the frame/);
    expect((renderPicture("probe", svg([shape])) as Measured).spills).toBe(false);
  });
});

// Regressions from the W4 code review, round 2 (review-code/REVIEW-2.md findings 1–3).
describe("round 2: comments in an import still count as importing the dictionary", () => {
  it("finds an import with a block or line comment before the module string", () => {
    const root = mkdtempSync(join(tmpdir(), "pictures-reach2-"));
    try {
      mkdirSync(join(root, "src/content/pictures"), { recursive: true });
      writeFileSync(join(root, "src/content/pictures/index.ts"), "export const x = 1;\n");
      writeFileSync(join(root, "src/review2-import.ts"), "import { pictureForWord } from /* offline art */ './content/pictures';\n");
      expect(dictionaryReachable(root)).toBe(true);
      writeFileSync(join(root, "src/review2-import.ts"), "const p = require( // art\n  './content/pictures');\n");
      expect(dictionaryReachable(root)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("round 2: separators follow the SVG comma-wsp grammar", () => {
  const big = path("M20 20H100V100H20Z", P.gold);
  const bad: [string, string[]][] = [
    ["a repeated comma between coordinates", [path("M10,,10H110V110H10Z", P.gold)]],
    ["a comma right after a command", [path("M,10 10H110V110H10Z", P.gold)]],
    ["a dangling comma before a command", [path("M10 10,H110V110H10Z", P.gold)]],
    ["a trailing comma", [path("M10 10H110V110H10Z,", P.gold)]],
    ["a leading comma in a transform", [group({ t: "translate(,70 0)" }, circle(0, 0, 8, P.gold))]],
    ["a repeated comma in a transform", [group({ t: "translate(70,,0)" }, circle(0, 0, 8, P.gold))]],
    ["a stray comma before the first transform", [group({ t: ",translate(70 0)" }, circle(0, 0, 8, P.gold))]],
    ["a leading comma in a point list", ['<polygon points=",10 10 20 20 30 10" fill="#F0C86D"/>']],
  ];
  for (const [name, body] of bad) {
    it(`rejects ${name} beside valid, large art`, () => {
      expect(problemsOf([big, ...body])).toMatch(/comma|geometry|path data|transform|points/i);
      expect(renderPlan(svg([shape, big, ...body])).problems.length).toBeGreaterThan(0);
    });
  }
  it("still accepts one comma between arguments and between coordinate pairs", () => {
    expect(problemsOf([path("M10,10 L20,20, 30,30 Z", P.gold), path("M10 10 , 20 20Z", P.gold), group({ t: "translate(70,60), scale(1)" }, circle(0, 0, 8, P.gold)), '<polygon points="10,10, 20,20 30,10" fill="#F0C86D"/>'])).toBe("");
  });
});

describe("round 2: a negative stroke width is refused", () => {
  it("rejects a coloured stroke with a negative width", () => {
    expect(problemsOf(['<circle cx="300" cy="60" r="5" fill="none" stroke="#F0C86D" stroke-width="-700"/>'])).toMatch(/negative/);
  });
});
