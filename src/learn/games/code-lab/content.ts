import { runPython, type Execution } from './python';
export type Slot = { line: number; before: string; after: string; choices: string[]; answer: number };
export type LabProgram = { id: string; band: number; family: string; idea: string; mode: 'predict' | 'build'; goal: string; lines: string[]; slots: Slot[]; choices: string[]; answer: number; output: string; returned: Execution['returned']; steps: number };
const lines = (s: string) => s.split('\n');
const schoolSource = (level: number, n: number): string[] => {
  const a = n + 2, b = n + 3;
  const rows: string[][] = [
    [
      `print(${a})\nprint(${b})`, `print(${a} + ${b})\nprint(${a})`, `print(${b})\nprint(${a} + 1)`, `print(${a})\nprint(${a} + ${b})\nprint(${b})`,
      `print("Reef")\nprint(${a})`, `print(${b})\nprint("Sand")`, `print("Ready")\nprint(${a} + 2)`, `print(${a})\nprint("Go")\nprint(${b})`,
      `print(${b} - ${a})\nprint(${b})`, `print(${a} * 2)\nprint(${b} - 1)`, `print(${a})\nprint(${b})\nprint(${a} + ${b})`, `print(${b})\nprint(${a})\nprint(${b} - ${a})`,
      `print("A" * 2)\nprint(${a})`, `print(${a} + 1)\nprint("B" * 3)`, `print("Reef" + " path")\nprint(${b})`, `print(${a})\nprint("Home")\nprint(${b} * 2)`,
    ],
    [
      `score = 2\nscore = score + 3\nscore = score + 3\nprint(score)`, `score = ${a}\nscore = score * 2\nscore = score + 1\nprint(score)`, `score = ${b}\nscore = score - 1\nprint(score)\nscore = score + 2\nprint(score)`, `first = ${a}\nsecond = first + ${b}\nprint(second - first)`,
      `total = 0\nfor i in range(3):\n    total = total + 2\nprint(total)`, `total = ${a}\nfor i in range(2):\n    total = total + i\nprint(total)`, `total = 1\nfor i in range(3):\n    total = total * 2\nprint(total)`, `total = 0\nfor i in range(1, 4):\n    total = total + i\n    print(total)`,
      `score = ${b}\nprint(score)\nscore = score + ${a}\nprint(score)`, `x = ${a}\ny = x\nx = x + 2\nprint(y)\nprint(x)`, `x = ${a}\ny = ${b}\nx = y\nprint(x + y)`, `x = ${a}\ny = ${b}\nhold = x\nx = y\ny = hold\nprint(x)\nprint(y)`,
      `for i in range(2):\n    print(i)\n    print(i + ${a})`, `total = ${b}\nfor i in range(2):\n    total = total - 1\nprint(total)`, `total = 0\nfor i in range(2, 5):\n    total = total + 2\nprint(total)`, `total = 1\nfor i in range(1, 4):\n    total = total + i\n    print(i)\nprint(total)`,
    ],
    [
      `def double(n):\n    return n + n\nprint(double(4) + 1)`, `def add(n):\n    n = n + 2\n    return n\nprint(add(${a}))`, `def square(n):\n    return n * n\nprint(square(${a}) + 2)`, `def shift(n):\n    return n - 1\nprint(shift(shift(${b})))`,
      `def count(n):\n    for i in range(n):\n        print(i)\ncount(3)`, `def add(n):\n    total = 0\n    for i in range(n):\n        total = total + i\n    return total\nprint(add(4))`, `def twice(n):\n    print(n)\n    print(n + 1)\ntwice(${a})\ntwice(${b})`, `def grow(n):\n    for i in range(2):\n        n = n + 2\n    return n\nprint(grow(${a}))`,
      `n = ${a}\ndef change(n):\n    n = n + 2\n    return n\nprint(change(n))\nprint(n)`, `def plus(n):\n    return n + ${a}\nvalue = plus(2)\nprint(plus(value))`, `def echo(n):\n    print(n)\n    return n + 1\nprint(echo(${a}))`, `def next(n):\n    return n + 1\ndef twice(n):\n    return next(n) + next(n)\nprint(twice(${a}))`,
      `def pick(n):\n    if n > 3:\n        return n\n    return 0\nprint(pick(${a}))`, `def say(n):\n    print(n + 1)\nsay(${a})\nsay(${a} + 2)`, `def mix(a, b):\n    return a * 2 + b\nprint(mix(${a}, ${b}))`, `def count(n):\n    total = n\n    total = total + n\n    return total + 1\nprint(count(${b}))`,
    ],
    [
      `shells = ${a}\nif shells > 2:\n    print("Open")\nelse:\n    print("Wait")`, `score = ${b}\nif score == 4:\n    print(score + 1)\nelse:\n    print(score - 1)`, `ready = False\nif ready:\n    print(1)\nelse:\n    print(${a})`, `waves = ${a}\nif waves < ${b}:\n    waves = waves + 2\n    print(waves)\nelse:\n    print(0)`,
      `total = 0\nfor i in range(4):\n    if i > 1:\n        total = total + i\nprint(total)`, `for i in range(3):\n    if i == 1:\n        print("Reef")\n    else:\n        print(i)`, `count = 0\nfor i in range(1, 5):\n    if i % 2 == 0:\n        count = count + 1\nprint(count)`, `total = 0\nfor i in range(3):\n    if i < 2:\n        total = total + 1\n    else:\n        total = total + 3\nprint(total)`,
      `def choose(n):\n    if n > 3:\n        return n + 1\n    else:\n        return n - 1\nprint(choose(${a}))`, `def even(n):\n    if n % 2 == 0:\n        return True\n    return False\nprint(even(${b}))`, `def cap(n):\n    if n > 5:\n        return 5\n    return n\nprint(cap(${b}))`, `def sign(n):\n    if n < 0:\n        return 0\n    else:\n        return n * 2\nprint(sign(${a}))`,
      `x = ${a}\nif x > 2 and x < 9:\n    print(x * 2)\nelse:\n    print(x)`, `x = ${a}\nif x == 2 or x == 4:\n    print("Yes")\nelse:\n    print("No")`, `ready = True\nif not ready:\n    print(0)\nelse:\n    print(${b})`, `x = ${a}\nif x > 2:\n    if x < 9:\n        print(x + 1)\n    else:\n        print(0)\nelse:\n    print(x)`,
    ],
    [
      `treasure = [1, 2, 3]\ntotal = sum(treasure)\nprint(total)`, `items = [${a}, ${b}, 1]\nprint(items[1])\nprint(len(items))`, `items = [1, 2]\nitems.append(${a})\nprint(sum(items))`, `items = [${a}, 1, ${b}]\nprint(items[-1] - items[0])`,
      `items = [1, 4, 2]\ntotal = 0\nfor item in items:\n    total = total + item\nprint(total)`, `items = [${a}, 1, ${b}]\ncount = 0\nfor item in items:\n    if item > 2:\n        count = count + 1\nprint(count)`, `items = [1, 2, 3]\nfor i in range(len(items)):\n    print(items[i] * 2)`, `out = []\nfor i in range(3):\n    out.append(i + ${a})\nprint(sum(out))`,
      `def biggest(items):\n    best = items[0]\n    for item in items:\n        if item > best:\n            best = item\n    return best\nprint(biggest([${a}, ${b}, 1]))`, `def total(items):\n    result = 0\n    for item in items:\n        result = result + item\n    return result\nprint(total([1, ${a}, 3]))`, `def head(items):\n    return items[0] + items[-1]\nprint(head([${a}, 1, ${b}]))`, `def count(items):\n    return len(items)\nitems = [1, 2]\nitems.append(${a})\nprint(count(items))`,
      `n = 8\nsteps = 0\nwhile n > 1:\n    n = n // 2\n    steps = steps + 1\nprint(steps)`, `total = 0\nfor i in range(3):\n    for j in range(2):\n        total = total + i + j\nprint(total)`, `for i in range(1, 4):\n    row = ""\n    for j in range(i):\n        row = row + "*"\n    print(row)`, `def sift(items):\n    out = []\n    for item in items:\n        if item % 2 == 0:\n            out.append(item)\n    return sum(out)\nprint(sift([2, ${a}, 6]))`,
    ],
  ];
  return rows[level - 1][n].split('\n');
};
export const IDEAS = ['Running totals', 'Count the matches', 'List positions', 'Functions with loops', 'Halve and stop', 'Loops inside loops'] as const;
/** Ten reviewed structures per idea; variants change only their bounded numeric inputs.
 * The upper rows combine state, branches and function scope, rather than length alone.
 */
function deepSource(idea: number, row: number, n: number): string[] {
  const k = row % 5, top = row >= 5;
  const starts = [
    [`total = 0\nfor i in range(1, ${n}):\n    total = total + i\nprint(total)`, `total = 1\nfor i in range(1, ${n}):\n    total = total + i * 2\nprint(total)`, `total = 0\nfor i in range(1, ${n}):\n    if i % 2 == 0:\n        total = total + i\nprint(total)`, `total = ${n}\nfor i in range(3):\n    total = total + i\n    print(total)`, `total = 0\nlast = 1\nfor i in range(${n}):\n    total = total + last\n    last = last + 2\nprint(total)`],
    [`items = [3, ${n}, 1, 9, 4]\ncount = 0\nfor item in items:\n    if item > 3:\n        count = count + 1\nprint(count)`, `items = [${n}, 2, 8, 3]\ncount = 0\nfor item in items:\n    if item % 2 == 0:\n        count = count + 1\nprint(count)`, `items = [${n}, 4, 2, 9]\ncount = 0\nfor item in items:\n    if item > 2 and item < 8:\n        count = count + 1\nprint(count)`, `items = [${n}, 5, 1, 8]\ncount = 0\nfor item in items:\n    if item < 4:\n        count = count + 2\n    else:\n        count = count + 1\nprint(count)`, `items = [${n}, 3, 3, 8]\ncount = 0\nfor item in items:\n    if item == 3:\n        count = count + 1\nprint(count)`],
    [`items = [${n}, 4, 7]\nprint(items[1])\nitems.append(2)\nprint(len(items))`, `items = [${n}, 4, 7]\nprint(items[-1] + items[0])`, `items = [${n}, 4, 7]\ntotal = 0\nfor i in range(len(items)):\n    total = total + items[i] * i\nprint(total)`, `items = [${n}, 4, 7]\nout = []\nfor i in range(2):\n    out.append(items[i + 1])\nprint(sum(out))`, `items = [${n}, 4, 7]\nprint(items[len(items) - 1])\nitems.append(items[0] + 1)\nprint(items[-1])`],
    [`best = items[0]\nfor item in items:\n    if item > best:\n        best = item\nreturn best`, `total = 0\nfor item in items:\n    total = total + item\nreturn total`, `best = items[0]\nfor item in items:\n    if item < best:\n        best = item\nreturn best`, `total = 0\nfor item in items:\n    if item % 2 == 0:\n        total = total + item\nreturn total`, `last = 0\nfor item in items:\n    if item > last:\n        last = item + 1\nreturn last`],
    [`n = ${n * 4}\nsteps = 0\nwhile n > 1:\n    n = n // 2\n    steps = steps + 1\nprint(steps)`, `n = ${n * 4}\ntotal = 0\nwhile n > 1:\n    total = total + n % 2\n    n = n // 2\nprint(total)`, `n = ${n * 3}\nlast = n\nwhile n > 1:\n    last = n\n    n = n // 2\nprint(last)`, `n = ${n * 2}\ncount = 0\nwhile n > 1:\n    if n % 2 == 0:\n        count = count + 1\n    n = n // 2\nprint(count)`, `n = ${n * 3}\nout = []\nwhile n > 1:\n    n = n // 2\n    out.append(n)\nprint(sum(out))`],
    [`for i in range(1, ${n}):\n    row = ""\n    for j in range(i):\n        row = row + "*"\n    print(row)`, `total = 0\nfor i in range(${n}):\n    for j in range(i):\n        total = total + j\nprint(total)`, `total = 0\nfor i in range(${n}):\n    for j in range(3):\n        if i > j:\n            total = total + 1\nprint(total)`, `out = []\nfor i in range(1, ${n}):\n    total = 0\n    for j in range(i):\n        total = total + i + j\n    out.append(total)\nprint(sum(out))`, `total = 0\nfor i in range(1, ${n}):\n    for j in range(1, 4):\n        if (i + j) % 2 == 0:\n            total = total + i * j\nprint(total)`],
  ];
  let source = starts[idea][k];
  if (idea === 3) source = `def solve(items):\n${source.split('\n').map(s => '    ' + s).join('\n')}\nprint(solve([${n}, 9, 2, 6]))`;
  else if (top) {
    // Turn the final printed value(s) into a local function. Return makes the order of effects matter.
    const body = source.replace(/\nprint\(([^\n]*)\)$/, '\nreturn $1');
    source = `def solve():\n${body.split('\n').map(s => '    ' + s).join('\n')}\nprint(solve())`;
  }
  if (idea === 3 && top) source = source.replace('print(solve(', 'print(1 + solve(');
  return lines(source);
}
function make(id: string, band: number, family: string, idea: string, source: string[], mode: LabProgram['mode']): LabProgram {
  const result = runPython(source);
  if (result.error) throw Error(`${id}: ${result.error}`);
  const slots: Slot[] = [];
  const candidates: (Slot & { priority: number })[] = [];
  source.forEach((line, index) => {
    const condition = line.match(/^(\s*if )(.*)(:)$/), returned = line.match(/^(\s*return )(.*)$/);
    const update = line.match(/^(\s*\w+ = )(\w+ [+-] \w+)$/);
    let before: string, after: string, values: string[], priority = 2;
    if (condition) { before = condition[1]; after = ':'; values = [condition[2], `not (${condition[2]})`, 'False']; priority = 0; }
    else if (returned) { before = returned[1]; after = ''; values = [returned[2], `(${returned[2]}) + 1`, '0']; priority = 0; }
    else if (update) { before = update[1]; after = ''; values = [update[2], update[2].replace(' + ', ' - '), '0']; priority = 1; }
    else {
      const token = [...line.matchAll(/"[^"]*"|\b\d+\b/g)].find(m => /^\d+$/.test(m[0]));
      if (!token) return;
      const value = Number(token[0]), at = token.index!; before = line.slice(0, at); after = line.slice(at + token[0].length); values = [String(value), String(value + 1), String(value + 2)];
    }
    values = [...new Set(values)]; for (let i = 1; values.length < 3; i++) if (!values.includes(String(i))) values.push(String(i));
    // Answers move independently of the output-choice order; a first-chip bot is not a solution strategy.
    const shift = (index + Number(id.match(/\d+$/)?.[0] ?? 0) + band) % 3;
    const choices = values.map((_, i) => values[(i + shift) % 3]);
    candidates.push({ line: index, before, after, choices, answer: choices.indexOf(values[0]), priority });
  });
  candidates.sort((a, b) => a.priority - b.priority || a.line - b.line).slice(0, 4).sort((a,b) => a.line - b.line).forEach(({priority: _priority, ...slot}) => slots.push(slot));
  if (!slots.length) throw Error(`${id} needs a touch blank.`);
  const output = result.output.join('\n');
  const options = [output, output + '\n0', output.split('\n').reverse().join('\n'), '0'];
  const choices = [...new Set(options)];
  for (let i = 1; choices.length < 4; i++) if (!choices.includes(String(i))) choices.push(String(i));
  const rotation = (band + Number(id.match(/\d+$/)?.[0] ?? 0)) % 4;
  const rotated = choices.slice(0, 4).map((_, i) => choices[(i + rotation) % 4]);
  return { id, band, family, idea, mode, goal: mode === 'predict' ? 'What will this program print? Choose before you run it.' : `Build a program that prints:\n${output}`, lines: source, slots, choices: rotated, answer: rotated.indexOf(output), output, returned: result.returned, steps: result.steps };
}
export const schoolPrograms: readonly (readonly LabProgram[])[] = Array.from({ length: 5 }, (_, level) => Array.from({ length: 16 }, (_, i) => make(`school-${level + 1}-${i}`, level + 1, `school-${level + 1}-idea-${Math.floor(i / 4)}`, ['Say in order', 'Keep track of values', 'Functions and scope', 'Choose a branch', 'Lists and loops'][level], schoolSource(level + 1, i), i % 2 ? 'build' : 'predict')));
export const deepPrograms: readonly LabProgram[] = IDEAS.flatMap((idea, f) => Array.from({ length: 10 }, (_, i) => make(`deep-${f}-${i}`, Math.min(6, 1 + Math.floor(i * 6 / 10)), `deep-${f}-technique-${i % 5}`, idea, deepSource(f, i, 3 + i % 5), i % 2 ? 'build' : 'predict')));
export const numberPrograms: readonly LabProgram[] = Array.from({ length: 300 }, (_, i) => { const f = i % 6, row = Math.floor(i / 6) % 10; return make(`number-${i}`, Math.min(6, 1 + Math.floor(row * 6 / 10)), `number-idea-${f}`, IDEAS[f], deepSource(f, row, f === 5 ? 8 + Math.floor(i / 60) : 20 + Math.floor(i / 6)), i % 2 ? 'build' : 'predict'); });
export const allPrograms = [...schoolPrograms.flat(), ...deepPrograms, ...numberPrograms];
