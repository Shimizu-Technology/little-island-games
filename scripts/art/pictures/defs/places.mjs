import { P, circle, ellipse, rect, path, line, patch } from '../style.mjs';

const rod = (d, fill, w = 7) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: fill, sw: w - 4.5 })];
const tree = (x, y, s = 1, fill = P.leaf) => [rect(x - 4 * s, y, 8 * s, 22 * s, 2, P.brown), circle(x, y - 6 * s, 16 * s, fill)];

export default [
  {
    word: 'SCHOOL', meaning: 'a school building', alt: 'A wide school building with rows of windows, a clock over the front door and a flag on a pole.',
    draw: () => [
      line('M104 10V60', { sw: 3 }), path('M104 12H88V22H104Z', P.red, { sw: 2 }),
      rect(8, 46, 104, 62, 2, P.coral), path('M36 46L60 22L84 46Z', P.red), rect(36, 46, 48, 62, 0, P.coral),
      circle(60, 40, 7, P.paper, { sw: 2 }), line('M60 36V40H63', { sw: 1.5 }),
      ...[14, 92].flatMap(x => [rect(x, 56, 14, 14, 2, P.sky, { sw: 2 }), rect(x, 80, 14, 14, 2, P.sky, { sw: 2 })]),
      rect(42, 56, 12, 12, 2, P.sky, { sw: 2 }), rect(66, 56, 12, 12, 2, P.sky, { sw: 2 }), rect(50, 82, 20, 26, 2, P.brown), line('M60 82V108', { sw: 2 }),
      line('M4 108H116'),
    ],
  },
  {
    word: 'CHURCH', meaning: 'a church building', alt: 'A white church with a tall pointed steeple topped by a small cross, a round window and an arched door.',
    draw: () => [
      line('M60 4V18M54 10H66', { sw: 3.5 }), path('M48 46L60 18L72 46Z', P.navy),
      rect(48, 46, 24, 20, 0, P.paper), circle(60, 56, 5, P.sky, { sw: 2 }),
      path('M14 66L36 46H84L106 66Z', P.navy), rect(18, 66, 84, 42, 0, P.paper),
      path('M50 108V88Q50 78 60 78Q70 78 70 88V108Z', P.wood), rect(26, 76, 12, 16, 6, P.sky, { sw: 2 }), rect(82, 76, 12, 16, 6, P.sky, { sw: 2 }),
      line('M8 108H112'),
    ],
  },
  {
    word: 'SHOP', meaning: 'a small shop', alt: 'A little shop front with a red and white striped awning, a big display window and a door.',
    draw: () => [
      rect(12, 18, 96, 90, 2, P.cream), rect(12, 18, 96, 12, 2, P.wood),
      path(`M8 30H112V44${Array.from({ length: 8 }, (_, i) => `Q${106 - i * 13} 54 ${99 - i * 13} 44`).join('')}Z`, P.red),
      ...[21, 47, 73, 99].map(x => path(`M${x - 6} 30H${x + 7}V44Q${x} 54 ${x - 6} 44Z`, P.paper, { sw: 2 })),
      rect(18, 60, 50, 32, 2, P.sky), path('M24 92V78Q30 70 36 78V92ZM42 92V74Q48 66 54 74V92Z', P.orange, { sw: 2 }),
      rect(76, 60, 26, 48, 2, P.leaf), circle(96, 86, 2.5, P.ink, { ns: true }), line('M6 108H114'),
    ],
  },
  {
    word: 'CASTLE', meaning: 'a castle', alt: 'A grey stone castle with two tall towers, pointed red roofs, flags, battlements and an arched gate.',
    draw: () => [
      line('M24 14V4M96 14V4', { sw: 2.5 }), path('M24 4L34 8L24 12ZM96 4L106 8L96 12Z', P.red, { sw: 2 }),
      path('M10 36L24 12L38 36ZM82 36L96 12L110 36Z', P.red),
      path('M36 54V44H44V52H52V44H60V52H68V44H76V52H84V44V108H36Z', P.stone),
      rect(12, 36, 24, 72, 0, P.stone), rect(84, 36, 24, 72, 0, P.stone),
      path('M48 108V86Q48 74 60 74Q72 74 72 86V108Z', P.brown), line('M54 80V108M60 76V108M66 80V108', { stroke: P.charcoal, sw: 2 }),
      rect(20, 54, 8, 12, 4, P.charcoal), rect(92, 54, 8, 12, 4, P.charcoal), line('M6 108H114'),
    ],
  },
  {
    word: 'BARN', meaning: 'a farm barn', alt: 'A red farm barn with a tall roof, white trim, a hay loft window and big doors with white crosses.',
    draw: () => [
      path('M10 54L30 22H90L110 54V108H10Z', P.red), path('M10 54L30 22H90L110 54', undefined, { stroke: P.paper, sw: 4 }),
      rect(48, 32, 24, 16, 2, P.sand), line('M48 40H72', { stroke: P.gold, sw: 2 }),
      rect(30, 62, 60, 46, 0, P.paper), rect(34, 66, 26, 42, 0, P.red, { sw: 2 }), rect(60, 66, 26, 42, 0, P.red, { sw: 2 }),
      line('M34 66L60 108M60 66L34 108M60 66L86 108M86 66L60 108', { stroke: P.paper, sw: 3 }), path('M10 54L30 22H90L110 54V108H10Z'), line('M4 108H116'),
    ],
  },
  {
    word: 'BRIDGE', meaning: 'a bridge', alt: 'A brown arched bridge with railings crossing over blue water.',
    draw: () => [
      path('M4 96Q18 90 32 96Q46 102 60 96Q74 90 88 96Q102 102 116 96V112H4Z', P.blue),
      path('M4 58H116V96H100Q98 70 60 70Q22 70 20 96H4Z', P.wood), line('M20 96Q22 70 60 70Q98 70 100 96', undefined, { stroke: P.brown, sw: 3 }),
      ...rod('M4 38H116', P.brown, 8), ...[12, 32, 52, 72, 92, 110].map(x => line(`M${x} 38V58`, { stroke: P.brown, sw: 5 })),
      line('M12 38V58M32 38V58M52 38V58M72 38V58M92 38V58M110 38V58', { sw: 1.5 }),
    ],
  },
  {
    word: 'MOUNTAIN', meaning: 'a mountain', alt: 'A tall grey mountain peak with snow on top, beside a smaller green mountain.',
    draw: () => [
      path('M66 104L94 56L118 104Z', P.leaf),
      path('M4 104L50 14L96 104Z', P.stone), path('M50 14L64 42L56 38L50 46L42 38L36 42Z', P.paper), path('M50 46L60 104', undefined, { stroke: P.slate, sw: 2 }),
      line('M2 104H118'),
    ],
  },
  {
    word: 'RIVER', meaning: 'a river', alt: 'A blue river winding between grassy green banks, with small trees on each side.',
    draw: () => [
      path('M8 48Q30 34 60 36Q90 32 112 44V100Q112 112 100 112H20Q8 112 8 100Z', P.leaf),
      path('M54 36Q72 38 66 50Q56 62 72 74Q92 88 76 112H40Q54 92 40 82Q26 70 44 56Q54 46 48 38Z', P.blue),
      line('M56 52q6-2 8 2M62 78q8 0 10 4M50 100q8-2 10 2', { stroke: P.paper, sw: 2.5 }),
      rect(19, 46, 6, 14, 2, P.brown), circle(22, 40, 11, P.forest), rect(95, 66, 6, 14, 2, P.brown), circle(98, 60, 11, P.forest),
      rect(87, 30, 5, 10, 2, P.brown), circle(89, 26, 8, P.forest),
    ],
  },
  {
    word: 'POND', meaning: 'a pond', alt: 'A small round pond with green lily pads, a pink flower and reeds at the edge.',
    draw: () => [
      ellipse(60, 74, 54, 32, P.sky), ellipse(60, 74, 54, 32),
      path('M40 74L32 66A12 8 0 1 0 44 70Z', P.leaf, { sw: 2 }), path('M80 84L72 78A10 7 0 1 0 84 80Z', P.leaf, { sw: 2 }),
      circle(78, 66, 5, P.pink, { sw: 2 }), circle(78, 66, 2, P.yellow, { ns: true }),
      line('M16 56V22M24 54V30M10 60V38', { stroke: P.forest, sw: 4 }), ...[[16, 22], [24, 30]].map(([x, y]) => rect(x - 3, y - 12, 6, 14, 3, P.brown, { sw: 2 })),
    ],
  },
  {
    word: 'ROAD', meaning: 'a road', alt: 'A grey road stretching away into the distance between green grass, with a dashed white line down the middle.',
    draw: () => [
      rect(8, 10, 104, 100, 16, P.leaf, { ns: true }), patch('M8 10H112V40H8Z', P.sky),
      path('M54 40H66L104 110H16Z', P.slate), path('M60 46V52M60 62V72M60 84V100', undefined, { stroke: P.paper, sw: 4 }),
      line('M8 40H112', { stroke: P.forest, sw: 2 }), rect(8, 10, 104, 100, 16),
    ],
  },
  {
    word: 'FOUNTAIN', meaning: 'a water fountain', alt: 'A stone fountain with two round basins and water spraying up from the top and splashing down.',
    draw: () => [
      path('M60 26Q50 10 36 20M60 26Q70 10 84 20M60 26V8', undefined, { stroke: P.blue, sw: 4 }), line('M36 22L30 44M84 22L90 44', { stroke: P.blue, sw: 3 }),
      ellipse(60, 46, 28, 7, P.stone), path('M32 46Q36 58 60 58Q84 58 88 46Z', P.stone), rect(54, 58, 12, 26, 2, P.stone),
      line('M22 58L16 84M98 58L104 84', { stroke: P.blue, sw: 3 }),
      path('M8 84H112Q110 110 60 110Q10 110 8 84Z', P.stone), ellipse(60, 84, 52, 9, P.sky),
    ],
  },
  {
    word: 'WELL', meaning: 'a water well', otherMeaning: 'to be well (healthy)', alt: 'A round stone wishing well with a little pointed roof, a winding handle and a bucket on a rope.',
    draw: () => [
      path('M10 36L60 8L110 36Z', P.red), ...rod('M24 36V78M96 36V78', P.wood, 9), ...rod('M24 50H104', P.brown, 6), line('M104 50V60', { sw: 3 }),
      line('M60 50V64', { sw: 2 }), path('M52 64H68L66 76H54Z', P.wood),
      path('M14 78H106V104Q106 112 98 112H22Q14 112 14 104Z', P.stone), ellipse(60, 78, 46, 8, P.charcoal),
      line('M14 92H106M36 78V92M60 92V112M84 78V92', { stroke: P.slate, sw: 2 }),
    ],
  },
  {
    word: 'CITY', meaning: 'a city', alt: 'A city skyline of tall buildings of different heights, with rows of lit windows.',
    draw: () => [
      rect(8, 48, 22, 62, 2, P.sky), rect(28, 22, 26, 88, 2, P.blue), rect(52, 38, 22, 72, 2, P.stone), rect(72, 10, 24, 100, 2, P.navy), rect(94, 56, 18, 54, 2, P.sky),
      ...[[12, 56], [20, 56], [12, 72], [20, 72], [12, 88], [20, 88]].map(([x, y]) => rect(x, y, 5, 8, 1, P.yellow, { ns: true })),
      ...[30, 44, 58, 72, 86].flatMap(y => [rect(33, y, 6, 8, 1, P.yellow, { ns: true }), rect(43, y, 6, 8, 1, P.paper, { ns: true })]),
      ...[46, 62, 78, 94].map(y => rect(57, y, 12, 6, 1, P.paper, { ns: true })),
      ...[18, 32, 46, 60, 74, 88].flatMap(y => [rect(77, y, 5, 8, 1, P.yellow, { ns: true }), rect(86, y, 5, 8, 1, P.yellow, { ns: true })]),
      line('M4 110H116'),
    ],
  },
  {
    word: 'FACTORY', meaning: 'a factory', alt: 'A factory building with a zigzag roof, two tall chimneys and grey smoke puffing out.',
    draw: () => [
      circle(30, 14, 7, P.stone, { sw: 2 }), circle(42, 8, 5, P.stone, { sw: 2 }), circle(98, 16, 6, P.stone, { sw: 2 }),
      rect(22, 22, 14, 40, 1, P.red), rect(90, 26, 12, 36, 1, P.red), line('M22 30h14M90 34h12', { stroke: P.paper, sw: 3 }),
      path('M8 108V60L30 46V60L52 46V60L74 46V60L96 46V60L112 52V108Z', P.coral),
      ...[16, 38, 60, 82].map(x => rect(x, 72, 14, 12, 1, P.sky, { sw: 2 })), rect(86, 86, 18, 22, 1, P.brown), line('M4 108H116'),
    ],
  },
  {
    word: 'GARAGE', meaning: 'a garage', alt: 'A garage with a sloped roof and a wide open door, a red car parked inside and a grey driveway in front.',
    draw: () => [
      path('M6 44L60 12L114 44Z', P.navy), rect(12, 44, 96, 54, 2, P.cream),
      rect(22, 52, 76, 46, 2, P.charcoal), rect(22, 52, 76, 12, 0, P.stone), line('M22 58H98', { stroke: P.slate, sw: 2 }),
      path('M30 96V82Q30 76 36 76H42L50 68H72L80 76H86Q92 76 92 82V96Z', P.red), rect(52, 72, 16, 6, 2, P.sky, { sw: 2 }),
      circle(40, 96, 6, P.charcoal), circle(82, 96, 6, P.charcoal), rect(34, 82, 8, 5, 2, P.yellow, { sw: 1.5 }), rect(80, 82, 8, 5, 2, P.yellow, { sw: 1.5 }),
      path('M22 98H98L112 114H8Z', P.stone),
    ],
  },
  {
    word: 'TUNNEL', meaning: 'a tunnel', alt: 'A green hill with a dark arched tunnel through it and railway tracks running inside.',
    draw: () => [
      path('M4 98Q4 26 60 18Q116 26 116 98Z', P.leaf),
      path('M30 98V62Q30 38 60 38Q90 38 90 62V98Z', P.stone), path('M38 98V64Q38 46 60 46Q82 46 82 64V98Z', P.charcoal),
      path('M50 98L56 66H64L70 98', undefined, { stroke: P.slate, sw: 3 }), line('M48 92H72M51 80H69M54 70H66', { stroke: P.wood, sw: 3 }),
      path('M36 112L48 98M84 112L72 98', undefined, { stroke: P.slate, sw: 3 }), line('M4 98H116'), line('M40 106H80', { stroke: P.wood, sw: 3 }),
    ],
  },
  {
    word: 'DESERT', meaning: 'a desert', alt: 'A sandy desert with rolling dunes, a green cactus and a hot sun in the sky.',
    draw: () => [
      rect(8, 10, 104, 100, 16, P.cream, { ns: true }), circle(88, 32, 12, P.yellow, { sw: 2 }),
      patch('M8 72Q40 52 70 70Q92 82 112 70V94Q112 110 96 110H24Q8 110 8 94Z', P.sand), patch('M8 90Q40 78 72 92Q92 100 112 92V96Q112 110 96 110H24Q8 110 8 96Z', P.gold),
      rect(34, 40, 12, 52, 6, P.leaf), path('M34 66H26Q20 66 20 60V50', undefined, { stroke: P.ink, sw: 10 }), path('M34 66H26Q20 66 20 60V50', undefined, { stroke: P.leaf, sw: 5 }),
      path('M46 58H54Q60 58 60 52V44', undefined, { stroke: P.ink, sw: 10 }), path('M46 58H54Q60 58 60 52V44', undefined, { stroke: P.leaf, sw: 5 }),
      rect(8, 10, 104, 100, 16),
    ],
  },
  {
    word: 'FOREST', meaning: 'a forest', alt: 'A thick forest of many green trees, some round and some pointed, growing close together.',
    draw: () => [
      ...tree(22, 62, 1.0, P.leaf), path('M58 8L80 52H36Z', P.forest), path('M58 28L84 72H32Z', P.forest), rect(54, 72, 8, 16, 2, P.brown),
      ...tree(96, 58, 1.0, P.leaf), path('M34 50L52 92H16Z', P.forest), rect(30, 92, 8, 14, 2, P.brown),
      path('M84 54L104 96H64Z', P.forest), rect(80, 96, 8, 12, 2, P.brown), ...tree(60, 92, 0.8, P.leaf), line('M4 110H116'),
    ],
  },
  {
    word: 'CIRCUS', meaning: 'a circus big top', alt: 'A circus big top tent with red and white stripes, a pointed top with a flag, and an open entrance.',
    draw: () => [
      line('M60 8V22', { sw: 3 }), path('M60 8L74 13L60 18Z', P.yellow, { sw: 2 }),
      path('M8 62Q34 52 60 22Q86 52 112 62Z', P.red), path('M60 22Q48 46 36 56H48Q56 42 60 22ZM60 22Q72 46 84 56H72Q64 42 60 22Z', P.paper, { sw: 2 }),
      rect(12, 62, 96, 46, 0, P.paper), ...[12, 36, 60, 84].map(x => rect(x, 62, 12, 46, 0, P.red, { sw: 2 })),
      path('M46 108V82Q46 72 60 72Q74 72 74 82V108Z', P.charcoal), path('M8 62Q20 70 32 62Q44 70 56 62Q68 70 80 62Q92 70 112 62', P.yellow, { sw: 2 }),
      line('M4 108H116'),
    ],
  },
  {
    word: 'TENT', meaning: 'a camping tent', alt: 'A green camping tent shaped like a triangle, with its front flaps tied open.',
    draw: () => [
      path('M60 12L112 104H8Z', P.leaf), path('M60 12L84 104H36Z', P.charcoal), path('M60 12L36 104H50Q54 70 60 12Z', P.mint), path('M60 12L84 104H70Q66 70 60 12Z', P.mint),
      line('M60 12L54 4M60 12L66 4', { sw: 3 }), line('M8 104L2 110M112 104L118 110', { sw: 3 }), line('M2 104H118', { stroke: P.brown, sw: 3 }),
    ],
  },
];
