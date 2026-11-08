import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import {lagoonMeasurement} from './measurement';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { runOnJS, runOnUI, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { createMeter, recordFrame, summarizeFrames, eventWindows, type Meter } from './frameMeter';
import {runLearning,type RunState} from './engine';

export function runEventTags(a: RunState, b: RunState): string[] {
  'worklet';
  const tags: string[] = [];
  if (b.serial !== a.serial) tags.push('spawn');
  if(!runLearning(b) && b.rows.some(row=>row.z>1 && a.rows.some(old=>old.serial===row.serial && old.z<=1)))tags.push('hazard-front');
  if (b.shells > a.shells) tags.push('pickup');
  if (b.lane !== a.lane) tags.push('lane');
  if (b.jump > a.jump) tags.push('jump');
  if (b.duck > a.duck) tags.push('roll');
  if (b.landing > a.landing) tags.push('landing');
  if (b.lives.hit > a.lives.hit) tags.push('hit');
  if (b.edgeTime > a.edgeTime) tags.push('edge');
  if (b.nearMissEvent > a.nearMissEvent) tags.push('near-miss');
  if (b.powerEvent !== a.powerEvent) tags.push('power');
  return tags;
}
export function useRunMeter(requested: boolean, active: boolean, state: SharedValue<RunState>, tick: SharedValue<number>, tags: SharedValue<string[]>, replay: boolean, seed: number) {
  const enabled=lagoonMeasurement(Constants.expoConfig,requested);
  const ended=useSharedValue(-1);
  const pending=useSharedValue({tags:[] as string[],tick:0});
  const meter = useSharedValue(createMeter()), resumed = useSharedValue(true), saved = useSharedValue(false), elapsed = useSharedValue(0), totalElapsed = useSharedValue(0);
  const [label, setLabel] = useState('Warming up…');
  const receipt = useRef({ id: '', latest: createMeter() });
  const write = useCallback((m: Meter, s: RunState, final: boolean) => {
    // Only one second crosses the UI/JS boundary. Keep the full history on JS.
    const all=receipt.current.latest;
    all.samples=[...all.samples,...m.samples].slice(-36000);all.frames+=m.frames;all.elapsed+=m.elapsed;all.rateChanges+=m.rateChanges;all.cadence=m.cadence;
    for(const tag of Object.keys(m.events))all.events[tag]=[...(all.events[tag]??[]),...m.events[tag]].slice(-36000);
    const summary = summarizeFrames(all.samples);
    setLabel(`${replay?"Replay W1-8 · 771 | ":"UI "}${summary.fps.toFixed(1)} fps · p95 ${summary.gap.p95.toFixed(1)} · tick ${summary.tick.p95.toFixed(1)} ms · >33 ${summary.gap.histogram[4]}`);
    if (!final) return;
    if (!receipt.current.id) receipt.current.id = `lagoon-${Date.now()}-${seed}`;
    const output = { schema: 2, eventAttribution: 'tags on first following gap; eventWindows includes next three', eventWindows:eventWindows(all.samples), measurement: { deviceModel: process.env.EXPO_PUBLIC_LAGOON_DEVICE_MODEL ?? 'unrecorded', lowPowerMode: process.env.EXPO_PUBLIC_LAGOON_LOW_POWER ?? 'unrecorded' }, source: process.env.EXPO_PUBLIC_LAGOON_REVISION ?? 'unrecorded', kind: 'UI callback gaps; not presented frames', platform: Platform.OS, os: Platform.Version, seed, level: s.level === 'endless' ? 'endless' : s.level.id, replay, summary, steady: summarizeFrames(all.samples.slice(30)), ...all };
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(output)], {type:'application/json'})); link.download = `${receipt.current.id}.json`; link.click(); URL.revokeObjectURL(link.href);
      } else new File(Paths.document, `${receipt.current.id}.json`).write(JSON.stringify(output));
    } catch (error) { setLabel(`Meter export failed: ${String(error)}`); }
  }, [replay,seed]);
  const callback = useCallback<Parameters<typeof useFrameCallback>[0]>(info => {
    'worklet';
    if (!enabled || !active || saved.value) return;
    // Ignore first frame after mount/resume, not a background suspension counted as a hitch.
    if (resumed.value) { resumed.set(false);pending.set({tags:[],tick:0});tags.set([]); return; }
    const gap = info.timeSincePreviousFrame ?? 0;
    meter.modify(m => recordFrame(m,gap,pending.value.tick,pending.value.tags)); const next=meter.value;
    pending.set({tags:tags.value,tick:tick.value});tags.set([]);
    elapsed.set(elapsed.value + gap);totalElapsed.set(totalElapsed.value+gap);
    if(!replay && state.value.status!=='playing')ended.set(ended.value<0?3:Math.max(0,ended.value-1));
    const final = replay ? totalElapsed.value >= 60000 : ended.value===0;
    if (final || elapsed.value >= 1000) {
      elapsed.set(0);runOnJS(write)(next,state.value,final);
      // Preserve cadence hysteresis across batches, without copying the history on UI.
      meter.modify(m=>({...m,samples:[],frames:0,elapsed:0,events:{},rateChanges:0}));
    }
    if (final) saved.set(true);
  }, [enabled,active,ended,saved,resumed,pending,tags,tick,meter,elapsed,totalElapsed,replay,state,write]);
  const frame=useFrameCallback(callback,false);
  useEffect(() => { resumed.set(true); frame.setActive(enabled && active); return () => frame.setActive(false); }, [enabled, active, frame, resumed]);
  useEffect(() => () => {
    if(enabled)runOnUI(()=>{'worklet';runOnJS(write)(meter.value,state.value,true);})();
  }, [enabled,meter,state,write]);
  return label;
}
