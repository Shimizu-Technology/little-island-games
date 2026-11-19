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
function menuItem(index: number, item: Instance["item"]): Instance {
  return { ...instance(`menu-${index}`, item, 0, 0), at: roomPoint(220 + index * 85, 525) };
}
function mealMenuRoom(slot: 0 | 1 | 2): HomeStateV2 {
  const state = reviewRoom([
    menuItem(0, "mango"),
    menuItem(1, "banana"),
    menuItem(2, "rice-ball"),
    menuItem(3, "cupcake"),
    menuItem(4, "coconut-drink"),
    menuItem(5, "juice"),
  ]);
  state.rooms.home.characters = [{ slot, anchor: "floor", pose: "stand", x: 8, y: 7 }];
  return state;
}
/** Fixtures for recorded gesture QA. None of them can reach a learner's saved world. */
export const labFixtures: Record<string, () => HomeStateV2> = {
  // H4b: uncluttered, reachable meal and drink art at the normal room camera.
  "rig-meal": () => {
    const state = reviewRoom([
      { ...instance("rig-fruit", "mango", 0, 0), at: roomPoint(270, 505) },
      { ...instance("rig-snack", "rice-ball", 0, 0), at: roomPoint(390, 505) },
      { ...instance("rig-drink", "juice", 0, 0), at: roomPoint(510, 505) },
    ], true);
    state.rooms.home.characters[0] = { slot: 0, anchor: "floor", pose: "stand", x: 8, y: 7 };
    return state;
  },
  "rig-menu-0": () => mealMenuRoom(0),
  "rig-menu-1": () => mealMenuRoom(1),
  "rig-menu-2": () => mealMenuRoom(2),
  ...Object.fromEntries((['stool','chair','bed','bubble-bath','fridge'] as const).map(item=>[`rig-landing-${item}`,()=>{
    const state=reviewRoom([
      {...instance('landing',item,11,7),at:roomPoint(520,item==='fridge'?490:510),powered:item==='fridge'},
      {...instance('snack','mango',3,10),at:roomPoint(220,525)},
    ]);
    state.rooms.home.characters=[{slot:0,anchor:'floor',pose:'stand',x:6,y:7}];
    return state;
  }])),
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
  // H4 fix round 1: the stove in the middle of the kitchen (fully on screen on iPad too), food beside it.
  "delight-stove": () => {
    const state = starterHome();
    state.current = "kitchen";
    state.rooms.kitchen.instances = state.rooms.kitchen.instances
      .filter((i) => i.item !== "sink-counter")
      .map((i) => (i.item === "stove" ? { ...i, x: 7 } : i));
    state.rooms.kitchen.instances.push(instance("mango", "mango", 4, 6), instance("rice", "rice-ball", 11, 6));
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== 0);
    state.rooms.kitchen.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 4, y: 8 }];
    return migrateHome(state) ?? state;
  },
  // H4 fix round 2: the reviewer's lamp layout. Stove at (7,4), a lamp behind it at (7,0) whose
  // shade overlaps food in the pan, and a mango on open floor to drop into the pan or in front of it.
  "pan-lamp": () => {
    const state = starterHome();
    state.current = "kitchen";
    const stove = state.rooms.kitchen.instances.find((i) => i.item === "stove")!;
    state.rooms.kitchen.instances = [{ ...stove, x: 7, y: 4 }, instance("lamp-probe", "lamp", 7, 0), instance("mango", "mango", 11, 8)];
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== 0);
    state.rooms.kitchen.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 2, y: 8 }];
    return migrateHome(state) ?? state;
  },
  // H4 fix round 1: the Islander holding a rice ball, Pip beside her (held things follow reactions).
  "delight-held": () => {
    const state = starterHome();
    state.current = "kitchen";
    state.rooms.kitchen.instances.push(instance("held", "rice-ball", 0, 0), instance("snack", "banana", 11, 6));
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot === 2);
    state.rooms.kitchen.characters = [
      { slot: 0, anchor: "floor", pose: "stand", x: 6, y: 7, holding: "held" },
      { slot: 1, anchor: "floor", pose: "stand", x: 9, y: 7 },
    ];
    return migrateHome(state) ?? state;
  },
  // H4 fix round 1: the beach hut with the bubble bath in the middle and the Islander beside it.
  "delight-bath": () => {
    const state = starterHome();
    state.current = "beach";
    state.rooms.beach.instances = state.rooms.beach.instances.map((i) => (i.item === "bubble-bath" ? { ...i, x: 6 } : i.item === "lounger" ? { ...i, x: 12 } : i));
    state.rooms.home.characters = state.rooms.home.characters.filter((c) => c.slot !== 0);
    state.rooms.beach.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 4, y: 7 }];
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
