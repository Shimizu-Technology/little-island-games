import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { enqueueCommand, type Commands } from '../../mailbox';
import { swipeDirection } from '../../clock';
import type { RunInput } from './engine';
export type SwipeOrigin = {x:number;y:number;last?:'left'|'right'|'up'|'down'};
/** One command per deliberate segment; continuing a direction cannot repeat it. */
export function runSwipe(mailbox:SharedValue<Commands<RunInput>>,origin:SharedValue<SwipeOrigin>,threshold=20) {
 return Gesture.Pan().minDistance(0).maxPointers(1).onBegin(()=>{'worklet';origin.set({x:0,y:0});}).onUpdate(e=>{
  'worklet';
  const old=origin.value,dx=e.translationX-old.x,dy=e.translationY-old.y;
  const direction=swipeDirection(dx,dy,old.last?Math.max(32,threshold):threshold);
  if(!direction)return;
  if(direction===old.last){origin.set({x:e.translationX,y:e.translationY,last:old.last});return;}
  // A longer, axis-dominant turn separates an intentional chain from thumb drift.
  if(old.last && Math.max(Math.abs(dx),Math.abs(dy))<1.8*Math.min(Math.abs(dx),Math.abs(dy)))return;
  const type=direction==='up'?'jump':direction==='down'?'duck':direction;
  mailbox.set(enqueueCommand(mailbox.value,{type}));
  origin.set({x:e.translationX,y:e.translationY,last:direction});
 }).onFinalize(()=>{'worklet';origin.set({x:0,y:0});});
}
