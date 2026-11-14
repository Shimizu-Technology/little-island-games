import type { PartsWord, WordBank } from "../records";
import { assertShippable, partsBankIssues } from "../validate";

/**
 * Banks that ship. A bank is listed here only after the two-reviewer process (W1/W2 tooling) has marked every
 * record reviewed with its evidence; until then this list is empty and the apps that read it fall back to what
 * shipped before. The lead adds a reviewed bank here, and `admitParts` refuses anything that is not shippable.
 */
const reviewedPartsBanks: readonly WordBank<PartsWord>[] = [];

export function admitParts(banks: readonly WordBank<PartsWord>[]): PartsWord[] {
  for (const bank of banks) {
    const issues = partsBankIssues(bank);
    if (issues.length) throw new Error(`Reading bank ${bank.id} is malformed: ${issues[0].id}: ${issues[0].problem}`);
    assertShippable(bank);
  }
  return banks.flatMap((b) => [...b.records]);
}
export const admittedParts: readonly PartsWord[] = admitParts(reviewedPartsBanks);
