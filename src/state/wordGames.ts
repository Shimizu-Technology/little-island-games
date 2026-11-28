import type { Save } from './validation';
import { validWordSession, type WordGame, type WordSession } from '../wordgames/session';
export type WordGameSessions = Partial<Record<WordGame, WordSession>>;
/** Separate from the frozen classic/activity rosters. Each local learner owns their own two slots. */
export interface WordGamesSave {
  version: 1;
  people: Record<string, WordGameSessions>;
  /** Per-learner starred word games; omitted when empty so existing saves serialize identically. */
  favorites?: Record<string, WordGame[]>;
  /** Per-learner most recent word game for Game Hall Continue recency; omitted when absent. */
  recent?: Record<string, WordGame>;
}
export interface WordGameExpected { owner: string; epoch: number; id: string | null; revision?: number }
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const isWordGame = (value: unknown): value is WordGame => value === 'word-hunt' || value === 'anagrams';

function compactWordGames(wg: WordGamesSave): WordGamesSave | undefined {
  const favoritesEntries = Object.entries(wg.favorites ?? {}).filter(([, list]) => list.length > 0);
  const recentEntries = Object.entries(wg.recent ?? {}).filter(([, game]) => isWordGame(game));
  const hasPeople = Object.keys(wg.people).length > 0;
  if (!hasPeople && favoritesEntries.length === 0 && recentEntries.length === 0) return undefined;
  return {
    version: 1,
    people: wg.people,
    ...(favoritesEntries.length > 0 ? { favorites: Object.fromEntries(favoritesEntries) } : {}),
    ...(recentEntries.length > 0 ? { recent: Object.fromEntries(recentEntries) } : {}),
  };
}

export function validWordGames(value: unknown, owners: readonly string[]): value is WordGamesSave {
  if (!object(value) || value.version !== 1 || !object(value.people) || Object.keys(value.people).length > owners.length) return false;
  if (Object.keys(value).some(key => key !== 'version' && key !== 'people' && key !== 'favorites' && key !== 'recent')) return false;
  if (value.favorites !== undefined) {
    if (!object(value.favorites) || Object.keys(value.favorites).length > owners.length) return false;
    const okFavorites = Object.entries(value.favorites).every(([owner, list]) =>
      owners.includes(owner) &&
      Array.isArray(list) &&
      list.length <= 2 &&
      new Set(list).size === list.length &&
      list.every(isWordGame),
    );
    if (!okFavorites) return false;
  }
  if (value.recent !== undefined) {
    if (!object(value.recent) || Object.keys(value.recent).length > owners.length) return false;
    const okRecent = Object.entries(value.recent).every(([owner, game]) => owners.includes(owner) && isWordGame(game));
    if (!okRecent) return false;
  }
  const seen = new Set<string>();
  return Object.entries(value.people).every(([owner, rounds]) => owners.includes(owner) && object(rounds) && Object.entries(rounds).every(([game, round]) => {
    if (!isWordGame(game) || !validWordSession(round, game)) return false;
    const key = `${game}:${round.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }));
}

export function wordGameFavorites(save: Save, owner = save.learning?.active ?? 'family'): readonly WordGame[] {
  return save.wordGames?.favorites?.[owner] ?? [];
}

export function toggleWordGameFavorite(save: Save, game: WordGame): Save {
  if (!isWordGame(game)) return save;
  const owner = save.learning?.active ?? 'family';
  const prev = save.wordGames?.favorites?.[owner] ?? [];
  const nextList = prev.includes(game) ? prev.filter(item => item !== game) : [...prev, game];
  const nextFavorites: Record<string, WordGame[]> = { ...(save.wordGames?.favorites ?? {}) };
  if (nextList.length > 0) nextFavorites[owner] = nextList;
  else delete nextFavorites[owner];
  const compacted = compactWordGames({
    version: 1,
    people: save.wordGames?.people ?? {},
    favorites: nextFavorites,
    recent: save.wordGames?.recent,
  });
  if (!compacted) {
    const { wordGames: _removed, ...rest } = save;
    void _removed;
    return rest;
  }
  return { ...save, wordGames: compacted };
}

export function clearWordGameRecent<T extends { learning?: { active?: string }; wordGames?: WordGamesSave }>(save: T): T {
  const owner = save.learning?.active ?? 'family';
  if (!save.wordGames?.recent || !Object.hasOwn(save.wordGames.recent, owner)) return save;
  const nextRecent = Object.fromEntries(Object.entries(save.wordGames.recent).filter(([id]) => id !== owner)) as Record<string, WordGame>;
  const compacted = compactWordGames({
    version: 1,
    people: save.wordGames.people,
    favorites: save.wordGames.favorites,
    recent: nextRecent,
  });
  if (!compacted) {
    const copy = { ...save };
    delete copy.wordGames;
    return copy;
  }
  return { ...save, wordGames: compacted };
}

export function applyWordGameSave(save: Save, game: WordGame, next: WordSession, expected: WordGameExpected, epoch: number): Save {
  const owner = save.learning?.active ?? 'family', current = save.wordGames?.people[owner]?.[game];
  if (expected.epoch !== epoch || expected.owner !== owner || (current?.id ?? null) !== expected.id ||
    expected.revision !== undefined && current?.revision !== expected.revision || next.game !== game || !validWordSession(next, game) ||
    Object.entries(save.wordGames?.people ?? {}).some(([other, rounds]) => other !== owner && rounds[game]?.id === next.id)) return save;
  const recent: Record<string, WordGame> = { ...(save.wordGames?.recent ?? {}), [owner]: game };
  const wordGames: WordGamesSave = {
    version: 1,
    people: { ...save.wordGames?.people, [owner]: { ...save.wordGames?.people[owner], [game]: next } },
    ...(save.wordGames?.favorites ? { favorites: save.wordGames.favorites } : {}),
    recent,
  };
  return {
    ...save,
    recent: null,
    ...(save.recentBoard !== undefined ? { recentBoard: null } : {}),
    ...(save.recentActivity !== undefined ? { recentActivity: null } : {}),
    wordGames,
  };
}

export function withoutWordGameOwner(save: Save, owner: string): Save {
  const wg = save.wordGames;
  if (!wg || (!Object.hasOwn(wg.people, owner) && !Object.hasOwn(wg.favorites ?? {}, owner) && !Object.hasOwn(wg.recent ?? {}, owner))) return save;
  const people = Object.fromEntries(Object.entries(wg.people).filter(([id]) => id !== owner));
  const favorites = Object.fromEntries(Object.entries(wg.favorites ?? {}).filter(([id]) => id !== owner));
  const recent = Object.fromEntries(Object.entries(wg.recent ?? {}).filter(([id]) => id !== owner));
  const next: WordGamesSave = {
    version: 1,
    people,
    ...(Object.keys(favorites).length > 0 ? { favorites } : {}),
    ...(Object.keys(recent).length > 0 ? { recent } : {}),
  };
  return { ...save, wordGames: next };
}
