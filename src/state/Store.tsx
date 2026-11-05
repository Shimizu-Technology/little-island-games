import { assignEarlier, encodeSave, migrateProfiles, projectProfile, syncProfile } from "./profiles";
import { clearPageDrafts, draftRecovery } from "../library/drafts";
import { libraryChild, migrateLibrary, validLibraryChild, validLibraryData, validLibraryPolicy, type LibraryChildState, type LibraryPolicy } from "../library/state";
import { preserveHomeMigration, preserveImportedHome, assertMigratedHomes } from './homeMigration';
import { applyWarmup } from './warmupAction';
import { badgesFor, type BadgeId } from '../badges/engine';
import { personFor } from '../personalization/model';
import { backfillRewards, rewardTransitions, rewardCompletion, completionSource } from '../badges/transitions';
import { applyPersonalization, withoutLearner, type Person, type IdentityExpected } from "../personalization/model";
import { BoardId, BoardSession, applyBoardSave } from "../board";
import { labComplete } from "../explore/activities";
import { newExploreProgress, ExploreProgress, validExploreProgress } from "../explore/progress";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { GameId, GameState } from "../games";
import { storage } from "./storage";
import { Save, emptySave, parseSave, withinSaveLimit } from "./validation";
import { preserveAndReplace } from "./replacement";
import { applySessionAction } from "./sessionAction";
import { recordWordRound } from "./wordRecords";
import { ActivityId, ActivitySession } from "./activities";
import { ActivityExpected, applyActivitySave } from "./activityAction";
import { topicById } from "../explore/content";
import { rememberNames } from "../games/match";
import type { LearnId, LearnSession } from "../learn/types";
import { recordLevelRound } from "../learn/levelEvidence";
import { toggleShelfFavorite } from "../learn/home";
import { LearnExpected, applyLearnSave, applyPractice, applyOwnedPractice } from "./learnAction";
import { addLearner as appendLearner, selectLearner as chooseLearner, familyLearners } from "../learn/learners";
import { defaultPracticeSettings, type PracticeResult, type PracticeSettings } from "../practice/types";
import { AudioPreferences } from "../components/Audio";
import { recordPracticeNote } from "../practice/notes";
import { type ArcadeAction, type ArcadeExpected, type ArcadeId } from "../arcade";
import { applyArcadeAction } from "../arcade/saveAction";
type Store = {
  badgeResult: { owner: string; epoch: number; badges: BadgeId[]; source: string } | null;
  dismissBadge: () => void;
  personalize: (patch: Partial<Pick<Person, "look" | "made" | "home" | "unseen">>, expected: IdentityExpected) => boolean;
  renameLearner: (id: string, name: string) => boolean;
  removeLearner: (id: string) => Promise<boolean>;
  saving: boolean;
  assignEarlier: (key: string, learner: string, expectedEpoch: number) => Promise<boolean>;
  arcade: (action: ArcadeAction, expected: ArcadeExpected) => boolean;
  epoch: number;
  boardUpdate: (game: BoardId, next: BoardSession, expected: BoardSession | undefined, expectedEpoch: number) => boolean;
  addLearner: (name: string) => boolean;
  selectLearner: (id: string) => void;
  recordWarmup: (results: PracticeResult[], config: PracticeSettings, round: string, expectedEpoch: number) => void;
  activityUpdate: (game: ActivityId, next: ActivitySession, expected: ActivityExpected) => boolean;
  toggleFavorite: (topic: string) => void;
  toggleGameFavorite: (game: GameId | ActivityId | LearnId | BoardId | ArcadeId) => void;
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
  /** Child writes cannot change grown-up policy or cross a learner/restore boundary. */
  libraryUpdate: (next: LibraryChildState, expectedEpoch: number, expectedLearnerId: string) => boolean;
  libraryPatch: (patch: Partial<LibraryChildState>, expectedEpoch: number, expectedLearnerId: string) => boolean;
  libraryPolicy: (childId: string, policy: LibraryPolicy) => void;
  /** Drains queued writes; false if a write fails or state is not writable. */
  libraryFlush: () => Promise<boolean>;
  exploreUpdate: (next: ExploreProgress, expectedEpoch: number, completedTopic?: string, expectedLearner?: string) => void;
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
  const [badgeResult, setBadgeResult] = useState<Store["badgeResult"]>(null);
  const [saving, setSaving] = useState(false);
  const pendingWrites = useRef(0);
  const writeFailures = useRef(0), lastWriteFailed = useRef(false), libraryRejected = useRef(false), admissionRejected = useRef(false);
  const [epoch, setEpoch] = useState(0);
  const audioPreferences = useMemo(() => ({ ...save.settings, epoch }), [save.settings, epoch]);
  const generation = useRef(0);
  const latest = useRef(save),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true),
    restoring = useRef(false);
  const persist = useCallback((next: Save) => {
    if (restoring.current) return queue.current;
    const encoded = encodeSave(next);
    pendingWrites.current++; setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => storage.set(encoded))
      .then(() => {
        lastWriteFailed.current = false;
        if (mounted.current && !libraryRejected.current && !admissionRejected.current) setError(null);
      })
      .catch(() => {
        writeFailures.current++; lastWriteFailed.current = true;
        if (mounted.current) setError("Your latest changes could not be saved. Keep the app open and try again.");
      }).finally(() => { pendingWrites.current--; if (mounted.current && pendingWrites.current === 0) setSaving(false); });
    return queue.current;
  }, []);
  const load = useCallback(async () => {
    let encoded:string|null=null;
    try {
      encoded = await storage.get();
      setRaw(encoded);
      const before=encoded?parseSave(encoded):emptySave();
      const next=syncProfile(backfillRewards(migrateLibrary(migrateProfiles(before), { existingLearners: encoded !== null })));
      if (!validLibraryData(next.library) || !withinSaveLimit(encodeSave(next))) throw new Error("This Library could not be migrated. Your original has been kept.");
      parseSave(encodeSave(next));
      assertMigratedHomes(next);
      if(encoded) {
        if (!before.profiles || !before.library || before.library.version === 1) await preserveAndReplace(storage, encodeSave(next), encoded);
        else await preserveHomeMigration(storage,encoded,before,next);
      }
      generation.current += 1;
      setEpoch(generation.current);
      latest.current = next;
      setSave(next);
      setRecovery(null);
      setError(null);
      lastWriteFailed.current = false; libraryRejected.current = false; admissionRejected.current = false;
      setReady(true);
    } catch (e) {
      if(encoded)try{await storage.preserve(encoded);}catch{/* Original remains in active storage; do not publish or replace it. */}
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
    (next: Save, mirrorLibraryLabs = false) => {
      if (!ready || recovery || restoring.current) return false;
      const previous = latest.current;
      // Identity changes select another complete profile view; they aren't game transitions.
      if ((previous.learning?.active ?? 'family') !== (next.learning?.active ?? 'family')) {
        const kept = syncProfile(previous);
        next = syncProfile(projectProfile({ ...next, profiles: kept.profiles ? { ...kept.profiles, people: { ...next.profiles?.people, ...kept.profiles.people } } : next.profiles }, next.learning));
        if (!withinSaveLimit(encodeSave(next))) { admissionRejected.current = true; writeFailures.current++; setError("This change exceeds the save limit. Your saved work is kept."); return false; }
        admissionRejected.current = false; latest.current = next; setSave(next); setBadgeResult(null); void persist(next); return true;
      }
      const previousWord = latest.current.sessions["word-rescue"],
        nextWord = next.sessions["word-rescue"];
      const records = recordWordRound(
        previousWord?.game === "word-rescue" ? previousWord : undefined,
        nextWord?.game === "word-rescue" ? nextWord : undefined,
        next.wordRecords
      );
      if (records !== next.wordRecords) next = { ...next, wordRecords: records };
      const before = latest.current;
      next = rewardTransitions(before, next, mirrorLibraryLabs);
      const owner = next.learning?.active ?? "family", previousBadges = badgesFor(personFor(before, owner).milestones);
      const newBadges = badgesFor(personFor(next, owner).milestones).filter(id => !previousBadges.includes(id));
      const source = completionSource(before, next);
      next = syncProfile(next);
      if (!withinSaveLimit(encodeSave(next))) { admissionRejected.current = true; writeFailures.current++; setError("This change exceeds the save limit. Your saved work is kept."); return false; }
      admissionRejected.current = false;
      if (newBadges.length && source) setBadgeResult({ owner, epoch: generation.current, badges: newBadges, source });
      latest.current = next;
      setSave(next);
      void persist(next);
      return true;
    },
    [persist, ready, recovery]
  );
  const update = useCallback(
    (game: GameId, next: GameState, expected?: GameState) => {
      const current = latest.current;
      if (epoch !== generation.current || (expected && current.sessions[game] !== expected)) return;
      // A captured round from another profile cannot be installed as this learner's work.
      if (Object.entries(current.profiles?.people ?? {}).some(([id,p]) => id !== (current.learning?.active ?? 'family') && p.sessions[game]?.id === next.id)) return;
      commit({ ...current, sessions: { ...current.sessions, [game]: next }, recent: game, recentActivity: null, recentLearn: null, recentBoard: null });
    },
    [commit, epoch]
  );
  const act = useCallback(
    (game: GameId, roundId: string, transition: (current: GameState) => GameState) => {
      if (epoch !== generation.current) return;
      const next = applySessionAction(latest.current, game, roundId, transition);
      if (next !== latest.current) commit({ ...next, recentBoard: null });
    },
    [commit, epoch]
  );
  const activityUpdate = useCallback(
    (game: ActivityId, next: ActivitySession, expected: ActivityExpected) => {
      if (!ready || recovery || restoring.current) return false;
      if (next.id !== expected.id && Object.entries(latest.current.profiles?.people ?? {}).some(([id,p]) => id !== (latest.current.learning?.active ?? 'family') && p.activities?.[game]?.id === next.id)) return false;
      const updated = applyActivitySave(latest.current, game, next, expected, generation.current);
      if (updated === latest.current) return false;
      return commit({ ...updated, recentBoard: null });
    },
    [commit, ready, recovery]
  );
  const boardUpdate = useCallback((game: BoardId, next: BoardSession, expected: BoardSession | undefined, expectedEpoch: number) => {
    if (!ready || recovery || restoring.current) return false;
    if (next.id !== expected?.id && Object.entries(latest.current.profiles?.people ?? {}).some(([id,p]) => id !== (latest.current.learning?.active ?? 'family') && p.board?.[game]?.id === next.id)) return false;
    const updated = applyBoardSave(latest.current, game, next, expected, expectedEpoch, generation.current);
    if (updated === latest.current) return false;
    return commit(updated);
  }, [commit, ready, recovery]);
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
  const exploreUpdate = useCallback((progress: ExploreProgress, expectedEpoch: number, completedTopic?: string, expectedLearner?: string) => {
    if (expectedEpoch !== generation.current || !validExploreProgress(progress) || expectedLearner !== undefined && expectedLearner !== (latest.current.learning?.active ?? "family")) return;
    const current = latest.current;
    if (!completedTopic && JSON.stringify(current.explore?.progress) === JSON.stringify(progress)) return;
    const next = { ...current, explore: { favorites: [], ...current.explore, progress } };
    commit(completedTopic && topicById(completedTopic) && progress.location.kind === "topic" && progress.location.id === completedTopic ? rewardCompletion(next, { kind: "explore", topic: completedTopic }, (current.learning?.active ?? "family")) : next);
  }, [commit]);
  const rejectLibraryWrite = useCallback(() => {
    libraryRejected.current = true; writeFailures.current++;
    setError("This Library change could not be saved. It contains invalid data or exceeds the save limit.");
  }, []);
  const libraryUpdate = useCallback((child: LibraryChildState, expectedEpoch: number, expectedLearnerId: string) => {
    if (!ready || recovery || restoring.current || expectedEpoch !== generation.current) return false;
    const before = latest.current, owner = before.learning?.active ?? "family";
    if (owner !== expectedLearnerId) return false;
    if (!validLibraryChild(child)) { rejectLibraryWrite(); return false; }
    const data = migrateLibrary(before).library, current = libraryChild(data, owner);
    // A delayed reader/drawing autosave must never undo a grown-up's policy.
    const next = { ...child, policy: current.policy };
    if (JSON.stringify(current) === JSON.stringify(next)) {
      libraryRejected.current = false; if (!lastWriteFailed.current) setError(null); return true;
    }
    const library = { ...data, profiles: { ...data.profiles, [owner]: JSON.parse(JSON.stringify(next)) as LibraryChildState } };
    const untouched = before.profiles?.unassigned.exploreUntouched;
    let updated: Save = { ...before, library, ...(untouched?.includes(owner) ? { profiles: { ...before.profiles!, unassigned: { ...before.profiles!.unassigned, exploreUntouched: untouched.filter(id => id !== owner) } } } : {}) };
    const changedLabs = (Object.keys(next.labs) as (keyof typeof next.labs)[])
      .filter(world => JSON.stringify(current.labs[world]) !== JSON.stringify(next.labs[world]));
    // Reward the accepted learner's own transition. The legacy projection has no reward ownership.
    for (const world of changedLabs) if (!labComplete(world, current.labs[world]) && labComplete(world, next.labs[world]))
      updated = rewardCompletion(updated, { kind: "explore", topic: `lab-${world}` }, owner);
    if (changedLabs.length) updated = { ...updated, explore: {
      favorites: [], ...before.explore,
      progress: { ...newExploreProgress(), ...before.explore?.progress,
        location: { kind: "activity", world: changedLabs[0] }, labs: library.profiles[owner].labs },
    } };
    if (!validLibraryData(library) || !withinSaveLimit(encodeSave(updated))) { rejectLibraryWrite(); return false; }
    libraryRejected.current = false;
    return commit(updated, changedLabs.length > 0);
  }, [commit, ready, recovery, rejectLibraryWrite]);
  const libraryPatch = useCallback((patch: Partial<LibraryChildState>, expectedEpoch: number, expectedLearnerId: string) => {
    const current = libraryChild(latest.current.library, expectedLearnerId);
    return libraryUpdate({ ...current, ...patch }, expectedEpoch, expectedLearnerId);
  }, [libraryUpdate]);
  const libraryPolicy = useCallback((childId: string, policy: LibraryPolicy) => {
    if (!ready || recovery || restoring.current) return;
    const before = latest.current;
    if (!(before.learning?.people.map(p => p.id) ?? ["family"]).includes(childId)) return;
    if (!validLibraryPolicy(policy)) { rejectLibraryWrite(); return; }
    const data = migrateLibrary(before).library, child = libraryChild(data, childId);
    const next = { ...child, policy: JSON.parse(JSON.stringify(policy)) as LibraryPolicy };
    if (!validLibraryChild(next)) { rejectLibraryWrite(); return; }
    if (JSON.stringify(child) === JSON.stringify(next)) {
      libraryRejected.current = false; if (!lastWriteFailed.current) setError(null); return;
    }
    const library = { ...data, profiles: { ...data.profiles, [childId]: next } };
    const updated = { ...before, library };
    if (!validLibraryData(library) || !withinSaveLimit(encodeSave(updated))) { rejectLibraryWrite(); return; }
    libraryRejected.current = false;
    commit(updated);
  }, [commit, ready, recovery, rejectLibraryWrite]);
  const libraryFlush = useCallback(async () => {
    if (!ready || recovery || restoring.current) return false;
    const failures = writeFailures.current, startEpoch = generation.current;
    // Include writes appended while the previous tail is settling.
    let tail: Promise<void>;
    do { tail = queue.current; await tail; } while (tail !== queue.current);
    return mounted.current && !restoring.current && startEpoch === generation.current &&
      writeFailures.current === failures && !lastWriteFailed.current && !libraryRejected.current && !admissionRejected.current;
  }, [ready, recovery]);
  // Arcade uses the same commit/recovery queue, with explicit learner/restore ownership.
  const arcade = useCallback((action: ArcadeAction, expected: ArcadeExpected) => {
    if (!ready || recovery || restoring.current) return false;
    const before = latest.current, next = applyArcadeAction(before, action, expected, generation.current);
    if (next === before) return false;
    return commit(next);
  }, [commit, ready, recovery]);
  const toggleGameFavorite = useCallback((game: GameId | ActivityId | LearnId | BoardId | ArcadeId) => {
    if (epoch !== generation.current) return;
    const next = toggleShelfFavorite(latest.current, game);
    if (next !== latest.current) commit(next);
  }, [commit, epoch]);
  const learnUpdate = useCallback(
    (game: LearnId, next: LearnSession, expected: LearnExpected) => {
      if (!ready || recovery || restoring.current) return false;
      const updated = applyLearnSave(latest.current, game, next, expected, generation.current);
      if (updated === latest.current) return false;
      return commit({ ...recordLevelRound(latest.current, updated, game), recentBoard: null });
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
    if (!commit(updated)) ownedCredits.current.delete(key);
  }, [commit, ready, recovery]);
  const practice = useCallback(
    (skill: string, correct: boolean) => {
      if (epoch !== generation.current) return;
      const updated = applyPractice(latest.current, skill, correct);
      if (updated !== latest.current) commit(updated);
    },
    [commit, epoch]
  );
  const markCoached = useCallback(
    (game: LearnId) => {
      if (epoch !== generation.current) return;
      const coached = latest.current.coached ?? [];
      if (coached.includes(game)) return;
      commit({ ...latest.current, coached: [...coached, game] });
    },
    [commit, epoch]
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
    return commit({ ...before, learning, profiles: before.profiles ? { ...before.profiles, people: { ...before.profiles.people, [learning.active]: { sessions: {}, recent: null } } } : undefined });
  }, [commit, ready, recovery]);
  const selectLearner = useCallback((id: string) => {
    if (!ready || recovery || restoring.current) return;
    const before = latest.current, learning = chooseLearner(before.learning, id);
    if (learning.active === (before.learning?.active ?? "family")) return;
    generation.current++; setEpoch(generation.current);
    commit({ ...before, learning });
  }, [commit, ready, recovery]);
  const personalize = useCallback((patch: Partial<Pick<Person, "look" | "made" | "home" | "unseen">>, expected: IdentityExpected) => {
    if (!ready || recovery || restoring.current) return false;
    const before = latest.current, next = applyPersonalization(before, patch, expected, generation.current);
    if (next === before) return false;
    return commit(next);
  }, [commit, ready, recovery]);
  const renameLearner = useCallback((id: string, name: string) => {
    if (!ready || recovery || restoring.current) return false;
    const before = latest.current, learning = before.learning ?? familyLearners(), clean = name.trim().replace(/\s+/g, " ");
    if (id === "family" || !learning.people.some(p => p.id === id) || !clean || [...clean].length > 24 || learning.people.some(p => p.id !== id && p.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) return false;
    return commit({ ...before, learning: { ...learning, people: learning.people.map(p => p.id === id ? { ...p, name: clean } : p) } });
  }, [commit, ready, recovery]);
  const removeLearner = useCallback(async (id: string) => {
    if (!ready || recovery || restoring.current) return false;
    const before = latest.current, removed = withoutLearner(before, id);
    if (removed === before) return false;
    const next = removed.library ? { ...removed, library: { ...removed.library, profiles: Object.fromEntries(Object.entries(removed.library.profiles).filter(([owner]) => owner !== id)) } } : removed;
    restoring.current = true;
    try {
      await queue.current;
      const pending = draftRecovery(id); if (pending) await storage.preserve(pending);
      await preserveAndReplace(storage, encodeSave(next), encodeSave(before));
      clearPageDrafts(id);
      generation.current++; setEpoch(generation.current);
      latest.current = next; setSave(next); setError(null); lastWriteFailed.current = false; libraryRejected.current = false; admissionRejected.current = false; return true;
    } finally { restoring.current = false; }
  }, [ready, recovery]);
  const assignEarlierWork = useCallback(async (key: string, learner: string, expectedEpoch: number) => {
    if (!ready || recovery || restoring.current || expectedEpoch !== generation.current) return false;
    const before = latest.current, next = assignEarlier(before, key, learner);
    if (next === before || !withinSaveLimit(encodeSave(next))) return false;
    // Validate the whole candidate before preserving/replacing anything.
    try { parseSave(encodeSave(next)); } catch { return false; }
    restoring.current = true;
    try {
      await queue.current;
      await preserveAndReplace(storage, encodeSave(next), encodeSave(before));
      generation.current++; setEpoch(generation.current);
      latest.current = next; setSave(next); setBadgeResult(null); setError(null); lastWriteFailed.current = false; libraryRejected.current = false; admissionRejected.current = false; return true;
    } finally { restoring.current = false; }
  }, [ready, recovery]);
  const recordWarmup = useCallback((results: PracticeResult[], config: PracticeSettings, round: string, expectedEpoch: number) => {
    if (expectedEpoch !== generation.current || !ready || recovery || restoring.current) return;
    const before = latest.current, next = applyWarmup(before, results, config, round);
    if (next !== before) commit(next);
  }, [commit, ready, recovery]);
  const settings = useCallback(
    (next: Partial<Save["settings"]>) => {
      const before = latest.current;
      if (next.practice && epoch !== generation.current) return;
      let learning = before.learning;
      if (next.practice) {
        const people = learning ?? familyLearners();
        learning = { ...people, people: people.people.map(p => p.id === people.active ? { ...p, warmup: next.practice } : p.id === "family" && !p.warmup ? { ...p, warmup: before.settings.practice ?? defaultPracticeSettings } : p) };
      }
      commit({ ...before, ...(learning ? { learning } : {}), settings: { ...before.settings, ...next } });
    },
    [commit, epoch]
  );
  const restore = useCallback(
    async (encoded: string) => {
      if (restoring.current) throw new Error("A restore is already running.");
      restoring.current = true;
      try {
        let next: Save, incoming: Save;
        try { incoming=parseSave(encoded); next = syncProfile(backfillRewards(migrateLibrary(migrateProfiles(incoming)))); assertMigratedHomes(next); parseSave(encodeSave(next)); if (!validLibraryData(next.library) || !withinSaveLimit(encodeSave(next))) throw new Error("This Library could not be migrated. Your original has been kept."); }
        catch (error) {
          // Keep both the rejected import and the current live save. Never repair imported bytes.
          await storage.preserve(encoded);
          generation.current++; setEpoch(generation.current);
          setRaw(encoded); setRecovery(error instanceof Error ? error.message : 'This backup is invalid. Your original has been kept.');
          throw error;
        }
        await queue.current;
        const pending = draftRecovery(); if (pending) await storage.preserve(pending);
        if (!incoming.profiles || !incoming.library || incoming.library.version === 1) await storage.preserve(encoded);
        await preserveImportedHome(storage, encoded, incoming, next, recovery ? null : encodeSave(latest.current));
        clearPageDrafts();
        generation.current += 1;
        setEpoch(generation.current);
        latest.current = next;
        setSave(next);
        setRaw(encodeSave(next));
        setRecovery(null);
        setError(null);
        lastWriteFailed.current = false; libraryRejected.current = false; admissionRejected.current = false;
        setReady(true);
      } finally {
        restoring.current = false;
      }
    },
    [recovery]
  );
  const startFresh = useCallback(async () => {
    await restore(JSON.stringify(migrateLibrary(emptySave(), { existingLearners: false })));
  }, [restore]);
  return (
    <Context.Provider
      value={{
        save,
        badgeResult, dismissBadge: () => setBadgeResult(null),
        personalize, renameLearner, removeLearner, saving, assignEarlier: assignEarlierWork,
        arcade,
        epoch,
        boardUpdate,
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
        libraryUpdate, libraryPatch, libraryPolicy, libraryFlush,
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
