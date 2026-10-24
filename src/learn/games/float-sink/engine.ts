/** Model review reference: https://www.acs.org/content/dam/acsorg/education/k-8/inquiry-in-action/fifth-grade/g5-l2.4-bkgd.pdf (reviewed 2026-10-25). */
import type { LearnEngine, LearnOptions } from "../../types";
import { pickItems } from "../../skills";
import { exact, prediction, same, scienceSkills, type Prediction } from "../../kit/science";
export const objects = [
  {
    id: "leaf",
    name: "Leaf",
    floats: true,
    why: "This dry leaf is light for its size and rests on the water.",
    skill: "sci.float-sink",
    pace: 0,
  },
  {
    id: "coconut",
    name: "Coconut",
    floats: true,
    why: "The fibrous husk and air spaces help this coconut float.",
    skill: "sci.float-sink",
    pace: 0,
  },
  {
    id: "rock",
    name: "Rock",
    floats: false,
    why: "This solid rock weighs more than the water it pushes aside.",
    skill: "sci.float-sink",
    pace: 0,
  },
  {
    id: "shell",
    name: "Shell",
    floats: false,
    why: "This open shell fills with water and sinks.",
    skill: "sci.float-sink",
    pace: 0,
  },
  {
    id: "key",
    name: "Metal key",
    floats: false,
    why: "The solid metal key is heavy for its small size.",
    skill: "sci.float-sink",
    pace: 0,
  },
  {
    id: "cork",
    name: "Cork",
    floats: true,
    why: "Tiny air spaces make cork light for its size.",
    skill: "sci.float-sink",
    pace: 0,
  },
  {
    id: "apple",
    name: "Apple",
    floats: true,
    why: "Small air spaces inside an apple help it float.",
    skill: "sci.float-sink",
    pace: 1,
  },
  {
    id: "log",
    name: "Big log",
    floats: true,
    why: "This wood is light for its size. Big things can float too.",
    skill: "sci.float-sink",
    pace: 1,
  },
  {
    id: "coin",
    name: "Small coin",
    floats: false,
    why: "A small metal coin can sink even when a big log floats.",
    skill: "sci.float-sink",
    pace: 1,
  },
  {
    id: "sponge",
    name: "Wet sponge",
    floats: false,
    why: "This soaked sponge has no trapped air left and sinks in our tank.",
    skill: "sci.cause-effect",
    pace: 1,
  },
  {
    id: "toy-boat",
    name: "Toy boat",
    floats: true,
    why: "The hollow hull keeps water out and pushes enough water aside.",
    skill: "sci.shape-buoyancy",
    pace: 1,
  },
  {
    id: "spoon",
    name: "Metal spoon",
    floats: false,
    why: "This spoon does not push enough water aside to hold its weight.",
    skill: "sci.shape-buoyancy",
    pace: 1,
  },
  {
    id: "clay",
    name: "Clay ball",
    floats: false,
    why: "A solid clay ball pushes aside too little water to hold its weight.",
    skill: "sci.shape-buoyancy",
    pace: 2,
  },
  {
    id: "clay-boat",
    name: "Clay bowl boat",
    floats: true,
    why: "The same clay in a hollow bowl pushes more water aside and keeps air inside.",
    skill: "sci.shape-buoyancy",
    pace: 2,
  },
  {
    id: "empty-bottle",
    name: "Capped empty bottle",
    floats: true,
    why: "Air sealed inside makes this bottle light for its size.",
    skill: "sci.shape-buoyancy",
    pace: 2,
  },
  {
    id: "full-bottle",
    name: "Capped full bottle",
    floats: false,
    why: "This bottle is full of water, with no air pocket, and its heavy plastic sinks.",
    skill: "sci.shape-buoyancy",
    pace: 2,
  },
] as const;
export const shapes = ["ball", "bowl", "wide", "foil"] as const;
export type Shape = (typeof shapes)[number];
export const capacity = (s: Shape, hard: boolean) => ({ ball: 0, bowl: 3, wide: hard ? 4 : 6, foil: hard ? 4 : 5 })[s];
export type Event =
  | { kind: "predict"; value: Prediction }
  | { kind: "drop" }
  | { kind: "sort"; value: Prediction }
  | { kind: "shape"; value: Shape }
  | { kind: "load" }
  | { kind: "pass" };
export type FloatState = { items: string[]; starter: 0 | 1; events: Event[] };
export type Dock = {
  index: number;
  phase: "predict" | "drop" | "sort" | "shape" | "load" | "pass" | "done";
  guess: Prediction | null;
  shape: Shape | null;
  pebbles: number;
  held: [number, number];
  boat: number;
  shelf: string[];
};
export function dock(s: FloatState, o: LearnOptions): Dock | null {
  const d: Dock = {
    index: 0,
    phase: "predict",
    guess: null,
    shape: null,
    pebbles: 0,
    held: [0, 0],
    boat: 0,
    shelf: [],
  };
  for (const e of s.events) {
    if (d.phase === "predict" && exact(e, ["kind", "value"]) && e.kind === "predict" && prediction(e.value)) {
      d.guess = e.value;
      d.phase = "drop";
    } else if (d.phase === "drop" && exact(e, ["kind"]) && e.kind === "drop") d.phase = "sort";
    else if (
      d.phase === "sort" &&
      exact(e, ["kind", "value"]) &&
      e.kind === "sort" &&
      e.value === (objects.find((x) => x.id === s.items[d.index])?.floats ? 0 : 1)
    ) {
      d.shelf.push(s.items[d.index]);
      d.index++;
      d.guess = null;
      d.phase = d.index === s.items.length ? "shape" : "predict";
    } else if (d.phase === "shape" && exact(e, ["kind", "value"]) && e.kind === "shape" && shapes.includes(e.value)) {
      d.shape = e.value;
      d.phase = "load";
      d.pebbles = 0;
    } else if (d.phase === "load" && exact(e, ["kind"]) && e.kind === "load" && d.shape) {
      d.pebbles++;
      const max = capacity(d.shape, o.pace === "hard");
      if (d.pebbles > max) {
        d.held[((s.starter + d.boat) % 2) as 0 | 1] = max;
        d.phase = o.mode === "versus" && d.boat === 0 ? "pass" : "done";
      }
    } else if (d.phase === "pass" && exact(e, ["kind"]) && e.kind === "pass") {
      d.boat = 1;
      d.shape = null;
      d.pebbles = 0;
      d.phase = "shape";
    } else return null;
  }
  return d;
}
export function act(s: FloatState, e: Event, o: LearnOptions): FloatState {
  const n = { ...s, events: [...s.events, e] };
  return dock(n, o) ? n : s;
}
export const engine: LearnEngine<FloatState> = {
  id: "float-sink",
  name: "Float or Sink Dock",
  island: "science",
  tagline: "Predict, drop, sort, then build a boat.",
  description: "Try objects in the tank. Shape a boat and count the pebbles it holds.",
  help: "Predict float or sink, drop the object, then sort it onto the matching shelf. A surprise is a discovery. Build a clay or foil boat and add pebbles until it sinks. In take turns mode, compare how many each boat held. In real life, materials, sizes, trapped air and boat balance change the result. Our tank uses example objects and equal pebbles.",
  helpAudio: "float-sink-help",
  modes: ["solo", "versus"],
  color: "#3A6FA0",
  surface: "#E1ECF7",
  skills: {
    ...scienceSkills,
    "sci.float-sink": "Floating and sinking",
    "sci.shape-buoyancy": "How shape helps boats float",
  },
  paceHelp: {
    easy: "Three familiar objects, then build.",
    medium: "Four objects, including surprising sizes.",
    hard: "Five objects. Compare shape and air; boat width is limited.",
  },
  create: (o, c) => {
    const pool = objects.filter((x) => x.pace <= { easy: 0, medium: 1, hard: 2 }[o.pace]);
    const pair = c.rng() < 0.5 ? ["clay", "clay-boat"] : ["empty-bottle", "full-bottle"];
    const focus =
      o.pace === "hard"
        ? pool.filter((x) => pair.includes(x.id))
        : o.pace === "medium"
          ? pickItems(
              pool.filter((x) => ["apple", "log", "coin"].includes(x.id)),
              c.skills,
              1,
              c.rng,
              c.today
            )
          : [];
    return {
      items: [
        ...focus,
        ...pickItems(
          pool.filter((x) => !focus.includes(x)),
          c.skills,
          { easy: 3, medium: 4, hard: 5 }[o.pace] - focus.length,
          c.rng,
          c.today
        ),
      ].map((x) => x.id),
      starter: c.starter,
      events: [],
    };
  },
  validate: (x, o): x is FloatState => {
    if (!exact(x, ["items", "starter", "events"])) return false;
    const s = x as FloatState;
    return (
      prediction(s.starter) &&
      Array.isArray(s.items) &&
      s.items.length === { easy: 3, medium: 4, hard: 5 }[o.pace] &&
      new Set(s.items).size === s.items.length &&
      s.items.every((id) => objects.some((x) => x.id === id && x.pace <= { easy: 0, medium: 1, hard: 2 }[o.pace])) &&
      (o.pace !== "medium" || s.items.some((id) => ["apple", "log", "coin"].includes(id))) &&
      (o.pace !== "hard" ||
        ["clay", "clay-boat"].every((id) => s.items.includes(id)) ||
        ["empty-bottle", "full-bottle"].every((id) => s.items.includes(id))) &&
      Array.isArray(s.events) &&
      s.events.length <= 40 &&
      s.events.every((e) => !!e && typeof e === "object") &&
      dock(s, o) !== null &&
      same(s, JSON.parse(JSON.stringify(s)))
    );
  },
  outcome: (s, o) => {
    const d = dock(s, o)!;
    return d.phase !== "done"
      ? null
      : o.mode === "solo"
        ? "done"
        : d.held[0] === d.held[1]
          ? "draw"
          : d.held[0] > d.held[1]
            ? 0
            : 1;
  },
  turn: (s, o) => ((s.starter + (dock(s, o)?.boat ?? 0)) % 2) as 0 | 1,
};
