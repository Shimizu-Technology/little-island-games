import { P, circle, ellipse, rect, path, poly, patch, group } from '../style.mjs';

export default [
  { word: 'CIRCLE', meaning: 'a circle', alt: 'A flat blue circle.', draw: () => [circle(60, 60, 48, P.blue)] },
  { word: 'SQUARE', meaning: 'a square', otherMeaning: 'a town square', alt: 'A flat red square with four equal sides.', draw: () => [rect(16, 16, 88, 88, 4, P.red)] },
  { word: 'TRIANGLE', meaning: 'a triangle', otherMeaning: 'the musical triangle', alt: 'A flat yellow triangle with three straight sides.', draw: () => [poly('60,10 112,104 8,104', P.yellow)] },
  { word: 'RECTANGLE', meaning: 'a rectangle', alt: 'A flat green rectangle, wider than it is tall.', draw: () => [rect(6, 32, 108, 56, 4, P.leaf)] },
  { word: 'DIAMOND', meaning: 'a diamond shape', otherMeaning: 'a diamond gem', alt: 'A flat purple diamond shape: a square standing on one corner.', draw: () => [poly('60,6 106,60 60,114 14,60', P.purple)] },
  { word: 'OVAL', meaning: 'an oval', alt: 'A flat orange oval, like a stretched circle.', draw: () => [ellipse(60, 60, 52, 34, P.orange)] },
  {
    word: 'HEART', meaning: 'a heart shape', alt: 'A red heart shape with a shine.', basedOn: 'content/library/art/heart.svg',
    draw: () => [group({ t: 'translate(60 62) scale(1.12) translate(-60 -64)' }, path('M60 98Q-2 61 22 30q22-21 38 6 16-27 38-6 24 31-38 68Z', P.red)), patch('M30 40Q34 30 44 30Q36 38 36 48Z', P.paper)],
  },
  {
    word: 'CUBE', meaning: 'a cube', otherMeaning: 'an ice cube', alt: 'A solid blue cube shown in 3D, with three faces in light, middle and dark blue.',
    draw: () => [path('M60 10L106 34L60 58L14 34Z', P.sky), path('M14 34L60 58V112L14 88Z', P.blue), path('M106 34L60 58V112L106 88Z', P.navy)],
  },
  {
    word: 'CONE', meaning: 'a cone shape', otherMeaning: 'an ice cream cone', alt: 'A solid orange cone shown in 3D, pointed at the top with a round base.',
    draw: () => [path('M60 8L104 92Q100 110 60 110Q20 110 16 92Z', P.orange), patch('M60 8L48 104Q36 102 26 96Z', P.gold), path('M16 92Q20 110 60 110Q100 110 104 92Q100 80 60 80Q20 80 16 92Z', undefined, { sw: 2 }), path('M60 8L104 92Q100 110 60 110Q20 110 16 92Z')],
  },
  {
    word: 'CYLINDER', meaning: 'a cylinder', alt: 'A solid green cylinder shown in 3D, like a can, with a round top.',
    draw: () => [path('M24 24V96Q24 110 60 110Q96 110 96 96V24Z', P.leaf), patch('M32 30h10v72q-6-2-10-6Z', P.mint), path('M24 24V96Q24 110 60 110Q96 110 96 96V24'), ellipse(60, 24, 36, 14, P.mint)],
  },
  {
    word: 'SPHERE', meaning: 'a sphere (a solid round shape)', alt: 'A solid blue sphere shown in 3D like the cube and cone, with a light patch and a shadow underneath.',
    draw: () => [
      ellipse(60, 108, 36, 6, P.stone, { ns: true }),
      circle(60, 56, 46, P.blue), patch('M60 102A46 46 0 0 0 106 56Q98 88 60 94Q30 94 18 78A46 46 0 0 0 60 102Z', P.navy),
      ellipse(44, 38, 16, 11, P.sky, { ns: true, t: 'rotate(-35 44 38)' }), circle(60, 56, 46),
    ],
  },
  {
    word: 'ARROW', meaning: 'an arrow sign', alt: 'A thick blue arrow pointing to the right.',
    draw: () => [path('M8 46H64V22L112 60L64 98V74H8Z', P.blue)],
  },
  {
    word: 'SPIRAL', meaning: 'a spiral', alt: 'A purple spiral line curling out from the centre.',
    draw: () => {
      let d = 'M60 60';
      for (let a = 0; a <= 4.2 * Math.PI; a += 0.2) { const r = 3 + a * 3.6; d += `L${(60 + r * Math.cos(a)).toFixed(1)} ${(60 + r * Math.sin(a)).toFixed(1)}`; }
      return [path(d, undefined, { stroke: P.ink, sw: 12 }), path(d, undefined, { stroke: P.purple, sw: 7 })];
    },
  },
];
