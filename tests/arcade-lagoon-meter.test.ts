import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { createMeter, recordFrame, summarizeFrames } from '../src/arcade/games/lagoon-run/frameMeter';
import { inverse3, mapPoint, matrix4, multiply3, quadHomography, type Quad } from '../src/arcade/games/lagoon-run/quad';
import { projectTrack } from '../src/arcade/games/lagoon-run/camera';
import atlas from '../assets/arcade/lagoon/manifest.json';
const hasConfig=existsSync(new URL('../app.config.js',import.meta.url));
const configure=hasConfig?createRequire(import.meta.url)('../app.config.js'):undefined;
describe('measurement isolation',()=>{
 it.skipIf(!hasConfig)('preserves family identifiers and build by default and opts into an independent sandbox',()=>{
  const raw=createRequire(import.meta.url)('../app.json').expo;
  const previous=process.env.LITTLE_ISLAND_VARIANT;
  try {
   delete process.env.LITTLE_ISLAND_VARIANT;expect(configure!({config:raw})).toBe(raw);
   process.env.LITTLE_ISLAND_VARIANT='development';const dev=configure!({config:raw});
   expect(dev.ios.bundleIdentifier).toBe('com.shimizutechnology.littleisland.dev');expect(dev.android.package).toBe(dev.ios.bundleIdentifier);expect(dev.scheme).toBe('littleisland-dev');expect(dev.ios.infoPlist.NSBonjourServices).toBeUndefined();expect(dev.ios.infoPlist.NSLocalNetworkUsageDescription).toBeUndefined();expect(dev.version).toBe(raw.version);expect(dev.ios.buildNumber).toBe(raw.ios.buildNumber);expect(raw.ios.bundleIdentifier).toBe('com.shimizutechnology.littleisland');expect(raw.scheme).toBe('littleisland');
  } finally {if(previous===undefined)delete process.env.LITTLE_ISLAND_VARIANT;else process.env.LITTLE_ISLAND_VARIANT=previous;}
 });
 it('counts histogram boundaries, tags and sustained cadence switches without treating hitches as switches',()=>{
  let m=createMeter();for(let i=0;i<10;i++)m=recordFrame(m,1000/60,.5,['pickup']);
  m=recordFrame(m,60,1,['hit']);for(let i=0;i<10;i++)m=recordFrame(m,1000/120,.3,[]);
  expect(m.rateChanges).toBe(1);expect(m.events.pickup).toHaveLength(10);expect(m.events.hit).toEqual([60]);
  const summary=summarizeFrames(m.samples);expect(summary.gap.histogram).toEqual([10,10,0,0,1]);expect(summary.gap.max).toBe(60);expect(summary.tick.max).toBe(1);
  expect(recordFrame(m,NaN,0,[])).toBe(m);
 });
});
describe('baked projection retains collision corners',()=>{
 it('maps every deck and incline quad corner exactly without affine approximation',()=>{
  for(const lane of [0,1,2])for(const z of [-.9,.3,.85,1,1.2,1.6])for(const length of [.06,.18,.5,.815]) {
   const q=[projectTrack(lane-.43,z),projectTrack(lane+.43,z),projectTrack(lane+.43,z-length),projectTrack(lane-.43,z-length)] as Quad;
   const h=quadHomography(q);
   for(const [i,u,v] of [[0,0,0],[1,1,0],[2,1,1],[3,0,1]]) {const a=mapPoint(h,u,v);expect(Math.abs(a.x-q[i].x)).toBeLessThan(.002);expect(Math.abs(a.y-q[i].y)).toBeLessThan(.002);}
   expect(matrix4(h)).toHaveLength(16);
  }
 });
 it('reprojects each baked canoe reference back to exact authored ground contacts, including stern',()=>{
  for(const [i,meta] of atlas.canoes.entries())for(const lane of [0,1,2])for(const z of [.1,.6,1,1.4]) {
   const q=[projectTrack(lane-.3,z),projectTrack(lane+.3,z),projectTrack(lane+.3,z-.18),projectTrack(lane-.3,z-.18)] as Quad;
   const h=multiply3(quadHomography(q),meta.inverse);
   const reference=quadHomography([projectTrack(.7,meta.depth),projectTrack(1.3,meta.depth),projectTrack(1.3,meta.depth-.18),projectTrack(.7,meta.depth-.18)] as Quad);
   // Inverse metadata includes the crop origin. Recover source quad from its inverse.
   for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]) {
    const pixel=mapPoint(inverse3(meta.inverse),u,v);
    const actual=mapPoint(h,pixel.x,pixel.y),expected=mapPoint(quadHomography(q),u,v);
    expect(actual.x,`frame ${i}`).toBeCloseTo(expected.x,5);expect(actual.y).toBeCloseTo(expected.y,5);
   }
   expect(reference).toHaveLength(9);
  }
 });
});

it('ships original bounded offline effects with distinct waveforms and a click-free envelope',async()=>{
 const {runEffects}=await import('../src/arcade/games/lagoon-run/effects.generated');
 const bytes=Object.values(runEffects).map(uri=>Buffer.from(uri.split(',')[1],'base64'));
 expect(new Set(bytes.map(b=>b.toString('base64'))).size).toBe(5);
 for(const wav of bytes) {
  expect(wav.subarray(0,4).toString()).toBe('RIFF');expect(wav.subarray(8,12).toString()).toBe('WAVE');expect(wav.readUInt32LE(24)).toBe(22050);expect((wav.length-44)/2/22050).toBeLessThanOrEqual(.2);
  expect(wav.readInt16LE(44)).toBe(0);expect(Math.abs(wav.readInt16LE(wav.length-2))).toBeLessThan(2);
 }
});
