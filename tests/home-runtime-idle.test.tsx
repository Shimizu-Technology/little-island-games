import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIdleCharacters } from "../src/home/runtime/useIdleCharacters";
import type { Scene, SceneEntity } from "../src/home/scene/types";
import type { Pickup } from "../src/home/runtime/useInteraction";
const noPickups: Pickup[] = [];
let current: ReturnType<typeof useIdleCharacters>;
function fixture(): Scene {
  return {
    entities: Object.fromEntries(
      [0, 1].map((slot) => [
        `character/${slot}`,
        {
          id: `character/${slot}`,
          room: "home",
          base: "lie",
          contact: { x: 200 + slot * 100, y: 300 },
          action: null,
          character: { slot },
          children: [],
        } as unknown as SceneEntity,
      ])
    ),
  } as Scene;
}
function Probe({ scene, pickups = noPickups }: { scene: Scene; pickups?: Pickup[] }) {
  const idle = useIdleCharacters(scene, pickups);
  React.useLayoutEffect(() => {
    current = idle;
  });
  return null;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});
afterEach(() => {
  vi.useRealTimers();
});
describe("activity-derived sleep (Build 8 awake-in-bed regression)", () => {
  it("sleeps on the very first render and schedules no delayed publication", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const scene = fixture();
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} />); });
    expect(current.sleeping).toEqual({ "character/0": true, "character/1": true });
    expect(vi.getTimerCount()).toBe(0);
    const before = current.sleeping;
    await act(async () => { renderer.update(<Probe scene={scene} />); });
    expect(current.sleeping).toBe(before);
    await act(async () => { renderer.unmount(); });
  });
  it("wakes the captured group immediately, keeps others asleep, and sleeps on cancellation", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    const scene = fixture();
    const pickup: Pickup = { id: "character/0", slot: 0, generation: 1, epoch: 0, scene };
    await act(async () => { renderer = TestRenderer.create(<Probe scene={scene} pickups={[pickup]} />); });
    expect(current.sleeping).toEqual({ "character/0": false, "character/1": true });
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { renderer.update(<Probe scene={scene} />); });
    expect(current.sleeping["character/0"]).toBe(true);
    expect(scene.entities["character/0"].base).toBe("lie");
    await act(async () => { renderer.unmount(); });
  });
});
