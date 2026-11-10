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
import { boundedUndo, HOME_UNDO_STEPS, undoPast, undoStep, type UndoStep } from "./undoHistory";
export type History = { present: HomeStateV2; past: HomeStateV2[]; future: HomeStateV2[] };
/** History states are immutable and reused, so each adjacent pair is diffed once. */
const stepCache = new WeakMap<HomeStateV2, WeakMap<HomeStateV2, UndoStep>>();
function cachedStep(before: HomeStateV2, after: HomeStateV2): UndoStep {
  let inner = stepCache.get(before);
  if (!inner) stepCache.set(before, (inner = new WeakMap()));
  let step = inner.get(after);
  if (!step) inner.set(after, (step = undoStep(before, after)));
  return step;
}
const bare = (state: HomeStateV2): HomeStateV2 => ({ version: state.version, current: state.current, rooms: state.rooms });
/** HM-18: what the save holds. The present plus the last 20 undo steps, bounded in bytes. */
export function savedHistory(history: History, access?: HomeAccess): HomeStateV2 {
  const states = [...history.past.slice(-HOME_UNDO_STEPS), history.present];
  const steps = states.slice(1).map((after, i) => cachedStep(states[i], after)).filter((step) => Object.keys(step).length);
  const undo = history.present.version === 4 ? boundedUndo(steps) : undefined;
  return { ...bare(history.present), ...(access ? { access } : {}), ...(undo ? { undo } : {}) };
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
  const dispatch = (action: HomeAction | { type: "undo" | "redo" }) => {
    const current = live.current;
    if (!initialValid) {
      setSession({ ...current, message: "This room needs recovery before it can be changed.", serial: current.serial + 1 });
      return;
    }
    const result =
      action.type !== "undo" && action.type !== "redo"
        ? homeReducer(current.history.present, action as HomeAction, ownership)
        : undefined;
    const history = editHistory(current.history, action, ownership, result);
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
        result?.message ?? (action.type === "undo" ? "Undone." : action.type === "redo" ? "Redone." : "Room updated."),
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
    canUndo: session.history.past.length > 0,
    canRedo: session.history.future.length > 0,
    recoveryOriginal: !initialValid ? initial : undefined,
    persistence: persist ? ("store" as const) : ("session" as const),
  };
}
