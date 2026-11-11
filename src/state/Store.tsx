import { prepareSessionContent, sessionContentReady, retainSessionContent, captureSessionContent, contentMessage, resumeMessage, type SessionOpenResult } from './sessionContent';
import { challengeFor } from '../challenge/catalog';
import { completedSignal } from '../challenge/offers';
import { saveCatalog, progressBytes, challengeLimit, emptyChallenge, validChallengeProgress, validChallengeSession, type ChallengeProgress, type Signal, type ChallengeSession } from './challenge';
import { challengeAttempt, recoverChallengeDrafts, newSaveRevision, draftGrowth, progressFor, putProgress, selectedOwner, envelopeWrite, refusalMessage, type ChallengeRefusal, type ChallengeExpected } from './challengeDrafts';
import { addCovePerson, removeCovePerson } from './covePeople';
import { DraftQueue } from './draftQueue';
import { jsonBytes, utf8Bytes } from './saveBits';
import { assignEarlier, encodeSave, migrateProfiles, projectProfile, syncProfile } from "./profiles";
import { clearPageDrafts, draftRecovery } from "../library/drafts";
import { libraryChild, migrateLibrary, validLibraryChild, validLibraryData, validLibraryPolicy, type LibraryChildState, type LibraryPolicy } from "../library/state";
import { learnersChanged, preserveLearnerMigration, preserveImportedLearners, assertMigratedHomes } from './homeMigration';
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
import { Save, emptySave, parseSave, withinSaveLimit } from "./validation";
import { preserveAndReplace } from "./replacement";
import { encodeNotices, mergeNotices, parseNotices, setAsideUnresolved, type SetAside } from "./setAside";
import { changingWritesSettled, fencedStorage } from "./writeFence";
import { noteLaunch } from "./launchLog";
import type { StorageAdapter } from "./storage";
import { applySessionAction } from "./sessionAction";
import { recordWordRound } from "./wordRecords";
import { ActivityId, ActivitySession } from "./activities";
import { ActivityExpected, applyActivitySave } from "./activityAction";
import { topicById } from "../explore/content";
import { rememberNames } from "../games/match";
import type { LearnId, LearnSession } from "../learn/types";
import { finished as schoolFinished } from '../learn/session';
import { recordLevelRound } from "../learn/levelEvidence";
import { toggleShelfFavorite } from "../learn/home";
import { LearnExpected, applyLearnSave, applyPractice, applyOwnedPractice } from "./learnAction";
import { addLearner as appendLearner, selectLearner as chooseLearner, familyLearners } from "../learn/learners";
import { defaultPracticeSettings, type PracticeResult, type PracticeSettings } from "../practice/types";
import { AudioPreferences } from "../components/Audio";
import { recordPracticeNote } from "../practice/notes";
import { type ArcadeAction, type ArcadeExpected, type ArcadeId } from "../arcade";
import { applyArcadeAction } from "../arcade/saveAction";
type WorkingPatch = {bridge?:LearnId;signal?:Signal;choice?:ChallengeProgress['choice']};
type WorkingExpected = {owner:string;epoch:number;game:string;id:string;revision:number;kind:'school'|'challenge'};
type Store = {
  challengeWorking: (patch: WorkingPatch, expected: WorkingExpected) => boolean;
  challengeRefusal: ChallengeRefusal | null;
  backup: () => Promise<string>;
  challengeDiscard: (expected: ChallengeExpected) => Promise<boolean>;
  challengeOpen: (expected: ChallengeExpected) => Promise<SessionOpenResult>;
  challengeSave: (session: ChallengeSession, expected: ChallengeExpected) => Promise<boolean>;
  covePerson: (action: { type:'add'; name:string; id:string } | { type:'remove'; id:string } | { type:'select'; id:string|null }, expectedEpoch:number) => Promise<boolean>;
  badgeResult: { owner: string; epoch: number; badges: BadgeId[]; source: string } | null;
  dismissBadge: () => void;
  personalize: (patch: Partial<Pick<Person, "look" | "made" | "home" | "unseen">>, expected: IdentityExpected) => boolean;
  renameLearner: (id: string, name: string) => boolean;
  removeLearner: (id: string) => Promise<boolean>;
  saving: boolean;
  assignEarlier: (key: string, learner: string | null, expectedEpoch: number) => Promise<boolean>;
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
  /** Paused puzzles and marks this build couldn't open at launch. The preserved original still holds them. */
  setAside: SetAside[];
  dismissSetAside: (owner: string) => void;
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
/** Far beyond a slow device's real launch; only a stuck read or write gets here. */
export const BOOT_TIMEOUT_MS = 15_000;
export const bootTimeoutMessage = "Your island is taking too long to open. Your saved work is kept. Try opening again.";
/** How long a backup waits for queued writes before exporting the accepted state anyway. */
export const BACKUP_FLUSH_MS = 4_000;
export const noticesReadMessage = "Your island couldn’t finish opening. Your saved work is kept. Try opening again.";
// The Store is mounted above the UI error boundary, so nothing remounts it while the app runs. If it fails,
// the root boundary shows a restart screen and no Store replaces it: its accepted writes still drain. Only a
// Store mounted after it (a test, or a fast refresh) takes over, and then the old one starts no more writes.
let liveStore = 0;
/** The notices row, read twice before giving up. A failed read is an error, never an empty row. */
async function readNotices(store: StorageAdapter) {
  if (!store.readNotices) return null;
  try { return await store.readNotices(); }
  catch {
    try { return await store.readNotices(); }
    catch (error) { noteLaunch('notices', error); throw new Error(noticesReadMessage); }
  }
}
const ownersOf = (save: Save) => [...Object.keys(save.profiles?.people ?? {}), ...Object.keys(save.cove?.people ?? {})];
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState(emptySave),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null),
    [recovery, setRecovery] = useState<string | null>(null),
    [raw, setRaw] = useState<string | null>(null),
    [setAside, setSetAside] = useState<SetAside[]>([]);
  const settled = useRef(false);
  const [badgeResult, setBadgeResult] = useState<Store["badgeResult"]>(null);
  const [challengeRefusal, setChallengeRefusal] = useState<ChallengeRefusal | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingWrites = useRef(0);
  const writeFailures = useRef(0), lastWriteFailed = useRef(false), libraryRejected = useRef(false), admissionRejected = useRef(false);
  // Draft rows are per game. A draft that saved for one game says nothing about another game's failed one.
  const failedDrafts = useRef(new Set<string>());
  const unsaved = () => lastWriteFailed.current || failedDrafts.current.size > 0;
  /** A full envelope reached storage. It holds every accepted move, so earlier draft failures are covered. */
  const envelopeSaved = () => { lastWriteFailed.current = false; failedDrafts.current.clear(); };
  /** The error line clears only when nothing is outstanding. A refused admission or Library write stays. */
  const allSaved = () => !lastWriteFailed.current && failedDrafts.current.size === 0 && !libraryRejected.current && !admissionRejected.current;
  const [epoch, setEpoch] = useState(0);
  const audioPreferences = useMemo(() => ({ ...save.settings, epoch }), [save.settings, epoch]);
  const generation = useRef(0);
  const challengeTerminal = useRef<{epoch:number;session:ChallengeSession}|null>(null);
  const boundaryRefused = useRef(false);
  const admittedBytes = useRef(0);
  const latest = useRef(save),
    queue = useRef(Promise.resolve()),
    mounted = useRef(true),
    uncertainWrite = useRef(false),
    restoring = useRef(false);
  // Every write this Store makes, refused once a newer Store has mounted. Ones already running finish.
  const owner = useRef(0);
  // When this Store first hydrated. Set once; an effect replay never hydrates again.
  const bootStarted = useRef<number | null>(null);
  // eslint-disable-next-line react-hooks/refs -- The check runs at write time, never during render.
  const [disk] = useState(() => fencedStorage(() => owner.current !== 0 && owner.current === liveStore));
  // Each load is one attempt. A retry, restore or newer load supersedes it, and its writes are refused.
  const loadAttempt = useRef(0);
  const notices = useRef<SetAside[]>([]);
  const admitEnvelope = useCallback((encoded: string) => {
    let message: string;
    if (!withinSaveLimit(encoded)) message = 'This change exceeds the save limit. Your saved work is kept. Export it before managing paused games or people.';
    else {
      try { parseSave(encoded); return true; }
      catch { message = 'This change contains invalid saved game data. Your saved work is kept. Please try again.'; }
    }
    admissionRejected.current = true; writeFailures.current++; setError(message); return false;
  }, []);
  const persist = useCallback((next: Save, prepared = false) => {
    if (restoring.current || uncertainWrite.current) return queue.current;
    const durable = prepared ? next : { ...next, saveRevision:newSaveRevision() };
    const encoded = encodeSave(durable);
    // Prepared commits already passed whole-envelope admission before publication.
    if (!prepared && !admitEnvelope(encoded)) return queue.current;
    admittedBytes.current = utf8Bytes(encoded);
    latest.current = durable; retainSessionContent(syncProfile(durable),saveCatalog); setSave(durable);
    pendingWrites.current++; setSaving(true);
    queue.current = queue.current
      .catch(() => {})
      .then(() => disk.set(encoded,envelopeWrite(durable)))
      .then(() => {
        envelopeSaved(); if (mounted.current && allSaved()) setError(null);
      })
      .catch(() => {
        writeFailures.current++; lastWriteFailed.current = true;
        if (mounted.current) setError("Your latest changes could not be saved. Keep the app open and try again.");
      }).finally(() => { pendingWrites.current--; if (mounted.current && pendingWrites.current === 0) setSaving(false); });
    return queue.current;
  }, [admitEnvelope, disk]);
  const [draftWriter] = useState(() => new DraftQueue());
  const writeDraft = useCallback((key:string,raw:string) => draftWriter.enqueue(key,raw,{schedule:work => {
    pendingWrites.current++; setSaving(true);
    queue.current = queue.current.catch(() => {}).then(work).finally(() => {
      pendingWrites.current--; if (mounted.current && pendingWrites.current === 0) setSaving(false);
    });
  }, write:async raw => {
    if (!disk.writeDraft) throw new Error('Draft storage unavailable.');
    await disk.writeDraft(raw);
  }, saved:() => {
    // The newest draft for this game holds all of its moves; other games keep their own status.
    failedDrafts.current.delete(key);
    if (mounted.current && allSaved()) setError(null);
  }, failed:() => {
    writeFailures.current++; failedDrafts.current.add(key);
    if (mounted.current) setError('Your latest moves could not be saved. Keep the app open and try again, or export a backup of the accepted moves.');
  }}),[draftWriter,disk]);
  const refuseChallenge = useCallback((reason: ChallengeRefusal) => {
    setChallengeRefusal(reason); setError(refusalMessage[reason]); return false;
  }, []);
  const load = useCallback(async () => {
    let encoded:string|null=null;
    const attempt=++loadAttempt.current, startGeneration=generation.current;
    const current=()=>mounted.current && loadAttempt.current===attempt;
    // A timed-out load keeps running, but once anything newer starts it can no longer write.
    const store=fencedStorage(current);
    const live=()=>current() && generation.current===startGeneration && !restoring.current;
    const publish=(next:Save,kept:SetAside[])=>{
      generation.current += 1;
      setEpoch(generation.current);
      admittedBytes.current = utf8Bytes(encodeSave(next));
      latest.current = next;
      retainSessionContent(syncProfile(next),saveCatalog); setSave(next);
      setRecovery(null); uncertainWrite.current = false;
      setError(null);
      envelopeSaved(); libraryRejected.current = false; admissionRejected.current = false;
      notices.current = kept; setSetAside(kept);
      settled.current = true;
      setReady(true);
    };
    try {
      // Writes an earlier load or Store already started land before this one reads.
      await changingWritesSettled();
      if(!live())return;
      encoded = await store.get();
      if(!live())return;
      setRaw(encoded);
      // Content this build can't resolve is set aside from a copy; the original bytes are preserved below.
      const aside=encoded?setAsideUnresolved(encoded,saveCatalog):{raw:null,setAside:[]};
      const before=aside.raw?parseSave(aside.raw):emptySave();
      const stored = encoded ? await readNotices(store) : null;
      if(!live())return;
      const recovered = await recoverChallengeDrafts(migrateProfiles(before),store,saveCatalog,{live});
      let next=syncProfile(backfillRewards(migrateLibrary(recovered, { existingLearners: encoded !== null })));
      // Cove identity is temporary. Keep all people and boards, but launch as the learner.
      if (next.cove?.active) next = { ...next, cove: { ...next.cove, active: null } };
      const replacementNeeded = !!encoded && (aside.setAside.length > 0 || before.version !== 3 || !before.library || before.library.version === 1 || learnersChanged(before,next));
      if (replacementNeeded) next = { ...next, saveRevision:newSaveRevision() };
      if (!validLibraryData(next.library)) throw new Error("This Library could not be opened. Your original is kept. Export it or restore a previous backup.");
      if (!withinSaveLimit(encodeSave(next))) throw new Error("This save needs more room to upgrade. Your original is kept. Export it and open it in the previous build to manage saved work, or restore a smaller backup.");
      parseSave(encodeSave(next));
      assertMigratedHomes(next);
      // Notices not yet put away stay until their person taps OK, across launches.
      const kept = mergeNotices(parseNotices(stored, ownersOf(next)), aside.setAside);
      if(encoded) {
        if (replacementNeeded) {
          await preserveAndReplace(store, encodeSave(next), encoded,{...envelopeWrite(next),...(aside.setAside.length?{notices:encodeNotices(kept)}:{})});
        } else await preserveLearnerMigration(store,encoded,before,next);
      }
      if(!live())return;
      if (aside.setAside.length) noteLaunch('set-aside', `${aside.setAside.map(a => `${a.owner}: ${a.games.join(',') || 'no rounds'}, ${a.marks} marks rows`).join('; ')}`);
      publish(next,kept);
    } catch (e) {
      if(!live())return;
      noteLaunch('load', e);
      if(encoded)try{
        const newest = (await store.listRecovery?.())?.[0];
        if (!newest || await store.readRecovery?.(newest.key) !== encoded) await store.preserve(encoded);
      }catch{/* Original remains in active storage; do not publish or replace it. */}
      if(!live())return;
      setRecovery(e instanceof Error ? e.message : "Saved games could not be opened. Please retry.");
      settled.current = true;
      setReady(true);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    // A fast refresh (or a development double effect) reruns this on the same Store, with its refs and
    // state kept. Only the first run takes ownership and hydrates. A replay keeps the accepted snapshot,
    // its queue and ownership, and lets a load already running finish. Recovery reloads through retry.
    if (bootStarted.current === null) {
      bootStarted.current = Date.now(); owner.current = ++liveStore;
      // Hydrates asynchronously from external device storage.
      void load();
    }
    // A load that never settles must not leave a blank or waiting screen. The load keeps running and
    // still publishes if it finishes; until then nothing is writable, so nothing can overwrite the save.
    const guard = settled.current ? undefined : setTimeout(() => {
      if (settled.current || !mounted.current) return;
      noteLaunch('timeout', `Saved games did not open within ${BOOT_TIMEOUT_MS / 1000} seconds.`);
      settled.current = true; setRecovery(bootTimeoutMessage); setReady(true);
    }, Math.max(0, BOOT_TIMEOUT_MS - (Date.now() - bootStarted.current!)));
    return () => {
      mounted.current = false;
      clearTimeout(guard);
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
      if (restoring.current) {
        boundaryRefused.current = true;
        setError('Saved games are still being updated. Please try this change again when saving finishes.');
        return false;
      }
      if (!ready || recovery || uncertainWrite.current) return false;
      next = { ...next, saveRevision:newSaveRevision() };
      const previous = latest.current;
      // Identity changes select another complete profile view; they aren't game transitions.
      if ((previous.learning?.active ?? 'family') !== (next.learning?.active ?? 'family')) {
        const kept = syncProfile(previous);
        next = syncProfile(projectProfile({ ...next, profiles: kept.profiles ? { ...kept.profiles, people: { ...next.profiles?.people, ...kept.profiles.people } } : next.profiles }, next.learning));
        if (!admitEnvelope(encodeSave(next))) return false;
        admissionRejected.current = false; latest.current = next; retainSessionContent(syncProfile(next),saveCatalog); setSave(next); setBadgeResult(null); void persist(next,true); return true;
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
      if(!withinSaveLimit(encodeSave(next)) && Object.entries(next.learn??{}).some(([game,round])=>{
        const old=before.learn?.[game as LearnId];return old&&round&&old.id===round.id&&!schoolFinished(old)&&schoolFinished(round);
      })){
        const prior=progressFor(before,owner), progress=progressFor(next,owner);
        if(prior&&progress)next=putProgress(next,owner,{...progress,signals:prior.signals,practice:prior.practice});
      }
      if (!admitEnvelope(encodeSave(next))) return false;
      admissionRejected.current = false;
      if (newBadges.length && source) setBadgeResult({ owner, epoch: generation.current, badges: newBadges, source });
      latest.current = next;
      retainSessionContent(syncProfile(next),saveCatalog); setSave(next);
      void persist(next,true);
      return true;
    },
    [persist, ready, recovery, admitEnvelope]
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
      if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
      if (next.id !== expected.id && Object.entries(latest.current.profiles?.people ?? {}).some(([id,p]) => id !== (latest.current.learning?.active ?? 'family') && p.activities?.[game]?.id === next.id)) return false;
      const updated = applyActivitySave(latest.current, game, next, expected, generation.current);
      if (updated === latest.current) return false;
      return commit({ ...updated, recentBoard: null });
    },
    [commit, ready, recovery]
  );
  const boardUpdate = useCallback((game: BoardId, next: BoardSession, expected: BoardSession | undefined, expectedEpoch: number) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
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
      libraryRejected.current = false; if (!unsaved()) setError(null); return true;
    }
    const library = { ...data, profiles: { ...data.profiles, [owner]: JSON.parse(JSON.stringify(next)) as LibraryChildState } };
    // Reading and scrolling don't count as newer work; only a child's own content ends the old-model fill.
    const untouched = before.profiles?.unassigned.exploreUntouched, ownWork = (['saved', 'labs', 'creations', 'bookPages', 'layers'] as const).some(field => JSON.stringify(current[field]) !== JSON.stringify(next[field]));
    let updated: Save = { ...before, library, ...(ownWork && untouched?.includes(owner) ? { profiles: { ...before.profiles!, unassigned: { ...before.profiles!.unassigned, exploreUntouched: untouched.filter(id => id !== owner) } } } : {}) };
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
      libraryRejected.current = false; if (!unsaved()) setError(null); return;
    }
    const library = { ...data, profiles: { ...data.profiles, [childId]: next } };
    const updated = { ...before, library };
    if (!validLibraryData(library) || !withinSaveLimit(encodeSave(updated))) { rejectLibraryWrite(); return; }
    libraryRejected.current = false;
    commit(updated);
  }, [commit, ready, recovery, rejectLibraryWrite]);
  const libraryFlush = useCallback(async () => {
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
    const failures = writeFailures.current, startEpoch = generation.current;
    // Drain write-behind before deciding whether a fold is needed.
    let pending: Promise<void>;
    do { pending = queue.current; await pending; } while (pending !== queue.current);
    if (await disk.readDrafts?.().then(rows => rows.length > 0)) await persist(latest.current);
    // Include writes appended while the previous tail is settling.
    let tail: Promise<void>;
    do { tail = queue.current; await tail; } while (tail !== queue.current);
    return mounted.current && !restoring.current && startEpoch === generation.current &&
      writeFailures.current === failures && !unsaved() && !libraryRejected.current && !admissionRejected.current;
  }, [ready, recovery, persist, disk]);
  const backup = useCallback(async () => {
    // Flush health is a Library gate, never a gate on recovering accepted work.
    // A write that never finishes mustn't hold the backup: past the wait, export what was accepted.
    let clean = false, timer: ReturnType<typeof setTimeout> | undefined;
    const waited = new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), BACKUP_FLUSH_MS); });
    try { clean = await Promise.race([libraryFlush(), waited]); } catch { /* Encoding the coherent accepted state still works. */ }
    finally { clearTimeout(timer); }
    const encoded = encodeSave(latest.current); parseSave(encoded);
    if (!clean) setError('This backup contains the latest accepted work. Some changes could not be saved on this device.');
    return encoded;
  },[libraryFlush]);
  // Arcade uses the same commit/recovery queue, with explicit learner/restore ownership.
  const arcade = useCallback((action: ArcadeAction, expected: ArcadeExpected) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
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
      if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
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
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
    const before = latest.current;
    const learning = appendLearner(before.learning, name, `learner-${Date.now().toString(36)}`);
    if (learning === before.learning || learning.people.length === (before.learning?.people.length ?? 1)) return false;
    generation.current++; setEpoch(generation.current);
    return commit({ ...before, learning, profiles: before.profiles ? { ...before.profiles, people: { ...before.profiles.people, [learning.active]: { sessions: {}, recent: null, challenge:emptyChallenge() } } } : undefined });
  }, [commit, ready, recovery]);
  const selectLearner = useCallback((id: string) => {
    if (!ready || recovery || restoring.current) return;
    const before = latest.current, learning = chooseLearner(before.learning, id);
    if (learning.active === (before.learning?.active ?? "family") && !before.cove?.active) return;
    generation.current++; setEpoch(generation.current);
    commit({ ...before, learning, ...(before.cove ? { cove:{ ...before.cove, active:null } } : {}) });
  }, [commit, ready, recovery]);
  const personalize = useCallback((patch: Partial<Pick<Person, "look" | "made" | "home" | "unseen">>, expected: IdentityExpected) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
    const before = latest.current, next = applyPersonalization(before, patch, expected, generation.current);
    if (next === before) return false;
    return commit(next);
  }, [commit, ready, recovery]);
  const renameLearner = useCallback((id: string, name: string) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
    const before = latest.current, learning = before.learning ?? familyLearners(), clean = name.trim().replace(/\s+/g, " ");
    if (id === "family" || !learning.people.some(p => p.id === id) || !clean || [...clean].length > 24 || learning.people.some(p => p.id !== id && p.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) return false;
    return commit({ ...before, learning: { ...learning, people: learning.people.map(p => p.id === id ? { ...p, name: clean } : p) } });
  }, [commit, ready, recovery]);
  const removeLearner = useCallback(async (id: string) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current) return false;
    const before = latest.current, removed = withoutLearner(before, id);
    if (removed === before) return false;
    const next = removed.library ? { ...removed, library: { ...removed.library, profiles: Object.fromEntries(Object.entries(removed.library.profiles).filter(([owner]) => owner !== id)) } } : removed;
    // Reject a malformed candidate before preserving drafts or replacing the family save.
    try { parseSave(encodeSave(next)); } catch { return false; }
    restoring.current = true;
    try {
      await queue.current;
      const pending = draftRecovery(id); if (pending) await disk.preserve(pending);
      await preserveAndReplace(disk, encodeSave(next), encodeSave(before),envelopeWrite(next));
      clearPageDrafts(id);
      generation.current++; setEpoch(generation.current);
      admittedBytes.current = utf8Bytes(encodeSave(next)); latest.current = next; retainSessionContent(syncProfile(next),saveCatalog); setSave(next); setError(null); envelopeSaved(); libraryRejected.current = false; admissionRejected.current = false; return true;
    } finally { restoring.current = false; }
  }, [ready, recovery, disk]);
  const assignEarlierWork = useCallback(async (key: string, learner: string | null, expectedEpoch: number) => {
    if (!ready || recovery || restoring.current || expectedEpoch !== generation.current) return false;
    const before = latest.current, next = assignEarlier(before, key, learner);
    if (next === before || !withinSaveLimit(encodeSave(next))) return false;
    // Validate the whole candidate before preserving/replacing anything.
    try { parseSave(encodeSave(next)); } catch { return false; }
    restoring.current = true;
    try {
      await queue.current;
      await preserveAndReplace(disk, encodeSave(next), encodeSave(before),envelopeWrite(next));
      generation.current++; setEpoch(generation.current);
      admittedBytes.current = utf8Bytes(encodeSave(next)); latest.current = next; retainSessionContent(syncProfile(next),saveCatalog); setSave(next); setBadgeResult(null); setError(null); envelopeSaved(); libraryRejected.current = false; admissionRejected.current = false; return true;
    } finally { restoring.current = false; }
  }, [ready, recovery, disk]);
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
      // A load still running (one that timed out) can't write after this, and any write it began lands first.
      loadAttempt.current++;
      try {
        await changingWritesSettled();
        let next: Save, incoming: Save;
        try { incoming=parseSave(encoded); next = { ...syncProfile(backfillRewards(migrateLibrary(migrateProfiles(incoming)))), saveRevision:newSaveRevision() }; if (next.cove?.active) next = { ...next, cove: { ...next.cove, active: null } }; assertMigratedHomes(next); parseSave(encodeSave(next)); if (!validLibraryData(next.library)) throw new Error("This Library could not be opened. Your original is kept. Export it or restore a previous backup.");
      if (!withinSaveLimit(encodeSave(next))) throw new Error("This save needs more room to upgrade. Your original is kept. Export it and open it in the previous build to manage saved work, or restore a smaller backup."); }
        catch (error) {
          // Keep both the rejected import and the current live save. Never repair imported bytes.
          const newest=(await disk.listRecovery?.())?.[0];
          if(!newest || await disk.readRecovery?.(newest.key)!==encoded)await disk.preserve(encoded);
          generation.current++; setEpoch(generation.current);
          setRaw(encoded); setRecovery(error instanceof Error ? error.message : 'This backup is invalid. Your original has been kept.');
          throw error;
        }
        await queue.current;
        const pending = draftRecovery(); if (pending) await disk.preserve(pending);
        // Notices described the save being replaced, so they're cleared in the same write, or not at all.
        await preserveImportedLearners(disk, encoded, incoming, next, recovery && !uncertainWrite.current ? null : encodeSave(latest.current), incoming.version !== 3 || !incoming.profiles || !incoming.library || incoming.library.version === 1, { notices: null });
        clearPageDrafts();
        generation.current += 1;
        setEpoch(generation.current);
        admittedBytes.current = utf8Bytes(encodeSave(next));
        latest.current = next;
        retainSessionContent(syncProfile(next),saveCatalog); setSave(next);
        setRaw(encodeSave(next));
        notices.current = []; setSetAside([]);
        setRecovery(null); uncertainWrite.current = false;
        setError(null);
        envelopeSaved(); libraryRejected.current = false; admissionRejected.current = false;
        setReady(true);
      } finally {
        restoring.current = false;
      }
    },
    [recovery, disk]
  );
  const challengeWorking = useCallback((patch: WorkingPatch, expected:WorkingExpected) => {
    const before=latest.current, progress=progressFor(before,expected.owner);
    if(expected.epoch!==generation.current || (expected.kind==='school'?(before.learning?.active??'family'):selectedOwner(before))!==expected.owner || !progress)return false;
    const round=expected.kind==='challenge'?(progress.paused.find(s=>s.game===expected.game)??(challengeTerminal.current?.epoch===expected.epoch&&challengeTerminal.current.session.game===expected.game?challengeTerminal.current.session:undefined)):before.learn?.[expected.game as LearnId];
    if(!round || round.id!==expected.id || round.revision!==expected.revision || ('owner' in round?round.owner:round.learner??'family')!==expected.owner)return false;
    const signals=patch.signal?[...progress.signals.filter(s=>s[0]!==patch.signal![0]),patch.signal].slice(-(expected.owner.startsWith('cove-')?8:32)):progress.signals;
    const next={...progress,signals,choice:patch.choice===undefined?progress.choice:patch.choice};
    if(!validChallengeProgress(next,expected.owner,undefined,expected.owner.startsWith('cove-')))return false;
    let candidate=putProgress(before,expected.owner,next);
    if(patch.bridge){
      if(expected.kind!=='school'||patch.bridge!==expected.game||!('options' in round)||round.options.mode!=='solo')return false;
      candidate={...candidate,settings:{...candidate.settings,learningBridges:{...candidate.settings.learningBridges,[expected.owner]:[...new Set([...(candidate.settings.learningBridges?.[expected.owner]??[]),patch.bridge])]}}};
    }
    return commit(candidate);
  },[commit]);
  const challengeOpen = useCallback(async (expected:ChallengeExpected):Promise<SessionOpenResult> => {
    const before=latest.current, session=progressFor(before,expected.owner)?.paused.find(s=>s.game===expected.game);
    const live=()=>mounted.current && ready && !recovery && !restoring.current && expected.epoch===generation.current && latest.current===before && selectedOwner(before)===expected.owner;
    const stale:SessionOpenResult={ok:false,kind:'stale',message:refusalMessage.stale};
    if(!live() || !session || session.id!==expected.id || session.revision!==expected.revision)return stale;
    try {
      await prepareSessionContent(session,saveCatalog,{live});
      if(!live())return stale;
      if(!validChallengeSession(session,expected.owner,saveCatalog,expected.owner.startsWith('cove-')))return {ok:false,kind:'invalid-session',message:resumeMessage};
      retainSessionContent(syncProfile(before),saveCatalog);
      return {ok:true};
    } catch(error) {
      if(!live())return stale;
      console.warn('Paused puzzle could not open',error);
      return {ok:false,kind:'content-unavailable',message:contentMessage};
    }
  },[ready,recovery]);
  const challengeSave = useCallback(async (session: ChallengeSession, expected: ChallengeExpected) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current || expected.epoch !== generation.current) return refuseChallenge('stale');
    try { session = JSON.parse(JSON.stringify(session)) as ChallengeSession; }
    catch { return refuseChallenge('stale'); }
    if (jsonBytes(session) > 4096) return refuseChallenge('session-budget');
    const before = latest.current, progress = progressFor(before,session.owner);
    const old = progress?.paused.find(s => s.game === session.game);
    if (old&&old.id===session.id&&!session.result&&progress && progressBytes(progress) + (old ? draftGrowth(old,session) : jsonBytes(session)+1) > challengeLimit(session.owner.startsWith('cove-'))) return refuseChallenge('learner-ceiling');
    try { if(!sessionContentReady(session,saveCatalog))await prepareSessionContent(session,saveCatalog,{live:()=>mounted.current && !restoring.current && expected.epoch===generation.current && latest.current===before}); }
    catch(error){if(latest.current!==before || restoring.current || expected.epoch!==generation.current)return refuseChallenge('stale');console.warn('Puzzle content could not load',error);setError(contentMessage);return false;}
    if(latest.current!==before || restoring.current || expected.epoch!==generation.current)return refuseChallenge('stale');
    const attempt = challengeAttempt(before,session,expected,generation.current);
    let next = attempt.save;
    if (session.result && next!==before) {
      const entry=challengeFor(session.game), nextProgress=progressFor(next,session.owner), previousPuzzle=progress?.recent.at(-1);
      const differentPuzzle=!previousPuzzle || previousPuzzle[0]!==session.puzzle.bank || previousPuzzle[1]!==session.puzzle.puzzle;
      if(entry&&nextProgress){
        const optional=completedSignal(nextProgress,entry.contextFor(session.puzzle),session.result.event==='independent',session.owner!=='family'&&session.partner===null,session.owner.startsWith('cove-'),differentPuzzle);
        const candidate=putProgress(next,session.owner,optional);
        if(progressBytes(optional)<=challengeLimit(session.owner.startsWith('cove-'))&&withinSaveLimit(encodeSave(candidate)))next=candidate;
      }
    }
    if (attempt.refusal) return refuseChallenge(attempt.refusal);
    if (old && old.id===session.id && session.result === null) {
      const bytes = admittedBytes.current + draftGrowth(old,session);
      if (bytes > 2_000_000) return refuseChallenge('full-save');
      // Accept before the first await. Later moves and ordinary commits see this revision immediately.
      admittedBytes.current = bytes; latest.current = next; retainSessionContent(syncProfile(next),saveCatalog); setSave(next); setChallengeRefusal(null); if (!unsaved()) setError(null);
      return writeDraft(JSON.stringify([before.saveRevision,session.owner,session.game]),JSON.stringify({version:1,base:before.saveRevision,session}));
    }
    // Hold exact proofs locally across the write; transient cache pressure cannot undo a commit.
    const publishContent=captureSessionContent(syncProfile(next),saveCatalog);
    boundaryRefused.current = false; restoring.current = true;
    try {
      await queue.current;
      next = { ...next, saveRevision:newSaveRevision() };
      const encoded = encodeSave(next);
      if (!withinSaveLimit(encoded)) return refuseChallenge('full-save');
      parseSave(encoded);
      const folded=progress?.paused.filter(s=>!progressFor(next,session.owner)?.paused.some(p=>p.id===s.id))??[];
      if(expected.replace){
        const removed=folded.find(s=>s.game===expected.replace!.game);
        if(!removed||!disk.discardSession)throw new Error('Replacement preservation unavailable.');
        await disk.discardSession(JSON.stringify(removed));
      }
      const metadata=envelopeWrite(next);
      try { await disk.set(encoded,{...metadata,folded:[...metadata.folded,...folded,...(session.result?[session]:[])]}); }
      catch (error) {
        // A committed write can lose its acknowledgement. Reconcile before allowing another persist.
        let head: string | null;
        try { head = await disk.get(); }
        catch { uncertainWrite.current = true; setRaw(encodeSave(latest.current)); setRecovery('The saved state could not be confirmed. Keep the app open and export before retrying.'); throw error; }
        if (head !== encoded) throw error;
      }
      admittedBytes.current = utf8Bytes(encoded); envelopeSaved();
      latest.current = next; if(session.result)challengeTerminal.current={epoch:generation.current,session}; publishContent(); setSave(next); setChallengeRefusal(null); if (!boundaryRefused.current && allSaved()) setError(null); return true;
    } catch {
      setError('This change could not be saved. Your saved work is kept. Keep the app open and try again, or export a backup.'); return false;
    } finally { restoring.current = false; }
  },[ready,recovery,writeDraft,refuseChallenge,disk]);
  const challengeDiscard = useCallback(async (expected: ChallengeExpected) => {
    if (!ready || recovery || restoring.current || uncertainWrite.current || expected.epoch !== generation.current) return false;
    restoring.current = true;
    try {
      await queue.current;
      const before = latest.current, progress = progressFor(before,expected.owner), slot = progress?.paused.find(s => s.game === expected.game);
      if (selectedOwner(before) !== expected.owner || !slot || slot.id !== expected.id || slot.revision !== expected.revision) return false;
      let next = putProgress(before,expected.owner,{ ...progress!, paused:progress!.paused.filter(s => s.game !== expected.game) });
      next = { ...next, saveRevision:newSaveRevision() };
      const encoded = encodeSave(next); parseSave(encoded);
      if (!disk.discardSession) throw new Error('Discard recovery storage is unavailable.');
      await disk.discardSession(JSON.stringify(slot));
      const meta = envelopeWrite(next);
      await disk.set(encoded,{ ...meta, folded:[...meta.folded,slot] });
      // The envelope holds every accepted move, so draft debt it folded is paid.
      admittedBytes.current = utf8Bytes(encoded); envelopeSaved(); if (mounted.current && allSaved()) setError(null); generation.current++; setEpoch(generation.current);
      latest.current = next; retainSessionContent(syncProfile(next),saveCatalog); setSave(next); return true;
    } catch {
      setError('This paused game could not be removed. Your saved work is kept. Please try again.'); return false;
    } finally { restoring.current = false; }
  },[ready,recovery,disk]);
  const covePerson = useCallback(async (action: Parameters<Store['covePerson']>[0], expectedEpoch:number) => {
    // A blur cleanup waits for the current boundary, then rechecks its captured epoch.
    if (action.type === 'select' && action.id === null) while (restoring.current && mounted.current && expectedEpoch === generation.current) await new Promise(resolve => setTimeout(resolve, 25));
    if (!ready || recovery || restoring.current || expectedEpoch !== generation.current) return false;
    restoring.current = true;
    try {
      await queue.current;
      const before = latest.current;
      let next = action.type === 'add' ? addCovePerson(before,action.name,action.id) : action.type === 'remove' ? removeCovePerson(before,action.id) : before.cove && (action.id === null || Object.hasOwn(before.cove.people,action.id)) ? { ...before, cove:{ ...before.cove, active:action.id } } : before;
      if (next === before) return false;
      next = { ...next, saveRevision:newSaveRevision() };
      const encoded = encodeSave(next); parseSave(encoded);
      if (action.type === 'remove') await preserveAndReplace(disk,encoded,encodeSave(before),envelopeWrite(next));
      else await disk.set(encoded,envelopeWrite(next));
      admittedBytes.current = utf8Bytes(encoded); envelopeSaved(); if (mounted.current && allSaved()) setError(null);
      generation.current++; setEpoch(generation.current);
      latest.current = next; retainSessionContent(syncProfile(next),saveCatalog); setSave(next); setBadgeResult(null); return true;
    } catch {
      setError('This person could not be updated. Your saved work is kept. Please try again.'); return false;
    } finally { restoring.current = false; }
  },[ready,recovery,disk]);
  const dismissSetAside = useCallback((owner: string) => {
    const next = notices.current.filter(a => a.owner !== owner);
    if (next.length === notices.current.length) return;
    notices.current = next; setSetAside(next);
    const raw = encodeNotices(next);
    // On the write queue, so it can't cross a save that rewrites the notices row.
    queue.current = queue.current.catch(() => {}).then(() => disk.writeNotices?.(raw)).catch(() => { /* It shows again next launch; better than lost. */ });
  }, [disk]);
  const startFresh = useCallback(async () => {
    await restore(JSON.stringify(migrateLibrary(emptySave(), { existingLearners: false })));
  }, [restore]);
  return (
    <Context.Provider
      value={{
        save, setAside, dismissSetAside, backup, challengeWorking, challengeRefusal, challengeOpen, challengeSave, challengeDiscard, covePerson,
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
