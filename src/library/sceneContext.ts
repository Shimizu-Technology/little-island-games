/** A collection is a browsing choice, not always the pictured habitat.
 * Keep aquatic animals and plants in the sea without changing their content category.
 */
const marinePictures = new Set([
  "turtle-breath",
  "turtles",
  "dolphins",
  "seagrass",
  "fish-gills",
  "parrotfish",
  "crab-shells",
  "jellyfish-move",
  "whale-song",
  "octopus",
  "plankton",
  "coral",
  "reef",
  "tide-pool",
  "deep-ocean",
  "trench",
]);
/** Shore pictures happen above the water line; an underwater scene would contradict them. */
const shorePictures = new Set(["salty", "tides", "waves", "beach-sand", "mangrove-roots"]);
export function sceneCategory(id: string, category: string): string {
  return marinePictures.has(id) ? "ocean" : shorePictures.has(id) ? "shore" : category;
}
/** Pictures that draw their own Sun or a single counted cloud keep the backdrop from adding another. */
const ownSun = new Set(["seasons", "blue-sky", "water-cycle"]);
const ownCloud = new Set(["clouds"]);
export const sceneDecor = (id: string) => ({ sun: !ownSun.has(id), cloud: !ownCloud.has(id) });
