import { P, circle, ellipse, rect, path, line, poly, patch, dot, eyes, group, ring } from '../style.mjs';

export default [
  {
    word: 'FISH', meaning: 'a fish', alt: 'A light blue fish swimming side on, with a coral tail and fin.', basedOn: 'content/library/art/fish-gills.svg',
    draw: () => [
      group({ t: 'translate(-8 -6) scale(1.1)' },
        path('M58 44Q66 30 76 44Z', P.coral),
        path('M23 61q25-36 65 0-40 36-65 0Z', P.sky), path('m88 61 21-20v40Z', P.coral),
        dot(37, 56, 2.6), line('M49 48q-7 13 0 26', { sw: 2 })),
    ],
  },
  {
    word: 'CRAB', meaning: 'a crab', alt: 'A red-orange crab seen from above, with two big claws and jointed legs.', basedOn: 'content/library/art/crab-shells.svg',
    draw: () => [
      group({ t: 'translate(-6 -8) scale(1.1)' },
        line('m36 65-18-9m18 17-18 5m25 4-15 15m55-32 18-9m-18 17 18 5m-25 4 15 15M40 47 29 29m51 18 11-18'),
        path('m16 22 13 7 6-14Q20 8 16 22Zm88 0-13 7-6-14Q100 8 104 22Z', P.red),
        ellipse(60, 65, 28, 20, P.red), dot(50, 55, 2.4), dot(70, 55, 2.4)),
    ],
  },
  {
    word: 'SHARK', meaning: 'a shark', alt: 'A grey shark swimming side on, with a tall fin on its back, a white belly and gill slits.',
    draw: () => [
      path('M58 40L66 14Q72 20 76 42Z', P.slate), path('M24 62L6 40Q8 60 6 84Z', P.slate),
      path('M20 62Q40 40 76 40Q104 42 114 60Q104 74 76 78Q40 82 20 62Z', P.stone),
      path('M50 72Q76 80 106 66Q100 76 76 78Q60 80 50 72Z', P.paper, { ns: true }),
      path('M60 76L52 92L70 78Z', P.slate), line('M82 50v12M88 50v12M94 51v10', { sw: 2 }), dot(100, 54),
      line('M96 68Q104 70 110 64', { sw: 2 }),
    ],
  },
  {
    word: 'WHALE', meaning: 'a whale', alt: 'A big blue whale with a pale belly, its tail raised and a spout of water from its head.',
    draw: () => [
      line('M78 26Q72 12 64 10M78 26Q80 10 92 8M78 26V12', { stroke: P.sky, sw: 4 }),
      path('M20 72Q10 56 4 40Q16 44 22 54Q24 42 32 36Q32 54 30 66Z', P.blue),
      path('M24 70Q30 36 72 34Q112 34 114 70Q112 96 70 96Q32 96 24 70Z', P.blue),
      path('M44 86Q72 98 108 80Q100 94 70 96Q52 96 44 86Z', P.sky, { ns: true }), path('M44 86Q72 98 108 80', undefined, { sw: 2 }),
      dot(94, 62), line('M98 74Q104 76 110 72', { sw: 2 }),
    ],
  },
  {
    word: 'DOLPHIN', meaning: 'a dolphin', alt: 'A grey-blue dolphin leaping in an arc, with a long snout, a back fin and a smile.',
    draw: () => [
      path('M30 86L8 82L16 98ZM30 86L22 104L34 96Z', P.sea),
      path('M30 86Q34 46 70 34Q88 30 98 40L114 46Q114 52 104 54Q90 54 82 60Q60 76 40 92Z', P.sea),
      path('M54 40L60 22L70 34Z', P.sea), path('M60 70L52 82L68 72Z', P.sea),
      path('M40 86Q62 64 82 58Q92 54 104 54Q90 60 78 66Q60 76 46 92Z', P.sky, { ns: true }),
      dot(92, 44), line('M100 52Q106 52 112 50', { sw: 2 }),
    ],
  },
  {
    word: 'OCTOPUS', meaning: 'an octopus', alt: 'A purple octopus with a round head, two eyes and eight curling arms.',
    draw: () => [
      line('M38 66Q20 76 16 94Q14 104 22 104M48 72Q38 90 40 104M60 74Q60 92 58 106M72 72Q82 90 80 104M82 66Q100 76 104 94Q106 104 98 104M32 60Q12 60 8 76', { stroke: P.ink, sw: 12 }),
      line('M38 66Q20 76 16 94Q14 104 22 104M48 72Q38 90 40 104M60 74Q60 92 58 106M72 72Q82 90 80 104M82 66Q100 76 104 94Q106 104 98 104M32 60Q12 60 8 76', { stroke: P.purple, sw: 6 }),
      path('M28 50Q26 14 60 12Q94 14 92 50Q92 72 60 74Q28 72 28 50Z', P.purple),
      circle(48, 50, 7, P.paper, { sw: 2 }), circle(72, 50, 7, P.paper, { sw: 2 }), eyes(49, 51, 73, 51, 3.4),
      patch('M42 24Q50 18 58 20Q48 26 44 34Z', P.pink),
    ],
  },
  {
    word: 'JELLYFISH', meaning: 'a jellyfish', alt: 'A pink jellyfish with a soft round bell and long wavy tentacles hanging below.', basedOn: 'content/library/art/jellyfish-move.svg',
    draw: () => [
      group({ t: 'translate(0 -2)' },
        line('M41 63q-14 21 1 40m17-40q17 20 0 43m18-43q-13 19 3 37', { stroke: P.purple, sw: 4 }), line('M50 63q4 16-2 30M68 63q-4 16 2 28', { sw: 2 }),
        path('M25 57q1-48 35-48t35 48q-9 12-18 0-10 12-18 0-9 12-17 0-9 10-17 0Z', P.pink),
        patch('M38 26Q46 16 56 16Q46 24 42 36Z', P.paper)),
    ],
  },
  {
    word: 'STARFISH', meaning: 'a starfish (sea star)', alt: 'An orange starfish with five rounded arms covered in little bumps.',
    draw: () => [
      path('M60 8Q66 8 68 30Q72 44 90 40Q112 36 112 44Q112 50 92 60Q80 68 88 84Q98 104 92 108Q86 112 72 94Q62 82 50 94Q36 112 28 108Q22 104 32 84Q40 68 28 60Q8 50 8 44Q8 36 30 40Q48 44 52 30Q54 8 60 8Z', P.orange),
      circle(60, 58, 3, P.gold, { sw: 2 }), circle(60, 32, 2.6, P.gold, { ns: true }), circle(60, 44, 2.6, P.gold, { ns: true }),
      circle(84, 52, 2.6, P.gold, { ns: true }), circle(96, 48, 2.6, P.gold, { ns: true }), circle(36, 52, 2.6, P.gold, { ns: true }), circle(24, 48, 2.6, P.gold, { ns: true }),
      circle(72, 76, 2.6, P.gold, { ns: true }), circle(80, 90, 2.6, P.gold, { ns: true }), circle(48, 76, 2.6, P.gold, { ns: true }), circle(40, 90, 2.6, P.gold, { ns: true }),
    ],
  },
  {
    word: 'SHELL', meaning: 'a seashell', alt: 'A pink fan-shaped seashell with ridges spreading out from its base.',
    draw: () => [
      path('M44 92L40 104H80L76 92Z', P.pink),
      path('M60 98L44 92Q10 80 12 52Q16 18 60 14Q104 18 108 52Q110 80 76 92Z', P.pink),
      line('M60 98L28 34M60 98L44 22M60 98V16M60 98L76 22M60 98L92 34M60 98L18 56M60 98L102 56', { sw: 2 }),
    ],
  },
  {
    word: 'CORAL', meaning: 'branching coral', alt: 'A coral-coloured branching coral growing up from a small rock, with rounded tips.',
    draw: () => [
      path('M30 108Q30 96 60 96Q90 96 90 108Z', P.stone),
      line('M60 98V58M60 72L40 54L36 30M40 54L22 42M60 58L50 32L54 14M60 58L76 34L80 14M76 34L92 22M60 80L86 62L100 46M86 62L98 68', { stroke: P.ink, sw: 13 }),
      line('M60 98V58M60 72L40 54L36 30M40 54L22 42M60 58L50 32L54 14M60 58L76 34L80 14M76 34L92 22M60 80L86 62L100 46M86 62L98 68', { stroke: P.coral, sw: 7 }),
    ],
  },
  {
    word: 'LOBSTER', meaning: 'a lobster', alt: 'A red lobster seen from above, with two big claws, long feelers and a fan tail.',
    draw: () => [
      line('M54 30Q40 10 24 6M66 30Q80 10 96 6', { sw: 2 }),
      line('M50 40L34 40M70 40L86 40', { sw: 3 }), line('M48 56L32 62M72 56L88 62M48 64L34 72M72 64L86 72', { sw: 3 }),
      path('M34 40Q16 40 14 24Q14 14 22 18L26 28L30 18Q38 22 38 34Z', P.red), path('M86 40Q104 40 106 24Q106 14 98 18L94 28L90 18Q82 22 82 34Z', P.red),
      path('M48 38Q48 28 60 28Q72 28 72 38L72 60Q70 66 60 66Q50 66 48 60Z', P.red),
      path('M50 64H70L68 74H52ZM52 74H68L66 84H54ZM54 84H66L64 92H56Z', P.red),
      path('M56 92L44 108H76L64 92Z', P.red), line('M60 94V106M52 98L50 106M68 98L70 106', { sw: 2 }), eyes(55, 34, 65, 34, 2.4),
    ],
  },
  {
    word: 'SHRIMP', meaning: 'a shrimp', alt: 'A pink shrimp curled into a C shape, with a fan tail, thin legs and long feelers.',
    draw: () => [
      line('M86 36Q100 16 112 12M84 34Q92 14 102 6', { sw: 2 }),
      line('M66 70l-4 12M58 66l-8 10M74 72l2 12', { sw: 2 }),
      path('M84 34Q100 40 98 58Q94 80 70 86Q46 90 32 74Q22 62 30 50Q36 60 48 64Q66 68 74 56Q78 48 72 42Z', P.pink),
      line('M86 52L76 52M80 66L70 60M64 76L60 66M48 76L48 66', { sw: 2 }),
      path('M30 50L14 40L16 56L30 54Z', P.pink), path('M30 50L22 32L36 42Z', P.pink), path('M72 42Q76 30 86 30Q94 34 84 34Z', P.pink), dot(84, 38, 2.4),
    ],
  },
  {
    word: 'URCHIN', meaning: 'a sea urchin', alt: 'A round dark purple sea urchin covered all over in long sharp spines.',
    draw: () => [
      line('M60 60L60 8M60 60L86 15M60 60L105 34M60 60L112 60M60 60L105 86M60 60L86 105M60 60L60 112M60 60L34 105M60 60L15 86M60 60L8 60M60 60L15 34M60 60L34 15M60 60L73 10M60 60L96 24M60 60L110 47M60 60L110 73M60 60L96 96M60 60L73 110M60 60L47 110M60 60L24 96M60 60L10 73M60 60L10 47M60 60L24 24M60 60L47 10', { sw: 2.5 }),
      circle(60, 60, 30, P.purple), circle(60, 60, 5, P.pink, { sw: 2 }), patch('M44 44Q50 38 58 38Q50 44 48 52Z', P.pink),
    ],
  },
  {
    word: 'EEL', meaning: 'an eel', alt: 'A long green eel swimming in a wave shape, with a fin along its back and an open mouth.',
    draw: () => [
      path('M10 86Q24 66 40 80Q56 94 72 74Q86 56 96 40', undefined, { stroke: P.ink, sw: 21 }),
      path('M10 86Q24 66 40 80Q56 94 72 74Q86 56 96 40', undefined, { stroke: P.forest, sw: 15 }),
      line('M14 78Q24 60 40 72Q56 86 70 66Q80 50 88 40', { stroke: P.mint, sw: 3 }),
      path('M90 30Q104 22 112 30L104 36L112 42Q102 50 92 46Z', P.forest), dot(98, 32, 2.6),
      circle(112, 14, 3, P.sky, { sw: 2 }), circle(104, 6, 2, P.sky, { sw: 2 }),
    ],
  },
  {
    word: 'SEAL', meaning: 'a seal, the sea animal', otherMeaning: 'a stamp or a closure', alt: 'A grey seal lying on its belly with its head up, whiskers and two flippers.',
    draw: () => [
      path('M14 92L4 82L6 100ZM14 92L8 108L20 100Z', P.slate),
      path('M14 96Q20 80 50 78Q66 76 72 56Q74 34 90 30Q108 30 110 46Q110 58 100 60Q90 64 90 76Q90 96 70 100H20Z', P.stone),
      path('M56 96L44 108H66Z', P.slate), ellipse(104, 52, 8, 6, P.paper, { sw: 2 }), circle(110, 50, 2.6, P.ink, { ns: true }),
      dot(92, 42), line('M100 56l12 4M100 52l12-2', { sw: 2 }),
    ],
  },
  {
    word: 'TURTLE', meaning: 'a sea turtle', alt: 'A green sea turtle seen from above, with a patterned shell, four flippers and its head poking out.',
    draw: () => [
      path('M38 40Q16 22 10 34Q16 46 36 52Z', P.leaf), path('M82 40Q104 22 110 34Q104 46 84 52Z', P.leaf),
      path('M40 84Q24 98 26 108Q36 104 46 90Z', P.leaf), path('M80 84Q96 98 94 108Q84 104 74 90Z', P.leaf),
      ellipse(60, 18, 11, 12, P.leaf), eyes(55, 15, 65, 15, 2.2),
      ellipse(60, 62, 30, 36, P.forest), poly(ring(60, 62, 13, 6, 0), P.leaf, { sw: 2 }),
      line('M60 49V27M60 75V97M71 55L86 46M71 69L86 78M49 55L34 46M49 69L34 78', { sw: 2 }),
    ],
  },
  {
    word: 'CLAM', meaning: 'a clam', alt: 'A clam shell, slightly open, with ridged pale shells and a white inside.',
    draw: () => [
      path('M14 64Q20 102 60 104Q100 102 106 64Z', P.sand),
      line('M30 70Q32 92 44 100M46 68Q46 92 54 104M74 68Q74 92 66 104M90 70Q88 92 76 100', { sw: 2 }),
      path('M14 64Q24 74 60 74Q96 74 106 64Q96 70 60 70Q24 70 14 64Z', P.paper, { sw: 2 }),
      path('M14 60Q16 18 60 16Q104 18 106 60Q96 66 60 66Q24 66 14 60Z', P.sand),
      line('M30 56Q30 34 42 22M46 62Q44 36 52 18M74 62Q76 36 68 18M90 56Q90 34 78 22', { sw: 2 }),
    ],
  },
  {
    word: 'GULL', meaning: 'a seagull', alt: 'A white seagull standing side on, with grey wings and a yellow beak.',
    draw: () => [
      line('M54 88V106M66 88V106', { stroke: P.orange, sw: 3 }), path('M50 106h8M62 106h8', undefined, { stroke: P.orange, sw: 3 }),
      path('M30 70L8 62L14 78Z', P.charcoal),
      path('M24 68Q30 44 64 46Q90 48 88 72Q86 92 60 92Q32 92 24 68Z', P.paper),
      path('M26 64Q44 50 74 58Q66 78 40 78Q28 74 26 64Z', P.stone), line('M30 70Q46 70 60 64', { sw: 2 }),
      circle(84, 36, 15, P.paper), path('M96 36L112 40L96 44Z', P.yellow), circle(104, 42, 1.8, P.red, { ns: true }), dot(88, 32),
    ],
  },
  {
    word: 'WAVE', meaning: 'an ocean wave', otherMeaning: 'to wave your hand', alt: 'A big blue ocean wave curling over, with white foam on its crest.',
    draw: () => [
      path('M6 104Q8 64 34 36Q62 10 92 18Q112 26 110 44Q106 58 92 56Q80 54 84 42Q70 38 62 50Q52 66 60 82Q66 96 84 104Z', P.blue),
      path('M6 104Q10 74 30 56Q24 80 34 104Z', P.sky, { ns: true }),
      path('M92 18Q112 26 110 44Q106 58 92 56Q80 54 84 42Q94 46 98 38Q100 28 86 24Q74 22 66 26Q76 16 92 18Z', P.paper),
      line('M6 104H114'),
    ],
  },
  {
    word: 'BEACH', meaning: 'a sandy beach', alt: 'A sandy beach meeting blue sea, with a small palm tree on the sand.',
    draw: () => [
      rect(8, 16, 104, 88, 18, P.sky, { ns: true }),
      path('M8 60Q30 54 60 60Q90 66 112 60V86Q112 104 94 104H26Q8 104 8 86Z', P.blue, { ns: true }),
      path('M8 84Q40 66 112 78V86Q112 104 94 104H26Q8 104 8 86Z', P.sand, { ns: true }),
      line('M18 64q6-3 12 0M64 66q6-3 12 0', { stroke: P.paper, sw: 2.5 }),
      line('M80 92Q82 66 74 46', { stroke: P.brown, sw: 5 }), line('M80 92Q82 66 74 46', { sw: 2 }),
      path('M74 46Q60 36 50 44Q62 42 74 46Q70 30 56 28Q70 32 74 46Q84 30 98 32Q84 36 74 46Q90 42 98 54Q86 44 74 46Z', P.leaf, { sw: 2 }),
      circle(30, 32, 8, P.yellow, { sw: 2 }), rect(8, 16, 104, 88, 18),
    ],
  },
  {
    word: 'BUCKET', meaning: 'a beach bucket (pail)', alt: 'A red plastic bucket with a curved handle.',
    draw: () => [
      path('M22 44Q22 6 60 6Q98 6 98 44', undefined, { stroke: P.ink, sw: 7 }), path('M22 44Q22 6 60 6Q98 6 98 44', undefined, { stroke: P.yellow, sw: 3 }),
      path('M18 40H102L92 106Q90 112 80 112H40Q30 112 28 106Z', P.red),
      ellipse(60, 40, 42, 9, P.red), ellipse(60, 40, 36, 6, P.brown, { ns: true }), line('M24 58H96', { stroke: P.paper, sw: 4 }),
    ],
  },
  {
    word: 'UMBRELLA', meaning: 'an umbrella', alt: 'An open umbrella with red and white panels and a curved handle.',
    draw: () => [
      line('M60 26V96Q60 108 50 108Q42 108 42 100', { stroke: P.ink, sw: 7 }), line('M60 26V96Q60 108 50 108Q42 108 42 100', { stroke: P.brown, sw: 3 }),
      path('M8 62Q10 18 60 14Q110 18 112 62Q100 54 86 62Q74 54 60 62Q46 54 34 62Q20 54 8 62Z', P.red),
      path('M34 62Q36 30 60 14Q46 30 46 58Q40 56 34 62ZM86 62Q84 30 60 14Q74 30 74 58Q80 56 86 62Z', P.paper, { sw: 2 }),
      line('M60 14V8'),
    ],
  },
  {
    word: 'ISLAND', meaning: 'a small island', alt: 'A small sandy island in blue water, with one palm tree.',
    draw: () => [
      path('M6 90Q20 84 34 90Q48 96 60 90Q72 84 86 90Q100 96 114 90V100Q100 106 86 100Q72 94 60 100Q48 106 34 100Q20 94 6 100Z', P.blue),
      path('M14 88Q24 62 60 62Q96 62 106 88Z', P.sand),
      line('M58 66Q60 40 50 22', { stroke: P.brown, sw: 6 }), line('M58 66Q60 40 50 22', { sw: 2 }),
      path('M50 22Q34 10 20 20Q36 18 50 22Q44 4 28 2Q46 8 50 22Q60 4 78 6Q60 10 50 22Q70 14 86 26Q66 20 50 22Q62 26 66 40Q56 30 50 22Z', P.leaf, { sw: 2 }),
      circle(48, 26, 4, P.brown, { sw: 2 }), circle(55, 27, 4, P.brown, { sw: 2 }),
    ],
  },
  {
    word: 'NET', meaning: 'a fishing net on a handle', alt: 'A hand net: a round frame with a criss-cross mesh bag and a long wooden handle.',
    draw: () => [
      line('M60 64L108 112', { stroke: P.ink, sw: 9 }), line('M60 64L108 112', { stroke: P.wood, sw: 4 }),
      path('M18 26Q8 70 40 76Q66 76 62 52Z', P.paper, { sw: 2 }),
      line('M16 38L54 68M14 52L40 74M24 30L62 58M34 26L62 46M24 74L28 32M36 76L40 30M50 70L52 34', { stroke: P.slate, sw: 2 }),
      ellipse(40, 39, 25, 14, undefined, { t: 'rotate(35 40 39)', sw: 3 }),
    ],
  },
  {
    word: 'RAFT', meaning: 'a wooden raft', alt: 'A raft made of logs tied side by side, floating on blue water.',
    draw: () => [
      path('M6 92Q20 86 34 92Q48 98 60 92Q72 86 86 92Q100 98 114 92V104H6Z', P.blue),
      line('M60 46V8', { stroke: P.brown, sw: 4 }), path('M62 12L94 40H62Z', P.paper),
      rect(14, 46, 92, 10, 5, P.wood), rect(14, 58, 92, 10, 5, P.wood), rect(14, 70, 92, 10, 5, P.wood), rect(14, 82, 92, 10, 5, P.wood),
      line('M30 44V94M90 44V94', { stroke: P.sand, sw: 4 }), line('M26 44V94M34 44V94M86 44V94M94 44V94', { sw: 2 }),
      circle(19, 51, 2, P.brown, { ns: true }), circle(19, 63, 2, P.brown, { ns: true }), circle(19, 75, 2, P.brown, { ns: true }), circle(19, 87, 2, P.brown, { ns: true }),
    ],
  },
  {
    word: 'ANCHOR', meaning: 'a boat anchor', alt: 'A grey metal anchor with a ring at the top, a cross bar and two curved hooks.',
    draw: () => [
      line('M60 26V100M38 40H82M18 64Q22 100 60 102Q98 100 102 64', { stroke: P.ink, sw: 12 }),
      line('M60 26V100M38 40H82M18 64Q22 100 60 102Q98 100 102 64', { stroke: P.stone, sw: 6 }),
      path('M10 70L18 56L26 70Z', P.stone), path('M94 70L102 56L110 70Z', P.stone),
      circle(60, 16, 10, undefined, { stroke: P.ink, sw: 11 }), circle(60, 16, 10, undefined, { stroke: P.stone, sw: 5 }),
    ],
  },
  {
    word: 'COOLER', meaning: 'a picnic cooler box', alt: 'A blue picnic cooler box with a white lid and a handle on top.',
    draw: () => [
      path('M38 30V22Q38 16 44 16H76Q82 16 82 22V30', undefined, { stroke: P.ink, sw: 9 }), path('M38 30V22Q38 16 44 16H76Q82 16 82 22V30', undefined, { stroke: P.stone, sw: 4 }),
      rect(12, 46, 96, 58, 10, P.blue), rect(8, 30, 104, 20, 8, P.paper),
      rect(20, 60, 18, 8, 3, P.paper, { sw: 2 }), line('M12 92H108', { stroke: P.navy, sw: 3 }),
    ],
  },
  {
    word: 'KAYAK', meaning: 'a kayak', alt: 'An orange kayak boat side on, with a seat opening and a two-ended paddle across it.',
    draw: () => [
      line('M18 34L102 82', { stroke: P.ink, sw: 7 }), line('M18 34L102 82', { stroke: P.stone, sw: 2.5 }),
      path('M8 28L16 22L28 38L20 44Z', P.yellow), path('M112 88L104 94L92 78L100 72Z', P.yellow),
      path('M4 64Q30 82 60 82Q90 82 116 64Q100 92 60 92Q20 92 4 64Z', P.orange),
      path('M4 64Q30 54 60 54Q90 54 116 64Q90 82 60 82Q30 82 4 64Z', P.orange), ellipse(60, 66, 16, 5, P.charcoal),
    ],
  },
  {
    word: 'PADDLE', meaning: 'a canoe paddle', alt: 'A single wooden canoe paddle with a wide flat blade and a T-shaped grip.',
    draw: () => [
      group({ t: 'rotate(35 60 60)' },
        line('M50 6H70M60 6V62', { stroke: P.ink, sw: 9 }), line('M50 6H70M60 6V62', { stroke: P.wood, sw: 4 }),
        path('M60 56Q44 60 44 82Q46 110 60 114Q74 110 76 82Q76 60 60 56Z', P.wood), line('M60 66V102', { stroke: P.brown, sw: 2 })),
    ],
  },
];
