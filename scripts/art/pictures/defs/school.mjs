import { P, circle, ellipse, rect, path, line, poly, group } from '../style.mjs';

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
    word: 'PEN', meaning: 'a ballpoint pen', otherMeaning: 'an animal pen', alt: 'A blue ballpoint pen lying on a slant, with a cap and a pocket clip.',
    draw: () => [
      group({ t: 'rotate(-40 60 60)' },
        rect(10, 52, 76, 16, 6, P.paper), path('M86 52L106 58Q110 60 106 62L86 68Z', P.stone), line('M106 60H114', { sw: 3 }),
        rect(8, 50, 36, 20, 7, P.blue), path('M18 50V42H44V46', undefined, { stroke: P.ink, sw: 6 }), path('M18 50V42H44V46', undefined, { stroke: P.blue, sw: 2 })),
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
    word: 'ERASER', meaning: 'a pencil eraser', alt: 'A pink rubber eraser block with a worn corner and a few crumbs, next to a pencil line being rubbed out.',
    draw: () => [
      path('M8 104Q30 92 52 100', undefined, { stroke: P.slate, sw: 3, dash: '6 6' }),
      group({ t: 'rotate(-25 66 58)' }, path('M30 44H100V76H40Q30 76 30 66Z', P.pink), path('M30 44L44 30H112L100 44Z', P.coral), path('M100 44L112 30V62L100 76Z', P.coral),
        rect(54, 44, 30, 32, 0, P.sky, { sw: 2 })),
      circle(24, 96, 3, P.pink, { sw: 1.5 }), circle(34, 104, 2.4, P.pink, { sw: 1.5 }), circle(16, 108, 2, P.pink, { sw: 1.5 }),
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
    word: 'CHALK', meaning: 'a stick of chalk', alt: 'A white stick of chalk drawing a line on a small green chalkboard.',
    draw: () => [
      rect(8, 14, 104, 74, 6, P.brown), rect(16, 22, 88, 58, 2, P.forest, { sw: 2 }),
      path('M26 64Q38 36 52 56Q62 72 72 46', undefined, { stroke: P.paper, sw: 4 }),
      group({ t: 'rotate(-35 80 88)' }, rect(62, 80, 40, 14, 6, P.paper)), circle(66, 104, 2, P.paper, { sw: 1.5 }), circle(74, 108, 1.6, P.paper, { sw: 1.5 }),
    ],
  },
  {
    word: 'EASEL', meaning: "an artist's easel", alt: "A wooden artist's easel with three legs holding a canvas painting of a sun and hills.",
    draw: () => [
      ...rod('M60 8L24 114M60 8L96 114M60 8V108', P.wood, 9),
      rect(22, 18, 76, 58, 3, P.paper), path('M26 72L48 46L62 58L76 44L94 72Z', P.leaf, { sw: 2 }), circle(42, 34, 7, P.yellow, { sw: 2 }),
      rect(18, 76, 84, 8, 3, P.brown),
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
    word: 'STAMP', meaning: 'a postage stamp', alt: 'A postage stamp with zigzag edges and a little picture of a palm tree and the sun.',
    draw: () => {
      const zig = [];
      for (let i = 0; i <= 10; i++) zig.push(`${18 + i * 8.4},${i % 2 ? 14 : 8}`);
      for (let i = 1; i <= 12; i++) zig.push(`${i % 2 ? 108 : 102},${8 + i * 8.5}`);
      for (let i = 9; i >= 0; i--) zig.push(`${18 + i * 8.4},${i % 2 ? 106 : 112}`);
      for (let i = 11; i >= 1; i--) zig.push(`${i % 2 ? 12 : 18},${8 + i * 8.5}`);
      return [
        poly(zig.join(' '), P.paper),
        rect(26, 22, 68, 76, 2, P.sky, { sw: 2 }), path('M26 84Q60 72 94 84V98H26Z', P.sand, { sw: 2 }),
        line('M62 86Q64 64 56 48', { stroke: P.brown, sw: 4 }), path('M56 48Q44 40 36 46Q46 44 56 48Q54 34 44 32Q54 36 56 48Q66 36 78 38Q66 42 56 48Q70 46 76 56Q66 48 56 48Z', P.leaf, { sw: 1.5 }),
        circle(80, 36, 7, P.yellow, { sw: 2 }),
      ];
    },
  },
  {
    word: 'ENVELOPE', meaning: 'an envelope for a letter', alt: 'A closed white envelope with a pointed flap and a red heart seal.',
    draw: () => [
      rect(6, 24, 108, 72, 6, P.paper), path('M6 90L50 58M114 90L70 58', undefined, { sw: 2 }),
      path('M8 26L60 66L112 26Z', P.cream), path('M60 54Q46 42 52 36Q56 32 60 38Q64 32 68 36Q74 42 60 54Z', P.red, { sw: 2 }),
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
