/**
 * Gate Crab responsive sizing. Pure, so phone/iPad/AX5 geometry can be tested without a screen.
 * Legibility first: shells and tap targets never drop below comfortable minimums; the page scrolls instead.
 */
export const TABLET_WIDTH = 600;
export const SHELL_MIN_PHONE = 48;
export const SHELL_MIN_TABLET = 60;
export const EVIDENCE_SHELL_PHONE = 32;
export const EVIDENCE_SHELL_TABLET = 40;
export const GATE_CRAB_MIN_HEIGHT = 112;

/** Size of one builder shell slot so 2 or 3 shells plus gaps always fit cleanly inside the board width. */
export function builderShellSize(boardWidth: number, len: 2 | 3, windowWidth: number): number {
  const tablet = windowWidth >= TABLET_WIDTH;
  const min = tablet ? SHELL_MIN_TABLET : SHELL_MIN_PHONE;
  const max = tablet ? 84 : 68;
  const perSlot = Math.floor((boardWidth - 36 - (len - 1) * 10) / len);
  return Math.max(min, Math.min(max, perSlot));
}

/** Size of one shell inside the 6-shell picker tray (3 per row on narrow phone, 6 across on wide screens). */
export function pickerColumns(boardWidth: number, large: boolean): 3 | 6 {
  if (large) return 3;
  return boardWidth >= 460 ? 6 : 3;
}

export function pickerShellSize(boardWidth: number, large: boolean): number {
  const cols = pickerColumns(boardWidth, large);
  const avail = Math.floor((boardWidth - 20 - (cols - 1) * 8) / cols);
  return Math.max(44, Math.min(60, avail));
}

/** Evidence columns sit side-by-side on wide boards or non-AX phones, and stack cleanly at AX5 narrow widths. */
export function evidenceSideBySide(boardWidth: number, large: boolean): boolean {
  if (large && boardWidth < 520) return false;
  return boardWidth >= 310;
}

export function evidenceShellSize(boardWidth: number, len: 2 | 3, sideBySide: boolean, windowWidth: number): number {
  const colW = sideBySide ? Math.floor((boardWidth - 10) / 2) - 18 : boardWidth - 24;
  const byCol = Math.floor((colW - (len - 1) * 4) / len);
  const max = windowWidth >= TABLET_WIDTH ? EVIDENCE_SHELL_TABLET : EVIDENCE_SHELL_PHONE;
  return Math.max(24, Math.min(max, byCol));
}

export function crabSceneHeight(windowWidth: number, large: boolean): number {
  if (large) return GATE_CRAB_MIN_HEIGHT;
  return windowWidth >= TABLET_WIDTH ? 148 : 126;
}
