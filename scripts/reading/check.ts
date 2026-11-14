/**
 * Checks a Sound Boat word-parts bank file.
 *
 *   node --import ./scripts/puzzles/register.mjs scripts/reading/check.ts <bank.json>             structure only
 *   node --import ./scripts/puzzles/register.mjs scripts/reading/check.ts <bank.json> --shipping  also the review gate
 *
 * Structure passes for fixtures and drafts. --shipping fails closed on anything that is not complete, current,
 * two-reviewer evidence. This tool reads evidence; it can never write or invent it.
 */
import { readFileSync } from "node:fs";
import type { PartsWord, WordBank } from "../../src/learn/reading/records";
import { partsBankIssues, shippingIssues } from "../../src/learn/reading/validate";

const [file, flag] = process.argv.slice(2);
if (!file) throw new Error("usage: check.ts <bank.json> [--shipping]");
const bank = JSON.parse(readFileSync(file, "utf8")) as WordBank<PartsWord>;
const issues = [...partsBankIssues(bank), ...(flag === "--shipping" ? shippingIssues(bank) : [])];
for (const i of issues.slice(0, 20)) console.error(`${i.id}: ${i.problem}`);
if (issues.length > 20) console.error(`... and ${issues.length - 20} more`);
console.log(`${bank.id}: ${bank.records.length} records, ${issues.length} problem${issues.length === 1 ? "" : "s"}${flag === "--shipping" ? " (shipping)" : ""}`);
process.exit(issues.length ? 1 : 0);
