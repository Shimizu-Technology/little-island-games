/**
 * Append-only: writes Reef Sweep's packed bands (464-467), inline Deep Water bank (468),
 * dares (3350-3373), and contexts (reef-1..reef-4) into `src/state/save-catalog.json`.
 * Reserved slots for p4-reef-sweep: banks 464-469, dares 3350-3399.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { registration as reef } from "../../src/challenge/registrations/reef-sweep";
import { assertFrozenCatalog, catalogManifest, type CatalogManifest } from "../../src/state/catalogManifest";

const BANK_RANGE: readonly [number, number] = [464, 469];
const DARE_RANGE: readonly [number, number] = [3350, 3399];
const file = "src/state/save-catalog.json";
const check = process.argv.includes("--check");

const previous = JSON.parse(readFileSync(file, "utf8")) as CatalogManifest;
const own = catalogManifest(reef.catalog);

for (const bank of own.banks) {
  if (bank.slot < BANK_RANGE[0] || bank.slot > BANK_RANGE[1]) {
    throw new Error(`Reef Sweep bank ${bank.slot} is outside reserved range ${BANK_RANGE[0]}-${BANK_RANGE[1]}.`);
  }
}
for (const [slot] of own.dares) {
  if (slot < DARE_RANGE[0] || slot > DARE_RANGE[1]) {
    throw new Error(`Reef Sweep dare ${slot} is outside reserved range ${DARE_RANGE[0]}-${DARE_RANGE[1]}.`);
  }
}

const next: CatalogManifest = {
  version: 2,
  banks: [...previous.banks.filter((x) => !own.banks.some((o) => o.slot === x.slot)), ...own.banks].sort(
    (x, y) => x.slot - y.slot
  ),
  dares: [...previous.dares.filter(([s]) => !own.dares.some(([o]) => o === s)), ...own.dares].sort(
    (x, y) => x[0] - y[0]
  ),
  contexts: [...previous.contexts, ...own.contexts.filter((c) => !previous.contexts.includes(c))],
};

assertFrozenCatalog(previous, next);
const text = JSON.stringify(next, null, 2) + "\n";
if (check) {
  if (text !== readFileSync(file, "utf8")) {
    throw new Error("Reef Sweep catalog entries are missing or stale in src/state/save-catalog.json.");
  }
} else {
  writeFileSync(file, text);
}
console.log(
  `Reef Sweep catalog ${check ? "checked" : "written"}: ${own.banks.length} banks, ${own.dares.length} dares, ${own.contexts.length} contexts.`
);
