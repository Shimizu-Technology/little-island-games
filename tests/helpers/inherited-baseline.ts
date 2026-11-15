import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonical } from "../../src/puzzles/descriptor";
import type * as Provenance from "../../src/learn/reading/provenance";
import { inheritedSourceModules, sourceDigest } from "./inherited-sources";

/**
 * R1a fix 5 (R5-2): the independent historical identity of every inherited reading source. The baseline fixture is
 * lead-owned and separate from `src/learn/reading/provenance.ts`, so editing a source and recomputing its pin there is
 * not enough: the pin, the source and what the snapshot serves must all still equal the frozen baseline. Hashes here
 * use node:crypto, not the app's own SHA-256.
 */
export const BASELINE_FILE = "tests/fixtures/reading-inherited-baseline.json";
export type BaselineEntry = { digest: string; served: string; records: number };
export type Baseline = { owner: string; rule: string; sources: Record<string, BaselineEntry> };
export const readBaseline = (): Baseline => JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
const hash = (v: unknown) => createHash("sha256").update(canonical(v)).digest("hex");

/** What each source serves a child, read back through the provenance module's own lookups, with its record count. */
export function served(p: typeof Provenance): Record<string, { value: unknown; records: number }> {
  const growth = p.readingGrowthTracks();
  const pictures = { easy: p.pictureWords("easy"), medium: p.pictureWords("medium"), hard: p.pictureWords("hard") };
  const bank = (g: Provenance.BankGame) => ({ value: p.readingBank(g), records: p.readingBank(g).flat().length });
  return {
    chamoru: { value: p.chamoruRecords(), records: p.chamoruRecords().length },
    clues: { value: pictures, records: Object.values(pictures).flat().length },
    growth: { value: growth, records: Object.values(growth).flatMap((stages) => Object.values(stages ?? {})).flatMap((t) => t.questions).length },
    ladders: { value: p.readingLadders(), records: p.readingLadders().length },
    lagoon: bank("letter-lagoon"),
    sentences: { value: p.readingSentences(), records: p.readingSentences().length },
    stories: { value: p.readingPassages(), records: p.readingPassages().length },
    studio: bank("story-studio"),
    words: { value: p.readingWords(), records: p.readingWords().length },
    workshop: bank("word-workshop"),
  };
}
/** The current state, in the fixture's shape: what a lead-approved baseline change would write. */
export function currentBaseline(p: typeof Provenance, modules: Record<string, Record<string, unknown>> = inheritedSourceModules): Record<string, BaselineEntry> {
  const s = served(p);
  return Object.fromEntries(Object.keys(modules).sort().map((name) => [name, { digest: sourceDigest(modules[name]), served: hash(s[name]?.value ?? null), records: s[name]?.records ?? 0 }]));
}
/**
 * Every way the pins, the sources or the served snapshot differ from the baseline: empty when they all match it.
 * `pins` defaults to the module's own `INHERITED_SOURCE_DIGESTS`.
 */
export function baselineIssues(p: typeof Provenance, pins: Readonly<Record<string, string>> = p.INHERITED_SOURCE_DIGESTS, modules: Record<string, Record<string, unknown>> = inheritedSourceModules, baseline: Baseline = readBaseline()): string[] {
  const issues: string[] = [];
  const names = [...new Set([...Object.keys(baseline.sources), ...Object.keys(pins), ...Object.keys(modules)])].sort();
  const now = currentBaseline(p, modules);
  for (const name of names) {
    const base = baseline.sources[name];
    if (!base) { issues.push(`${name}: not in the baseline`); continue; }
    if (pins[name] !== base.digest) issues.push(`${name}: its pin is not the baseline`);
    if (!now[name] || now[name].digest !== base.digest) issues.push(`${name}: its source is not the baseline`);
    if (!now[name] || now[name].served !== base.served || now[name].records !== base.records) issues.push(`${name}: what it serves is not the baseline`);
  }
  return issues;
}
