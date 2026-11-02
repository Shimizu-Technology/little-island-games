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
export function sceneCategory(id: string, category: string): string {
  return marinePictures.has(id) ? "ocean" : category;
}
