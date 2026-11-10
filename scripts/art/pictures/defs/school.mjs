import { P, circle, ellipse, rect, path, line, poly, patch, group } from '../style.mjs';

const rod = (d, fill, w = 7) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: fill, sw: w - 4.5 })];

export default [
  {
    word: 'BOOK', meaning: 'a book', alt: 'A closed red book standing at a slight angle, with white page edges and a spine.',
    draw: () => [
      path('M30 12H94Q100 12 100 18V102Q100 108 94 108H30Z', P.paper), line('M36 100H96M36 94H96', { stroke: P.stone, sw: 2 }),
      path('M20 12H88V96H20Z', P.red), path('M20 12Q14 12 14 20V100Q14 110 24 110H94L94 102H26Q20 102 20 96Z', P.red),
      rect(30, 28, 46, 18, 3, P.gold, { sw: 2 }), line('M24 12V96', { stroke: P.coral, sw: 3 }),
    ],
  },
  {
    word: 'PENCIL', meaning: 'a pencil', alt: 'A yellow pencil lying on a slant, with a sharpened point and a pink eraser on the end.',
    draw: () => [
      group({ t: 'rotate(-40 60 60)' },
        rect(4, 50, 18, 20, 4, P.pink), rect(20, 48, 12, 24, 1, P.stone), rect(32, 48, 60, 24, 0, P.yellow),
        line('M32 56H92M32 64H92', { stroke: P.gold, sw: 2 }), path('M92 48L114 60L92 72Z', P.sand), path('M106 56L114 60L106 64Z', P.charcoal, { sw: 2 })),
    ],
  },
  {
    word: 'PEN', meaning: 'a ballpoint pen', otherMeaning: 'an animal pen', alt: 'A blue ballpoint pen lying on a slant, with a push button on top, a metal clip and a fine metal tip.',
    draw: () => [
      group({ t: 'rotate(-40 60 60)' },
        rect(2, 54, 12, 12, 3, P.navy), rect(12, 50, 76, 20, 7, P.blue), path('M88 52L104 58Q108 60 104 62L88 68Z', P.stone), line('M104 60H112', { sw: 3 }),
        path('M20 50V42H50V48', undefined, { stroke: P.ink, sw: 7 }), path('M20 50V42H50V48', undefined, { stroke: P.stone, sw: 2.5 }),
        rect(60, 50, 18, 20, 0, P.navy, { sw: 2 })),
    ],
  },
  {
    word: 'CRAYON', meaning: 'a crayon', alt: 'A red wax crayon lying on a slant, with a pointed tip and a paper wrapper.',
    draw: () => [
      group({ t: 'rotate(-40 60 60)' },
        rect(10, 46, 80, 28, 6, P.red), rect(24, 46, 52, 28, 0, P.coral), line('M24 46V74M76 46V74M32 52Q40 60 32 68M68 52Q60 60 68 68', { sw: 2 }),
        path('M90 48L112 56Q116 60 112 64L90 72Z', P.red)),
    ],
  },
  {
    word: 'SCISSORS', meaning: 'scissors', alt: 'A pair of open scissors with silver blades and red loop handles.',
    draw: () => [
      path('M52 66L108 20L114 28L60 74Z', P.stone), path('M52 54L112 92L106 100L46 62Z', P.stone),
      circle(58, 64, 4, P.charcoal),
      ellipse(28, 34, 18, 14, undefined, { stroke: P.ink, sw: 11 }), ellipse(28, 34, 18, 14, undefined, { stroke: P.red, sw: 6 }),
      ellipse(28, 92, 18, 14, undefined, { stroke: P.ink, sw: 11 }), ellipse(28, 92, 18, 14, undefined, { stroke: P.red, sw: 6 }),
      ...rod('M42 44L54 58M42 82L54 70', P.red, 10),
    ],
  },
  {
    word: 'GLUE', meaning: 'a bottle of glue', alt: 'A white bottle of school glue with an orange pointed cap and a drop of glue.',
    draw: () => [
      path('M52 6L60 2L68 6V24H52Z', P.orange), rect(44, 22, 32, 14, 4, P.orange),
      rect(30, 36, 60, 74, 10, P.paper), rect(30, 58, 60, 30, 0, P.blue, { sw: 2 }), path('M48 66Q60 58 72 66Q60 78 48 66Z', P.paper, { sw: 2 }),
      rect(30, 36, 60, 74, 10), path('M100 48Q108 58 108 62Q108 68 100 68Q92 68 92 62Q92 58 100 48Z', P.paper),
    ],
  },
  {
    word: 'RULER', meaning: 'a ruler for measuring', alt: 'A long yellow ruler lying on a slant, with tick marks along one edge.',
    draw: () => [
      group({ t: 'rotate(-35 60 60)' },
        rect(2, 44, 116, 32, 4, P.yellow),
        line(Array.from({ length: 21 }, (_, i) => `M${8 + i * 5.2} 44v${i % 5 === 0 ? 14 : i % 1 === 0 && i % 2 === 0 ? 9 : 6}`).join(''), { sw: 2 })),
    ],
  },
  {
    word: 'ERASER', meaning: 'a pencil eraser', alt: 'A pink rubber eraser rubbing out a grey pencil scribble, leaving little crumbs behind.',
    draw: () => [
      path('M10 96Q20 82 30 96Q40 110 50 96', undefined, { stroke: P.slate, sw: 3 }),
      circle(58, 102, 2.4, P.pink, { sw: 1.5 }), circle(66, 108, 2, P.pink, { sw: 1.5 }), circle(54, 112, 1.8, P.pink, { sw: 1.5 }),
      group({ t: 'rotate(-30 76 56)' }, path('M44 46L54 34H110L100 46Z', P.coral), path('M100 46L110 34V62L100 74Z', P.coral), path('M44 46H100V74H54L44 64Z', P.pink)),
    ],
  },
  {
    word: 'DESK', meaning: 'a school desk', alt: 'A wooden desk with a flat top and a set of drawers on one side.',
    draw: () => [
      rect(6, 34, 108, 12, 4, P.wood), rect(66, 46, 42, 64, 2, P.wood),
      rect(72, 52, 30, 16, 2, P.sand, { sw: 2 }), rect(72, 72, 30, 16, 2, P.sand, { sw: 2 }), rect(72, 92, 30, 14, 2, P.sand, { sw: 2 }),
      line('M83 60h8M83 80h8M83 99h8', { sw: 3 }), rect(14, 46, 10, 64, 3, P.brown),
      rect(20, 18, 26, 16, 2, P.red), rect(24, 12, 22, 6, 2, P.blue, { sw: 2 }),
    ],
  },
  {
    word: 'CHALK', meaning: 'sticks of chalk', alt: 'Three thick sticks of chalk, white, pink and blue, with a chalk scribble and dust on dark ground.',
    draw: () => [
      rect(6, 70, 108, 42, 10, P.charcoal), path('M16 98Q30 82 42 96Q52 108 62 94', undefined, { stroke: P.paper, sw: 4 }),
      circle(70, 92, 1.8, P.paper, { ns: true }), circle(76, 98, 1.6, P.paper, { ns: true }), circle(66, 102, 1.4, P.paper, { ns: true }),
      ...[[P.paper, -30, 18], [P.pink, -12, 44], [P.sky, 10, 72]].map(([c, r, x]) => group({ t: `rotate(${r} ${x + 14} 48)` }, rect(x, 18, 28, 62, 12, c), ellipse(x + 14, 24, 12, 5, c, { sw: 2 }))),
    ],
  },
  {
    word: 'EASEL', meaning: "an artist's easel", alt: "A wooden artist's easel on three tall legs, holding a half-painted canvas, with a paintbrush resting on its ledge.",
    draw: () => [
      line('M60 4L18 116M60 4L102 116M60 4V110', { stroke: P.ink, sw: 10 }), line('M60 4L18 116M60 4L102 116M60 4V110', { stroke: P.wood, sw: 5 }),
      rect(24, 16, 72, 54, 3, P.paper), path('M28 66L46 44L58 56L70 42L80 54V66Z', P.leaf, { sw: 2 }), circle(40, 30, 6, P.yellow, { sw: 2 }),
      rect(18, 70, 84, 8, 3, P.brown), line('M70 66L94 54', { stroke: P.ink, sw: 6 }), line('M70 66L94 54', { stroke: P.red, sw: 2 }),
    ],
  },
  {
    word: 'MAGNET', meaning: 'a horseshoe magnet', alt: 'A red horseshoe magnet with silver tips, pulling at a small nail.',
    draw: () => [
      path('M18 56V42Q18 10 60 10Q102 10 102 42V56H78V44Q78 32 60 32Q42 32 42 44V56Z', P.red),
      rect(18, 56, 24, 18, 2, P.stone), rect(78, 56, 24, 18, 2, P.stone),
      line('M30 82v8M90 82v8M24 80l-4 6M96 80l4 6M36 80l4 6M84 80l-4 6', { stroke: P.slate, sw: 2.5 }),
      group({ t: 'rotate(80 60 102)' }, rect(54, 92, 6, 26, 2, P.stone, { sw: 2 }), rect(50, 90, 14, 4, 1, P.stone, { sw: 2 })),
    ],
  },
  {
    word: 'TAPE', meaning: 'a roll of sticky tape', alt: 'A roll of clear sticky tape lying on its side, with a strip pulled out and hanging down.',
    draw: () => [
      path('M18 52V70Q18 92 60 92Q102 92 102 70V52', P.sky), ellipse(60, 52, 42, 22, P.sky), ellipse(60, 52, 24, 12, P.stone),
      ellipse(60, 52, 18, 8, P.paper, { ns: true }), path('M24 76Q30 86 46 88', undefined, { stroke: P.paper, sw: 3 }),
      path('M86 86L96 112L108 108L100 82Z', P.sky),
    ],
  },
  {
    word: 'STAMP', meaning: 'a postage stamp', alt: 'A postage stamp with bold zigzag edges and a little picture of a palm tree and the sun on a beach.',
    draw: () => {
      const zig = [];
      for (let i = 0; i <= 12; i++) zig.push(`${10 + i * 8.33},${i % 2 ? 16 : 6}`);
      for (let i = 1; i <= 12; i++) zig.push(`${i % 2 ? 104 : 114},${6 + i * 8.67}`);
      for (let i = 11; i >= 0; i--) zig.push(`${10 + i * 8.33},${i % 2 ? 104 : 114}`);
      for (let i = 11; i >= 1; i--) zig.push(`${i % 2 ? 16 : 6},${6 + i * 8.67}`);
      return [
        poly(zig.join(' '), P.paper),
        rect(24, 24, 72, 72, 2, P.sky, { sw: 2 }), path('M24 82Q60 70 96 82V96H24Z', P.sand, { sw: 2 }),
        line('M58 84Q60 60 52 42', { stroke: P.brown, sw: 4 }), path('M52 42Q40 34 30 40Q42 38 52 42Q50 28 40 26Q50 30 52 42Q62 30 76 32Q62 36 52 42Q66 40 72 50Q62 42 52 42Z', P.leaf, { sw: 1.5 }),
        circle(80, 38, 7, P.yellow, { sw: 2 }),
      ];
    },
  },
  {
    word: 'ENVELOPE', meaning: 'an envelope for a letter', alt: 'A plain closed white envelope seen from the back, with its pointed flap folded down.',
    draw: () => [
      rect(6, 24, 108, 72, 6, P.paper), path('M6 92L52 56M114 92L68 56', undefined, { sw: 2.5 }),
      path('M8 26L60 70L112 26Z', P.cream), patch('M14 30h8v4h-8Z', P.cream),
    ],
  },
  {
    word: 'MAP', meaning: 'a treasure map', alt: 'A folded paper map with blue water, green land, a dotted path and a red X.',
    draw: () => [
      path('M8 22L42 12L78 22L112 12V98L78 108L42 98L8 108Z', P.sand), path('M42 12V98M78 22V108', undefined, { sw: 2 }),
      path('M8 22L42 12V40Q24 44 8 40Z', P.sky, { sw: 2 }), path('M78 80Q96 76 112 84V98L78 108Z', P.sky, { sw: 2 }),
      path('M24 64Q30 50 46 54Q60 46 66 58Q80 60 74 76Q62 88 46 82Q26 84 24 64Z', P.leaf, { sw: 2 }),
      path('M20 92Q40 82 54 66Q70 50 92 40', undefined, { stroke: P.brown, sw: 3, dash: '5 6' }), line('M88 30L100 42M100 30L88 42', { stroke: P.red, sw: 5 }),
    ],
  },
  {
    word: 'GLOBE', meaning: 'a globe of the Earth', alt: 'A round globe of the Earth showing blue sea and green land, on a curved stand.',
    draw: () => [
      rect(42, 102, 36, 10, 4, P.wood), ...rod('M60 94V102', P.gold, 7),
      path('M29 23A44 44 0 0 0 91 85', undefined, { stroke: P.ink, sw: 8 }), path('M29 23A44 44 0 0 0 91 85', undefined, { stroke: P.gold, sw: 3.5 }),
      circle(60, 54, 36, P.blue),
      path('M38 30Q48 24 56 30Q54 42 44 44Q40 54 32 50Q28 40 38 30ZM62 50Q74 44 84 52Q92 66 80 78Q70 84 66 74Q58 62 62 50ZM44 70Q52 72 50 82Q44 84 42 78Z', P.leaf, { sw: 2 }),
      circle(60, 54, 36),
    ],
  },
  {
    word: 'CALENDAR', meaning: 'a wall calendar', alt: 'A wall calendar with two rings at the top, a red header and a grid of days with one day circled.',
    draw: () => [
      rect(12, 18, 96, 92, 8, P.paper), path('M12 26Q12 18 20 18H100Q108 18 108 26V40H12Z', P.red),
      ...[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3, 4].map(c => rect(22 + c * 16, 50 + r * 14, 10, 8, 2, r === 1 && c === 3 ? P.yellow : P.sky, { ns: true }))),
      circle(75, 68, 10, undefined, { stroke: P.red, sw: 3 }),
      ...rod('M36 10V26M84 10V26', P.stone, 8),
    ],
  },
  {
    word: 'TELESCOPE', meaning: 'a telescope', alt: 'A green telescope tube on a three-legged stand, pointing up at the sky.', basedOn: 'content/library/art/telescope.svg',
    draw: () => [
      group({ t: 'rotate(-25 60 50)' }, path('M22 38h72v25H22Z', P.leaf), path('M17 34h13v33H17Z', P.sky), path('M94 43h16v15H94Z', P.gold)),
      line('M60 65v17m0-3-28 29m28-29 28 29m-28-29v29'),
    ],
  },
  {
    word: 'COMPASS', meaning: 'a direction compass', otherMeaning: 'a drawing compass', alt: 'A round compass with a gold rim and a red and white needle pointing north.',
    draw: () => [
      circle(60, 62, 48, P.gold), circle(60, 62, 39, P.paper), rect(52, 6, 16, 10, 4, P.gold),
      line('M60 28v6M60 90v6M26 62h6M88 62h6', { sw: 3 }), line('M36 38l3 3M84 38l-3 3M36 86l3-3M84 86l-3-3', { sw: 2 }),
      path('M60 30L68 62H52Z', P.red, { sw: 2 }), path('M60 94L68 62H52Z', P.stone, { sw: 2 }), circle(60, 62, 4, P.charcoal),
    ],
  },
];
