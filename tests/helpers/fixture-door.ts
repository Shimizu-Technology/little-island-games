import { readFileSync } from "node:fs";
import type { PartsDraft, WordBank } from "../../src/learn/reading/records";

/**
 * TEST ONLY. Stands in for the W1 registry door (`src/learn/reading/admitted`) with the labelled fixture records, so
 * the real task factory mints them exactly as it would mint an admitted bank. Use it through `vi.mock`:
 *   vi.mock("../src/learn/reading/admitted", async (real) => (await import("./helpers/fixture-door")).fixtureDoor(real));
 * Production has no such door: the app imports only the registry.
 */
export const fixtureBank = JSON.parse(readFileSync("tests/fixtures/reading/sound-boat-parts.fixture.json", "utf8")) as WordBank<PartsDraft>;
export const fixtureRecords = fixtureBank.records;
export const fixtureDoor = async (real: () => Promise<unknown>, records: readonly unknown[] = fixtureRecords) => ({ ...((await real()) as object), admittedParts: records });
