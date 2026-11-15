import { roomPoint } from "../scene/types";
import { instance, migrateHome, starterHome, type HomeStateV2, type Instance } from "../model";

const feedRoom = (extra: Instance[], character: HomeStateV2["rooms"]["home"]["characters"][number]) => {
  const state = starterHome();
  state.current = "kitchen";
  state.rooms.kitchen.instances = [instance("bowl", "fruit-bowl", 13, 10), ...extra];
  state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== character.slot);
  state.rooms.kitchen.characters = [character];
  return migrateHome(state) ?? state;
};
function reviewRoom(items: Instance[], hero = false): HomeStateV2 {
  const state = migrateHome(starterHome())!;
  for (const room of Object.values(state.rooms)) { room.instances = []; room.characters = []; }
  state.rooms.home.instances = items;
  if (hero) state.rooms.home.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 10, y: 8 }];
  return state;
}
/** Fixtures for recorded gesture QA. None of them can reach a learner's saved world. */
export const labFixtures: Record<string, () => HomeStateV2> = {
  starter: () => migrateHome(starterHome()) ?? starterHome(),
  "feed-stand": () => feedRoom([], { slot: 0, anchor: "floor", pose: "stand", x: 7, y: 7 }),
  "feed-sit": () => feedRoom([instance("seat", "stool", 6, 7)], { slot: 0, anchor: "seat", pose: "sit", seatId: "seat", socket: { itemId: "seat", socketId: "seat" } }),
  "feed-bed": () => feedRoom([instance("cot", "bed", 3, 6)], { slot: 0, anchor: "seat", pose: "lie", seatId: "cot", socket: { itemId: "cot", socketId: "pillow" } }),
  "feed-pip": () => feedRoom([], { slot: 1, anchor: "floor", pose: "stand", x: 7, y: 7 }),
  "feed-crab": () => feedRoom([], { slot: 2, anchor: "floor", pose: "stand", x: 7, y: 7 }),
  "fix-mirrored": () => reviewRoom([{ ...instance("shelf", "shelf", 8, 8), mirrored: true }]),
  "fix-rotated": () => reviewRoom([{ ...instance("shelf", "shelf", 8, 8), rotation: 180 }]),
  "fix-tied": () => reviewRoom([
    { ...instance("a", "mango", 5, 5), at: { x: 400, y: 500 } },
    { ...instance("z", "mango", 8, 8), at: { x: 400, y: 500 } },
  ]),
  "fix-floor": () => reviewRoom([instance("plant", "plant", 3, 8)], true),
  "fix-telescope": () => {
    const state = reviewRoom([instance("scope", "telescope", 8, 8), instance("toy", "teddy", 2, 8)], true);
    state.rooms.home.characters[0] = { slot: 0, anchor: "floor", pose: "stand", x: 6, y: 5, at: roomPoint(280.2297114683297, 456.16737609111317) };
    return state;
  },
  "catalog-busy": () => reviewRoom(Array.from({ length: 47 }, (_, n) =>
    ({ ...instance(`busy-${n}`, "chair", n % 8 * 2, Math.floor(n / 8) * 2),
      at: roomPoint(100 + n % 8 * 86, 380 + Math.floor(n / 8) * 26) }))),
  // HM-18: a room at the 48-thing limit, with its floor still open; the beach shell below it is the next thing.
  full: () => {
    const state = migrateHome(starterHome())!;
    const room = state.rooms.home;
    const extra = Array.from({ length: Math.max(0, 48 - room.instances.length) }, (_, n) =>
      ({ ...instance(`full-${n}`, "mango", 0, 0), at: roomPoint(60 + (n % 12) * 56, 300 + Math.floor(n / 12) * 22) }));
    room.instances = [...room.instances, ...extra];
    return migrateHome(state) ?? state;
  },
  // H4: the kitchen with the stove off, two friends near each other and food on the table.
  delight: () => {
    const state = starterHome();
    state.current = "kitchen";
    state.rooms.kitchen.instances.push(instance("mango", "mango", 3, 9), instance("rice", "rice-ball", 7, 10));
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot === 2);
    state.rooms.kitchen.characters = [
      { slot: 0, anchor: "floor", pose: "stand", x: 5, y: 7 },
      { slot: 1, anchor: "floor", pose: "stand", x: 13, y: 10 },
    ];
    return migrateHome(state) ?? state;
  },
  // H4: five snacks on the kitchen floor in front of the Islander (the fifth meal burps).
  "delight-feast": () => {
    const state = starterHome();
    state.current = "kitchen";
    state.rooms.kitchen.instances.push(...(["banana", "mango", "rice-ball", "cupcake", "banana"] as const).map((item, n) =>
      ({ ...instance(`snack-${n}`, item, 0, 0), at: roomPoint(160 + n * 110, 500) })));
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== 0);
    state.rooms.kitchen.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 8, y: 5 }];
    return migrateHome(state) ?? state;
  },
  // H4: the beach hut, with the Islander standing beside the bubble bath.
  "delight-beach": () => {
    const state = starterHome();
    state.current = "beach";
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== 0);
    state.rooms.beach.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 9, y: 6 }];
    return migrateHome(state) ?? state;
  },
  // H4: a friend asleep in bed, a lit lamp with friends standing near it.
  "delight-rest": () => {
    const state = starterHome();
    const room = state.rooms.home;
    room.instances = room.instances.map((i) => (i.id === "lamp" ? { ...i, powered: true } : i));
    room.characters = [
      { slot: 0, anchor: "seat", pose: "lie", seatId: "bed", socket: { itemId: "bed", socketId: "pillow" } },
      { slot: 1, anchor: "floor", pose: "stand", x: 11, y: 4 },
      { slot: 2, anchor: "floor", pose: "stand", x: 15, y: 4 },
    ];
    return migrateHome(state) ?? state;
  },
  crowded: () => {
    const state = starterHome();
    const room = state.rooms.home;
    room.instances.push(instance("mango-behind", "mango", 8, 7), instance("towel", "beach-towel", 12, 6), instance("cushion", "floor-cushion", 2, 10));
    return migrateHome(state) ?? state;
  },
};

/** Local-only fixture. It never writes into a learner's world. */
export function labHome(fixture?: string): HomeStateV2 {
  if (fixture && labFixtures[fixture]) return labFixtures[fixture]();
  const state = starterHome();
  state.rooms.home = {
    theme: state.rooms.home.theme,
    instances: [
      instance("bed", "bed", 3, 0),
      instance("rug", "rug", 8, 8),
      instance("chair", "chair", 10, 6),
      instance("table", "coffee-table", 12, 4),
      { ...instance("lamp", "table-lamp", 12, 4), on: "table" },
      instance("cup", "juice", 9, 10),
      instance("banana", "banana", 7, 10),
    ],
    characters: [
      { slot: 0, anchor: "floor", pose: "stand", x: 8, y: 8 },
      { slot: 1, anchor: "floor", pose: "stand", x: 17, y: 8 },
      { slot: 2, anchor: "floor", pose: "stand", x: 6, y: 10 },
    ],
  };
  state.rooms.kitchen.instances = [
    instance("fridge", "fridge", 5, 0),
    instance("tub", "bubble-bath", 12, 0),
    instance("bowl", "fruit-bowl", 10, 8),
  ];
  return migrateHome(state) ?? state;
}
