import { MAX_INSTANCES, placedInstances, type HomeStateV2 } from '../model';
import { buildScene } from '../scene/graph';
import { resolve, type DropProposal } from '../scene/proposal';
export type CatalogSeed = { seed: HomeStateV2; revision: string };
export function catalogCommit(latest: HomeStateV2, catalog: CatalogSeed, id: string,
 proposal: DropProposal | undefined, _renderedRevision: string) {
 if (!proposal || proposal.kind === 'staging') return;
 // Scene IDs retain their capture room until apply assigns the final identity.
 const source = Object.entries(catalog.seed.rooms).flatMap(([room, value]) => value.instances.map(item => ({room, item})))
  .find(({room,item}) => `${room}/item/${item.id}` === id);
 if (!source || placedInstances(latest.rooms[proposal.room]).length >= MAX_INSTANCES) return;
 const room = source.room as keyof HomeStateV2['rooms'];
 const seed = { ...latest, rooms: { ...latest.rooms, [room]: { ...latest.rooms[room],
  instances: [...latest.rooms[room].instances, source.item] } } };
 const scene = buildScene(seed), subject = scene.entities[id];
 if (!subject) return;
 const resolved = resolve(scene.rooms[proposal.room], subject, proposal.contact,
  { scale: 1, release: true, catalog: true, avoidFurnitureOverlap: true });
 if (resolved.kind === 'staging') return;
 return { seed, proposal: resolved };
}
export function clearCatalogSeed(seeds: Record<string, CatalogSeed>, cleared: string | undefined, _active: string[]) {
 if (cleared) delete seeds[cleared];
}
