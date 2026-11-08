import { instance, migrateHome, starterHome, type HomeStateV2, type Instance } from "../model";

const feedRoom = (extra: Instance[], character: HomeStateV2["rooms"]["home"]["characters"][number]) => {
  const state = starterHome();
  state.current = "kitchen";
  state.rooms.kitchen.instances = [instance("bowl", "fruit-bowl", 13, 10), ...extra];
  state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== character.slot);
  state.rooms.kitchen.characters = [character];
  return migrateHome(state) ?? state;
};
/** Fixtures for recorded gesture QA. None of them can reach a learner's saved world. */
export const labFixtures: Record<string, () => HomeStateV2> = {
  starter: () => migrateHome(starterHome()) ?? starterHome(),
  "feed-stand": () => feedRoom([], { slot: 0, anchor: "floor", pose: "stand", x: 7, y: 7 }),
  "feed-sit": () => feedRoom([instance("seat", "stool", 6, 7)], { slot: 0, anchor: "seat", pose: "sit", seatId: "seat", socket: { itemId: "seat", socketId: "seat" } }),
  "feed-bed": () => feedRoom([instance("cot", "bed", 3, 6)], { slot: 0, anchor: "seat", pose: "lie", seatId: "cot", socket: { itemId: "cot", socketId: "pillow" } }),
  "feed-pip": () => feedRoom([], { slot: 1, anchor: "floor", pose: "stand", x: 7, y: 7 }),
  "feed-crab": () => feedRoom([], { slot: 2, anchor: "floor", pose: "stand", x: 7, y: 7 }),
  crowded: () => {
    const state = starterHome();
    const room = state.rooms.home;
    room.instances.push(instance("mango-behind", "mango", 8, 7), instance("towel", "beach-towel", 12, 9), instance("cushion", "floor-cushion", 2, 10));
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
