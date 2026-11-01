import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { characterPose, rigBases, rigFaces, rigActions, rigIdle, rigFace } from '../src/islander/rig/character';
import { islanderAnchors, islanderOrigin, islanderPoint, crabAnchors, pipAnchors } from '../src/islander/rig/anchors';
import { Islander } from '../src/islander/rig/Islander';
import { RigCrab, Pip } from '../src/islander/rig/Companions';
import { rigMatrix, rigProofLooks, companionMatrix } from '../src/islander/rig/gallery';
import { resolvePose, type Point } from '../src/islander/rig/poses';
import { homeCharacterRigPose } from '../src/home/characterPose';
import { adaptLegacyCharacterRenderer, homeRenderInput } from '../src/home/characterRenderer';
vi.mock('react-native-svg', () => ({ default: 'svg', G: 'g', Path: 'path', Circle: 'circle', Ellipse: 'ellipse', Rect: 'rect', Text: 'text' }));

const lower = ['head', 'neck', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee', 'leftFoot', 'rightFoot'] as const;
describe('base-preserving character contract', () => {
  it.each(rigBases)('keeps %s lower body and anchor through every action', base => {
    const resting = characterPose(base);
    for (const action of rigActions) {
      const posed = characterPose(base, action);
      expect(posed.id).toBe(resting.id);
      for (const joint of lower) expect(posed.joints[joint]).toEqual(resting.joints[joint]);
      const legacy = base !== 'carry' && resolvePose('front', homeCharacterRigPose(base, action ?? undefined));
      if (legacy) for (const joint of lower) expect(legacy.joints[joint]).toEqual(resting.joints[joint]);
    }
  });
  it('dangles upright after lying, bends at most ten degrees and does not mutate authored joints', () => {
    const still = characterPose('carry'), before = JSON.stringify(still);
    const bent = characterPose('carry', null, 1, 6);
    expect(bent.id).toBe('carry');
    expect(bent.joints.head[1]).toBeLessThan(bent.joints.leftHip[1]);
    expect(bent.joints.leftFoot).not.toEqual(still.joints.leftFoot);
    for (const [root, tip] of [['leftHip','leftFoot'], ['leftShoulder','leftHand']] as const) {
      const angle = (p: typeof still) => Math.atan2(p.joints[tip][1]-p.joints[root][1], p.joints[tip][0]-p.joints[root][0]);
      expect(Math.abs(angle(bent)-angle(still))*180/Math.PI).toBeCloseTo(10);
    }
    expect(JSON.stringify(still)).toBe(before);
    expect(characterPose('carry', null, 2, 20)).toEqual(bent);
  });
  it('shares the home compatibility mapping without turning sleeping sitters into lying dolls', () => {
    expect(homeRenderInput(0, 'sit', 'lie-asleep', 90).face).toBe('neutral');
    const legacy = vi.fn(() => null), adapter = adaptLegacyCharacterRenderer(legacy);
    adapter(homeRenderInput(0, 'bathe', 'drink', 90));
    expect(legacy).toHaveBeenCalledWith(0, 'bathe', 'drink', 90, undefined, false);
  });
});
describe('anchor geometry', () => {
  it.each(rigBases)('contains the reasoned largest-wardrobe control hull and joints for %s', base => {
    for (const facing of ['left','right'] as const) for (const action of rigActions) for (const tilt of [-6,0,6]) {
      const options = { action, tilt, limbLag: 1, breath: 1 }, a = islanderAnchors(base, facing, options), b = a.bounds;
      const assertInside = (p: {x:number;y:number}) => {
        expect(p.x).toBeGreaterThanOrEqual(b.left-1e-7); expect(p.x).toBeLessThanOrEqual(b.left+b.width+1e-7);
        expect(p.y).toBeGreaterThanOrEqual(b.top-1e-7); expect(p.y).toBeLessThanOrEqual(b.top+b.height+1e-7);
      };
      // Hair control hull incl. pigtails (±39), knot (−40), brim (±33),
      // boots (foot ±7, bottom +5), skirt hem (+16), headset (±30).
      const points: Point[] = [[1,-2], [79,-2], [1,87], [79,87], [7,4], [73,28], [23,116], [57,116]];
      for (const p of points) assertInside(islanderPoint(p, base, facing, options));
      for (const p of Object.values(characterPose(base, action, 1, tilt).joints)) assertInside(islanderPoint(p, base, facing, options));
      const pose = characterPose(base, action, 1, tilt);
      expect(a.hand).toEqual(islanderPoint(pose.joints.rightHand, base, facing, options));
      for (const key of ['hand','mouth','head'] as const) expect(a[key].x).toBeCloseTo(-islanderAnchors(base, facing === 'left' ? 'right' : 'left', options)[key].x);
    }
  });
  it('uses the specified feet, seat, pillow, waterline and grip origins', () => {
    expect(rigBases.map(islanderOrigin)).toEqual([[40,132],[44,107],[44,46],[40,74],[40,66]]);
    expect(islanderAnchors('lie').head).toEqual({x:0,y:0});
  });
  it.each(rigBases)('has finite, anchor-relative companion contacts for %s', base => {
    for (const fn of [crabAnchors,pipAnchors]) for (const facing of ['left','right'] as const) for (const action of rigActions) {
      const a = fn(base,facing,{action});
      for (const p of [a.head,a.hand,a.mouth]) {
        expect(p.x).toBeGreaterThanOrEqual(a.bounds.left); expect(p.x).toBeLessThanOrEqual(a.bounds.left+a.bounds.width);
        expect(p.y).toBeGreaterThanOrEqual(a.bounds.top); expect(p.y).toBeLessThanOrEqual(a.bounds.top+a.bounds.height);
      }
    }
  });
});
describe('caller-controlled life', () => {
  it('blinks for 100–160ms at varied 3–6 second intervals', () => {
    const runs: {at:number;duration:number}[] = [];
    for(let time=0; time<54000; time++) {
      const blink = rigIdle(time).blink;
      if (blink && !rigIdle(time-1).blink) runs.push({at:time,duration:0});
      if (blink) runs[runs.length-1].duration++;
      expect(rigIdle(time).breath).toBeGreaterThanOrEqual(0);
      expect(rigIdle(time).breath*.004).toBeLessThanOrEqual(.005);
    }
    for (const [i,run] of runs.entries()) {
      expect(run.duration).toBeGreaterThanOrEqual(100); expect(run.duration).toBeLessThanOrEqual(160);
      if(i) {expect(run.at-runs[i-1].at).toBeGreaterThanOrEqual(3000);expect(run.at-runs[i-1].at).toBeLessThanOrEqual(6000);}
    }
    expect(new Set(runs.map((r,i) => i ? r.at-runs[i-1].at : 0)).size).toBeGreaterThan(2);
    expect(rigIdle(3150)).toEqual(rigIdle(3150));
    expect(rigIdle(3150,0,true)).toEqual({blink:false,breath:0});
  });
  it('restores the child mood beneath temporary action faces', () => {
    expect(rigFace('happy','thinking')).toBe('happy');
    expect(rigFace(null,'thinking')).toBe('thinking');
    expect(rigFace(undefined,'thinking','eat')).toBe('anticipate');
    expect(rigFace('chew','thinking','eat')).toBe('chew');
  });
  it('Reduced Motion removes idle inputs and secondary movement but preserves sleepy eyes', () => {
    const render = (extra: object) => renderToStaticMarkup(<Islander base="carry" face="sleepy" reduced {...extra}/>);
    expect(render({clock:3150,blink:true,breath:1,tilt:6,limbLag:1})).toBe(render({}));
    expect(render({})).toContain('closed-arcs');
  });
});
it('renders every base × action × face × facing across three diverse wardrobe looks and both companions', () => {
  expect(rigMatrix).toHaveLength(5*4*6*2*3); expect(companionMatrix).toHaveLength(2*5*4*6*2);
  for (const {input,look} of rigMatrix) {
    const svg = renderToStaticMarkup(<Islander {...input} look={look} held={<rect width={24} height={24}/>}/>);
    expect(svg).not.toMatch(/NaN|Infinity|undefined/); expect(svg).toContain(`data-base="${input.base}"`); expect(svg).toContain(`data-expression="${input.face}"`);
  }
  for (const {input} of companionMatrix) for (const Pet of [Pip,RigCrab]) expect(renderToStaticMarkup(<Pet {...input}/>)).not.toMatch(/NaN|Infinity|undefined/);
  expect(rigProofLooks).toHaveLength(3); expect(rigFaces).toHaveLength(6);
});

it('counter-reflects held content once while keeping it attached to the mirrored hand', () => {
  for (const Pet of [Islander, Pip, RigCrab]) {
    const svg = renderToStaticMarkup(<Pet base="sit" action="hold" facing="left" held={<text data-label="juice">Juice</text>}/>);
    expect(svg.match(/scale\(-1 1\)/g)).toHaveLength(2);
    expect(svg.match(/data-label="juice"/g)).toHaveLength(1);
  }
});
