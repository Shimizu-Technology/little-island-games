import { P, circle, ellipse, rect, path, poly, patch, group } from '../style.mjs';

export default [
  { word: 'CIRCLE', meaning: 'a circle', alt: 'A flat blue circle.', draw: () => [circle(60, 60, 48, P.blue)] },
  { word: 'SQUARE', meaning: 'a square', otherMeaning: 'a town square', alt: 'A flat red square with four equal sides.', draw: () => [rect(16, 16, 88, 88, 4, P.red)] },
  { word: 'TRIANGLE', meaning: 'a triangle', otherMeaning: 'the musical triangle', alt: 'A flat yellow triangle with three straight sides.', draw: () => [poly('60,10 112,104 8,104', P.yellow)] },
  { word: 'RECTANGLE', meaning: 'a rectangle', alt: 'A flat green rectangle, wider than it is tall.', draw: () => [rect(6, 32, 108, 56, 4, P.leaf)] },
  { word: 'DIAMOND', meaning: 'a diamond shape', otherMeaning: 'a diamond gem', alt: 'A flat purple diamond shape: a square standing on one corner.', draw: () => [poly('60,6 106,60 60,114 14,60', P.purple)] },
  { word: 'OVAL', meaning: 'an oval', alt: 'A flat teal oval, like a stretched circle.', draw: () => [ellipse(60, 60, 54, 32, P.sea)] },
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
    word: 'CYLINDER', meaning: 'a cylinder', alt: 'A solid green cylinder drawn like a maths shape, with a round top and a dashed line for its hidden back edge.',
    draw: () => [
      path('M24 24V94Q24 108 60 108Q96 108 96 94V24Z', P.leaf), path('M24 94Q24 80 60 80Q96 80 96 94', undefined, { stroke: P.forest, sw: 2.5, dash: '5 5' }),
      path('M24 24V94Q24 108 60 108Q96 108 96 94V24'), ellipse(60, 24, 36, 14, P.mint),
    ],
  },
  {
    word: 'SPHERE', meaning: 'a sphere (a solid round shape)', alt: 'A solid blue sphere drawn like a maths shape, with a dashed line around its middle, a light patch and a shadow underneath.',
    draw: () => [
      ellipse(60, 110, 36, 5, P.stone, { ns: true }),
      circle(60, 56, 48, P.blue), patch('M60 104A48 48 0 0 0 108 56Q100 90 60 96Q30 96 18 80A48 48 0 0 0 60 104Z', P.navy),
      ellipse(44, 36, 16, 11, P.sky, { ns: true, t: 'rotate(-35 44 36)' }),
      path('M12 56Q14 70 60 72Q106 70 108 56', undefined, { stroke: P.paper, sw: 2.5 }), path('M12 56Q14 42 60 40Q106 42 108 56', undefined, { stroke: P.paper, sw: 2.5, dash: '5 5' }),
      circle(60, 56, 48),
    ],
  },
  {
    word: 'ARROW', meaning: 'an arrow sign', alt: 'A thick blue arrow pointing to the right.',
    draw: () => [path('M8 46H64V22L112 60L64 98V74H8Z', P.blue)],
  },
  {
    word: 'SPIRAL', meaning: 'a spiral', alt: 'A flat purple spiral that winds evenly round and round from the middle out.',
    draw: () => {
      let d = 'M60 60';
      for (let a = 0.3; a <= 5.6 * Math.PI; a += 0.15) { const r = 2 + a * 2.85; d += `L${(60 + r * Math.cos(a)).toFixed(1)} ${(60 + r * Math.sin(a)).toFixed(1)}`; }
      return [path(d, undefined, { stroke: P.ink, sw: 11 }), path(d, undefined, { stroke: P.purple, sw: 6 })];
    },
  },
];
