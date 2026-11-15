/**
 * Checks a Sound Boat word-parts bank file's structure and the kit's piece and spelling rules.
 *
 *   node --import ./scripts/puzzles/register.mjs scripts/reading/check.ts <bank.json>
 *
 * Structure passes for fixtures and drafts. It says nothing about shipping: reviewed content ships only through the
 * detached W1 admission (`prepare-reading`, blind review, `bake-reading`, the manifest and `npm run check:words`).
 * Nothing here reads or writes approval.
 */
import { readFileSync } from "node:fs";
import type { PartsDraft, WordBank } from "../../src/learn/reading/records";
import { partsBankIssues } from "../../src/learn/reading/validate";

const [file] = process.argv.slice(2);
if (!file) throw new Error("usage: check.ts <bank.json>");
const bank = JSON.parse(readFileSync(file, "utf8")) as WordBank<PartsDraft>;
const issues = partsBankIssues(bank);
for (const i of issues.slice(0, 20)) console.error(`${i.id}: ${i.problem}`);
if (issues.length > 20) console.error(`... and ${issues.length - 20} more`);
console.log(`${bank.id}: ${bank.records.length} records, ${issues.length} problem${issues.length === 1 ? "" : "s"}`);
process.exit(issues.length ? 1 : 0);
