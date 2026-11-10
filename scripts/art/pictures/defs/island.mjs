import { P, circle, ellipse, rect, path, line, patch, dot, eyes, group } from '../style.mjs';

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
    word: 'PAPAYA', meaning: 'a papaya', alt: 'A long pear-shaped papaya cut in half, showing bright orange flesh and a hollow full of round black seeds.',
    draw: () => [
      path('M60 6Q76 8 80 30Q84 46 94 62Q104 84 92 102Q80 116 60 116Q40 116 28 102Q16 84 26 62Q36 46 40 30Q44 8 60 6Z', P.leaf),
      path('M60 12Q72 14 74 32Q78 48 88 64Q96 82 86 96Q76 108 60 108Q44 108 34 96Q24 82 32 64Q42 48 46 32Q48 14 60 12Z', P.orange, { sw: 2 }),
      path('M60 46Q72 50 72 74Q72 96 60 98Q48 96 48 74Q48 50 60 46Z', P.coral, { sw: 2 }),
      ...[[56, 58], [64, 60], [58, 68], [66, 70], [54, 78], [62, 80], [58, 88], [66, 86], [52, 68]].map(([x, y]) => circle(x, y, 3.2, P.charcoal, { ns: true })),
    ],
  },
  {
    word: 'GUAVA', meaning: 'a guava fruit', alt: 'A yellow-green guava with a little crown at its end, beside a cut half with pink flesh and creamy seeds.',
    draw: () => [
      path('M34 16Q12 22 12 46Q14 74 38 76Q62 74 64 48Q64 24 46 16Z', P.mint), path('M34 12L38 4L42 12L48 6V16H30V6Z', P.forest, { sw: 2 }),
      patch('M20 38Q24 28 32 26Q26 34 26 44Z', P.paper), ...[[26, 54], [40, 62], [50, 40], [52, 56]].map(([x, y]) => circle(x, y, 1.6, P.leaf, { ns: true })),
      circle(80, 80, 32, P.mint), circle(80, 80, 25, P.pink, { sw: 2 }), circle(80, 80, 13, P.coral, { ns: true }),
      ...[[74, 74], [86, 74], [80, 86], [72, 84], [88, 84], [80, 70]].map(([x, y]) => circle(x, y, 2.4, P.cream, { ns: true })),
    ],
  },
  {
    word: 'BREADFRUIT', meaning: 'a breadfruit', alt: 'A big round green breadfruit with a bumpy skin, hanging from a branch beside one huge deeply cut leaf.',
    draw: () => [
      path('M66 30Q60 10 40 8Q48 14 40 18Q28 10 18 16Q28 20 22 26Q10 24 6 34Q18 34 16 42Q6 44 6 54Q30 46 48 38Q60 34 66 30Z', P.forest),
      line('M66 30L18 44M40 22L36 40', { stroke: P.leaf, sw: 2 }),
      line('M66 30Q86 18 110 16', { stroke: P.ink, sw: 8 }), line('M66 30Q86 18 110 16', { stroke: P.brown, sw: 3.5 }), line('M70 30V38', { stroke: P.ink, sw: 6 }), line('M70 30V38', { stroke: P.brown, sw: 2 }),
      circle(70, 74, 38, P.leaf),
      ...[[56, 50], [72, 46], [88, 54], [48, 66], [64, 62], [80, 66], [96, 72], [52, 82], [68, 80], [84, 86], [60, 98], [76, 100], [42, 86], [94, 92]].map(([x, y]) => circle(x, y, 3, P.mint, { sw: 1.5 })),
    ],
  },
  {
    word: 'TARO', meaning: 'a taro plant and root', alt: 'A taro plant: one huge heart-shaped green leaf on a long stem, and a hairy brown ringed root lying beside a cut slice with purple-speckled white flesh.',
    draw: () => [
      line('M52 84Q50 64 50 52', { stroke: P.ink, sw: 9 }), line('M52 84Q50 64 50 52', { stroke: P.forest, sw: 4.5 }),
      path('M50 52Q22 54 10 34Q4 18 18 8Q32 2 44 14Q50 22 50 30Q52 20 62 12Q80 2 94 12Q106 26 96 40Q84 54 50 52Z', P.leaf),
      line('M50 52V20M50 44L24 24M50 44L80 22M50 34L32 16M50 34L68 14', { stroke: P.forest, sw: 2 }),
      path('M14 92Q14 76 40 76Q66 76 70 90Q70 108 40 108Q14 108 14 92Z', P.brown), line('M26 80V106M40 78V108M54 80V106', { stroke: P.wood, sw: 2.5 }),
      line('M12 88l-6-2M12 96l-6 2M70 96l6 2M34 108l-2 6M48 108l2 6', { stroke: P.brown, sw: 2 }),
      circle(94, 90, 18, P.brown), circle(94, 90, 14, P.paper, { ns: true }),
      ...[[88, 84], [98, 86], [92, 96], [100, 94], [94, 90]].map(([x, y]) => circle(x, y, 1.8, P.purple, { ns: true })),
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
    word: 'CANOE', meaning: 'a canoe', alt: 'A long narrow wooden canoe, pointed and curved up at both ends, with a single paddle resting in it.',
    draw: () => [
      line('M62 22L86 74', { stroke: P.ink, sw: 7 }), line('M62 22L86 74', { stroke: P.wood, sw: 2.5 }), path('M82 68L94 92L86 96L76 72Z', P.wood),
      path('M2 48Q10 52 16 62Q60 74 104 62Q110 52 118 48Q114 70 102 80Q60 92 18 80Q6 70 2 48Z', P.brown),
      path('M16 62Q60 74 104 62Q100 68 92 70Q60 78 28 70Q20 68 16 62Z', P.wood, { sw: 2 }),
      line('M26 78Q60 88 94 78', { stroke: P.sand, sw: 3 }),
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
    word: 'REEF', meaning: 'a coral reef', alt: 'A coral reef on the sea floor: pink branching coral, round orange brain coral, green seaweed and two small fish swimming by.',
    draw: () => [
      path('M6 108Q10 92 30 92Q46 84 62 90Q80 84 96 92Q112 92 114 108Z', P.sand),
      line('M30 94V70M30 80L18 62M30 74L42 56M30 66L26 48M18 62L12 52M42 56L48 46', { stroke: P.ink, sw: 9 }), line('M30 94V70M30 80L18 62M30 74L42 56M30 66L26 48M18 62L12 52M42 56L48 46', { stroke: P.pink, sw: 4 }),
      path('M62 94Q48 94 48 80Q48 62 64 60Q82 60 82 78Q82 94 62 94Z', P.orange), line('M54 72Q64 76 74 70M54 82Q64 86 78 80', { sw: 2 }),
      line('M100 94Q92 74 100 58Q106 46 100 34M92 94Q94 82 88 70', { stroke: P.ink, sw: 7 }), line('M100 94Q92 74 100 58Q106 46 100 34M92 94Q94 82 88 70', { stroke: P.leaf, sw: 3 }),
      path('M48 30Q60 20 72 30Q60 40 48 30ZM48 30L40 24V36Z', P.yellow), dot(66, 29, 1.8),
      path('M78 48Q86 42 94 48Q86 54 78 48ZM78 48L72 44V52Z', P.blue), dot(90, 47, 1.5),
      circle(24, 30, 3, P.sky, { sw: 2 }), circle(30, 20, 2.2, P.sky, { sw: 2 }),
    ],
  },
  {
    word: 'CLIFF', meaning: 'a sea cliff', alt: 'A tall rocky cliff with green grass on top and a sheer rock face dropping straight down into the sea.',
    draw: () => [
      path('M6 94Q20 88 34 94Q48 100 60 94Q72 88 86 94Q100 100 114 94V110H6Z', P.blue),
      path('M6 96V22H70L74 40L66 58L74 74L68 96Z', P.stone),
      line('M18 40H40M30 56H58M14 72H40M46 84H64M50 34L60 44', { stroke: P.slate, sw: 2.5 }),
      path('M6 26Q8 12 22 14Q34 6 48 12Q62 8 72 18L72 28Q40 22 6 30Z', P.leaf),
      path('M68 92Q76 84 84 92', undefined, { stroke: P.paper, sw: 3 }),
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
    word: 'BUFFALO', meaning: 'a water buffalo (carabao)', alt: 'A grey water buffalo standing in a muddy pool, its head turned to you, with two wide horns curving up and back.',
    draw: () => [
      ...[18, 32, 58, 72].map(x => rect(x, 72, 10, 26, 4, P.slate)),
      path('M4 96Q20 88 50 92Q80 86 116 96Q112 112 60 112Q8 112 4 96Z', P.brown), line('M12 102q8-3 16 0M70 104q8-3 16 0', { stroke: P.wood, sw: 2.5 }),
      line('M14 54Q6 66 10 82', { sw: 3 }), ellipse(48, 62, 38, 22, P.slate),
      path('M74 40Q56 40 50 26Q48 16 56 14Q58 28 76 32ZM94 40Q112 40 118 26Q120 16 112 14Q110 28 92 32Z', P.cream),
      path('M74 38Q86 32 98 38L98 70Q96 82 86 82Q76 82 74 70Z', P.slate), ellipse(86, 74, 10, 7, P.stone, { sw: 2 }),
      dot(82, 74, 1.6), dot(90, 74, 1.6), eyes(79, 52, 93, 52, 2.6), path('M74 44L62 42L72 52ZM98 44L110 42L100 52Z', P.slate),
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
