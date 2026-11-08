import { Gesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { enqueueCommand, type Commands } from '../../mailbox';
import { swipeDirection } from '../../clock';
import type { RunInput } from './engine';
export type SwipeOrigin = {x:number;y:number};
/** Rebase after each command, so a left-then-up path works without finger-up. */
export function runSwipe(mailbox:SharedValue<Commands<RunInput>>,origin:SharedValue<SwipeOrigin>,threshold=20) {
 return Gesture.Pan().minDistance(0).maxPointers(1).onBegin(()=>{'worklet';origin.set({x:0,y:0});}).onUpdate(e=>{
  'worklet';
  const direction=swipeDirection(e.translationX-origin.value.x,e.translationY-origin.value.y,threshold);
  if(!direction)return;
  const type=direction==='up'?'jump':direction==='down'?'duck':direction;
  mailbox.set(enqueueCommand(mailbox.value,{type}));
  origin.set({x:e.translationX,y:e.translationY});
 }).onFinalize(()=>{'worklet';origin.set({x:0,y:0});});
}
