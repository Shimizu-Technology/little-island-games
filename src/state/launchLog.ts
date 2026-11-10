import { storage } from './storage';

export type LaunchNote = { at: string; where: string; message: string };
const notes: LaunchNote[] = [];
const describe = (cause: unknown) => (cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)).slice(0, 400);

/** Record why launch didn't go to plan: on the console, in memory, and in a small on-device ring. Best effort, never throws. */
export function noteLaunch(where: string, cause: unknown): LaunchNote {
  const note = { at: new Date().toISOString(), where, message: describe(cause) };
  notes.push(note); if (notes.length > 8) notes.shift();
  console.warn(`Little Island launch (${where}): ${note.message}`);
  try { void storage.logLaunch?.(JSON.stringify(note)).catch(() => {}); } catch { /* storage itself may be what failed */ }
  return note;
}
export const launchNotes = (): readonly LaunchNote[] => [...notes];
