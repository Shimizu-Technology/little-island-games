import { vi } from "vitest";
/**
 * The School host measures board space on animation frames (F-frame-2's BoardSpace, through frameClocks). The test
 * renderer has no frames, so they are held and never run: boards keep their natural geometry, and no frame can save
 * or move a round.
 */
export function holdFrames() {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
}
