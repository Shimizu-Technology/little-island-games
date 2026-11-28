import React, { useLayoutEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clockUses } from "./helpers/reading-clock";
import type { Sentence } from "../src/library/schema";
import { useLibraryAudio } from "../src/library/useLibraryAudio";

interface FakePlayer {
  volume: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  emitStatus: (status: { didJustFinish?: boolean }) => void;
  listenerCount: () => number;
  resolveSeek: () => void;
  rejectSeek: (err: Error) => void;
}

const audioEnv = vi.hoisted(() => ({
  players: [] as FakePlayer[],
  deferSeek: false,
}));

function makeFakePlayer(): FakePlayer {
  let listeners: ((status: { didJustFinish?: boolean }) => void)[] = [];
  let pendingResolve: (() => void) | null = null;
  let pendingReject: ((err: Error) => void) | null = null;
  const player: FakePlayer = {
    volume: 1,
    play: vi.fn(),
    pause: vi.fn(),
    remove: vi.fn(),
    seekTo: vi.fn(() => {
      if (!audioEnv.deferSeek) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    }),
    addListener: vi.fn((_event: string, cb: (status: { didJustFinish?: boolean }) => void) => {
      listeners.push(cb);
      return {
        remove: () => {
          listeners = listeners.filter((fn) => fn !== cb);
        },
      };
    }),
    emitStatus: (status) => {
      for (const cb of [...listeners]) cb(status);
    },
    listenerCount: () => listeners.length,
    resolveSeek: () => {
      const fn = pendingResolve;
      pendingResolve = null;
      fn?.();
    },
    rejectSeek: (err) => {
      const fn = pendingReject;
      pendingReject = null;
      fn?.(err);
    },
  };
  audioEnv.players.push(player);
  return player;
}

vi.mock("expo-audio", () => ({
  createAudioPlayer: vi.fn(() => makeFakePlayer()),
  setAudioModeAsync: vi.fn(async () => {}),
}));
vi.mock("react-native", () => ({
  AppState: { addEventListener: () => ({ remove() {} }) },
  Platform: { OS: "ios" },
}));
vi.mock("../src/content/neuralAudio", () => ({ voiceSources: { warm: {} } }));
vi.mock("../src/content/learnAudio", () => ({ learnSources: {} }));
vi.mock("../src/learn/kit/readingSpeech", () => ({ readingSpeech: (w: string) => w }));
vi.mock("../src/library/speech.generated", () => ({
  librarySpeech: {
    "clip-1": 101,
    "clip-2": 102,
    "clip-3": 103,
  },
}));
vi.mock("../src/library/assets.generated", () => ({ libraryAssets: {} }));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReactTestRenderer | undefined;
let hookValue: ReturnType<typeof useLibraryAudio>;

function Probe({ enabled = true, scope = "reader:book" }: { enabled?: boolean; scope?: string }) {
  const value = useLibraryAudio(enabled, 0.8, scope);
  useLayoutEffect(() => {
    hookValue = value;
  }, [value]);
  return null;
}

const makeSentence = (id: string, speechKey: string, text: string): Sentence => ({
  id,
  speechKey,
  text,
  audio: { status: "pending", reason: "test" },
});

beforeEach(() => {
  audioEnv.players = [];
  audioEnv.deferSeek = false;
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
});

describe("Library reading narration — zero timers & seek-overlap safety (R1-01, R1-02)", () => {
  it("contains zero timers or clock calls in useLibraryAudio.ts and Reader.tsx", () => {
    const uses = clockUses(".", ["src/library/useLibraryAudio.ts", "src/library/Reader.tsx"]);
    expect(uses).toEqual([]);
  });

  it("advances sequential page narration purely via playbackStatusUpdate didJustFinish events", async () => {
    await act(async () => {
      root = create(<Probe />);
    });
    const s1 = makeSentence("s1", "clip-1", "First wave rolls in.");
    const s2 = makeSentence("s2", "clip-2", "Second shell shines.");

    let started = false;
    await act(async () => {
      started = hookValue.speakSequence([s1, s2]);
      await Promise.resolve();
    });

    expect(started).toBe(true);
    expect(hookValue.readingSequence).toBe(true);
    expect(hookValue.selected).toBe("s1");
    expect(audioEnv.players).toHaveLength(1);
    expect(audioEnv.players[0].play).toHaveBeenCalledTimes(1);
    expect(audioEnv.players[0].listenerCount()).toBe(1);

    // Emit didJustFinish on step 1 -> pauses step 1, cleans listener, starts step 2 immediately.
    await act(async () => {
      audioEnv.players[0].emitStatus({ didJustFinish: true });
      await Promise.resolve();
    });

    expect(audioEnv.players[0].pause).toHaveBeenCalled();
    expect(audioEnv.players[0].listenerCount()).toBe(0);
    expect(hookValue.selected).toBe("s2");
    expect(hookValue.readingSequence).toBe(true);
    expect(audioEnv.players).toHaveLength(2);
    expect(audioEnv.players[1].play).toHaveBeenCalledTimes(1);

    // Emit didJustFinish on final step -> cleans up and ends readingSequence.
    await act(async () => {
      audioEnv.players[1].emitStatus({ didJustFinish: true });
    });

    expect(audioEnv.players[1].listenerCount()).toBe(0);
    expect(hookValue.readingSequence).toBe(false);
    expect(hookValue.selected).toBe("");
  });

  it("prevents a delayed seekTo(0) on step 1 from playing after advancing to step 2 or stopping (R1-02)", async () => {
    audioEnv.deferSeek = true;
    await act(async () => {
      root = create(<Probe />);
    });
    const s1 = makeSentence("s1", "clip-1", "First line.");
    const s2 = makeSentence("s2", "clip-2", "Second line.");

    await act(async () => {
      hookValue.speakSequence([s1, s2]);
    });
    expect(audioEnv.players).toHaveLength(1);
    const p1 = audioEnv.players[0];
    expect(p1.play).not.toHaveBeenCalled();

    // Advance to step 2 BEFORE step 1's seekTo(0) settles.
    await act(async () => {
      p1.emitStatus({ didJustFinish: true });
    });
    expect(p1.pause).toHaveBeenCalled();
    expect(audioEnv.players).toHaveLength(2);
    const p2 = audioEnv.players[1];

    // Now resolve BOTH delayed seeks. Step 1's stale seek MUST NOT call play().
    await act(async () => {
      p1.resolveSeek();
      p2.resolveSeek();
      await Promise.resolve();
    });

    expect(p1.play).not.toHaveBeenCalled();
    expect(p2.play).toHaveBeenCalledTimes(1);

    // Now start a fresh sequence and stop() BEFORE seek resolves.
    await act(async () => {
      hookValue.speakSequence([makeSentence("s3", "clip-3", "Third line.")]);
    });
    const p3 = audioEnv.players[2];
    await act(async () => {
      hookValue.stop();
      p3.resolveSeek();
      await Promise.resolve();
    });
    expect(p3.play).not.toHaveBeenCalled();
    expect(hookValue.readingSequence).toBe(false);
  });

  it("handles muted sound and missing clips cleanly without timers", async () => {
    await act(async () => {
      root = create(<Probe enabled={false} />);
    });
    let started = true;
    await act(async () => {
      started = hookValue.speakSequence([makeSentence("s1", "clip-1", "Quiet page.")]);
    });
    expect(started).toBe(false);
    expect(hookValue.readingSequence).toBe(false);
    expect(hookValue.notice).toContain("Sound is off");

    await act(async () => {
      root!.update(<Probe enabled />);
    });
    await act(async () => {
      started = hookValue.speakSequence([makeSentence("missing", "no-such-clip", "Missing clip.")]);
    });
    expect(started).toBe(false);
    expect(hookValue.readingSequence).toBe(false);
    expect(hookValue.notice).toContain("not installed");
  });
});
