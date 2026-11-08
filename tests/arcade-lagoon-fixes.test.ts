import {expect,it} from 'vitest';
import {canoeMatrix,deckSide} from '../src/arcade/games/lagoon-run/bakedGeometry';
import {mapPoint,type Quad} from '../src/arcade/games/lagoon-run/quad';
import {projectTrack} from '../src/arcade/games/lagoon-run/camera';
import atlas from '../assets/arcade/lagoon/manifest.json';
it('keeps the entire canoe crop finite and bounded from the horizon through stern contact, in all lanes',()=>{
 for(let n=-119;n<=156;n++)for(const lane of [0,1,2]) {
  const z=n/100,frame=z<.35?0:z<.8?1:z<1.2?2:3,meta=atlas.canoes[frame];
  const q=[projectTrack(lane-.3,z),projectTrack(lane+.3,z),projectTrack(lane+.3,z-.18),projectTrack(lane-.3,z-.18)] as Quad,h=canoeMatrix(q,meta);
  for(const x of [0,meta.width])for(const y of [0,meta.height]) {
   const w=h[6]*x+h[7]*y+h[8],a=mapPoint(h,x,y);
   expect(w,`z=${z} frame=${frame}`).toBeGreaterThan(0);
   expect(Math.abs(a.x-q[0].x)).toBeLessThan(400*projectTrack(1,z).scale+2);
   expect(Math.abs(a.y-q[0].y)).toBeLessThan(400*projectTrack(1,z).scale+2);
  }
 }
});
it('restores full-height side skirts on each of the three incline sections',()=>{
 for(let i=0;i<3;i++) {
  const q=[{x:0,y:100,scale:i*20},{x:40,y:100,scale:i*20},{x:35,y:80,scale:(i+1)*20},{x:5,y:80,scale:(i+1)*20}];
  for(const side of ['left','right'] as const){const out=deckSide(q,side,true);expect(out[2].y-out[1].y).toBe(Math.max(5,(i+1)*20));expect(out[3].y-out[0].y).toBe(Math.max(5,i*20));}
 }
});

it('acknowledges a wrong learning answer without treating it as a physical hit',async()=>{
 const {runSounds}=await import('../src/arcade/games/lagoon-run/feedback');
 const {createRun}=await import('../src/arcade/games/lagoon-run/engine');
 const {runLevels}=await import('../src/arcade/games/scrolling/content');
 const a=createRun(runLevels.find(l=>l.world==='learn')!,771),b={...a,bumps:a.bumps+1};
 expect(runSounds(a,b)).toEqual(['shell-0']);expect(runSounds(a,a)).toEqual([]);
});

it('requires the dev-build marker for replay and file writing, regardless of URL or debug flag',async()=>{
 const {lagoonMeasurement}=await import('../src/arcade/games/lagoon-run/measurement');
 for(const config of [undefined,null,{}, {extra:{}},{extra:{lagoonMeasurement:'true'}},{extra:{lagoonMeasurement:false}}])expect(lagoonMeasurement(config,true)).toBe(false);
 expect(lagoonMeasurement({extra:{lagoonMeasurement:true}},true)).toBe(true);expect(lagoonMeasurement({extra:{lagoonMeasurement:true}},false)).toBe(false);
});
it('includes delayed pickup work in the three-gap window and marks truncated windows incomplete',async()=>{
 const {eventWindows}=await import('../src/arcade/games/lagoon-run/frameMeter');
 const result=eventWindows([{gap:16,tick:1,tags:['pickup']},{gap:50,tick:1,tags:[]},{gap:16,tick:1,tags:['jump']}]);
 expect(result.pickup[0]).toEqual({index:0,gaps:[16,50,16],worst:50,complete:true});expect(result.jump[0].complete).toBe(false);
});

it('refuses an unsafe config or an existing family native project before any native build',async()=>{
 const {assertDevConfig,assertDevNative}=await import('../scripts/ios-dev.mjs');
 expect(()=>assertDevConfig({ios:{bundleIdentifier:'com.shimizutechnology.littleisland'}})).toThrow(/Refusing/);
 expect(()=>assertDevNative(['PRODUCT_BUNDLE_IDENTIFIER = com.shimizutechnology.littleisland;'])).toThrow(/Refusing/);
 expect(()=>assertDevConfig({ios:{bundleIdentifier:'com.shimizutechnology.littleisland.dev'},scheme:'littleisland-dev',extra:{lagoonMeasurement:true}})).not.toThrow();
 expect(()=>assertDevNative(['PRODUCT_BUNDLE_IDENTIFIER = "com.shimizutechnology.littleisland.dev";'])).not.toThrow();
});
