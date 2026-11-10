import { P, circle, ellipse, rect, path, line, poly, patch, group, ring, rays } from '../style.mjs';

const cloud = (fill = P.paper, o) => path('M24 78Q6 78 6 62Q6 46 24 46Q26 26 46 26Q58 14 74 22Q90 18 96 36Q114 38 114 58Q114 78 94 78Z', fill, o);
const drop = (x, y, s = 1, fill = P.blue) => path(`M${x} ${y}Q${x + 8 * s} ${y + 11 * s} ${x + 8 * s} ${y + 15 * s}Q${x + 8 * s} ${y + 22 * s} ${x} ${y + 22 * s}Q${x - 8 * s} ${y + 22 * s} ${x - 8 * s} ${y + 15 * s}Q${x - 8 * s} ${y + 11 * s} ${x} ${y}Z`, fill);

export default [
  {
    word: 'SUN', meaning: 'the sun', alt: 'A bright yellow sun with short rays all around it.',
    draw: () => [line(rays(60, 60, 34, 52, 12), { stroke: P.ink, sw: 9 }), line(rays(60, 60, 34, 52, 12), { stroke: P.orange, sw: 4 }), circle(60, 60, 28, P.yellow), patch('M44 50Q48 40 58 38Q50 46 50 56Z', P.paper)],
  },
  {
    word: 'MOON', meaning: 'the moon', alt: 'A pale yellow crescent moon with two little stars beside it.',
    draw: () => [
      path('M64 8Q30 14 26 54Q24 96 66 110Q100 116 112 88Q76 100 58 74Q42 46 64 8Z', P.cream),
      circle(48, 62, 4, P.sand, { ns: true }), circle(56, 88, 3, P.sand, { ns: true }),
      poly(ring(90, 28, 10, 4, -90, 3.5), P.yellow, { sw: 2 }), poly(ring(102, 56, 6, 4, -90, 2.2), P.yellow, { sw: 2 }),
    ],
  },
  {
    word: 'STAR', meaning: 'a star in the sky', alt: 'A big yellow five-pointed star with a shine.',
    draw: () => [path('M60 6L74 42L112 44L82 68L94 106L60 84L26 106L38 68L8 44L46 42Z', P.yellow), patch('M48 50L54 36L58 50Z', P.paper)],
  },
  {
    word: 'CLOUD', meaning: 'a cloud', alt: 'A puffy white cloud with round bumps on top and a flat bottom.',
    draw: () => [group({ t: 'translate(0 8)' }, cloud(P.paper), path('M22 70Q60 76 98 70', undefined, { stroke: P.sky, sw: 3 }))],
  },
  {
    word: 'RAIN', meaning: 'rain', alt: 'Lots of blue raindrops falling in slanting rows from a grey sky, splashing on the ground.',
    draw: () => [
      path('M6 26Q6 6 26 8Q40 2 54 8Q70 0 84 8Q104 4 114 22Q100 30 84 24Q70 32 56 24Q40 32 26 24Q14 32 6 26Z', P.stone),
      ...[[22, 36], [50, 34], [78, 36], [104, 38], [12, 62], [38, 60], [66, 62], [94, 60], [26, 86], [54, 84], [82, 86], [108, 84]].map(([x, y]) =>
        path(`M${x} ${y}Q${x + 6} ${y + 9} ${x + 6} ${y + 12}Q${x + 6} ${y + 17} ${x} ${y + 17}Q${x - 6} ${y + 17} ${x - 6} ${y + 12}Q${x - 6} ${y + 9} ${x} ${y}Z`, P.blue)),
      line('M8 112h22M44 112h30M88 112h24', { stroke: P.sky, sw: 3 }),
    ],
  },
  {
    word: 'RAINBOW', meaning: 'a rainbow', alt: 'A rainbow arch of red, orange, yellow, green and blue bands, with a cloud at each end.',
    draw: () => [
      ...[[46, P.red], [38, P.orange], [30, P.yellow], [22, P.leaf], [14, P.blue]].map(([r, c]) => [path(`M${60 - r} 88A${r} ${r} 0 0 1 ${60 + r} 88`, undefined, { stroke: P.ink, sw: 9.5 }), path(`M${60 - r} 88A${r} ${r} 0 0 1 ${60 + r} 88`, undefined, { stroke: c, sw: 6.5 })]).flat(),
      group({ t: 'translate(2 72) scale(0.36)' }, cloud(P.paper, { sw: 8 })), group({ t: 'translate(76 72) scale(0.36)' }, cloud(P.paper, { sw: 8 })),
    ],
  },
  {
    word: 'LIGHTNING', meaning: 'a bolt of lightning', alt: 'A big bright yellow zigzag bolt of lightning with little sparks around it.',
    draw: () => [
      path('M66 4H100L74 46H96L36 116L52 64H30Z', P.yellow), patch('M70 10H88L66 46L60 40Z', P.paper),
      line('M20 30l8 6M12 50h10M104 70l8-4M100 88l10 4', { stroke: P.orange, sw: 4 }),
    ],
  },
  {
    word: 'SNOW', meaning: 'snow', alt: 'Thick white snow piled up in soft drifts on the ground, with snowflakes falling from a pale sky.',
    draw: () => [
      path('M6 82Q20 64 40 72Q56 58 76 70Q94 60 114 72V110H6Z', P.paper), path('M6 96Q30 84 56 94Q84 86 114 96', undefined, { stroke: P.sky, sw: 3 }),
      ...[[20, 20, 8], [52, 14, 6], [86, 22, 8], [36, 44, 6], [70, 46, 7], [104, 48, 5], [14, 56, 5]].map(([x, y, r]) =>
        line(`M${x - r} ${y}H${x + r}M${x - r * 0.5} ${y - r * 0.87}L${x + r * 0.5} ${y + r * 0.87}M${x - r * 0.5} ${y + r * 0.87}L${x + r * 0.5} ${y - r * 0.87}`, { stroke: P.blue, sw: 2.5 })),
    ],
  },
  {
    word: 'WIND', meaning: 'wind', alt: 'Curling grey lines of blowing wind carrying a green leaf through the air.',
    draw: () => [
      path('M8 46H72Q88 46 88 32Q88 20 76 20Q66 20 66 30', undefined, { stroke: P.ink, sw: 9 }), path('M8 46H72Q88 46 88 32Q88 20 76 20Q66 20 66 30', undefined, { stroke: P.sky, sw: 4 }),
      path('M8 66H96Q112 66 112 80Q112 92 100 92Q90 92 90 82', undefined, { stroke: P.ink, sw: 9 }), path('M8 66H96Q112 66 112 80Q112 92 100 92Q90 92 90 82', undefined, { stroke: P.sky, sw: 4 }),
      path('M16 86H56Q68 86 68 96Q68 106 58 106', undefined, { stroke: P.ink, sw: 9 }), path('M16 86H56Q68 86 68 96Q68 106 58 106', undefined, { stroke: P.sky, sw: 4 }),
      path('M30 22Q36 6 54 10Q48 26 30 22Z', P.leaf), line('M30 22L46 14', { sw: 2 }),
    ],
  },
  {
    word: 'PUDDLE', meaning: 'a rain puddle', alt: 'A flat blue puddle on the ground with rings spreading where raindrops land and a splash.',
    draw: () => [
      path('M10 78Q8 60 34 62Q46 52 70 58Q100 54 110 70Q116 86 92 92Q70 100 44 94Q14 96 10 78Z', P.sky),
      ellipse(48, 76, 14, 5, undefined, { stroke: P.blue, sw: 2.5 }), ellipse(48, 76, 26, 10, undefined, { stroke: P.blue, sw: 2 }), ellipse(84, 72, 10, 4, undefined, { stroke: P.blue, sw: 2.5 }),
      drop(48, 22, 0.8), drop(84, 34, 0.6), circle(36, 56, 3, P.sky, { sw: 2 }), circle(60, 54, 3, P.sky, { sw: 2 }), circle(30, 48, 2.4, P.sky, { sw: 2 }),
    ],
  },
  {
    word: 'PLANET', meaning: 'a planet with rings', alt: 'A round orange planet with a wide tilted ring around it.',
    draw: () => [
      path('M18 74Q0 88 10 94Q26 102 70 82Q104 66 112 48Q118 34 100 38', undefined, { stroke: P.ink, sw: 11 }), path('M18 74Q0 88 10 94Q26 102 70 82Q104 66 112 48Q118 34 100 38', undefined, { stroke: P.sand, sw: 6 }),
      circle(60, 60, 34, P.orange), line('M30 46Q60 56 90 44M28 66Q60 76 92 62', { stroke: P.coral, sw: 4 }), circle(60, 60, 34),
      path('M100 38Q90 34 70 42Q34 56 18 74', undefined, { stroke: P.ink, sw: 11 }), path('M100 38Q90 34 70 42Q34 56 18 74', undefined, { stroke: P.sand, sw: 6 }),
    ],
  },
  {
    word: 'ROCKET', meaning: 'a space rocket', alt: 'A white space rocket pointing up, with a red nose, a round window, fins and flames.',
    draw: () => [
      path('M48 92Q52 112 60 116Q68 112 72 92Z', P.orange), path('M53 92Q56 104 60 108Q64 104 67 92Z', P.yellow, { ns: true }),
      path('M42 64L22 84V96L44 86ZM78 64L98 84V96L76 86Z', P.red),
      path('M60 6Q84 26 82 64Q80 84 74 94H46Q40 84 38 64Q36 26 60 6Z', P.paper), path('M60 6Q72 16 77 30H43Q48 16 60 6Z', P.red),
      circle(60, 52, 10, P.sky), line('M60 94V76', { sw: 2 }),
    ],
  },
  {
    word: 'COMET', meaning: 'a comet', alt: 'A comet: a bright icy ball with one long glowing tail streaming behind it.',
    draw: () => [
      path('M86 26Q50 30 6 62Q50 52 74 52Q46 64 14 98Q60 74 84 58Z', P.sky), path('M88 30Q60 40 30 64Q58 56 80 54Z', P.paper, { sw: 2 }),
      circle(88, 40, 20, P.yellow), patch('M78 34Q82 26 90 26Q84 32 84 40Z', P.paper),
    ],
  },
  {
    word: 'SUNSET', meaning: 'a sunset over the sea', alt: 'An orange sun setting into the sea, half hidden at the horizon, under a pink and orange sky.',
    draw: () => [
      rect(8, 14, 104, 92, 16, P.pink, { ns: true }), patch('M8 40H112V64H8Z', P.coral),
      path('M26 66A34 34 0 0 1 94 66Z', P.orange), line([200, 230, 260, 280, 310, 340].map(a => rays(60, 66, 40, 50, 1, a)).join(''), { stroke: P.orange, sw: 4 }),
      patch('M8 66H112V92Q112 106 98 106H22Q8 106 8 92Z', P.navy),
      line('M36 76h48M46 86h28M54 96h12', { stroke: P.orange, sw: 3 }), line('M8 66H112'), rect(8, 14, 104, 92, 16),
    ],
  },
  {
    word: 'TYPHOON', meaning: 'a typhoon (a big tropical storm)', alt: 'A typhoon: the storm sign of a dark round eye with two curved arms, over a rough sea with slanting rain and a palm tree bending in the wind.',
    draw: () => [
      path('M6 100Q20 90 34 100Q48 110 60 100Q72 90 86 100Q100 110 114 100V112H6Z', P.blue),
      path('M48 22Q70 2 104 12Q76 14 64 30Z', P.slate), path('M72 70Q50 90 16 80Q44 78 56 62Z', P.slate),
      circle(60, 46, 22, P.slate), circle(60, 46, 8, P.paper),
      line('M12 66L6 78M100 62L94 74M110 74L104 86', { stroke: P.blue, sw: 3 }),
      line('M98 102Q96 90 86 82', { stroke: P.ink, sw: 7 }), line('M98 102Q96 90 86 82', { stroke: P.brown, sw: 3 }),
      path('M86 82Q76 74 64 80Q76 80 86 82Q78 70 68 68Q80 70 86 82Q84 68 78 62Q88 68 86 82Z', P.leaf, { sw: 2 }),
    ],
  },
  {
    word: 'DROP', meaning: 'a drop of water', otherMeaning: 'to drop something', alt: 'A single shiny blue water drop.',
    draw: () => [drop(60, 6, 4.6), patch('M42 70Q42 56 50 48Q48 62 50 76Z', P.paper)],
  },
];
