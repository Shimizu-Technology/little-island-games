import { getWordLexicon } from './lexicon';
import { totalScore, roundStats } from './scoring';
import { generateBoard, solveBoard, validHuntPath, type HuntSize } from './wordHuntEngine';
import { generateRack, solveRack, type RackSize } from './anagramsEngine';
export type WordGame = 'word-hunt' | 'anagrams';
export type WordMode = 'rush' | 'chill' | 'pass-play';
export type WordPhase = 'playing' | 'paused' | 'handoff' | 'finished';
interface Round {
  version: 1; id: string; revision: number; round: number; seed: number; mode: WordMode; phase: WordPhase;
  tiles: string[]; selection: number[]; order: number[]; found: [string[], string[]]; player: 0 | 1;
  remainingMs: number; best: number; result: null | { winner: 0 | 1 | 'tie' };
}
export type WordHuntSession = Round & { game: 'word-hunt'; size: HuntSize };
export type AnagramsSession = Round & { game: 'anagrams'; size: RackSize };
export type WordSession = WordHuntSession | AnagramsSession;
export const roundDuration = (game: WordGame) => game === 'word-hunt' ? 80000 : 60000;
export function createWordSession(game: 'word-hunt', size: HuntSize, mode: WordMode, seed: number, best?: number): WordHuntSession;
export function createWordSession(game: 'anagrams', size: RackSize, mode: WordMode, seed: number, best?: number): AnagramsSession;
export function createWordSession(game: WordGame, size: HuntSize | RackSize, mode: WordMode, seed: number, best = 0): WordSession {
  const tiles = game === 'word-hunt' ? generateBoard(size as HuntSize, seed) : generateRack(size as RackSize, seed);
  return { version: 1, id: `${game}-${seed >>> 0}-${size}-${mode}`, revision: 0, round: 0, seed: seed >>> 0, game, size, mode, tiles,
    selection: [], order: tiles.map((_, i) => i), found: [[], []], player: 0, phase: 'playing', remainingMs: roundDuration(game), best, result: null } as WordSession;
}
export function wordsFor(session: WordSession): readonly string[] {
  return session.game === 'word-hunt' ? [...solveBoard(session.tiles).keys()] : solveRack(session.tiles);
}
export function selectedWord(session: WordSession) { return session.selection.map(i => session.tiles[i]).join(''); }
export function wordStatus(session: WordSession, word = selectedWord(session)): 'new' | 'found' | 'building' {
  if (session.found[session.player].includes(word)) return 'found';
  return wordsFor(session).includes(word) ? 'new' : 'building';
}
export function changeSelection<T extends WordSession>(session: T, selection: number[], order = session.order): T {
  if (session.phase !== 'playing' || new Set(selection).size !== selection.length ||
    selection.some(i => !Number.isInteger(i) || i < 0 || i >= session.tiles.length) ||
    (session.game === 'word-hunt' && selection.length > 0 && !validHuntPath(selection, session.tiles)) ||
    order.length !== session.tiles.length || new Set(order).size !== order.length || order.some(i => !Number.isInteger(i) || i < 0 || i >= session.tiles.length)) return session;
  return { ...session, selection, order: [...order], revision: session.revision + 1 };
}
export function submitWord<T extends WordSession>(session: T): T {
  if (session.phase !== 'playing') return session;
  const word = selectedWord(session);
  if (new Set(session.selection).size !== session.selection.length || session.selection.some(i => !Number.isInteger(i) || i < 0 || i >= session.tiles.length) || wordStatus(session) !== 'new') return changeSelection(session, []);
  if (session.game === 'word-hunt' && !validHuntPath(session.selection, session.tiles)) return changeSelection(session, []);
  const found: [string[], string[]] = [[...session.found[0]], [...session.found[1]]];
  found[session.player].push(word);
  return { ...session, selection: [], found, revision: session.revision + 1 };
}
export function finishRound<T extends WordSession>(session: T): T {
  if (session.phase !== 'playing' && session.phase !== 'paused') return session;
  const best = Math.max(session.best, totalScore(session.found[session.player]));
  if (session.mode === 'pass-play' && session.player === 0)
    return { ...session, phase: 'handoff', selection: [], best, revision: session.revision + 1 };
  const first = totalScore(session.found[0]), second = totalScore(session.found[1]);
  return { ...session, phase: 'finished', selection: [], best, revision: session.revision + 1,
    result: { winner: session.mode !== 'pass-play' || first > second ? 0 : second > first ? 1 : 'tie' } };
}
export function startSecondPlayer<T extends WordSession>(session: T): T {
  return session.phase !== 'handoff' ? session : { ...session, phase: 'playing', player: 1, selection: [], order: session.tiles.map((_, i) => i), remainingMs: roundDuration(session.game), revision: session.revision + 1 };
}
export function pauseRound<T extends WordSession>(session: T): T {
  return session.phase !== 'playing' ? session : { ...session, phase: 'paused', selection: [], revision: session.revision + 1 };
}
export function resumeRound<T extends WordSession>(session: T): T {
  return session.phase !== 'paused' ? session : { ...session, phase: 'playing', revision: session.revision + 1 };
}
export function matchStats(session: WordSession) {
  return [roundStats(session.found[0], session.found[1]), roundStats(session.found[1], session.found[0])];
}
export function rematch<T extends WordSession>(session: T): T {
  return { ...session, id: `${session.game}-${session.seed}-${session.size}-${session.mode}-round-${session.round + 1}`, round: session.round + 1, revision: 0, phase: 'playing',
    selection: [], order: session.tiles.map((_, i) => i), found: [[], []], player: 0, remainingMs: roundDuration(session.game), result: null };
}
const integer = (v: unknown, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
/** Strict bounded v1 envelope. Answers, paths, score and match phase must agree with the pure engines. */
export function validWordSession(value: unknown, game?: WordGame): value is WordSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as WordSession;
  if ((s.game !== 'word-hunt' && s.game !== 'anagrams') || (game && s.game !== game) || s.version !== 1 ||
    typeof s.id !== 'string' || !/^[a-z0-9-]{1,120}$/.test(s.id) || !integer(s.revision, 1000000000) || !integer(s.round, 1000000000) || !integer(s.seed, 0xffffffff) ||
    (s.game === 'word-hunt' ? s.size !== 4 && s.size !== 5 : s.size !== 6 && s.size !== 7) ||
    (s.mode !== 'rush' && s.mode !== 'chill' && s.mode !== 'pass-play') ||
    (s.phase !== 'playing' && s.phase !== 'paused' && s.phase !== 'handoff' && s.phase !== 'finished') ||
    (s.player !== 0 && s.player !== 1) || (s.mode !== 'pass-play' && s.player !== 0) ||
    !integer(s.remainingMs, roundDuration(s.game)) || !integer(s.best, 100000000) ||
    !Array.isArray(s.tiles) || s.tiles.length !== (s.game === 'word-hunt' ? s.size * s.size : s.size) || !s.tiles.every(letter => typeof letter === 'string' && /^[A-Z]$/.test(letter))) return false;
  const indices = (v: unknown): v is number[] => Array.isArray(v) && v.length <= s.tiles.length && new Set(v).size === v.length && v.every(i => integer(i, s.tiles.length - 1));
  if (!indices(s.selection) || !indices(s.order) || s.order.length !== s.tiles.length ||
    (s.game === 'word-hunt' && s.selection.length > 0 && !validHuntPath(s.selection, s.tiles)) ||
    (s.phase !== 'playing' && s.selection.length !== 0) ||
    !Array.isArray(s.found) || s.found.length !== 2) return false;
  const answers = new Set(wordsFor(s));
  if (!s.found.every(group => Array.isArray(group) && group.length <= answers.size && new Set(group).size === group.length && group.every(word => typeof word === 'string' && getWordLexicon().has(word) && answers.has(word)))) return false;
  if (answers.size < (s.game === 'word-hunt' ? s.size === 4 ? 25 : 45 : 12)) return false;
  if (s.game === 'word-hunt' && ![...answers].some(word => word.length >= 5)) return false;
  if (s.game === 'anagrams' && ![...answers].some(word => word.length === s.size)) return false;
  if (s.phase === 'handoff' && s.best < totalScore(s.found[0])) return false;
  if (s.player === 0 && s.found[1].length) return false;
  if (s.phase === 'handoff' && (s.mode !== 'pass-play' || s.player !== 0)) return false;
  if (s.phase === 'finished') {
    if (s.mode === 'pass-play' && s.player !== 1) return false;
    const a = totalScore(s.found[0]), b = totalScore(s.found[1]), winner = s.mode !== 'pass-play' || a > b ? 0 : b > a ? 1 : 'tie';
    if (!s.result || Object.keys(s.result).length !== 1 || s.result.winner !== winner || s.best < Math.max(a, b)) return false;
  } else if (s.result !== null) return false;
  if (s.phase === 'playing' && s.mode !== 'chill' && s.remainingMs === 0) return false;
  // Reject hidden payloads in imported saves; version changes require an explicit migration.
  const template = { version: 1, id: 1, revision: 1, round: 1, seed: 1, game: 1, size: 1, mode: 1, phase: 1, tiles: 1, selection: 1, order: 1, found: 1, player: 1, remainingMs: 1, best: 1, result: 1 };
  return Object.keys(s).length === Object.keys(template).length && Object.keys(s).every(key => Object.hasOwn(template, key));
}
