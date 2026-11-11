import type { ArcadeFacts, ArcadeResult } from './types';
export const factIds: readonly (keyof ArcadeFacts)[] = ['fish', 'replays', 'streak', 'clean', 'aim', 'rally', 'fruit', 'shells', 'powers', 'rows'];
/** Dare evidence is a few engine counts, never a frame log. */
export function validFacts(value: unknown): value is ArcadeFacts {
  if(!value || typeof value!=='object' || Array.isArray(value))return false;
  const entries=Object.entries(value as Record<string,unknown>);
  return entries.length<=4 && entries.every(([k,n])=>factIds.includes(k as keyof ArcadeFacts) && typeof n==='number' && Number.isInteger(n) && n>=0 && n<=99999999);
}
/** Engine callbacks still need a well-formed terminal and the exact live round token. */
export function validTerminalResult(value: unknown): value is ArcadeResult {
  if(!value || typeof value!=='object' || Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  return Object.keys(v).every(k=>['cleared','outcome','stars','score','detail','facts'].includes(k)) && (v.facts===undefined || validFacts(v.facts)) && typeof v.cleared==='boolean' && typeof v.stars==='number' && Number.isInteger(v.stars) && v.stars>=0 && v.stars<=3 && typeof v.score==='number' && Number.isInteger(v.score) && v.score>=0 && v.score<=99999999 && typeof v.detail==='string' && v.detail.length<=4096 && (!v.cleared ? v.stars===0 : v.stars>0) && (v.outcome===undefined || v.outcome===(v.cleared?'cleared':v.outcome==='stopped'?'stopped':'game-over'));
}
export const terminalBelongs = (live: string, round: string, result:unknown) => !!round && live===round && validTerminalResult(result);
