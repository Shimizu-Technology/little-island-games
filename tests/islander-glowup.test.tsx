import React from 'react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Islander } from '../src/islander/rig/Islander';
import { RigCrab, Pip } from '../src/islander/rig/Companions';
import { defaultLook, hairStyles, hats, skinTones, type IslanderLook } from '../src/islander/look';
import { frontPoses } from '../src/islander/rig/poses';

vi.mock('react-native-svg', () => ({
  default: 'svg',
  G: 'g',
  Path: 'path',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Rect: 'rect',
  Text: 'text',
  Defs: 'defs',
  LinearGradient: 'linearGradient',
  RadialGradient: 'radialGradient',
  Stop: 'stop',
}));

describe('Little Island 4.0 Islander storybook rebuild invariants', () => {
  it('uses warm storybook espresso ink on light/medium skin and deeper warm ink on cocoa/earth', () => {
    for (const skinTone of Object.keys(skinTones) as (keyof typeof skinTones)[]) {
      const html = renderToStaticMarkup(<Islander look={{ ...defaultLook, skinTone }} />);
      const dark = skinTone === 'cocoa' || skinTone === 'earth';
      expect(html).toContain(dark ? '#231512' : '#3B2418');
      expect(html).not.toContain('#493E38');
      expect(html).toContain('<radialGradient');
      expect(html).toContain('<linearGradient');
    }
  });

  it('renders luminous soulful storybook eyes with sclera, warm iris glow, and dual catchlights on open front faces', () => {
    const html = renderToStaticMarkup(<Islander look={defaultLook} pose={frontPoses[0]} />);
    expect(html).toContain('#FFFDF8');
    expect(html).toContain('#2A1A14');
    expect(html).toContain('#7A4934');
    expect(html).toContain('#FFFFFF');
    // Dual catchlight compound path has 4 subpaths across both open eyes.
    const whiteCatchlight = /<path[^>]*fill="#FFFFFF"[^>]*d="([^"]+)"|<path[^>]*d="([^"]+)"[^>]*fill="#FFFFFF"/.exec(html);
    const d = whiteCatchlight?.[1] ?? whiteCatchlight?.[2] ?? '';
    expect(d.match(/M/g)).toHaveLength(4);
  });

  it('gives RigCrab and Pip warm espresso ink, painterly gradients, and dual-catchlight eyes', () => {
    for (const Pet of [RigCrab, Pip]) {
      const html = renderToStaticMarkup(<Pet base="stand" />);
      expect(html).toContain('#3B2418');
      expect(html).toContain('#2A1A14');
      expect(html).toContain('#7A4934');
      expect(html).toContain('<radialGradient');
      expect(html).not.toContain('#493E38');
    }
  });

  it('renders rosy cheek glow and chin/forehead shading without leaking blush to back views', () => {
    const look: IslanderLook = { ...defaultLook, cheeks: 'rosy', hairStyle: 'long-wavy', outfit: 'sundress' };
    const front = renderToStaticMarkup(<Islander view="front" pose="idle" look={look} />);
    const back = renderToStaticMarkup(<Islander view="back" pose={0} look={look} />);
    expect(front).toContain('#F47968');
    expect(front).toContain('#FFF8E8');
    expect(back).not.toContain('#E88D7D');
    expect(back).not.toContain('#F47968');
  });

  it('exports a high-res visual proof showcase when ISLANDER_GLOWUP_SHEET is set', () => {
    const dir = process.env.ISLANDER_GLOWUP_SHEET;
    if (!dir) return;
    const fixSvg = (markup: string) =>
      markup
        .replaceAll('strokeWidth=', 'stroke-width=')
        .replaceAll('strokeLinecap=', 'stroke-linecap=')
        .replaceAll('strokeLinejoin=', 'stroke-linejoin=')
        .replaceAll('fillOpacity=', 'fill-opacity=')
        .replaceAll('strokeOpacity=', 'stroke-opacity=')
        .replaceAll('stopColor=', 'stop-color=')
        .replaceAll('stopOpacity=', 'stop-opacity=');
    const looks: { label: string; look: IslanderLook; view?: 'front' | 'back'; pose?: string | number; face?: 'happy' | 'surprised' | 'sleepy'; base?: 'stand' }[] = [
      { label: 'Hero 1 · Honey · Ponytail · Hibiscus Sundress · Sneakers', look: { skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'espresso', outfit: 'sundress', palette: 'sunset', hat: 'none', accessory: 'none', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sneakers', shoeColor: 'coral' } },
      { label: 'Hero 2 · Cocoa · Afro Puffs · Glasses · Open Hoodie · Boots', look: { skinTone: 'cocoa', hairStyle: 'afro-puffs', hairColor: 'espresso', outfit: 'hoodie', palette: 'star-sneakers', hat: 'none', accessory: 'glasses', presentation: 'girl', build: 'neutral', cheeks: 'rosy', lashes: 'none', shoes: 'boots', shoeColor: 'honey' } },
      { label: 'Hero 3 · Honey · Crop · Sunhat · Denim Overalls · Sandals', look: { skinTone: 'honey', hairStyle: 'crop', hairColor: 'espresso', outfit: 'overalls', hat: 'sunhat', accessory: 'none', presentation: 'boy', build: 'boy', cheeks: 'rosy', lashes: 'none', shoes: 'sandals', shoeColor: 'honey' } },
      { label: 'Hero 4 · Honey · Long Wavy · Sundress · Flower Crown', look: { skinTone: 'honey', hairStyle: 'long-wavy', hairColor: 'espresso', outfit: 'sundress', hat: 'flower-crown', accessory: 'none', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sandals', shoeColor: 'coral' } },
      { label: 'Expr 1 · Laughing (Proud) · Ponytail', look: { skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'espresso', outfit: 'sundress', palette: 'sunset', hat: 'none', accessory: 'none', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sneakers', shoeColor: 'coral' }, pose: 'clap' },
      { label: 'Expr 2 · Surprised · Ponytail', look: { skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'espresso', outfit: 'sundress', palette: 'sunset', hat: 'none', accessory: 'none', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sneakers', shoeColor: 'coral' }, pose: 'try-again' },
      { label: 'Expr 3 · Sleepy · Ponytail', look: { skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'espresso', outfit: 'sundress', palette: 'sunset', hat: 'none', accessory: 'none', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sneakers', shoeColor: 'coral' }, base: 'stand', face: 'sleepy' },
      { label: 'Expr 4 · Star Eyes (Cheer) · Ponytail', look: { skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'espresso', outfit: 'sundress', palette: 'sunset', hat: 'none', accessory: 'none', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sneakers', shoeColor: 'coral' }, pose: 'cheer' },
      { label: 'Boy · Earth · Side Part · Polo · Cap · Sneakers', look: { skinTone: 'earth', hairStyle: 'side-part', hairColor: 'jet-black', outfit: 'polo-shorts', hat: 'cap', accessory: 'glasses', presentation: 'boy', build: 'boy', brows: 'straight', lashes: 'none', shoes: 'sneakers', shoeColor: 'cream' } },
      { label: 'Girl · Cocoa · Afro Puffs · Ruffle Dress · Lei', look: { skinTone: 'cocoa', hairStyle: 'afro-puffs', hairColor: 'midnight', outfit: 'ruffle-dress', hat: 'none', accessory: 'flower-lei', presentation: 'girl', build: 'girl', cheeks: 'rosy', lashes: 'lashes', shoes: 'sandals', shoeColor: 'honey' } },
      { label: 'Boy · Shell · Short Spiky · Varsity · Rain Boots', look: { skinTone: 'shell', hairStyle: 'short-spiky', hairColor: 'copper', outfit: 'varsity-jacket', hat: 'none', accessory: 'backpack', presentation: 'boy', build: 'boy', freckles: 'freckles', cheeks: 'rosy', shoes: 'rain-boots', shoeColor: 'lagoon' } },
      { label: 'Girl · Sand · Braids · Comet Gown · Galaxy Hair', look: { skinTone: 'sand', hairStyle: 'braids', hairColor: 'galaxy', outfit: 'comet-gown', hat: 'none', accessory: 'reading-glasses', presentation: 'girl', build: 'girl', lashes: 'lashes', cheeks: 'rosy', shoes: 'sandals', shoeColor: 'lilac' } },
      { label: 'Explorer · Cocoa · Curls · Woven Sunhat · Boots', look: { skinTone: 'cocoa', hairStyle: 'curls', hairColor: 'espresso', outfit: 'explorer', hat: 'woven-sunhat', accessory: 'calculator-watch', presentation: 'me', build: 'neutral', cheeks: 'rosy', shoes: 'boots', shoeColor: 'honey' } },
      { label: 'Storybook · Shell · Bob · Storybook Dress · Beanie', look: { skinTone: 'shell', hairStyle: 'bob', hairColor: 'auburn', outfit: 'storybook-dress', hat: 'bookworm-beanie', accessory: 'checker-scarf', presentation: 'girl', build: 'girl', freckles: 'freckles', lashes: 'lashes', shoes: 'boots', shoeColor: 'coral' } },
      { label: 'Back Run-0 · Honey · Ponytail · Sunhat · Backpack', look: { skinTone: 'honey', hairStyle: 'ponytail', hairColor: 'chestnut', outfit: 'aloha-shorts', hat: 'sunhat', accessory: 'backpack', shoes: 'flip-flops', shoeColor: 'lagoon' }, view: 'back', pose: 0 },
      { label: 'Lying Asleep · Cocoa · Buzz Cut · Hoodie', look: { skinTone: 'cocoa', hairStyle: 'buzz-cut', hairColor: 'jet-black', outfit: 'hoodie', hat: 'none', accessory: 'none', presentation: 'boy', build: 'boy' }, pose: 'lie-asleep' },
    ];
    const cards = looks
      .map(({ label, look, view = 'front', pose = view === 'back' ? 0 : 'idle', base, face }) =>
        `<div class="card"><div class="stage">${fixSvg(renderToStaticMarkup(base ? <Islander base={base} face={face} look={look} size={176} /> : <Islander view={view} pose={pose} look={look} size={176} />))}</div><div class="lbl">${label}</div></div>`
      )
      .join('');
    const hairCards = hairStyles
      .map(
        (hairStyle, idx) =>
          `<div class="card small"><div class="stage">${fixSvg(renderToStaticMarkup(<Islander view="front" pose="idle" look={{ ...defaultLook, hairStyle, skinTone: (['shell', 'sand', 'honey', 'earth', 'cocoa'] as const)[idx % 5], hairColor: (['espresso', 'auburn', 'honey', 'jet-black', 'chestnut', 'copper', 'blonde', 'midnight', 'pink', 'sky-blue', 'plum', 'mint', 'galaxy', 'lightning-streak'] as const)[idx], cheeks: 'rosy', lashes: idx % 2 ? 'lashes' : 'none' }} size={132} />))}</div><div class="lbl">${hairStyle}</div></div>`
      )
      .join('');
    const hatCards = hats
      .map(
        (hat) =>
          `<div class="card small"><div class="stage">${fixSvg(renderToStaticMarkup(<Islander view="front" pose="idle" look={{ ...defaultLook, hat, hairStyle: 'long-wavy', cheeks: 'rosy', lashes: 'lashes' }} size={132} />))}</div><div class="lbl">${hat}</div></div>`
      )
      .join('');
    const pets = [
      { label: 'RigCrab · Happy', svg: renderToStaticMarkup(<RigCrab base="stand" face="happy" size={140} />) },
      { label: 'RigCrab · Sit · Surprised', svg: renderToStaticMarkup(<RigCrab base="sit" face="surprised" size={140} />) },
      { label: 'Pip · Happy', svg: renderToStaticMarkup(<Pip base="stand" face="happy" size={140} />) },
      { label: 'Pip · Lie · Sleepy', svg: renderToStaticMarkup(<Pip base="lie" face="sleepy" size={140} />) },
    ]
      .map((p) => `<div class="card small"><div class="stage">${fixSvg(p.svg)}</div><div class="lbl">${p.label}</div></div>`)
      .join('');

    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'glowup-heroes.html'),
      `<!doctype html><meta charset="utf-8"><title>Islander 4.0 Avatar Rebuild Heroes</title><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#FFFDF8;color:#3B2418;font:600 13px -apple-system,sans-serif}h1{margin:0 0 12px;font-size:20px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card{background:#FFF8EC;border:1.5px solid #EFE0C6;border-radius:20px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px}.stage{height:192px;display:flex;align-items:center;justify-content:center;width:100%;background:radial-gradient(circle at 50% 42%,#FFFDF8 0%,#E6F5F1 68%,#FCECD2 100%);border-radius:16px}.lbl{text-align:center;font-size:11px;line-height:1.35}</style><h1>Little Island 4.0 · Islander Avatar Rebuild Showcase</h1><div class="grid">${cards}</div>`
    );
    writeFileSync(
      join(dir, 'glowup-hair-hats-pets.html'),
      `<!doctype html><meta charset="utf-8"><title>Hair, Hats & Companions</title><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#FFFDF8;color:#3B2418;font:600 13px -apple-system,sans-serif}h2{margin:14px 0 8px;font-size:17px}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{background:#FFF8EC;border:1.5px solid #EFE0C6;border-radius:18px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px}.stage{height:142px;display:flex;align-items:center;justify-content:center;width:100%;background:#EBF6F2;border-radius:12px}.lbl{text-align:center;font-size:11px}</style><h2>All 14 Hairstyles (Sampled Across 5 Skin Tones &amp; Hair Colors)</h2><div class="grid">${hairCards}</div><h2>All 8 Hats (with Long Wavy Hair)</h2><div class="grid4">${hatCards}</div><h2>Companions (RigCrab & Pip)</h2><div class="grid4">${pets}</div>`
    );
  });
});
