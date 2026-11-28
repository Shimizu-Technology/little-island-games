import { compactAtmosphere, validAtmosphere } from "../atmosphere";
import { seasonalPacks } from "../seasonal";
import { familySlots } from "../family";
import { FRIDGE_RESTOCK_TARGET, FRIDGE_STAPLES, storageCapacity, storageOpen, STORAGE_FULL_MESSAGE } from '../storage';
import { decorSpec, itemSpec } from "../catalog";
import { locationIds as roomIds, tintIds } from "../catalogMore";
import { capabilityOf } from "../world";
import { floorPoint, itemPoint } from "../geometry";
import { MAX_INSTANCES, instance, owns, placedInstances, starterHome, validHome, validInstance } from "../model";
import { apply, resolve } from "./proposal";
import { panStoveOf } from "./pan";
import { panSeats } from "./panSeats";
import { buildScene, itemEntity, movingGroup } from "./graph";
import { characterEntityId, itemEntityId, roomPoint } from "./types";
import type { HomeAction, HomeResult, HomeStateV2, Ownership } from "../model";
import type { DropProposal } from "./proposal";
import type { RoomId } from "../catalogMore";

/** Stable reducer actions are input adapters. No action has its own placement rules. */
export function reduceSceneAction(save: HomeStateV2, action: HomeAction, ownership: Ownership): HomeResult {
  const roomId = action.roomId ?? save.current;
  const state = save.rooms[roomId];
  if (!state) return { state: save };
  const fail = (message: string): HomeResult => ({ state: save, message });
  const finish = (next: HomeStateV2): HomeResult =>
    validHome(next) ? { state: next } : fail("Your original room has been kept.");
  if (action.type === "atmosphere") {
    if (!validAtmosphere(action.atmosphere)) return fail("Choose a sky and weather.");
    const { atmosphere: _previous, ...base } = save; void _previous;
    const atmosphere = compactAtmosphere(action.atmosphere);
    if ((!atmosphere && !save.atmosphere) || (atmosphere?.timeOfDay === save.atmosphere?.timeOfDay && atmosphere?.weather === save.atmosphere?.weather)) return { state: save };
    return finish({ ...base, version: 4, ...(atmosphere ? { atmosphere } : {}) });
  }
  if (action.type === "seasonal-pack") {
    const pack = seasonalPacks.find(p => p.id === action.pack);
    if (!pack || !ownership.ownedWallpapers?.includes(pack.wallpaper)) return fail("A grown-up can open seasonal packs in Settings, too.");
    // Set the palette and mood, then use the ordinary placement engine for each new prop.
    // One history entry; an existing arrangement is never reset or duplicated.
    const { atmosphere: _previous, ...base } = save; void _previous;
    const atmosphere = compactAtmosphere(pack.atmosphere);
    let next: HomeStateV2 = { ...base, version: 4, ...(atmosphere ? { atmosphere } : {}), rooms: { ...save.rooms,
      [roomId]: { ...state, theme: { wallpaper: pack.wallpaper, floor: pack.floor } } } };
    for (const [n, item] of pack.items.entries()) {
      if (next.rooms[roomId].instances.some(i => i.item === item)) continue;
      const created = instance(`pack-${pack.id}-${item}`, item, [13, 10, 6][n], [5, 9, 9][n]);
      if (capabilityOf(item).toggle === "light") created.powered = true;
      const placed = reduceSceneAction(next, { type: "place", instance: created, roomId }, ownership);
      if (placed.state === next) return fail(placed.message ?? "Put something away to make room for these treasures.");
      next = placed.state;
    }
    return finish(next);
  }
  if (action.type === "apply-proposal") {
    if (action.proposal.refusal === "storage-capacity") return fail(STORAGE_FULL_MESSAGE);
    const candidate = action.proposal.item;
    const existing = roomIds.some((room) =>
      save.rooms[room].instances.some((item) => itemEntityId(room, item.id) === action.proposal.id)
    );
    if (
      candidate &&
      !existing &&
      (!owns(candidate.item, ownership) ||
        placedInstances(save.rooms[action.proposal.room]).length >= MAX_INSTANCES ||
        action.proposal.kind === "staging")
    )
      return fail("Put something away to make room.");
    const result = apply(save, action.proposal);
    return "state" in result ? result : { state: save, stale: true, message: "The room changed. Try that move again." };
  }
  if (action.type === "finish-action") {
    const characters = state.characters.map((c) => {
      if (c.slot !== action.slot || c.action === undefined) return c;
      const { action: completed, ...rest } = c;
      void completed;
      return rest;
    });
    return characters.every((c, i) => c === state.characters[i])
      ? { state: save }
      : finish({ ...save, version: 4, rooms: { ...save.rooms, [roomId]: { ...state, characters } } });
  }
  if (action.type === "cook") {
    // Only raw food still sitting on a lit stove cooks. A pan taken off the heat, a stove
    // turned off or food already cooked leaves the world exactly as it is (rule 49).
    const food = state.instances.find((i) => i.id === action.id);
    const grill = food?.on ? state.instances.find(i => i.id === food.on && i.item === "bbq-grill") : undefined;
    const stove = grill ?? (food && panSeats(state).has(food.id) ? panStoveOf(food, state.instances) : undefined);
    if (!food || food.powered || capabilityOf(food.item).edible !== "food" || !stove?.powered)
      return { state: save };
    const result = finish({ ...save, version: 4, rooms: { ...save.rooms, [roomId]: { ...state,
      instances: state.instances.map((i) => (i.id === food.id ? { ...i, powered: true } : i)) } } });
    return "message" in result ? result : { ...result, message: `The ${itemSpec(food.item).name.toLowerCase()} is cooked.` };
  }
  if (action.type === "restock-fridge") {
    const fridge = state.instances.find((i) => i.id === action.id && i.item === "fridge");
    if (!fridge) return { state: save };
    const capacity = storageCapacity("fridge");
    const targetCount = Math.min(FRIDGE_RESTOCK_TARGET, capacity);
    const inside = state.instances.filter((i) => i.in === fridge.id);
    if (inside.length >= targetCount || inside.length >= capacity) return { state: save };
    const presentItems = new Set(inside.map((i) => i.item));
    const usedIds = new Set(state.instances.map((i) => i.id));
    const added = [];
    for (const staple of FRIDGE_STAPLES) {
      if (inside.length + added.length >= targetCount) break;
      if (state.instances.length + added.length >= 256) break;
      if (presentItems.has(staple)) continue;
      let id = `fridge-${staple}`;
      let suffix = 1;
      while (usedIds.has(id)) id = `fridge-${staple}-${++suffix}`;
      usedIds.add(id);
      added.push({ ...instance(id, staple, fridge.x, fridge.y), in: fridge.id });
    }
    if (!added.length) return { state: save };
    const instances = state.instances
      .map((i) =>
        i.id === fridge.id
          ? { ...i, storage: { version: 1 as const, open: true }, powered: true, state: "active" as const }
          : i
      )
      .concat(added);
    const result = finish({ ...save, version: 4, rooms: { ...save.rooms, [roomId]: { ...state, instances } } });
    return "message" in result ? result : { ...result, message: "Fridge restocked." };
  }
  if (action.type === "refill-drink") {
    const drink = state.instances.find((i) => i.id === action.id);
    if (!drink || !drink.empty || capabilityOf(drink.item).edible !== "drink") return { state: save };
    const instances = state.instances.map((i) => {
      if (i.id !== drink.id) return i;
      const { empty: _empty, ...rest } = i;
      void _empty;
      return rest;
    });
    const result = finish({ ...save, version: 4, rooms: { ...save.rooms, [roomId]: { ...state, instances } } });
    return "message" in result ? result : { ...result, message: `Refilled ${itemSpec(drink.item).name.toLowerCase()}.` };
  }
  if (action.type === "room") {
    return roomIds.includes(action.room) && action.room !== save.current
      ? { state: { ...save, current: action.room } }
      : { state: save };
  }
  if (action.type === "reset") {
    const fresh = starterHome().rooms[roomId];
    const characters = state.characters.map(
      (c) =>
        fresh.characters.find((initial) => initial.slot === c.slot) ?? {
          slot: c.slot,
          anchor: "floor" as const,
          pose: "stand" as const,
          x: 2 + c.slot * 3,
          y: 8,
        }
    );
    const result = finish({ ...save, version: 4, rooms: { ...save.rooms, [roomId]: { ...fresh, characters } } });
    return result.state === save ? result : { ...result, snapshot: save };
  }
  if (action.type === "theme") {
    if (action.wallpaper && !["cream", "lagoon", ...(ownership.ownedWallpapers ?? [])].includes(action.wallpaper))
      return fail("Earn this room style through the badge tracks.");
    if (action.floor && !["sand", "honey", ...(ownership.ownedFloors ?? [])].includes(action.floor))
      return fail("Earn this room style through the badge tracks.");
    return finish({
      ...save,
      version: 4,
      rooms: {
        ...save.rooms,
        [roomId]: {
          ...state,
          theme: { wallpaper: action.wallpaper ?? state.theme.wallpaper, floor: action.floor ?? state.theme.floor },
        },
      },
    });
  }
  if (action.type === "find-friends") {
    let next = save;
    for (const slot of familySlots) {
      const source = roomIds.find((room) => next.rooms[room].characters.some((c) => c.slot === slot));
      if (!source) continue;
      next = reduceSceneAction(
        next,
        { type: "transfer", slot, roomId: source, room: roomId, x: 4 + (slot % 4) * 4, y: 9 },
        ownership
      ).state;
    }
    return { state: next };
  }
  const scene = buildScene(save);
  const index = scene.rooms[roomId];
  const commit = (proposal: DropProposal): HomeResult => {
    if (proposal.refusal === "storage-capacity") return fail(STORAGE_FULL_MESSAGE);
    const result = apply(save, proposal);
    return "state" in result ? { state: result.state } : fail("The room changed. Try that move again.");
  };
  if (action.type === "transfer" || action.type === "character") {
    const subject = index.entities[characterEntityId(action.slot)];
    if (!subject) return fail("Choose a friend in this room.");
    const destination: RoomId = action.type === "transfer" ? action.room : roomId;
    if (!roomIds.includes(destination)) return fail("Choose a room floor.");
    const targetIndex = scene.rooms[destination];
    const seatId = action.seatId;
    const seat = seatId
      ? itemEntityId(destination, seatId)
      : action.type === "character"
        ? Object.values(targetIndex.entities).find((e) => e.item?.item === action.anchor)?.id
        : undefined;
    const target = targetIndex.sockets.find(
      (t) =>
        t.owner === seat &&
        !!t.pet === (action.slot === 2) &&
        (!action.socketId || (t.attachment.kind === "socket" && t.attachment.socket === action.socketId))
    );
    const point = target?.contact ?? floorPoint(action.x ?? 8, action.y ?? 8);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return fail("Choose a floor spot.");
    // Cross-room indexes include the source group so a carried graph travels atomically.
    const combined = { ...targetIndex, entities: { ...scene.entities } };
    const proposal = resolve(combined, subject, roomPoint(point.x, point.y), {
      scale: 1,
      release: true,
      target: target?.id,
      floorOnly: !target && (action.type === "transfer" || action.anchor !== "seat"),
    });
    const result = commit(proposal);
    return action.type === "transfer" && result.state !== save
      ? { ...result, state: { ...result.state, current: destination } }
      : result;
  }
  if (action.type === "place" || action.type === "dispense") {
    const placedCount = placedInstances(state).length;
    if (placedCount >= MAX_INSTANCES) return fail("Put something away to make room.");
    const created = action.type === "place" ? action.instance : instance(action.id, action.item, 0, 0);
    if (!validInstance(created, false, true) || state.instances.some((i) => i.id === created.id))
      return fail("Choose an owned item.");
    if (action.type === "place" && !owns(created.item, ownership)) return fail("Choose an owned item.");
    if (action.type === "dispense") {
      const source = state.instances.find((i) => i.id === action.source);
      const cap = source && capabilityOf(source.item);
      if (
        !source ||
        !cap?.dispenses?.includes(action.item) ||
        (cap.toggle === "open" && !storageOpen(source))
      )
        return { state: save };
    }
    const subject = itemEntity(roomId, created, state.instances);
    const point =
      action.type === "dispense"
        ? roomPoint(action.x, action.y)
        : roomPoint(itemPoint(created, state.instances).x, itemPoint(created, state.instances).y);
    const target =
      action.type === "place" && action.target
        ? index.targets.find(
            (t) =>
              t.owner === characterEntityId(action.target!.slot) && t.kind === (action.target!.eat ? "mouth" : "hand")
          )
        : undefined;
    const proposal = resolve(index, subject, target?.contact ?? point, { scale: 1, release: true, target: target?.id });
    // A full Design room retains the catalog item as uncommitted; live objects use staging.
    if (proposal.kind === "staging") return fail("Put something away to make room.");
    return commit(proposal);
  }
  if (action.type === "use-item" || action.type === "release-held") {
    const character = state.characters.find((c) => c.slot === action.slot);
    const id = action.type === "use-item" ? action.id : character?.holding;
    const subject = id && index.entities[itemEntityId(roomId, id)];
    if (!subject || !character) return { state: save };
    const target =
      action.type === "use-item"
        ? index.targets.find(
            (t) => t.owner === characterEntityId(action.slot) && t.kind === (action.eat ? "mouth" : "hand")
          )
        : undefined;
    if (action.type === "use-item" && (!target || (action.eat ? !subject.body?.edible : !subject.body?.holdable)))
      return { state: save };
    const p = action.type === "release-held" ? floorPoint(action.x, action.y) : target!.contact;
    const proposal = resolve(index, subject, roomPoint(p.x, p.y), {
      scale: 1,
      release: true,
      target: target?.id,
      replaceHand: action.type === "use-item" && !action.eat,
    });
    return commit(proposal);
  }
  const entity = index.entities[itemEntityId(roomId, action.id)];
  if (!entity?.item) return fail("Choose an object first.");
  const item = entity.item;
  const spec = itemSpec(item.item);
  if (action.type === "put-away") {
    const children = movingGroup(index, entity)
      .slice(1)
      .filter((e) => e.attachment.kind !== "hand");
    let next = save;
    // Release descendants before removing the parent; each release uses the same engine.
    for (const child of children) {
      const prepared = buildScene(next);
      const currentIndex = prepared.rooms[roomId];
      const current = currentIndex.entities[child.id];
      if (!current || current.parent !== entity.id) continue;
      const result = apply(
        next,
        resolve(currentIndex, current, child.contact, { scale: 1, floorOnly: true, release: true })
      );
      if ("state" in result) next = result.state;
    }
    const room = next.rooms[roomId];
    return finish({
      ...next,
      version: 4,
      rooms: {
        ...next.rooms,
        [roomId]: {
          ...room,
          instances: room.instances.filter((i) => i.id !== item.id),
          characters: room.characters.map((c) => {
            if (c.holding !== item.id) return c;
            const { holding, ...rest } = c;
            void holding;
            return rest;
          }),
        },
      },
    });
  }
  if (action.type === "move" || action.type === "rotate" || action.type === "mirror") {
    if (action.type === "mirror" && !spec.mirror) return fail("This object stays this way round.");
    const replacement =
      action.type === "rotate"
        ? { ...item, rotation: spec.rotations[(spec.rotations.indexOf(item.rotation) + 1) % spec.rotations.length] }
        : action.type === "mirror"
          ? { ...item, mirrored: !item.mirrored }
          : action.type === "move"
            ? { ...item, at: undefined, x: action.x, y: action.y }
            : item;
    // A changed orientation is projected with its newly authored child/socket transforms.
    // The revision still names the original world; apply commits the entire group once.
    const transformed =
      action.type === "move"
        ? index
        : buildScene({
            ...save,
            rooms: {
              ...save.rooms,
              [roomId]: { ...state, instances: state.instances.map((i) => (i.id === item.id ? replacement : i)) },
            },
          }).rooms[roomId];
    const prepared = { ...transformed, revision: index.revision };
    const subject = action.type === "move" ? entity : prepared.entities[entity.id];
    const target =
      action.type === "move" && action.on
        ? index.surfaces.find(
            (t) =>
              t.owner === itemEntityId(roomId, action.on!) &&
              t.slot === action.x - state.instances.find((i) => i.id === action.on)!.x
          )
        : undefined;
    const p = action.type === "move" ? itemPoint(replacement) : entity.contact;
    return commit(
      resolve(prepared, subject, target?.contact ?? roomPoint(p.x, p.y), {
        scale: 1,
        release: true,
        target: target?.id,
        floorOnly: action.type !== "move" || !target,
      })
    );
  }
  if (action.type === "tint" && (!decorSpec(item.item).tintable || !tintIds.includes(action.tint)))
    return fail("Choose a paintable item.");
  const cap = capabilityOf(item.item);
  if (action.type === "toggle" && ((!spec.interactive && !cap.toggle) || (cap.holdable && !cap.toggle)))
    return fail(`${spec.name} is ready for your story.`);
  const replacement =
    action.type === "tint"
      ? { ...item, tint: action.tint }
      : {
          ...item,
          ...(storageCapacity(item.item) ? { storage: { version: 1 as const, open: !storageOpen(item) }, powered: !storageOpen(item) } : cap.toggle ? { powered: !(item.powered ?? item.state === "active") } : {}),
          state: spec.interactive ? (item.state === "rest" ? ("active" as const) : ("rest" as const)) : item.state,
        };
  return finish({
    ...save,
    version: 4,
    rooms: {
      ...save.rooms,
      [roomId]: { ...state, instances: state.instances.map((i) => (i.id === item.id ? replacement : i)) },
    },
  });
}
