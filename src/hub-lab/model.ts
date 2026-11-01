import { shelfGames, type ShelfGame } from '../learn/home';

export const places = [
  { id: 'school', name: 'School', hint: 'Six ways to wonder', color: '#E8BA59', x: 25, y: 17 },
  { id: 'library', name: 'Library', hint: 'Explore our world', color: '#79B8BD', x: 75, y: 18 },
  { id: 'arcade', name: 'Arcade', hint: 'Nine little adventures', color: '#D59283', x: 20, y: 42 },
  { id: 'hall', name: 'Game Hall', hint: 'A place to play together', color: '#92AD86', x: 80, y: 43 },
  { id: 'home', name: 'Home', hint: 'Your stories live here', color: '#DD977E', x: 24, y: 69 },
  { id: 'locker', name: 'Locker', hint: 'Come as yourself', color: '#98BFC0', x: 53, y: 86 },
  { id: 'badges', name: 'Badges', hint: 'Things you have tried', color: '#E6BC64', x: 80, y: 70 },
] as const;
export type PlaceId = typeof places[number]['id'];
export const subjects = [
  { id: 'reading', name: 'Reading', mark: 'Aa', color: '#E8EFF9' },
  { id: 'numbers', name: 'Numbers', mark: '123', color: '#F7EBD0' },
  { id: 'science', name: 'Science', mark: '◉', color: '#DDEFF5' },
  { id: 'thinking', name: 'Thinking', mark: '◇', color: '#FBE6DC' },
  { id: 'coding', name: 'Coding', mark: '{ }', color: '#E3E9F7' },
  { id: 'chamoru', name: 'CHamoru', mark: 'CH', color: '#F5DCCC' },
] as const;
export type SubjectId = typeof subjects[number]['id'];
// The existing CHamoru activity lives on the Reading shelf. Do not invent a route or engine.
export function subjectGames(subject: SubjectId): ShelfGame[] {
  return shelfGames.filter(game => subject === 'chamoru' ? game.id === 'hafa-adai' : game.island === subject && game.id !== 'hafa-adai');
}
export function placeGames(place: PlaceId): ShelfGame[] {
  return shelfGames.filter(game => place === 'arcade' ? game.island === 'arcade' : place === 'hall' ? game.island === 'classic' : place === 'school' ? game.island !== 'arcade' && game.island !== 'classic' : false);
}
export function directionOf(value: unknown): 'a' | 'b' { return value === 'b' ? 'b' : 'a'; }
