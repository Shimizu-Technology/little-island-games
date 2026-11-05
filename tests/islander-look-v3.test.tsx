import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultLook, hairColors, hairStyles, hats, isValidLook, outfits, skinTones } from '../src/islander/look';
import { wardrobeRewards } from '../src/islander/rewards';
import { hairDrawings, hairFor, hairTones, mapPath } from '../src/islander/rig/hairArt';
import { backPoses, frontPoses } from '../src/islander/rig/poses';
import { Islander } from '../src/islander/rig/Islander';
import { buildShape, garmentFor } from '../src/islander/rig/Clothes';
import { audienceFor, audienceOrder, styleCatalog } from '../src/personalization/catalog';
import { thumbnailFocus } from '../src/personalization/thumbnail';
import { backfillRewards } from '../src/badges/transitions';
import { grantCatalog, grantsFor } from '../src/badges/engine';
import { initializePersonalization, personFor, validPerson } from '../src/personalization/model';
import { parseSave, emptySave } from '../src/state/validation';
vi.mock('react-native-svg', () => ({ default: 'svg', G: 'g', Path: 'path', Circle: 'circle', Ellipse: 'ellipse', Rect: 'rect', Text: 'text' }));
const numbers = (d: string) => [...d.matchAll(/(-?\d*\.?\d+)[ ,]*(-?\d*\.?\d+)/g)].map(m => [Number(m[1]), Number(m[2])] as const);
describe('hair drawings', () => {
  it('keeps the 14 saved ids and every hair control point near the art box', () => {
    expect(hairStyles).toHaveLength(14);
    for (const style of hairStyles) for (const drawing of [hairDrawings[style]]) for (const layer of [drawing.front, drawing.back, drawing.rear, drawing.swing, drawing.crown, drawing.backBehind]) {
      if (!layer?.base) continue;
      for (const [x, y] of numbers(layer.base)) { expect(Math.abs(x), `${style} x`).toBeLessThanOrEqual(45); expect(y, `${style} y`).toBeGreaterThanOrEqual(-46); }
    }
  });
  it('gives every style its own hairline and silhouette, front and back', () => {
    expect(new Set(hairStyles.map(s => hairDrawings[s].front.base ?? hairDrawings[s].front.fade)).size).toBe(14);
    expect(new Set(hairStyles.map(s => `${hairDrawings[s].back.base}${hairDrawings[s].swing?.base}${hairDrawings[s].backBehind?.base}${hairDrawings[s].backCrown?.base}`)).size).toBe(14);
  });
  it('hangs braids and long hair in front of the shoulders', () => {
    for (const style of ['braids', 'long-straight', 'long-wavy'] as const) {
      const ys = numbers(hairDrawings[style].front.base!).map(p => p[1]);
      expect(Math.max(...ys), style).toBeGreaterThan(33);
      const svg = renderToStaticMarkup(<Islander look={{ ...defaultLook, hairStyle: style }}/>);
      expect(svg.indexOf('data-layer="front-hair"')).toBeGreaterThan(svg.indexOf('data-layer="clothing"'));
    }
  });
  it('covers the top of the head with no rim of skin on the short styles', () => {
    for (const style of ['buzz-cut', 'mohawk-fade'] as const) {
      const pts = numbers((hairDrawings[style].front.fade ?? hairDrawings[style].front.base)!);
      expect(pts.some(([x, y]) => x === -28.7 && y === -9)).toBe(true);
      expect(pts.some(([x, y]) => x === 0 && y === -28.7)).toBe(true);
    }
  });
  it('derives four distinct tones for every colour and skin, and black hair keeps visible form', () => {
    for (const color of Object.keys(hairColors) as (keyof typeof hairColors)[]) for (const skin of Object.keys(skinTones) as (keyof typeof skinTones)[]) {
      const t = hairTones(color, skin);
      expect(new Set([t.base, t.shade, t.shine, t.line]).size, `${color} ${skin}`).toBe(4);
      for (const tone of Object.values(t)) expect(tone).toMatch(/^#[0-9a-f]{6}$/i);
    }
    const lum = (c: string) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16), black = hairTones('jet-black', 'honey');
    expect(lum(black.shine) - lum(black.base)).toBeGreaterThan(90);
  });
  it('packs every crown under a hat and drops the bun, and bakes roll variants without transforms', () => {
    for (const style of hairStyles) {
      const hatted = hairFor(style, true, false);
      for (const [, y] of numbers(hatted.front.base ?? hatted.front.fade ?? hatted.front.fadeHigh!)) expect(y, style).toBeGreaterThanOrEqual(-34);
      const rolled = hairFor(style, false, true);
      for (const [, y] of numbers(rolled.back.base ?? rolled.back.fade!)) expect(y, style).toBeGreaterThanOrEqual(-20);
    }
    expect(hairFor('top-knot', true, false).crown).toBeUndefined();
    expect(hairFor('top-knot', false, false).crown).toBeDefined();
    expect(mapPath('M1 2C3 4 5 6 7 8Z', (x, y) => [x * 2, y + 1])).toBe('M2 3C6 5 10 7 14 9Z');
  });
  it('renders every hair and hat, front and back, including roll frames, with swing only when running', () => {
    for (const hairStyle of hairStyles) for (const hat of hats) for (const pose of [frontPoses[0], backPoses[0], backPoses[12]]) {
      expect(renderToStaticMarkup(<Islander view={pose.view} pose={pose} look={{ ...defaultLook, hairStyle, hat }}/>)).not.toMatch(/NaN|undefined|Infinity/);
    }
    const hair = (frame: number) => renderToStaticMarkup(<Islander view="back" pose={frame} look={defaultLook}/>).split('data-layer="front-hair"')[1];
    expect(hair(1)).not.toBe(hair(5));
    expect(hair(9)).toContain('rotate(0 0 -18)');
  });
  it('keeps the earned colours special on every style', () => {
    for (const hairStyle of hairStyles) {
      expect(renderToStaticMarkup(<Islander look={{ ...defaultLook, hairStyle, hairColor: 'galaxy' }}/>)).toContain('data-hair-special="galaxy"');
      expect(renderToStaticMarkup(<Islander look={{ ...defaultLook, hairStyle, hairColor: 'lightning-streak' }}/>)).toContain('data-hair-special="lightning"');
    }
  });
});
describe('garments', () => {
  it('has a garment for every outfit and a build you can see', () => {
    for (const outfit of outfits) { const look = { ...defaultLook, outfit, ...(outfit === 'mix' ? { top: 'tee' as const, bottom: 'shorts' as const } : {}) }; expect(isValidLook(look)).toBe(true); expect(garmentFor(look).top).toBeTruthy(); }
    const boy = buildShape('boy'), girl = buildShape('girl');
    expect(boy.sh - girl.sh).toBeGreaterThanOrEqual(3); expect(boy.wa - girl.wa).toBeGreaterThanOrEqual(4);
    expect(girl.hp - girl.wa).toBeGreaterThanOrEqual(3);
  });
  it('draws no bare waist: the skin torso stays inside every garment at the waist', () => {
    const svg = renderToStaticMarkup(<Islander look={{ ...defaultLook, build: 'girl', outfit: 'number-tee' }}/>);
    expect(svg).toContain('L33 81L34 98H46L47 81L51 71');
  });
});
describe('audience tags', () => {
  it('matches the approved sorting table and hides nothing', () => {
    const list = (category: Parameters<typeof audienceFor>[0], audience: string) => styleCatalog.filter(i => i.category === category && i.audience === audience).map(i => i.value).sort();
    expect(list('hairStyle', 'girls')).toEqual(['afro-puffs', 'bob', 'braids', 'long-straight', 'long-wavy', 'pigtails', 'ponytail', 'top-knot']);
    expect(list('hairStyle', 'boys')).toEqual(['buzz-cut', 'crop', 'mohawk-fade', 'short-spiky', 'side-part']);
    expect(list('hairStyle', 'everyone')).toEqual(['curls']);
    for (const id of ['sundress', 'skirt-tee', 'jersey-dress']) expect(audienceFor('outfit', id)).toBe('girls');
    for (const id of ['board-shorts-set', 'polo-shorts', 'aloha-shorts']) expect(audienceFor('outfit', id)).toBe('boys');
    for (const id of ['island', 'explorer', 'hoodie', 'number-tee', 'robot-tee', 'lab-coat', 'lagoon-jersey', 'overalls', 'pirate', 'space-suit', 'mix']) expect(audienceFor('outfit', id)).toBe('everyone');
    expect(list('bottom', 'girls')).toEqual(['skirt']); expect(list('bottom', 'boys')).toEqual(['board-shorts', 'cargo-shorts']); expect(list('bottom', 'everyone')).toEqual(['shorts', 'trousers']);
    expect(list('hat', 'girls')).toEqual(['flower-crown']); expect(list('hat', 'boys')).toEqual(['cap', 'captain-cap']); expect(list('hat', 'everyone')).toEqual(['bookworm-beanie', 'none', 'runner-headband', 'sunhat', 'woven-sunhat']);
    expect(audienceFor('skinTone', 'honey')).toBeUndefined();
    expect(styleCatalog.filter(i => i.category === 'outfit')).toHaveLength(outfits.length);
  });
  it('balances the wardrobe, including earned girls outfits', () => {
    const outfit = styleCatalog.filter(i => i.category === 'outfit'), girls = outfit.filter(i => i.audience === 'girls'), boys = outfit.filter(i => i.audience === 'boys');
    expect(Math.abs(girls.length - boys.length)).toBeLessThanOrEqual(1);
    expect(girls.filter(i => !i.starter).length).toBeGreaterThanOrEqual(3);
    expect(boys.filter(i => !i.starter).length).toBeGreaterThanOrEqual(2);
    const badges = wardrobeRewards.map(r => r.badge); expect(new Set(badges).size).toBe(badges.length);
  });
  it('leads with the child\'s own section, and Me leads with Everyone', () => {
    expect(audienceOrder('girl')[0]).toBe('girls'); expect(audienceOrder('boy')[0]).toBe('boys'); expect(audienceOrder('me')[0]).toBe('everyone'); expect(audienceOrder(undefined)[0]).toBe('everyone');
    for (const p of ['girl', 'boy', 'me', undefined] as const) expect([...audienceOrder(p)].sort()).toEqual(['boys', 'everyone', 'girls']);
  });
  it('frames each hair tile wide enough for its defining feature', () => {
    const box = thumbnailFocus({ category: 'hairStyle', value: 'braids' }).box.split(' ').map(Number);
    expect(box[1] + box[3]).toBeGreaterThanOrEqual(38 + 54); expect(box[1]).toBeLessThanOrEqual(38 - 41.6);
    expect(box[0]).toBeLessThanOrEqual(0); expect(box[0] + box[2]).toBeGreaterThanOrEqual(80);
  });
});
describe('new rewards reach children who already hold the badge', () => {
  const holder = () => { const save = backfillRewards(emptySave()), p = save.personalization!.people.family;
    // A child who earned Problem Solver before Star dress existed.
    const milestones = [...p.milestones, 'learn:shell-math:3', 'learn:number-hop:1', 'learn:reef-race:1'];
    const earned = grantsFor(['math-1', 'math-2', 'math-3']).filter(id => id !== 'outfit:star-dress');
    return { ...save, personalization: { ...save.personalization!, people: { ...save.personalization!.people, family: { ...p, milestones, earned } } } }; };
  it('grants once, marks it new, keeps everything else, and does not mutate the input', () => {
    const save = holder(), raw = JSON.stringify(save), next = backfillRewards(save), person = personFor(next);
    expect(JSON.stringify(save)).toBe(raw);
    expect(person.earned).toContain('outfit:star-dress'); expect(person.unseen).toEqual(['outfit:star-dress']);
    for (const id of personFor(save).earned) expect(person.earned).toContain(id);
    expect(backfillRewards(next)).toBe(next);
    expect(validPerson(person)).toBe(true);
    expect(() => parseSave(JSON.stringify(next))).not.toThrow();
  });
  it('gives nothing to a child without the badge and every grant is in the catalog', () => {
    const save = backfillRewards(initializePersonalization(emptySave()));
    expect(personFor(save).earned).not.toContain('outfit:star-dress');
    for (const r of wardrobeRewards) expect(grantCatalog()).toContain(`${r.slot.toLowerCase()}:${r.id}`);
  });
});
