import { boardIds, isBoardId } from '../board';
import { gameIds, type GameId } from '../games';
import { arcadeIds, type ArcadeId } from '../arcade/types';
import { activityIds } from '../state/activities';
import { engines } from './engines';
import { learnIds, type LearnId } from './types';
import type { ShelfId } from './home';
/** One route table is shared by every shelf and the reachability gate. */
export function gameDestination(id:ShelfId) {
  return {pathname:id==='reef-sweep'?'/challenge':isBoardId(id)?'/board':arcadeIds.includes(id as ArcadeId)?'/arcade':learnIds.includes(id as LearnId)?'/learn':gameIds.includes(id as GameId)?'/play':'/activity',params:{game:id}} as const;
}
export const registeredDestinations = [
  ...learnIds.map(id=>({id,door:'school',shelf:id==='hafa-adai'?'chamoru':engines[id].island,taps:id==='hafa-adai'?2:3,route:gameDestination(id)})),
  ...arcadeIds.map(id=>({id,door:'arcade',shelf:'arcade',taps:2,route:gameDestination(id)})),
  ...[...boardIds,...gameIds,...activityIds].map(id=>({id,door:'hall',shelf:'classic',taps:2,route:gameDestination(id)})),
];
export const bridgeFor = (game:LearnId,level:number,coveReady:boolean) =>
  (['logic-lagoon','pattern-path','shape-shift'] as LearnId[]).includes(game)&&coveReady ? {label:'Keep going in the Cove',route:{pathname:'/cove' as const}} :
  game==='beep-bot'&&level===5 ? {label:'Keep going with Crab Commands',route:gameDestination('crab-commands')} :
  game==='letter-lagoon' ? {label:'Keep going with Sound Boat',route:gameDestination('sound-boat')} : null;
export function assertReachable(ids:readonly string[], routes:readonly {id:string;taps:number;route:{pathname:string}}[], shelves:readonly {id:string}[], paths:readonly string[]) {
  if(new Set(routes.map(r=>r.id)).size!==routes.length || routes.length!==ids.length || routes.some(r=>!ids.includes(r.id)) || ids.some(id=>!routes.some(r=>r.id===id)))throw new Error('Every registered game needs one route.');
  for(const route of routes)if(route.taps>3 || route.taps<1 || !paths.includes(route.route.pathname) || !shelves.some(s=>s.id===route.id))throw new Error(`Unreachable game: ${route.id}`);
  if(shelves.some(s=>!routes.some(r=>r.id===s.id)))throw new Error('A shelf game has no route.');
}
