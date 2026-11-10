import { P, circle, ellipse, rect, path, line, poly, patch, dot, eyes, group, ring } from '../style.mjs';

const rod = (d, fill, w = 7) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: fill, sw: w - 4.5 })];

export default [
  {
    word: 'BALL', meaning: 'a play ball', alt: 'A bouncy beach ball with red, yellow and blue panels.',
    draw: () => [
      circle(60, 60, 48, P.paper),
      path('M60 12Q36 40 38 104Q24 98 16 80Q14 40 60 12Z', P.red, { sw: 2 }), path('M60 12Q84 40 82 104Q96 98 104 80Q106 40 60 12Z', P.blue, { sw: 2 }),
      path('M60 12Q52 50 60 108Q68 50 60 12Z', P.yellow, { sw: 2 }), circle(60, 60, 48), circle(60, 18, 5, P.paper, { sw: 2 }),
    ],
  },
  {
    word: 'KITE', meaning: 'a kite', alt: 'A diamond-shaped kite in red and yellow, with a cross frame and a tail of bows on a string.',
    draw: () => [
      path('M60 82Q50 96 62 104Q72 112 64 118', undefined, { sw: 2 }),
      ...[[54, 94], [66, 108]].map(([x, y]) => path(`M${x} ${y}l-8 -5v10Zm0 0l8 -5v10Z`, P.blue, { sw: 2 })),
      poly('60,6 98,42 60,82 22,42', P.red), poly('60,6 98,42 60,42', P.yellow, { sw: 2 }), poly('60,42 22,42 60,82', P.yellow, { sw: 2 }),
      line('M60 6V82M22 42H98', { stroke: P.brown, sw: 2.5 }), poly('60,6 98,42 60,82 22,42'),
    ],
  },
  {
    word: 'DOLL', meaning: 'a toy doll', alt: 'A toy doll in a pink dress, with yellow pigtails, a round face and button eyes.',
    draw: () => [
      path('M30 30Q14 30 16 50Q20 58 28 50ZM90 30Q106 30 104 50Q100 58 92 50Z', P.yellow),
      path('M60 56L28 104H92Z', P.pink), ...rod('M40 104v8M80 104v8', P.skin, 7), ...rod('M44 70L28 84M76 70L92 84', P.skin, 7),
      circle(60, 36, 22, P.skin), path('M38 34Q38 12 60 12Q82 12 82 34Q72 22 60 24Q48 22 38 34Z', P.yellow),
      eyes(52, 38, 68, 38, 3), path('M54 46Q60 52 66 46', undefined, { sw: 2 }), circle(46, 44, 3, P.pink, { ns: true }), circle(74, 44, 3, P.pink, { ns: true }),
      path('M60 56l-6 8h12Z', P.paper, { sw: 2 }),
    ],
  },
  {
    word: 'ROBOT', meaning: 'a toy robot', alt: 'A friendly grey toy robot with a square head, round eyes, an antenna and arms out.',
    draw: () => [
      line('M60 18V8', { sw: 3 }), circle(60, 7, 4, P.red),
      rect(36, 18, 48, 34, 8, P.stone), circle(50, 34, 6, P.sky, { sw: 2 }), circle(70, 34, 6, P.sky, { sw: 2 }), rect(50, 44, 20, 4, 2, P.charcoal, { ns: true }),
      ...rod('M34 64L14 76M86 64L106 76', P.stone, 9), circle(12, 78, 5, P.slate), circle(108, 78, 5, P.slate),
      rect(32, 54, 56, 40, 6, P.sky), rect(44, 62, 32, 14, 3, P.paper, { sw: 2 }), circle(52, 69, 3, P.red, { ns: true }), circle(60, 69, 3, P.yellow, { ns: true }), circle(68, 69, 3, P.leaf, { ns: true }),
      rect(38, 94, 14, 16, 3, P.slate), rect(68, 94, 14, 16, 3, P.slate),
    ],
  },
  {
    word: 'PUZZLE', meaning: 'a jigsaw puzzle', alt: 'Two jigsaw puzzle pieces, one blue and one yellow, with knobs that fit together.',
    draw: () => [
      path('M12 22H40Q36 10 48 10Q60 10 56 22H84V48Q96 44 96 56Q96 68 84 64V90H56Q60 78 48 78Q36 78 40 90H12V64Q24 68 24 56Q24 44 12 48Z', P.blue),
      path('M44 62H70Q66 50 78 50Q90 50 86 62H112V110H84Q88 98 76 98Q64 98 68 110H44V88Q56 92 56 80Q56 68 44 72Z', P.yellow),
    ],
  },
  {
    word: 'BALLOON', meaning: 'a balloon', alt: 'A shiny red balloon on a curly string.',
    draw: () => [
      path('M60 82Q52 94 62 102Q70 110 60 118', undefined, { sw: 2 }),
      path('M60 6Q96 6 96 44Q94 72 64 82Q60 86 56 82Q26 72 24 44Q24 6 60 6Z', P.red), poly('60,82 54,90 66,90', P.red, { sw: 2 }),
      patch('M38 30Q44 18 56 16Q46 26 44 40Z', P.paper),
    ],
  },
  {
    word: 'DRUM', meaning: 'a drum', alt: 'A red drum with a white top, zigzag cords around its side and two drumsticks.',
    draw: () => [
      ...rod('M30 30L10 6M90 30L110 6', P.wood, 7), circle(10, 6, 4, P.wood), circle(110, 6, 4, P.wood),
      path('M14 44V94Q14 110 60 110Q106 110 106 94V44Z', P.red),
      path('M14 50L32 98L48 54L64 102L80 54L96 98L106 52', undefined, { stroke: P.gold, sw: 3 }),
      ellipse(60, 44, 46, 14, P.paper), path('M14 94Q14 110 60 110Q106 110 106 94', undefined, { stroke: P.gold, sw: 4 }),
    ],
  },
  {
    word: 'GUITAR', meaning: 'a guitar', alt: 'A wooden guitar lying on a slant, with a round body, a sound hole, a long neck and strings.',
    draw: () => [
      group({ t: 'rotate(35 60 60)' },
        rect(53, 4, 14, 52, 3, P.brown), rect(50, 0, 20, 12, 4, P.charcoal),
        path('M60 50Q80 46 82 64Q82 74 76 78Q90 86 88 102Q84 120 60 120Q36 120 32 102Q30 86 44 78Q38 74 38 64Q40 46 60 50Z', P.wood),
        circle(60, 84, 9, P.charcoal), rect(48, 102, 24, 5, 2, P.brown), line('M57 8V104M63 8V104', { stroke: P.paper, sw: 1.5 })),
    ],
  },
  {
    word: 'PIANO', meaning: 'a piano', alt: 'An upright piano with a row of white and black keys and a music stand.',
    draw: () => [
      rect(10, 12, 100, 54, 6, P.brown), rect(30, 22, 60, 22, 3, P.wood, { sw: 2 }),
      rect(6, 64, 108, 30, 3, P.paper), ...Array.from({ length: 13 }, (_, i) => line(`M${14 + i * 8} 64V94`, { sw: 1.5 })),
      ...[0, 1, 3, 4, 5, 7, 8, 10, 11].map(i => rect(16 + i * 8, 64, 5, 17, 1, P.charcoal, { ns: true })),
      rect(6, 64, 108, 30, 3), rect(14, 94, 10, 16, 2, P.brown), rect(96, 94, 10, 16, 2, P.brown),
    ],
  },
  {
    word: 'TRUMPET', meaning: 'a trumpet', alt: 'A shiny gold trumpet side on, with a wide bell at one end and three valves on top.',
    draw: () => [
      path('M8 58H72V74H8Z', P.gold), path('M72 58Q98 52 112 34V98Q98 80 72 74Z', P.gold),
      path('M30 74Q30 92 50 92H64Q76 92 76 80', undefined, { stroke: P.ink, sw: 9 }), path('M30 74Q30 92 50 92H64Q76 92 76 80', undefined, { stroke: P.gold, sw: 4 }),
      ...[36, 48, 60].map(x => [rect(x - 3, 40, 6, 18, 2, P.gold, { sw: 2 }), rect(x - 5, 34, 10, 6, 3, P.cream, { sw: 2 })]).flat(),
      rect(4, 60, 8, 12, 2, P.slate, { sw: 2 }), ellipse(112, 66, 4, 32, P.yellow),
    ],
  },
  {
    word: 'FLUTE', meaning: 'a flute', alt: 'A long silver flute lying on a slant, with a row of round finger keys.',
    draw: () => [
      group({ t: 'rotate(-30 60 60)' },
        rect(4, 52, 112, 16, 8, P.stone), ...[30, 46, 62, 74, 86, 98].map(x => circle(x, 60, 4, P.slate, { sw: 2 })), ellipse(16, 60, 5, 3, P.charcoal, { ns: true }),
        line('M38 54V66M70 54V66', { stroke: P.slate, sw: 2 })),
    ],
  },
  {
    word: 'VIOLIN', meaning: 'a violin', alt: 'A brown violin standing upright with a curled scroll on top, f-shaped holes and a bow beside it.',
    draw: () => [
      ...rod('M98 14L76 110', P.stone, 6),
      path('M50 34Q34 34 34 50Q34 60 42 64Q32 70 32 84Q32 108 54 110Q60 110 66 110Q88 108 88 84Q88 70 78 64Q86 60 86 50Q86 34 70 34Z', P.wood, { t: 'translate(-8 0)' }),
      rect(48, 6, 8, 34, 2, P.charcoal), circle(52, 8, 6, P.brown),
      path('M42 62q-4 6 0 12q4 6 0 12M62 62q-4 6 0 12q4 6 0 12', undefined, { sw: 2 }),
      rect(40, 94, 24, 6, 2, P.charcoal), line('M50 14V94M54 14V94', { stroke: P.paper, sw: 1.2 }),
    ],
  },
  {
    word: 'WHISTLE', meaning: 'a whistle', alt: 'A silver sports whistle with a round chamber, a mouthpiece and a red cord.',
    draw: () => [
      path('M88 52Q110 30 104 8', undefined, { stroke: P.red, sw: 4 }),
      path('M8 44H70A30 30 0 1 1 40 74V62H8Z', P.stone), rect(58, 38, 18, 10, 3, P.charcoal),
      circle(70, 76, 9, P.slate), patch('M48 70Q52 58 62 54Q54 64 54 74Z', P.paper), line('M14 53H34', { stroke: P.slate, sw: 2 }),
    ],
  },
  {
    word: 'SWING', meaning: 'a playground swing', alt: 'A playground swing: a wooden seat hanging on two ropes from a frame.',
    draw: () => [
      ...rod('M8 108L28 10H92L112 108', P.red, 9),
      line('M44 12V76M76 12V76', { stroke: P.brown, sw: 3 }),
      rect(36, 76, 48, 10, 4, P.wood),
    ],
  },
  {
    word: 'SLIDE', meaning: 'a playground slide', otherMeaning: 'a slide in a slideshow', alt: 'A playground slide: a ladder up one side and a long yellow chute sloping down.',
    draw: () => [
      ...rod('M16 110L28 22M36 110L46 22', P.blue, 8), ...[44, 64, 84].map(y => line(`M${16 + (110 - y) * 0.14} ${y}H${36 + (110 - y) * 0.12}`, { stroke: P.blue, sw: 4 })),
      path('M26 20H48L108 96Q114 104 108 110H96L40 32H26Z', P.yellow), path('M48 20L108 96', undefined, { stroke: P.gold, sw: 4 }), path('M26 20H48L108 96Q114 104 108 110H96L40 32H26Z'),
      ...rod('M96 110V100', P.blue, 7),
    ],
  },
  {
    word: 'SEESAW', meaning: 'a seesaw', alt: 'A playground seesaw: a long board tipped on a middle stand, with a handle and seat at each end.',
    draw: () => [
      path('M44 104L60 66L76 104Z', P.red),
      group({ t: 'rotate(-18 60 64)' }, rect(6, 58, 108, 10, 4, P.wood), ...rod('M18 58V42M102 58V42M12 42H24M96 42H108', P.stone, 7)),
      circle(60, 66, 5, P.charcoal), line('M30 108H90', { stroke: P.leaf, sw: 5 }),
    ],
  },
  {
    word: 'BIKE', meaning: 'a bicycle', alt: 'A simple two-wheeled bicycle side on, with handlebars, a seat and a chain.', basedOn: 'content/library/art/bicycle.svg',
    draw: () => [
      group({ t: 'translate(-2 -4)' },
        circle(27, 84, 22, P.paper), circle(94, 84, 22, P.paper), circle(27, 84, 3, P.ink, { ns: true }), circle(94, 84, 3, P.ink, { ns: true }),
        line('m27 84 20-40 21 40H27l39-34 28 34-16-53H65m-29 13h22', { stroke: P.red, sw: 4 }), line('m27 84 20-40 21 40H27l39-34 28 34-16-53H65', { sw: 1.5 }),
        rect(34, 40, 20, 7, 3, P.charcoal), path('M66 80 94 82v5l-28 3Z', P.coral), circle(66, 85, 6, P.leaf)),
    ],
  },
  {
    word: 'WAGON', meaning: 'a toy wagon', alt: 'A red toy wagon with four black wheels and a long pull handle.',
    draw: () => [
      ...rod('M92 64L114 26', P.charcoal, 7), rect(106, 20, 12, 8, 3, P.charcoal),
      path('M8 46H98L92 80H14Z', P.red), line('M10 56H96', { stroke: P.coral, sw: 3 }),
      circle(28, 92, 14, P.charcoal), circle(80, 92, 14, P.charcoal), circle(28, 92, 5, P.stone), circle(80, 92, 5, P.stone),
    ],
  },
  {
    word: 'TOP', meaning: 'a spinning top', otherMeaning: 'the top of something', alt: 'A spinning top with red and yellow stripes, a handle on top and a point at the bottom.',
    draw: () => [
      ...rod('M60 6V30', P.brown, 9),
      path('M60 116L14 64Q14 30 60 30Q106 30 106 64Z', P.yellow),
      path('M60 116L14 64Q20 56 34 54Z', P.red, { sw: 2 }), path('M60 116L48 52Q60 50 72 52Z', P.red, { sw: 2 }), path('M60 116L86 54Q100 56 106 64Z', P.red, { sw: 2 }),
      ellipse(60, 44, 46, 14, P.blue), path('M60 116L14 64Q14 30 60 30Q106 30 106 64Z'),
      line('M4 100q8 4 16 0M100 100q8 4 16 0', { stroke: P.stone, sw: 3 }),
    ],
  },
  {
    word: 'DICE', meaning: 'dice', alt: 'Two white dice with black dots, one tilted behind the other.',
    draw: () => [
      group({ t: 'rotate(-15 76 40)' }, rect(54, 14, 46, 46, 9, P.paper), dot(66, 26, 4), dot(88, 48, 4), dot(77, 37, 4)),
      rect(14, 48, 56, 56, 10, P.paper), ...[[28, 62], [56, 62], [28, 90], [56, 90], [42, 76]].map(([x, y]) => dot(x, y, 5)),
    ],
  },
  {
    word: 'DOMINO', meaning: 'a domino tile', alt: 'A black domino tile standing up, split into two halves with white dots.',
    draw: () => [
      rect(30, 6, 60, 108, 10, P.charcoal), line('M38 60H82', { stroke: P.paper, sw: 3 }),
      ...[[44, 22], [76, 22], [60, 33], [44, 44], [76, 44], [44, 80], [76, 98], [60, 89]].map(([x, y]) => circle(x, y, 5, P.paper, { ns: true })),
    ],
  },
  {
    word: 'CARDS', meaning: 'playing cards', alt: 'A fan of three playing cards showing a red heart, a black club and a red diamond.',
    draw: () => [
      group({ t: 'rotate(-20 60 100)' }, rect(34, 14, 52, 74, 6, P.paper), path('M60 62Q42 48 48 40Q54 34 60 42Q66 34 72 40Q78 48 60 62Z', P.red, { sw: 2 })),
      group({ t: 'rotate(20 60 100)' }, rect(34, 14, 52, 74, 6, P.paper), path('M60 34L72 50L60 66L48 50Z', P.red, { sw: 2 })),
      rect(34, 20, 52, 74, 6, P.paper), circle(60, 46, 7, P.charcoal, { ns: true }), circle(52, 58, 7, P.charcoal, { ns: true }), circle(68, 58, 7, P.charcoal, { ns: true }), path('M58 58L54 74H66L62 58Z', P.charcoal, { ns: true }),
    ],
  },
  {
    word: 'TROPHY', meaning: 'a trophy cup', alt: 'A gold trophy cup with two handles, on a stand with a dark base.',
    draw: () => [
      path('M30 22Q8 22 10 40Q14 56 34 56', undefined, { stroke: P.ink, sw: 10 }), path('M30 22Q8 22 10 40Q14 56 34 56', undefined, { stroke: P.gold, sw: 5 }),
      path('M90 22Q112 22 110 40Q106 56 86 56', undefined, { stroke: P.ink, sw: 10 }), path('M90 22Q112 22 110 40Q106 56 86 56', undefined, { stroke: P.gold, sw: 5 }),
      path('M28 12H92V36Q92 70 60 72Q28 70 28 36Z', P.gold), patch('M38 20h8v24q0 12 6 18q-14-4-14-20Z', P.cream),
      rect(54, 70, 12, 16, 2, P.gold), rect(36, 86, 48, 8, 3, P.gold), rect(30, 94, 60, 16, 3, P.brown),
    ],
  },
  {
    word: 'MEDAL', meaning: 'a medal', alt: 'A round gold medal with a star on it, hanging from a red and blue ribbon.',
    draw: () => [
      path('M32 6H54L72 56H50Z', P.blue), path('M88 6H66L48 56H70Z', P.red),
      circle(60, 78, 30, P.gold), circle(60, 78, 22, P.yellow, { sw: 2 }), poly(ring(60, 79, 13, 5, -90, 5.5), P.gold, { sw: 2 }),
    ],
  },
  {
    word: 'BUBBLE', meaning: 'soap bubbles', alt: 'A big round soap bubble with a shine, and smaller bubbles around it.',
    draw: () => [
      circle(52, 58, 38, P.sky), path('M28 46Q32 30 46 26', undefined, { stroke: P.paper, sw: 5 }), circle(70, 76, 5, P.paper, { ns: true }),
      circle(98, 26, 13, P.sky), path('M90 22Q92 18 96 16', undefined, { stroke: P.paper, sw: 3 }), circle(100, 92, 9, P.sky), circle(18, 104, 6, P.sky),
    ],
  },
  {
    word: 'PUPPET', meaning: 'a hand puppet', alt: 'A green sock-style hand puppet with big eyes and a wide open red mouth.',
    draw: () => [
      path('M30 116V70Q30 22 64 22Q100 22 100 56V60H66V116Z', P.leaf),
      path('M100 60Q100 84 66 84V60Z', P.red), path('M66 60H100Q100 68 92 68H66Z', P.leaf, { sw: 2 }),
      circle(56, 36, 11, P.paper), circle(80, 34, 11, P.paper), eyes(58, 38, 82, 36, 4),
      line('M30 102H66', { stroke: P.forest, sw: 3 }),
    ],
  },
  {
    word: 'RACKET', meaning: 'a tennis racket', otherMeaning: 'a loud noise', alt: 'A tennis racket with an oval head of criss-cross strings and a handle, with a yellow ball.',
    draw: () => [
      group({ t: 'rotate(-35 54 60)' },
        rect(48, 70, 12, 46, 5, P.blue), ellipse(54, 38, 28, 34, P.paper, { stroke: P.ink, sw: 9 }), ellipse(54, 38, 28, 34, undefined, { stroke: P.red, sw: 4 }),
        line('M38 14V62M46 7V69M54 5V71M62 7V69M70 14V62M30 22H78M27 32H81M27 42H81M29 52H79M35 62H73', { stroke: P.stone, sw: 1.5 })),
      circle(98, 96, 12, P.yellow), path('M88 90Q98 96 98 108M100 84Q100 96 110 100', undefined, { stroke: P.paper, sw: 2 }),
    ],
  },
  {
    word: 'SKATE', meaning: 'a roller skate', otherMeaning: 'an ice skate', alt: 'A pink roller skate boot with laces and four wheels.',
    draw: () => [
      path('M22 12H56V54L96 62Q110 66 110 80V86H16V20Q16 12 22 12Z', P.pink),
      line('M56 30H66M56 40H70M56 50H74', { sw: 3 }), line('M24 22H50', { stroke: P.paper, sw: 4 }),
      rect(12, 84, 102, 8, 3, P.stone),
      ...[28, 50, 76, 98].map(x => circle(x, 100, 9, P.yellow)),
    ],
  },
  {
    word: 'CROWN', meaning: "a king's or queen's crown", alt: 'A gold crown with five points, each tipped with a ball, and red and blue jewels.',
    draw: () => [
      path('M12 90L8 34L34 60L60 22L86 60L112 34L108 90Z', P.gold),
      ...[[8, 32], [60, 20], [112, 32], [34, 58], [86, 58]].map(([x, y]) => circle(x, y, 5, P.yellow, { sw: 2 })),
      rect(12, 88, 96, 16, 4, P.gold), circle(36, 96, 5, P.red, { sw: 2 }), circle(60, 96, 5, P.blue, { sw: 2 }), circle(84, 96, 5, P.red, { sw: 2 }),
      circle(60, 64, 6, P.blue, { sw: 2 }),
    ],
  },
];
