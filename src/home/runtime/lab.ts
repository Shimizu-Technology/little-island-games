import { instance, migrateHome, starterHome, type HomeStateV2 } from "../model";

/** Local-only fixture. It never writes into a learner's world. */
export function labHome(): HomeStateV2 {
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
