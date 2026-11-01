import { roomIds } from "../catalogMore";
import type { RoomIndex, Scene, SceneState } from "./types";

/** Includes every world field, excluding navigation. A proposal is a transaction. */
export function worldRevision(state: SceneState): string {
  return JSON.stringify(state.rooms);
}
/** Contract bootstrap. Push 2 derives attachments, bounds and spatial buckets. */
export function buildScene(state: SceneState): Scene {
  const revision = worldRevision(state);
  const rooms = {} as Scene["rooms"];
  for (const room of roomIds) {
    rooms[room] = { room, revision, entities: {}, floor: [], surfaces: [], sockets: [], targets: [], buckets: {}, occlusionBands: [], hitProxies: [] } satisfies RoomIndex;
  }
  return { revision, entities: {}, rooms };
}
