/**
 * Copies certified Reef Sweep pack facts and 12 curated Deep Water rows (3 per deduction tier)
 * verbatim from the committed packed bank (slots 464-467) into `src/board/reef-sweep/sets.generated.json`.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parsePack } from "../../src/puzzles/bank";
import { productionDirs, readCatalog, readPackText } from "../puzzles/pipeline";

const OUT = "src/board/reef-sweep/sets.generated.json";
const BANDS = ["single-5", "single-6", "subset-7", "coupled-7"] as const;

const { families } = readCatalog(productionDirs);
const manifest = families.get("reef-sweep");
if (!manifest) throw new Error("Bake the reef-sweep family first.");

const rowsFor = (band: string) =>
  manifest.packs
    .filter((p) => manifest.bands[p[5]] === band && !manifest.retired.includes(p[0]))
    .flatMap((p) => parsePack(readPackText(productionDirs, p[0]), p, manifest)!.rows);

const deep = BANDS.map((band) => {
  const rows = rowsFor(band);
  if (rows.length < 3) throw new Error(`Band ${band} has fewer than 3 certified rows.`);
  // Pick 3 well-spaced entries from each certified 32-entry band.
  return { band, rows: [rows[0], rows[10], rows[21]] };
});

const packed = manifest.packs
  .filter((p) => !manifest.retired.includes(p[0]))
  .map((p) => [p[0], p[1], p[2], p[4], p[6], manifest.bands[p[5]]] as const);

const allRows = deep.flatMap((g) => g.rows);
const hash = createHash("sha256").update(allRows.join("\n")).digest("hex");

writeFileSync(OUT, `${JSON.stringify({ hash, deep, packed }, null, 1)}\n`);
console.log(`Wrote Reef Sweep sets: ${packed.length} packed bands, ${allRows.length} Deep Water rows (${readFileSync(OUT).length} bytes).`);
