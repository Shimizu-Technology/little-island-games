import { router } from 'expo-router';
import { arcadeIds, type ArcadeId } from '../arcade';
import { openShelfGame } from '../components/GameShelf';
import type { ShelfId } from '../learn/home';
import { directRoutes, type PlaceId } from './model';
export function placeRoute(place: PlaceId) {
 return place === 'school' ? '/school' as const : place === 'arcade' ? '/arcade' as const : place === 'hall' ? { pathname: '/shelf' as const, params: { island: 'classic' } } : directRoutes[place];
}
export function openGame(id: ShelfId) {
 if (arcadeIds.includes(id as ArcadeId)) router.push({ pathname: '/arcade', params: { game: id } });
 else openShelfGame(id);
}
