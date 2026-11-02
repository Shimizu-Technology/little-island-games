import type { LibraryCreation } from "./state";
/** Rejected drafts stay exportable across Library navigation until admitted or explicitly discarded. */
const drafts = new Map<string, LibraryCreation>();
export const pendingPage = (key: string) => drafts.get(key);
export function retainPageDraft(key: string, page: LibraryCreation, admitted: boolean) {
  if (admitted) drafts.delete(key);
  else drafts.set(key, page);
}
export const discardPageDraft = (key: string) => drafts.delete(key);
export const pageDraftKey = (childId: string, pageId: string) => `${childId}:${pageId}`;
export const hasPendingPages = (childId: string) => [...drafts.keys()].some((key) => key.startsWith(`${childId}:`));
export function draftRecovery(childId?: string): string | null {
  const pages = [...drafts].filter(([key]) => !childId || key.startsWith(`${childId}:`));
  return pages.length ? JSON.stringify({ format: "little-island-unsaved-pages", version: 1, pages }) : null;
}
export function clearPageDrafts(childId?: string) {
  for (const key of drafts.keys()) if (!childId || key.startsWith(`${childId}:`)) drafts.delete(key);
}
