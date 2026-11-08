import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
// Read the literal exported ID arrays used by LibraryScreen's typed router.
function ids(path, name) {
  const source = readFileSync(path, 'utf8');
  const match = source.match(new RegExp(`export const ${name}[^=]*=\\s*(\\[[\\s\\S]*?\\])`));
  if (!match) throw new Error(`Cannot read ${path}:${name}`);
  return JSON.parse(match[1].replace(/,\s*]/g, ']'));
}
export function destinationErrors(items) {
  const itemIds = new Set(items.map(i => i.id));
  const legacy = new Set([...readFileSync('src/explore/content.ts', 'utf8').matchAll(/topic\(\s*"([a-z-]+)"/g)].map(m => m[1]));
  // TOPICS is authored as makeTopic calls with the stable ID first.
  const provenance = JSON.parse(readFileSync('content/library/legacy-provenance.json', 'utf8'));
  Object.keys(provenance).forEach(id => legacy.add(id));
  const games = new Set([
    ...ids('src/games/index.ts', 'gameIds'), ...ids('src/learn/generated/ids.ts', 'learnIds'),
    ...ids('src/board/index.ts', 'boardIds'), ...ids('src/arcade/types.ts', 'arcadeIds'),
    ...ids('src/state/activities.ts', 'activityIds'),
  ]);
  const engines = new Set([...readFileSync('src/library/navigation.ts', 'utf8').matchAll(/"([a-z-]+)":\s*"(?:oceans|weather|space)"/g)].map(m => m[1]));
  const errors = [];
  for (const item of items) {
    if (item.type === 'exhibit' && !engines.has(item.model.engine)) errors.push(`${item.id}: unsupported exhibit engine ${item.model.engine}`);
    for (const link of item.links) {
      const valid = link.kind === 'item' ? itemIds.has(link.target) : link.kind === 'legacy-topic' ? legacy.has(link.target) : link.kind === 'game' ? games.has(link.target) : link.kind === 'make' && link.target === 'wonder-page';
      if (!valid) errors.push(`${item.id}: dangling ${link.kind} destination ${link.target}`);
      const destination = items.find(i => i.id === link.target);
      if (link.kind === 'item' && destination?.type === 'collection') errors.push(`${item.id}: collection is not an openable item ${link.target}`);
    }
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const items = JSON.parse(readFileSync('content/library/items.json', 'utf8'));
  const errors = destinationErrors(items);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`All ${items.reduce((n, i) => n + i.links.length, 0)} typed links and ${items.filter(i => i.type === 'exhibit').length} exhibit engines resolve.`);
}
