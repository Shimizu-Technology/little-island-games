/** One contact: the drawn hand, inline held props and Home's hand anchor agree for every build. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Islander, IslanderShape } from '../src/islander/rig/Islander';
import { islanderAnchors, islanderPoint } from '../src/islander/rig/anchors';
import { characterPose, rigActions, rigBases } from '../src/islander/rig/character';
import { frontPoses, resolvePose, type Pose } from '../src/islander/rig/poses';
import { defaultLook, type IslanderLook } from '../src/islander/look';
vi.mock('react-native-svg', () => ({ default: 'svg', G: 'g', Path: 'path', Circle: 'circle', Ellipse: 'ellipse', Rect: 'rect', Text: 'text' }));
const builds = ['boy', 'girl', 'neutral'] as const;
const look = (build: string) => ({ ...defaultLook, build }) as IslanderLook;
/** The mitten's palm point is the second vertex of its outline. */
function drawnHand(markup: string, side: 'left' | 'right'): [number, number] {
  const d = new RegExp(`data-mitten="${side}"[^>]*\\sd="([^"]*)"|\\sd="([^"]*)"[^>]*data-mitten="${side}"`).exec(markup)!, path = d[1] ?? d[2];
  const palm = /^M[^Q]*Q[-\d.e]+ [-\d.e]+ ([-\d.e]+) ([-\d.e]+)/.exec(path)!;
  return [Number(palm[1]), Number(palm[2]) - 3];
}
const held = (markup: string) => { const m = /data-layer="held" transform="translate\(([-\d.e]+) ([-\d.e]+)\)"|transform="translate\(([-\d.e]+) ([-\d.e]+)\)" data-layer="held"/.exec(markup)!; return [Number(m[1] ?? m[3]) + 12, Number(m[2] ?? m[4]) + 12]; };
const shape = (pose: Pose, build: string) => renderToStaticMarkup(<svg><IslanderShape pose={pose} look={look(build)} held={<rect/>}/></svg>);
describe.each(builds)('%s build', build => {
  it('draws each hand on the shared joint in every front pose', () => {
    for (const pose of frontPoses) for (const side of ['left', 'right'] as const) {
      const hand = drawnHand(shape(pose, build), side);
      expect(hand[0]).toBeCloseTo(pose.joints[`${side}Hand`][0]); expect(hand[1]).toBeCloseTo(pose.joints[`${side}Hand`][1]);
    }
  });
  it('holds inline props in the drawn hand', () => {
    for (const id of ['hold', 'eat', 'drink', 'idle']) {
      const markup = shape(resolvePose('front', id), build), hand = drawnHand(markup, 'right'), prop = held(markup);
      expect(prop[0]).toBeCloseTo(hand[0]); expect(prop[1]).toBeCloseTo(hand[1]);
    }
  });
  it('gives Home the drawn hand for every base and action', () => {
    for (const base of rigBases) for (const action of rigActions) {
      const pose = characterPose(base, action), anchor = islanderAnchors(base, 'right', { action });
      const [x, y] = drawnHand(shape(pose, build), 'right'), point = islanderPoint([x, y], base, 'right', { action });
      expect(point.x).toBeCloseTo(anchor.hand.x); expect(point.y).toBeCloseTo(anchor.hand.y);
    }
  });
  it('keeps the arm attached: the sleeve reaches the hand', () => {
    expect(renderToStaticMarkup(<Islander look={look(build)}/>)).toContain('data-limb="right-arm"');
  });
});
it('builds still differ at the shoulder', () => {
  const arm = (build: string) => /data-limb="right-arm"[^>]*\sd="M([-\d.e]+)|\sd="M([-\d.e]+)[^>]*data-limb="right-arm"/.exec(shape(frontPoses[0], build))!.slice(1).find(Boolean);
  expect(new Set(builds.map(arm)).size).toBe(3);
});
