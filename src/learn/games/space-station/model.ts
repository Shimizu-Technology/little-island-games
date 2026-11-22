/**
 * Star Station's illustrative model. Every number a child sees in an investigation is computed here, from the
 * approximate values Star Station already uses (src/learn/games/weather-watch/model.ts). Nothing here is a forecast
 * or a measurement; sizes and distances are not to scale.
 */
import { gravity, lightMinutes, planets, visibleMoonPercent, weightNewtons } from "../weather-watch/model";
export { gravity, lightMinutes, planets, visibleMoonPercent };

/** Worlds in the same order as `gravity`. */
export const worlds = ["Earth", "Moon", "Mars", "Jupiter"] as const;
export const masses = [6, 12, 18, 24, 30] as const;
/** Weight in newtons, to one decimal place, as the scale shows it. */
export const weight = (mass: number, world: number) => Math.round(weightNewtons(mass, world) * 10) / 10;
export const newtons = (n: number) => `${n.toFixed(1)} N`;

/** Quarter turns of Earth from the picture where the island faces the Sun. */
export const turns = ["No turn", "¼ turn", "½ turn", "¾ turn"] as const;
export const sky = ["Daytime", "Nighttime", "Sunrise or sunset"] as const;
/** 0 day, 1 night, 2 on the edge between the lit and dark halves. */
export const skyAt = (turn: number) => (turn === 0 ? 0 : turn === 2 ? 1 : 2);

/** Moon spots around the orbit; spot 1 is between Earth and the Sun, spot 5 is opposite. */
export const moonSpots = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export const moonViews = ["No lit part", "A thin crescent", "Half lit", "Mostly lit", "Fully lit"] as const;
export function moonViewAt(spot: number) {
  const percent = visibleMoonPercent(spot);
  return percent === 0 ? 0 : percent === 100 ? 4 : percent === 50 ? 2 : percent < 50 ? 1 : 3;
}

/** Relative circle widths in the planet size model (Earth 3.2). The Sun and spacing are not to scale. */
export const planetSize = [1.2, 3, 3.2, 1.7, 35, 29, 13, 12] as const;
export const inner = (p: number) => p < 4;
/** Compared with Earth's circle in the size model. Any planet with a smaller circle is narrower; no tolerance band. */
export const versusEarth = ["Narrower than Earth", "Earth's own width", "Wider, less than twice", "More than twice as wide"] as const;
export function versusEarthAt(p: number) {
  const r = planetSize[p] / planetSize[2];
  return r < 1 ? 0 : r === 1 ? 1 : r < 2 ? 2 : 3;
}

export const tilts = [0, 23] as const;
export const leanings = ["North leans toward the Sun", "North leans away"] as const;
export const seasons = ["Northern summer", "Northern winter", "No seasons from tilt"] as const;
/** The tilt dial rounds Earth's tilt (about 23.4°) to 23°. */
export const seasonAt = (tilt: number, leaning: number) => (tilts[tilt] === 0 ? 2 : leaning === 0 ? 0 : 1);

/**
 * Eclipses. The Moon's orbit is always tilted a little against Earth's path around the Sun, so the model never offers
 * "untilted". The second condition is where the Moon is on its tilted path right now: crossing the Sun–Earth line
 * (near a node, in an eclipse season) or passing above or below it. Source: NASA, eclipse seasons and nodes.
 */
/** The line-up from the Sun: Moon in the middle (new Moon), Earth in the middle (full Moon), or the Moon to one side. */
export const moonPlaces = ["Sun, Moon, Earth", "Sun, Earth, Moon", "Off to the side"] as const;
export const moonPaths = ["Crosses the line", "Passes above or below"] as const;
export const eclipses = ["Solar eclipse", "Lunar eclipse", "No eclipse"] as const;
export const eclipseAt = (place: number, path: number) => (path === 1 || place === 2 ? 2 : place);

/** Light-time shown to one decimal place. */
export const minutes = (au: number) => `${lightMinutes(au).toFixed(1)} minutes`;
