import { P, circle, ellipse, rect, path, line, poly, patch, group } from '../style.mjs';

/** A thick stroke with an ink edge, for handles, poles and wires. */
const rod = (d, fill, w = 7) => [line(d, { stroke: P.ink, sw: w }), line(d, { stroke: fill, sw: w - 4.5 })];
const shine = (x, y, s = 1) => patch(`M${x} ${y}Q${x + 6 * s} ${y - 8 * s} ${x + 14 * s} ${y - 8 * s}Q${x + 6 * s} ${y - 2 * s} ${x + 4 * s} ${y + 8 * s}Z`, P.paper);

export default [
  {
    word: 'HOUSE', meaning: 'a house', alt: 'A small house with a red roof, a chimney, a door and two windows.',
    draw: () => [
      rect(74, 16, 12, 24, 2, P.brown), rect(22, 54, 76, 54, 2, P.cream),
      path('M10 58L60 16L110 58Z', P.red), rect(50, 76, 20, 32, 2, P.wood), circle(65, 92, 1.8, P.ink, { ns: true }),
      rect(28, 66, 16, 16, 2, P.sky), rect(76, 66, 16, 16, 2, P.sky), line('M36 66v16M28 74h16M84 66v16M76 74h16', { sw: 2 }), line('M8 108H112'),
    ],
  },
  {
    word: 'DOOR', meaning: 'a door', alt: 'A brown wooden front door with panels, a round knob and a small window at the top.',
    draw: () => [
      rect(26, 6, 68, 108, 4, P.wood), rect(36, 16, 48, 20, 3, P.sky, { sw: 2 }),
      rect(36, 46, 20, 26, 2, P.sand, { sw: 2 }), rect(64, 46, 20, 26, 2, P.sand, { sw: 2 }), rect(36, 80, 20, 26, 2, P.sand, { sw: 2 }), rect(64, 80, 20, 26, 2, P.sand, { sw: 2 }),
      circle(80, 76, 5, P.gold),
    ],
  },
  {
    word: 'WINDOW', meaning: 'a window', alt: 'An open window with a white frame, four panes of blue sky and curtains at the sides.',
    draw: () => [
      rect(18, 14, 84, 84, 4, P.paper), rect(26, 22, 68, 68, 2, P.sky, { sw: 2 }), line('M60 22V90M26 56H94', { sw: 3 }),
      path('M30 40Q38 34 46 40Q50 32 58 36', undefined, { stroke: P.paper, sw: 3 }),
      path('M10 8H40Q34 40 40 98H24Q14 60 10 8Z', P.coral), path('M110 8H80Q86 40 80 98H96Q106 60 110 8Z', P.coral),
      rect(6, 98, 108, 10, 3, P.wood), line('M8 8H112', { stroke: P.brown, sw: 4 }),
    ],
  },
  {
    word: 'BED', meaning: 'a bed', alt: 'A bed seen from the side, with a headboard, a white pillow and a blue blanket.',
    draw: () => [
      rect(8, 30, 14, 76, 4, P.wood), rect(100, 58, 12, 48, 4, P.wood),
      rect(18, 66, 86, 18, 4, P.paper), ellipse(36, 58, 16, 9, P.paper),
      path('M50 54H100Q106 54 106 62V84H44V62Q44 54 50 54Z', P.blue), line('M54 64H100', { stroke: P.sky, sw: 3 }),
      rect(18, 84, 86, 12, 3, P.brown),
    ],
  },
  {
    word: 'CHAIR', meaning: 'a chair', alt: 'A wooden chair seen from the side, with a tall back, a seat and four legs.',
    draw: () => [
      rect(28, 8, 12, 100, 4, P.wood), rect(30, 20, 8, 30, 3, P.sand, { sw: 2 }),
      rect(28, 56, 66, 12, 4, P.coral), rect(84, 68, 10, 40, 4, P.wood), rect(58, 68, 8, 34, 3, P.brown), rect(28, 68, 10, 40, 4, P.wood),
    ],
  },
  {
    word: 'TABLE', meaning: 'a table', alt: 'A wooden table with a flat top and four legs.',
    draw: () => [
      rect(26, 54, 8, 40, 3, P.brown), rect(86, 54, 8, 40, 3, P.brown),
      path('M6 44H114L104 56H16Z', P.wood), rect(12, 54, 96, 8, 3, P.wood),
      rect(14, 62, 10, 46, 4, P.wood), rect(96, 62, 10, 46, 4, P.wood),
    ],
  },
  {
    word: 'COUCH', meaning: 'a couch (sofa)', alt: 'A soft green couch with a high back, two arms and two seat cushions.',
    draw: () => [
      rect(20, 26, 80, 44, 12, P.leaf), rect(14, 92, 8, 14, 2, P.brown), rect(98, 92, 8, 14, 2, P.brown),
      rect(22, 62, 38, 18, 6, P.mint), rect(60, 62, 38, 18, 6, P.mint),
      rect(6, 50, 22, 44, 10, P.leaf), rect(92, 50, 22, 44, 10, P.leaf), rect(20, 78, 80, 16, 4, P.leaf),
    ],
  },
  {
    word: 'LAMP', meaning: 'a table lamp', alt: 'A table lamp with a wide yellow shade, a thin stand and a round base.',
    draw: () => [
      ...rod('M60 54V100', P.stone), ellipse(60, 104, 26, 7, P.wood),
      path('M38 14H82L100 58H20Z', P.yellow), line('M24 50H96', { stroke: P.gold, sw: 3 }),
      line('M76 60l6 8', { stroke: P.ink, sw: 2 }), circle(83, 70, 2.5, P.gold, { sw: 2 }),
    ],
  },
  {
    word: 'CLOCK', meaning: 'a clock', alt: 'A round wall clock with a white face, hour marks and two hands.',
    draw: () => [
      circle(60, 60, 50, P.red), circle(60, 60, 41, P.paper),
      line('M60 24v8M60 88v8M24 60h8M88 60h8M42 29l3 5M78 29l-3 5M29 42l5 3M91 42l-5 3M29 78l5-3M91 78l-5-3M42 91l3-5M78 91l-3-5', { sw: 2.5 }),
      line('M60 60V34M60 60L80 72', { sw: 3.5 }), circle(60, 60, 4, P.ink, { ns: true }),
    ],
  },
  {
    word: 'CUP', meaning: 'a cup', alt: 'A blue cup with a round handle, sitting on a small saucer.',
    draw: () => [
      ellipse(56, 102, 46, 9, P.paper), path('M88 50Q112 48 110 68Q108 86 84 84', undefined, { stroke: P.ink, sw: 11 }), path('M88 50Q112 48 110 68Q108 86 84 84', undefined, { stroke: P.blue, sw: 5 }),
      path('M18 36H94L86 90Q84 100 74 100H38Q28 100 26 90Z', P.blue), ellipse(56, 36, 38, 8, P.sky),
      line('M30 60H90', { stroke: P.paper, sw: 4 }),
    ],
  },
  {
    word: 'PLATE', meaning: 'a dinner plate', alt: 'A round white plate seen from above, with a blue rim.',
    draw: () => [circle(60, 60, 52, P.blue), circle(60, 60, 42, P.paper), circle(60, 60, 30, undefined, { stroke: P.stone, sw: 2 }), shine(30, 40, 1.1)],
  },
  {
    word: 'BOWL', meaning: 'an empty bowl', alt: 'An empty orange bowl seen from the side, wide at the top with a small foot.',
    draw: () => [
      path('M8 44H112Q110 94 60 96Q10 94 8 44Z', P.orange), ellipse(60, 44, 52, 12, P.cream), path('M44 94L40 104H80L76 94Z', P.orange),
      line('M18 62Q60 76 102 62', { stroke: P.paper, sw: 3 }),
    ],
  },
  {
    word: 'SPOON', meaning: 'a spoon', alt: 'A silver spoon lying on a slant, with a long narrow bowl and a handle that widens to a rounded end.',
    draw: () => [
      group({ t: 'rotate(40 60 60)' },
        path('M57 50Q56 72 51 100Q50 116 60 116Q70 116 69 100Q64 72 63 50Z', P.stone),
        ellipse(60, 28, 16, 26, P.stone), ellipse(60, 30, 10, 19, P.slate, { ns: true }), patch('M54 18Q57 12 61 12Q56 20 56 30Z', P.paper), line('M60 62V100', { stroke: P.paper, sw: 2.5 })),
    ],
  },
  {
    word: 'FORK', meaning: 'a fork', alt: 'A silver fork lying on a slant, with four prongs and a long handle.',
    draw: () => [
      group({ t: 'rotate(40 60 60)' },
        rect(54, 58, 12, 58, 6, P.stone),
        path('M38 6V36Q38 52 54 56H66Q82 52 82 36V6H76V36H70V6H64V36H56V6H50V36H44V6Z', P.stone)),
    ],
  },
  {
    word: 'KNIFE', meaning: 'a table knife', alt: 'A dinner knife lying on a slant, with a rounded silver blade and a brown handle.',
    draw: () => [
      group({ t: 'rotate(40 60 60)' },
        rect(52, 66, 16, 50, 6, P.brown), circle(60, 80, 2.2, P.cream, { ns: true }), circle(60, 100, 2.2, P.cream, { ns: true }),
        path('M54 66V18Q54 4 66 4Q68 30 68 66Z', P.stone), line('M58 14V60', { stroke: P.paper, sw: 2 })),
    ],
  },
  {
    word: 'POT', meaning: 'a cooking pot', alt: 'A big grey cooking pot with a lid, a knob on top and two handles.',
    draw: () => [
      rect(6, 54, 16, 10, 5, P.charcoal), rect(98, 54, 16, 10, 5, P.charcoal),
      path('M18 44H102V96Q102 108 90 108H30Q18 108 18 96Z', P.stone), patch('M90 48h8v52h-8Z', P.slate), path('M18 44H102V96Q102 108 90 108H30Q18 108 18 96Z'),
      path('M12 44Q14 26 60 24Q106 26 108 44Z', P.slate), rect(52, 12, 16, 12, 5, P.charcoal),
    ],
  },
  {
    word: 'PAN', meaning: 'a frying pan', alt: 'A black frying pan seen from above at a slant, with a long handle.',
    draw: () => [
      group({ t: 'rotate(-30 60 60)' },
        rect(70, 54, 46, 12, 6, P.brown), circle(108, 60, 2.4, P.cream, { ns: true }),
        circle(42, 60, 36, P.charcoal), circle(42, 60, 28, P.slate, { sw: 2 }), patch('M24 46Q32 36 44 34Q32 44 30 56Z', P.stone)),
    ],
  },
  {
    word: 'TEAPOT', meaning: 'a teapot', alt: 'A round teapot with a spout on one side, a curved handle on the other and a lid with a knob.',
    draw: () => [
      path('M30 66Q6 64 8 42Q14 32 20 40Q18 54 32 54', undefined, { stroke: P.ink, sw: 12 }), path('M30 66Q6 64 8 42Q14 32 20 40Q18 54 32 54', undefined, { stroke: P.mint, sw: 6 }),
      path('M90 50Q112 50 110 72Q106 90 90 88', undefined, { stroke: P.ink, sw: 11 }), path('M90 50Q112 50 110 72Q106 90 90 88', undefined, { stroke: P.mint, sw: 5 }),
      path('M24 74Q24 36 60 36Q96 36 96 74Q96 104 60 104Q24 104 24 74Z', P.mint),
      path('M40 38Q40 26 60 26Q80 26 80 38Z', P.leaf), circle(60, 20, 6, P.leaf), line('M32 72Q60 82 88 72', { stroke: P.paper, sw: 3 }),
    ],
  },
  {
    word: 'SINK', meaning: 'a kitchen sink', alt: 'A white sink basin set in a counter, with a curved silver tap above it.',
    draw: () => [
      rect(6, 56, 108, 50, 6, P.wood), line('M60 76V104M30 84h8M82 84h8', { sw: 2 }),
      path('M18 56H102L96 74Q94 80 86 80H34Q26 80 24 74Z', P.paper), rect(6, 50, 108, 8, 3, P.stone),
      path('M60 50V22Q60 14 70 14H82Q90 14 90 22V30', undefined, { stroke: P.ink, sw: 10 }), path('M60 50V22Q60 14 70 14H82Q90 14 90 22V30', undefined, { stroke: P.stone, sw: 5 }),
      path('M90 36Q94 42 90 46Q86 42 90 36Z', P.sky, { sw: 2 }),
    ],
  },
  {
    word: 'FAUCET', meaning: 'a water faucet (tap)', alt: 'A silver faucet with a round handle on top and a drop of water falling from its spout.',
    draw: () => [
      rect(8, 40, 16, 40, 4, P.stone), path('M24 46H70Q94 46 94 70V78H76V68Q76 64 70 64H24Z', P.stone),
      rect(36, 30, 14, 16, 3, P.slate), rect(28, 22, 30, 10, 5, P.red),
      rect(74, 76, 22, 8, 3, P.slate), path('M85 90Q96 104 94 108Q92 114 85 114Q78 114 76 108Q74 104 85 90Z', P.sky),
    ],
  },
  {
    word: 'BATHTUB', meaning: 'a bathtub', alt: 'A white bathtub on little feet, full of bubbles, with a tap at one end.',
    draw: () => [
      ...rod('M14 48V28Q14 20 22 20H30V30', P.stone),
      circle(34, 42, 8, P.paper, { sw: 2 }), circle(48, 38, 10, P.paper, { sw: 2 }), circle(66, 40, 9, P.paper, { sw: 2 }), circle(82, 42, 8, P.paper, { sw: 2 }), circle(96, 44, 6, P.paper, { sw: 2 }),
      path('M6 48H114V64Q114 92 88 92H32Q6 92 6 64Z', P.paper), line('M6 56H114', { stroke: P.sky, sw: 3 }),
      path('M22 92L16 106H28L32 92ZM98 92L104 106H92L88 92Z', P.gold),
    ],
  },
  {
    word: 'TOILET', meaning: 'a toilet', alt: 'A white toilet seen from the side, with a tank at the back, a lid and a round bowl.',
    draw: () => [
      rect(64, 10, 40, 44, 6, P.paper), rect(80, 18, 14, 6, 3, P.stone, { sw: 2 }),
      path('M14 56H92V66Q92 86 72 90L76 108H38L42 90Q14 86 14 66Z', P.paper),
      rect(10, 50, 82, 10, 5, P.sky), line('M50 56V60', { sw: 2 }),
    ],
  },
  {
    word: 'SOAP', meaning: 'a bar of soap', alt: 'A pink bar of soap with bubbles floating above it.',
    draw: () => [
      ellipse(60, 100, 50, 8, P.sky),
      path('M14 74Q14 58 30 58H90Q106 58 106 74V84Q106 98 90 98H30Q14 98 14 84Z', P.pink), path('M20 70Q20 64 30 64H88', undefined, { stroke: P.paper, sw: 3 }),
      circle(34, 36, 12, P.paper, { sw: 2 }), circle(62, 22, 9, P.paper, { sw: 2 }), circle(84, 40, 14, P.paper, { sw: 2 }), circle(54, 46, 6, P.paper, { sw: 2 }),
      patch('M28 32q2-4 6-4', P.sky), patch('M78 34q3-5 8-5', P.sky),
    ],
  },
  {
    word: 'TOWEL', meaning: 'a towel', alt: 'A striped blue towel hanging over a silver towel rail, with fringed ends.',
    draw: () => [
      rect(4, 16, 10, 20, 3, P.stone), rect(106, 16, 10, 20, 3, P.stone), line('M10 24H110', { stroke: P.ink, sw: 9 }), line('M10 24H110', { stroke: P.stone, sw: 4.5 }),
      path('M24 24H96V100H24Z', P.blue), path('M24 24H96V38H24Z', P.navy), rect(24, 70, 72, 8, 0, P.paper, { sw: 2 }), rect(24, 82, 72, 5, 0, P.paper, { sw: 2 }),
      line('M28 100v10M36 100v10M44 100v10M52 100v10M60 100v10M68 100v10M76 100v10M84 100v10M92 100v10', { sw: 2 }),
    ],
  },
  {
    word: 'BRUSH', meaning: 'a paintbrush', otherMeaning: 'a hairbrush', alt: 'A paintbrush with a long wooden handle, a silver band and a soft tip dipped in red paint.',
    draw: () => [
      group({ t: 'rotate(40 60 60)' },
        rect(53, 4, 14, 64, 7, P.wood), rect(51, 64, 18, 14, 2, P.stone), line('M51 70H69', { sw: 2 }),
        path('M51 78Q46 98 60 116Q74 98 69 78Z', P.sand), path('M50 96Q54 108 60 116Q66 108 70 96Q60 102 50 96Z', P.red, { sw: 2 })),
      path('M14 104Q24 96 34 104Q42 110 52 104', undefined, { stroke: P.red, sw: 5 }),
    ],
  },
  {
    word: 'COMB', meaning: 'a comb', alt: 'A long thin blue comb with a narrow spine and a row of long thin teeth.',
    draw: () => [
      group({ t: 'rotate(-20 60 60)' },
        ...Array.from({ length: 13 }, (_, i) => rect(10 + i * 7.6, 48, 4.2, 34, 2, P.blue, { sw: 2 })),
        rect(6, 40, 108, 12, 6, P.blue)),
    ],
  },
  {
    word: 'MIRROR', meaning: 'a mirror', alt: 'A tall oval mirror in a wooden frame standing on two legs, its glass shining with bright light streaks.',
    draw: () => [
      line('M38 96L28 114M82 96L92 114', { stroke: P.ink, sw: 9 }), line('M38 96L28 114M82 96L92 114', { stroke: P.brown, sw: 4.5 }),
      ellipse(60, 54, 36, 48, P.wood), ellipse(60, 54, 28, 40, P.sky),
      line('M44 46L64 22M44 66L76 30M58 78L78 52', { stroke: P.paper, sw: 5 }),
      path('M100 10l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z', P.yellow, { sw: 2 }),
    ],
  },
  {
    word: 'PILLOW', meaning: 'a pillow', alt: 'A soft white pillow, puffed in the middle with rounded corners.',
    draw: () => [
      path('M10 30Q24 20 60 26Q96 20 110 30Q104 60 110 90Q96 100 60 94Q24 100 10 90Q16 60 10 30Z', P.paper),
      path('M18 36Q60 28 102 36', undefined, { stroke: P.stone, sw: 2 }), path('M22 84Q60 92 98 84', undefined, { stroke: P.stone, sw: 2 }),
      line('M10 30l-4-4M110 30l4-4M10 90l-4 4M110 90l4 4', { sw: 3 }),
    ],
  },
  {
    word: 'KEY', meaning: 'a door key', alt: 'A gold key with a round bow and notched teeth.',
    draw: () => [
      group({ t: 'rotate(-30 60 60)' },
        circle(30, 60, 22, P.gold), circle(30, 60, 9, P.paper),
        path('M50 54H110V66H104V78H96V66H90V74H82V66H50Z', P.gold)),
    ],
  },
  {
    word: 'LOCK', meaning: 'a padlock', alt: 'A closed gold padlock with a curved shackle and a keyhole.',
    draw: () => [
      path('M36 54V36Q36 12 60 12Q84 12 84 36V54', undefined, { stroke: P.ink, sw: 13 }), path('M36 54V36Q36 12 60 12Q84 12 84 36V54', undefined, { stroke: P.stone, sw: 7 }),
      rect(22, 50, 76, 60, 10, P.gold), circle(60, 74, 7, P.charcoal, { ns: true }), path('M57 76L55 92H65L63 76Z', P.charcoal, { ns: true }),
    ],
  },
  {
    word: 'BELL', meaning: 'a bell', alt: 'A gold bell with a loop on top and a round clapper underneath.',
    draw: () => [
      circle(60, 14, 7, undefined, { stroke: P.ink, sw: 8 }), circle(60, 14, 7, undefined, { stroke: P.gold, sw: 3.5 }),
      path('M60 20Q30 20 30 54Q30 76 16 90H104Q90 76 90 54Q90 20 60 20Z', P.gold), patch('M42 36Q46 28 54 26Q46 36 44 56Z', P.cream),
      rect(12, 88, 96, 10, 5, P.yellow), circle(60, 104, 8, P.gold),
    ],
  },
  {
    word: 'CANDLE', meaning: 'a candle', alt: 'A tall white candle with a lit yellow and orange flame.',
    draw: () => [
      path('M60 6Q76 26 72 38Q68 48 60 48Q52 48 48 38Q44 26 60 6Z', P.orange), path('M60 20Q68 32 66 38Q64 44 60 44Q56 44 54 38Q52 32 60 20Z', P.yellow, { ns: true }),
      line('M60 48V56', { sw: 3 }),
      rect(42, 56, 36, 50, 4, P.paper), path('M42 64Q50 72 54 64V80Q56 86 60 80V64', P.paper, { sw: 2 }),
      ellipse(60, 108, 34, 6, P.gold),
    ],
  },
  {
    word: 'BOX', meaning: 'a cardboard box', alt: 'A brown cardboard box with its top flaps open.',
    draw: () => [
      path('M60 30L106 44L60 58L14 44Z', P.brown),
      path('M14 44L28 22L74 8L60 30Z', P.sand), path('M106 44L92 22L46 8L60 30Z', P.sand),
      path('M14 44L60 58V110L14 96Z', P.wood), path('M106 44L60 58V110L106 96Z', P.sand),
      path('M14 44L4 64L50 78L60 58Z', P.sand), path('M106 44L116 64L70 78L60 58Z', P.wood),
    ],
  },
  {
    word: 'BAG', meaning: 'a shopping bag', alt: 'A paper shopping bag with two rope handles.',
    draw: () => [
      path('M40 46V30Q40 16 50 16Q60 16 60 30V46M60 46V30Q60 16 70 16Q80 16 80 30V46', undefined, { stroke: P.brown, sw: 4 }),
      path('M20 40H100L106 108H14Z', P.coral), path('M20 40H100L98 50H22Z', P.red, { sw: 2 }), circle(40, 46, 3, P.paper, { sw: 1.5 }), circle(80, 46, 3, P.paper, { sw: 1.5 }),
    ],
  },
  {
    word: 'BROOM', fit: [0.876, 47.5, 62.5], meaning: 'a broom', alt: 'A broom with a long wooden handle and a fan of straw bristles.',
    draw: () => [
      group({ t: 'rotate(20 60 60)' },
        ...rod('M60 4V66', P.wood, 9),
        path('M48 64H72L90 114H30Z', P.sand), rect(46, 62, 28, 10, 3, P.red), line('M44 80L38 112M54 80L52 114M66 80L68 114M76 80L82 112', { stroke: P.gold, sw: 2 })),
    ],
  },
  {
    word: 'MOP', meaning: 'a mop', alt: 'A mop with a long blue handle and a big floppy head of white strings.',
    draw: () => [
      group({ t: 'rotate(18 60 60)' },
        ...rod('M60 4V66', P.blue, 9),
        path('M40 72Q22 92 26 112Q34 104 36 112Q42 102 46 114Q52 104 56 116Q62 106 66 116Q70 104 76 114Q80 102 86 112Q90 104 96 110Q98 90 80 72Z', P.paper),
        line('M46 78Q40 94 40 108M54 78Q52 96 54 112M66 78Q68 96 68 112M74 78Q80 94 84 106', { stroke: P.stone, sw: 2 }),
        rect(40, 64, 40, 12, 4, P.stone)),
    ],
  },
  {
    word: 'SPONGE', meaning: 'a kitchen sponge', alt: 'A soft yellow sponge full of holes, with a green scrubbing side and soap bubbles on top.',
    draw: () => [
      path('M10 58L28 44H108L90 58Z', P.leaf), path('M90 58L108 44V82L90 98Z', P.gold), rect(10, 58, 80, 40, 3, P.yellow),
      ...[[20, 68], [34, 76], [52, 66], [70, 74], [24, 88], [46, 88], [64, 90], [80, 84], [82, 66]].map(([x, y], i) => ellipse(x, y, 3 + (i % 3), 2.5 + (i % 2), P.gold, { sw: 1.5 })),
      circle(40, 30, 10, P.paper, { sw: 2 }), circle(62, 22, 7, P.paper, { sw: 2 }), circle(80, 34, 9, P.paper, { sw: 2 }), circle(98, 22, 5, P.paper, { sw: 2 }),
    ],
  },
  {
    word: 'VASE', meaning: 'a vase of flowers', alt: 'A blue vase with a narrow neck holding three flowers.',
    draw: () => [
      line('M60 50V24M54 52L38 28M66 52L82 30', { stroke: P.forest, sw: 3 }),
      ...[[60, 18, P.red], [36, 24, P.yellow], [84, 26, P.pink]].map(([x, y, c]) => [circle(x - 6, y, 6, c, { sw: 2 }), circle(x + 6, y, 6, c, { sw: 2 }), circle(x, y - 6, 6, c, { sw: 2 }), circle(x, y + 6, 6, c, { sw: 2 }), circle(x, y, 4, P.gold, { sw: 2 })]).flat(),
      path('M50 48H70V58Q92 70 90 90Q88 110 60 110Q32 110 30 90Q28 70 50 58Z', P.blue), line('M36 84Q60 92 84 84', { stroke: P.sky, sw: 3 }),
    ],
  },
  {
    word: 'FAN', meaning: 'an electric fan', alt: 'A desk fan with a round wire cage, three blades and a stand.',
    draw: () => [
      ...rod('M60 82V104', P.stone, 10), ellipse(60, 108, 30, 6, P.stone),
      circle(54, 46, 40, P.paper),
      path('M54 46Q40 14 60 12Q76 20 54 46ZM54 46Q86 52 84 70Q74 82 54 46ZM54 46Q32 74 22 62Q20 46 54 46Z', P.sky, { t: 'translate(0 0)' }),
      circle(54, 46, 7, P.blue), circle(54, 46, 40), line('M54 6V86M14 46H94', { stroke: P.stone, sw: 1.5 }),
    ],
  },
  {
    word: 'PHONE', meaning: 'a mobile phone', alt: 'A mobile phone held upright, with a big screen and a round button.',
    draw: () => [
      rect(32, 6, 56, 108, 12, P.charcoal), rect(38, 18, 44, 76, 3, P.sky),
      line('M54 12H66', { stroke: P.stone, sw: 3 }), circle(60, 104, 5, P.stone, { sw: 2 }),
      rect(44, 26, 12, 12, 3, P.yellow, { sw: 2 }), rect(64, 26, 12, 12, 3, P.red, { sw: 2 }), rect(44, 46, 12, 12, 3, P.leaf, { sw: 2 }), rect(64, 46, 12, 12, 3, P.purple, { sw: 2 }),
    ],
  },
  {
    word: 'RADIO', meaning: 'a radio', alt: 'An old-style radio with a round speaker, two knobs, a handle and an antenna.',
    draw: () => [
      line('M82 34L104 6', { sw: 3 }), circle(104, 6, 3, P.ink, { ns: true }),
      path('M34 34V24Q34 16 42 16H78Q86 16 86 24V34', undefined, { stroke: P.ink, sw: 8 }), path('M34 34V24Q34 16 42 16H78Q86 16 86 24V34', undefined, { stroke: P.stone, sw: 3 }),
      rect(8, 34, 104, 70, 12, P.coral), circle(40, 70, 22, P.cream),
      line('M24 64H56M22 72H58M26 80H54M30 56H50', { stroke: P.wood, sw: 2.5 }), circle(40, 70, 22),
      rect(72, 46, 30, 14, 3, P.sky, { sw: 2 }), circle(78, 82, 7, P.charcoal), circle(98, 82, 7, P.charcoal),
    ],
  },
  {
    word: 'TELEVISION', meaning: 'a television', alt: 'A television with a big blue screen on a stand, with a small rabbit-ear antenna.',
    draw: () => [
      line('M60 26L44 6M60 26L78 8', { sw: 3 }),
      rect(6, 26, 108, 72, 10, P.charcoal), rect(14, 34, 92, 56, 4, P.sky),
      path('M24 82L44 58L58 74L70 62L96 82Z', P.leaf, { sw: 2 }), circle(86, 46, 6, P.yellow, { sw: 2 }),
      path('M44 98L38 112H82L76 98Z', P.charcoal),
    ],
  },
  {
    word: 'COMPUTER', meaning: 'a desktop computer', alt: 'A desktop computer: a screen on a stand with a keyboard in front.',
    draw: () => [
      rect(14, 10, 92, 64, 8, P.stone), rect(22, 18, 76, 48, 3, P.blue),
      line('M30 30H64M30 40H80M30 50H56', { stroke: P.paper, sw: 4 }),
      path('M50 74L46 88H74L70 74Z', P.stone), path('M14 96H106L112 110H8Z', P.paper),
      line('M20 101H100M18 106H102', { stroke: P.stone, sw: 2 }),
    ],
  },
  {
    word: 'CAMERA', meaning: 'a camera', alt: 'A black camera with a big round lens, a flash and a button on top.',
    draw: () => [
      rect(20, 24, 26, 14, 4, P.stone), rect(82, 26, 16, 10, 3, P.red),
      rect(8, 34, 104, 70, 12, P.charcoal), rect(8, 46, 104, 46, 0, P.stone, { sw: 2 }),
      circle(60, 68, 30, P.charcoal), circle(60, 68, 20, P.sky), circle(60, 68, 9, P.navy, { ns: true }), circle(54, 62, 4, P.paper, { ns: true }),
      rect(88, 40, 16, 8, 2, P.yellow, { sw: 2 }),
    ],
  },
  {
    word: 'LADDER', meaning: 'a ladder', alt: 'A tall wooden ladder with two side rails and five rungs.',
    draw: () => [
      ...rod('M36 112L44 8M84 112L76 8', P.wood, 10),
      ...[24, 44, 64, 84].flatMap(y => rod(`M${43 - (y - 8) / 13} ${y}H${77 + (y - 8) / 13}`, P.sand, 9)),
    ],
  },
  {
    word: 'STAIRS', meaning: 'a flight of stairs', alt: 'A flight of wooden stairs going up from left to right, with a handrail.',
    draw: () => [
      path('M8 110V90H32V70H56V50H80V30H104V110Z', P.wood), line('M8 90H32M32 70H56M56 50H80M80 30H104', { stroke: P.sand, sw: 4 }),
      path('M8 110V90H32V70H56V50H80V30H104V110Z'),
      ...rod('M14 70L102 8', P.brown, 8), line('M20 66V88M44 50V70M68 32V50M92 16V30', { sw: 3 }),
    ],
  },
  {
    word: 'FENCE', fit: [0.876, 58.5, 63.5], meaning: 'a picket fence', alt: 'A white wooden picket fence with pointed posts joined by two rails.',
    draw: () => [
      rect(4, 48, 112, 10, 2, P.paper), rect(4, 80, 112, 10, 2, P.paper),
      ...[8, 32, 56, 80, 104].map(x => path(`M${x} 108V28L${x + 8} 18L${x + 16} 28V108Z`, P.paper, { t: `translate(${-8} 0)` })),
      line('M4 108H116', { stroke: P.leaf, sw: 5 }),
    ],
  },
  {
    word: 'GATE', meaning: 'a garden gate', alt: 'A wooden garden gate between two posts, with a curved top and a latch.',
    draw: () => [
      rect(8, 20, 16, 92, 3, P.brown), rect(96, 20, 16, 92, 3, P.brown), circle(16, 18, 7, P.brown), circle(104, 18, 7, P.brown),
      path('M26 44Q60 26 94 44V108H26Z', P.wood), line('M38 40V108M50 34V108M60 32V108M70 34V108M82 40V108', { stroke: P.brown, sw: 2 }),
      line('M26 60H94M26 94H94M28 92L92 62', { stroke: P.ink, sw: 8 }), line('M26 60H94M26 94H94M28 92L92 62', { stroke: P.sand, sw: 4 }),
      rect(84, 70, 10, 8, 2, P.charcoal),
    ],
  },
  {
    word: 'MAILBOX', meaning: 'a mailbox', alt: 'A mailbox on a post, with a rounded top, a raised red flag and a letter peeking out.',
    draw: () => [
      rect(52, 64, 14, 48, 3, P.wood),
      path('M88 52V24H104V34H92V52', P.red), path('M14 70V40Q14 20 34 20H84Q104 20 104 40V70Z', P.blue),
      path('M14 40Q14 20 34 20Q54 20 54 40V70H14Z', P.navy),
      rect(20, 34, 26, 18, 2, P.paper, { sw: 2, t: 'rotate(-12 33 43)' }),
    ],
  },
  {
    word: 'HANGER', meaning: 'a clothes hanger', alt: 'A clothes hanger with a hook on top and a wide triangle shape.',
    draw: () => [
      path('M60 40V32Q60 26 66 22Q74 18 74 12Q74 4 66 4Q58 4 58 12', undefined, { stroke: P.ink, sw: 8 }), path('M60 40V32Q60 26 66 22Q74 18 74 12Q74 4 66 4Q58 4 58 12', undefined, { stroke: P.stone, sw: 3 }),
      path('M60 40L8 86Q4 92 12 92H108Q116 92 112 86Z', undefined, { stroke: P.ink, sw: 11 }), path('M60 40L8 86Q4 92 12 92H108Q116 92 112 86Z', undefined, { stroke: P.wood, sw: 6 }),
    ],
  },
  {
    word: 'IRON', meaning: 'a clothes iron', otherMeaning: 'the metal iron', alt: 'A clothes iron with a pointed silver base, a blue body and a handle on top.',
    draw: () => [
      path('M12 92Q20 50 70 46H104V92Z', P.sky), rect(6, 90, 104, 12, 4, P.stone),
      path('M40 46Q44 22 70 22H100Q106 22 106 30V46H92V36H72Q60 36 56 46Z', P.blue), circle(80, 72, 8, P.red, { sw: 2 }),
      line('M110 60Q116 70 114 80', { sw: 3 }), line('M24 100h4M40 100h4M56 100h4', { stroke: P.slate, sw: 2 }),
    ],
  },
  {
    word: 'BOTTLE', meaning: 'a water bottle', alt: 'A clear plastic water bottle with a blue cap and a label, half full of water.',
    draw: () => [
      rect(46, 6, 28, 14, 4, P.blue),
      path('M48 20H72V30Q90 36 90 54V104Q90 112 82 112H38Q30 112 30 104V54Q30 36 48 30Z', P.paper),
      path('M31 60H89V104Q90 112 82 112H38Q30 112 30 104Z', P.sky, { sw: 2 }), rect(30, 68, 60, 20, 0, P.leaf, { sw: 2 }),
      path('M48 20H72V30Q90 36 90 54V104Q90 112 82 112H38Q30 112 30 104V54Q30 36 48 30Z'),
    ],
  },
  {
    word: 'JAR', meaning: 'a glass jar', alt: 'An empty clear glass jar with a gold screw lid and shiny highlights on the glass.',
    draw: () => [
      rect(28, 8, 64, 18, 4, P.gold), line('M36 12v10M46 12v10M56 12v10M66 12v10M76 12v10M84 12v10', { stroke: P.wood, sw: 2 }),
      path('M32 26H88Q98 32 98 44V100Q98 112 86 112H34Q22 112 22 100V44Q22 32 32 26Z', P.sky),
      path('M34 40V96', undefined, { stroke: P.paper, sw: 6 }), path('M46 40V60', undefined, { stroke: P.paper, sw: 3 }), line('M24 100Q60 108 96 100', { stroke: P.paper, sw: 2.5 }),
    ],
  },
  {
    word: 'OVEN', meaning: 'a kitchen oven', alt: 'A kitchen oven with four knobs and a glass door showing a tray of cookies baking inside.',
    draw: () => [
      rect(10, 8, 100, 104, 8, P.paper), rect(10, 8, 100, 22, 0, P.stone, { sw: 2 }), rect(10, 8, 100, 104, 8),
      ...[28, 50, 70, 92].map(x => circle(x, 19, 5, P.charcoal, { sw: 2 })),
      rect(20, 36, 80, 8, 4, P.slate), rect(20, 50, 80, 52, 6, P.charcoal), rect(28, 58, 64, 36, 3, P.orange, { sw: 2 }),
      line('M32 84H88', { stroke: P.stone, sw: 3 }), ...[[42, 78], [60, 78], [78, 78]].map(([x, y]) => ellipse(x, y, 7, 4, P.wood, { sw: 2 })),
    ],
  },
  {
    word: 'CRIB', meaning: 'a baby crib', alt: 'A baby crib with tall rails, a pillow and a blue blanket inside, and a little mobile of stars hanging above.',
    draw: () => [
      line('M60 4V14M40 14H80M40 14V22M60 14V24M80 14V20', { sw: 2 }), poly('40,22 43,28 37,28', P.yellow, { sw: 1.5 }), circle(60, 27, 3.5, P.pink, { sw: 1.5 }), poly('80,20 83,26 77,26', P.sky, { sw: 1.5 }),
      rect(8, 34, 12, 78, 4, P.wood), rect(100, 34, 12, 78, 4, P.wood),
      ellipse(36, 74, 12, 7, P.paper), path('M48 70H96V86H44Z', P.blue), rect(20, 84, 80, 10, 2, P.paper), rect(20, 94, 80, 8, 2, P.wood),
      line('M20 42H100', { stroke: P.ink, sw: 8 }), line('M20 42H100', { stroke: P.sand, sw: 3.5 }),
      line('M32 44V84M44 44V84M56 44V84M68 44V84M80 44V84M92 44V84', { stroke: P.ink, sw: 6 }), line('M32 44V84M44 44V84M56 44V84M68 44V84M80 44V84M92 44V84', { stroke: P.sand, sw: 2 }),
    ],
  },
  {
    word: 'RATTLE', meaning: 'a baby rattle', alt: 'A baby rattle: a clear round ball with coloured beads inside, on a short handle with a ring at the end, with little shake lines.',
    draw: () => [
      line('M20 22l8 6M14 40h10M44 8l2 10', { stroke: P.orange, sw: 3 }),
      group({ t: 'rotate(-35 60 60)' },
        rect(53, 64, 14, 32, 6, P.pink), circle(60, 104, 11, undefined, { stroke: P.ink, sw: 9 }), circle(60, 104, 11, undefined, { stroke: P.yellow, sw: 4 }),
        circle(60, 36, 30, P.sky), circle(48, 40, 6, P.red, { sw: 2 }), circle(64, 48, 6, P.yellow, { sw: 2 }), circle(70, 30, 6, P.leaf, { sw: 2 }), circle(54, 26, 5, P.purple, { sw: 2 }),
        path('M38 26Q42 14 54 10', undefined, { stroke: P.paper, sw: 4 }), rect(48, 62, 24, 6, 3, P.coral)),
    ],
  },
  {
    word: 'DIAPER', meaning: 'a baby diaper', alt: 'A white baby diaper with folded tabs at the sides and a little blue pattern.',
    draw: () => [
      path('M10 28H110Q112 46 96 54Q84 60 80 78Q74 100 60 100Q46 100 40 78Q36 60 24 54Q8 46 10 28Z', P.paper),
      path('M10 28H34V48Q20 50 10 40ZM110 28H86V48Q100 50 110 40Z', P.sky, { sw: 2 }),
      line('M24 36Q60 44 96 36', { stroke: P.stone, sw: 2 }), circle(52, 66, 3, P.blue, { ns: true }), circle(68, 66, 3, P.blue, { ns: true }), circle(60, 80, 3, P.blue, { ns: true }),
    ],
  },
  {
    word: 'PACIFIER', meaning: "a baby's pacifier", alt: "A baby's pacifier seen from the front: a wide rounded shield with air holes and a ring handle in the middle.",
    draw: () => [
      path('M60 34Q78 18 100 30Q114 44 104 64Q96 80 76 76Q66 92 60 92Q54 92 44 76Q24 80 16 64Q6 44 20 30Q42 18 60 34Z', P.sky),
      circle(30, 50, 5, P.paper, { sw: 2 }), circle(90, 50, 5, P.paper, { sw: 2 }),
      circle(60, 64, 22, undefined, { stroke: P.ink, sw: 11 }), circle(60, 64, 22, undefined, { stroke: P.blue, sw: 6 }), circle(60, 54, 8, P.navy),
    ],
  },
  {
    word: 'GIFT', meaning: 'a wrapped gift', alt: 'A present wrapped in red paper with a yellow ribbon and a big bow on top.',
    draw: () => [
      path('M60 32Q40 8 28 16Q20 26 42 32ZM60 32Q80 8 92 16Q100 26 78 32Z', P.yellow),
      rect(14, 32, 92, 22, 4, P.red), rect(20, 54, 80, 54, 4, P.red),
      rect(52, 32, 16, 76, 0, P.yellow), circle(60, 32, 7, P.gold),
    ],
  },
  {
    word: 'LADLE', meaning: 'a soup ladle', alt: 'A silver soup ladle lying on a slant: a long handle with a hook at the end and a deep round cup.',
    draw: () => [
      group({ t: 'rotate(-35 60 60)' },
        line('M60 6Q70 4 70 12V66', { stroke: P.ink, sw: 9 }), line('M60 6Q70 4 70 12V66', { stroke: P.stone, sw: 4.5 }),
        path('M40 66H100Q100 104 70 104Q40 104 40 66Z', P.stone), ellipse(70, 66, 30, 7, P.slate), patch('M48 76q2 14 14 20q-12-4-14-20Z', P.paper)),
    ],
  },
  {
    word: 'WHISK', meaning: 'a whisk', alt: 'A kitchen whisk with a red handle and a balloon of wire loops.',
    draw: () => [
      group({ t: 'rotate(-30 60 60)' },
        path('M60 66Q34 46 46 12Q60 0 74 12Q86 46 60 66M60 66Q44 40 54 10M60 66Q76 40 66 10M60 66V6', undefined, { stroke: P.slate, sw: 3 }),
        rect(52, 64, 16, 50, 7, P.red), rect(50, 62, 20, 8, 3, P.stone)),
    ],
  },
  {
    word: 'APRON', meaning: 'an apron', alt: 'A yellow kitchen apron with a neck loop, side ties and a front pocket.',
    draw: () => [
      path('M44 26Q44 6 60 6Q76 6 76 26', undefined, { stroke: P.wood, sw: 4 }),
      line('M30 56L8 64M90 56L112 64', { stroke: P.wood, sw: 4 }),
      path('M40 24H80V48Q96 50 94 60L92 108Q92 112 86 112H34Q28 112 28 108L26 60Q24 50 40 48Z', P.yellow),
      rect(42, 72, 36, 22, 4, P.orange), line('M60 72V94', { sw: 2 }),
    ],
  },
  {
    word: 'VACUUM', meaning: 'a vacuum cleaner', alt: 'An upright vacuum cleaner with a tall handle, a red bag, a curly cord and a wide floor brush on wheels sucking up dust.',
    draw: () => [
      path('M44 40Q24 44 26 64Q28 80 18 86Q10 92 14 100', undefined, { sw: 2.5 }),
      line('M50 6H70', { stroke: P.ink, sw: 10 }), line('M50 6H70', { stroke: P.charcoal, sw: 5 }), line('M60 6V30', { stroke: P.ink, sw: 8 }), line('M60 6V30', { stroke: P.stone, sw: 3.5 }),
      rect(44, 28, 32, 52, 12, P.red), rect(52, 40, 16, 26, 4, P.coral, { sw: 2 }), rect(54, 80, 12, 10, 2, P.stone),
      rect(28, 88, 64, 16, 6, P.stone), circle(36, 106, 5, P.charcoal), circle(84, 106, 5, P.charcoal),
      circle(104, 104, 2.5, P.wood, { ns: true }), circle(110, 98, 2, P.wood, { ns: true }), circle(100, 96, 1.8, P.wood, { ns: true }),
    ],
  },
  {
    word: 'KEYBOARD', meaning: 'a computer keyboard', otherMeaning: 'a music keyboard', alt: 'A computer keyboard with rows of square keys and a long space bar.',
    draw: () => [
      rect(4, 34, 112, 56, 8, P.stone),
      ...[42, 56, 70].flatMap(y => Array.from({ length: 9 }, (_, i) => rect(12 + i * 11 + (y === 56 ? 3 : y === 70 ? 6 : 0), y, 8, 9, 2, P.paper, { sw: 2 }))),
      rect(36, 80, 48, 6, 2, P.paper, { sw: 2 }),
    ],
  },
  {
    word: 'YARN', meaning: 'a ball of yarn', alt: 'A round pink ball of knitting yarn with a loose strand and two knitting needles stuck in it.',
    draw: () => [
      line('M18 22L70 74M30 12L76 66', { stroke: P.ink, sw: 7 }), line('M18 22L70 74M30 12L76 66', { stroke: P.stone, sw: 2.5 }), circle(18, 22, 5, P.gold), circle(30, 12, 5, P.gold),
      path('M30 96Q16 106 8 100Q4 92 14 92', undefined, { sw: 3 }),
      circle(64, 70, 40, P.pink),
      path('M28 58Q60 44 96 62M26 74Q62 58 102 78M34 92Q66 74 98 94M46 34Q40 70 52 108M68 30Q58 70 76 110', undefined, { stroke: P.coral, sw: 3 }),
      circle(64, 70, 40),
    ],
  },
];
