import { ExploreProgress, validExploreProgress } from "../explore/progress";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { rememberNames } from "../games/match";
import type { LearnId, LearnSession } from "../learn/types";
import { toggleShelfFavorite } from "../learn/home";
import { LearnExpected, applyLearnSave, applyPractice, applyOwnedPractice } from "./learnAction";
import { addLearner as appendLearner, selectLearner as chooseLearner, recordLearning, familyLearners } from "../learn/learners";
import { defaultPracticeSettings, type PracticeResult, type PracticeSettings } from "../practice/types";
import { AudioPreferences } from "../components/Audio";
import { recordPracticeNote } from "../practice/notes";
type Store = {
  epoch: number;
  addLearner: (name: string) => boolean;
  selectLearner: (id: string) => void;
  recordWarmup: (results: PracticeResult[], config: PracticeSettings, round: string, expectedEpoch: number) => void;
  activityUpdate: (game: ActivityId, next: ActivitySession, expected: ActivityExpected) => boolean;
  toggleFavorite: (topic: string) => void;
  toggleGameFavorite: (game: GameId | ActivityId | LearnId) => void;
  /** Remember family names used in a two-player setup (no-op when unchanged). */
  rememberPlayers: (names: string[]) => void;
  /** Save a learning-game round; false when the round was replaced or a backup was restored meanwhile. */
  learnUpdate: (game: LearnId, next: LearnSession, expected: LearnExpected) => boolean;
  /** Record one attempt at a learning skill. */
  practice: (skill: string, correct: boolean) => void;
  practiceOwned: (game: LearnId, expected: LearnExpected, skill: string, correct: boolean) => void;
  notePractice: (skill: string, helped: boolean, expectedEpoch?: number) => void;
  /** Remember that a learning game's first-move hand was shown. */
  markCoached: (game: LearnId) => void;
  exploreUpdate: (next: ExploreProgress, expectedEpoch: number) => void;
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
  const audioPreferences = useMemo(() => ({ ...save.settings, epoch }), [save.settings, epoch]);
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
      commit({ ...current, sessions: { ...current.sessions, [game]: next }, recent: game, recentActivity: null, recentLearn: null });
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
          ...latest.current.explore,
          favorites: favorites.includes(topic) ? favorites.filter((id) => id !== topic) : [...favorites, topic],
        },
      });
    },
    [commit]
  );
  const exploreUpdate = useCallback((progress: ExploreProgress, expectedEpoch: number) => {
    if (expectedEpoch !== generation.current || !validExploreProgress(progress)) return;
    const current = latest.current;
    if (JSON.stringify(current.explore?.progress) === JSON.stringify(progress)) return;
    commit({ ...current, explore: { favorites: [], ...current.explore, progress } });
  }, [commit]);
  const toggleGameFavorite = useCallback((game: GameId | ActivityId | LearnId) => {
    const next = toggleShelfFavorite(latest.current, game);
    if (next !== latest.current) commit(next);
  }, [commit]);
  const learnUpdate = useCallback(
    (game: LearnId, next: LearnSession, expected: LearnExpected) => {
      if (!ready || recovery || restoring.current) return false;
      const updated = applyLearnSave(latest.current, game, next, expected, generation.current);
      if (updated === latest.current) return false;
      commit(updated);
      return true;
    },
    [commit, ready, recovery]
  );
  const ownedCredits = useRef(new Set<string>());
  const practiceOwned = useCallback((game: LearnId, expected: LearnExpected, skill: string, correct: boolean) => {
    if (!ready || recovery || restoring.current) return;
    const key = `${expected.epoch}:${game}:${expected.id}:${expected.revision}:${skill}`;
    if (ownedCredits.current.has(key)) return;
    const updated = applyOwnedPractice(latest.current, game, expected, generation.current, skill, correct);
    if (updated === latest.current) return;
    if (ownedCredits.current.size > 512) ownedCredits.current.clear();
    ownedCredits.current.add(key);
    commit(updated);
  }, [commit, ready, recovery]);
  const practice = useCallback(
    (skill: string, correct: boolean) => {
      const updated = applyPractice(latest.current, skill, correct);
      if (updated !== latest.current) commit(updated);
    },
    [commit]
  );
  const markCoached = useCallback(
    (game: LearnId) => {
      const coached = latest.current.coached ?? [];
      if (coached.includes(game)) return;
      commit({ ...latest.current, coached: [...coached, game] });
    },
    [commit]
  );
  const notePractice = useCallback((skill: string, helped: boolean, expectedEpoch = epoch) => {
    if (expectedEpoch !== generation.current) return;
    const before = latest.current;
    const practiceNotes = recordPracticeNote(before.practiceNotes, skill, helped);
    if (practiceNotes !== before.practiceNotes) commit({ ...before, practiceNotes });
  }, [commit, epoch]);
  const rememberPlayers = useCallback((names: string[]) => {
    const current = latest.current.players ?? [];
    const next = rememberNames(current, names);
    if (next.length === current.length && next.every((n, i) => n === current[i])) return;
    commit({ ...latest.current, players: next });
  }, [commit]);
  const addLearner = useCallback((name: string) => {
    if (!ready || recovery || restoring.current) return false;
    const before = latest.current;
    const learning = appendLearner(before.learning, name, `learner-${Date.now().toString(36)}`);
    if (learning === before.learning || learning.people.length === (before.learning?.people.length ?? 1)) return false;
    generation.current++; setEpoch(generation.current);
    commit({ ...before, learning });
    return true;
  }, [commit, ready, recovery]);
  const selectLearner = useCallback((id: string) => {
    if (!ready || recovery || restoring.current) return;
    const before = latest.current, learning = chooseLearner(before.learning, id);
    if (learning.active === (before.learning?.active ?? "family")) return;
    generation.current++; setEpoch(generation.current);
    commit({ ...before, learning });
  }, [commit, ready, recovery]);
  const recordWarmup = useCallback((results: PracticeResult[], config: PracticeSettings, round: string, expectedEpoch: number) => {
    if (expectedEpoch !== generation.current || !ready || recovery || restoring.current) return;
    const before = latest.current, owner = before.learning?.active ?? "family";
    let learning = before.learning;
    for (const [i, result] of results.entries()) {
      const math = result.skill.startsWith("num.");
      const stage = math ? config.mathStage ?? (config.limit === 10 ? "easy" : "medium") : config.readingStage ?? "easy";
      learning = recordLearning(learning, owner, math ? "quick-practice" : "which-one", stage, result.skill, `warmup-${i}`, round, result.helped);
    }
    if (learning !== before.learning) commit({ ...before, learning });
  }, [commit, ready, recovery]);
  const settings = useCallback(
    (next: Partial<Save["settings"]>) => {
      const before = latest.current;
      let learning = before.learning;
      if (next.practice) {
        const people = learning ?? familyLearners();
        learning = { ...people, people: people.people.map(p => p.id === people.active ? { ...p, warmup: next.practice } : p.id === "family" && !p.warmup ? { ...p, warmup: before.settings.practice ?? defaultPracticeSettings } : p) };
      }
      commit({ ...before, ...(learning ? { learning } : {}), settings: { ...before.settings, ...next } });
    },
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
        addLearner,
        selectLearner,
        recordWarmup,
        activityUpdate,
        toggleFavorite,
        toggleGameFavorite,
        rememberPlayers,
        learnUpdate,
        practice,
        practiceOwned,
        notePractice,
        markCoached,
        exploreUpdate,
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
      <AudioPreferences.Provider value={audioPreferences}>{children}</AudioPreferences.Provider>
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
