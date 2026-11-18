import React from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { characterPose } from '../src/islander/rig/character';
import { Islander } from '../src/islander/rig/Islander';
import { Pip, RigCrab } from '../src/islander/rig/Companions';
import { companionContacts } from '../src/islander/rig/anchors';
import { LandingPreview } from '../src/home/runtime/LandingPreview';
import { TargetCue } from '../src/home/runtime/TargetCue';
import { labFixtures } from '../src/home/runtime/lab';
import { buildScene } from '../src/home/scene/graph';
import { buildingLayout } from '../src/home/camera';
import type { Interaction } from '../src/home/runtime/useInteraction';

vi.mock('react-native', () => ({ View: 'view' }));
vi.mock('react-native-svg', () => Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath','Text','LinearGradient','Stop','Pattern'].map(k => [k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('react-native-reanimated', () => ({ default: { View: 'animated-view' }, useAnimatedStyle: (fn: any) => fn(), useAnimatedReaction: () => {} }));
vi.mock('../src/home/runtime/EntityArt', () => ({ EntityArt: () => <div data-extra-character="true"/>, artFrame: (e: any) => e.bounds }));

const scene = buildScene(labFixtures.delight());
const friend = scene.entities['character/0'];
const interaction = (kind: string) => ({ slots: { value: [{ id: friend.id, ready: true, phase: 'dragging', proposal: { kind, room: friend.room, contact: friend.contact, base: friend.base, facing: friend.facing } }] },
  restingFlags: { value: { dragTargets: ['mouth'] } } } as unknown as Interaction);

describe('H4b confirmed renderer defects', () => {
  it('an interrupted/restored meal never leaves a bare hand at the mouth', () => {
    for (const action of ['eat','drink'] as const) {
      const pose = characterPose('stand', action);
      expect(pose.joints.rightHand[1]).toBeGreaterThan(80);
      const html = renderToStaticMarkup(<Islander base="stand" action={action}/>);
      expect(html).toContain('data-expression="chew"');
      expect(html).not.toContain('data-expression="anticipate"');
    }
  });
  it('a landing carries only footprints, with no second character art', () => {
    const html = renderToStaticMarkup(<LandingPreview source={friend} interaction={interaction('floor')} building={buildingLayout(4)}/>);
    expect(html).toContain('landing-footprints');
    expect(html).not.toContain('data-extra-character');
  });
  it('a mouth has its own unfilled cue beside the chin', () => {
    const target = scene.rooms[friend.room].targets.find(t => t.owner === friend.id && t.kind === 'mouth')!;
    const html = renderToStaticMarkup(<TargetCue target={{ ...target, id: 'mouth' }} interaction={interaction('mouth')}/>);
    expect(html).toContain('mouth-target-halo');
    expect(html).toContain('fill="none"');
    expect(html).not.toContain('ellipse');
  });
  it('all faces support clamped transient pupil direction', () => {
    for (const Rig of [Islander,Pip,RigCrab]) {
      const left = renderToStaticMarkup(<Rig base="stand" gaze={{ x: -1, y: -.5 }}/>);
      const right = renderToStaticMarkup(<Rig base="stand" gaze={{ x: 1, y: -.5 }}/>);
      expect(left).toContain('data-gaze="pupils"');
      expect(left).not.toEqual(right);
      expect(renderToStaticMarkup(<Rig base="stand" gaze={{ x: 100, y: -.5 }}/>)).toEqual(right);
    }
  });
});

it('Pip keeps its drinking vessel below and in front of its mouth at contact', () => {
 const c=companionContacts('pip','stand','drink',{reach:1,bite:false,chew:false});
 expect(c.hand[1]-c.mouth[1]).toBeGreaterThanOrEqual(20);
 expect(c.hand[0]).toBeLessThan(c.mouth[0]);
});

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
it('each furniture socket and container owns one visible outline', async () => {
 for (const kind of ['socket','container'] as const) {
  const target: any={id:'mouth',kind,contact:{x:300,y:300}};
  let root!:ReturnType<typeof create>;
  await act(async()=>{root=create(<TargetCue target={target} interaction={interaction(kind)}/>);});
  expect(root.root.findByProps({testID:'socket-landing-outline'}).props.style[1].opacity).toBe(1);
  await act(async()=>root.unmount());
 }
});
it('the whole mouth cue stays beyond the face silhouette', async () => {
 const target=scene.rooms[friend.room].targets.find(t=>t.owner===friend.id && t.kind==='mouth')!;
 let root!:ReturnType<typeof create>;
 await act(async()=>{root=create(<TargetCue target={{...target,id:'mouth'}} interaction={interaction('mouth')}/>);});
 const style=root.root.findByProps({testID:'mouth-target-halo'}).props.style[0];
 expect(style.left+style.width).toBeLessThan(target.face!.x-target.face!.headRadius);
 await act(async()=>root.unmount());
});

it('drinking has a sip mouth and both chewing frames keep a content smile', () => {
 const sip=renderToStaticMarkup(<Islander base="stand" action="drink" meal={{reach:1,bite:false,chew:false}}/>);
 expect(sip).toContain('data-mouth="sip"');
 for (const chew of [true,false]) {
  const html=renderToStaticMarkup(<Islander base="stand" action="eat" face="chew" meal={{reach:0,bite:false,chew}}/>);
  expect(html).toContain('data-mouth="chew"');
  expect(html).not.toContain('M-6 21q6-2 12 0');
 }
});
