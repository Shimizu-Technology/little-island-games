import { afterEach, describe, expect, it, vi } from "vitest";

// AR-00 review finding 1: the chain must read the engines' runtime curves, so an easing made only
// inside an engine function still fails the build. These mutations sit at the engine-function boundary.
const mutate = vi.hoisted(() => ({ railStart: false, railPeak: false, palm: false, cargo: false }));
vi.mock("../src/arcade/games/rail-parade/engine", async original => {
  const m = await original<typeof import("../src/arcade/games/rail-parade/engine")>();
  return {
    ...m,
    railTick: (s: Parameters<typeof m.railTick>[0]) => {
      const w23 = s.level !== "endless" && s.level.id === "w2-3", peak = s.level !== "endless" && s.collected >= s.level.target;
      return m.railTick(s) * (w23 && (mutate.railStart || (mutate.railPeak && peak)) ? 2 : 1);
    },
  };
});
vi.mock("../src/arcade/games/palm-patrol/engine", async original => {
  const m = await original<typeof import("../src/arcade/games/palm-patrol/engine")>();
  return { ...m, palmMarchSpeed: (s: Parameters<typeof m.palmMarchSpeed>[0]) => m.palmMarchSpeed(s) * (mutate.palm && s.level !== "endless" && s.level.id === "w2-1" ? 0.5 : 1) };
});
vi.mock("../src/arcade/games/canoe-cargo/engine", async original => {
  const m = await original<typeof import("../src/arcade/games/canoe-cargo/engine")>();
  return { ...m, cargoCadence: (s: Parameters<typeof m.cargoCadence>[0]) => m.cargoCadence(s) + (mutate.cargo && s.level !== "endless" && s.level.id === "w4-3" ? 3 : 0) };
});
const { boundaryIssues, buildBoundaryTables } = await import("../src/arcade/boundaries");
const { restBeats } = await import("../src/arcade/restBeats");

afterEach(() => { mutate.railStart = mutate.railPeak = mutate.palm = mutate.cargo = false; });

describe("AR-00 boundary validator reads runtime curves", () => {
  it("passes the unmutated engines", () => {
    expect(boundaryIssues(restBeats, buildBoundaryTables())).toEqual([]);
  });
  it("fails an engine-only easing at a level's start, even when Helper keeps its ratio", () => {
    // The review mutation: railTick doubled for W2-3 in both Helper states. Descriptors are unchanged.
    mutate.railStart = true;
    const issues = boundaryIssues(restBeats, buildBoundaryTables());
    // W2-3 starts at 0.364 s after W2-2's 0.186 s, as in the review's mutation.
    expect(issues).toContain("Unexplained easing: rail-parade w2-2 → w2-3 tick 0.186 → 0.364");
    expect(issues.some(i => i.startsWith("Helper makes"))).toBe(false);
  });
  it("fails an engine-only easing at a level's hardest point", () => {
    // Only the last stop of W2-3 slows down; the start value is untouched.
    mutate.railPeak = true;
    expect(boundaryIssues(restBeats, buildBoundaryTables())).toEqual(["Unexplained easing: rail-parade w2-2 → w2-3 tickPeak 0.1618 → 0.3167"]);
  });
  it("fails an engine change that makes a reviewed easing bigger", () => {
    mutate.palm = true;
    expect(boundaryIssues(restBeats, buildBoundaryTables())).toContain("Easing larger than reviewed: palm-patrol w1-8 → w2-1 speed 47.7 → 23 eases 51.8%, reviewed up to 4.9%");
  });
  it("fails a spawn cadence eased inside the engine", () => {
    mutate.cargo = true;
    expect(boundaryIssues(restBeats, buildBoundaryTables())).toContain("Unexplained easing: canoe-cargo w4-2 → w4-3 garbage 9 → 12");
  });
});
