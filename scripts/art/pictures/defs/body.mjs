import { P, circle, ellipse, rect, path, line, patch, eyes, group } from '../style.mjs';

const hand = fill => path('M38 112V74L22 54Q16 46 22 42Q28 38 34 46L42 56V20Q42 12 49 12Q56 12 56 20V50V12Q56 4 63 4Q70 4 70 12V50V16Q70 8 77 8Q84 8 84 16V54V28Q84 20 91 20Q98 20 98 28V78Q98 96 86 104V112Z', fill);

export default [
  {
    word: 'HAND', meaning: 'a hand', alt: 'An open hand with the palm facing you and five fingers spread.',
    draw: () => [hand(P.skin), line('M56 50V36M70 50V30M84 54V40', { stroke: P.skinDeep, sw: 2 }), path('M54 82Q66 90 80 82', undefined, { stroke: P.skinDeep, sw: 2 })],
  },
  {
    word: 'FOOT', meaning: 'a foot', alt: 'A bare foot seen from the side, with the ankle, a rounded heel, the arch and five toes.',
    draw: () => [
      path('M26 8H54V62Q60 74 80 80Q100 84 110 92Q116 100 108 106H34Q18 106 18 90Q18 76 24 64Z', P.skin),
      path('M18 92Q24 104 40 106', undefined, { stroke: P.skinDeep, sw: 2 }), path('M52 70Q46 76 50 82', undefined, { stroke: P.skinDeep, sw: 2 }),
      line('M90 92v12M98 94v12M104 98v8', { stroke: P.skinDeep, sw: 2 }), patch('M104 96q6 2 4 8h-4Z', P.pink),
    ],
  },
  {
    word: 'EYE', meaning: 'an eye', alt: 'A wide open eye with a green iris, a dark pupil and eyelashes.', basedOn: 'content/library/art/vision.svg',
    draw: () => [
      line('M30 30l-6-10M48 22l-2-12M72 22l2-12M90 30l6-10', { sw: 3 }),
      path('M9 60q51-60 102 0-51 60-102 0Z', P.paper), circle(60, 60, 24, P.leaf), circle(60, 60, 10, P.ink), circle(53, 53, 4, P.paper, { ns: true }),
    ],
  },
  {
    word: 'EAR', meaning: 'an ear', alt: 'A human ear seen from the side, with its curled outer rim and inner fold.', basedOn: 'content/library/art/hearing.svg',
    draw: () => [
      group({ t: 'translate(60 60) scale(1.15) translate(-56 -57)' },
        path('M36 95q-9-23-15-39-6-41 33-42 38 1 30 38-3 16-19 22-1 29-18 27Z', P.skin), path('M39 57q-15-29 10-30 25 1 14 23L49 63q-10 1-10 12', undefined), path('M30 56q2 26 10 34', undefined, { stroke: P.skinDeep, sw: 2 })),
    ],
  },
  {
    word: 'NOSE', meaning: 'a nose', alt: 'A nose seen from the front, with a rounded tip and two nostrils.',
    draw: () => [
      path('M48 10Q50 40 40 62Q20 74 22 92Q26 106 44 102Q52 108 60 108Q68 108 76 102Q94 106 98 92Q100 74 80 62Q70 40 72 10Z', P.skinDeep),
      ellipse(44, 92, 7, 5, P.brown), ellipse(76, 92, 7, 5, P.brown), patch('M56 30Q60 60 66 72Q58 70 54 44Z', P.skin),
    ],
  },
  {
    word: 'MOUTH', meaning: 'a mouth', alt: 'A wide open smiling mouth with pink lips, white top teeth and a red tongue.',
    draw: () => [
      path('M10 50Q60 30 110 50Q100 104 60 104Q20 104 10 50Z', P.coral), path('M20 54Q60 44 100 54Q92 92 60 94Q28 92 20 54Z', P.charcoal, { sw: 2 }),
      path('M22 54Q60 46 98 54L96 64Q60 58 24 64Z', P.paper, { sw: 2 }), line('M42 52V61M60 50V60M78 52V61', { sw: 1.5 }),
      path('M36 86Q44 70 60 72Q76 70 84 86Q74 94 60 94Q46 94 36 86Z', P.red, { sw: 2 }),
    ],
  },
  {
    word: 'TOOTH', meaning: 'a tooth', alt: 'A single white tooth with two roots and a shine on top.',
    draw: () => [
      path('M30 18Q44 8 60 18Q76 8 90 18Q106 30 100 56Q96 72 90 98Q86 112 78 108Q72 104 70 86Q66 72 60 72Q54 72 50 86Q48 104 42 108Q34 112 30 98Q24 72 20 56Q14 30 30 18Z', P.paper),
      patch('M32 30Q38 22 46 24Q38 30 38 42Z', P.sky),
    ],
  },
  {
    word: 'TONGUE', meaning: 'a tongue', alt: 'A face-less mouth sticking out a long pink tongue with a line down the middle.',
    draw: () => [
      path('M12 38Q60 18 108 38Q104 62 60 64Q16 62 12 38Z', P.coral), path('M22 40Q60 30 98 40Q92 54 60 56Q28 54 22 40Z', P.charcoal, { sw: 2 }),
      path('M36 46Q34 104 60 108Q86 104 84 46Q60 54 36 46Z', P.pink), line('M60 56V88', { stroke: P.coral, sw: 3 }),
    ],
  },
  {
    word: 'LIP', meaning: 'lips', alt: 'A pair of full red lips, closed, with a curved top and a rounded bottom lip.',
    draw: () => [
      path('M6 60Q30 30 50 36Q56 38 60 44Q64 38 70 36Q90 30 114 60Q90 96 60 96Q30 96 6 60Z', P.red),
      path('M6 60Q30 54 60 62Q90 54 114 60', undefined), patch('M30 68Q44 80 60 80Q48 74 36 66Z', P.coral), patch('M34 46Q42 40 50 42Q42 46 40 52Z', P.coral),
    ],
  },
  {
    word: 'ARM', meaning: 'an arm', alt: 'A whole arm reaching out from a short blue sleeve: shoulder, elbow, forearm and an open hand.',
    draw: () => [
      path('M30 40Q50 44 64 62L86 96L76 104L54 72Q42 60 28 58Z', P.skin),
      path('M84 92Q90 82 100 84L112 88Q116 90 112 94L104 94L114 100Q116 104 112 104L102 102L110 110Q110 114 104 112L94 106Q96 112 90 112Q80 108 76 102Z', P.skin),
      path('M52 66Q56 60 62 62', undefined, { stroke: P.skinDeep, sw: 2 }),
      path('M6 30Q6 18 18 18H30Q40 18 40 30V60Q40 66 34 66H12Q6 66 6 60Z', P.blue),
    ],
  },
  {
    word: 'LEG', meaning: 'a leg', alt: 'A whole bare leg standing straight, from a pair of shorts at the top down past the knee to the ankle and foot.',
    draw: () => [
      path('M44 18H70L68 50Q70 60 66 66L64 98Q78 100 94 102Q102 104 100 110Q98 114 90 114H52Q44 114 46 106L48 66Q44 58 46 50Z', P.skin),
      path('M48 58Q56 62 66 58', undefined, { stroke: P.skinDeep, sw: 2 }), line('M80 106v8M88 106v8M94 108v6', { stroke: P.skinDeep, sw: 1.5 }),
      rect(36, 4, 42, 22, 4, P.navy),
    ],
  },
  {
    word: 'FINGER', meaning: 'a finger', alt: 'A hand pointing to the side with one straight finger, the other fingers curled in.',
    draw: () => [
      path('M60 42H106Q114 42 114 50Q114 58 106 58H60Z', P.skin), patch('M100 45h6v10h-6Z', P.pink),
      path('M14 56Q14 42 28 42H66V100Q66 108 58 108H30Q14 108 14 92Z', P.skin),
      path('M66 58H76Q84 58 84 66Q84 74 76 74H66ZM66 74H74Q82 74 82 82Q82 90 74 90H66ZM66 90H72Q80 90 80 98Q80 106 72 106H62', P.skin),
      path('M22 44Q30 30 46 36L58 44', undefined, { stroke: P.skinDeep, sw: 2 }),
    ],
  },
  {
    word: 'THUMB', meaning: 'a thumb', alt: 'A closed fist with the thumb sticking straight up: a thumbs-up.',
    draw: () => [
      path('M28 54L32 14Q34 4 43 5Q52 6 50 18L48 50Z', P.skin), patch('M35 12q6-4 11 1l-1 6q-6-1-10-7Z', P.pink),
      path('M24 58Q24 48 36 48H90Q100 48 100 58V96Q100 112 82 112H40Q24 112 24 96Z', P.skin),
      path('M50 48H88Q96 48 96 56Q96 64 88 64H50M52 64H90Q98 64 98 72Q98 80 90 80H52M52 80H90Q98 80 98 88Q98 96 90 96H52', undefined, { stroke: P.skinDeep, sw: 2 }),
    ],
  },
  {
    word: 'BONE', meaning: 'a bone', alt: 'A white bone with knobby round ends, lying on a slant.', basedOn: 'content/library/art/bones.svg',
    draw: () => [
      group({ t: 'rotate(45 60 60) translate(60 60) scale(1.15) translate(-54 -56)' },
        path('M49 28q-18-8-15-17 4-11 15-3 11-8 15 3 3 9-6 17v51q18 8 15 17-4 11-15 3-11 8-15-3-3-9 6-17Z', P.paper)),
    ],
  },
  {
    word: 'BRAIN', meaning: 'a brain', alt: 'A pink brain seen from the side, with curvy folds all over it.',
    draw: () => [
      path('M20 62Q8 50 18 36Q20 18 40 18Q54 6 70 14Q88 8 98 24Q114 30 110 50Q116 66 102 74Q100 90 82 88Q76 98 60 94L50 104Q44 110 40 104L42 92Q24 92 22 78Q10 74 20 62Z', P.pink),
      path('M34 34Q44 26 52 34Q60 26 70 32M78 26Q94 26 96 40M24 56Q36 48 46 54Q56 62 70 54Q82 46 96 54M30 74Q42 66 54 74M66 72Q80 80 94 70M46 40Q42 48 50 50M80 38Q76 46 84 48', undefined, { stroke: P.coral, sw: 3 }),
    ],
  },
  {
    word: 'SKELETON', meaning: 'a skeleton', alt: 'A friendly white skeleton standing with arms out: skull, ribs, arms and legs made of bones.',
    draw: () => [
      ...[['M60 34V74'], ['M44 46L24 66L20 80'], ['M76 46L96 66L100 80'], ['M50 80L44 100L40 114'], ['M70 80L76 100L80 114']].map(([d]) => [line(d, { stroke: P.ink, sw: 8 }), line(d, { stroke: P.paper, sw: 3.5 })]).flat(),
      line('M44 46H76', { stroke: P.ink, sw: 8 }), line('M44 46H76', { stroke: P.paper, sw: 3.5 }),
      path('M46 52Q60 46 74 52M46 60Q60 54 74 60M48 68Q60 62 72 68', undefined, { stroke: P.ink, sw: 7 }), path('M46 52Q60 46 74 52M46 60Q60 54 74 60M48 68Q60 62 72 68', undefined, { stroke: P.paper, sw: 3 }),
      path('M46 76Q60 70 74 76L70 86H50Z', P.paper),
      path('M60 4Q76 4 76 18Q76 26 70 28V34H50V28Q44 26 44 18Q44 4 60 4Z', P.paper), circle(54, 17, 4, P.ink, { ns: true }), circle(66, 17, 4, P.ink, { ns: true }), line('M54 30V34M60 30V34M66 30V34', { sw: 1.5 }),
    ],
  },
  {
    word: 'FACE', meaning: 'a face', alt: 'A smiling round face with two eyes, rosy cheeks, a small nose, a big smile and two ears.',
    draw: () => [
      ellipse(14, 62, 7, 11, P.skin), ellipse(106, 62, 7, 11, P.skin),
      circle(60, 60, 48, P.skin),
      path('M34 40Q42 34 50 38M70 38Q78 34 86 40', undefined, { stroke: P.brown, sw: 3 }),
      eyes(44, 52, 76, 52, 5), circle(30, 72, 7, P.pink, { ns: true }), circle(90, 72, 7, P.pink, { ns: true }),
      path('M56 60Q60 72 64 60', undefined, { stroke: P.skinDeep, sw: 2.5 }), path('M38 80Q60 102 82 80Z', P.paper),
    ],
  },
];
