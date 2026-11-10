import { P, circle, ellipse, rect, path, line, patch, group } from '../style.mjs';

const rod = (d, fill, w = 7) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: fill, sw: w - 4.5 })];

export default [
  {
    word: 'HAMMER', fit: [0.922, 44.0, 52.5], meaning: 'a hammer', alt: 'A hammer with a wooden handle, a flat round striking face on one side and a split claw on the other.',
    draw: () => [
      group({ t: 'rotate(-30 60 62)' },
        rect(53, 40, 14, 74, 6, P.wood), line('M60 96V108', { stroke: P.brown, sw: 2 }),
        path('M24 22H66V48H24Z', P.stone), rect(12, 18, 14, 34, 4, P.slate),
        path('M66 24Q86 24 100 10Q104 20 96 32L88 34L98 40Q102 50 90 48Q78 46 66 46Z', P.stone)),
    ],
  },
  {
    word: 'SAW', meaning: 'a hand saw', otherMeaning: 'the past of see', alt: 'A hand saw with a wide toothed metal blade and a red handle.',
    draw: () => [
      group({ t: 'rotate(-20 60 60)' },
        path(`M30 46L112 54V60${Array.from({ length: 13 }, (_, i) => `L${106 - i * 6} 68L${103 - i * 6} 60`).join('')}L30 72Z`, P.stone),
        path('M8 36Q8 30 14 30H34Q40 30 40 36V80Q40 86 34 86H14Q8 86 8 80Z', P.red), rect(16, 44, 14, 28, 6, P.cream, { sw: 2 }), circle(36, 50, 2.5, P.stone, { sw: 1.5 }), circle(36, 66, 2.5, P.stone, { sw: 1.5 })),
    ],
  },
  {
    word: 'NAIL', meaning: 'a metal nail', otherMeaning: 'a fingernail', alt: 'A long metal nail with a flat round head and a sharp point.',
    draw: () => [
      group({ t: 'rotate(40 60 60)' },
        rect(30, 8, 60, 12, 5, P.stone), path('M53 20H67V94L60 116L53 94Z', P.stone), line('M57 28V90', { stroke: P.paper, sw: 2.5 })),
    ],
  },
  {
    word: 'SCREW', meaning: 'a screw', alt: 'A metal screw with a slotted round head and a spiral thread down to a point.',
    draw: () => [
      group({ t: 'rotate(40 60 60)' },
        path('M50 30H70V92L60 116L50 92Z', P.stone),
        line('M48 38L72 32M48 50L72 44M48 62L72 56M48 74L72 68M48 86L72 80M52 98L68 92', { sw: 3 }),
        path('M34 30Q34 8 60 8Q86 8 86 30Z', P.stone), line('M60 12V28', { sw: 3 })),
    ],
  },
  {
    word: 'WRENCH', meaning: 'a wrench (spanner)', alt: 'A silver wrench with an open jaw at one end and a ring at the other.',
    draw: () => [
      group({ t: 'rotate(-45 60 60)' },
        path('M52 30H68V92H52Z', P.stone),
        path('M42 6Q36 18 40 30Q48 40 60 40Q72 40 80 30Q84 18 78 6L70 14V24H50V14Z', P.stone),
        circle(60, 100, 16, P.stone), circle(60, 100, 8, P.paper)),
    ],
  },
  {
    word: 'DRILL', meaning: 'a power drill', otherMeaning: 'a practice exercise', alt: 'A yellow power drill side on, with a pistol grip, a trigger and a long drill bit.',
    draw: () => [
      ...rod('M92 40H116', P.stone, 8), rect(76, 30, 18, 20, 4, P.charcoal),
      path('M14 30Q14 22 22 22H76V58H58L54 66H34L30 58H22Q14 58 14 50Z', P.yellow),
      path('M34 58H56L64 104Q64 112 56 112H38Q30 112 32 104Z', P.charcoal), rect(56, 62, 8, 14, 3, P.red),
      line('M22 34h12M22 42h12', { stroke: P.gold, sw: 2.5 }),
    ],
  },
  {
    word: 'RAKE', fit: [0.891, 47.0, 63.5], meaning: 'a garden rake', alt: 'A garden rake with a long wooden handle and a wide head of metal teeth.',
    draw: () => [
      group({ t: 'rotate(25 60 60)' },
        ...rod('M60 4V82', P.wood, 9), rect(22, 80, 76, 10, 4, P.stone),
        line(Array.from({ length: 9 }, (_, i) => `M${26 + i * 8.5} 90v20`).join(''), { stroke: P.ink, sw: 6 }), line(Array.from({ length: 9 }, (_, i) => `M${26 + i * 8.5} 90v20`).join(''), { stroke: P.stone, sw: 2 })),
    ],
  },
  {
    word: 'SHOVEL', meaning: 'a shovel', alt: 'A shovel with a long handle, a T-grip and a pointed metal scoop.',
    draw: () => [
      group({ t: 'rotate(30 60 60)' },
        ...rod('M48 6H72M60 6V64', P.wood, 9),
        path('M44 62H76V92Q76 110 60 118Q44 110 44 92Z', P.stone), line('M60 70V102', { stroke: P.paper, sw: 2.5 })),
    ],
  },
  {
    word: 'ROPE', meaning: 'a rope', alt: 'A thick twisted rope tied in a loose knot, with frayed ends.',
    draw: () => {
      const d = 'M10 100Q20 70 48 66Q80 62 82 42Q82 20 60 20Q40 22 44 42Q48 62 76 76Q96 86 110 70';
      return [
        path(d, undefined, { stroke: P.ink, sw: 15 }), path(d, undefined, { stroke: P.sand, sw: 10 }), path(d, undefined, { stroke: P.wood, sw: 10, dash: '2.5 5' }),
        line('M10 100l-4 6M10 100l2 8M10 100l-7 1M110 70l6-4M110 70l7 2M110 70l4 6', { stroke: P.wood, sw: 2.5 }),
      ];
    },
  },
  {
    word: 'NEEDLE', meaning: 'a sewing needle', alt: 'A thin silver sewing needle with red thread through its eye.',
    draw: () => [
      path('M86 22Q110 30 98 50Q84 70 62 64Q40 58 30 80Q22 98 40 108', undefined, { stroke: P.red, sw: 3 }),
      group({ t: 'rotate(45 60 60)' }, path('M54 14Q54 8 60 8Q66 8 66 14V96L60 114L54 96Z', P.stone), ellipse(60, 22, 2.5, 7, P.paper)),
    ],
  },
  {
    word: 'HOOK', meaning: 'a fishing hook', otherMeaning: 'a coat hook', alt: 'A shiny metal fishing hook hanging from a fishing line, with a round eye at the top and a sharp barbed point.',
    draw: () => [
      line('M60 2V18', { sw: 2 }), circle(60, 22, 6, undefined, { stroke: P.ink, sw: 10 }), circle(60, 22, 6, undefined, { stroke: P.stone, sw: 5 }),
      path('M60 30V82Q60 108 38 108Q16 108 16 86V70', undefined, { stroke: P.ink, sw: 12 }), path('M60 30V82Q60 108 38 108Q16 108 16 86V70', undefined, { stroke: P.stone, sw: 7 }),
      path('M16 54L28 74L16 70L8 78Z', P.stone), patch('M56 40h2v36h-2Z', P.paper),
    ],
  },
  {
    word: 'CHAIN', fit: [0.855, 62.0, 59.0], meaning: 'a metal chain', alt: 'A grey metal chain of linked oval rings lying on a slant.',
    draw: () => [
      group({ t: 'rotate(-35 60 60)' },
        ...[[12, 0], [37, 1], [62, 0], [87, 1], [112, 0]].map(([x, side]) => side
          ? [rect(x - 15, 54, 30, 12, 6, undefined, { stroke: P.ink, sw: 10 }), rect(x - 15, 54, 30, 12, 6, undefined, { stroke: P.stone, sw: 5 })]
          : [rect(x - 16, 46, 32, 28, 14, undefined, { stroke: P.ink, sw: 10 }), rect(x - 16, 46, 32, 28, 14, undefined, { stroke: P.stone, sw: 5 })]).flat()),
    ],
  },
  {
    word: 'WHEEL', meaning: 'a wheel', alt: 'A big wooden cart wheel with a thick rim, eight spokes and a round hub in the middle.',
    draw: () => [
      circle(60, 60, 50, P.brown), circle(60, 60, 40, P.paper),
      ...[0, 45, 90, 135].map(a => rect(56, 22, 8, 76, 3, P.wood, { t: `rotate(${a} 60 60)` })),
      circle(60, 60, 13, P.brown), circle(60, 60, 5, P.charcoal),
      ...Array.from({ length: 8 }, (_, i) => circle(60 + 45 * Math.cos(i * Math.PI / 4 + 0.39), 60 + 45 * Math.sin(i * Math.PI / 4 + 0.39), 2, P.charcoal, { ns: true })),
    ],
  },
  {
    word: 'GEAR', meaning: 'a gear wheel', alt: 'A green toothed gear wheel with a hole in the middle.', basedOn: 'content/library/art/gears.svg',
    draw: () => [
      group({ t: 'translate(60 60) scale(1.5) translate(-41 -52)' },
        path('m14 32 9-9 8 5 8-1 4-8 12 3 1 10 7 6 9-1 4 12-8 6-1 9 5 8-9 9-8-5-8 1-5 8-12-4V70l-7-5-9 1-4-12 8-6 1-8Z', P.leaf, { sw: 2 }), circle(41, 52, 10, P.paper, { sw: 2 })),
    ],
  },
  {
    word: 'BATTERY', meaning: 'a battery', alt: 'A battery lying on its side, with a metal bump at one end and a plus sign.',
    draw: () => [
      rect(100, 48, 10, 24, 3, P.stone), rect(10, 34, 92, 52, 10, P.charcoal), path('M58 34H92Q102 34 102 44V76Q102 86 92 86H58Z', P.orange),
      line('M74 60H88M81 53V67', { sw: 3.5 }), line('M24 60H38', { stroke: P.paper, sw: 4 }),
    ],
  },
  {
    word: 'BULB', meaning: 'a light bulb', otherMeaning: 'a flower bulb', alt: 'A glowing light bulb with a round glass top, a coiled wire inside and a screw base.',
    draw: () => [
      line('M18 22l8 8M102 22l-8 8M60 2v8M10 56h8M102 56h8', { stroke: P.orange, sw: 4 }),
      path('M60 14Q92 14 92 46Q92 62 78 74V84H42V74Q28 62 28 46Q28 14 60 14Z', P.yellow),
      path('M50 74V58Q54 50 60 58Q66 50 70 58V74', undefined, { stroke: P.orange, sw: 2.5 }), patch('M40 40Q42 28 54 24Q46 32 46 46Z', P.paper),
      rect(42, 84, 36, 8, 3, P.stone), rect(44, 92, 32, 8, 3, P.stone), path('M48 100H72L66 110H54Z', P.charcoal),
    ],
  },
  {
    word: 'PLIERS', meaning: 'pliers', alt: 'A pair of pliers gripping a nail, with short ridged grey jaws and long blue rubber handles.',
    draw: () => [
      group({ t: 'rotate(80 60 22)' }, rect(54, 14, 24, 6, 2, P.stone, { sw: 2 }), rect(50, 12, 6, 10, 1, P.stone, { sw: 2 })),
      path('M56 52L50 22Q50 12 58 14L66 50Z', P.stone), path('M64 52L70 22Q70 12 62 14L54 50Z', P.stone),
      line('M53 30l5-1M54 38l5-1M67 30l-5-1M66 38l-5-1', { sw: 2 }),
      circle(60, 56, 8, P.slate), circle(60, 56, 3, P.charcoal, { ns: true }),
      path('M54 62L26 110Q30 118 38 114L64 64Z', P.blue), path('M66 62L94 110Q90 118 82 114L56 64Z', P.blue),
    ],
  },
  {
    word: 'TROWEL', meaning: 'a garden trowel', alt: 'A small garden trowel with a green handle and a pointed scoop holding brown soil, next to a little plant in a pot.',
    draw: () => [
      path('M84 84H112L106 112H90Z', P.coral), rect(80, 78, 36, 8, 3, P.orange), line('M98 78V60', { stroke: P.forest, sw: 4 }),
      path('M98 64Q86 54 90 46Q100 50 98 64ZM98 62Q110 52 108 44Q98 48 98 62Z', P.leaf, { sw: 2 }),
      group({ t: 'rotate(-40 50 60)' },
        rect(42, 4, 16, 40, 7, P.leaf), rect(46, 42, 8, 14, 2, P.stone),
        path('M50 54Q74 54 74 76Q72 100 50 118Q28 100 26 76Q26 54 50 54Z', P.stone), path('M34 76Q50 66 66 76Q60 92 50 102Q40 92 34 76Z', P.brown, { sw: 2 })),
    ],
  },
  {
    word: 'FUNNEL', meaning: 'a funnel', alt: 'An orange kitchen funnel, wide at the top and narrowing to a thin spout.',
    draw: () => [
      path('M12 22H108L70 72V108Q70 114 60 114Q50 114 50 108V72Z', P.orange), ellipse(60, 22, 48, 10, P.gold),
      line('M26 30L56 70', { stroke: P.paper, sw: 3 }), rect(98, 30, 14, 16, 4, undefined, { stroke: P.ink, sw: 3 }),
    ],
  },
];
