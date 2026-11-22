/** Sync Pattern Path packed bank facts (280–285) + inline Challenge banks (286–287) and dares (900–931) into packs.generated.json & save-catalog.json. */
import { readFileSync, writeFileSync } from "node:fs";
import type { FamilyManifest, RootIndex } from "../../../puzzles/bank";
import { assertFrozenCatalog, type CatalogManifest } from "../../../state/catalogManifest";
import type { Bank, Dare } from "../../../state/challenge";
import { patternChallengePuzzles } from "./challenge-content";

export type PackFact = { slot: number; first: number; count: number; packHash: string; rules: number; band: string };

const root = JSON.parse(readFileSync("src/content/puzzles/root.json", "utf8")) as RootIndex;
const familyRow = root.families.find((f) => f[0] === "pattern-path");
if (!familyRow) throw new Error("Missing pattern-path family in root.json. Bake pattern-path first.");
const manifest = JSON.parse(readFileSync(`src/content/puzzles/assets/${familyRow[1]}.lipuzzle`, "utf8")) as FamilyManifest;
const facts: PackFact[] = manifest.packs
  .filter((p) => !manifest.retired.includes(p[0]))
  .map((p) => ({ slot: p[0], first: p[1], count: p[2], packHash: p[4], rules: p[6], band: manifest.bands[p[5]] }));

writeFileSync("src/learn/games/pattern-path/packs.generated.json", `${JSON.stringify(facts, null, 2)}\n`);

const catalogPath = "src/state/save-catalog.json";
const previous = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogManifest;
const banks = new Map<number, Bank>();
const dares: [number, Dare][] = [];

// Packed banks (280–285)
for (const f of facts) {
  banks.set(f.slot, {
    slot: f.slot,
    engine: "pattern-path",
    rules: f.rules,
    first: f.first,
    count: f.count,
    family: "pattern-path",
    packHash: f.packHash,
    awards: 1,
    cove: false,
  });
}

// Inline banks (286 Deep Water, 287 School Dares)
for (const p of [...patternChallengePuzzles].sort((a, b) => a.ref.bank - b.ref.bank || a.ref.puzzle - b.ref.puzzle)) {
  const prior = banks.get(p.ref.bank);
  if (prior && !("entries" in prior)) throw new Error(`Bank ${p.ref.bank} collides with a packed bank.`);
  banks.set(p.ref.bank, {
    slot: p.ref.bank,
    engine: "pattern-path",
    rules: p.ref.rules,
    entries: [...(prior?.entries ?? []), { ordinal: p.ref.bank * 1024 + p.ref.puzzle, hash: p.ref.hash }],
    awards: [...((prior?.awards as number[] | undefined) ?? []), p.awards.reduce((bits, a, i) => bits | (a ? 1 << i : 0), 0)],
    cove: false,
  });
  for (const d of p.dares) {
    dares.push([d.slot, { kind: d.rule.kind, help: d.help, bank: p.ref.bank, puzzle: p.ref.puzzle }]);
  }
}

const bandTiers = new Set([1, 2, 3, 4, 5, 6].map((t) => `pattern-${t}`));
const next: CatalogManifest = {
  version: 2,
  banks: [...previous.banks.filter((b) => !banks.has(b.slot)), ...banks.values()].sort((a, b) => a.slot - b.slot),
  dares: [...previous.dares.filter(([slot]) => !dares.some(([s]) => s === slot)), ...dares].sort((a, b) => a[0] - b[0]),
  contexts: [...new Set([...previous.contexts, ...bandTiers])],
};

assertFrozenCatalog(previous, next);
writeFileSync(catalogPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Pattern Path catalog synced: ${facts.length} packed banks, ${banks.size - facts.length} inline banks, ${dares.length} dares.`);
