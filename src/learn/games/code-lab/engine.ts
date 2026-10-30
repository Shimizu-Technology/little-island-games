import type { LearnEngine } from "../../types";
import { levelOf } from "../../levelOptions";
export type LabTask = { goal: string; lines: string[]; bank: string[]; slot: string[]; answer: string; output: string; robot: number };
export type LabState = { version: 1; level: number; seed: number; index: number; order: number[]; token: string; ran: boolean; helped: boolean };
const templates: Record<number, Omit<LabTask, "bank">[]> = {
  1: [
    { goal: "Make the robot say Aloha, then step.", lines: ['print("Aloha")', "robot.step()"], slot: [], answer: "", output: "Aloha · 1 step", robot: 1 },
    { goal: "Step first, then say Ready.", lines: ["robot.step()", 'print("Ready")'], slot: [], answer: "", output: "1 step · Ready", robot: 1 },
    { goal: "Make two steps before saying Done.", lines: ["robot.step()", "robot.step()", 'print("Done")'], slot: [], answer: "", output: "2 steps · Done", robot: 2 },
    { goal: "Say Go, step twice, then say Home.", lines: ['print("Go")', "robot.step()", "robot.step()", 'print("Home")'], slot: [], answer: "", output: "Go · 2 steps · Home", robot: 2 },
  ],
  2: [
    { goal: "Set score to zero, then add one.", lines: ["score = 0", "score = score + 1", "print(score)"], slot: [], answer: "", output: "1", robot: 1 },
    { goal: "Start with two points, then add one.", lines: ["score = 2", "score = score + 1", "print(score)"], slot: [], answer: "", output: "3", robot: 3 },
    { goal: "Repeat a step three times.", lines: ["for step in range(3):", "    robot.step()", "print(step_count)"], slot: [], answer: "", output: "3 steps", robot: 3 },
    { goal: "Fill the loop count to make four steps.", lines: ["for step in range(□):", "    robot.step()", "print(step_count)"], slot: ["2", "3", "4"], answer: "4", output: "4 steps", robot: 4 },
  ],
  3: [
    { goal: "Define a jump, then call it.", lines: ["def jump(times):", "    robot.jump(times)", "jump(2)"], slot: [], answer: "", output: "2 jumps", robot: 2 },
    { goal: "Call jump with three jumps.", lines: ["def jump(times):", "    robot.jump(times)", "jump(□)"], slot: ["1", "2", "3"], answer: "3", output: "3 jumps", robot: 3 },
    { goal: "Make a greeting function and use it.", lines: ["def greet(name):", "    print(name)", 'greet("Islander")'], slot: [], answer: "", output: "Islander", robot: 0 },
    { goal: "Pass Reef to the greeting function.", lines: ["def greet(name):", "    print(name)", "greet(□)"], slot: ['"Reef"', '"Rock"', '"Rain"'], answer: '"Reef"', output: "Reef", robot: 0 },
  ],
  4: [
    { goal: "Fix the comparison so two shells open the gate.", lines: ["shells = 2", "if shells □ 2:", '    print("Open")'], slot: ["==", ">", "<"], answer: "==", output: "Open", robot: 0 },
    { goal: "Fix the test: three points are more than two.", lines: ["score = 3", "if score □ 2:", '    print("Win")'], slot: ["<", "==", ">"], answer: ">", output: "Win", robot: 0 },
    { goal: "Set the flag so the robot can move.", lines: ["ready = □", "if ready:", "    robot.step()"], slot: ["False", "True"], answer: "True", output: "1 step", robot: 1 },
    { goal: "Catch the bug: four is not less than three.", lines: ["waves = 4", "if waves □ 3:", '    print("High tide")'], slot: ["<", ">", "=="], answer: ">", output: "High tide", robot: 0 },
  ],
  5: [
    { goal: "Print Fizz when the number is divisible by three.", lines: ["number = 6", "if number % 3 == □:", '    print("Fizz")'], slot: ["0", "1", "2"], answer: "0", output: "Fizz", robot: 0 },
    { goal: "Add the three treasure numbers.", lines: ["treasure = [1, 2, 3]", "total = sum(treasure)", "print(total)"], slot: [], answer: "", output: "6", robot: 0 },
    { goal: "Draw a pattern of four steps.", lines: ["for mark in range(□):", "    robot.step()", 'print("Pattern")'], slot: ["2", "3", "4"], answer: "4", output: "4 steps · Pattern", robot: 4 },
    { goal: "Use a function to cross three stones.", lines: ["def cross(steps):", "    robot.step(steps)", "cross(□)"], slot: ["2", "3", "4"], answer: "3", output: "3 steps", robot: 3 },
  ],
};
const mix = (arr: number[], seed: number) => arr.map((_, i) => arr[(i + seed % arr.length) % arr.length]);
export function taskAt(level: number, seed: number, index: number): LabTask {
  const source = templates[level][(index + seed) % 4];
  const shift = ((seed >>> (index * 3)) % (source.lines.length - 1)) + 1;
  return { ...source, bank: mix(source.lines.map((_, i) => i), shift).map((i) => source.lines[i]) };
}
export const complete = (s: LabState) => s.index === 4;
export const ready = (s: LabState) => { const t = taskAt(s.level, s.seed, s.index); return s.order.length === t.lines.length && (!t.slot.length || !!s.token); };
export const correct = (s: LabState) => { const t = taskAt(s.level, s.seed, s.index); return ready(s) && s.order.every((i, j) => t.bank[i] === t.lines[j]) && s.token === t.answer; };
export function rendered(s: LabState): string[] { const t = taskAt(s.level, s.seed, s.index); return s.order.map((i) => t.bank[i].replace("□", s.token || "□")); }
export const engine: LearnEngine<LabState> = {
  id: "code-lab", name: "Code Lab", island: "coding", ages: [9, 14], ownLevels: true,
  tagline: "Build blocks. Read real code.", description: "Arrange code blocks, fill tiny blanks and run a robot program.",
  help: "Tap blocks in the order the robot should use them. The panel beside them shows the same program as Python-like text. Tap a token to fill a square blank. Run to see the output. Tap a placed line to return it to the bank. Help shows the next line; there is no timer.",
  color: "#5C5BA0", surface: "#EFEEFA", modes: ["solo", "together"],
  skills: { "think.code-sequence": "Putting code in order", "think.code-variables": "Changing variables and loops", "think.code-functions": "Calling functions", "think.code-debug": "Finding and fixing bugs" },
  levelNames: [
    { name: "Say and step", description: "Sequence actions and see the text." },
    { name: "Scores and loops", description: "Update a variable and repeat a step." },
    { name: "Make a function", description: "Define and call a function with a value." },
    { name: "Find the bug", description: "Fix comparisons and true or false." },
    { name: "Tiny programs", description: "Build short programs and fill a value." },
  ],
  create: (o, c) => ({ version: 1, level: levelOf(o), seed: Math.floor(c.rng() * 65536), index: 0, order: [], token: "", ran: false, helped: false }),
  validate: (x, o): x is LabState => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return false;
    const s = x as LabState;
    if (Object.keys(s).sort().join() !== "helped,index,level,order,ran,seed,token,version" || s.version !== 1 || s.level !== levelOf(o) || !Number.isInteger(s.seed) || s.seed < 0 || s.seed >= 65536 || !Number.isInteger(s.index) || s.index < 0 || s.index > 4 || typeof s.ran !== "boolean" || typeof s.helped !== "boolean" || !Array.isArray(s.order) || typeof s.token !== "string") return false;
    if (s.index === 4) return !s.order.length && s.token === "" && !s.ran;
    const t = taskAt(s.level, s.seed, s.index);
    return s.order.length <= t.lines.length && s.order.every((i) => Number.isInteger(i) && i >= 0 && i < t.lines.length) && new Set(s.order).size === s.order.length && (s.token === "" || t.slot.includes(s.token)) && (!s.ran || correct(s));
  },
  outcome: (s) => complete(s) ? "done" : null,
};
