import type { Save } from './validation';
import { validWordSession, type WordGame, type WordSession } from '../wordgames/session';
export type WordGameSessions = Partial<Record<WordGame, WordSession>>;
/** Separate from the frozen classic/activity rosters. Each local learner owns their own two slots. */
export interface WordGamesSave { version: 1; people: Record<string, WordGameSessions> }
export interface WordGameExpected { owner: string; epoch: number; id: string | null; revision?: number }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
export function validWordGames(value: unknown, owners: readonly string[]): value is WordGamesSave {
  if (!object(value) || Object.keys(value).length !== 2 || value.version !== 1 || !object(value.people) || Object.keys(value.people).length > owners.length) return false;
  const seen = new Set<string>();
  return Object.entries(value.people).every(([owner, rounds]) => owners.includes(owner) && object(rounds) && Object.entries(rounds).every(([game, round]) => {
    if (game !== 'word-hunt' && game !== 'anagrams' || !validWordSession(round, game)) return false;
    const key = `${game}:${round.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }));
}
export function applyWordGameSave(save: Save, game: WordGame, next: WordSession, expected: WordGameExpected, epoch: number): Save {
  const owner = save.learning?.active ?? 'family', current = save.wordGames?.people[owner]?.[game];
  if (expected.epoch !== epoch || expected.owner !== owner || (current?.id ?? null) !== expected.id ||
    expected.revision !== undefined && current?.revision !== expected.revision || next.game !== game || !validWordSession(next, game) ||
    Object.entries(save.wordGames?.people ?? {}).some(([other, rounds]) => other !== owner && rounds[game]?.id === next.id)) return save;
  return { ...save, wordGames: { version: 1, people: { ...save.wordGames?.people, [owner]: { ...save.wordGames?.people[owner], [game]: next } } } };
}
export function withoutWordGameOwner(save: Save, owner: string): Save {
  if (!save.wordGames || !Object.hasOwn(save.wordGames.people, owner)) return save;
  return { ...save, wordGames: { version: 1, people: Object.fromEntries(Object.entries(save.wordGames.people).filter(([id]) => id !== owner)) } };
}
