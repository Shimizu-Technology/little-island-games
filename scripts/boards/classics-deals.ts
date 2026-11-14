/** Host-only authoring recipe. Existing shipped cards/hashes must never be regenerated in place. */
import { readFileSync, writeFileSync } from "node:fs";
import { memoryDeck } from "../../src/games/memory";
const deals = (["pictures", "words", "chamoru"] as const).flatMap((pack, p) =>
  ([6, 8, 12] as const).flatMap((pairs, size) => [true, false].map(preview => ({ version: 1, cards: memoryDeck(pairs, pack, 410 + p * 31 + size), pack, preview, suggested: preview ? pairs * 1.5 : [14, 19, 28][size] }))));
const file = "src/games/classics/memory-deals.json", text = JSON.stringify(deals, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(file, "utf8") !== text) throw new Error("Frozen Classics Memory deals differ from their host authoring recipe.");
} else if (readFileSync(file, "utf8") !== text) throw new Error("Refusing to replace frozen Memory deals. New content needs new slots and a reviewed revision.");
else writeFileSync(file, text);
console.log("Frozen Classics Memory deals match the host recipe: 18 deals.");
