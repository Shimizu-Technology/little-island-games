import { P, circle, ellipse, rect, path, line, poly, patch, dot, group } from '../style.mjs';

const leaf = (x, y, rot = -30, fill = P.leaf, s = 1) => path(`M0 0Q${10 * s} ${-12 * s} ${26 * s} ${-6 * s}Q${14 * s} ${8 * s} 0 0Z`, fill, { t: `translate(${x} ${y}) rotate(${rot})` });
const bowl = (fill = P.sky) => [path('M10 62H110Q108 100 60 102Q12 100 10 62Z', fill), path('M44 100L40 108H80L76 100Z', fill)];
const shine = (x, y, s = 1) => patch(`M${x} ${y}Q${x + 6 * s} ${y - 8 * s} ${x + 14 * s} ${y - 8 * s}Q${x + 6 * s} ${y - 2 * s} ${x + 4 * s} ${y + 8 * s}Z`, P.paper);

export default [
  {
    word: 'APPLE', meaning: 'an apple', alt: 'A shiny red apple with a short brown stem and a green leaf.',
    draw: () => [
      line('M60 34Q58 20 64 12', { stroke: P.brown, sw: 5 }), leaf(62, 22, -20, P.leaf, 1.3),
      path('M60 34Q78 22 96 34Q112 50 104 78Q94 108 72 108Q64 106 60 102Q56 106 48 108Q26 108 16 78Q8 50 24 34Q42 22 60 34Z', P.red), shine(30, 50, 1.2),
    ],
  },
  {
    word: 'BANANA', meaning: 'a banana', alt: 'A curved yellow banana with brown tips.',
    draw: () => [
      path('M16 34Q14 82 52 98Q84 110 108 88Q110 82 104 82Q82 98 56 88Q30 78 28 36Z', P.yellow),
      path('M28 36Q30 66 50 80Q72 92 104 82', undefined, { sw: 2 }),
      path('M14 34L16 24Q22 22 26 24L28 36Q22 40 16 38Z', P.brown), path('M104 82L112 84L110 92L106 90Z', P.charcoal, { sw: 2 }),
    ],
  },
  {
    word: 'ORANGE', meaning: 'an orange, the fruit', otherMeaning: 'the colour orange', alt: 'A round orange fruit with dimpled peel, a small stem and a green leaf.',
    draw: () => [
      circle(60, 66, 42, P.orange), line('M60 26L62 18', { stroke: P.brown, sw: 4 }), leaf(62, 22, -24, P.leaf, 1.3),
      ...[[40, 50], [54, 42], [74, 46], [86, 62], [76, 86], [56, 92], [38, 80], [30, 64], [62, 66]].map(([x, y]) => circle(x, y, 1.8, P.gold, { ns: true })), shine(34, 56, 1.1),
    ],
  },
  {
    word: 'GRAPE', meaning: 'a bunch of grapes', alt: 'A bunch of round purple grapes hanging from a short stem with a green leaf.',
    draw: () => [
      line('M60 22Q58 12 64 6', { stroke: P.brown, sw: 5 }), path('M62 18Q76 4 96 12Q90 26 72 26Z', P.leaf),
      ...[[44, 34], [60, 32], [76, 34], [36, 50], [52, 48], [68, 48], [84, 50], [44, 64], [60, 64], [76, 64], [52, 80], [68, 80], [60, 96]].map(([x, y]) => circle(x, y, 10, P.purple)),
      ...[[40, 30], [56, 44], [72, 60], [48, 76]].map(([x, y]) => circle(x, y, 2.4, P.paper, { ns: true })),
    ],
  },
  {
    word: 'PEAR', fit: [0.891, 60.0, 54.5], meaning: 'a pear', alt: 'A green-yellow pear, narrow at the top and round at the bottom, with a stem and leaf.',
    draw: () => [
      line('M60 26Q60 14 66 8', { stroke: P.brown, sw: 5 }), leaf(64, 16, -24, P.leaf, 1.2),
      path('M60 24Q74 24 76 46Q78 56 90 66Q104 82 94 98Q82 112 60 112Q38 112 26 98Q16 82 30 66Q42 56 44 46Q46 24 60 24Z', P.mint),
      patch('M70 30Q74 50 88 66Q100 82 92 98Q86 84 74 70Q66 56 70 30Z', P.leaf), shine(34, 76, 1),
      path('M60 24Q74 24 76 46Q78 56 90 66Q104 82 94 98Q82 112 60 112Q38 112 26 98Q16 82 30 66Q42 56 44 46Q46 24 60 24Z'),
    ],
  },
  {
    word: 'CHERRY', fit: [0.955, 60.0, 52.5], meaning: 'cherries', alt: 'Two round red cherries joined by thin green stems, with a leaf at the top.',
    draw: () => [
      line('M38 80Q44 40 70 14M84 76Q80 40 70 14', { stroke: P.forest, sw: 4 }), leaf(70, 14, -10, P.leaf, 1.4),
      circle(36, 84, 22, P.red), circle(84, 80, 22, P.red), shine(24, 80, 0.9), shine(72, 76, 0.9),
    ],
  },
  {
    word: 'WATERMELON', meaning: 'a watermelon slice', alt: 'A slice of watermelon: a red wedge with black seeds and a green rind.',
    draw: () => [
      path('M6 40Q60 120 114 40Z', P.forest), path('M14 40Q60 108 106 40Z', P.paper, { ns: true }), path('M20 40Q60 100 100 40Z', P.red, { ns: true }),
      path('M6 40Q60 120 114 40Z'), line('M6 40H114'),
      ...[[40, 52], [60, 50], [80, 52], [50, 66], [70, 66], [60, 80]].map(([x, y]) => ellipse(x, y, 2.6, 4, P.charcoal, { ns: true })),
    ],
  },
  {
    word: 'PINEAPPLE', meaning: 'a pineapple', alt: 'A yellow pineapple with a criss-cross patterned skin and a spiky green crown.',
    draw: () => [
      path('M60 40L50 6L60 20L66 2L70 22L84 8L76 36L96 22L80 44H40L24 22L44 36L36 12Z', P.leaf),
      ellipse(60, 76, 30, 38, P.gold),
      line('M34 56L72 112M40 46L86 108M54 40L90 88M30 74L56 112M86 56L48 112M80 46L34 108M66 40L30 88M90 74L64 112', { stroke: P.wood, sw: 2 }),
      ellipse(60, 76, 30, 38),
    ],
  },
  {
    word: 'LEMON', meaning: 'a lemon', alt: 'A bright yellow lemon, oval with a little point at each end.',
    draw: () => [
      path('M14 64Q8 58 14 54Q24 26 60 26Q96 26 106 54Q112 58 106 64Q98 96 60 96Q22 96 14 64Z', P.yellow),
      leaf(92, 34, -40, P.leaf, 1.2), shine(32, 48, 1.1),
      ...[[44, 60], [66, 52], [80, 70], [56, 78]].map(([x, y]) => circle(x, y, 1.6, P.gold, { ns: true })),
    ],
  },
  {
    word: 'LIME', meaning: 'a lime', alt: 'A green lime beside a cut slice showing pale green segments.',
    draw: () => [
      ellipse(42, 52, 32, 28, P.leaf), shine(24, 44, 1),
      circle(80, 80, 30, P.forest), circle(80, 80, 25, P.mint, { ns: true }),
      ...Array.from({ length: 8 }, (_, i) => line(`M80 80L${80 + 22 * Math.cos(i * Math.PI / 4)} ${80 + 22 * Math.sin(i * Math.PI / 4)}`, { stroke: P.paper, sw: 3 })),
      circle(80, 80, 30), circle(80, 80, 4, P.paper, { ns: true }),
    ],
  },
  {
    word: 'PEACH', meaning: 'a peach', alt: 'A soft round peach, pink blushing to orange, with a deep crease down its middle and a green leaf at the top.',
    draw: () => [
      line('M60 26L62 16', { stroke: P.brown, sw: 4 }), path('M62 20Q74 6 94 12Q86 26 66 24Z', P.leaf),
      path('M60 28Q100 22 106 64Q106 106 62 108Q18 110 14 70Q12 30 60 28Z', P.orange),
      patch('M60 28Q26 30 18 60Q16 96 52 106Q28 86 34 60Q40 36 60 28Z', P.pink), patch('M64 30Q96 28 102 60Q100 84 86 98Q96 74 90 56Q84 38 64 30Z', P.coral),
      path('M60 28Q100 22 106 64Q106 106 62 108Q18 110 14 70Q12 30 60 28Z'), path('M60 30Q48 66 62 106', undefined, { sw: 3 }),
    ],
  },
  {
    word: 'PLUM', meaning: 'a plum', alt: 'A dark purple plum, round with a faint crease, a short stem and one leaf.',
    draw: () => [
      line('M60 30L58 16', { stroke: P.brown, sw: 4 }), leaf(58, 20, -150, P.leaf, 1.3),
      path('M60 30Q102 26 104 68Q102 108 62 108Q18 108 16 68Q18 30 60 30Z', P.purple), line('M64 32Q78 66 66 106', { sw: 2.5 }), shine(30, 54, 1.1),
    ],
  },
  {
    word: 'KIWI', meaning: 'a kiwi fruit', otherMeaning: 'the kiwi bird', alt: 'A kiwi fruit cut in half: bright green inside with a ring of tiny black seeds, beside a fuzzy brown whole kiwi.',
    draw: () => [
      ellipse(36, 50, 28, 32, P.wood), line('M20 30l-3-3M30 24l-1-4M50 30l3-3M14 48h-4M56 52h4', { stroke: P.brown, sw: 2 }),
      ellipse(76, 72, 34, 36, P.wood), ellipse(76, 72, 28, 30, P.leaf, { sw: 2 }), ellipse(76, 72, 10, 12, P.cream, { ns: true }),
      ...Array.from({ length: 12 }, (_, i) => dot(76 + 16 * Math.cos(i * Math.PI / 6), 72 + 18 * Math.sin(i * Math.PI / 6), 1.8)),
    ],
  },
  {
    word: 'CARROT', meaning: 'a carrot', alt: 'An orange carrot with lines across it and a bushy green top.',
    draw: () => [
      path('M78 30Q74 10 86 4Q88 18 82 30ZM82 32Q92 14 108 14Q102 28 86 36ZM84 36Q100 30 112 38Q100 46 86 40Z', P.leaf),
      path('M84 34Q96 46 82 58L24 108Q16 112 14 104L64 40Q74 28 84 34Z', P.orange),
      line('M60 52l8 6M48 66l8 6M38 80l6 5M28 92l5 4', { sw: 2 }),
    ],
  },
  {
    word: 'CORN', meaning: 'an ear of corn', alt: 'An ear of yellow corn with rows of kernels, wrapped at the bottom in green husk leaves.',
    draw: () => [
      group({ t: 'rotate(30 60 60)' },
        path('M44 26Q44 8 60 8Q76 8 76 26V82H44Z', P.yellow),
        line('M52 14V82M60 10V82M68 14V82M44 26H76M44 38H76M44 50H76M44 62H76M44 74H76', { stroke: P.gold, sw: 2 }),
        path('M44 26Q44 8 60 8Q76 8 76 26V82H44Z'),
        path('M60 112Q30 104 30 64Q38 78 52 84Q50 104 60 112ZM60 112Q90 104 90 64Q82 78 68 84Q70 104 60 112Z', P.leaf),
        line('M60 112V120', { stroke: P.forest, sw: 4 })),
    ],
  },
  {
    word: 'POTATO', meaning: 'a potato', alt: 'A lumpy brown potato with a few small dark eyes on its skin.',
    draw: () => [
      path('M20 54Q22 30 52 28Q78 24 98 38Q114 52 106 74Q98 96 66 96Q34 98 22 82Q16 70 20 54Z', P.wood),
      ...[[38, 48], [64, 42], [86, 58], [50, 74], [76, 80]].map(([x, y]) => line(`M${x - 3} ${y}q3 -3 6 0`, { stroke: P.brown, sw: 2.5 })),
      patch('M30 50Q34 38 46 36Q38 44 36 56Z', P.sand),
    ],
  },
  {
    word: 'TOMATO', meaning: 'a tomato', alt: 'A round shiny red tomato with a green star-shaped top.',
    draw: () => [
      path('M60 26Q100 24 106 62Q108 100 60 104Q12 100 14 62Q20 24 60 26Z', P.red), shine(28, 56, 1.1),
      poly(`${'60,40 66,30 80,28 70,22 74,12 60,20 46,12 50,22 40,28 54,30'}`, P.leaf, { sw: 2 }), line('M60 20V10', { stroke: P.forest, sw: 4 }),
    ],
  },
  {
    word: 'ONION', meaning: 'an onion', alt: 'A round golden-brown onion with a pointed top, lines down its skin and little roots.',
    draw: () => [
      line('M52 104l-4 10M60 104v10M68 104l4 10', { stroke: P.wood, sw: 2 }),
      path('M60 8Q64 30 84 40Q110 54 104 80Q96 106 60 106Q24 106 16 80Q10 54 36 40Q56 30 60 8Z', P.gold),
      line('M60 12Q44 40 42 70Q42 92 56 104M60 12Q76 40 78 70Q78 92 64 104M60 14V104', { stroke: P.wood, sw: 2 }),
      path('M60 8Q64 30 84 40Q110 54 104 80Q96 106 60 106Q24 106 16 80Q10 54 36 40Q56 30 60 8Z'),
    ],
  },
  {
    word: 'PEPPER', meaning: 'a bell pepper', otherMeaning: 'black pepper, the spice', alt: 'A boxy red bell pepper with four rounded lobes at the bottom and a thick green stem.',
    draw: () => [
      path('M60 26Q60 12 72 8', undefined, { stroke: P.ink, sw: 11 }), path('M60 26Q60 12 72 8', undefined, { stroke: P.forest, sw: 6 }),
      path('M30 30Q46 22 60 28Q74 22 90 30Q104 38 102 70Q100 98 92 106Q84 112 76 104Q68 112 60 104Q52 112 44 104Q36 112 28 106Q18 98 18 70Q16 38 30 30Z', P.red),
      line('M44 34Q38 70 44 104M76 34Q82 70 76 104M60 32V102', { stroke: P.coral, sw: 2.5 }),
      path('M46 30Q60 40 74 30Q66 22 60 26Q54 22 46 30Z', P.leaf, { sw: 2 }), patch('M26 46Q28 38 34 36Q30 46 30 58Z', P.paper),
    ],
  },
  {
    word: 'CHILI', meaning: 'a red chili pepper', alt: 'A long thin red chili pepper curving to a point, with a green stem.',
    draw: () => [
      path('M86 22Q84 12 92 6', undefined, { stroke: P.forest, sw: 6 }),
      path('M74 24Q90 16 98 30Q100 44 86 54Q60 74 44 94Q30 110 16 110Q30 98 40 82Q56 52 70 32Z', P.red),
      path('M74 24Q86 20 96 30L90 34Q82 26 72 30Z', P.leaf, { sw: 2 }), patch('M74 36Q82 34 84 40Q66 58 54 76Q62 54 74 36Z', P.coral),
    ],
  },
  {
    word: 'PEA', meaning: 'peas in a pod', alt: 'An open green pea pod with a row of round peas inside.',
    draw: () => [
      group({ t: 'rotate(-25 60 60)' },
        path('M8 60Q20 30 60 30Q100 30 112 56Q100 82 60 84Q20 84 8 60Z', P.leaf),
        path('M18 58Q30 44 60 44Q90 44 104 56Q90 72 60 72Q30 72 18 58Z', P.mint, { sw: 2 }),
        ...[30, 46, 62, 78, 94].map(x => circle(x, 58, 8, P.leaf)),
        line('M112 56Q118 46 116 36', { stroke: P.forest, sw: 4 })),
    ],
  },
  {
    word: 'RADISH', meaning: 'a radish', alt: 'A round pinkish-red radish with a white tip, a long thin root tail and small green leaves on top.',
    draw: () => [
      path('M56 40Q42 30 40 14Q52 16 58 34ZM64 40Q70 22 82 16Q84 32 68 40Z', P.leaf),
      path('M60 38Q92 38 92 66Q90 86 70 90L60 98L50 90Q30 86 28 66Q28 38 60 38Z', P.pink), patch('M60 38Q90 40 90 64Q88 80 76 86Q84 70 78 56Q70 42 60 38Z', P.red),
      path('M60 38Q92 38 92 66Q90 86 70 90L60 98L50 90Q30 86 28 66Q28 38 60 38Z'),
      path('M50 90Q60 96 70 90L60 100Z', P.paper, { sw: 2 }), path('M60 100Q58 110 64 118', undefined, { sw: 2 }),
    ],
  },
  {
    word: 'GARLIC', meaning: 'garlic', alt: 'A white garlic bulb with clove lines and a pointed tip, with one loose clove beside it.',
    draw: () => [
      line('M38 104l-4 8M48 106v8M58 104l4 8', { stroke: P.wood, sw: 2 }),
      path('M48 14Q50 32 60 40Q86 52 84 76Q80 104 48 104Q16 104 12 76Q10 52 36 40Q46 32 48 14Z', P.paper),
      line('M46 36Q30 56 34 102M50 36Q66 56 62 102M48 38V104M40 40Q18 62 24 96', { stroke: P.stone, sw: 2 }),
      path('M48 14Q50 32 60 40Q86 52 84 76Q80 104 48 104Q16 104 12 76Q10 52 36 40Q46 32 48 14Z'),
      path('M92 66Q110 72 110 92Q108 106 96 108Q86 108 86 96Q86 80 92 66Z', P.cream), line('M92 70Q94 90 96 106', { stroke: P.stone, sw: 2 }),
    ],
  },
  {
    word: 'OLIVE', meaning: 'olives', alt: 'Two shiny oval olives, one green and one black, with a small olive leaf.',
    draw: () => [
      path('M20 30Q40 6 70 14Q50 30 20 30Z', P.mint), line('M22 30Q46 22 68 16', { stroke: P.forest, sw: 2 }),
      ellipse(42, 70, 24, 32, P.leaf, { t: 'rotate(-20 42 70)' }), patch('M30 52Q34 42 42 40Q36 50 36 60Z', P.paper),
      ellipse(84, 76, 22, 30, P.charcoal, { t: 'rotate(15 84 76)' }), patch('M76 58Q80 50 88 48Q82 56 82 66Z', P.slate),
    ],
  },
  {
    word: 'EGG', meaning: 'an egg', alt: 'A whole white egg standing up, next to a cracked-open fried egg with a yellow yolk.',
    draw: () => [
      path('M38 8Q60 8 62 44Q62 70 38 70Q14 70 14 44Q16 8 38 8Z', P.paper), shine(22, 34, 1),
      path('M50 74Q46 58 64 56Q76 46 92 54Q112 56 110 76Q114 96 96 102Q80 112 64 104Q42 104 40 90Q36 80 50 74Z', P.paper),
      circle(76, 80, 14, P.yellow), patch('M70 74Q74 70 80 70Q74 74 74 80Z', P.paper),
    ],
  },
  {
    word: 'BREAD', meaning: 'a loaf of bread', alt: 'A brown loaf of bread with a slice cut off, showing the soft pale inside.',
    draw: () => [
      path('M30 104V58Q14 56 14 42Q16 24 46 24H90Q110 26 108 44Q106 56 96 58V104Z', P.wood),
      line('M50 30Q46 38 52 44M70 30Q66 38 72 44M88 30Q84 38 90 44', { stroke: P.brown, sw: 2.5 }),
      path('M8 104V68Q-2 64 2 52Q6 42 22 42H34Q48 44 44 58Q42 66 36 68V104Z', P.wood, { t: 'translate(8 6)' }),
      path('M14 108V74Q8 72 10 62Q12 54 24 54H34Q44 56 42 64Q40 70 36 72V108Z', P.cream, { sw: 2, t: 'translate(6 0)' }),
    ],
  },
  {
    word: 'TOAST', meaning: 'a slice of toast', alt: 'A square slice of golden toast with a brown crust and a pat of yellow butter melting on it.',
    draw: () => [
      path('M24 108V48Q8 44 10 28Q12 10 36 10H84Q108 10 110 28Q112 44 96 48V108Z', P.brown),
      path('M32 100V44Q18 40 20 30Q22 18 38 18H82Q98 18 100 30Q102 40 88 44V100Z', P.gold, { sw: 2 }),
      path('M44 56L68 50L78 70L52 78Z', P.yellow, { sw: 2 }), patch('M50 60l14-4 6 8-16 4Z', P.cream),
    ],
  },
  {
    word: 'CHEESE', meaning: 'a wedge of cheese', alt: 'A yellow wedge of cheese with round holes.',
    draw: () => [
      path('M10 56L96 20L110 56Z', P.gold), path('M10 56H110V98H10Z', P.yellow),
      circle(32, 74, 7, P.gold), circle(60, 84, 5, P.gold), circle(84, 70, 9, P.gold), circle(100, 90, 4, P.gold), circle(76, 40, 5, P.yellow), circle(54, 46, 3.5, P.yellow),
    ],
  },
  {
    word: 'MILK', meaning: 'a carton of milk', alt: 'A white and blue milk carton with a peaked top and a white milk drop on the front.',
    draw: () => [
      path('M32 40L44 10H76L88 40Z', P.sky), path('M44 10L56 40H32ZM76 10L88 40H64Z', P.blue, { sw: 2 }), rect(42, 4, 36, 7, 2, P.sky, { sw: 2 }),
      rect(32, 40, 56, 72, 4, P.paper), rect(32, 86, 56, 26, 0, P.blue, { sw: 2 }),
      path('M60 50Q72 66 70 72Q68 80 60 80Q52 80 50 72Q48 66 60 50Z', P.sky, { sw: 2 }), rect(32, 40, 56, 72, 4),
    ],
  },
  {
    word: 'CAKE', meaning: 'a birthday cake', alt: 'A round layered birthday cake with pink icing dripping down and three lit candles.',
    draw: () => [
      ...[42, 60, 78].map(x => [rect(x - 3, 20, 6, 18, 2, x === 60 ? P.sky : P.yellow), path(`M${x} 8Q${x + 6} 14 ${x} 18Q${x - 6} 14 ${x} 8Z`, P.orange, { sw: 2 })]).flat(),
      path('M14 52Q14 38 60 38Q106 38 106 52V100Q106 110 60 110Q14 110 14 100Z', P.wood),
      path('M14 52Q14 38 60 38Q106 38 106 52V62Q100 70 94 62Q88 74 80 64Q72 74 66 64Q58 74 50 64Q44 72 36 64Q28 72 22 62Q16 68 14 62Z', P.pink),
      line('M14 84Q60 94 106 84', { stroke: P.cream, sw: 4 }), ellipse(60, 52, 46, 12),
    ],
  },
  {
    word: 'COOKIE', meaning: 'a chocolate chip cookie', alt: 'A round golden cookie dotted with dark chocolate chips.',
    draw: () => [
      path('M60 12Q88 12 102 32Q112 52 106 72Q98 98 70 106Q40 112 22 90Q8 70 14 48Q22 18 60 12Z', P.gold),
      ...[[40, 36], [64, 30], [84, 46], [44, 60], [70, 58], [90, 74], [54, 82], [32, 80], [74, 92]].map(([x, y]) => path(`M${x - 5} ${y}Q${x - 4} ${y - 6} ${x} ${y - 5}Q${x + 6} ${y - 3} ${x + 4} ${y + 3}Q${x} ${y + 6} ${x - 5} ${y}Z`, P.brown, { ns: true })),
    ],
  },
  {
    word: 'PIE', meaning: 'a fruit pie', alt: 'A round golden fruit pie in a dish, with a criss-cross lattice crust and red filling.',
    draw: () => [
      path('M8 62L18 92Q60 104 102 92L112 62Z', P.stone), ellipse(60, 60, 52, 22, P.wood), ellipse(60, 60, 44, 16, P.red, { sw: 2 }),
      line('M32 48L42 74M52 44L62 76M72 44L80 74M90 48L96 68M24 62H96M30 52H90M30 70H90', { stroke: P.gold, sw: 5 }),
      ellipse(60, 60, 44, 16, undefined, { sw: 2 }), ellipse(60, 60, 52, 22),
    ],
  },
  {
    word: 'PIZZA', meaning: 'a slice of pizza', alt: 'A triangle slice of pizza with a crust, melted cheese and round red pepperoni.',
    draw: () => [
      path('M14 26Q60 6 106 26L64 110Q60 116 56 110Z', P.yellow),
      path('M14 26Q60 6 106 26L100 38Q60 20 20 38Z', P.wood),
      circle(48, 50, 9, P.red), circle(74, 52, 8, P.red), circle(60, 76, 8, P.red), circle(60, 98, 5, P.red),
      path('M34 54Q34 66 30 70M88 46Q88 60 84 64', undefined, { stroke: P.gold, sw: 3 }),
    ],
  },
  {
    word: 'SANDWICH', meaning: 'a sandwich', alt: 'A triangle sandwich seen from the side: two slices of bread with lettuce, tomato and cheese between them.',
    draw: () => {
      // The long cut side faces you; each layer is a band between two slanted lines.
      const band = (t, b, fill, o) => poly(`8,${48 + t} 112,${70 + t} 112,${70 + b} 8,${48 + b}`, fill, o);
      return [group({ t: 'translate(6 -4) scale(0.9)' },
        band(0, 56, P.wood), band(4, 14, P.cream, { ns: true }), band(42, 52, P.cream, { ns: true }),
        band(16, 24, P.leaf, { sw: 2 }), band(24, 31, P.red, { sw: 2 }), band(31, 38, P.yellow, { sw: 2 }),
        path('M8 48L70 16Q78 14 84 20L112 70Z', P.wood), path('M18 47L70 22Q76 20 80 25L102 64Z', P.cream, { ns: true }),
        band(0, 56), path('M8 48L70 16Q78 14 84 20L112 70'))];
    },
  },
  {
    word: 'BURGER', meaning: 'a hamburger', alt: 'A hamburger: a round sesame bun with a brown patty, cheese, tomato and lettuce.',
    draw: () => [
      path('M12 52Q12 14 60 14Q108 14 108 52Z', P.gold),
      ...[[40, 28], [60, 24], [80, 30], [50, 40], [72, 40], [30, 42], [90, 44]].map(([x, y]) => ellipse(x, y, 3, 1.8, P.cream, { ns: true })),
      path('M8 60Q20 50 32 60Q46 50 60 60Q74 50 88 60Q100 50 112 60V64H8Z', P.leaf),
      rect(10, 62, 100, 7, 3, P.red, { sw: 2 }), path('M10 70H110L96 82L84 72H10Z', P.yellow, { sw: 2 }),
      rect(10, 70, 100, 14, 7, P.brown), path('M12 86H108Q108 106 60 106Q12 106 12 86Z', P.gold),
    ],
  },
  {
    word: 'FRIES', meaning: 'french fries', alt: 'A red carton full of long yellow french fries.',
    draw: () => [
      ...[[30, 20, -10], [42, 10, -4], [54, 16, 0], [66, 8, 4], [78, 18, 8], [88, 26, 12]].map(([x, y, r]) => rect(x, y, 10, 60, 2, P.yellow, { t: `rotate(${r} ${x + 5} ${y + 60})` })),
      path('M22 50Q60 62 98 50L88 110H32Z', P.red), path('M22 50Q60 62 98 50L96 60Q60 72 24 60Z', P.coral, { sw: 2 }),
    ],
  },
  {
    word: 'TACO', meaning: 'a taco', alt: 'A folded yellow taco shell filled with brown meat, green lettuce, red tomato and cheese.',
    draw: () => [
      path('M14 92Q14 34 60 34Q106 34 106 92Z', P.gold),
      path('M18 58Q30 40 46 50Q58 34 72 48Q88 38 100 56L98 66H20Z', P.leaf),
      ...[[34, 54], [60, 48], [82, 56]].map(([x, y]) => rect(x, y, 10, 8, 2, P.red, { sw: 2 })),
      path('M24 66H96', undefined, { stroke: P.brown, sw: 7 }),
      path('M14 92Q14 50 60 50Q106 50 106 92Z', P.gold), line('M30 70l4 8M50 62l2 8M74 64l-2 8M88 72l-4 8', { stroke: P.yellow, sw: 3 }),
    ],
  },
  {
    word: 'NOODLE', meaning: 'noodles', alt: 'A blue bowl of wavy noodles with chopsticks lifting some up.',
    draw: () => [
      line('M70 8L50 64M90 10L62 64', { stroke: P.ink, sw: 7 }), line('M70 8L50 64M90 10L62 64', { stroke: P.wood, sw: 3 }),
      path('M14 62Q20 50 30 60Q40 48 50 60Q60 48 70 60Q80 48 90 60Q100 50 106 62', undefined, { stroke: P.gold, sw: 6 }),
      line('M52 60Q46 48 54 40Q60 32 56 24M58 60Q64 48 58 40Q54 32 62 24', { stroke: P.gold, sw: 4 }),
      ...bowl(P.blue), line('M24 80Q60 90 96 80', { stroke: P.paper, sw: 3 }),
    ],
  },
  {
    word: 'RICE', meaning: 'a bowl of rice', alt: 'A bowl heaped with white rice grains.',
    draw: () => [
      path('M14 64Q14 22 60 22Q106 22 106 64Z', P.paper),
      ...[[36, 40], [50, 32], [66, 30], [80, 38], [44, 52], [60, 46], [76, 52], [92, 54], [28, 56], [62, 58]].map(([x, y], i) => ellipse(x, y, 4, 2, P.cream, { sw: 1.5, t: `rotate(${(i * 37) % 180} ${x} ${y})` })),
      ...bowl(P.coral), line('M24 80Q60 90 96 80', { stroke: P.paper, sw: 3 }),
    ],
  },
  {
    word: 'SOUP', meaning: 'a bowl of soup', alt: 'A bowl of hot orange soup with a spoon in it and steam rising.',
    draw: () => [
      line('M42 40q-6-8 0-16q6-8 0-16M60 36q-6-8 0-16q6-8 0-16M78 40q-6-8 0-16q6-8 0-16', { stroke: P.stone, sw: 3 }),
      line('M84 70L104 36', { stroke: P.ink, sw: 7 }), line('M84 70L104 36', { stroke: P.stone, sw: 3 }),
      ...bowl(P.sky), ellipse(60, 62, 50, 9, P.orange), ellipse(78, 62, 9, 4, P.stone, { sw: 2 }),
      circle(42, 62, 2.5, P.leaf, { ns: true }), circle(56, 64, 2.5, P.leaf, { ns: true }),
    ],
  },
  {
    word: 'HONEY', meaning: 'a pot of honey', alt: 'A round honey pot with golden honey dripping down its side and a wooden dipper.',
    draw: () => [
      line('M78 34L100 6', { stroke: P.ink, sw: 7 }), line('M78 34L100 6', { stroke: P.wood, sw: 3 }),
      path('M30 36Q14 44 14 72Q16 108 60 108Q104 108 106 72Q106 44 90 36Z', P.wood),
      path('M26 40H94Q96 52 92 54Q88 66 84 54Q78 50 76 62Q74 76 70 62Q66 50 60 54Q54 58 52 54Q48 50 44 56Q40 66 36 56Q30 52 26 52Z', P.yellow),
      rect(24, 30, 72, 12, 6, P.brown), line('M30 80Q60 90 90 80', { stroke: P.brown, sw: 2 }),
    ],
  },
  {
    word: 'CANDY', meaning: 'a wrapped candy', alt: 'A round wrapped candy with pink and white stripes and twisted wrapper ends.',
    draw: () => [
      path('M34 60L8 40Q4 60 8 80Z', P.pink), path('M86 60L112 40Q116 60 112 80Z', P.pink),
      line('M10 48L30 58M10 72L30 62M110 48L90 58M110 72L90 62', { sw: 2 }),
      circle(60, 60, 28, P.paper),
      path('M40 40Q54 52 48 82M58 32Q72 50 64 88M76 36Q88 52 82 82', undefined, { stroke: P.red, sw: 6 }), circle(60, 60, 28),
    ],
  },
  {
    word: 'CHOCOLATE', fit: [0.869, 62.5, 61.0], meaning: 'a chocolate bar', alt: 'A dark brown chocolate bar marked into squares, partly unwrapped from a red wrapper.',
    draw: () => [
      group({ t: 'rotate(-20 60 60)' },
        rect(30, 8, 60, 70, 4, P.brown), line('M50 8V78M70 8V78M30 31H90M30 54H90', { stroke: P.charcoal, sw: 2.5 }),
        patch('M34 12h12v4h-12ZM54 12h12v4h-12ZM74 12h12v4h-12Z', P.wood),
        path('M26 64H94V112H26Z', P.red), path('M26 64L36 58L46 66L56 58L66 66L76 58L86 66L94 60V70H26Z', P.paper, { sw: 2 }),
        rect(40, 82, 40, 16, 4, P.gold, { sw: 2 })),
    ],
  },
  {
    word: 'SUNDAE', meaning: 'an ice cream sundae', alt: 'An ice cream sundae in a tall glass: scoops of pink and white ice cream, chocolate sauce and a cherry on top.',
    draw: () => [
      line('M68 18Q72 8 80 6', { stroke: P.brown, sw: 2.5 }), circle(66, 22, 7, P.red),
      circle(46, 42, 17, P.pink), circle(74, 42, 17, P.paper), circle(60, 30, 14, P.cream),
      path('M46 28Q60 20 72 30Q74 40 66 38Q62 46 58 36Q52 42 48 34Z', P.brown, { sw: 2 }),
      path('M24 54H96L80 86H40Z', P.sky), rect(24, 52, 72, 8, 4, P.sky),
      rect(54, 86, 12, 16, 2, P.sky), path('M36 104Q60 98 84 104V110H36Z', P.sky),
    ],
  },
  {
    word: 'PEANUT', meaning: 'a peanut in its shell', alt: 'A beige peanut shell pinched in the middle, with a criss-cross texture.',
    draw: () => [
      group({ t: 'rotate(-35 60 60)' },
        path('M60 12Q86 12 86 36Q86 48 80 56Q76 60 80 66Q88 76 86 90Q84 110 60 110Q36 110 34 90Q32 76 40 66Q44 60 40 56Q34 48 34 36Q34 12 60 12Z', P.sand),
        line('M44 28L76 44M44 44L76 28M44 80L76 96M44 96L76 80M60 16V54M60 66V106', { stroke: P.wood, sw: 2 }),
        path('M60 12Q86 12 86 36Q86 48 80 56Q76 60 80 66Q88 76 86 90Q84 110 60 110Q36 110 34 90Q32 76 40 66Q44 60 40 56Q34 48 34 36Q34 12 60 12Z')),
    ],
  },
  {
    word: 'SALAD', meaning: 'a bowl of salad', alt: 'A bowl of green salad leaves with red tomato and orange carrot pieces.',
    draw: () => [
      path('M14 62Q10 44 26 42Q28 26 44 32Q52 18 66 28Q80 18 88 34Q106 32 104 50Q112 56 106 62Z', P.leaf),
      path('M30 50Q40 40 52 50M62 40Q72 30 82 42', undefined, { stroke: P.forest, sw: 2.5 }),
      circle(40, 56, 7, P.red), circle(74, 54, 7, P.red), rect(54, 48, 12, 6, 2, P.orange, { sw: 2, t: 'rotate(-20 60 51)' }), rect(86, 50, 12, 6, 2, P.orange, { sw: 2 }),
      ...bowl(P.paper), line('M24 80Q60 90 96 80', { stroke: P.sky, sw: 3 }),
    ],
  },
  {
    word: 'MUFFIN', meaning: 'a muffin', alt: 'A muffin with a round golden domed top dotted with blueberries, in a pleated paper cup.',
    draw: () => [
      path('M26 64H94L86 110H34Z', P.sky), line('M38 64l4 46M50 64l2 46M62 64v46M74 64l-2 46M86 64l-4 46', { sw: 2 }),
      path('M18 64Q12 52 22 44Q24 20 60 16Q96 20 98 44Q108 52 102 64Z', P.gold),
      ...[[40, 36], [60, 28], [80, 38], [50, 50], [72, 52], [30, 54], [90, 54]].map(([x, y]) => circle(x, y, 4, P.navy, { sw: 1.5 })),
    ],
  },
  {
    word: 'JUICE', meaning: 'a glass of orange juice', alt: 'A tall glass of orange juice with a striped straw and an orange slice on the rim.',
    draw: () => [
      line('M62 50L82 6', { stroke: P.ink, sw: 7 }), line('M62 50L82 6', { stroke: P.red, sw: 3 }),
      path('M30 28H90L82 108Q80 112 76 112H44Q40 112 38 108Z', P.paper), path('M33 44H87L82 108Q80 112 76 112H44Q40 112 38 108Z', P.orange, { sw: 2 }),
      path('M30 28H90L82 108Q80 112 76 112H44Q40 112 38 108Z'),
      path('M80 30A16 16 0 0 1 104 14Z', P.orange, { sw: 2 }), path('M84 26A10 10 0 0 1 98 18Z', P.yellow, { ns: true }),
    ],
  },
  {
    word: 'WATER', meaning: 'a glass of water', alt: 'A clear glass of water, with a big water drop beside it.',
    draw: () => [
      path('M16 24H76L68 108Q66 112 62 112H30Q26 112 24 108Z', P.paper), path('M19 46H73L68 108Q66 112 62 112H30Q26 112 24 108Z', P.sky, { sw: 2 }),
      path('M16 24H76L68 108Q66 112 62 112H30Q26 112 24 108Z'), patch('M28 52h6l-3 44h-6Z', P.paper),
      path('M96 30Q112 52 112 62Q112 76 96 76Q80 76 80 62Q80 52 96 30Z', P.blue), patch('M88 60Q88 54 92 50Q92 58 90 64Z', P.paper),
    ],
  },
  {
    word: 'CABBAGE', meaning: 'a cabbage', alt: 'A round green cabbage seen from the side, with big curling outer leaves and pale veins.',
    draw: () => [
      path('M12 70Q8 40 30 36Q50 30 60 44Q72 30 92 36Q114 42 108 72Q104 104 60 106Q16 104 12 70Z', P.leaf),
      path('M30 40Q50 22 60 30Q72 20 90 40Q76 34 66 46Q60 38 52 46Q42 36 30 40Z', P.mint),
      path('M36 52Q46 36 60 40Q74 36 84 52Q90 78 60 82Q30 78 36 52Z', P.mint),
      line('M60 104V82M60 92L40 80M60 96L82 82M20 76Q32 84 38 98M100 76Q88 84 82 98M60 60V80M60 66L50 56M60 66L70 56', { stroke: P.paper, sw: 2.5 }),
    ],
  },
  {
    word: 'AVOCADO', meaning: 'an avocado', alt: 'An avocado cut in half, with dark green skin, pale green flesh and a round brown pit.',
    draw: () => [
      path('M60 8Q78 8 84 34Q88 50 98 64Q110 84 98 102Q86 116 60 116Q34 116 22 102Q10 84 22 64Q32 50 36 34Q42 8 60 8Z', P.forest),
      path('M60 16Q74 16 78 38Q82 54 90 66Q100 84 90 98Q80 108 60 108Q40 108 30 98Q20 84 30 66Q38 54 42 38Q46 16 60 16Z', P.mint, { sw: 2 }),
      circle(60, 78, 18, P.brown), patch('M52 70Q56 64 62 64Q56 70 56 76Z', P.wood),
    ],
  },
  {
    word: 'WAFFLE', meaning: 'a waffle', alt: 'A square golden waffle with a neat grid of deep square pockets, a pat of butter and a drip of syrup.',
    draw: () => [
      rect(10, 10, 100, 100, 14, P.gold),
      ...[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => rect(20 + c * 21, 20 + r * 21, 16, 16, 3, P.wood, { sw: 2 }))),
      rect(46, 46, 28, 22, 4, P.yellow), patch('M50 50h16v4h-16Z', P.cream),
      path('M74 60Q86 60 88 72Q90 90 84 100Q80 104 78 96Q78 80 70 70Z', P.brown, { sw: 2 }),
    ],
  },
];
