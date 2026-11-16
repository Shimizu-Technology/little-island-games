import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { characterPose } from '../src/islander/rig/character';
import { Islander } from '../src/islander/rig/Islander';
import { Pip, RigCrab } from '../src/islander/rig/Companions';
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
