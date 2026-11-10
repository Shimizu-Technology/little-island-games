import { P, circle, ellipse, rect, path, line, poly, patch, dot, eyes, group, ring } from '../style.mjs';

const frond = (x, y) => path(`M${x} ${y}Q${x - 18} ${y - 14} ${x - 34} ${y - 2}Q${x - 18} ${y - 6} ${x} ${y}Q${x - 6} ${y - 22} ${x - 22} ${y - 26}Q${x - 6} ${y - 16} ${x} ${y}Q${x + 8} ${y - 24} ${x + 26} ${y - 24}Q${x + 8} ${y - 14} ${x} ${y}Q${x + 22} ${y - 10} ${x + 34} ${y + 6}Q${x + 16} ${y - 2} ${x} ${y}Q${x + 8} ${y + 8} ${x + 10} ${y + 22}Q${x + 2} ${y + 10} ${x} ${y}Q${x - 14} ${y + 4} ${x - 20} ${y + 18}Q${x - 10} ${y + 4} ${x} ${y}Z`, P.leaf, { sw: 2 });

export default [
  {
    word: 'COCONUT', meaning: 'a coconut', alt: 'A brown hairy coconut beside a cracked-open half showing white flesh inside.',
    draw: () => [
      circle(42, 56, 30, P.brown), line('M24 40l6 4M32 30l4 6M50 30l-2 6M20 56l6 0M28 70l5-4', { stroke: P.wood, sw: 2 }),
      circle(36, 52, 3, P.charcoal, { ns: true }), circle(46, 50, 3, P.charcoal, { ns: true }), circle(41, 60, 3, P.charcoal, { ns: true }),
      path('M54 82Q56 108 82 108Q108 108 110 82Z', P.brown), path('M60 82Q62 102 82 102Q102 102 104 82Z', P.paper, { sw: 2 }),
      ellipse(82, 82, 28, 7, P.paper), ellipse(82, 82, 20, 4, P.cream, { ns: true }),
    ],
  },
  {
    word: 'MANGO', meaning: 'a mango', alt: 'A ripe mango, a long kidney-shaped fruit, yellow blushing to orange and red, with a green leaf at its stem.',
    draw: () => [
      group({ t: 'rotate(-35 60 62)' },
        path('M60 18Q46 4 26 8Q36 20 58 22Z', P.leaf), line('M56 20Q42 12 30 10', { sw: 2 }),
        path('M60 20Q92 22 96 60Q98 98 66 108Q40 114 30 94Q24 80 36 68Q48 56 44 40Q42 22 60 20Z', P.yellow),
        patch('M60 24Q88 28 90 58Q92 88 70 100Q86 74 78 52Q72 34 60 24Z', P.orange),
        patch('M64 26Q82 32 86 50Q76 36 64 26Z', P.red),
        path('M60 20Q92 22 96 60Q98 98 66 108Q40 114 30 94Q24 80 36 68Q48 56 44 40Q42 22 60 20Z'), line('M60 20L60 12', { stroke: P.brown, sw: 4 })),
    ],
  },
  {
    word: 'PAPAYA', meaning: 'a papaya', alt: 'A papaya cut in half lengthwise, showing orange flesh and a hollow full of black seeds.',
    draw: () => [
      path('M60 8Q86 10 96 46Q104 80 88 100Q76 114 60 114Q44 114 32 100Q16 80 24 46Q34 10 60 8Z', P.leaf),
      path('M60 14Q80 16 88 46Q96 78 82 96Q72 106 60 106Q48 106 38 96Q24 78 32 46Q40 16 60 14Z', P.orange, { sw: 2 }),
      path('M60 44Q72 46 72 68Q72 90 60 92Q48 90 48 68Q48 46 60 44Z', P.coral, { sw: 2 }),
      ...[[56, 54], [64, 56], [58, 64], [66, 66], [54, 72], [62, 76], [58, 84], [66, 80], [52, 62]].map(([x, y]) => circle(x, y, 3, P.charcoal, { ns: true })),
    ],
  },
  {
    word: 'GUAVA', meaning: 'a guava fruit', alt: 'A green guava beside a cut half with pink flesh and small seeds in the middle.',
    draw: () => [
      path('M30 22Q14 32 16 54Q20 78 42 78Q64 76 66 52Q66 30 48 22Z', P.leaf), path('M38 20L42 12L46 20Z', P.brown, { sw: 2 }),
      patch('M26 40Q30 30 38 30Q30 36 30 46Z', P.mint),
      circle(78, 76, 32, P.mint), circle(78, 76, 25, P.pink, { sw: 2 }), circle(78, 76, 13, P.coral, { ns: true }),
      ...[[72, 70], [84, 70], [78, 82], [70, 80], [86, 80], [78, 66]].map(([x, y]) => circle(x, y, 2.2, P.cream, { ns: true })),
    ],
  },
  {
    word: 'BREADFRUIT', meaning: 'a breadfruit', alt: 'A big round green breadfruit with a bumpy skin, hanging under a deeply cut leaf.',
    draw: () => [
      path('M60 34Q46 18 30 26Q38 30 32 36Q20 32 14 42Q24 42 22 50Q12 50 10 60Q30 54 46 44Q54 40 60 34Z', P.forest),
      path('M60 34Q74 18 90 26Q82 30 88 36Q100 32 106 42Q96 42 98 50Q108 50 110 60Q90 54 74 44Q66 40 60 34Z', P.forest),
      line('M60 34V44', { stroke: P.brown, sw: 4 }),
      circle(60, 76, 34, P.leaf),
      ...[[48, 58], [64, 54], [78, 62], [42, 74], [58, 70], [74, 78], [88, 76], [50, 88], [66, 88], [80, 94], [36, 90], [60, 102]].map(([x, y]) => poly(ring(x, y, 6, 6, 0), P.mint, { sw: 2 })),
    ],
  },
  {
    word: 'TARO', meaning: 'a taro plant and root', alt: 'A taro plant: a big heart-shaped green leaf on a long stem above a round brown root with rings.',
    draw: () => [
      line('M60 78Q58 60 50 46M60 78Q66 62 78 56', { stroke: P.forest, sw: 6 }),
      path('M50 46Q24 52 12 34Q4 12 28 8Q40 8 46 20Q48 6 62 6Q80 10 76 30Q72 46 50 46Z', P.leaf),
      line('M50 46L46 20M50 46L26 26M50 46L64 22', { stroke: P.forest, sw: 2 }),
      path('M78 56Q96 64 108 54Q114 40 102 36Q92 34 88 40Q84 32 74 36Q66 44 78 56Z', P.leaf, { sw: 2 }),
      ellipse(60, 92, 24, 20, P.brown), line('M40 84Q60 90 80 84M38 96Q60 102 82 96', { stroke: P.wood, sw: 2.5 }),
      line('M48 110l-4 6M60 112v6M72 110l4 6', { stroke: P.brown, sw: 2 }),
    ],
  },
  {
    word: 'PALM', fit: [0.876, 56.0, 53.5], meaning: 'a palm tree', otherMeaning: 'the palm of your hand', alt: 'A coconut palm tree with a tall curved trunk, spreading fronds and coconuts.',
    draw: () => [
      path('M52 112Q60 78 52 36L60 36Q70 78 64 112Z', P.wood), line('M54 100h10M55 88h10M55 76h10M55 64h9M54 52h8', { stroke: P.brown, sw: 2 }),
      group({ t: 'translate(56 34) scale(1.5) translate(-56 -34)' }, frond(56, 34)), circle(50, 40, 6, P.brown, { sw: 2 }), circle(62, 42, 6, P.brown, { sw: 2 }),
    ],
  },
  {
    word: 'CANOE', meaning: 'an outrigger canoe', alt: 'A wooden outrigger canoe side on, with a float on poles beside it and a paddle resting across.',
    draw: () => [
      line('M38 74L50 44M80 74L74 44', { stroke: P.wood, sw: 4 }), line('M38 74L50 44M80 74L74 44', { sw: 1.5, stroke: P.brown }),
      path('M34 44H94Q100 44 98 48Q96 52 88 52H40Q32 52 30 48Q30 44 34 44Z', P.sand),
      line('M70 28L92 66', { stroke: P.ink, sw: 6 }), line('M70 28L92 66', { stroke: P.wood, sw: 2 }), path('M88 60L100 78L92 82L84 64Z', P.wood),
      path('M4 68Q30 74 60 74Q90 74 116 68L110 82Q100 96 60 96Q20 96 10 82Z', P.wood),
      path('M10 82Q20 90 60 90Q100 90 110 82', undefined, { stroke: P.brown, sw: 2 }), path('M4 68Q30 74 60 74Q90 74 116 68', undefined),
    ],
  },
  {
    word: 'HUT', meaning: 'a small thatched hut', alt: 'A small wooden hut with a steep thatched roof and an open doorway.',
    draw: () => [
      rect(24, 56, 72, 48, 2, P.wood), line('M36 56v48M48 56v48M72 56v48M84 56v48', { stroke: P.brown, sw: 2 }),
      path('M50 104V78Q50 70 60 70Q70 70 70 78V104Z', P.brown),
      path('M60 12L110 62Q96 66 60 64Q24 66 10 62Z', P.sand),
      line('M60 12L40 62M60 12L52 64M60 12L68 64M60 12L80 62M60 12L24 60M60 12L96 60', { stroke: P.gold, sw: 2 }),
      path('M60 12L110 62Q96 66 60 64Q24 66 10 62Z'), line('M14 104H106'),
    ],
  },
  {
    word: 'REEF', meaning: 'a coral reef', alt: 'An underwater coral reef: pink and orange corals, green seaweed and a small fish, in blue water.',
    draw: () => [
      rect(8, 8, 104, 104, 18, P.sky, { ns: true }), patch('M8 86Q34 80 60 86Q86 92 112 84V94Q112 112 94 112H26Q8 112 8 94Z', P.sand),
      line('M30 92V70M30 78L20 64M30 72L40 58M30 64L26 50', { stroke: P.ink, sw: 9 }), line('M30 92V70M30 78L20 64M30 72L40 58M30 64L26 50', { stroke: P.pink, sw: 4 }),
      path('M62 92Q50 92 50 80Q50 64 64 62Q80 62 80 78Q80 92 62 92Z', P.orange), line('M54 72Q64 76 74 70M54 82Q64 86 76 80', { sw: 2 }),
      line('M94 94Q86 76 94 62Q100 50 94 38M100 94Q106 80 102 66', { stroke: P.forest, sw: 4 }),
      path('M54 36Q66 26 78 36Q66 46 54 36ZM54 36L46 30V42Z', P.yellow, { sw: 2 }), dot(72, 35, 1.6),
      circle(36, 30, 3, P.paper, { sw: 2 }), circle(42, 20, 2.2, P.paper, { sw: 2 }),
      rect(8, 8, 104, 104, 18),
    ],
  },
  {
    word: 'CLIFF', meaning: 'a sea cliff', alt: 'A tall rocky cliff with green grass on top, dropping straight down to blue sea.',
    draw: () => [
      path('M6 92Q20 86 34 92Q48 98 60 92Q72 86 86 92Q100 98 114 92V108H6Z', P.blue),
      path('M8 94V32Q30 26 58 30Q72 32 80 40L76 58L84 72L78 94Z', P.stone),
      line('M20 48L36 50M26 66L50 64M40 82L62 80M56 44L66 50M64 60L72 66', { stroke: P.slate, sw: 2 }),
      path('M8 34Q30 22 58 26Q74 28 84 38Q74 36 66 40Q40 32 8 42Z', P.leaf),
    ],
  },
  {
    word: 'CAVE', meaning: 'a cave', alt: 'A grey rocky hill with a big dark arched cave opening at its base.',
    draw: () => [
      path('M6 104Q8 54 34 34Q52 18 70 24Q96 28 108 60Q114 82 114 104Z', P.stone),
      path('M30 104Q30 62 60 60Q90 62 90 104Z', P.charcoal),
      line('M24 56l12 4M78 36l12 6M96 74l10 2M44 38l10-2', { stroke: P.slate, sw: 2 }), line('M6 104H114'),
      path('M40 60L44 70L48 61ZM70 60L74 72L78 62Z', P.stone, { sw: 2 }),
    ],
  },
  {
    word: 'BAMBOO', meaning: 'bamboo stalks', alt: 'Three tall green bamboo stalks with joint rings and a few narrow leaves.',
    draw: () => [
      ...[[32, 10], [56, 4], [80, 14]].map(([x, top]) => rect(x, top, 14, 112 - top, 6, P.leaf)),
      line('M32 40h14M32 74h14M56 30h14M56 62h14M56 92h14M80 46h14M80 82h14', { stroke: P.forest, sw: 3 }),
      path('M94 46Q108 34 116 38Q106 48 94 46ZM46 74Q30 64 18 70Q30 80 46 74ZM70 30Q82 16 94 18Q84 30 70 30Z', P.forest, { sw: 2 }),
    ],
  },
  {
    word: 'BUFFALO', meaning: 'a water buffalo (carabao)', alt: 'A grey water buffalo side on, its head turned to you, with two wide horns curving up and back.',
    draw: () => [
      line('M14 54Q6 66 10 82', { sw: 3 }),
      ...[18, 32, 58, 72].map(x => rect(x, 72, 10, 30, 4, P.slate)),
      ellipse(48, 62, 38, 22, P.slate),
      path('M78 40Q60 40 54 26Q52 16 60 14Q62 28 80 32ZM98 40Q116 40 122 26Q124 16 116 14Q114 28 96 32Z', P.cream, { t: 'translate(-4 0)' }),
      path('M74 38Q86 32 98 38L98 70Q96 82 86 82Q76 82 74 70Z', P.slate), ellipse(86, 74, 10, 7, P.stone, { sw: 2 }),
      dot(82, 74, 1.6), dot(90, 74, 1.6), eyes(79, 52, 93, 52, 2.6),
      path('M74 44L62 42L72 52ZM98 44L110 42L100 52Z', P.slate),
    ],
  },
  {
    word: 'GRILL', meaning: 'a barbecue grill', alt: 'A barbecue grill on legs, with a metal grate, sizzling food on top and smoke rising.',
    draw: () => [
      line('M36 16q-6 8 0 14M60 10q-6 8 0 14M84 16q-6 8 0 14', { stroke: P.stone, sw: 3 }),
      line('M30 76L20 108M90 76L100 108M60 80V108', { stroke: P.charcoal, sw: 5 }),
      path('M10 50H110Q108 82 60 84Q12 82 10 50Z', P.charcoal),
      rect(8, 44, 104, 8, 3, P.stone), line('M24 44V52M40 44V52M56 44V52M72 44V52M88 44V52', { sw: 2 }),
      rect(22, 34, 34, 10, 5, P.brown), rect(64, 34, 34, 10, 5, P.red), line('M30 39h4M40 39h4M72 39h4M82 39h4', { stroke: P.charcoal, sw: 2 }),
    ],
  },
  {
    word: 'BASKET', meaning: 'a woven basket', alt: 'A woven straw basket with a tall curved handle.',
    draw: () => [
      path('M28 52Q28 8 60 8Q92 8 92 52', undefined, { stroke: P.ink, sw: 10 }), path('M28 52Q28 8 60 8Q92 8 92 52', undefined, { stroke: P.sand, sw: 5 }),
      path('M12 50H108L96 104Q94 110 86 110H34Q26 110 24 104Z', P.sand),
      line('M17 66H103M21 82H99M24 96H96', { stroke: P.wood, sw: 2.5 }),
      line('M30 50L36 108M48 50L50 110M60 50V110M72 50L70 110M90 50L84 108', { stroke: P.wood, sw: 2.5 }),
      rect(8, 44, 104, 10, 5, P.wood),
    ],
  },
];
