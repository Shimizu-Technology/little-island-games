import React, { createContext, useImperativeHandle, useLayoutEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { boundedPan, roomAt, roomPan } from './camera';
export const CameraPan = createContext<PanGesture | undefined>(undefined);
export type HouseCameraHandle = { jump: (index:number) => void; zoomRoom:(index:number)=>void; canActivate:()=>boolean };
/** Pan the empty scene; child object drags block this pan. Pinch works across children. */
export function HouseCamera({ children, initialIndex, width, height, sceneHeight, roomWidth, zoom, minZoom, maxZoom, reduced, onZoom, onRoom, cameraRef }: {
 children:ReactNode; initialIndex:number; width:number; height:number; sceneHeight:number; roomWidth:number; zoom:number; minZoom:number; maxZoom:number; reduced:boolean;
 onZoom:(zoom:number)=>void; onRoom:(index:number)=>void; cameraRef:React.Ref<HouseCameraHandle>;
}) {
 const x=useSharedValue(0), startX=useSharedValue(0), transient=useSharedValue(1), pinchX=useSharedValue(0);
 const focus=useSharedValue(initialIndex);
 const y=useSharedValue(0), startY=useSharedValue(0);
 const moving=useSharedValue(false), lastPan=useSharedValue(0);
 const jump=(index:number) => { focus.set(index);x.set(reduced?roomPan(index,roomWidth,width):withTiming(roomPan(index,roomWidth,width),{duration:260}));onRoom(index); };
 useImperativeHandle(cameraRef,()=>({jump,canActivate:()=>!moving.get() && Date.now()-lastPan.get()>300,zoomRoom:index=>{focus.set(index);onRoom(index);onZoom(zoom>minZoom*1.15?minZoom:1);}}));
 useLayoutEffect(()=>{
   x.set(roomPan(focus.get(),roomWidth,width));y.set(Math.min(0,(height-sceneHeight)/2));transient.set(1);
 },[roomWidth,width,height,sceneHeight,x,y,transient,focus]);
 const settle=(index:number)=>{focus.set(index);onRoom(index);};
 const commitZoom=(next:number,index:number)=>{focus.set(index);onRoom(index);onZoom(next);};
 const pan=Gesture.Pan().maxPointers(1).minDistance(8)
 .onStart(()=>{moving.set(true);startX.set(x.value);startY.set(y.value);})
 .onUpdate(e=>{if(e.numberOfPointers>1)return;x.set(boundedPan(startX.value+e.translationX,width,roomWidth*4));y.set(boundedPan(startY.value+e.translationY,height,sceneHeight));})
 .onEnd(()=>{runOnJS(settle)(roomAt(width/2-x.value,roomWidth));})
 // eslint-disable-next-line react-hooks/purity -- Gesture Handler invokes this callback after input; it is never evaluated during render.
 .onFinalize(()=>{if(moving.value){lastPan.set(Date.now());moving.set(false);}});
 const pinch=Gesture.Pinch().onStart(e=>{pinchX.set(e.focalX);})
 .onUpdate(e=>{transient.set(Math.max(minZoom,Math.min(maxZoom,zoom*e.scale))/zoom);})
 .onEnd(e=>{runOnJS(commitZoom)(Math.max(minZoom,Math.min(maxZoom,zoom*e.scale)),roomAt(pinchX.value-x.value,roomWidth));});
 const style=useAnimatedStyle(()=>({transform:[{translateX:x.value},{translateY:y.value},{scale:transient.value}],transformOrigin:'left center'}));
 return <CameraPan.Provider value={pan}><GestureDetector gesture={Gesture.Simultaneous(pinch,pan)} touchAction="none"><View testID="house-viewport" style={{width,height,overflow:'hidden',justifyContent:'center'}}><Animated.View testID="house-camera" style={[{width:roomWidth*4,height:sceneHeight},style]}>{children}</Animated.View></View></GestureDetector></CameraPan.Provider>;
}
