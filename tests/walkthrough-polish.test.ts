import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { badgeInfo, badgeRule, tracks, type BadgeId } from '../src/badges/engine';
import { thumbnailFocus } from '../src/personalization/thumbnail';
import { styleCatalog } from '../src/personalization/catalog';
import { characterPoint, itemPoint } from '../src/home/geometry';
import { starterHome } from '../src/home/model';
describe('walkthrough reward clarity', () => {
  for (const track of tracks) for (const tier of [1,2,3,4]) it(`${track}-${tier} names its track and matches documented copy`, () => {
    const id = `${track}-${tier}` as BadgeId, rule = badgeInfo(id).rule;
    expect(rule.toLowerCase()).toContain(track === 'chamoru' ? 'chamoru' : track);
    expect(readFileSync('docs/ISLANDER_REWARDS.md', 'utf8')).toContain(badgeRule(id));
  });
  it('gives every locked wardrobe item a visible track', () => {
    for (const item of styleCatalog.filter(i => !i.starter)) expect(item.track?.length).toBeGreaterThan(0);
  });
  it('frames wrist, neck and back accessories instead of reusing the head crop', () => {
    const focus = (value: string) => thumbnailFocus({ category: 'accessory', value });
    expect(focus('calculator-watch').box).toBe('39 68 52 52');
    expect(focus('flower-lei').box).toBe('9 43 62 62');
    expect(focus('checker-scarf')).toEqual(focus('flower-lei'));
    expect(focus('backpack').view).toBe('back');
    expect(focus('reading-glasses').box).toBe('5 0 70 70');
  });
  it('aligns the resized seated hip to each illustrated surface', () => {
    const home=starterHome();
    for(const [anchor,offset] of [['bed',-27],['chair',14],['rug',4]] as const) {
      const seat=home.instances.find(i=>i.item===anchor)!;
      expect(characterPoint(home,{slot:0,anchor,pose:'sit',seatId:seat.id}).y-itemPoint(seat).y).toBe(offset);
    }
  });
});
