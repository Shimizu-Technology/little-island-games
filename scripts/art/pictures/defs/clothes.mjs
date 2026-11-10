import { P, circle, ellipse, rect, path, line, patch, group } from '../style.mjs';


export default [
  {
    word: 'HAT', meaning: 'a sun hat', alt: 'A straw sun hat with a wide round brim and a red ribbon around the crown.',
    draw: () => [
      ellipse(60, 76, 54, 18, P.sand), path('M32 74Q30 36 60 34Q90 36 88 74Q60 84 32 74Z', P.sand),
      path('M31 62Q60 72 89 62L88 74Q60 84 32 74Z', P.red), path('M86 66L102 78L92 82Z', P.red, { sw: 2 }),
      line('M16 82Q60 96 104 82', { stroke: P.gold, sw: 2 }),
    ],
  },
  {
    word: 'CAP', meaning: 'a baseball cap', alt: 'A blue baseball cap side on, with a rounded top, a button and a long stiff peak.',
    draw: () => [
      path('M64 74Q96 70 116 84Q110 92 92 90Q76 88 64 84Z', P.navy),
      path('M10 80Q8 34 50 30Q86 30 92 76Q60 74 10 80Z', P.blue), line('M50 30Q46 54 50 76M28 40Q22 58 26 78', { stroke: P.navy, sw: 2 }),
      circle(50, 28, 4, P.navy), rect(10, 76, 80, 8, 3, P.navy, { sw: 2 }),
    ],
  },
  {
    word: 'SHIRT', meaning: 'a T-shirt', alt: 'A short-sleeved red T-shirt laid flat.',
    draw: () => [
      path('M42 12Q60 22 78 12L110 30L98 54L86 48V108H34V48L22 54L10 30Z', P.red),
      path('M42 12Q60 30 78 12', undefined, { stroke: P.ink, sw: 3 }), line('M34 48L28 38M86 48L92 38', { stroke: P.coral, sw: 3 }),
    ],
  },
  {
    word: 'DRESS', meaning: 'a dress', alt: 'A purple dress with short puffed sleeves, a waist sash and a wide flared skirt.',
    draw: () => [
      path('M44 10Q60 18 76 10L92 24L84 38L80 32V52L106 108H14L40 52V32L36 38L28 24Z', P.purple),
      path('M44 10Q60 24 76 10', undefined), rect(38, 48, 44, 8, 3, P.pink),
      line('M30 96Q36 102 42 96Q48 102 54 96Q60 102 66 96Q72 102 78 96Q84 102 90 96', { stroke: P.paper, sw: 2.5 }),
    ],
  },
  {
    word: 'SKIRT', meaning: 'a skirt', alt: 'A flared pink skirt with a waistband and pleats.',
    draw: () => [
      path('M38 28H82L112 100Q60 112 8 100Z', P.pink), rect(36, 18, 48, 12, 4, P.coral),
      line('M48 30L36 104M60 30V108M72 30L84 104M42 30L20 102M78 30L100 102', { stroke: P.coral, sw: 2 }),
    ],
  },
  {
    word: 'PANTS', meaning: 'long pants (trousers)', alt: 'A pair of long blue jeans with a waistband, belt loops and front pockets.',
    draw: () => [
      path('M28 8H92L102 112H68L60 46L52 112H18Z', P.navy), rect(28, 8, 64, 10, 2, P.blue, { sw: 2 }),
      line('M60 18V46M36 18Q40 30 30 34M84 18Q80 30 90 34', { stroke: P.sky, sw: 2 }), line('M20 102H50M70 102H100', { stroke: P.sky, sw: 2 }),
    ],
  },
  {
    word: 'SHORTS', meaning: 'shorts', alt: 'A pair of orange shorts with a drawstring waist.',
    draw: () => [
      path('M22 22H98L110 92H70L60 52L50 92H10Z', P.orange), rect(22, 16, 76, 12, 4, P.gold),
      path('M56 28Q50 40 44 40M64 28Q70 40 76 40', undefined, { sw: 2 }), line('M60 28V52', { stroke: P.brown, sw: 2 }),
    ],
  },
  {
    word: 'SOCK', meaning: 'a sock', alt: 'A single striped sock with a ribbed top, a heel and toe.',
    draw: () => [
      path('M40 8H78V64L90 74Q106 88 96 104Q84 116 68 104L38 82Q28 74 34 64L40 56Z', P.paper),
      rect(40, 8, 38, 14, 3, P.red), line('M48 10V20M56 10V20M64 10V20M72 10V20', { stroke: P.coral, sw: 2 }),
      rect(40, 30, 38, 8, 0, P.blue, { sw: 2 }), rect(40, 46, 38, 8, 0, P.blue, { sw: 2 }),
      path('M36 66Q26 76 38 82L48 90Q52 76 40 64Z', P.red, { sw: 2 }), path('M96 104Q84 116 68 104L76 92Q90 90 96 104Z', P.red, { sw: 2 }),
    ],
  },
  {
    word: 'SHOE', meaning: 'a sneaker (shoe)', alt: 'A blue and white sneaker side on, with laces and a thick white sole.',
    draw: () => [
      path('M8 86V52Q8 42 18 42Q30 44 40 34H54L62 52Q90 56 106 66Q114 72 112 86Z', P.blue),
      path('M40 34H54L62 52L52 58Q44 50 40 34Z', P.paper, { sw: 2 }), line('M44 42l10-2M48 50l10-2M52 58l10-2', { sw: 2.5 }),
      rect(6, 84, 108, 14, 6, P.paper), line('M12 91H108', { stroke: P.stone, sw: 2 }), patch('M14 50h12v20h-12Z', P.navy),
    ],
  },
  {
    word: 'BOOT', meaning: 'a rain boot', alt: 'A tall yellow rain boot with a dark sole.',
    draw: () => [
      path('M30 8H66V68Q96 70 104 84Q108 96 100 98H24Q22 60 30 8Z', P.yellow), rect(26, 8, 44, 12, 4, P.gold),
      rect(22, 96, 84, 12, 4, P.charcoal), line('M38 26V88', { stroke: P.paper, sw: 3 }),
    ],
  },
  {
    word: 'SANDAL', meaning: 'a sandal', alt: 'A brown sandal seen from above: a foot-shaped sole with crossing straps and a buckle.',
    draw: () => [
      group({ t: 'rotate(-20 60 60)' },
        path('M60 6Q82 6 84 34Q86 54 80 70Q78 92 76 104Q72 116 60 116Q48 116 44 104Q42 92 40 70Q34 54 36 34Q38 6 60 6Z', P.wood),
        path('M60 14Q76 14 78 34Q78 50 74 64Q72 92 70 102Q66 110 60 110Q54 110 50 102Q48 92 46 64Q42 50 42 34Q44 14 60 14Z', P.sand, { ns: true }),
        rect(34, 30, 52, 12, 5, P.brown), rect(36, 56, 48, 12, 5, P.brown), rect(36, 84, 48, 10, 5, P.brown), rect(74, 84, 10, 10, 2, P.gold, { sw: 2 })),
    ],
  },
  {
    word: 'COAT', meaning: 'a winter coat', alt: 'A long brown coat with a collar, long sleeves, a row of buttons and two pockets.',
    draw: () => [
      path('M40 8L60 20L80 8L102 20L112 92H96L92 50V112H28V50L24 92H8L18 20Z', P.wood),
      path('M40 8L60 20L52 40ZM80 8L60 20L68 40Z', P.brown), line('M60 20V112', undefined),
      ...[46, 62, 78, 94].map(y => circle(68, y, 3.5, P.charcoal, { sw: 1.5 })),
      rect(34, 78, 18, 14, 3, P.brown, { sw: 2 }), rect(74, 78, 18, 14, 3, P.brown, { sw: 2 }),
    ],
  },
  {
    word: 'SCARF', meaning: 'a winter scarf', alt: 'A long knitted scarf with green and white stripes and fringes, looped once.',
    draw: () => [
      path('M20 30Q60 50 100 30Q110 46 98 54Q60 70 22 54Q10 46 20 30Z', P.leaf),
      path('M68 56L84 110H64L54 60Z', P.leaf), path('M54 60L44 108H26L40 56Z', P.forest),
      line('M30 34L28 54M48 42V60M72 42V60M90 34L92 54', { stroke: P.paper, sw: 4 }), line('M72 80H80M60 92h20M38 86h12', { stroke: P.paper, sw: 4 }),
      line('M66 110v6M72 110v6M78 110v6M84 110v6M28 108v6M34 108v6M40 108v6', { sw: 2 }),
    ],
  },
  {
    word: 'GLOVE', meaning: 'a winter glove', alt: 'A red knitted glove with five fingers and a striped cuff.',
    draw: () => [
      path('M34 66V30Q34 22 41 22Q48 22 48 30V58V18Q48 10 55 10Q62 10 62 18V56V14Q62 6 69 6Q76 6 76 14V58V24Q76 16 83 16Q90 16 90 24V74Q96 60 104 58Q112 60 108 70L94 96Q88 104 80 104H48Q34 104 34 90Z', P.red),
      line('M48 58V30M62 56V18M76 58V24', { sw: 2 }), rect(38, 96, 46, 18, 4, P.paper), line('M46 98v14M54 98v14M62 98v14M70 98v14M78 98v14', { stroke: P.red, sw: 2 }),
    ],
  },
  {
    word: 'BELT', meaning: 'a belt', alt: 'A brown leather belt lying straight, with a gold buckle at one end and holes at the other.',
    draw: () => [
      group({ t: 'rotate(-20 60 60)' },
        rect(30, 48, 86, 22, 4, P.brown), ...[66, 78, 90, 102].map(x => circle(x, 59, 2.5, P.charcoal, { ns: true })),
        rect(4, 40, 30, 38, 8, P.gold), rect(11, 47, 16, 24, 4, P.cream, { sw: 2 }), line('M18 59H34', { sw: 3 })),
    ],
  },
  {
    word: 'BUTTON', meaning: 'a sewing button', alt: 'A big round blue button with a raised rim and four holes.',
    draw: () => [circle(60, 60, 48, P.blue), circle(60, 60, 36, P.sky, { sw: 2 }), ...[[48, 48], [72, 48], [48, 72], [72, 72]].map(([x, y]) => circle(x, y, 6, P.navy, { sw: 2 })), line('M48 48L72 72M72 48L48 72', { stroke: P.paper, sw: 2.5 })],
  },
  {
    word: 'ZIPPER', meaning: 'a zipper', alt: 'A metal zipper partly open, with two rows of teeth and a slider with a pull tab.',
    draw: () => [
      path('M26 4H58V44L36 116H26Z', P.blue), path('M94 4H62V44L84 116H94Z', P.blue),
      ...Array.from({ length: 5 }, (_, i) => [rect(52, 6 + i * 8, 8, 5, 1, P.stone, { sw: 1.5 }), rect(60, 10 + i * 8, 8, 5, 1, P.stone, { sw: 1.5 })]).flat(),
      ...Array.from({ length: 6 }, (_, i) => [rect(48 - i * 3.4, 62 + i * 9, 8, 5, 1, P.stone, { sw: 1.5, t: `rotate(-15 ${52 - i * 3.4} ${64 + i * 9})` }), rect(64 + i * 3.4, 62 + i * 9, 8, 5, 1, P.stone, { sw: 1.5, t: `rotate(15 ${68 + i * 3.4} ${64 + i * 9})` })]).flat(),
      path('M50 46H70L66 60H54Z', P.slate), rect(54, 58, 12, 26, 5, P.stone), circle(60, 78, 2.5, P.ink, { ns: true }),
    ],
  },
  {
    word: 'RING', fit: [0.898, 62.0, 57.0], meaning: 'a finger ring', otherMeaning: 'a ringing sound, or a circle', alt: 'A gold ring with a big sparkling blue gem on top.',
    draw: () => [
      ellipse(60, 74, 34, 34, undefined, { stroke: P.ink, sw: 15 }), ellipse(60, 74, 34, 34, undefined, { stroke: P.gold, sw: 9 }),
      path('M42 30L52 18H68L78 30L60 50Z', P.sky), path('M42 30H78M52 18L56 30L60 50L64 30L68 18', undefined, { sw: 2 }),
      line('M90 14l6-6M96 24h8M84 6V0', { stroke: P.yellow, sw: 3 }),
    ],
  },
  {
    word: 'WATCH', meaning: 'a wristwatch', otherMeaning: 'to watch something', alt: 'A wristwatch with a round face, two hands and a green strap.',
    draw: () => [
      rect(42, 4, 36, 112, 10, P.leaf), line('M48 24H72M48 96H72', { stroke: P.forest, sw: 2 }), circle(60, 104, 2.5, P.ink, { ns: true }),
      rect(94, 54, 8, 12, 2, P.stone), circle(60, 60, 34, P.stone), circle(60, 60, 26, P.paper),
      line('M60 60V42M60 60L72 66', { sw: 3.5 }), line('M60 38v3M60 79v3M38 60h3M79 60h3', { sw: 2 }),
    ],
  },
  {
    word: 'GLASSES', meaning: 'eyeglasses', otherMeaning: 'drinking glasses', alt: 'A pair of eyeglasses seen from the front, with round blue-tinted lenses and folded side arms.',
    draw: () => [
      line('M14 50L4 40M106 50L116 40', { stroke: P.charcoal, sw: 7 }),
      circle(34, 64, 22, P.sky, { stroke: P.charcoal, sw: 7 }), circle(86, 64, 22, P.sky, { stroke: P.charcoal, sw: 7 }), path('M54 58Q60 50 66 58', undefined, { stroke: P.charcoal, sw: 6 }),
      path('M22 56Q28 48 36 48', undefined, { stroke: P.paper, sw: 3 }), path('M74 56Q80 48 88 48', undefined, { stroke: P.paper, sw: 3 }),
    ],
  },
  {
    word: 'TIE', meaning: 'a necktie', otherMeaning: 'to tie a knot', alt: 'A blue necktie with a small knot and diagonal stripes, pointed at the bottom.',
    draw: () => [
      path('M50 30L70 30L80 92L60 116L40 92Z', P.blue),
      line('M46 50L72 40M44 66L76 54M42 82L78 70M46 98L78 86', { stroke: P.yellow, sw: 3 }), path('M50 30L70 30L80 92L60 116L40 92Z'),
      path('M46 8H74L68 30H52Z', P.blue), path('M30 4L46 8L52 30M90 4L74 8L68 30', undefined, { sw: 3 }),
    ],
  },
  {
    word: 'HELMET', meaning: 'a bike helmet', alt: 'A blue bicycle helmet side on, with air vents, a short peak and a chin strap.',
    draw: () => [
      path('M30 74L44 102H78L92 74', undefined, { stroke: P.charcoal, sw: 4 }), rect(56, 98, 12, 8, 2, P.charcoal),
      path('M8 76Q8 22 60 20Q112 22 112 76Z', P.blue), path('M100 76L118 70L116 80Z', P.navy),
      path('M30 34L40 54M54 26L58 50M76 28L74 52M94 40L86 58', undefined, { stroke: P.charcoal, sw: 6 }),
      rect(8, 70, 104, 10, 4, P.navy),
    ],
  },
  {
    word: 'VEST', meaning: 'a vest', alt: 'A green sleeveless vest with a V neck and a row of buttons down the front.',
    draw: () => [
      path('M38 8L60 52L82 8Q92 12 94 30Q98 44 108 52V104Q108 112 100 112H20Q12 112 12 104V52Q22 44 26 30Q28 12 38 8Z', P.leaf),
      line('M60 52V112', undefined), ...[66, 80, 94].map(y => circle(68, y, 3.5, P.paper, { sw: 1.5 })),
      line('M22 86h20M78 86h20', { stroke: P.forest, sw: 3 }),
    ],
  },
  {
    word: 'PURSE', meaning: 'a handbag (purse)', alt: 'A red handbag with a curved handle on top and a gold clasp.',
    draw: () => [
      path('M38 44Q38 12 60 12Q82 12 82 44', undefined, { stroke: P.ink, sw: 10 }), path('M38 44Q38 12 60 12Q82 12 82 44', undefined, { stroke: P.brown, sw: 5 }),
      path('M18 44H102L110 104Q110 110 104 110H16Q10 110 10 104Z', P.red), path('M18 44H102L104 62Q60 76 16 62Z', P.coral, { sw: 2 }),
      rect(52, 60, 16, 12, 3, P.gold),
    ],
  },
  {
    word: 'EARRING', meaning: 'an earring', alt: 'A pair of gold earrings, each a small hook with a teardrop pink gem hanging down.',
    draw: () => [
      ...[34, 86].map(x => [
        path(`M${x} 8Q${x + 14} 8 ${x + 12} 24Q${x + 8} 34 ${x} 36`, undefined, { stroke: P.ink, sw: 7 }), path(`M${x} 8Q${x + 14} 8 ${x + 12} 24Q${x + 8} 34 ${x} 36`, undefined, { stroke: P.gold, sw: 3 }),
        circle(x, 40, 6, P.gold), path(`M${x} 48Q${x + 22} 76 ${x + 18} 92Q${x + 12} 108 ${x} 108Q${x - 12} 108 ${x - 18} 92Q${x - 22} 76 ${x} 48Z`, P.pink),
        patch(`M${x - 10} 82Q${x - 8} 72 ${x - 2} 66Q${x - 4} 76 ${x - 4} 86Z`, P.paper),
      ]).flat(),
    ],
  },
  {
    word: 'WALLET', meaning: 'a wallet', alt: 'A brown folded wallet with a green bill and a card sticking out of the top.',
    draw: () => [
      rect(24, 18, 60, 36, 3, P.leaf, { t: 'rotate(-8 54 36)' }), rect(54, 24, 40, 28, 3, P.sky, { t: 'rotate(10 74 38)' }),
      rect(10, 40, 100, 66, 10, P.brown), path('M60 54H110V92H60Q50 92 50 82V64Q50 54 60 54Z', P.wood), circle(64, 73, 5, P.gold),
      line('M18 48H102', { stroke: P.wood, sw: 2, dash: '4 4' }),
    ],
  },
];
