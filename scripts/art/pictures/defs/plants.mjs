import { P, circle, ellipse, rect, path, line, patch, dot } from '../style.mjs';

const petals = (x, y, n, r, pr, fill, o = {}) => Array.from({ length: n }, (_, i) => ellipse(x + r * Math.cos((i * 2 * Math.PI) / n - Math.PI / 2), y + r * Math.sin((i * 2 * Math.PI) / n - Math.PI / 2), pr * 0.62, pr, fill, { ...o, t: `rotate(${(i * 360) / n} ${x + r * Math.cos((i * 2 * Math.PI) / n - Math.PI / 2)} ${y + r * Math.sin((i * 2 * Math.PI) / n - Math.PI / 2)})` }));
const stem = (d, w = 8) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: P.leaf, sw: w - 4.5 })];
const leafShape = (x, y, rot, s = 1) => path(`M0 0Q${10 * s} ${-14 * s} ${28 * s} ${-8 * s}Q${16 * s} ${8 * s} 0 0Z`, P.leaf, { t: `translate(${x} ${y}) rotate(${rot})` });

export default [
  {
    word: 'TREE', meaning: 'a tree', alt: 'A leafy green tree with a round crown and a brown trunk.',
    draw: () => [
      path('M52 112L54 70H66L68 112Z', P.brown), line('M60 84L50 72M60 78L70 66', { stroke: P.brown, sw: 4 }),
      path('M60 8Q80 8 86 22Q104 24 104 44Q112 60 96 72Q90 86 72 82Q62 92 48 84Q28 88 22 72Q6 62 16 46Q14 26 34 22Q42 8 60 8Z', P.leaf),
      patch('M30 40Q36 28 50 26Q40 34 38 46Z', P.mint),
    ],
  },
  {
    word: 'FLOWER', meaning: 'a flower', alt: 'A pink flower with five round petals, a yellow middle and a green stem with two leaves.',
    draw: () => [
      ...stem('M60 54V114'), leafShape(60, 96, -150, 1.2), leafShape(60, 84, -30, 1.2),
      ...[0, 1, 2, 3, 4].map(i => circle(60 + 22 * Math.cos(i * 1.2566 - 1.5708), 38 + 22 * Math.sin(i * 1.2566 - 1.5708), 15, P.pink)),
      circle(60, 38, 12, P.yellow),
    ],
  },
  {
    word: 'LEAF', meaning: 'a leaf', alt: 'A single green leaf with a stem and a pattern of veins.',
    draw: () => [
      path('M20 104Q8 52 46 24Q74 6 106 10Q112 44 90 72Q64 104 20 104Z', P.leaf),
      line('M10 114L24 98Q56 62 96 22M42 78L34 56M56 62L50 38M70 48L66 26M48 72L72 74M64 56L88 58M78 40L98 42', { stroke: P.forest, sw: 2.5 }),
      line('M10 114L22 100', { sw: 3 }),
    ],
  },
  {
    word: 'ROSE', meaning: 'a rose', alt: 'A red rose seen from the side with layered swirled petals, on a green stem with leaves and sharp thorns.',
    draw: () => [
      line('M60 58V114', { stroke: P.ink, sw: 8 }), line('M60 58V114', { stroke: P.leaf, sw: 3.5 }),
      path('M60 82l-8-4 8 0ZM60 98l8-4v4Z', P.leaf, { sw: 2 }),
      path('M60 90Q40 92 28 82Q40 74 60 84Z', P.leaf), path('M60 74Q80 76 92 66Q80 58 60 68Z', P.leaf),
      path('M28 30Q26 58 60 64Q94 58 92 30Q84 40 76 36Q78 18 60 12Q42 18 44 36Q36 40 28 30Z', P.red),
      path('M44 36Q46 22 60 18Q74 22 76 36Q70 46 60 44Q50 46 44 36Z', P.coral, { sw: 2 }),
      path('M52 34Q54 26 60 26Q68 28 66 36Q60 40 56 34', undefined, { sw: 2 }), path('M34 44Q46 56 60 54Q74 56 86 44', undefined, { sw: 2 }),
    ],
  },
  {
    word: 'DAISY', meaning: 'a daisy', alt: 'A daisy with many long white petals around a big yellow centre.',
    draw: () => [...stem('M60 62V114'), leafShape(60, 98, -160, 1.2), ...petals(60, 46, 12, 22, 14, P.paper, { sw: 2 }), circle(60, 46, 13, P.yellow), circle(56, 42, 2, P.gold, { ns: true }), circle(64, 48, 2, P.gold, { ns: true })],
  },
  {
    word: 'TULIP', meaning: 'a tulip', alt: 'A red tulip flower shaped like a cup with pointed petals, on a tall stem with a long leaf.',
    draw: () => [
      ...stem('M60 66V114'), path('M58 112Q30 98 26 60Q46 74 58 100Z', P.leaf),
      path('M36 22Q34 56 46 66Q60 74 74 66Q86 56 84 22L72 36L60 14L48 36Z', P.red), path('M48 36L60 14L72 36Q66 56 60 66Q54 56 48 36Z', P.coral, { sw: 2 }),
    ],
  },
  {
    word: 'CACTUS', meaning: 'a cactus', alt: 'A tall green cactus with two curved arms and little spines, in a clay pot.',
    draw: () => [
      path('M44 90V18Q44 8 54 8H66Q76 8 76 18V90Z', P.leaf),
      path('M44 62H32Q22 62 22 52V32Q22 24 29 24Q36 24 36 32V48H44ZM76 52H88Q98 52 98 42V26Q98 18 91 18Q84 18 84 26V40H76Z', P.leaf),
      line('M60 16V84M52 22V84M68 22V84', { stroke: P.forest, sw: 2 }), line('M40 30l-4-2M40 44l-4-2M80 30l4-2M80 70l4-2M26 36l-4 0M94 32l4 0', { sw: 2 }),
      path('M34 88H86L80 114H40Z', P.coral), rect(30, 84, 60, 10, 3, P.orange),
    ],
  },
  {
    word: 'ACORN', meaning: 'an acorn', alt: 'A brown acorn nut with a bumpy cap and a little stem.',
    draw: () => [
      path('M30 46Q28 92 60 112Q92 92 90 46Z', P.wood), patch('M38 54Q38 82 54 98Q42 80 46 54Z', P.sand),
      path('M24 50Q20 22 60 20Q100 22 96 50Q60 58 24 50Z', P.brown), line('M34 34l6 6M48 26l4 8M64 24l0 8M78 28l-4 7M88 38l-6 5', { stroke: P.wood, sw: 2 }),
      line('M60 20Q60 10 68 6', { stroke: P.brown, sw: 6 }), line('M60 20Q60 10 68 6', { sw: 2 }),
    ],
  },
  {
    word: 'GRASS', meaning: 'grass', alt: 'A thick tuft of bright green grass blades growing from the ground.',
    draw: () => [
      path('M8 104Q14 70 10 40Q26 66 26 98Q30 54 24 16Q42 54 40 98Q46 60 58 26Q60 64 54 98Q62 62 80 18Q80 60 70 98Q78 66 96 36Q96 72 86 100Q94 76 110 56Q108 86 104 104Z', P.leaf),
      line('M26 98Q28 70 24 40M54 98Q56 70 56 46M70 98Q76 70 80 44M86 100Q90 80 96 62', { stroke: P.forest, sw: 2 }), line('M4 104H116', { stroke: P.brown, sw: 4 }),
    ],
  },
  {
    word: 'BUSH', meaning: 'a bush (shrub)', alt: 'A wide, low, leafy green bush growing from the ground, with lots of small rounded clumps of leaves.',
    draw: () => [
      path('M6 98Q2 80 16 74Q12 56 30 52Q36 36 54 42Q66 30 80 40Q98 36 102 54Q118 60 112 78Q118 96 104 98Z', P.forest),
      ...[[26, 66], [46, 54], [68, 48], [88, 56], [100, 74], [60, 70], [34, 84], [80, 84]].map(([x, y]) => path(`M${x - 8} ${y + 4}Q${x - 6} ${y - 6} ${x} ${y - 6}Q${x + 6} ${y - 6} ${x + 8} ${y + 4}`, undefined, { stroke: P.leaf, sw: 3 })),
      line('M2 98H118', { stroke: P.brown, sw: 4 }),
    ],
  },
  {
    word: 'BRANCH', fit: [0.791, 65.0, 59.5], meaning: 'a tree branch', alt: 'A brown tree branch that forks into smaller twigs, with several green leaves along it.',
    draw: () => [
      path('M6 104Q38 88 62 66Q80 50 96 24', undefined, { stroke: P.ink, sw: 15 }), path('M6 104Q38 88 62 66Q80 50 96 24', undefined, { stroke: P.brown, sw: 10 }),
      path('M62 66Q86 64 110 70M40 84Q40 64 30 50M80 46Q96 40 106 28', undefined, { stroke: P.ink, sw: 9 }), path('M62 66Q86 64 110 70M40 84Q40 64 30 50M80 46Q96 40 106 28', undefined, { stroke: P.brown, sw: 4.5 }),
      ...[[110, 70, 20], [30, 50, -110], [106, 28, -40], [96, 24, -80], [86, 64, 60], [52, 74, 100], [70, 56, -60], [22, 96, 120]].map(([x, y, r]) => path('M0 0Q8 -10 20 -6Q12 6 0 0Z', P.leaf, { t: `translate(${x} ${y}) rotate(${r}) scale(1.1)` })),
    ],
  },
  {
    word: 'LOG', meaning: 'a wooden log', alt: 'A brown wooden log lying on its side, its cut end showing tree rings.',
    draw: () => [
      path('M30 34H96Q110 34 110 60Q110 86 96 86H30Z', P.brown), line('M48 44H90M44 60H96M50 76H86', { stroke: P.wood, sw: 2.5 }),
      line('M76 34l6-10', { stroke: P.brown, sw: 5 }), path('M78 24Q86 16 92 22Q84 28 78 24Z', P.leaf, { sw: 2 }),
      ellipse(30, 60, 20, 26, P.sand), ellipse(30, 60, 13, 18, undefined, { stroke: P.wood, sw: 2 }), ellipse(30, 60, 6, 9, undefined, { stroke: P.wood, sw: 2 }), dot(30, 60, 1.6),
    ],
  },
  {
    word: 'STUMP', meaning: 'a tree stump', alt: 'A short tree stump with spreading roots and a flat cut top showing rings.',
    draw: () => [
      path('M26 48V90Q16 104 6 106H34Q44 98 48 104H72Q76 98 86 106H114Q104 104 94 90V48Z', P.brown),
      line('M40 56V92M60 58V100M80 56V92', { stroke: P.wood, sw: 2.5 }),
      ellipse(60, 48, 34, 14, P.sand), ellipse(60, 48, 22, 9, undefined, { stroke: P.wood, sw: 2 }), ellipse(60, 48, 10, 4, undefined, { stroke: P.wood, sw: 2 }),
      path('M90 40Q100 26 108 30Q104 40 92 42Z', P.leaf, { sw: 2 }),
    ],
  },
  {
    word: 'FERN', meaning: 'a fern', alt: 'A green fern: long arching fronds lined with pairs of small leaflets, and one new frond curled up tight like a spiral.',
    draw: () => {
      const frond = ([x0, y0, cx, cy, x1, y1]) => {
        let d = `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`;
        for (let i = 1; i <= 9; i++) {
          const t = i / 10, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1, s = 1.1 - t * 0.7;
          d += `M${x} ${y}l${-13 * s} ${-7 * s}M${x} ${y}l${13 * s} ${-7 * s}`;
        }
        return [path(d, undefined, { stroke: P.ink, sw: 9 }), path(d, undefined, { stroke: P.leaf, sw: 4.5 })];
      };
      return [...frond([56, 112, 20, 50, 12, 18]), ...frond([64, 112, 100, 50, 108, 18]), ...frond([60, 112, 62, 50, 54, 8]),
        path('M60 112Q84 100 88 82Q90 70 80 70Q72 72 76 80', undefined, { stroke: P.ink, sw: 8 }), path('M60 112Q84 100 88 82Q90 70 80 70Q72 72 76 80', undefined, { stroke: P.leaf, sw: 4 })];
    },
  },
  {
    word: 'CLOVER', meaning: 'a four-leaf clover', alt: 'A green four-leaf clover with heart-shaped leaves and a short curved stem.',
    draw: () => [
      ...stem('M60 62Q64 92 80 112', 9),
      ...[0, 90, 180, 270].map(r => path('M60 58Q40 54 36 38Q34 24 46 22Q56 22 58 32Q64 24 72 30Q78 38 70 46Z', P.leaf, { t: `rotate(${r + 45} 60 58)` })),
      ...[0, 90, 180, 270].map(r => line('M60 58L48 38', { stroke: P.forest, sw: 2, t: `rotate(${r + 45} 60 58)` })),
    ],
  },
  {
    word: 'SPROUT', meaning: 'a sprout (seedling)', alt: 'A tiny green seedling with two round leaves growing out of a mound of brown soil.',
    draw: () => [
      ...stem('M60 96V50', 9), path('M60 58Q40 64 24 52Q20 30 46 32Q60 38 60 58Z', P.leaf), path('M60 50Q78 54 96 40Q98 20 74 22Q60 28 60 50Z', P.leaf),
      line('M58 56L34 44M62 48L88 32', { stroke: P.forest, sw: 2 }),
      path('M8 108Q14 88 40 88Q60 82 80 88Q106 88 112 108Z', P.brown), circle(34, 98, 2.4, P.wood, { ns: true }), circle(78, 100, 2.4, P.wood, { ns: true }), circle(56, 96, 2, P.wood, { ns: true }),
    ],
  },
  {
    word: 'PINE', meaning: 'a pine tree', alt: 'A tall pointed pine tree with layers of dark green branches and a brown trunk.',
    draw: () => [
      rect(53, 94, 14, 18, 2, P.brown),
      path('M60 6L82 36H70L92 64H78L104 96H16L42 64H28L50 36H38Z', P.forest),
      line('M44 36H50M70 36H76M34 64H42M78 64H86', { stroke: P.leaf, sw: 3 }),
      circle(78, 82, 4, P.brown, { sw: 2 }),
    ],
  },
];
