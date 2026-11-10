import { describe, expect, it } from 'vitest';
import { shelfGames } from '../src/learn/home';
import { places, placeGames, subjects, subjectGames } from '../src/hub/model';

describe('living island hub contract', () => {
  it('offers every current destination without an empty Nursery teaser', () => {
    expect(places.map(place => place.id)).toEqual(['school', 'library', 'arcade', 'hall', 'home', 'locker', 'badges', 'cove']);
  });
  it('preserves every game exactly once across School, Arcade and Game Hall', () => {
    const ids = ['school', 'arcade', 'hall'].flatMap(place => placeGames(place as 'school' | 'arcade' | 'hall').map(game => game.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(shelfGames.map(game => game.id).sort());
    expect(placeGames('arcade')).toHaveLength(9);
    expect(placeGames('library')).toEqual([]);
  });
  it('provides six subjects using the existing CHamoru activity exactly once', () => {
    expect(subjects).toHaveLength(6);
    const ids = subjects.flatMap(subject => subjectGames(subject.id).map(game => game.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(placeGames('school').map(game => game.id).sort());
    expect(subjectGames('chamoru').map(game => game.id)).toEqual(['hafa-adai']);
    expect(subjectGames('reading').some(game => game.id === 'hafa-adai')).toBe(false);
  });
});
