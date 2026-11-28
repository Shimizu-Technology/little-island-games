import React from 'react';
import {act,create} from 'react-test-renderer';
import {expect,it,vi,afterEach} from 'vitest';
import {MarketSheet} from '../src/home/MarketSheet';
import {starterHome} from '../src/home/model';
const h=vi.hoisted(()=>({pans:[] as any[],touchMove:undefined as any}));
vi.mock('react-native',()=>({Platform:{OS:'web'},View:'view',Image:'image',Pressable:'pressable',ScrollView:'scroll',useWindowDimensions:()=>({width:390,height:844})}));
vi.mock('../src/ui/Sheet',()=>({Sheet:({children}:any)=>children}));
vi.mock('../src/ui/Text',()=>({Text:'text'}));
vi.mock('../src/ui/Button',()=>({Button:'button'}));
vi.mock('../src/home/art/More',()=>({MoreItemArt:()=>null}));
vi.mock('react-native-reanimated',()=>({
 default:{View:'animated-view'},useSharedValue:(initial:any)=>{
  const ref=React.useRef<any>(null);if(!ref.current)ref.current={value:initial,set(v:any){this.value=v;},get(){return this.value;}};return ref.current;
 },useAnimatedStyle:()=>({}),runOnJS:(fn:any)=>fn,withTiming:(v:any)=>v,
}));
vi.mock('react-native-gesture-handler',()=>({GestureDetector:({children}:any)=>children,Gesture:{Pan:()=>{
 const g:any={activateAfterLongPress:(ms:number)=>{g.delay=ms;return g;},minDistance:(n:number)=>{g.distance=n;return g;}};
 g.onStart=(fn:any)=>{g.start=fn;return g;};g.onUpdate=(fn:any)=>{g.update=fn;return g;};g.onEnd=(fn:any)=>{g.end=fn;return g;};g.onFinalize=(fn:any)=>{g.finalize=fn;return g;};h.pans.push(g);return g;
}}}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{h.pans=[];vi.useRealTimers();});
it('R1-04 leaves shelf swipes to scrolling until a deliberate hold; taps stay immediate and a held drop adds once',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000);
 const dispatch=vi.fn();let root!:ReturnType<typeof create>;
 await act(async()=>{root=create(<MarketSheet state={starterHome()} dispatch={dispatch} onHome={()=>{}} onClose={()=>{}} onUndo={()=>{}} canUndo={false} message="" reduced={false}/>,{createNodeMock:e=>({addEventListener:(_type:any,fn:any)=>{h.touchMove=fn;},removeEventListener:()=>{h.touchMove=undefined;},measureInWindow:(fn:any)=>fn(...((e.props as any).testID==='market-carry-basket'?[500,100,300,100]:[0,0,800,700]))})});});
 await act(async()=>root.root.findByProps({testID:'market-carry-basket'}).props.onLayout());
 const tile=()=>root.root.findByProps({testID:'market-stock-mango'});
 const pan=h.pans[0];
 expect(pan.delay).toBeGreaterThanOrEqual(140);expect(pan.distance).toBe(6);
 expect(root.root.findAllByProps({touchAction:"pan-y"}).length).toBeGreaterThan(0);
 const prevent=vi.fn();h.touchMove({preventDefault:prevent});expect(prevent).not.toHaveBeenCalled();
 // Failed/nonactivated shelf swipes never deliver a drop or suppress the next tap.
 await act(async()=>pan.finalize());expect(dispatch).not.toHaveBeenCalled();
 await act(async()=>tile().props.onPress());expect(dispatch).toHaveBeenCalledTimes(1);
 dispatch.mockClear();
 await act(async()=>pan.start({absoluteX:60,absoluteY:140}));
 h.touchMove({preventDefault:prevent});expect(prevent).toHaveBeenCalledTimes(1);
 await act(async()=>{pan.end({absoluteX:650,absoluteY:150});pan.finalize();});
 await act(async()=>tile().props.onPress());
 expect(dispatch).toHaveBeenCalledExactlyOnceWith({type:'market-add',item:'mango'});
 h.touchMove({preventDefault:prevent});expect(prevent).toHaveBeenCalledTimes(1);
 await act(async()=>root.unmount());
});
