import type { ArcadeResult } from './types';
/** Engine callbacks still need a well-formed terminal and the exact live round token. */
export function validTerminalResult(value: unknown): value is ArcadeResult {
  if(!value || typeof value!=='object' || Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  return Object.keys(v).every(k=>['cleared','outcome','stars','score','detail'].includes(k)) && typeof v.cleared==='boolean' && typeof v.stars==='number' && Number.isInteger(v.stars) && v.stars>=0 && v.stars<=3 && typeof v.score==='number' && Number.isInteger(v.score) && v.score>=0 && v.score<=99999999 && typeof v.detail==='string' && v.detail.length<=4096 && (!v.cleared ? v.stars===0 : v.stars>0) && (v.outcome===undefined || v.outcome===(v.cleared?'cleared':v.outcome==='stopped'?'stopped':'game-over'));
}
export const terminalBelongs = (live: string, round: string, result:unknown) => !!round && live===round && validTerminalResult(result);
