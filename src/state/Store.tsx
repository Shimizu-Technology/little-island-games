import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { GameId, GameState } from "../games";
import { storage } from "./storage";
import { Save, emptySave, parseSave } from "./validation";
import { preserveAndReplace } from "./replacement";
import { applySessionAction } from "./sessionAction";
import { recordWordRound } from "./wordRecords";
import { ActivityId, ActivitySession } from "./activities";
import { ActivityExpected, applyActivitySave } from "./activityAction";
import { topicById } from "../explore/content";
type Store = {
  epoch: number;
  activityUpdate: (game: ActivityId, next: ActivitySession, expected: ActivityExpected) => boolean;
  toggleFavorite: (topic: string) => void;
  save: Save;
  ready: boolean;
  error: string | null;
  recovery: string | null;
  raw: string | null;
  update: (game: GameId, next: GameState, expected?: GameState) => void;
  act: (game: GameId, roundId: string, transition: (current: GameState) => GameState) => void;
  settings: (next: Partial<Save["settings"]>) => void;
  restore: (raw: string) => Promise<void>;
  retry: () => Promise<void>;
  startFresh: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState(emptySave),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null),
    [recovery, setRecovery] = useState<string | null>(null),
    [raw, setRaw] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const generation = useRef(0);
  const latest = useRef(save),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true),
    restoring = useRef(false);
  const persist = useCallback((next: Save) => {
    if (restoring.current) return queue.current;
    const encoded = JSON.stringify(next);
    queue.current = queue.current
      .catch(() => {})
      .then(() => storage.set(encoded))
      .then(() => {
        if (mounted.current) setError(null);
      })
      .catch(() => {
        if (mounted.current) setError("Your latest changes could not be saved. Keep the app open and try again.");
      });
    return queue.current;
  }, []);
  const load = useCallback(async () => {
    try {
      const encoded = await storage.get();
      setRaw(encoded);
      const next = encoded ? parseSave(encoded) : emptySave();
      generation.current += 1;
      setEpoch(generation.current);
      latest.current = next;
      setSave(next);
      setRecovery(null);
      setError(null);
      setReady(true);
    } catch (e) {
      setRecovery(e instanceof Error ? e.message : "Saved games could not be opened. Please retry.");
      setReady(true);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrates asynchronously from external device storage.
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && ready && !recovery) void persist(latest.current);
    });
    return () => subscription.remove();
  }, [persist, ready, recovery]);
  const commit = useCallback(
    (next: Save) => {
      if (!ready || recovery || restoring.current) return;
      const previousWord = latest.current.sessions["word-rescue"],
        nextWord = next.sessions["word-rescue"];
      const records = recordWordRound(
        previousWord?.game === "word-rescue" ? previousWord : undefined,
        nextWord?.game === "word-rescue" ? nextWord : undefined,
        next.wordRecords
      );
      if (records !== next.wordRecords) next = { ...next, wordRecords: records };
      latest.current = next;
      setSave(next);
      void persist(next);
    },
    [persist, ready, recovery]
  );
  const update = useCallback(
    (game: GameId, next: GameState, expected?: GameState) => {
      const current = latest.current;
      if (expected && current.sessions[game] !== expected) return;
      commit({ ...current, sessions: { ...current.sessions, [game]: next }, recent: game, recentActivity: null });
    },
    [commit]
  );
  const act = useCallback(
    (game: GameId, roundId: string, transition: (current: GameState) => GameState) => {
      const next = applySessionAction(latest.current, game, roundId, transition);
      if (next !== latest.current) commit(next);
    },
    [commit]
  );
  const activityUpdate = useCallback(
    (game: ActivityId, next: ActivitySession, expected: ActivityExpected) => {
      if (!ready || recovery || restoring.current) return false;
      const updated = applyActivitySave(latest.current, game, next, expected, generation.current);
      if (updated === latest.current) return false;
      commit(updated);
      return true;
    },
    [commit, ready, recovery]
  );
  const toggleFavorite = useCallback(
    (topic: string) => {
      if (!topicById(topic)) return;
      const favorites = latest.current.explore?.favorites ?? [];
      commit({
        ...latest.current,
        explore: {
          favorites: favorites.includes(topic) ? favorites.filter((id) => id !== topic) : [...favorites, topic],
        },
      });
    },
    [commit]
  );
  const settings = useCallback(
    (next: Partial<Save["settings"]>) =>
      commit({ ...latest.current, settings: { ...latest.current.settings, ...next } }),
    [commit]
  );
  const restore = useCallback(
    async (encoded: string) => {
      const next = parseSave(encoded);
      if (restoring.current) throw new Error("A restore is already running.");
      restoring.current = true;
      try {
        await queue.current;
        await preserveAndReplace(storage, JSON.stringify(next), recovery ? null : JSON.stringify(latest.current));
        generation.current += 1;
        setEpoch(generation.current);
        latest.current = next;
        setSave(next);
        setRaw(JSON.stringify(next));
        setRecovery(null);
        setError(null);
        setReady(true);
      } finally {
        restoring.current = false;
      }
    },
    [recovery]
  );
  const startFresh = useCallback(async () => {
    await restore(JSON.stringify(emptySave()));
  }, [restore]);
  return (
    <Context.Provider
      value={{
        save,
        epoch,
        activityUpdate,
        toggleFavorite,
        ready,
        error,
        recovery,
        raw,
        update,
        act,
        settings,
        restore,
        retry: recovery ? load : () => persist(latest.current),
        startFresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
