import { createContext } from 'react';
import { LARGE_TEXT } from '../../components/wordFit';
/** Actual preceding chrome can be supplied by a host. Standalone native boards reserve safe areas. */
export const SearchChrome = createContext({ top: 60, bottom: 34, bar: 0 });
export function searchLayout(width: number, height: number, fontScale: number, columns: number, rows: number, pictures: boolean, together: boolean, chrome: { top: number; bottom: number; bar: number }, audio = false) {
  const large = fontScale >= LARGE_TEXT, short = large && height < 500, beside = large && width >= 700;
  const listWidth = beside ? Math.min(260, width * .33) : width;
  const boardWidth = Math.min(beside ? width - listWidth - 12 : width, 660);
  // Title 58, instruction 30, status 33, optional hunter controls 44 + cue 30, gaps,
  // plus one complete list card below the board (beside layouts share its height).
  const listRow = Math.max(pictures ? 88 : 0, (short ? 34 : 42) + (audio ? (short ? 50 : 52) : 0) + 24);
  const overhead = short ? 42 + 33 + 24 : 66 + 38 + 33 + (together ? 94 : 0) + 48 + (beside ? 0 : listRow);
  let room = large ? Math.max(48, height - chrome.top - chrome.bottom - chrome.bar - overhead) : Infinity;
  // Dense boards keep their enlargement/pan mode row above the viewport, within the same budget.
  const tools = large && Math.floor(Math.min((boardWidth - 2) / columns, room / rows)) < 44;
  if (tools) room = Math.max(32, room - 54);
  const size = Math.max(2, Math.floor(Math.min((boardWidth - 2) / columns, (room - 2) / rows)));
  return { large, short, tools, beside, listWidth, boardWidth, size, room };
}
