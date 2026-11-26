import { createContext, useContext, useLayoutEffect, useRef } from 'react';

/** One command a board hands its host: what it does, whether it can run now, and optionally its spoken word. */
export type HudCommand = { run: () => void; disabled?: boolean; label?: string };
/** One board-specific row shown in Cove's single More sheet (icon names match `src/ui/icons.ts`). */
export type BoardMoreAction = { label: string; run: () => void; disabled?: boolean; icon?: 'Sparkle' | 'PuzzlePiece' | 'Plus' | 'GridFour' };
/** `hint` is the board's own first staged step (Look, never a move); `undo` and `reset` carry the board's own cleanup; `extraActions` adds board-specific More items. */
export type BoardCommands = { hint?: HudCommand; undo?: HudCommand; reset?: HudCommand; extraActions?: readonly BoardMoreAction[] };
/**
 * A Puzzles round hosts its live board under this context. A hosted board hands the HUD its own staged Hint and its
 * own Undo and Start over, leaves its duplicate buttons out, and shows the host's plain title. Outside a host
 * (Challenge, School) the value is null and the board keeps every control it had.
 */
export type BoardHost = { commands: (commands: BoardCommands | null) => void; title?: string };
export const BoardHud = createContext<BoardHost | null>(null);

/** Hands `commands` to the host after every render and withdraws them on unmount. Returns the host, or null. */
export function useBoardHud(commands: BoardCommands): BoardHost | null {
  const host = useContext(BoardHud), latest = useRef(host);
  useLayoutEffect(() => { latest.current = host; host?.commands(commands); });
  useLayoutEffect(() => () => latest.current?.commands(null), []);
  return host;
}
