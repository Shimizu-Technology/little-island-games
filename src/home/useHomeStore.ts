import { apply, type DropProposal } from "./scene/proposal";
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
import { boundedUndo, HOME_UNDO_STEPS, undoAdmits, undoEntry, undoPast, undoStep, type UndoEntry } from "./undoHistory";
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
const bare = (state: HomeStateV2): HomeStateV2 => ({ version: state.version, current: state.current, rooms: state.rooms });
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
  "no-undo": "This change can't be undone. Restore the room anyway?",
  "drops-older": "After this, Undo can't bring back your older changes. Restore the room anyway?",
};
export const RESTORE_NOTE: Record<Exclude<RestoreCost, "undoable">, string> = {
  "no-undo": "Your room is back to the start. Undo can't bring it back.",
  "drops-older": "Your room is back to the start. Your oldest undo steps are gone.",
};
/** Messages that the Home screen shows as a visible note, not only to a screen reader. */
export const UNDO_NOTES: readonly string[] = [UNDO_FULL_MESSAGE, ...Object.values(RESTORE_NOTE)];
/** F3: the newest steps whose promises still hold. The oldest go first, an older removal with them. */
export function trimmedHistory(history: History): History {
  let past = history.past;
  while (past.length && !historyAdmits({ ...history, past })) past = past.slice(1);
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
  return result.state === history.present
    ? history
    : action.type === "room" || action.type === "finish-action"
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
    return {
      history: migrated ? restoredHistory(migrated) : ({ present: starterHome(), past: [], future: [] } as History),
      access: migrated?.access,
      message: "Your own little place by the sea.",
      serial: 0,
    };
  });
  const live = useRef(session);
  const identities = useRef<Record<string, string>>({});
  /** `anyway`: a Restore room the child confirmed after being told what Undo gives up (F3). */
  const dispatch = (action: HomeAction | { type: "undo" | "redo" }, options?: { anyway?: boolean }) => {
    const current = live.current;
    if (!initialValid) {
      setSession({ ...current, message: "This room needs recovery before it can be changed.", serial: current.serial + 1 });
      return;
    }
    const result =
      action.type !== "undo" && action.type !== "redo"
        ? homeReducer(current.history.present, action as HomeAction, ownership)
        : undefined;
    let history = editHistory(current.history, action, ownership, result);
    let note: string | undefined;
    if (history !== current.history && action.type !== "undo" && action.type !== "redo" && !historyAdmits(history)) {
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
    if (history !== current.history && persist && !persist(savedHistory(history, current.access))) {
      const next = { ...current, message: "Your room could not be updated. Please try again.", serial: current.serial + 1 };
      live.current = next;
      setSession(next);
      return;
    }
    const next = {
      history,
      access: current.access,
      serial: current.serial + 1,
      message:
        note ?? result?.message ?? (action.type === "undo" ? "Undone." : action.type === "redo" ? "Redone." : "Room updated."),
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
    const history = {
      present: bare(result.state),
      past: [...current.history.past, current.history.present].slice(-60),
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
    const next = { history, access: current.access, message: "Room updated.", serial: current.serial + 1 };
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
    if (!initialValid || (persist && !persist(savedHistory(current.history, access)))) return false;
    const next = { ...current, access };
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
    restoreCost: (roomId: HomeAction["roomId"]) => restoreCostOf(live.current.history, roomId, ownership),
    canUndo: session.history.past.length > 0,
    canRedo: session.history.future.length > 0,
    recoveryOriginal: !initialValid ? initial : undefined,
    persistence: persist ? ("store" as const) : ("session" as const),
  };
}
