import { finishRound, type WordSession } from './session';
/** Active-play clock arithmetic is reachable only from the dedicated timed route. */
export function elapseRound<T extends WordSession>(session: T, elapsedMs: number): T {
  if (session.phase !== 'playing' || session.mode === 'chill' || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return session;
  const next = { ...session, remainingMs: Math.max(0, session.remainingMs - Math.floor(elapsedMs)), revision: session.revision + 1 };
  return next.remainingMs === 0 ? finishRound(next) : next;
}
