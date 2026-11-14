import { publishedJson } from "../../../../scripts/published-refs.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { shellPuzzles } from "./challenge-content";
import { assertFrozenCatalog, type CatalogManifest } from "../../../state/catalogManifest";
import type { Bank, Dare } from "../../../state/challenge";

/** Registers banks 420-425 and the level dares in the committed save catalog. Re-runnable until a tip publishes them. */
const file = "src/state/save-catalog.json", previous = JSON.parse(readFileSync(file, "utf8")) as CatalogManifest;
const slots = [...new Set(shellPuzzles.map((p) => p.ref.bank))];
const banks: Bank[] = slots.map((slot) => {
  const rows = shellPuzzles.filter((p) => p.ref.bank === slot);
  return {
    slot, engine: "shell-math", rules: 1, entries: rows.map((p) => ({ ordinal: slot * 1024 + p.ref.puzzle, hash: p.ref.hash })),
    awards: rows.map((p) => p.awards.reduce<number>((n, r, i) => n | (r ? 1 << i : 0), 0)), cove: false,
  };
});
const dares: [number, Dare][] = shellPuzzles.flatMap((p) => p.dares.map((d) => [d.slot, { kind: d.rule.kind, help: d.help, bank: p.ref.bank, puzzle: p.ref.puzzle }] as [number, Dare]));
const contexts = [...new Set(shellPuzzles.map((p) => `shell-${p.tier}`))];
// Everything this slice registered earlier is replaced as a whole; nothing else in the catalog is touched.
const mine = (slot: number) => slot >= 1000 && slot <= 1099;
const others: CatalogManifest = { ...previous, banks: previous.banks.filter((b) => !slots.includes(b.slot)), dares: previous.dares.filter(([slot]) => !mine(slot)) };
const next: CatalogManifest = {
  ...others,
  banks: [...others.banks, ...banks].sort((a, b) => a.slot - b.slot),
  dares: [...others.dares, ...dares].sort((a, b) => a[0] - b[0]),
  contexts: [...new Set([...previous.contexts, ...contexts])],
};
// An unpublished branch bank may be rebaked; every published tip stays immutable.
for (const { value } of publishedJson(file)) assertFrozenCatalog(value as CatalogManifest, next);
assertFrozenCatalog(others, next);
writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
