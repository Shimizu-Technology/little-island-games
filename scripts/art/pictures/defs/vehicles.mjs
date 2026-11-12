import { P, circle, ellipse, rect, path, line, patch } from '../style.mjs';

const rod = (d, fill, w = 7) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: fill, sw: w - 4.5 })];
const wheel = (x, y, r = 12) => [circle(x, y, r, P.charcoal), circle(x, y, r * 0.42, P.stone)];

export default [
  {
    word: 'CAR', meaning: 'a car', alt: 'A small red car side on, with two windows and two black wheels.',
    draw: () => [
      path('M8 84V68Q8 58 18 56L30 54L42 34Q46 28 54 28H80Q88 28 92 36L100 54Q112 56 112 68V84Z', P.red),
      path('M46 52L52 38Q54 34 58 34H66V52ZM72 52V34H80Q84 34 86 38L92 52Z', P.sky, { sw: 2 }),
      rect(104, 62, 8, 6, 2, P.yellow, { sw: 2 }), line('M60 62h8', { sw: 2.5 }), ...wheel(32, 86, 13), ...wheel(88, 86, 13),
    ],
  },
  {
    word: 'BUS', meaning: 'a bus', alt: 'A long yellow school bus side on, with a row of windows, a door and two wheels.',
    draw: () => [
      path('M6 92V30Q6 22 14 22H96Q110 22 112 40L114 60V92Z', P.yellow),
      ...[14, 34, 54, 74].map(x => rect(x, 32, 15, 20, 2, P.sky, { sw: 2 })), path('M94 32H104Q108 32 108 40V56H94Z', P.sky, { sw: 2 }),
      rect(80, 58, 12, 30, 2, P.gold, { sw: 2 }), line('M6 66H78', { stroke: P.charcoal, sw: 3 }), rect(108, 70, 6, 6, 2, P.paper, { sw: 2 }),
      ...wheel(28, 92, 12), ...wheel(94, 92, 12),
    ],
  },
  {
    word: 'TRUCK', meaning: 'a truck', alt: 'A big truck side on: a blue cab in front and a long orange box trailer, with three wheels.',
    draw: () => [
      rect(6, 22, 70, 62, 4, P.orange), line('M18 30V76M30 30V76M42 30V76M54 30V76M66 30V76', { stroke: P.gold, sw: 2 }),
      path('M78 44H100Q106 44 110 52L114 66V86H78Z', P.blue), path('M90 50H100Q104 50 106 56L108 64H90Z', P.sky, { sw: 2 }),
      rect(4, 84, 112, 6, 2, P.charcoal), ...wheel(22, 92, 11), ...wheel(48, 92, 11), ...wheel(96, 92, 11),
    ],
  },
  {
    word: 'TRAIN', meaning: 'a train engine', alt: 'A red steam train engine side on, with a tall chimney puffing smoke, a cab and wheels.',
    draw: () => [
      circle(30, 14, 8, P.paper, { sw: 2 }), circle(44, 8, 6, P.paper, { sw: 2 }),
      rect(24, 24, 16, 22, 2, P.charcoal), rect(70, 20, 42, 66, 4, P.red), rect(78, 30, 24, 20, 2, P.sky, { sw: 2 }), rect(66, 14, 50, 10, 3, P.charcoal),
      path('M8 46H70V86H8Z', P.red), rect(44, 40, 8, 6, 2, P.gold, { sw: 2 }), path('M8 86L2 98H24Z', P.charcoal),
      line('M8 62H70', { stroke: P.gold, sw: 3 }),
      ...wheel(26, 94, 12), ...wheel(56, 94, 12), ...wheel(92, 94, 13),
    ],
  },
  {
    word: 'PLANE', meaning: 'an airplane', otherMeaning: 'a flat surface, or a woodworking tool', alt: 'A white passenger airplane flying to the right, with wings, a tail fin and a row of windows.',
    draw: () => [
      path('M54 62L30 104H46L80 64Z', P.stone), path('M18 48L8 22H22L40 46Z', P.blue),
      path('M10 52Q8 44 18 44H96Q114 46 116 56Q114 66 96 66H22Q10 64 10 52Z', P.paper),
      path('M50 50L30 14H46L80 50Z', P.stone), path('M96 46Q108 46 112 54H100Q96 54 96 46Z', P.sky, { sw: 2 }),
      ...[30, 42, 54, 66, 78].map(x => circle(x, 54, 3, P.sky, { sw: 1.5 })), line('M14 60H110', { stroke: P.blue, sw: 3 }),
    ],
  },
  {
    word: 'HELICOPTER', meaning: 'a helicopter', alt: 'A red helicopter side on, with a big rotor on top, a bubble window, a tail and landing skids.',
    draw: () => [
      ...rod('M10 20H110', P.charcoal, 7), ...rod('M64 20V34', P.charcoal, 8),
      path('M52 64L104 54V62L58 76Z', P.red), path('M102 44L112 42L114 62L104 62Z', P.red),
      path('M28 58Q28 34 56 34H70Q86 34 86 58Q86 82 60 82H42Q28 82 28 58Z', P.red), path('M30 58Q30 40 50 40V58Z', P.sky, { sw: 2 }),
      ...rod('M36 82L32 98M74 82L78 98', P.charcoal, 6), ...rod('M18 98H94Q100 98 104 92', P.charcoal, 7),
    ],
  },
  {
    word: 'SHIP', meaning: 'a big ship', alt: 'A big ship on the sea with a dark hull, a row of round windows and two tall funnels.',
    draw: () => [
      rect(36, 20, 14, 26, 2, P.red), rect(60, 16, 14, 30, 2, P.red), line('M36 28h14M60 24h14', { stroke: P.charcoal, sw: 4 }),
      rect(24, 44, 72, 20, 3, P.paper), ...[34, 48, 62, 76].map(x => rect(x, 50, 8, 8, 2, P.sky, { sw: 2 })),
      path('M4 62H116L100 94H18Z', P.navy), ...[24, 40, 56, 72, 88].map(x => circle(x, 76, 4, P.yellow, { sw: 2 })),
      path('M4 100Q18 94 32 100Q46 106 60 100Q74 94 88 100Q102 106 116 100', undefined, { stroke: P.blue, sw: 4 }),
    ],
  },
  {
    word: 'BOAT', meaning: 'a small motor boat', alt: 'A small white fishing boat with a little cabin, floating on blue water.',
    draw: () => [
      rect(46, 30, 34, 30, 3, P.paper), rect(52, 36, 22, 12, 2, P.sky, { sw: 2 }), rect(56, 20, 6, 10, 1, P.charcoal),
      path('M6 58H114L98 92H24Z', P.red), path('M8 62H112L108 70H12Z', P.paper, { sw: 2 }),
      path('M2 98Q16 90 30 98Q44 106 58 98Q72 90 86 98Q100 106 116 98', undefined, { stroke: P.blue, sw: 4 }),
    ],
  },
  {
    word: 'TAXI', meaning: 'a taxi', alt: 'A yellow taxi car side on, with a checkered stripe and a taxi light on its roof.',
    draw: () => [
      rect(50, 16, 22, 12, 3, P.paper),
      path('M8 84V68Q8 58 18 56L30 54L42 34Q46 28 54 28H80Q88 28 92 36L100 54Q112 56 112 68V84Z', P.yellow),
      path('M46 52L52 38Q54 34 58 34H66V52ZM72 52V34H80Q84 34 86 38L92 52Z', P.sky, { sw: 2 }),
      ...Array.from({ length: 12 }, (_, i) => rect(10 + i * 8, i % 2 ? 66 : 62, 8, 4, 0, P.charcoal, { ns: true })),
      rect(104, 60, 8, 6, 2, P.orange, { sw: 2 }), ...wheel(32, 86, 13), ...wheel(88, 86, 13),
    ],
  },
  {
    word: 'VAN', meaning: 'a van', alt: 'A tall green family van side on, with a long row of side windows, a sliding door and two wheels.',
    draw: () => [
      path('M6 88V30Q6 20 16 20H84Q92 20 98 30L112 56V88Z', P.leaf),
      path('M86 28Q90 28 94 34L104 54H86Z', P.sky, { sw: 2 }), rect(14, 28, 22, 20, 3, P.sky, { sw: 2 }), rect(40, 28, 20, 20, 3, P.sky, { sw: 2 }), rect(64, 28, 18, 20, 3, P.sky, { sw: 2 }),
      line('M38 56V86M62 56V86', { sw: 2 }), rect(54, 62, 6, 3, 1, P.charcoal), rect(104, 70, 8, 6, 2, P.yellow, { sw: 2 }), rect(4, 76, 8, 6, 2, P.red, { sw: 2 }),
      circle(28, 88, 13, P.charcoal), circle(28, 88, 5.5, P.stone), circle(90, 88, 13, P.charcoal), circle(90, 88, 5.5, P.stone),
    ],
  },
  {
    word: 'CRANE', meaning: 'a building crane', otherMeaning: 'the crane bird', alt: 'A tall yellow construction crane with a criss-cross tower, a long arm and a hook hanging on a cable.',
    draw: () => [
      rect(34, 30, 16, 80, 1, P.yellow), path('M34 30L50 46M50 46L34 62M34 62L50 78M50 78L34 94M34 94L50 110', undefined, { stroke: P.ink, sw: 2 }),
      rect(6, 18, 108, 12, 1, P.yellow), path('M14 18L26 30M26 18L38 30M50 18L62 30M62 18L74 30M74 18L86 30M86 18L98 30M98 18L110 30', undefined, { stroke: P.ink, sw: 2 }),
      rect(52, 30, 16, 14, 2, P.blue), rect(6, 30, 14, 14, 2, P.slate), line('M42 6V18', { sw: 3 }), line('M42 6L12 18M42 6L110 18', { sw: 2 }),
      line('M96 30V74', { sw: 2 }), ...rod('M90 74H102V80Q102 92 94 92Q88 92 88 86', P.stone, 7), rect(26, 108, 32, 6, 2, P.charcoal),
    ],
  },
  {
    word: 'CART', meaning: 'a shopping cart', alt: 'A metal shopping cart with a wire basket, a handle and four small wheels.',
    draw: () => [
      ...rod('M4 18H18L26 30', P.red, 8),
      path('M22 30H112L102 74H32Z', P.paper), line('M44 30L48 74M62 30L64 74M80 30L80 74M96 30L94 74M26 44H108M30 58H106', { stroke: P.stone, sw: 2.5 }), path('M22 30H112L102 74H32Z'),
      ...rod('M32 74L36 90H100', P.slate, 7), circle(42, 100, 7, P.charcoal), circle(94, 100, 7, P.charcoal),
    ],
  },
  {
    word: 'BLIMP', meaning: 'a blimp (airship)', alt: 'A long silver-grey blimp floating in the sky, shaped like a stretched balloon, with fins at the back and a small cabin underneath.',
    draw: () => [
      path('M28 40L10 24H24L40 36ZM28 64L10 82H24L40 68Z', P.red),
      ellipse(64, 52, 52, 26, P.stone), line('M36 32Q26 52 36 72M64 26V78M94 30Q106 52 94 74', { stroke: P.slate, sw: 2.5 }), ellipse(64, 52, 52, 26),
      path('M14 48H34V56H14Z', P.red), patch('M40 38Q54 30 74 30Q56 34 46 42Z', P.paper),
      path('M50 78H78L74 92H54Z', P.red), rect(56, 82, 6, 5, 1, P.sky, { sw: 1.5 }), rect(66, 82, 6, 5, 1, P.sky, { sw: 1.5 }),
    ],
  },
];
