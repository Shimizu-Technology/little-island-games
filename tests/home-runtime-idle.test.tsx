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
        } as SceneEntity,
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
describe("per-character transient idle", () => {
  it("keeps idle time across unrelated scene edits and wakes only the used actor", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    const scene = fixture();
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={scene} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    await act(async () => {
      renderer!.update(<Probe scene={{ ...scene, revision: "unrelated-toggle" }} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(current.sleeping).toEqual({ "character/0": true, "character/1": true });
    await act(async () => {
      current.wake("character/0");
    });
    expect(current.sleeping).toEqual({ "character/0": false, "character/1": true });
    await act(async () => {
      renderer!.unmount();
    });
  });
  it("stays awake while carried and starts a fresh still interval after cancellation", async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    const scene = fixture();
    await act(async () => {
      renderer = TestRenderer.create(<Probe scene={scene} />);
    });
    const pickup: Pickup = { id: "character/0", slot: 0, generation: 1, epoch: 0, scene };
    await act(async () => {
      renderer!.update(<Probe scene={scene} pickups={[pickup]} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    // Other faces remain frozen during a gesture.
    expect(current.sleeping["character/1"]).not.toBe(true);
    await act(async () => {
      renderer!.update(<Probe scene={scene} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(7999);
    });
    expect(current.sleeping["character/0"]).toBe(false);
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(current.sleeping["character/0"]).toBe(true);
    expect(scene.entities["character/0"].base).toBe("lie");
    await act(async () => {
      renderer!.unmount();
    });
  });
});
