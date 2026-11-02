import type { DrawingStroke, DrawingStamp, LibraryCreation } from "./state";
export type Drawing = { strokes: DrawingStroke[]; stamps: DrawingStamp[] };
export type DrawingHistory = { present: Drawing; past: Drawing[]; future: Drawing[] };
export const emptyDrawing = (): Drawing => ({ strokes: [], stamps: [] });
export function editDrawing(history: DrawingHistory, next: Drawing): DrawingHistory {
  return { present: next, past: [...history.past, history.present].slice(-30), future: [] };
}
export function undoDrawing(history: DrawingHistory): DrawingHistory {
  if (!history.past.length) return history;
  return {
    present: history.past.at(-1)!,
    past: history.past.slice(0, -1),
    future: [history.present, ...history.future].slice(0, 30),
  };
}
export function redoDrawing(history: DrawingHistory): DrawingHistory {
  if (!history.future.length) return history;
  return {
    present: history.future[0],
    past: [...history.past, history.present].slice(-30),
    future: history.future.slice(1),
  };
}
export const normalizedPoint = (x: number, y: number, width: number, height: number) => ({
  x: Math.round(Math.max(0, Math.min(1, x / Math.max(1, width))) * 1000) / 1000,
  y: Math.round(Math.max(0, Math.min(1, y / Math.max(1, height))) * 1000) / 1000,
});
export const pathForStroke = (stroke: DrawingStroke) =>
  stroke.points.map((point, index) => `${index ? "L" : "M"}${point.x * 1000},${point.y * 650}`).join(" ") +
  (stroke.points.length === 1 ? "l.1,.1" : "");

/** Called by a deliberate Make action, never while rendering. */
export function createLibraryPage(sourceId?: string): LibraryCreation {
  const timestamp = Date.now();
  return {
    id: `page-${timestamp.toString(36)}`,
    title: "My page",
    ...(sourceId ? { sourceId } : {}),
    sentences: "",
    updatedAt: timestamp,
    strokes: [],
    stamps: [],
  };
}
