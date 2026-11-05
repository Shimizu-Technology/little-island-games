/** The drawing surface holds the whole wardrobe without overflow, and layout and scale stay as they were. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { svgExtent } from './svg-bounds';
import { RunnerFrameArt } from '../src/arcade/games/scrolling/CharacterArt';
import { Islander, IslanderShape } from '../src/islander/rig/Islander';
import { islanderAnchors, islanderOrigin } from '../src/islander/rig/anchors';
import { rigActions, rigBases } from '../src/islander/rig/character';
import { backPoses, frontPoses, poseBox, resolvePose } from '../src/islander/rig/poses';
import { accessories, defaultLook, hairStyles, hats, outfits, type IslanderLook } from '../src/islander/look';
vi.mock('react-native-svg', () => ({ default: 'svg', G: 'g', Path: 'path', Circle: 'circle', Ellipse: 'ellipse', Rect: 'rect', Text: 'text' }));
vi.mock('../src/arcade/Sprite', () => ({ ArcadeSprite: () => null }));
vi.mock('../src/islander/active', () => ({ useActiveIslanderLook: () => ({}) }));

const sample = [frontPoses[0], ...frontPoses.filter(p => /sit-front|^lie$|cheer|carry|dance-1/.test(p.id)), backPoses[0], backPoses[8], backPoses[11], backPoses[2], backPoses[6]];
const look = (patch: Partial<IslanderLook>) => ({ ...defaultLook, ...patch }) as IslanderLook;
function fits(markup: string) {
  const box = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(markup)!.slice(1).map(Number), e = svgExtent(markup);
  expect(e.left).toBeGreaterThanOrEqual(box[0]); expect(e.top).toBeGreaterThanOrEqual(box[1]);
  expect(e.right).toBeLessThanOrEqual(box[0] + box[2]); expect(e.bottom).toBeLessThanOrEqual(box[1] + box[3]);
}
describe('wardrobe stays on the drawing surface', () => {
  it('every hair under every hat on each build', () => {
    for (const hairStyle of hairStyles) for (const hat of hats) for (const build of ['boy', 'girl', 'neutral']) for (const pose of sample)
      fits(renderToStaticMarkup(<Islander pose={pose} view={pose.view} look={look({ hairStyle, hat, build } as Partial<IslanderLook>)}/>));
  });
  it('every outfit and accessory through every pose', () => {
    for (const outfit of outfits) for (const pose of [...frontPoses, ...backPoses]) fits(renderToStaticMarkup(<Islander pose={pose} view={pose.view} look={look({ outfit, hairStyle: 'top-knot' })}/>));
    for (const accessory of accessories) for (const pose of [...frontPoses, ...backPoses]) fits(renderToStaticMarkup(<Islander pose={pose} view={pose.view} look={look({ accessory, hairStyle: 'top-knot' })}/>));
  });
  it('the Home rig in every base, action, facing and tilt', () => {
    for (const base of rigBases) for (const action of rigActions) for (const facing of ['left', 'right'] as const) for (const tilt of [-6, 0, 6]) for (const hairStyle of ['top-knot', 'long-wavy'] as const)
      fits(renderToStaticMarkup(<Islander base={base} action={action} facing={facing} tilt={tilt} limbLag={1} breath={1} look={look({ hairStyle })}/>));
  });
  it('the arcade runner, whose surface never allowed overflow', () => {
    for (const frame of backPoses.keys()) fits(renderToStaticMarkup(<RunnerFrameArt frame={frame} look={look({ hairStyle: 'top-knot', outfit: 'comet-gown' })}/>));
  });
  it('top-knot reaches above the old box, so a surface starting at 0 would crop it', () => {
    expect(svgExtent(renderToStaticMarkup(<svg><IslanderShape pose={frontPoses[0]} look={look({ hairStyle: 'top-knot' })}/></svg>)).top).toBeLessThan(0);
  });
  it('hems and headsets stop at the ground in every run frame', () => {
    for (const pose of backPoses) for (const patch of [{ outfit: 'comet-gown' }, { outfit: 'ruffle-dress' }, { outfit: 'storybook-dress' }, { accessory: 'coder-headset' }] as Partial<IslanderLook>[])
      expect(svgExtent(renderToStaticMarkup(<svg><IslanderShape pose={pose} look={look(patch)}/></svg>)).bottom).toBeLessThan(133);
  });
});
describe('layout, scale and anchors do not move', () => {
  const props = (markup: string) => ({ width: Number(/\swidth="([\d.]+)"/.exec(markup)![1]), height: Number(/\sheight="([\d.]+)"/.exec(markup)![1]), margin: Number(/margin:(-?[\d.]+)px/.exec(markup)![1]), view: /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(markup)!.slice(1).map(Number) });
  it.each([['idle', 120], ['idle', 64], ['lie', 224], ['sit-front', 90]] as const)('static %s at %d', (id, size) => {
    const pose = resolvePose('front', id), box = poseBox(pose), scale = size / 132, m = renderToStaticMarkup(<Islander pose={id} size={size}/>), p = props(m);
    expect(p.width + p.margin * 2).toBeCloseTo(box.width * scale); expect(p.height + p.margin * 2).toBeCloseTo(box.height * scale);
    expect(p.width / p.view[2]).toBeCloseTo(scale);
    // Source (0,0) still lands on the layout box corner.
    expect(p.view[0] * scale + -p.margin).toBeCloseTo(0); expect(p.view[1] * scale + -p.margin).toBeCloseTo(0);
    expect(m).not.toContain('overflow');
  });
  it.each(rigBases)('Home rig %s', base => {
    const scale = 224 / 132, box = islanderAnchors(base).bounds, m = renderToStaticMarkup(<Islander base={base} size={224}/>), p = props(m);
    expect(p.width + p.margin * 2).toBeCloseTo(box.width * scale); expect(p.height + p.margin * 2).toBeCloseTo(box.height * scale);
    expect(p.width / p.view[2]).toBeCloseTo(scale);
    expect((p.view[0] - box.left) * scale).toBeCloseTo(p.margin); expect((p.view[1] - box.top) * scale).toBeCloseTo(p.margin);
    expect(m).not.toContain('overflow');
  });
  it('keeps the anchor contract', () => {
    expect(islanderAnchors('stand').bounds).toEqual({ left: -42, top: -136, width: 84, height: 140 });
    expect(islanderOrigin('stand')).toEqual([40, 132]);
  });
  it('runner keeps its sprite box', () => {
    const p = props(renderToStaticMarkup(<RunnerFrameArt frame={0} look={defaultLook} size={132}/>));
    expect(p.width + p.margin * 2).toBeCloseTo(80); expect(p.height + p.margin * 2).toBeCloseTo(132); expect(p.width / p.view[2]).toBeCloseTo(1);
  });
});
