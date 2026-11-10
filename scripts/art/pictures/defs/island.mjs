import { P, circle, ellipse, rect, path, line, poly, patch, dot, group, ring } from '../style.mjs';

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
    word: 'GUAVA', meaning: 'a guava fruit', alt: 'A whole green guava with a leaf at its stem, beside a cut half showing pink flesh full of small seeds.',
    draw: () => [
      path('M44 16Q62 2 80 8Q72 22 50 22Z', P.forest), line('M46 18L42 10', { stroke: P.brown, sw: 3 }),
      path('M40 18Q14 22 12 48Q14 76 40 78Q66 76 68 48Q66 22 40 18Z', P.leaf), patch('M20 40Q24 30 32 28Q26 36 26 46Z', P.mint),
      circle(80, 80, 32, P.mint), circle(80, 80, 26, P.pink, { sw: 2 }), circle(80, 80, 13, P.coral, { ns: true }),
      ...[[74, 74], [86, 74], [80, 86], [72, 84], [88, 84], [80, 70], [70, 78], [90, 78]].map(([x, y]) => circle(x, y, 2.2, P.cream, { ns: true })),
    ],
  },
  {
    word: 'BREADFRUIT', meaning: 'a breadfruit', alt: 'A big round green breadfruit with a bumpy skin of little six-sided bumps, hanging on a branch beside one huge deeply cut leaf.',
    draw: () => [
      path('M66 30Q60 10 40 8Q48 14 40 18Q28 10 18 16Q28 20 22 26Q10 24 6 34Q18 34 16 42Q6 44 6 54Q30 46 48 38Q60 34 66 30Z', P.forest),
      line('M66 30L18 44M40 22L36 40', { stroke: P.leaf, sw: 2 }),
      line('M66 30Q86 18 110 16', { stroke: P.ink, sw: 8 }), line('M66 30Q86 18 110 16', { stroke: P.brown, sw: 3.5 }), line('M70 30V38', { stroke: P.ink, sw: 6 }), line('M70 30V38', { stroke: P.brown, sw: 2 }),
      circle(70, 74, 38, P.leaf),
      ...[[56, 50], [72, 46], [88, 54], [48, 66], [64, 62], [80, 66], [96, 72], [52, 82], [68, 80], [84, 86], [60, 98], [76, 100], [42, 86], [94, 92]].map(([x, y]) => poly(ring(x, y, 5.5, 6, 0), P.mint, { sw: 1.5 })),
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
    word: 'CANOE', meaning: 'a canoe', alt: 'A long narrow wooden canoe floating on water, curved up at both ends, with a single paddle resting in it.',
    draw: () => [
      path('M2 88Q16 82 30 88Q44 94 60 88Q76 82 90 88Q104 94 118 88V100H2Z', P.blue),
      line('M60 22L84 74', { stroke: P.ink, sw: 7 }), line('M60 22L84 74', { stroke: P.wood, sw: 2.5 }), path('M80 68L92 92L84 96L74 72Z', P.wood),
      path('M2 52Q10 56 16 66Q60 78 104 66Q110 56 118 52Q114 74 102 84Q60 94 18 84Q6 74 2 52Z', P.brown),
      path('M16 66Q60 78 104 66Q100 72 92 74Q60 82 28 74Q20 72 16 66Z', P.wood, { sw: 2 }),
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
    word: 'REEF', meaning: 'a coral reef', alt: 'An underwater coral reef in blue water: pink branching coral, orange round coral, green seaweed and a yellow fish.',
    draw: () => [
      rect(8, 10, 104, 100, 16, P.sky, { ns: true }), patch('M8 90Q30 82 60 88Q90 82 112 90V96Q112 110 98 110H22Q8 110 8 96Z', P.sand),
      line('M32 92V66M32 76L20 56M32 70L46 50M32 62L28 42M20 56L14 46M46 50L52 40', { stroke: P.ink, sw: 10 }), line('M32 92V66M32 76L20 56M32 70L46 50M32 62L28 42M20 56L14 46M46 50L52 40', { stroke: P.pink, sw: 5 }),
      path('M68 94Q50 94 50 78Q50 60 68 58Q86 58 86 76Q86 94 68 94Z', P.orange), line('M58 70Q68 74 78 68M56 80Q68 84 82 78', { sw: 2 }),
      line('M102 94Q94 74 102 58Q108 46 102 34', { stroke: P.ink, sw: 7 }), line('M102 94Q94 74 102 58Q108 46 102 34', { stroke: P.leaf, sw: 3 }),
      path('M58 30Q70 20 82 30Q70 40 58 30ZM58 30L50 24V36Z', P.yellow), dot(76, 29, 1.8), rect(8, 10, 104, 100, 16),
    ],
  },
  {
    word: 'CLIFF', meaning: 'a sea cliff', alt: 'A tall rocky cliff with grass on top and a sheer rock face dropping straight down to the sea, with waves crashing at its foot.',
    draw: () => [
      path('M6 90Q20 84 34 90Q48 96 60 90Q72 84 86 90Q100 96 114 90V110H6Z', P.blue),
      path('M6 96V16H66L70 34L62 52L72 70L64 96Z', P.stone),
      line('M18 34H40M30 50H56M14 66H40M44 80H62M48 26L58 36', { stroke: P.slate, sw: 2.5 }),
      path('M6 20Q8 6 22 8Q34 0 48 6Q62 2 70 12L70 22Q40 16 6 24Z', P.leaf),
      path('M60 92Q66 78 78 84Q86 88 92 82', undefined, { stroke: P.paper, sw: 4 }), circle(80, 76, 2.5, P.paper, { sw: 1.5 }), circle(70, 74, 2, P.paper, { sw: 1.5 }),
    ],
  },
  {
    word: 'CAVE', meaning: 'a cave', alt: 'A rocky grey hillside with a big dark, jagged cave mouth, with pointed rocks hanging down from its roof.',
    draw: () => [
      path('M4 106Q6 50 32 30Q52 14 72 22Q98 26 110 58Q116 82 116 106Z', P.stone),
      path('M24 106Q20 82 34 66Q44 52 60 56Q78 52 88 70Q98 86 94 106Z', P.charcoal),
      path('M38 64L42 76L46 62ZM52 56L56 72L60 56ZM68 56L72 70L76 58ZM82 66L84 76L88 72Z', P.stone, { sw: 2 }),
      line('M20 50l12 4M80 34l12 6M100 78l8 2M46 30l10-2', { stroke: P.slate, sw: 2 }), line('M2 106H118'),
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
    word: 'BUFFALO', meaning: 'a water buffalo (carabao)', alt: 'A dark grey water buffalo standing in muddy water, its head turned to you, with huge crescent horns sweeping back.',
    draw: () => [
      ...[18, 32, 58, 72].map(x => rect(x, 72, 10, 26, 4, P.charcoal)),
      path('M4 96Q20 88 50 92Q80 86 116 96Q112 112 60 112Q8 112 4 96Z', P.brown), line('M12 102q8-3 16 0M70 104q8-3 16 0', { stroke: P.wood, sw: 2.5 }),
      line('M14 54Q6 66 10 82', { sw: 3 }), ellipse(48, 62, 38, 22, P.charcoal),
      path('M74 42Q48 44 42 22Q42 10 52 8Q52 28 76 32ZM98 42Q124 44 118 20Q116 8 108 8Q110 28 94 32Z', P.cream),
      path('M74 38Q86 32 98 38L98 70Q96 82 86 82Q76 82 74 70Z', P.slate), ellipse(86, 74, 10, 7, P.stone, { sw: 2 }),
      dot(82, 74, 1.6), dot(90, 74, 1.6), circle(79, 52, 3, P.paper, { ns: true }), circle(93, 52, 3, P.paper, { ns: true }), dot(79, 52, 1.6), dot(93, 52, 1.6),
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
