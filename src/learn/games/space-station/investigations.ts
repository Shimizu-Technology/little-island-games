/**
 * Star Station investigations (SC-09) on the K6 inquiry kit. Seeded, so a saved round rebuilds exactly.
 *
 * Levels rise by what the inquiry asks, not by bigger numbers:
 * 1 predict from a picture; 2 predict from a position in an orbit; 3 compare against a reference and sort into
 * groups; 4 fair tests and a mystery world found from evidence; 5 two conditions at once, with an eclipse check.
 * Every sentence names the model; every number comes from ./model.
 *
 * At Levels 4–5 no habit may stand in for reasoning (tests/s1a-habits.test.ts): the order of the four investigations,
 * the order of prediction tiles and plan options, and the place and length rank of the right reason are all seeded
 * and independent of the answer, and each answer varies from round to round.
 */
import type { Investigation } from "../../inquiry/engine";
import {
  eclipseAt, eclipses, leanings, masses, minutes, moonPaths, moonPlaces, moonSpots, moonViewAt, moonViews, newtons,
  planetSize, planets, seasonAt, seasons, sky, skyAt, tilts, turns, versusEarth, versusEarthAt, visibleMoonPercent, weight, worlds,
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

/**
 * Reasons for the top rungs. The right reason is the longest, the middle or the shortest of the three equally often
 * (by letters, and by words where they differ), and lands in any place, so neither a length nor a position habit
 * finds it. `rights` and `wrongs` are pools of plausible wordings with different lengths.
 */
function balancedWhy(prompt: string, rights: readonly string[], wrongs: readonly string[], pick: (n: number) => number) {
  const target = pick(3);
  const rank = (values: number[]) => values.filter((n) => n > values[0]).length;
  const sets: string[][] = [], close: string[][] = [];
  for (const right of rights) for (let i = 0; i < wrongs.length; i++) for (let j = i + 1; j < wrongs.length; j++) {
    const set = [right, wrongs[i], wrongs[j]], letters = set.map((t) => t.length), words = set.map((t) => t.split(" ").length);
    if (new Set(letters).size < 3 || rank(letters) !== target) continue;
    (new Set(words).size < 3 || rank(words) === target ? sets : close).push(set);
  }
  const pool = sets.length ? sets : close;
  const [right, ...wrong] = pool.length ? pool[pick(pool.length)] : [rights[0], wrongs[0], wrongs[1]];
  return why(prompt, right, wrong, pick);
}
/** Prediction tiles in a seeded order, so a tile's place says nothing about the answer. */
function seededOutcomes(labels: readonly string[], pick: (n: number) => number) {
  const order = shuffled(labels.map((_, i) => i), pick);
  return { outcomes: order.map((i) => labels[i]), at: (model: number) => order.indexOf(model) };
}
/** Plan options in a seeded order; `model` maps a shown position back to the model's value. */
function seededOptions(labels: readonly string[], pick: (n: number) => number) {
  const order = shuffled(labels.map((_, i) => i), pick);
  return { options: order.map((i) => labels[i]), model: (shown: number) => order[shown], shown: (model: number) => order.indexOf(model) };
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
    question: `The island began facing the Sun. Then Earth made a ${turns[turn]}. What will the island have now?`,
    controls: turnControl(true), start: [turn], outcomes: sky,
    observe: ([t]) => ({ outcome: skyAt(t), reading: `The island is in ${sky[skyAt(t)].toLowerCase()} in this model.` }),
    explain: why("Why?", reasons[skyAt(turn)][0], reasons[skyAt(turn)][1], r),
    clue: "Find the island's dot. Is it on the side of Earth that faces the Sun?", rule,
  });
  const reach = (key: string, want: number, start: number): Investigation => ({
    key, kind: "reach", title: want === 1 ? "Bring the night" : "Bring the day",
    question: `The island began facing the Sun. How far should Earth turn to give the island ${sky[want].toLowerCase()}?`,
    controls: turnControl(false), start: [start], outcomes: sky, want,
    observe: ([t]) => ({ outcome: skyAt(t), reading: `The island is in ${sky[skyAt(t)].toLowerCase()} in this model.` }),
    explain: why("Why did that work?", reasons[want][0], reasons[want][1], r),
    clue: "Which way does the island face after each turn?", rule,
  });
  // The first prediction is always the night case: the Sun keeps shining while the island faces away.
  const edge = r(2) === 0 ? 1 : 3, want = r(2);
  return [
    observe("day-night-a", 2),
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
    // No tolerance band: whichever circle is wider in the model is wider, however close the two are.
    const outcomes = [`${planets[a]} is wider`, `${planets[b]} is wider`, "The same width"];
    const result = (x: number, y: number) => (planetSize[x] === planetSize[y] ? 2 : planetSize[x] > planetSize[y] ? 0 : 1);
    return {
      key, kind: "observe", title: "Size pair",
      question: `${planets[a]} and ${planets[b]} go side by side in the size model. Which circle will be wider?`,
      controls: [{ name: "Left", options: planets, fixed: true }, { name: "Right", options: planets, fixed: true }], start: [a, b], outcomes,
      observe: ([x, y]) => ({ outcome: result(x, y), reading: `${outcomes[result(x, y)]} in the size model.` }),
      explain: near
        ? why("Why?", "They are close in size, but one circle is a little wider", ["Planets next to each other are always the same", "The farther planet is always smaller"], r)
        : why("Why?", "Giant outer planets are much wider than rocky inner planets", ["Planets closer to the Sun are always bigger", "All the planets are the same size"], r),
      clue: "Is each planet a rocky inner planet or a giant outer planet? If both are the same kind, compare closely.", rule,
    };
  };
  const find = (key: string, want: number, offer: number[]): Investigation => ({
    key, kind: "reach", title: want === 3 ? "Find a giant" : "Find a small world",
    question: `Choose a planet whose circle is ${want === 3 ? "more than twice as wide as" : "narrower than"} Earth's in the size model.`,
    controls: [{ name: "Planet", options: offer.map((p) => planets[p]) }], start: [0], outcomes: versusEarth, want,
    observe: ([i]) => ({ outcome: versusEarthAt(offer[i]), reading: `${planets[offer[i]]}: ${versusEarth[versusEarthAt(offer[i])].toLowerCase()} in the size model.` }),
    explain: want === 3
      ? why("Why does it count?", "It is one of the giant outer planets", ["It is the closest planet to the Sun", "It is a rocky inner planet"], r)
      : why("Why does it count?", "It is a rocky inner planet smaller than Earth", ["It is one of the giant outer planets", "It is farther out than Neptune"], r),
    clue: "Compare each planet with Earth's circle.", rule,
  });
  const innerPlanet = r(4), outerPlanet = 4 + r(4);
  const near = r(2) === 0 ? [1, 2] : [6, 7], [n1, n2] = r(2) === 0 ? near : [near[1], near[0]];
  const giantFirst = r(2) === 0;
  const [left, right] = r(2) === 0 ? [innerPlanet, outerPlanet] : [outerPlanet, innerPlanet];
  // A giant search offers one giant; a small search offers Venus and one of Mercury or Mars, both of which count.
  // The plan never starts on a planet that answers.
  const giant = 4 + r(4), small = [0, 3][r(2)];
  const giantOffer = shuffled([giant, 2, 1, [0, 3][r(2)]], r), smallOffer = shuffled([small, 2, 1, 4 + r(4)], r);
  const startOff = (offer: number[], answers: (p: number) => boolean) => {
    const first = offer.findIndex((p) => !answers(p));
    return [...offer.slice(first), ...offer.slice(0, first)];
  };
  const giantFind = find("planets-c", 3, startOff(giantOffer, (p) => versusEarthAt(p) === 3));
  const smallFind = find("planets-c", 0, startOff(smallOffer, (p) => versusEarthAt(p) === 0));
  return [
    pair("planets-a", left, right, false),
    pair("planets-b", n1, n2, true),
    giantFirst ? giantFind : smallFind,
    { ...(giantFirst ? smallFind : giantFind), key: "planets-d" },
  ];
}

function gravityLab(seed: number): Investigation[] {
  const r = stream(seed, 4);
  const rule = "In this model weight is mass × gravity. Approximate gravity: Earth 9.81, Moon 1.62, Mars 3.71, Jupiter 23.1 m/s². Mass stays the same on every world. Jupiter has no solid surface; this is a model scale.";
  const massControl = (fixed: boolean) => ({ name: "Mass (kg)", options: masses.map(String), fixed });
  const reading = (m: number, w: number) => `${masses[m]} kg on ${worlds[w]}: ${newtons(weight(masses[m], w))}.`;

  // Heavier or lighter than on Earth, equally often.
  const away = r(2) === 0 ? 3 : 1 + r(2), more = away === 3, m1 = r(5);
  const travelTiles = seededOutcomes(["More than on Earth", "The same as on Earth", "Less than on Earth"], r);
  const travel: Investigation = {
    key: "gravity-a", kind: "observe", title: "Same crate, new world",
    question: `A ${masses[m1]} kg crate weighs ${newtons(weight(masses[m1], 0))} on Earth. Then it goes to ${worlds[away]}. How will its weight compare?`,
    controls: [massControl(true), { name: "World", options: worlds, fixed: true }], start: [m1, away], outcomes: travelTiles.outcomes,
    observe: ([m, w]) => ({ outcome: travelTiles.at(weight(masses[m], w) > weight(masses[m], 0) ? 0 : weight(masses[m], w) === weight(masses[m], 0) ? 1 : 2), reading: reading(m, w) }),
    explain: more
      ? balancedWhy("Why?", ["Stronger pull there", "Gravity there pulls harder on the same mass", "Stronger gravity there makes the same mass weigh more"],
        ["Mass changed", "Gravity there pulls less on the same mass", "The crate's mass changed on the trip", "Weight stays the same on every world",
          "The crate picked up extra kilograms while it travelled through space"], r)
      : balancedWhy("Why?", ["Weaker pull there", "Gravity there pulls less on the same mass", "Weaker gravity there makes the same mass weigh less"],
        ["Mass changed", "Gravity there pulls harder on the same mass", "The crate lost some of its mass", "Weight stays the same on every world",
          "The crate gets lighter because it is much farther away from the Sun"], r),
    clue: "Mass stays the same. Which world's gravity is stronger?", rule,
  };

  // A fair test for heavier or lighter. Half the time the plan starts on another world, so it must be put back.
  const heavier = r(2) === 0, home = r(4), m0 = 1 + r(3);
  const fairWorlds = seededOptions(worlds, r);
  const startWorld = r(2) === 0 ? home : (home + 1 + r(3)) % 4;
  const fair: Investigation = {
    key: "gravity-b", kind: "reach", title: "Plan a fair test",
    question: `On ${worlds[home]} a ${masses[m0]} kg crate weighs ${newtons(weight(masses[m0], home))}. Plan a fair test: does a ${heavier ? "heavier crate weigh more" : "lighter crate weigh less"}?`,
    controls: [massControl(false), { name: "World", options: fairWorlds.options }], start: [m0, fairWorlds.shown(startWorld)],
    outcomes: ["Not fair: the world changed", "Nothing changed", "Lighter crate, same world", "Heavier crate, same world"], want: heavier ? 3 : 2,
    observe: ([m, shown]) => {
      const w = fairWorlds.model(shown);
      return { outcome: w !== home ? 0 : m === m0 ? 1 : m < m0 ? 2 : 3, reading: reading(m, w) };
    },
    explain: balancedWhy("What does your fair test show?",
      heavier ? ["Only the mass changed", "Same world, more mass: the weight went up", "Only the mass changed, so the extra weight came from the extra mass"]
        : ["Only the mass changed", "Same world, less mass: the weight went down", "Only the mass changed, so the lost weight came from the lost mass"],
      ["Gravity changed", "Weight does not depend on mass", "A fair test changes everything at once", "Changing the world as well makes a test fairer",
        "Changing both the mass and the world at the same time is the fairest way to test"], r),
    clue: "A fair test changes one thing and keeps the rest the same as the crate in the question.", rule,
  };

  const mystery = 1 + r(3), mm = r(5), mysteryWorlds = seededOptions(worlds, r);
  const unknown: Investigation = {
    key: "gravity-c", kind: "reach", title: "Mystery world",
    question: `Our ${masses[mm]} kg crate weighs ${newtons(weight(masses[mm], mystery))} on the mystery world and ${newtons(weight(masses[mm], 0))} on Earth. Which world in our model pulls the same?`,
    controls: [massControl(true), { name: "World", options: mysteryWorlds.options }], start: [mm, mysteryWorlds.shown(0)],
    outcomes: ["Heavier than on the mystery world", "Same as on the mystery world", "Lighter than on the mystery world"], want: 1,
    observe: ([m, shown]) => {
      const w = mysteryWorlds.model(shown), here = weight(masses[m], w), there = weight(masses[mm], mystery);
      return { outcome: here > there ? 0 : here === there ? 1 : 2, reading: `${reading(m, w)} Mystery world: ${newtons(there)}.` };
    },
    given: newtons(weight(masses[mm], mystery)),
    explain: balancedWhy("How do you know?", ["Same weight, same pull", "Equal mass, equal weight: equal gravity", "Same mass and same weight means the same pull of gravity"],
      ["It is the biggest", "Any world gives the same weight", "Mass changes from world to world", "The heaviest reading is always the mystery world",
        "The mystery world has to be whichever planet is farthest from the Sun"], r),
    clue: "Compare the mystery weight with the Earth weight. Is the pull stronger or weaker than Earth's?", rule,
  };

  // Any two different worlds; the heavier one is first or second equally often.
  const a = r(4), b = (a + 1 + r(3)) % 4, m2 = r(5);
  const compareTiles = seededOutcomes([`Heavier on ${worlds[a]}`, `Heavier on ${worlds[b]}`, "The same on both"], r);
  const compare: Investigation = {
    key: "gravity-d", kind: "observe", title: "Two worlds",
    question: `The same ${masses[m2]} kg crate is weighed on ${worlds[a]} and on ${worlds[b]}. Where will it weigh more?`,
    controls: [massControl(true), { name: "First world", options: worlds, fixed: true }, { name: "Second world", options: worlds, fixed: true }], start: [m2, a, b],
    outcomes: compareTiles.outcomes,
    observe: ([m, x, y]) => ({ outcome: compareTiles.at(weight(masses[m], x) > weight(masses[m], y) ? 0 : weight(masses[m], x) === weight(masses[m], y) ? 2 : 1), reading: `${reading(m, x)} ${reading(m, y)}` }),
    explain: balancedWhy("Why?", ["Stronger gravity there", "Stronger gravity, same mass: more weight", "The world with stronger gravity pulls more on the same mass"],
      ["It is bigger", "Mass is lost on smaller worlds", "Weight does not depend on gravity", "The crate has more kilograms on that world",
        "The world that is closer to the Sun always makes a crate weigh more"], r),
    clue: "Same mass on both. Which world has the stronger gravity in the model?", rule,
  };
  return shuffled([travel, fair, unknown, compare], r);
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
    explain: balancedWhy("Why?", ["More AU, more minutes", "Every AU adds about 8.3 more minutes", "Each AU adds about the same time again, so the minutes grow with the distance"],
      ["Light stops after 1 AU", "Light speeds up far from the Sun", "Light reaches every distance at the same moment",
        "The minutes depend on how bright the Sun looks from the probe", "Far away, light slows down so much that the minutes stay the same at any distance"], r),
    clue: "How many AU away is the probe? Each AU takes the same time.",
    rule: "In this model light takes about 8.3 minutes for each AU. One AU is about the Earth–Sun distance. " + SPACE,
  };

  // No tilt, northern summer and northern winter, equally often.
  const tilt = r(3) === 0 ? 0 : 1, leaning = r(2), seasonTiles = seededOutcomes(seasons, r);
  const seasonRights = tilt === 0
    ? ["Neither half leans", "Without tilt, neither half leans toward the Sun", "With no tilt, both halves get sunlight at the same angle all year"]
    : leaning === 0
      ? ["Sunlight hits the north more directly", "North leans sunward, so its sunlight is more direct", "The northern half leans toward the Sun and gets more direct sunlight"]
      : ["Sunlight hits the north at a slant", "North leans away, so its sunlight is more slanted", "The northern half leans away from the Sun and gets less direct sunlight"];
  const season: Investigation = {
    key: "tilt-b", kind: "observe", title: "Tilted Earth",
    question: `Earth's axis is set to ${tilts[tilt]}° and ${tilt === 0 ? "does not lean" : leanings[leaning].replace("North", "north")}. What will the model show for the northern half?`,
    controls: [{ name: "Tilt", options: tilts.map((t) => `${t}°`), fixed: true }, { name: "Leaning", options: leanings, fixed: true }], start: [tilt, leaning], outcomes: seasonTiles.outcomes,
    observe: ([t, l]) => ({ outcome: seasonTiles.at(seasonAt(t, l)), reading: `${seasons[seasonAt(t, l)]} in this model.` }),
    explain: balancedWhy("Why?", seasonRights, ["The Sun gets hotter", "The Moon blocks some sunlight", "Earth gets much closer to the Sun",
      "Clouds cover the other half of Earth", "Earth spins faster in summer, so the days warm up more", "Summer comes when Earth is nearest the Sun in its orbit around it"], r),
    clue: "Which half of Earth leans toward the Sun, if any?",
    rule: "In this model the tilt dial rounds Earth's tilt (about 23.4°) to 23°. Tilt changes the angle of sunlight, giving opposite seasons in the two halves. " + SPACE,
  };

  // NASA: the Moon's orbit is tilted about 5°, so eclipses happen only near the nodes, in eclipse seasons.
  const eclipseRule = "In this model the Moon's orbit is tilted a little, so in most months the Moon passes above or below the Sun–Earth line and no eclipse happens. An eclipse happens only when the Moon is lined up near where its tilted path crosses that line. Never look at the Sun without approved protection. " + SPACE;
  const solarRights = ["Lined up, the Moon shaded Earth", "All three lined up, so the Moon's shadow fell on Earth", "The Moon was on the line between the Sun and Earth, so its shadow reached Earth"];
  const lunarRights = ["Lined up, Earth shaded the Moon", "All three lined up, so Earth's shadow covered the Moon", "Earth was on the line between the Sun and the Moon, so its shadow fell on the Moon"];
  const want = r(2);
  const places = seededOptions(moonPlaces, r), paths = seededOptions(moonPaths, r);
  const setups = [0, 1, 2].flatMap((place) => [0, 1].map((path) => [places.shown(place), paths.shown(path)]));
  const misses = setups.filter(([p, q]) => eclipseAt(places.model(p), paths.model(q)) !== want);
  const make: Investigation = {
    key: "eclipse-c", kind: "reach", title: want === 0 ? "Solar eclipse" : "Lunar eclipse",
    question: `Set up the model to make a ${want === 0 ? "solar" : "lunar"} eclipse.`,
    controls: [{ name: "Moon", options: places.options }, { name: "Moon's path", options: paths.options }], start: misses[r(misses.length)],
    outcomes: eclipses, want,
    observe: ([p, q]) => {
      const result = eclipseAt(places.model(p), paths.model(q));
      return { outcome: result, reading: `${eclipses[result]} in this model.` };
    },
    explain: balancedWhy("Why did that work?", want === 0 ? solarRights : lunarRights,
      want === 0
        ? ["The Moon passed above the Sun", "Earth's shadow fell on the Moon", "Every new Moon makes a solar eclipse", "The Moon's orbit stopped being tilted",
          "The Sun turned off for a moment while the Moon moved past it", "Earth's shadow covered the Sun because Earth was in the middle of the line"]
        : ["Clouds on Earth hid the Moon", "The Moon's shadow fell on Earth", "Every full Moon makes a lunar eclipse", "The Moon's orbit stopped being tilted",
          "The Moon turned its dark side toward Earth for the night", "The Moon's shadow blocked the sunlight before it could reach the Moon"], r),
    clue: "Which body must be in the middle? Is the Moon on the line, near where its tilted path crosses it?", rule: eclipseRule,
  };

  // The check's answer varies: a solar eclipse, a lunar eclipse or no eclipse, equally often.
  const answer = r(3), place = answer === 2 ? r(2) : answer, path = answer === 2 ? 1 : 0;
  const checkTiles = seededOutcomes(eclipses, r);
  const where = place === 0 ? "New Moon: the Moon is between the Sun and Earth" : "Full Moon: the Moon is behind Earth";
  const now = path === 0 ? "This month its tilted path crosses the Sun–Earth line right here." : "This month its tilted path passes above the Sun–Earth line here.";
  const checkRights = answer === 0 ? solarRights : answer === 1 ? lunarRights
    : place === 0
      ? ["Its shadow passed above Earth", "Above the line, the Moon's shadow missed Earth", "The Moon passed above the line, so its shadow went past Earth"]
      : ["It passed above Earth's shadow", "Above the line, it missed Earth's shadow", "The Moon passed above Earth's shadow, so sunlight still reached it"];
  const check: Investigation = {
    key: "eclipse-d", kind: "observe", title: "Eclipse check",
    question: `${where}. ${now} What will the model show?`,
    controls: [{ name: "Moon", options: moonPlaces, fixed: true }, { name: "Moon's path", options: moonPaths, fixed: true }], start: [place, path],
    outcomes: checkTiles.outcomes,
    observe: ([p, q]) => {
      const result = eclipseAt(p, q);
      return { outcome: checkTiles.at(result), reading: `${eclipses[result]} in this model${result === 2 ? ": the Moon passes above the line, so the shadow misses" : ""}.` };
    },
    explain: balancedWhy("Why?", checkRights,
      [place === 0 ? "Every new Moon makes a solar eclipse" : "Every full Moon makes a lunar eclipse", "The Sun was too far away", "The Moon gives off its own light",
        "The Moon's orbit stopped being tilted", "The Moon was too small to make any shadow at all this month", "Eclipses only happen in the daytime, when the Sun is up"], r),
    clue: "Two things matter: which body is in the middle, and whether the Moon is on the line right now.", rule: eclipseRule,
  };
  return shuffled([light, season, make, check], r);
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
export function investigations(level: number, seed: number): Investigation[] {
  return byLevel(level, seed);
}
