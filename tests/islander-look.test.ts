import { describe, expect, it } from 'vitest';
import { defaultLook, normalizeLook, isValidLook, hairStyles, hairColors, outfits, hats, accessories, skinTones, outfitPalettes } from '../src/islander/look';
import { anchorsFor, wardrobe } from '../src/islander/rig/wardrobe';
import { backPose, backPoses, frontPoses, runCycleFrames } from '../src/islander/rig/poses';
describe('Islander look boundary', () => {
  it('validates every catalog field and optional palette', () => {
    expect(isValidLook(defaultLook)).toBe(true);
    for (const [key, ids] of Object.entries({ hairStyle: hairStyles, hairColor: Object.keys(hairColors), outfit: outfits, hat: hats, accessory: accessories, skinTone: Object.keys(skinTones), palette: Object.keys(outfitPalettes) })) {
      for (const id of ids) expect(isValidLook({ ...defaultLook, [key]: id })).toBe(true);
      for (const invalid of ['unknown', null, 3, [], {}]) expect(isValidLook({ ...defaultLook, [key]: invalid })).toBe(false);
    }
  });
  it('rejects missing, extra and inherited selections; normalizes without mutating input', () => {
    for (const value of [null, [], 'look', 0, { ...defaultLook, extra: true }, { ...defaultLook, palette: undefined }, Object.create(defaultLook), {}]) expect(isValidLook(value)).toBe(false);
    const input = Object.freeze({ ...defaultLook, hairStyle: 'curls', hat: 'bad', palette: 'bad', extra: 5 });
    expect(normalizeLook(input)).toEqual({ ...defaultLook, hairStyle: 'curls' });
    expect(normalizeLook(null)).toEqual(defaultLook);
    for (const key of Object.keys(defaultLook)) { const missing = { ...defaultLook }; delete missing[key as keyof typeof missing]; expect(isValidLook(missing)).toBe(false); }
  });
});
describe('Islander skeleton and wardrobe contracts', () => {
  it('every claimed view has every declared attachment and a known layer', () => {
    expect(new Set(wardrobe.map(i => `${i.slot}:${i.id}`)).size).toBe(13);
    for (const item of wardrobe) for (const view of item.views) for (const pose of view === 'front' ? frontPoses : backPoses) for (const anchor of item.anchors) expect(anchorsFor(pose)[anchor].every(Number.isFinite)).toBe(true);
  });
  it('keeps every joint in bounds and each limb bone exactly constant in all poses', () => {
    for (const pose of [...frontPoses, ...backPoses]) {
      for (const p of Object.values(pose.joints)) { expect(p[0], pose.id).toBeGreaterThanOrEqual(0); expect(p[0], pose.id).toBeLessThanOrEqual(80); expect(p[1], pose.id).toBeGreaterThanOrEqual(0); expect(p[1], pose.id).toBeLessThanOrEqual(132); }
      for (const side of ['left', 'right'] as const) for (const [a,b,length] of [['Shoulder','Elbow',18],['Elbow','Hand',18],['Hip','Knee',22],['Knee','Foot',22]] as const) { const p=pose.joints[`${side}${a}`], q=pose.joints[`${side}${b}`]; expect(Math.hypot(p[0]-q[0],p[1]-q[1]), `${pose.id} ${side}${a}`).toBeCloseTo(length,7); }
    }
  });
  it('keeps gestures inside the frame and places the writing hand on the paper', () => {
    for (const pose of [...frontPoses, ...backPoses]) for (const side of ['left', 'right'] as const) {
      const hand = pose.joints[`${side}Hand`];
      expect(hand[0], pose.id).toBeGreaterThanOrEqual(5.05);
      expect(hand[0], pose.id).toBeLessThanOrEqual(74.95);
    }
    const writing = frontPoses.find(p => p.id === 'desk-write')!.joints.rightHand;
    expect(writing[0]).toBeGreaterThan(44); expect(writing[0]).toBeLessThan(52);
    expect(writing[1]).toBeGreaterThan(84); expect(writing[1]).toBeLessThan(90);
    expect(new Set(frontPoses.filter(p => p.id.startsWith('dance-')).map(p => JSON.stringify(p.joints))).size).toBe(4);
  });
  it('preserves the Run frame index contract and ground contact', () => {
    expect(runCycleFrames).toEqual([0,16,1,17,2,18,3,19,4,20,5,21,6,22,7,23]);
    for (const frame of [0,1,3,4,5,7,8,10,11,12,13,15]) expect(Math.max(backPose(frame).joints.leftFoot[1],backPose(frame).joints.rightFoot[1])).toBeCloseTo(128,5);
    for (const frame of [-1,24,NaN,1.5]) expect(() => backPose(frame)).toThrow();
  });
});
