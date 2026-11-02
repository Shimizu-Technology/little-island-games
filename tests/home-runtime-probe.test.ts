import { describe, expect, it } from "vitest";
import { releaseWindow } from "../src/home/runtime/frameProbe";
describe("native lab release probe", () => {
  it("keeps stalled intervals crossing either window edge and sorts the ring after wrap", () => {
    const result = releaseWindow({ at: 1000, id: "character/0", kind: "socket" }, [
      { at: 1530, delta: 100 }, { at: 490, delta: 16 }, { at: 800, delta: 16 },
      { at: 1610, delta: 16 }, { at: 500, delta: 16 }, { at: 1100, delta: 97 },
    ]);
    expect(result.frames.map((f) => f.at)).toEqual([500, 800, 1100, 1530]);
    expect(result.maxDelta).toBe(100);
  });
});
