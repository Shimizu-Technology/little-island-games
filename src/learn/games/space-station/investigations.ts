/**
 * Star Station investigations (SC-09) on the K6 inquiry kit. Seeded, so a saved round rebuilds exactly.
 *
 * Levels rise by what the inquiry asks, not by bigger numbers:
 * 1 predict from a picture; 2 predict from a position in an orbit; 3 compare against a reference and sort into
 * groups; 4 fair tests and a mystery world found from evidence; 5 two conditions at once, with an eclipse twist.
 * Every sentence names the model; every number comes from ./model.
 */
import type { Investigation } from "../../inquiry/engine";
import {
  eclipseAt, eclipses, leanings, masses, minutes, moonPlaces, moonSpots, moonViewAt, moonViews, newtons, orbitLines,
  planetSize, planets, sameSize, seasonAt, seasons, sky, skyAt, tilts, turns, versusEarth, versusEarthAt, visibleMoonPercent, weight, worlds,
} from "./model";

/** A small seeded generator (LCG). Each investigation draws from its own stream so content stays stable. */
function stream(seed: number, salt: number) {
  let word = (seed ^ Math.imul(salt + 1, 2654435761)) >>> 0;
  return (n: number) => {
    word = (Math.imul(word, 1664525) + 1013904223) >>> 0;
    return (word >>> 8) % n;
  };
}
function shuffled<T>(items: readonly T[], pick: (n: number) => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = pick(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
/** Explanation choices in a seeded order; `answer` is where the reason that fits the model landed. */
function why(prompt: string, right: string, wrong: readonly string[], pick: (n: number) => number) {
  const choices = shuffled([right, ...wrong], pick);
  return { prompt, choices, answer: choices.indexOf(right) };
}

const SPACE = "Illustrative model: sizes and distances are not to scale.";

function dayNight(seed: number): Investigation[] {
  const r = stream(seed, 1);
  const rule = `In this model the half of Earth facing the Sun has day and the half facing away has night. The Sun keeps shining the whole time. ${SPACE}`;
  const reasons = [
    ["The island faced the Sun", ["The Moon lit up the island", "The Sun moved closer"]],
    ["The island faced away from the Sun", ["The Sun stopped shining", "A cloud covered the whole Sun"]],
    ["The island was at the edge of the sunlit half", ["The Sun was switching off", "The Moon was in the way"]],
  ] as const;
  const turnControl = (fixed: boolean) => [{ name: "Turn Earth", options: turns, fixed }];
  const observe = (key: string, turn: number): Investigation => ({
    key, kind: "observe", title: "Spin the Earth",
    question: `${turn === 0 ? "Earth stays as it is in the picture" : `Earth makes a ${turns[turn]} from the picture`}. What will the island have?`,
    controls: turnControl(true), start: [turn], outcomes: sky,
    observe: ([t]) => ({ outcome: skyAt(t), reading: `The island is in ${sky[skyAt(t)].toLowerCase()} in this model.` }),
    explain: why("Why?", reasons[skyAt(turn)][0], reasons[skyAt(turn)][1], r),
    clue: "Find the island's dot. Is it on the side of Earth that faces the Sun?", rule,
  });
  const reach = (key: string, want: number, start: number): Investigation => ({
    key, kind: "reach", title: want === 1 ? "Bring the night" : "Bring the day",
    question: `Turn Earth so the island has ${sky[want].toLowerCase()}. Plan your turn, then test it.`,
    controls: turnControl(false), start: [start], outcomes: sky, want,
    observe: ([t]) => ({ outcome: skyAt(t), reading: `The island is in ${sky[skyAt(t)].toLowerCase()} in this model.` }),
    explain: why("Why did that work?", reasons[want][0], reasons[want][1], r),
    clue: "Which way does the island face after each turn?", rule,
  });
  const first = r(2) === 0 ? 0 : 2, edge = r(2) === 0 ? 1 : 3, want = r(2);
  return [
    observe("day-night-a", first),
    reach("day-night-b", 1, 0),
    observe("day-night-c", edge),
    reach("day-night-d", want === 0 ? 0 : 1, want === 0 ? 2 : edge),
  ];
}

function moonPhases(seed: number): Investigation[] {
  const r = stream(seed, 2);
  const rule = "In this model the Sun always lights half of the Moon. As the Moon orbits Earth we see more or less of that lit half. Ordinary phases are not Earth's shadow. " + SPACE;
  const explain = () => why("Why does the Moon look this way?", "We see a different part of the Moon's sunlit half", ["Earth's shadow covers part of the Moon", "The Moon makes its own light"], r);
  const reading = (spot: number) => `${moonViews[moonViewAt(spot)]}: ${visibleMoonPercent(spot)}% of the side facing Earth is lit in this model.`;
  const observe = (key: string, spot: number): Investigation => ({
    key, kind: "observe", title: "Moon watch",
    question: `The Moon is at spot ${moonSpots[spot]} of its orbit. How will it look from Earth?`,
    controls: [{ name: "Moon spot", options: moonSpots, fixed: true }], start: [spot], outcomes: moonViews,
    observe: ([s]) => ({ outcome: moonViewAt(s), reading: reading(s) }),
    explain: explain(), clue: "Find where sunlight hits the Moon. How much of that lit half points toward Earth?", rule,
  });
  const want = r(2) === 0 ? 0 : 4;
  const reach: Investigation = {
    key: "moon-d", kind: "reach", title: want === 0 ? "Hide the Moon's light" : "Show the whole lit half",
    question: `Move the Moon so we see ${want === 0 ? "no lit part" : "the whole lit half"} from Earth.`,
    controls: [{ name: "Moon spot", options: moonSpots }], start: [2 + 4 * r(2)], outcomes: moonViews, want,
    observe: ([s]) => ({ outcome: moonViewAt(s), reading: reading(s) }),
    explain: explain(), clue: "Look at which side of the Moon the Sun lights, and where Earth is.", rule,
  };
  return [
    observe("moon-a", [0, 4][r(2)]),
    observe("moon-b", [1, 3, 5, 7][r(4)]),
    observe("moon-c", [2, 6][r(2)]),
    reach,
  ];
}

function planetSizes(seed: number): Investigation[] {
  const r = stream(seed, 3);
  const rule = "In the planet size model, circle widths compare planet diameters. Mercury, Venus, Earth and Mars are the rocky inner planets; Jupiter, Saturn, Uranus and Neptune are the giant outer planets. " + SPACE;
  const pair = (key: string, a: number, b: number, near: boolean): Investigation => {
    const outcomes = [`${planets[a]} is wider`, `${planets[b]} is wider`, "About the same width"];
    const result = (x: number, y: number) => sameSize(x, y) ? 2 : (planetSize[x] > planetSize[y] ? 0 : 1);
    return {
      key, kind: "observe", title: "Size pair",
      question: `${planets[a]} and ${planets[b]} go side by side in the size model. Which circle will be wider?`,
      controls: [{ name: "Left", options: planets, fixed: true }, { name: "Right", options: planets, fixed: true }], start: [a, b], outcomes,
      observe: ([x, y]) => ({ outcome: result(x, y), reading: `${outcomes[result(x, y)]} in the size model.` }),
      explain: near
        ? why("Why?", "Their model widths differ by less than one tenth", ["Planets next to each other are always the same", "The farther planet is always smaller"], r)
        : why("Why?", "Giant outer planets are much wider than rocky inner planets", ["Planets closer to the Sun are always bigger", "All the planets are the same size"], r),
      clue: "Is each planet a rocky inner planet or a giant outer planet?", rule,
    };
  };
  const find = (key: string, want: number, offer: number[]): Investigation => ({
    key, kind: "reach", title: want === 3 ? "Find a giant" : "Find a small world",
    question: `Choose a planet whose circle is ${want === 3 ? "more than twice as wide as" : "narrower than"} Earth's in the size model.`,
    controls: [{ name: "Planet", options: offer.map((p) => planets[p]) }], start: [0], outcomes: versusEarth, want,
    observe: ([i]) => ({ outcome: versusEarthAt(offer[i]), reading: `${planets[offer[i]]}: ${versusEarth[versusEarthAt(offer[i])].toLowerCase()} in the size model.` }),
    explain: want === 3
      ? why("Why does it count?", "It is one of the giant outer planets", ["It is the closest planet to the Sun", "It is a rocky inner planet"], r)
      : why("Why does it count?", "It is a small rocky inner planet", ["It is one of the giant outer planets", "It is farther out than Neptune"], r),
    clue: "Compare each planet with Earth's circle.", rule,
  });
  const innerPlanet = r(4), outerPlanet = 4 + r(4);
  const near = r(2) === 0 ? [1, 2] : [6, 7], [n1, n2] = r(2) === 0 ? near : [near[1], near[0]];
  const giantFirst = r(2) === 0;
  const [left, right] = r(2) === 0 ? [innerPlanet, outerPlanet] : [outerPlanet, innerPlanet];
  // Offer one planet that answers and three that do not, never starting on the answer.
  const giant = 4 + r(4), small = [0, 3][r(2)];
  const giantOffer = shuffled([giant, 2, 1, [0, 3][r(2)]], r), smallOffer = shuffled([small, 2, 1, 4 + r(4)], r);
  const startOff = (offer: number[], answer: number) => offer.indexOf(answer) === 0 ? [...offer.slice(1), offer[0]] : offer;
  return [
    pair("planets-a", left, right, false),
    pair("planets-b", n1, n2, true),
    giantFirst ? find("planets-c", 3, startOff(giantOffer, giant)) : find("planets-c", 0, startOff(smallOffer, small)),
    giantFirst ? find("planets-d", 0, startOff(smallOffer, small)) : find("planets-d", 3, startOff(giantOffer, giant)),
  ];
}

function gravityLab(seed: number): Investigation[] {
  const r = stream(seed, 4);
  const rule = "In this model weight is mass × gravity. Approximate gravity: Earth 9.81, Moon 1.62, Mars 3.71, Jupiter 23.1 m/s². Mass stays the same on every world. Jupiter has no solid surface; this is a model scale.";
  const massControl = (fixed: boolean) => ({ name: "Mass", options: masses.map((m) => `${m} kg`), fixed });
  const worldControl = (fixed: boolean) => ({ name: "World", options: worlds, fixed });
  const reading = (m: number, w: number) => `${masses[m]} kg on ${worlds[w]}: ${newtons(weight(masses[m], w))}.`;
  // Two observe answers that differ, so no fixed guess can be right every time.
  const away = r(3) + 1, more = away === 3;
  const m1 = r(5);
  const travel: Investigation = {
    key: "gravity-a", kind: "observe", title: "Same crate, new world",
    question: `A ${masses[m1]} kg crate weighs ${newtons(weight(masses[m1], 0))} on Earth. Then it goes to ${worlds[away]}. How will its weight compare?`,
    controls: [massControl(true), worldControl(true)], start: [m1, away], outcomes: ["More than on Earth", "The same as on Earth", "Less than on Earth"],
    observe: ([m, w]) => ({ outcome: weight(masses[m], w) > weight(masses[m], 0) ? 0 : weight(masses[m], w) === weight(masses[m], 0) ? 1 : 2, reading: reading(m, w) }),
    explain: why("Why?", more ? "Gravity there pulls more on the same mass" : "Gravity there pulls less on the same mass",
      [more ? "Gravity there pulls less on the same mass" : "Gravity there pulls more on the same mass", "The crate's mass changed on the trip"], r),
    clue: "Mass stays the same. Which world's gravity is stronger?", rule,
  };
  const home = r(4), m0 = r(4);
  const fair: Investigation = {
    key: "gravity-b", kind: "reach", title: "Plan a fair test",
    question: `On ${worlds[home]} a ${masses[m0]} kg crate weighs ${newtons(weight(masses[m0], home))}. Plan a fair test: does a heavier crate weigh more?`,
    controls: [massControl(false), worldControl(false)], start: [m0, home],
    outcomes: ["Not fair: the world changed", "Nothing changed", "Lighter crate, same world", "Heavier crate, same world"], want: 3,
    observe: ([m, w]) => ({ outcome: w !== home ? 0 : m === m0 ? 1 : m < m0 ? 2 : 3, reading: reading(m, w) }),
    explain: why("What does your fair test show?", "Only the mass changed, so the extra weight came from the extra mass", ["Changing the world as well makes a test fairer", "A fair test changes everything at once"], r),
    clue: "A fair test changes one thing and keeps the rest the same.", rule,
  };
  const mystery = 1 + r(3), mm = r(5);
  const unknown: Investigation = {
    key: "gravity-c", kind: "reach", title: "Mystery world",
    question: `Mystery world! Our ${masses[mm]} kg crate weighs ${newtons(weight(masses[mm], mystery))} there and ${newtons(weight(masses[mm], 0))} on Earth. Which world in our model pulls the same?`,
    controls: [massControl(true), worldControl(false)], start: [mm, 0],
    outcomes: ["Heavier than on the mystery world", "Same as on the mystery world", "Lighter than on the mystery world"], want: 1,
    observe: ([m, w]) => {
      const here = weight(masses[m], w), there = weight(masses[mm], mystery);
      return { outcome: here > there ? 0 : here === there ? 1 : 2, reading: `${reading(m, w)} Mystery world: ${newtons(there)}.` };
    },
    given: newtons(weight(masses[mm], mystery)),
    explain: why("How do you know?", "Same mass and same weight means the same pull of gravity", ["The heaviest reading is always the mystery world", "Mass changes from world to world"], r),
    clue: "Compare the mystery weight with the Earth weight. Is the pull stronger or weaker than Earth's?", rule,
  };
  // Compare two worlds other than Earth. Its answer index differs from the first one's.
  const pairs: [number, number][] = [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2]];
  const options = pairs.filter(([a, b]) => (weight(12, a) > weight(12, b) ? 0 : 1) !== (more ? 0 : 2));
  const [a, b] = options[r(options.length)], m2 = r(5);
  const compare: Investigation = {
    key: "gravity-d", kind: "observe", title: "Two worlds",
    question: `The same ${masses[m2]} kg crate is weighed on ${worlds[a]} and on ${worlds[b]}. Where will it weigh more?`,
    controls: [massControl(true), { name: "First world", options: worlds, fixed: true }, { name: "Second world", options: worlds, fixed: true }], start: [m2, a, b],
    outcomes: [`Heavier on ${worlds[a]}`, `Heavier on ${worlds[b]}`, "The same on both"],
    observe: ([m, x, y]) => ({ outcome: weight(masses[m], x) > weight(masses[m], y) ? 0 : weight(masses[m], x) === weight(masses[m], y) ? 2 : 1, reading: `${reading(m, x)} ${reading(m, y)}` }),
    explain: why("Why?", "The world with stronger gravity pulls more on the same mass", ["The crate has more kilograms on that world", "Mass is lost on smaller worlds"], r),
    clue: "Same mass on both. Which world has the stronger gravity in the model?", rule,
  };
  return [travel, fair, unknown, compare];
}

function lightTiltEclipse(seed: number): Investigation[] {
  const r = stream(seed, 5);
  const au = 2 + r(4);
  const others = shuffled([1, au - 1, au + 1, 2 * au].filter((d, i, all) => d !== au && d >= 1 && d <= 10 && all.indexOf(d) === i), r).slice(0, 2);
  const distances = [au, ...others].sort((x, y) => x - y);
  const light: Investigation = {
    key: "light-a", kind: "observe", title: "Sunlight clock",
    question: `In this model sunlight takes ${minutes(1)} to cross 1 AU. A probe is ${au} AU from the Sun. About how long will sunlight take to reach it?`,
    controls: [{ name: "Distance", options: distances.map((d) => `${d} AU`), fixed: true }], start: [distances.indexOf(au)],
    outcomes: distances.map(minutes),
    observe: ([i]) => ({ outcome: i, reading: `At ${distances[i]} AU sunlight takes about ${minutes(distances[i])} in this model. Minutes are rounded.` }),
    explain: why("Why?", "Each AU adds about the same time again, so the minutes grow with the distance", ["Light reaches every distance at the same moment", "Light speeds up far from the Sun"], r),
    clue: "How many AU away is the probe? Each AU takes the same time.",
    rule: "In this model light takes about 8.3 minutes for each AU. One AU is about the Earth–Sun distance. " + SPACE,
  };
  // The twist's answer is always "No eclipse" (index 2). Keep one other answer elsewhere so no fixed guess wins.
  const leaning = r(2), tilt = r(3) === 0 && distances.indexOf(au) !== 2 ? 0 : 1;
  const season: Investigation = {
    key: "tilt-b", kind: "observe", title: "Tilted Earth",
    question: `Earth's axis is set to ${tilts[tilt]}° and ${tilt === 0 ? "does not lean" : leanings[leaning].toLowerCase()}. What will the model show for the northern half?`,
    controls: [{ name: "Tilt", options: tilts.map((t) => `${t}°`), fixed: true }, { name: "Leaning", options: leanings, fixed: true }], start: [tilt, leaning], outcomes: seasons,
    observe: ([t, l]) => ({ outcome: seasonAt(t, l), reading: `${seasons[seasonAt(t, l)]} in this model.` }),
    explain: tilt === 0
      ? why("Why?", "Without tilt, neither half leans toward the Sun", ["Earth gets much closer to the Sun", "The Sun gets hotter"], r)
      : why("Why?", leaning === 0 ? "The northern half leans toward the Sun and gets more direct sunlight" : "The northern half leans away and gets less direct sunlight",
        ["Earth gets much closer to the Sun", "The Sun gets hotter"], r),
    clue: "Which half of Earth leans toward the Sun, if any?",
    rule: "In this model the tilt dial rounds Earth's tilt (about 23.4°) to 23°. Tilt changes the angle of sunlight, giving opposite seasons in the two halves. " + SPACE,
  };
  const eclipseRule = "In this model an eclipse needs the Sun, Earth and Moon lined up. The Moon's orbit is tilted, so most months the shadow misses and there is no eclipse. Never look at the Sun without approved protection. " + SPACE;
  const want = r(2);
  const make: Investigation = {
    key: "eclipse-c", kind: "reach", title: want === 0 ? "Make a solar eclipse" : "Make a lunar eclipse",
    question: `Set up the model to make a ${want === 0 ? "solar" : "lunar"} eclipse.`,
    controls: [{ name: "Moon", options: moonPlaces }, { name: "Orbit", options: orbitLines }], start: [[2, want, 1 - want][r(3)], 1],
    outcomes: eclipses, want,
    observe: ([p, o]) => ({ outcome: eclipseAt(p, o), reading: `${eclipses[eclipseAt(p, o)]} in this model.` }),
    explain: want === 0
      ? why("Why did that work?", "All three lined up, so the Moon's shadow reached Earth", ["Earth's shadow fell on the Moon", "The tilted orbit helped the shadow"], r)
      : why("Why did that work?", "All three lined up, so Earth's shadow fell on the Moon", ["The Moon's shadow fell on Earth", "The tilted orbit helped the shadow"], r),
    clue: "Which body must be in the middle? Is the orbit lined up?", rule: eclipseRule,
  };
  const twistPlace = r(2);
  const twist: Investigation = {
    key: "eclipse-d", kind: "observe", title: "Eclipse surprise",
    question: `The Moon is ${twistPlace === 0 ? "between the Sun and Earth" : "behind Earth"} and its orbit is tilted. What will the model show?`,
    controls: [{ name: "Moon", options: moonPlaces, fixed: true }, { name: "Orbit", options: orbitLines, fixed: true }], start: [twistPlace, 1], outcomes: eclipses,
    observe: ([p, o]) => ({ outcome: eclipseAt(p, o), reading: `${eclipses[eclipseAt(p, o)]} in this model: the shadow misses.` }),
    explain: why("Why?", twistPlace === 0 ? "The tilted orbit carried the Moon's shadow past Earth" : "The tilted orbit carried the Moon past Earth's shadow",
      ["Eclipses happen every month", "The Moon was not near Earth"], r),
    clue: "Look at the orbit. Does the shadow line up with the next body?", rule: eclipseRule,
  };
  return [light, season, make, twist];
}

function byLevel(level: number, seed: number): Investigation[] {
  switch (level) {
    case 1: return dayNight(seed);
    case 2: return moonPhases(seed);
    case 3: return planetSizes(seed);
    case 4: return gravityLab(seed);
    default: return lightTiltEclipse(seed);
  }
}
/** A round whose reasons all sit in the same place would let a fixed tap pass; move the last one along. */
export function investigations(level: number, seed: number): Investigation[] {
  const qs = byLevel(level, seed), last = qs[qs.length - 1];
  if (!qs.every((q) => q.explain.answer === last.explain.answer)) return qs;
  const n = last.explain.choices.length, choices = [...last.explain.choices.slice(1), last.explain.choices[0]];
  return [...qs.slice(0, -1), { ...last, explain: { ...last.explain, choices, answer: (last.explain.answer + n - 1) % n } }];
}
