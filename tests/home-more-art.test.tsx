import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync } from 'node:fs';
import { MoreItemArt, RoomShellArt } from '../src/home/art/More';
import { ItemArt } from '../src/home/art/Items';
import { moreCatalog, tintIds, type TintId } from '../src/home/catalogMore';
import { catalog } from '../src/home/catalog';
import { shade } from '../src/home/art/Tint';
vi.mock('react-native-svg', () => {
  const tags = { default: 'svg', Circle: 'circle', Ellipse: 'ellipse', G: 'g', Path: 'path', Rect: 'rect', Defs: 'defs', Filter: 'filter', FeColorMatrix: 'feColorMatrix', Pattern: 'pattern', Text: 'text' };
  return Object.fromEntries(Object.entries(tags).map(([name, tag]) => [name, ({ children, accessible: _accessible, ...props }: Record<string, unknown>) => React.createElement(tag, props, children as React.ReactNode)]));
});
vi.mock('../src/home/art/Room', () => ({wallColors: {cream:'#F5E6C8', lagoon:'#C5DED3'}, floorColors: {sand:'#EBD7B2', honey:'#DDAE7D'}}));
vi.mock('../src/arcade/Art', () => ({StickerArt: () => null}));
const render = renderToStaticMarkup;
describe('free home art contract', () => {
  it('supplies distinct, tintable art for every free item and each active reaction', () => {
    expect(Object.keys(moreCatalog)).toHaveLength(41);
    const silhouettes = new Set<string>();
    for (const [id, spec] of Object.entries(moreCatalog)) {
      expect(spec.free).toBe(true);
      expect(spec.footprint.every(n => Number.isInteger(n) && n > 0)).toBe(true);
      expect(id in catalog).toBe(false);
      const original = render(<MoreItemArt id={id}/>);
      expect(original).toMatch(/<(path|ellipse|rect)/);
      silhouettes.add(original);
      for (const tint of tintIds.slice(1)) expect(render(<MoreItemArt id={id} tint={tint}/>)).not.toBe(original);
      if (spec.interactive) expect(render(<MoreItemArt id={id} active/>)).not.toBe(original);
    }
    expect(silhouettes.size).toBe(41);
  });
  it('keeps original legacy output by default and tints fabric without repainting wood', () => {
    for (const item of Object.keys(catalog) as (keyof typeof catalog)[]) expect(render(<ItemArt item={item}/>)).toBe(render(<ItemArt item={item} tint="original"/>));
    for (const item of ['bed','chair','rug','beanbag','lamp','toy-box'] as const) {
      const tinted = render(<ItemArt item={item} tint="lagoon"/>);
      expect(tinted).toContain('#58B9B1');
      expect(tinted).not.toBe(render(<ItemArt item={item}/>));
    }
    expect(shade('#000000', .2)).toBe('#333333');
    expect(shade('#FFFFFF', -.2)).toBe('#cccccc');
  });
  it('preserves the room wall, floor polygon and grid exactly and honours earned patterns', () => {
    const original = readFileSync('src/home/art/Room.tsx','utf8');
    for (const room of ['kitchen','treehouse','beach'] as const) {
      const svg = render(<RoomShellArt room={room} theme={{wallpaper:'cream',floor:'sand'}}/>);
      expect(svg).toContain('viewBox="0 0 800 560"');
      for (const path of ['M34 82L145 28L758 71V330L145 291L34 374Z','M34 374L145 291L758 330L779 508L162 535Z']) {expect(original).toContain(path);expect(svg).toContain(path);}
      expect(svg).toContain('M53 359L762 351'); expect(svg).toContain('M151 294L170 535');
      expect(render(<RoomShellArt room={room} theme={{wallpaper:'night-sky',floor:'game-room'}}/>)).toContain('url(#night-sky)');
    }
  });
  it('writes the reproducible review sheets when HOME_ART_EVIDENCE is set', () => {
    if (!process.env.HOME_ART_EVIDENCE) return;
    for (const size of [64,120]) {
      let html = '<!doctype html><meta charset="utf-8"><style>body{background:#f7f1e3;color:#385451;font:12px system-ui}section{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;width:140px;padding:8px;background:#fff9ed;border-radius:12px}figcaption{height:30px}svg{overflow:visible}</style>';
      for (const tint of ['original','coral','lagoon','night'] as TintId[]) {
        html += `<h2>${size}px · ${tint}</h2><section>`;
        for (const id of Object.keys(moreCatalog)) html += `<figure><figcaption>${id}</figcaption>${render(<MoreItemArt id={id} size={size} tint={tint}/>)}</figure>`;
        for (const item of Object.keys(catalog) as (keyof typeof catalog)[]) html += `<figure><figcaption>existing ${item}</figcaption>${render(<ItemArt item={item} size={size} tint={tint}/>)}</figure>`;
        html += '</section>';
      }
      html += '<h2>Active reactions</h2><section>';
      for (const [id,spec] of Object.entries(moreCatalog)) if(spec.interactive) html += `<figure><figcaption>${id}</figcaption>${render(<MoreItemArt id={id} size={size} active/>)}</figure>`;
      html += '</section><h2>Rooms with sample furniture</h2>';
      for(const room of ['kitchen','treehouse','beach'] as const) {
        html += `<h3>${room}</h3><div style="position:relative;width:800px;height:560px">${render(<RoomShellArt room={room} theme={{wallpaper:'cream',floor:'sand'}}/>)}`;
        for (const [id,x,y] of [['sofa',270,310],['side-table',420,360],['potted-fern',440,325]] as const) html+=`<div style="position:absolute;left:${x}px;top:${y}px">${render(<MoreItemArt id={id}/>)}</div>`;
        html+='</div>';
      }
      writeFileSync(`${process.env.HOME_ART_EVIDENCE}/sheet-${size}.html`, html);
    }
  });
});
