import { apply, type DropProposal } from "./scene/proposal";
import { carryPanSeats } from "./scene/pan";
import { useMemo, useRef, useState } from "react";
import {
  homeReducer,
  starterHome,
  migrateHome,
  type HomeAccess,
  type HomeResult,
  type HomeAction,
  type HomeStateV2,
  type Ownership,
} from "./model";
import { boundedUndo, HOME_UNDO_STEPS, undoAdmits, undoEntry, undoFits, undoPast, undoStep, type UndoEntry } from "./undoHistory";
export type History = { present: HomeStateV2; past: HomeStateV2[]; future: HomeStateV2[] };
/** History states are immutable and reused, so each adjacent pair is diffed once. */
const stepCache = new WeakMap<HomeStateV2, WeakMap<HomeStateV2, UndoEntry>>();
function cachedEntry(before: HomeStateV2, after: HomeStateV2): UndoEntry {
  let inner = stepCache.get(before);
  if (!inner) stepCache.set(before, (inner = new WeakMap()));
  let entry = inner.get(after);
  if (!entry) inner.set(after, (entry = undoEntry(undoStep(before, after), after)));
  return entry;
}
const bare = (state: HomeStateV2): HomeStateV2 => ({ version: state.version, ...(state.rosterVersion ? { rosterVersion: state.rosterVersion } : {}), current: state.current, rooms: state.rooms });
function savedEntries(history: History): UndoEntry[] {
  const states = [...history.past.slice(-HOME_UNDO_STEPS), history.present];
  return states
    .slice(1)
    .map((after, i) => cachedEntry(states[i], after))
    .filter((entry) => Object.keys(entry.step).length);
}
/** HM-18: what the save holds. The present plus the last 20 undo steps, bounded in bytes. */
export function savedHistory(history: History, access?: HomeAccess): HomeStateV2 {
  const undo = history.present.version === 4 ? boundedUndo(savedEntries(history)) : undefined;
  return { ...bare(history.present), ...(access ? { access } : {}), ...(undo ? { undo } : {}) };
}
/** R1: an edit is kept only if the saved undo can still bring back everything it promised. */
export const historyAdmits = (history: History) => history.present.version !== 4 || undoAdmits(savedEntries(history));
export const UNDO_FULL_MESSAGE = "That's too much to change at once. Undo couldn't bring it all back.";
/** F3: what Design → Restore room costs Undo. */
export type RestoreCost = "undoable" | "no-undo" | "drops-older";
export const RESTORE_QUESTION: Record<Exclude<RestoreCost, "undoable">, string> = {
  "no-undo": "This is a big change. You can't undo it. Make the room new again?",
  "drops-older": "This is a big change. Undo will forget your older changes. Make the room new again?",
};
export const RESTORE_NOTE: Record<Exclude<RestoreCost, "undoable">, string> = {
  "no-undo": "Back to the start! Undo can't bring the old room back.",
  "drops-older": "Back to the start! Your oldest undo steps are gone.",
};
/** R3-F1: the first write after loading a history an older build kept under its larger budget. */
export const UNDO_TRIMMED_NOTE = "Your oldest undo steps are gone.";
/** Messages that the Home screen shows as a visible note, not only to a screen reader. */
export const UNDO_NOTES: readonly string[] = [UNDO_FULL_MESSAGE, ...Object.values(RESTORE_NOTE), UNDO_TRIMMED_NOTE];
/** F3: the newest steps whose promises still hold. The oldest go first, an older removal with them. */
export function trimmedHistory(history: History): History {
  let past = history.past;
  while (past.length && !historyAdmits({ ...history, past })) past = past.slice(1);
  return past === history.past ? history : { ...history, past };
}
/**
 * R3-F1: a loaded history fitted to today's write budget. The oldest steps go until the rest is
 * saved whole and keeps every promise, so an ordinary edit is never refused because of what an
 * older build kept. Returns `history` itself when it already fits. Never mutates its input.
 */
export function fittedHistory(history: History): History {
  const fits = (h: History) => h.present.version !== 4 || (historyAdmits(h) && undoFits(savedEntries(h)));
  let past = history.past;
  while (past.length && !fits({ ...history, past })) past = past.slice(1);
  return past === history.past ? history : { ...history, past };
}
/** Whether restoring a room keeps Undo's promises, and if not, what a confirmed restore gives up. */
export function restoreCostOf(history: History, roomId: HomeAction["roomId"], ownership: Ownership = {}): RestoreCost | undefined {
  const next = editHistory(history, { type: "reset", roomId } as HomeAction, ownership);
  if (next === history) return undefined;
  if (historyAdmits(next)) return "undoable";
  return trimmedHistory(next).past.length ? "drops-older" : "no-undo";
}
/** Rebuilds the saved undo steps after a relaunch. Never mutates `saved`. */
export function restoredHistory(saved: HomeStateV2): History {
  const present = bare(saved);
  return { present, past: saved.undo ? undoPast(present, saved.undo) : [], future: [] };
}
export function editHistory(
  history: History,
  action: HomeAction | { type: "undo" | "redo" },
  ownership: Ownership = {},
  computed?: HomeResult
): History {
  if (action.type === "undo")
    return history.past.length
      ? {
          present:
            history.past.at(-1)!.current === history.present.current
              ? history.past.at(-1)!
              : { ...history.past.at(-1)!, current: history.present.current },
          past: history.past.slice(0, -1),
          future: [history.present, ...history.future].slice(0, 60),
        }
      : history;
  if (action.type === "redo")
    return history.future.length
      ? {
          present:
            history.future[0].current === history.present.current
              ? history.future[0]
              : { ...history.future[0], current: history.present.current },
          past: [...history.past, history.present].slice(-60),
          future: history.future.slice(1),
        }
      : history;
  const result = computed ?? homeReducer(history.present, action as HomeAction, ownership);
  if (result.state !== history.present) carryPanSeats(history.present, result.state, action as HomeAction);
  return result.state === history.present
    ? history
    : action.type === "room" || action.type === "finish-action" || action.type === "cook"
      ? { ...history, present: result.state }
      : { present: result.state, past: [...history.past, history.present].slice(-60), future: [] };
}
/** Settled-action adapter. The route supplies a learner-scoped Store transaction; never write around Store.commit.
 * Invalid initial input is exposed verbatim as recoveryOriginal and never overwritten.
 * Persist only HomeStateV2 through learner-scoped personalization, not session history. */
export function useHomeStore(ownership: Ownership = {}, initial?: unknown, persist?: (state: HomeStateV2) => boolean) {
  const initialValid = useMemo(() => initial === undefined || !!migrateHome(initial), [initial]);
  const [session, setSession] = useState(() => {
    const migrated = migrateHome(initial);
    const history = migrated ? restoredHistory(migrated) : ({ present: starterHome(), past: [], future: [] } as History);
    return {
      history,
      access: migrated?.access,
      message: "Your own little place by the sea.",
      serial: 0,
      /** R3-F1: what an older build saved is kept as loaded until the first write fits it. */
      inherited: fittedHistory(history) !== history,
    };
  });
  /** The history every write starts from: a loaded older history is fitted first. */
  const base = (current: typeof session) => (current.inherited ? fittedHistory(current.history) : current.history);
  const live = useRef(session);
  const identities = useRef<Record<string, string>>({});
  /** `anyway`: a Restore room the child confirmed after being told what Undo gives up (F3). */
  const dispatch = (action: HomeAction | { type: "undo" | "redo" }, options?: { anyway?: boolean }) => {
    const current = live.current;
    if (!initialValid) {
      setSession({ ...current, message: "This room needs recovery before it can be changed.", serial: current.serial + 1 });
      return;
    }
    const start = base(current);
    const result =
      action.type !== "undo" && action.type !== "redo"
        ? homeReducer(start.present, action as HomeAction, ownership)
        : undefined;
    let history = editHistory(start, action, ownership, result);
    let note: string | undefined;
    if (history !== start && action.type !== "undo" && action.type !== "redo" && !historyAdmits(history)) {
      if (options?.anyway && action.type === "reset") {
        history = trimmedHistory(history);
        note = RESTORE_NOTE[history.past.length ? "drops-older" : "no-undo"];
      } else {
        const next = { ...current, message: UNDO_FULL_MESSAGE, serial: current.serial + 1 };
        live.current = next;
        setSession(next);
        return;
      }
    }
    const changed = history !== start;
    if (changed && persist && !persist(savedHistory(history, current.access))) {
      const next = { ...current, message: "Your room could not be updated. Please try again.", serial: current.serial + 1 };
      live.current = next;
      setSession(next);
      return;
    }
    const next = {
      // Nothing changed, nothing written: a loaded older history stays as it was.
      history: changed ? history : current.history,
      access: current.access,
      serial: current.serial + 1,
      message:
        note ??
        (changed && current.inherited ? UNDO_TRIMMED_NOTE : undefined) ??
        result?.message ??
        (action.type === "undo" ? "Undone." : action.type === "redo" ? "Redone." : "Room updated."),
      inherited: current.inherited && !changed,
    };
    live.current = next;
    setSession(next);
  };
  const commitProposal = (
    proposal: DropProposal,
    seed?: HomeStateV2,
    stillCurrent?: () => boolean
  ): HomeStateV2 | undefined => {
    const current = live.current;
    if (!initialValid) return undefined;
    if (stillCurrent && !stillCurrent()) return undefined;
    const result = apply(seed ?? current.history.present, proposal);
    if ("stale" in result || (stillCurrent && !stillCurrent())) return undefined;
    carryPanSeats(seed ?? current.history.present, result.state, { type: "apply-proposal", proposal });
    const start = base(current);
    const history = {
      present: bare(result.state),
      past: [...start.past, start.present].slice(-60),
      future: [],
    };
    if (!historyAdmits(history)) {
      const next = { ...current, message: UNDO_FULL_MESSAGE, serial: current.serial + 1 };
      live.current = next;
      setSession(next);
      return undefined;
    }
    if (persist && !persist(savedHistory(history, current.access))) {
      const next = { ...current, message: "Your room could not be updated. Please try again.", serial: current.serial + 1 };
      live.current = next;
      setSession(next);
      return undefined;
    }
    identities.current = result.identities;
    const next = {
      history,
      access: current.access,
      message: current.inherited ? UNDO_TRIMMED_NOTE : "Room updated.",
      serial: current.serial + 1,
      inherited: false,
    };
    live.current = next;
    setSession(next);
    return result.state;
  };
  const setMessage = (message: string) => {
    const next = { ...live.current, message, serial: live.current.serial + 1 };
    live.current = next;
    setSession(next);
  };
  /** HR-03: grown-up access choices are saved with the home but are never undo steps. */
  const setAccess = (access: HomeAccess | undefined) => {
    const current = live.current;
    const history = base(current);
    if (!initialValid || (persist && !persist(savedHistory(history, access)))) return false;
    const next = current.inherited
      ? { ...current, history, access, message: UNDO_TRIMMED_NOTE, serial: current.serial + 1, inherited: false }
      : { ...current, access };
    live.current = next;
    setSession(next);
    return true;
  };
  return {
    state: session.history.present,
    getState: () => live.current.history.present,
    getCommittedIdentities: () => identities.current,
    dispatch,
    commitProposal,
    message: session.message,
    /** Increments with every message, so the same message twice is still news. */
    messageSerial: session.serial,
    setMessage,
    access: session.access,
    setAccess,
    /** F3: asked before Design shows its Restore question. */
    restoreCost: (roomId: HomeAction["roomId"]) => restoreCostOf(base(live.current), roomId, ownership),
    canUndo: session.history.past.length > 0,
    canRedo: session.history.future.length > 0,
    recoveryOriginal: !initialValid ? initial : undefined,
    persistence: persist ? ("store" as const) : ("session" as const),
  };
}
