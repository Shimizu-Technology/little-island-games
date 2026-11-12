import { P, circle, ellipse, rect, path, line, poly, patch, dot, eyes } from '../style.mjs';

const legs = (xs, y, h, fill, w = 9) => xs.map(x => rect(x, y, w, h, 4, fill));
const hooves = (xs, y, fill = P.charcoal, w = 9) => xs.map(x => rect(x, y, w, 5, 2, fill));

export default [
  {
    word: 'DOG', meaning: 'a pet dog', alt: 'A brown dog standing side on, with a floppy ear and a red collar.',
    draw: () => [
      path('M28 62Q16 56 14 40', P.wood, { sw: 3 }), line('M28 62Q16 56 14 40'),
      legs([30, 42], 74, 28, P.wood), ellipse(56, 68, 31, 17, P.wood), legs([66, 78], 74, 28, P.wood),
      rect(76, 52, 12, 9, 3, P.red, { t: 'rotate(-20 82 56)' }),
      circle(88, 44, 17, P.wood), ellipse(103, 52, 11, 8, P.cream),
      path('M80 30Q68 34 72 58Q81 57 86 34Z', P.brown), dot(92, 40), circle(112, 49, 3.6, P.ink, { ns: true }),
    ],
  },
  {
    word: 'CAT', meaning: 'a pet cat', alt: 'A grey cat sitting and facing you, with pointed ears, whiskers and a curled tail.',
    draw: () => [
      path('M76 102Q104 106 102 80Q101 72 95 75Q96 95 76 94Z', P.stone),
      path('M38 106Q34 68 60 64Q86 68 82 106Z', P.stone), line('M52 106V90M68 106V90', { sw: 2 }),
      poly('40,40 42,14 60,30', P.stone), poly('80,40 78,14 60,30', P.stone),
      poly('44,32 45,21 53,29', P.pink, { ns: true }), poly('76,32 75,21 67,29', P.pink, { ns: true }),
      circle(60, 46, 21, P.stone), eyes(52, 44, 68, 44, 3), poly('56,52 64,52 60,57', P.pink, { sw: 2 }),
      line('M46 53L28 49M46 57L29 59M74 53L92 49M74 57L91 59', { sw: 2 }),
    ],
  },
  {
    word: 'PIG', meaning: 'a farm pig', alt: 'A pink pig side on, with a round snout and a curly tail.',
    draw: () => [
      line('M24 62q-10-2-8-10q3-6 7-1q2 6-7 7'),
      legs([30, 44], 78, 22, P.pink), ellipse(56, 66, 34, 23, P.pink), legs([62, 76], 78, 22, P.pink),
      circle(90, 56, 18, P.pink), path('M80 42L84 26L96 40Z', P.pink),
      ellipse(106, 60, 7, 10, P.coral), dot(104.5, 56, 1.8), dot(104.5, 63, 1.8), dot(93, 50),
    ],
  },
  {
    word: 'COW', meaning: 'a farm cow', alt: 'A black and white cow side on, with small horns and a pink nose.',
    draw: () => [
      line('M20 52Q12 64 14 82'), path('M14 82l-4 8 8-2Z', P.charcoal, { sw: 2 }),
      legs([26, 38], 74, 30, P.paper), hooves([26, 38], 99),
      rect(18, 42, 70, 38, 16, P.paper),
      patch('M30 44H50Q54 56 44 62Q32 64 28 54Z', P.charcoal), patch('M62 58Q74 54 80 64Q78 76 66 76Q58 70 62 58Z', P.charcoal),
      legs([62, 74], 74, 30, P.paper), hooves([62, 74], 99),
      path('M84 22Q88 16 92 22M104 22Q108 16 112 22', undefined),
      path('M80 40L76 34L86 33Z', P.paper), rect(84, 22, 26, 36, 11, P.paper),
      patch('M88 26H104Q100 36 92 34Z', P.charcoal), ellipse(97, 58, 14, 9, P.pink), dot(92, 58, 2), dot(102, 58, 2), eyes(91, 38, 103, 38),
    ],
  },
  {
    word: 'HORSE', meaning: 'a horse', alt: 'A brown horse standing side on, with a dark mane and tail.',
    draw: () => [
      path('M24 56Q10 66 14 92Q22 80 26 66Z', P.brown),
      legs([28, 38], 66, 38, P.wood, 8), hooves([28, 38], 100, P.charcoal, 8),
      ellipse(52, 62, 30, 16, P.wood),
      legs([64, 74], 66, 38, P.wood, 8), hooves([64, 74], 100, P.charcoal, 8),
      path('M68 60L80 28Q84 20 94 22L100 30L86 66Z', P.wood),
      path('M86 22L114 40Q116 50 106 50L92 44Z', P.wood), poly('86,24 88,12 95,22', P.wood),
      patch('M80 24Q76 40 70 56L74 58Q82 42 86 26Z', P.brown), dot(97, 31), dot(110, 45, 1.8),
    ],
  },
  {
    word: 'GOAT', meaning: 'a farm goat', alt: 'A cream goat side on, with curved horns, a little beard and a short tail.',
    draw: () => [
      path('M26 52L18 42L28 46Z', P.cream),
      legs([30, 40], 70, 32, P.cream, 8), hooves([30, 40], 98, P.slate, 8),
      ellipse(52, 62, 28, 15, P.cream),
      legs([62, 72], 70, 32, P.cream, 8), hooves([62, 72], 98, P.slate, 8),
      path('M68 56L78 36L92 40L80 64Z', P.cream),
      path('M84 20Q74 18 72 34', undefined, { stroke: P.slate, sw: 5 }), line('M84 20Q74 18 72 34'),
      path('M78 30Q86 24 96 30L108 46Q108 54 100 52L84 46Z', P.cream),
      path('M74 36L64 32L76 30Z', P.cream), path('M100 52L98 64L94 52Z', P.stone, { sw: 2 }), dot(90, 36),
    ],
  },
  {
    word: 'SHEEP', meaning: 'a farm sheep', alt: 'A fluffy white sheep side on, with a dark face and legs.',
    draw: () => [
      legs([30, 42, 64, 76], 76, 26, P.charcoal, 7),
      path('M24 64Q14 54 24 46Q24 34 38 34Q44 24 56 30Q66 22 76 30Q90 28 90 42Q100 52 92 62Q96 76 82 78Q74 88 62 80Q52 88 42 80Q28 84 26 74Q16 72 24 64Z', P.paper),
      path('M84 42Q88 30 100 32Q112 36 112 50Q110 62 100 62Q90 60 86 52Z', P.charcoal),
      path('M88 38L80 34L86 46Z', P.charcoal), circle(100, 44, 3, P.paper, { ns: true }), dot(100.6, 44.4, 1.6),
    ],
  },
  {
    word: 'HEN', meaning: 'a hen (a mother chicken)', otherMeaning: 'chicken as food', alt: 'A round brown hen sitting on a straw nest with eggs peeking out, with a small red comb and a yellow beak.',
    draw: () => [
      path('M8 86Q12 110 60 112Q108 110 112 86Z', P.sand), line('M14 92Q40 104 74 98M22 104Q56 112 96 100M50 92Q80 106 106 92', { stroke: P.wood, sw: 2.5 }),
      ellipse(30, 84, 9, 7, P.paper), ellipse(90, 84, 9, 7, P.paper),
      path('M26 64Q8 56 10 36Q22 40 28 48Q22 34 32 28Q38 42 38 52Z', P.brown),
      ellipse(58, 66, 34, 24, P.wood), path('M40 62Q56 50 72 64Q56 78 40 62Z', P.brown), path('M8 86Q34 80 60 82Q86 80 112 86', undefined),
      path('M76 28Q74 18 80 21Q82 13 86 21Q91 16 91 28Z', P.red),
      circle(84, 40, 14, P.wood), poly('96,36 108,41 96,46', P.yellow), path('M94 48Q98 58 92 58Q89 54 94 48Z', P.red, { sw: 2 }), dot(87, 37),
    ],
  },
  {
    word: 'ROOSTER', meaning: 'a male chicken', alt: 'A proud rooster standing tall, with a big red comb and wattle and long curving green and blue tail feathers.',
    draw: () => [
      line('M54 90V106M48 108H60M68 90V106M62 108H74', { stroke: P.orange, sw: 4 }),
      path('M40 68Q8 70 4 34Q18 32 26 46Q16 18 30 6Q40 28 44 54Z', P.forest),
      path('M42 66Q22 50 22 22Q34 30 44 52Z', P.navy), path('M42 70Q14 84 10 64Q24 66 40 60Z', P.blue),
      ellipse(60, 72, 24, 19, P.orange), path('M46 68Q60 58 72 70Q60 82 46 68Z', P.red),
      path('M74 60L78 32Q80 22 90 22Q102 24 100 38L88 64Z', P.gold), poly('99,32 112,36 99,40', P.yellow),
      path('M76 24Q70 4 80 8Q82 -2 90 8Q96 0 100 12Q108 10 102 26Z', P.red, { t: 'translate(0 2)' }),
      path('M96 42Q104 56 94 58Q88 50 96 42Z', P.red, { sw: 2 }), dot(90, 31),
    ],
  },
  {
    word: 'CHICK', meaning: 'a baby chicken', alt: 'A small round yellow chick with a tiny orange beak and orange feet.',
    draw: () => [
      line('M50 92V104M44 106H56M70 92V104M64 106H76', { stroke: P.orange, sw: 4 }),
      ellipse(60, 72, 30, 26, P.yellow), circle(62, 40, 20, P.yellow),
      path('M38 70Q48 62 58 74Q48 84 38 70Z', P.gold), path('M60 18Q62 10 68 14Q64 16 64 22', undefined, { sw: 2 }),
      poly('78,40 92,45 78,50', P.orange), dot(68, 36),
    ],
  },
  {
    word: 'DUCK', meaning: 'a duck', alt: 'A white duck side on, with a wide orange bill and orange webbed feet.',
    draw: () => [
      path('M42 90L36 104H52ZM64 90L58 104H74Z', P.orange),
      path('M12 50Q26 60 50 62H82Q94 90 60 94H36Q8 88 12 50Z', P.paper), path('M30 70Q48 60 66 72Q48 82 30 70Z', P.stone),
      path('M68 60Q62 50 70 38L90 40Q94 54 86 62Z', P.paper), circle(80, 32, 16, P.paper),
      path('M92 30Q112 28 112 37Q110 44 92 42Z', P.orange), dot(83, 28),
    ],
  },
  {
    word: 'FROG', meaning: 'a frog', alt: 'A green frog facing you, with big round eyes on top and a wide smile.',
    draw: () => [
      ellipse(22, 90, 16, 9, P.leaf), ellipse(98, 90, 16, 9, P.leaf),
      ellipse(60, 76, 34, 24, P.leaf), ellipse(60, 84, 18, 13, P.mint, { sw: 2 }),
      ellipse(60, 52, 36, 20, P.leaf), circle(38, 34, 12, P.leaf), circle(82, 34, 12, P.leaf),
      circle(38, 34, 6.5, P.paper, { sw: 2 }), circle(82, 34, 6.5, P.paper, { sw: 2 }), eyes(39, 35, 83, 35, 3.4),
      line('M40 58Q60 70 80 58'), ellipse(40, 102, 10, 5, P.leaf), ellipse(80, 102, 10, 5, P.leaf),
    ],
  },
  {
    word: 'BIRD', meaning: 'a bird', alt: 'A small blue songbird perched side on, with a pointed beak and a folded wing.', basedOn: 'content/library/art/guam-rail.svg (silhouette idea only)',
    draw: () => [
      line('M54 90V102M66 90V102', { stroke: P.orange, sw: 3 }), line('M30 104H90', { stroke: P.brown, sw: 6 }), line('M30 104H90'),
      path('M30 72L8 64L14 84Z', P.navy),
      ellipse(56, 72, 30, 22, P.blue), path('M36 66Q56 54 72 70Q54 86 36 66Z', P.navy),
      circle(78, 46, 17, P.blue), path('M64 54Q70 66 84 62Q76 56 76 50Z', P.cream, { ns: true }),
      poly('93,42 110,47 93,52', P.yellow), dot(82, 42),
    ],
  },
  {
    word: 'OWL', meaning: 'an owl', alt: 'A brown owl facing you, with ear tufts and big round yellow eyes.',
    draw: () => [
      path('M30 50Q28 16 42 18L50 28H70L78 18Q92 16 90 50Q96 86 76 100H44Q24 86 30 50Z', P.wood),
      path('M40 70Q60 58 80 70Q82 92 60 98Q38 92 40 70Z', P.cream, { sw: 2 }),
      line('M50 78q4 4 8 0M62 78q4 4 8 0M54 88q4 4 8 0', { sw: 2 }),
      path('M30 54Q20 74 34 92', P.brown), path('M90 54Q100 74 86 92', P.brown),
      circle(46, 44, 12, P.paper), circle(74, 44, 12, P.paper), circle(46, 44, 7, P.yellow, { sw: 2 }), circle(74, 44, 7, P.yellow, { sw: 2 }),
      eyes(46, 44, 74, 44, 3.6), poly('56,54 64,54 60,64', P.orange, { sw: 2 }),
      line('M50 100v6M56 100v6M64 100v6M70 100v6', { stroke: P.orange, sw: 3 }),
    ],
  },
  {
    word: 'BEE', meaning: 'a honeybee', alt: 'A round yellow bee with black stripes, see-through wings and a little stinger.',
    draw: () => [
      ellipse(48, 34, 15, 22, P.sky, { t: 'rotate(-20 48 34)' }), ellipse(72, 32, 13, 19, P.sky, { t: 'rotate(18 72 32)' }),
      poly('22,66 10,70 22,74', P.charcoal, { sw: 2 }),
      ellipse(56, 70, 34, 24, P.yellow),
      patch('M40 49Q46 70 40 91L50 93Q56 70 50 47Z', P.charcoal), patch('M62 47Q68 70 62 93L72 91Q78 70 72 49Z', P.charcoal),
      ellipse(56, 70, 34, 24), circle(94, 66, 14, P.charcoal), dot(98, 62, 0.1),
      circle(99, 62, 3, P.paper, { ns: true }), line('M96 54Q98 40 106 38M90 54Q86 40 92 34'),
    ],
  },
  {
    word: 'ANT', meaning: 'an ant', alt: 'A brown ant side on, with three round body parts, six thin legs and two feelers.',
    draw: () => [
      line('M54 66L42 90M60 68L60 94M66 66L80 90M50 64L30 82M70 64L92 84M58 66L52 94', { sw: 3 }),
      ellipse(30, 60, 20, 15, P.brown), ellipse(60, 62, 12, 9, P.brown), circle(88, 52, 13, P.brown),
      line('M94 42Q100 26 110 24M88 40Q86 26 94 18'), dot(92, 50),
    ],
  },
  {
    word: 'SNAIL', meaning: 'a garden snail', alt: 'A snail with a coiled brown shell on its back and two eye stalks.',
    draw: () => [
      path('M10 96Q40 92 84 92Q100 92 104 80L106 60Q100 54 96 62L94 76Q90 84 70 84H16Q8 88 10 96Z', P.sand),
      line('M98 60L94 42M106 60L110 42'), circle(94, 40, 3.5, P.ink, { ns: true }), circle(110, 40, 3.5, P.ink, { ns: true }),
      circle(52, 58, 30, P.wood), line('M52 58m-4 0a4 4 0 1 1 8 2a10 10 0 1 1-18-6a17 17 0 1 1 30 10a24 24 0 0 1-38 10', { sw: 3 }),
    ],
  },
  {
    word: 'WORM', meaning: 'an earthworm', alt: 'A long pink earthworm in a wavy S shape, with ring lines along its body.',
    draw: () => [
      path('M12 84Q20 60 40 70Q58 80 62 60Q66 40 86 44Q104 48 104 32', undefined, { stroke: P.ink, sw: 17 }),
      path('M12 84Q20 60 40 70Q58 80 62 60Q66 40 86 44Q104 48 104 32', undefined, { stroke: P.pink, sw: 11 }),
      line('M24 68l4 9M42 66l-2 10M58 70l9 1M66 48l8 6M84 40l-1 9', { sw: 2 }), dot(103, 32, 2.2),
    ],
  },
  {
    word: 'SPIDER', meaning: 'a spider', alt: 'A black spider hanging from a thread, with eight bent legs.',
    draw: () => [
      line('M60 6V44', { sw: 2 }),
      line('M52 58L32 46L18 58M50 64L28 62L14 74M52 70L32 80L22 96M56 74L46 92L44 108M68 58L88 46L102 58M70 64L92 62L106 74M68 70L88 80L98 96M64 74L74 92L76 108'),
      circle(60, 50, 9, P.charcoal), ellipse(60, 70, 15, 16, P.charcoal),
      circle(56.5, 49, 2.4, P.paper, { ns: true }), circle(63.5, 49, 2.4, P.paper, { ns: true }),
    ],
  },
  {
    word: 'MOUSE', meaning: 'a small furry mouse', otherMeaning: 'a computer mouse', alt: 'A small grey mouse side on, with big round ears, a pointed nose and a long thin tail.',
    draw: () => [
      line('M30 82Q12 84 10 64Q8 50 20 48', { sw: 3 }),
      path('M26 84Q24 56 54 52Q80 50 96 70L108 76Q106 84 96 84Z', P.stone),
      circle(72, 46, 13, P.stone), circle(72, 46, 7, P.pink, { ns: true }),
      dot(92, 66), circle(108, 77, 3, P.pink, { sw: 2 }), line('M100 80l12 4M100 76l12-2', { sw: 2 }),
      line('M44 84l-2 8M70 84l2 8', { sw: 3 }),
    ],
  },
  {
    word: 'RABBIT', meaning: 'a rabbit', alt: 'A white rabbit sitting side on, with two tall ears and a fluffy tail.',
    draw: () => [
      circle(22, 80, 9, P.paper),
      path('M26 98Q20 62 50 58Q76 58 80 84Q82 100 70 100Z', P.paper), path('M40 100Q42 92 56 92Q62 100 58 100Z', P.paper),
      ellipse(70, 22, 7, 20, P.paper, { t: 'rotate(-10 70 22)' }), ellipse(86, 22, 7, 20, P.paper, { t: 'rotate(14 86 22)' }),
      ellipse(70, 22, 3, 13, P.pink, { ns: true, t: 'rotate(-10 70 22)' }), ellipse(86, 22, 3, 13, P.pink, { ns: true, t: 'rotate(14 86 22)' }),
      circle(82, 54, 17, P.paper), dot(88, 50), circle(98, 57, 2.6, P.pink, { sw: 2 }), line('M92 62l12 2M92 58l12-4', { sw: 2 }),
    ],
  },
  {
    word: 'BEAR', meaning: 'a brown bear', alt: 'A big brown bear walking side on, with small round ears and a light snout.',
    draw: () => [
      legs([22, 36], 70, 32, P.brown, 12), legs([68, 82], 70, 32, P.brown, 12),
      path('M14 76Q10 44 40 40Q60 34 80 44Q96 50 94 76Z', P.brown),
      circle(94, 46, 18, P.brown), circle(88, 28, 6, P.brown), ellipse(108, 54, 9, 7, P.wood),
      circle(115, 51, 3.2, P.ink, { ns: true }), dot(98, 42),
    ],
  },
  {
    word: 'LION', meaning: 'a lion', alt: 'A lion face with a big shaggy orange mane around it.',
    draw: () => [
      path('M60 8Q72 14 80 10Q84 22 96 22Q94 34 106 40Q98 50 108 60Q98 68 104 80Q92 82 90 94Q78 92 72 104Q64 96 60 106Q54 96 46 104Q42 92 30 94Q28 82 16 80Q22 68 12 60Q22 50 14 40Q26 34 24 22Q36 22 40 10Q48 14 60 8Z', P.orange),
      circle(40, 34, 7, P.gold), circle(80, 34, 7, P.gold),
      circle(60, 58, 28, P.gold), ellipse(60, 70, 13, 10, P.cream, { sw: 2 }),
      poly('54,62 66,62 60,69', P.brown, { sw: 2 }), line('M60 69V74M52 76Q60 80 68 76', { sw: 2 }), eyes(50, 52, 70, 52, 3.2),
    ],
  },
  {
    word: 'TIGER', meaning: 'a tiger', alt: 'An orange tiger walking side on, with black stripes and a long striped tail.',
    draw: () => [
      path('M20 58Q6 54 8 36', undefined, { stroke: P.orange, sw: 8 }), line('M20 58Q6 54 8 36', { sw: 2 }),
      legs([24, 36], 70, 30, P.orange, 10), legs([68, 80], 70, 30, P.orange, 10),
      rect(16, 44, 74, 34, 16, P.orange),
      line('M32 46l4 12M44 45l-2 14M56 45l4 12M68 46l-3 12M38 76l3-9M62 76l-3-9', { sw: 3 }),
      circle(92, 48, 18, P.orange), poly('80,36 82,24 92,32', P.orange), ellipse(104, 56, 9, 8, P.paper, { sw: 2 }),
      line('M86 38l6 4M98 36l-2 6', { sw: 2 }), dot(96, 44), circle(112, 52, 2.8, P.ink, { ns: true }),
    ],
  },
  {
    word: 'ELEPHANT', meaning: 'an elephant', alt: 'A grey elephant side on, with a big ear, a long curling trunk and a white tusk.',
    draw: () => [
      line('M16 54Q8 62 12 74', { sw: 3 }),
      legs([22, 36, 60, 74], 70, 32, P.stone, 12),
      ellipse(50, 58, 36, 26, P.stone),
      path('M84 40Q100 40 102 60Q104 80 108 92Q112 100 104 102Q98 98 96 86Q92 76 80 74Z', P.stone),
      path('M90 70Q98 76 104 70', P.paper, { sw: 2 }),
      path('M66 34Q90 24 92 50Q92 74 72 74Q62 60 66 34Z', P.slate), dot(94, 46),
    ],
  },
  {
    word: 'ZEBRA', meaning: 'a zebra', alt: 'A white zebra side on, covered in black stripes, with a striped mane.',
    draw: () => [
      path('M22 56Q12 66 14 84', undefined), path('M14 84l-4 8h8Z', P.charcoal, { sw: 2 }),
      legs([28, 38, 64, 74], 66, 36, P.paper, 8), hooves([28, 38, 64, 74], 98, P.charcoal, 8),
      ellipse(52, 60, 30, 16, P.paper),
      path('M68 58L80 28Q84 20 94 22L100 30L86 66Z', P.paper), path('M86 22L114 40Q116 50 106 50L92 44Z', P.paper),
      poly('86,24 88,12 95,22', P.paper),
      line('M34 46l4 14M44 44l0 18M54 44l-2 18M64 46l-4 14M30 66l3 22M66 66l-3 22M80 40l8 6M76 50l9 5M94 24l-2 8', { sw: 3.5, stroke: P.charcoal }),
      ellipse(52, 60, 30, 16), patch('M80 24Q76 40 70 56L74 58Q82 42 86 26Z', P.charcoal), dot(97, 31), circle(108, 46, 4, P.charcoal, { ns: true }),
    ],
  },
  {
    word: 'MONKEY', meaning: 'a monkey', alt: 'A brown monkey sitting and facing you, with big round ears, a light face and a curled tail.',
    draw: () => [
      line('M78 96Q104 98 104 76Q104 62 94 64', { stroke: P.brown, sw: 7 }), line('M78 96Q104 98 104 76Q104 62 94 64', { sw: 2 }),
      path('M38 106Q34 70 60 68Q86 70 82 106Z', P.brown), ellipse(60, 92, 13, 12, P.wood, { sw: 2 }),
      circle(30, 42, 11, P.brown), circle(90, 42, 11, P.brown), circle(30, 42, 6, P.wood, { ns: true }), circle(90, 42, 6, P.wood, { ns: true }),
      circle(60, 42, 24, P.brown), path('M42 46Q42 30 52 32Q60 36 68 32Q78 30 78 46Q78 62 60 64Q42 62 42 46Z', P.wood, { sw: 2 }),
      eyes(52, 42, 68, 42, 3), line('M54 54Q60 58 66 54', { sw: 2 }),
    ],
  },
  {
    word: 'DEER', meaning: 'a deer with antlers', alt: 'A brown deer standing side on, with branching antlers and a white tail.',
    draw: () => [
      path('M24 56l-8-6 4 10Z', P.paper),
      legs([28, 38, 64, 74], 66, 36, P.wood, 7), hooves([28, 38, 64, 74], 98, P.brown, 7),
      ellipse(52, 60, 30, 15, P.wood),
      path('M68 56L78 32L90 36L82 64Z', P.wood), path('M80 30Q86 22 94 28L110 40Q110 48 102 48L86 42Z', P.wood),
      line('M84 26L76 8M80 18L70 14M78 12L82 4M88 26L96 8M94 16L104 12M96 10L94 2', { stroke: P.brown, sw: 4 }),
      path('M80 30l-8-2 6 8Z', P.wood), dot(92, 34), circle(109, 43, 2.6, P.ink, { ns: true }),
    ],
  },
  {
    word: 'PARROT', meaning: 'a parrot', alt: 'A red parrot perched side on, with a blue wing, a long tail and a hooked beak.',
    draw: () => [
      line('M20 84H104', { stroke: P.brown, sw: 7 }), line('M20 84H104'),
      path('M50 78L36 112L48 110L60 80Z', P.blue), path('M54 80L50 114L58 110Z', P.yellow, { sw: 2 }),
      path('M46 80Q34 50 52 30Q66 18 78 30Q86 42 78 60Q72 78 58 82Z', P.red),
      path('M52 48Q66 50 66 76Q54 80 50 70Z', P.blue), path('M54 54Q60 58 60 72', undefined, { sw: 2 }),
      path('M78 30Q92 30 92 44Q90 50 84 46Q86 38 78 38Z', P.cream),
      circle(70, 34, 6, P.paper, { sw: 2 }), dot(71, 34, 2.4), line('M62 84V92M70 84V92', { stroke: P.slate, sw: 3 }),
    ],
  },
  {
    word: 'PENGUIN', meaning: 'a penguin', alt: 'A black and white penguin standing and facing you, with an orange beak and orange feet.',
    draw: () => [
      path('M44 102L34 108H54ZM76 102L66 108H86Z', P.orange),
      path('M60 10Q34 10 32 44Q28 80 38 102H82Q92 80 88 44Q86 10 60 10Z', P.charcoal),
      path('M60 30Q44 30 42 58Q42 92 60 100Q78 92 78 58Q76 30 60 30Z', P.paper),
      path('M32 50Q18 70 26 84Q32 72 36 66Z', P.charcoal), path('M88 50Q102 70 94 84Q88 72 84 66Z', P.charcoal),
      circle(52, 30, 4, P.paper, { ns: true }), circle(68, 30, 4, P.paper, { ns: true }), eyes(52, 30, 68, 30, 2.2),
      poly('54,38 66,38 60,46', P.orange, { sw: 2 }),
    ],
  },
  {
    word: 'EAGLE', meaning: 'an eagle', alt: 'A brown eagle with its wings spread wide, a white head and a yellow hooked beak.',
    draw: () => [
      path('M48 54Q30 30 6 30Q12 40 10 46Q20 46 20 52Q28 52 30 60Q40 60 48 70Z', P.brown),
      path('M72 54Q90 30 114 30Q108 40 110 46Q100 46 100 52Q92 52 90 60Q80 60 72 70Z', P.brown),
      path('M46 52Q46 40 60 40Q74 40 74 52L72 86L60 98L48 86Z', P.brown),
      path('M52 98L46 108H74L68 98Z', P.paper), line('M54 92v8M66 92v8', { stroke: P.yellow, sw: 4 }),
      circle(60, 30, 13, P.paper), path('M60 32Q72 30 74 40Q70 46 64 40Z', P.yellow, { sw: 2 }), dot(62, 27),
    ],
  },
  {
    word: 'BAT', meaning: 'a bat, the flying animal', otherMeaning: 'a baseball bat', alt: 'A purple bat with wide scalloped wings, pointed ears and a small furry body.',
    draw: () => [
      path('M52 50Q36 30 6 36Q14 46 12 56Q22 54 26 62Q34 58 40 68Q46 62 54 70Z', P.purple),
      path('M68 50Q84 30 114 36Q106 46 108 56Q98 54 94 62Q86 58 80 68Q74 62 66 70Z', P.purple),
      line('M18 42L40 60M30 38L46 58', { sw: 2 }), line('M102 42L80 60M90 38L74 58', { sw: 2 }),
      ellipse(60, 66, 12, 18, P.brown), circle(60, 46, 12, P.brown), poly('50,40 48,26 58,36', P.brown), poly('70,40 72,26 62,36', P.brown),
      circle(55, 45, 2.6, P.paper, { ns: true }), circle(65, 45, 2.6, P.paper, { ns: true }), dot(55, 45, 1.3), dot(65, 45, 1.3),
    ],
  },
  {
    word: 'DONKEY', meaning: 'a donkey', alt: 'A grey donkey side on, with very long ears, a pale nose and a tufted tail.',
    draw: () => [
      line('M22 58Q14 68 16 84'), path('M16 84l-4 8h8Z', P.charcoal, { sw: 2 }),
      legs([28, 38, 64, 74], 68, 34, P.stone, 8), hooves([28, 38, 64, 74], 98, P.charcoal, 8),
      ellipse(52, 62, 30, 16, P.stone),
      path('M68 58L78 34L92 38L84 66Z', P.stone),
      ellipse(84, 16, 5, 14, P.stone, { t: 'rotate(-14 84 16)' }), ellipse(94, 18, 5, 14, P.stone, { t: 'rotate(16 94 18)' }),
      path('M80 30Q88 24 96 30L112 46Q112 56 102 56L86 44Z', P.stone), path('M104 44Q114 46 112 52Q108 58 100 54Z', P.paper, { sw: 2 }),
      patch('M78 34Q74 46 70 56L74 58Q78 46 82 36Z', P.slate), dot(92, 36),
    ],
  },
  {
    word: 'CAMEL', meaning: 'a camel with one hump', alt: 'A sandy camel side on, with a big hump, a long curved neck and long legs.',
    draw: () => [
      line('M20 60Q14 70 16 80'),
      legs([26, 36, 60, 70], 66, 38, P.sand, 7), hooves([26, 36, 60, 70], 100, P.wood, 7),
      path('M16 66Q14 48 30 46Q38 22 52 22Q66 22 70 46Q78 50 78 66Q78 74 70 74H22Q16 74 16 66Z', P.sand),
      path('M70 56Q86 54 88 34Q88 24 96 22Q108 22 112 30L110 38L98 36Q98 62 78 70Z', P.sand),
      poly('96,22 96,14 102,22', P.sand), dot(103, 28),
    ],
  },
  {
    word: 'LLAMA', meaning: 'a llama', alt: 'A fluffy cream llama standing side on, with a woolly body and neck, a long face and tall banana-shaped ears.',
    draw: () => [
      ...[26, 36, 62, 72].map(x => rect(x, 74, 8, 30, 3, P.cream)), ...[26, 36, 62, 72].map(x => rect(x, 100, 8, 6, 2, P.brown)),
      path('M16 70Q8 62 16 54Q14 44 26 44Q32 36 44 42Q54 36 64 42Q76 38 82 48Q94 52 88 64Q94 76 80 78Q70 84 58 78Q46 84 36 78Q20 82 16 70Z', P.cream),
      path('M66 52Q62 44 68 36Q64 26 72 22Q72 14 80 12Q90 10 96 16L106 28Q106 36 96 36L88 34Q92 44 86 50Q90 58 80 60Z', P.cream),
      path('M76 14Q70 -2 78 2Q84 6 82 14ZM88 12Q90 -4 98 0Q98 8 92 14Z', P.cream, { sw: 2, t: 'translate(0 4)' }),
      dot(88, 22), circle(103, 31, 2, P.ink, { ns: true }), path('M100 34Q102 38 98 38', undefined, { sw: 1.5 }),
    ],
  },
  {
    word: 'PANDA', meaning: 'a giant panda', alt: 'A black and white panda sitting and facing you, with black ears, eye patches, arms and legs.',
    draw: () => [
      ellipse(36, 100, 14, 10, P.charcoal), ellipse(84, 100, 14, 10, P.charcoal),
      path('M30 98Q22 62 60 60Q98 62 90 98Z', P.paper),
      path('M34 68Q20 80 30 92Q40 90 44 72Z', P.charcoal), path('M86 68Q100 80 90 92Q80 90 76 72Z', P.charcoal),
      circle(36, 22, 10, P.charcoal), circle(84, 22, 10, P.charcoal),
      circle(60, 42, 26, P.paper),
      ellipse(48, 40, 7, 9, P.charcoal, { ns: true, t: 'rotate(30 48 40)' }), ellipse(72, 40, 7, 9, P.charcoal, { ns: true, t: 'rotate(-30 72 40)' }),
      circle(49, 39, 2.4, P.paper, { ns: true }), circle(71, 39, 2.4, P.paper, { ns: true }),
      ellipse(60, 52, 5, 3.5, P.charcoal, { ns: true }), line('M54 58Q60 62 66 58', { sw: 2 }),
    ],
  },
  {
    word: 'SNAKE', meaning: 'a snake', alt: 'A long green snake in an S-shaped curve, with a forked red tongue.',
    draw: () => [
      line('M98 30L110 26M98 30L110 34', { stroke: P.red, sw: 2.5 }),
      path('M12 98Q20 108 36 98Q50 88 40 76Q30 62 50 54Q70 48 62 34Q58 24 74 22H86', undefined, { stroke: P.ink, sw: 17 }),
      path('M12 98Q20 108 36 98Q50 88 40 76Q30 62 50 54Q70 48 62 34Q58 24 74 22H86', undefined, { stroke: P.leaf, sw: 11 }),
      ellipse(88, 28, 14, 10, P.leaf), line('M24 102l4-6M40 86l-6-2M44 60l2 6M62 44l-6-2', { stroke: P.forest, sw: 3 }), dot(90, 24),
    ],
  },
  {
    word: 'LIZARD', meaning: 'a lizard such as a gecko', alt: 'A green lizard seen from above, with four splayed legs and a long curling tail.',
    draw: () => [
      path('M60 76Q58 96 70 104Q86 110 92 98', undefined, { stroke: P.ink, sw: 11 }), path('M60 76Q58 96 70 104Q86 110 92 98', undefined, { stroke: P.leaf, sw: 5 }),
      line('M50 46L34 38L28 28M70 46L86 38L92 28M52 68L36 78L30 90M68 68L84 78L90 90', { stroke: P.ink, sw: 9 }),
      line('M50 46L34 38L28 28M70 46L86 38L92 28M52 68L36 78L30 90M68 68L84 78L90 90', { stroke: P.leaf, sw: 3 }),
      ellipse(60, 58, 13, 22, P.leaf), ellipse(60, 28, 11, 14, P.leaf), eyes(54, 24, 66, 24, 2.6),
      circle(28, 26, 3, P.leaf, { sw: 2 }), circle(92, 26, 3, P.leaf, { sw: 2 }), circle(29, 92, 3, P.leaf, { sw: 2 }), circle(91, 92, 3, P.leaf, { sw: 2 }),
      line('M60 46V70', { stroke: P.forest, sw: 2 }),
    ],
  },
  {
    word: 'FOX', meaning: 'a red fox', alt: 'An orange fox side on, with pointed ears, a white chest and a big bushy tail with a white tip.',
    draw: () => [
      path('M30 64Q6 74 6 52Q6 34 18 32Q16 50 34 58Z', P.orange), path('M6 52Q6 34 18 32Q12 42 13 50Z', P.paper),
      legs([32, 64], 72, 26, P.charcoal, 7), legs([40, 72], 72, 26, P.orange, 7), rect(40, 92, 7, 6, 2, P.charcoal), rect(72, 92, 7, 6, 2, P.charcoal),
      ellipse(52, 64, 28, 14, P.orange),
      path('M68 56Q74 66 72 76Q64 74 62 62Z', P.paper, { sw: 2 }),
      poly('70,38 72,14 84,32', P.orange), poly('82,34 94,14 96,40', P.orange),
      path('M68 48Q68 32 82 32Q94 32 98 40L110 52Q106 58 98 58Q84 62 74 58Q68 54 68 48Z', P.orange),
      path('M78 52Q92 48 110 52Q106 58 98 58Q84 62 74 58Z', P.paper, { sw: 2 }), circle(110, 52, 3.2, P.ink, { ns: true }), dot(86, 42),
    ],
  },
  {
    word: 'SWAN', meaning: 'a swan', alt: 'A white swan gliding on blue water, with a long S-curved neck and an orange beak with a black knob.',
    draw: () => [
      path('M4 100Q20 94 36 100Q52 106 68 100Q84 94 100 100Q110 104 116 100V108H4Z', P.blue),
      path('M14 64Q26 72 42 72H62Q60 58 52 44Q42 24 56 14Q72 6 82 20Q86 28 80 30Q74 22 66 24Q58 30 66 46Q76 64 80 72Q96 68 104 58Q112 76 98 92Q86 100 58 100Q26 98 14 64Z', P.paper),
      line('M34 82Q54 74 70 86', { sw: 2 }),
      path('M82 20L100 28L84 32Z', P.orange), path('M78 16Q84 18 84 26L78 26Z', P.charcoal), dot(74, 18, 2.2),
    ],
  },
  {
    word: 'TURKEY', meaning: 'a turkey, the bird', otherMeaning: 'the country Turkey', alt: 'A brown turkey facing you, with a big fan of tail feathers in bands of colour and a red wattle.',
    draw: () => [
      path('M60 76L14 64Q10 30 32 16Q48 6 60 6Q72 6 88 16Q110 30 106 64Z', P.orange),
      path('M60 76L22 62Q20 36 38 24Q50 16 60 16Q70 16 82 24Q100 36 98 62Z', P.gold),
      path('M60 76L32 58Q32 40 44 32Q52 26 60 26Q68 26 76 32Q88 40 88 58Z', P.red),
      line('M60 76L28 30M60 76L60 10M60 76L92 30', { sw: 2 }),
      ellipse(60, 80, 24, 22, P.brown), line('M52 100v8M68 100v8', { stroke: P.orange, sw: 4 }),
      circle(60, 50, 11, P.wood), path('M62 56Q68 66 62 70Q58 66 62 56Z', P.red, { sw: 2 }), poly('56,52 64,52 60,58', P.yellow, { sw: 2 }), eyes(55, 46, 65, 46, 2.2),
    ],
  },
  {
    word: 'TOUCAN', meaning: 'a toucan', alt: 'A black toucan perched side on, with a white chest and a huge orange and yellow beak.',
    draw: () => [
      line('M18 100H94', { stroke: P.brown, sw: 7 }), line('M18 100H94'),
      path('M34 92L22 116L36 112L44 94Z', P.charcoal),
      path('M30 90Q22 56 40 40Q56 28 64 44Q70 60 62 80Q56 96 40 96Z', P.charcoal),
      path('M56 40Q66 52 60 72Q54 64 50 50Z', P.paper, { sw: 2 }),
      path('M58 36Q76 24 104 34Q114 40 110 46Q90 44 62 52Z', P.orange), path('M62 52Q90 44 110 46Q104 56 82 56Q70 56 62 52Z', P.yellow),
      circle(54, 38, 4.5, P.sky, { sw: 2 }), dot(54, 38, 2), line('M44 96v6M52 96v6', { stroke: P.slate, sw: 3 }),
    ],
  },
  {
    word: 'BEETLE', meaning: 'a beetle', alt: 'A shiny green beetle seen from above, with a split shell, six legs and two feelers.',
    draw: () => [
      line('M44 52L26 44L20 32M42 66L22 66L12 74M46 80L30 92L28 106M76 52L94 44L100 32M78 66L98 66L108 74M74 80L90 92L92 106'),
      line('M54 26Q48 14 40 10M66 26Q72 14 80 10'),
      path('M60 40Q36 40 36 70Q36 100 60 104Q84 100 84 70Q84 40 60 40Z', P.forest),
      path('M60 40V104', undefined), patch('M46 50Q42 60 44 70L48 70Q48 58 52 50Z', P.mint),
      path('M48 26Q48 18 60 18Q72 18 72 26L72 40H48Z', P.charcoal), eyes(54, 26, 66, 26, 2.2),
    ],
  },
  {
    word: 'FLY', meaning: 'a housefly', otherMeaning: 'to fly through the air', alt: 'A grey housefly seen from above, with two clear wings and big red eyes.',
    draw: () => [
      ellipse(38, 52, 26, 13, P.sky, { t: 'rotate(-30 38 52)' }), ellipse(82, 52, 26, 13, P.sky, { t: 'rotate(30 82 52)' }),
      line('M30 54L46 58M90 54L74 58', { sw: 2 }),
      line('M50 66L34 74L28 90M50 74L38 88L38 104M70 66L86 74L92 90M70 74L82 88L82 104', { sw: 3 }),
      ellipse(60, 76, 13, 24, P.slate), line('M48 72H72M48 82H72M50 92H70', { sw: 2 }),
      circle(60, 40, 13, P.slate), circle(51, 36, 8, P.red, { sw: 2 }), circle(69, 36, 8, P.red, { sw: 2 }),
    ],
  },
  {
    word: 'WALRUS', meaning: 'a walrus', alt: 'A big brown walrus lying on its belly, its head up, with a bushy whiskered snout, two very long white tusks and flippers.',
    draw: () => [
      path('M6 86L2 72L4 96ZM6 86L4 104L18 96Z', P.brown),
      path('M8 96Q6 66 36 58Q56 52 64 36Q74 18 92 20Q112 24 112 48Q112 66 98 74Q90 92 66 98H12Z', P.wood),
      path('M58 92L48 110L74 102Z', P.brown),
      path('M78 64L74 112H82L86 66ZM96 64L100 110H108L102 62Z', P.paper),
      path('M70 56Q72 44 88 46Q104 44 110 56Q110 70 90 70Q70 70 70 56Z', P.cream), line('M76 54l-10-4M76 60l-10 2M104 54l8-6M106 60l8 0', { sw: 2 }),
      circle(86, 54, 1.6, P.brown, { ns: true }), circle(94, 54, 1.6, P.brown, { ns: true }), dot(84, 34), dot(100, 34),
    ],
  },
  {
    word: 'KOALA', meaning: 'a koala', alt: 'A grey koala face with big round fluffy ears and a large dark nose.',
    draw: () => [
      circle(26, 42, 20, P.stone), circle(94, 42, 20, P.stone), circle(26, 44, 11, P.paper, { ns: true }), circle(94, 44, 11, P.paper, { ns: true }),
      ellipse(60, 66, 36, 34, P.stone),
      path('M52 56Q52 48 60 48Q68 48 68 56L68 74Q68 82 60 82Q52 82 52 74Z', P.charcoal),
      eyes(42, 60, 78, 60, 3.2), line('M52 92Q60 96 68 92', { sw: 2 }),
    ],
  },
  {
    word: 'SKUNK', meaning: 'a skunk', alt: 'A black skunk side on, with a white stripe and a big fluffy tail held up high.',
    draw: () => [
      path('M30 74Q4 70 8 40Q10 16 34 14Q48 16 46 30Q40 26 32 30Q24 40 34 54Q40 64 40 72Z', P.charcoal),
      path('M14 52Q12 30 30 22Q38 20 40 26Q28 28 24 40Q22 50 26 58Z', P.paper, { ns: true }),
      legs([40, 70], 80, 18, P.charcoal, 8),
      ellipse(60, 74, 28, 16, P.charcoal),
      patch('M38 62Q60 54 86 64L84 68Q60 60 40 68Z', P.paper),
      path('M82 66Q84 52 98 52Q106 54 112 66Q110 74 100 76Q88 78 82 66Z', P.charcoal), circle(91, 52, 5, P.charcoal),
      patch('M90 56L104 66L100 68Z', P.paper), dot(98, 61, 0.1), circle(97, 62, 2.6, P.paper, { ns: true }), circle(112, 67, 2.6, P.pink, { ns: true }),
    ],
  },
  {
    word: 'BEAVER', meaning: 'a beaver', alt: 'A brown beaver side on, with big front teeth and a flat criss-cross tail.',
    draw: () => [
      path('M30 78L4 70Q2 82 8 90L30 88Z', P.charcoal), line('M10 76L22 84M8 84L18 80M16 74L26 78', { stroke: P.slate, sw: 2 }),
      path('M26 92Q22 54 56 50Q86 48 94 70Q96 92 86 94Z', P.brown),
      circle(88, 56, 17, P.brown), circle(78, 42, 5, P.brown), ellipse(100, 64, 8, 7, P.wood),
      rect(96, 68, 7, 9, 1.5, P.paper, { sw: 2 }), circle(105, 59, 2.8, P.ink, { ns: true }), dot(92, 52),
      ellipse(44, 94, 9, 5, P.brown), ellipse(76, 94, 9, 5, P.brown),
    ],
  },
  {
    word: 'MOOSE', meaning: 'a moose', alt: 'A dark brown moose head and shoulders, with huge wide flat antlers and a long nose.',
    draw: () => [
      path('M40 34Q22 36 8 24Q6 34 14 40Q4 42 6 48Q22 52 40 46Z', P.sand), path('M80 34Q98 36 112 24Q114 34 106 40Q116 42 114 48Q98 52 80 46Z', P.sand),
      line('M10 28L14 20M22 34L24 24M32 36L34 26M110 28L106 20M98 34L96 24M88 36L86 26', { sw: 3 }),
      path('M30 108Q30 70 44 50H76Q90 70 90 108Z', P.brown),
      path('M44 40Q44 30 60 30Q76 30 76 40L74 82Q74 96 60 96Q46 96 46 82Z', P.brown),
      ellipse(60, 86, 15, 12, P.wood), dot(54, 86, 2.2), dot(66, 86, 2.2),
      path('M38 44L30 38L40 52Z', P.brown), path('M82 44L90 38L80 52Z', P.brown), eyes(50, 50, 70, 50, 3),
    ],
  },
  {
    word: 'NEST', meaning: 'a bird nest', alt: 'A round woven brown bird nest holding three pale blue eggs.',
    draw: () => [
      ellipse(42, 58, 12, 15, P.sky), ellipse(60, 54, 12, 15, P.sky), ellipse(78, 58, 12, 15, P.sky),
      path('M10 64Q12 98 60 100Q108 98 110 64Q86 74 60 74Q34 74 10 64Z', P.wood),
      line('M16 70Q40 86 72 80M22 84Q50 96 92 82M40 74Q66 92 104 72M30 92Q60 92 80 96', { stroke: P.brown, sw: 2.5 }),
      path('M10 64Q34 74 60 74Q86 74 110 64', undefined),
    ],
  },
  {
    word: 'FEATHER', meaning: 'a bird feather', alt: 'A single long red and orange bird feather lying on a slant, with a hollow white quill and little splits along its edges.',
    draw: () => [
      path('M28 90Q16 60 40 34Q60 14 104 8Q100 30 88 50L96 52Q82 70 70 74L76 80Q56 92 28 90Z', P.red),
      path('M34 86Q30 62 50 40L60 46Q48 66 46 84Z', P.orange, { ns: true }),
      line('M14 106L28 92Q58 54 100 12', { stroke: P.ink, sw: 7 }), line('M14 106L28 92Q58 54 100 12', { stroke: P.paper, sw: 2.5 }),
      line('M44 70L36 62M58 52L50 42M74 36L68 24M60 66L72 70M72 50L86 52', { sw: 2 }),
    ],
  },
  {
    word: 'PAW', meaning: 'an animal paw print', alt: 'A brown paw print: one big round pad and four small toe pads above it.',
    draw: () => [
      path('M60 58Q76 58 86 76Q94 92 82 98Q72 102 60 96Q48 102 38 98Q26 92 34 76Q44 58 60 58Z', P.brown),
      ellipse(30, 52, 9, 12, P.brown, { t: 'rotate(-20 30 52)' }), ellipse(48, 32, 10, 13, P.brown, { t: 'rotate(-6 48 32)' }),
      ellipse(72, 32, 10, 13, P.brown, { t: 'rotate(6 72 32)' }), ellipse(90, 52, 9, 12, P.brown, { t: 'rotate(20 90 52)' }),
    ],
  },
];
