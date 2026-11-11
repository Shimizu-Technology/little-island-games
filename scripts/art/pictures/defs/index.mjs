import { group } from '../style.mjs';
import animals from './animals.mjs';
import sea from './sea.mjs';
import island from './island.mjs';
import food from './food.mjs';
import home from './home.mjs';
import play from './play.mjs';
import school from './school.mjs';
import clothes from './clothes.mjs';
import body from './body.mjs';
import weather from './weather.mjs';
import tools from './tools.mjs';
import vehicles from './vehicles.mjs';
import places from './places.mjs';
import plants from './plants.mjs';
import shapes from './shapes.mjs';

const groups = { animals, sea, island, food, home, play, school, clothes, body, weather, tools, vehicles, places, plants, shapes };
export const CATEGORIES = Object.keys(groups);

/** `fit: [scale, cx, cy]` scales a drawing about the centre of its measured bounds so it sits inside the frame. */
const fitted = ({ fit: [s, cx, cy], draw }) => () => [group({ t: `translate(60 60) scale(${s}) translate(${-cx} ${-cy})` }, draw())];

/** Every picture in dictionary order, with its category attached. */
export function definitions() {
  return Object.entries(groups).flatMap(([category, list]) => list.map(d => ({ ...d, id: d.id ?? d.word.toLowerCase(), category, draw: d.fit ? fitted(d) : d.draw })));
}
