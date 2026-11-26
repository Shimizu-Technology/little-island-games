/** A small, deterministic Python subset. No eval, host access, imports or unbounded execution.
 * Source, expressions, calls, loops and output share one fuel counter. Errors retain the trace.
 * The shipped subset is checked against CPython for every content row (c3-python.test.ts).
 */
export type Value = number | string | boolean | null | Value[];
export type Trace = { line: number; watch: Record<string, Value>; output: string[]; returned: Value };
export type Execution = { output: string[]; returned: Value; trace: Trace[]; error: string | null; steps: number };
type Expr = { kind: 'literal'; value: Value } | { kind: 'name'; name: string } | { kind: 'list'; items: Expr[] } | { kind: 'unary'; op: string; right: Expr } | { kind: 'binary'; op: string; left: Expr; right: Expr } | { kind: 'index'; base: Expr; index: Expr } | { kind: 'call'; name: string; args: Expr[] };
type Node = { line: number; text: string; body: Node[]; otherwise: Node[] };
type Scope = Record<string, Value>;
const truth = (v: Value): boolean => Array.isArray(v) || typeof v === 'string' ? v.length > 0 : !!v;
/** Formatting also has a work bound when used outside the interpreter. */
export function pythonText(v: Value, visit?: () => void): string {
  let remaining = 4096;
  const charge = visit ?? (() => { if (--remaining < 0) throw Error('That value is too large for this lab.'); });
  const format = (value: Value, depth: number, quoted = false): string => {
    charge(); if (depth > 24) throw Error('Too many nested values.');
    if (typeof value === 'string') { for (let i = 0; i < value.length; i += 32) charge(); return quoted ? `'${value}'` : value; }
    return value === null ? 'None' : value === true ? 'True' : value === false ? 'False' : Array.isArray(value) ? `[${value.map(x => format(x, depth + 1, true)).join(', ')}]` : String(value);
  };
  return format(v, 0);
}
const operators: Record<string, number> = { or: 1, and: 2, '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, '+': 4, '-': 4, '*': 5, '/': 5, '//': 5, '%': 5 };
function expression(source: string): Expr {
  const tokens: string[] = [];
  const rx = /\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+(?:\.\d+)?|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?|==|!=|<=|>=|\/\/|[+*/%<>()\[\],-])/gy;
  let offset = 0;
  while (offset < source.trimEnd().length) { rx.lastIndex = offset; const m = rx.exec(source); if (!m) throw Error('That expression is outside this lab.'); tokens.push(m[1]); offset = rx.lastIndex; }
  let at = 0;
  const take = (want: string) => { if (tokens[at++] !== want) throw Error(`Expected ${want}.`); };
  const parse = (minimum = 0): Expr => {
    const token = tokens[at++];
    let left: Expr;
    if (token === '-' || token === 'not') left = { kind: 'unary', op: token, right: parse(token === 'not' ? 3 : 6) };
    else if (token === '(') { left = parse(); take(')'); }
    else if (token === '[') { const items: Expr[] = []; if (tokens[at] !== ']') { do { items.push(parse()); } while (tokens[at] === ',' && ++at); } take(']'); left = { kind: 'list', items }; }
    else if (/^\d/.test(token ?? '')) left = { kind: 'literal', value: Number(token) };
    else if (/^["']/.test(token ?? '')) left = { kind: 'literal', value: token.slice(1, -1).replace(/\\n/g, '\n') };
    else if (['True', 'False', 'None'].includes(token)) left = { kind: 'literal', value: token === 'None' ? null : token === 'True' };
    else if (/^[A-Za-z_]\w*(?:\.\w+)?$/.test(token ?? '')) left = { kind: 'name', name: token };
    else throw Error('Choose a value for each blank.');
    while (at < tokens.length) {
      if (tokens[at] === '[') { at++; const index = parse(); take(']'); left = { kind: 'index', base: left, index }; continue; }
      if (tokens[at] === '(' && left.kind === 'name') { at++; const args: Expr[] = []; if (tokens[at] !== ')') { do { args.push(parse()); } while (tokens[at] === ',' && ++at); } take(')'); left = { kind: 'call', name: left.name, args }; continue; }
      const op = tokens[at], precedence = operators[op];
      if (precedence === undefined || precedence < minimum) break;
      at++; left = { kind: 'binary', op, left, right: parse(precedence + 1) };
    }
    return left;
  };
  const tree = parse(); if (at !== tokens.length) throw Error('Check the expression.'); return tree;
}
function program(source: readonly string[]): Node[] {
  if (source.length > 40 || source.some(s => s.length > 140 || s.includes('\t'))) throw Error('Keep this program small.');
  let cursor = 0;
  const block = (indent: number): Node[] => {
    const nodes: Node[] = [];
    while (cursor < source.length) {
      const text = source[cursor], spaces = text.length - text.trimStart().length;
      if (spaces < indent) break;
      if (spaces !== indent || text.trim() === 'else:') { if (spaces === indent && text.trim() === 'else:') break; throw Error('Check the indentation.'); }
      const node: Node = { line: cursor++, text: text.trim(), body: [], otherwise: [] };
      if (node.text.endsWith(':')) {
        node.body = block(indent + 4); if (!node.body.length) throw Error('A block needs a line inside it.');
        if (source[cursor] === `${' '.repeat(indent)}else:`) { if (!node.text.startsWith('if ')) throw Error('Else needs an if.'); cursor++; node.otherwise = block(indent + 4); if (!node.otherwise.length) throw Error('Else needs a line.'); }
      }
      nodes.push(node);
    }
    return nodes;
  };
  const nodes = block(0); if (cursor !== source.length) throw Error('Check the block.'); return nodes;
}
/** Bounded even for while True and recursive functions. */
export function runPython(source: readonly string[], limit = 2048): Execution {
  const budget = Number.isFinite(limit) ? Math.min(4096, Math.max(1, Math.floor(limit))) : 2048;
  const result: Execution = { output: [], returned: null, trace: [], error: null, steps: 0 };
  const globals: Scope = {}, functions = new Map<string, { params: string[]; body: Node[] }>();
  const fuel = () => { if (++result.steps > budget) throw Error('This program reached the step limit. Try a smaller loop.'); };
  // Shared lists can expand exponentially when snapshotted. Charge every visited value,
  // including copies, comparisons and formatting, to the same execution budget.
  const copy = (v: Value, depth = 0): Value => {
    fuel(); if (depth > 24) throw Error('Too many nested values.');
    if (typeof v === 'string') for (let i = 0; i < v.length; i += 32) fuel();
    return Array.isArray(v) ? v.map(x => copy(x, depth + 1)) : v;
  };
  const equal = (a: Value, b: Value, depth = 0): boolean => {
    fuel(); if (depth > 24) throw Error('Too many nested values.');
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => equal(v, b[i], depth + 1));
    if (typeof a === 'string' && typeof b === 'string') for (let i = 0; i < Math.max(a.length, b.length); i += 32) fuel();
    return (typeof a === 'boolean' || typeof a === 'number') && (typeof b === 'boolean' || typeof b === 'number') ? Number(a) === Number(b) : a === b;
  };
  const number = (v: Value): number => { if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; throw Error('That operation needs a number.'); };
  const checked = (v: Value): Value => { if (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 1e9) || typeof v === 'string' && v.length > 1024 || Array.isArray(v) && v.length > 128) throw Error('That value is too large for this lab.'); return v; };
  const evaluate = (e: Expr, scope: Scope, depth = 0): Value => {
    fuel(); if (depth > 24) throw Error('Too many nested calls.');
    switch (e.kind) {
      case 'literal': return e.value;
      case 'name': { if (Object.hasOwn(scope, e.name)) return scope[e.name]; if (Object.hasOwn(globals, e.name)) return globals[e.name]; throw Error(`Set ${e.name} before using it.`); }
      case 'list': return checked(e.items.map(x => evaluate(x, scope, depth)));
      case 'unary': { const x = evaluate(e.right, scope, depth); return e.op === 'not' ? !truth(x) : -number(x); }
      case 'index': { const base = evaluate(e.base, scope, depth), i = number(evaluate(e.index, scope, depth)); if ((!Array.isArray(base) && typeof base !== 'string') || !Number.isInteger(i)) throw Error('Use a list and a whole position.'); const n = i < 0 ? base.length + i : i; if (n < 0 || n >= base.length) throw Error('That position is outside the list.'); return base[n]; }
      case 'binary': {
        const a = evaluate(e.left, scope, depth);
        if (e.op === 'and') return truth(a) ? evaluate(e.right, scope, depth) : a;
        if (e.op === 'or') return truth(a) ? a : evaluate(e.right, scope, depth);
        const b = evaluate(e.right, scope, depth);
        if (e.op === '==') return equal(a, b);
        if (e.op === '!=') return !equal(a, b);
        if (e.op === '+' && typeof a === 'string' && typeof b === 'string') return checked(a + b);
        if (e.op === '+' && Array.isArray(a) && Array.isArray(b)) return checked([...a, ...b]);
        if (e.op === '*' && typeof a === 'string') return checked(a.repeat(Math.max(0, Math.min(1025, number(b)))));
        const x = number(a), y = number(b);
        if (['/', '//', '%'].includes(e.op) && y === 0) throw Error('Cannot divide by zero.');
        switch (e.op) { case '+': return checked(x + y); case '-': return checked(x - y); case '*': return checked(x * y); case '/': return checked(x / y); case '//': return checked(Math.floor(x / y)); case '%': return checked(x - Math.floor(x / y) * y); case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y; default: throw Error('Unknown operation.'); }
      }
      case 'call': {
        const args = e.args.map(a => evaluate(a, scope, depth));
        if (e.name === 'print') { if (result.output.length >= 128) throw Error('Too many printed lines.'); result.output.push(args.map(v => pythonText(v, fuel)).join(' ')); return null; }
        if (e.name === 'len' && args.length === 1 && (Array.isArray(args[0]) || typeof args[0] === 'string')) return args[0].length;
        if (['sum', 'min', 'max'].includes(e.name) && args.length === 1 && Array.isArray(args[0])) { const ns = args[0].map(v => { fuel(); return number(v); }); if (!ns.length && e.name !== 'sum') throw Error('That list is empty.'); return checked(e.name === 'sum' ? ns.reduce((a, b) => a + b, 0) : e.name === 'min' ? Math.min(...ns) : Math.max(...ns)); }
        if (e.name === 'range' && args.length >= 1 && args.length <= 3) { const ns = args.map(number), start = ns.length === 1 ? 0 : ns[0], end = ns.length === 1 ? ns[0] : ns[1], step = ns[2] ?? 1; if (!ns.every(Number.isInteger) || step === 0) throw Error('Range needs whole numbers and a nonzero step.'); const out: Value[] = []; for (let i = start; step > 0 ? i < end : i > end; i += step) { fuel(); if (out.length >= 128) throw Error('Range is too large.'); out.push(i); } return out; }
        if (e.name.endsWith('.append') && args.length === 1) { const list = evaluate({ kind: 'name', name: e.name.slice(0, -7) }, scope, depth); if (!Array.isArray(list) || list.length >= 128) throw Error('Append needs room in a list.'); list.push(args[0]); return null; }
        const fn = functions.get(e.name); if (!fn || args.length !== fn.params.length) throw Error('Check the function and its inputs.');
        const local: Scope = {}; fn.params.forEach((p, i) => { local[p] = args[i]; });
        const returned = execute(fn.body, local, depth + 1);
        if (!returned) result.returned = null;
        return returned?.value ?? null;
      }
    }
  };
  const expr = (text: string, scope: Scope, depth: number) => evaluate(expression(text), scope, depth);
  const snapshot = (line: number, scope: Scope) => { result.trace.push({ line, watch: Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, copy(v)])), output: [...result.output], returned: copy(result.returned) }); };
  const execute = (nodes: Node[], scope: Scope, depth: number): { value: Value } | null => {
    for (const n of nodes) {
      fuel(); const t = n.text;
      const def = t.match(/^def (\w+)\(([^)]*)\):$/), loop = t.match(/^for (\w+) in (.*):$/), assignment = t.match(/^(\w+) = (.*)$/);
      if (def) { functions.set(def[1], { params: def[2] ? def[2].split(',').map(p => p.trim()) : [], body: n.body }); snapshot(n.line, scope); }
      else if (loop) { const values = expr(loop[2], scope, depth); if (!Array.isArray(values) && typeof values !== 'string') throw Error('Loop over a list or range.'); snapshot(n.line, scope); for (const v of [...values]) { fuel(); scope[loop[1]] = v; const returned = execute(n.body, scope, depth); if (returned) return returned; } }
      else if (t.startsWith('while ') && t.endsWith(':')) { while (true) { const condition = truth(expr(t.slice(6, -1), scope, depth)); snapshot(n.line, scope); if (!condition) break; fuel(); const returned = execute(n.body, scope, depth); if (returned) return returned; } }
      else if (t.startsWith('if ') && t.endsWith(':')) { const branch = truth(expr(t.slice(3, -1), scope, depth)); snapshot(n.line, scope); const returned = execute(branch ? n.body : n.otherwise, scope, depth); if (returned) return returned; }
      else if (t.startsWith('return ')) { if (depth === 0) throw Error('Return belongs inside a function.'); const value = expr(t.slice(7), scope, depth); result.returned = copy(value); snapshot(n.line, scope); return { value }; }
      else { if (n.body.length) throw Error('Unknown block.'); if (assignment) scope[assignment[1]] = checked(expr(assignment[2], scope, depth)); else expr(t, scope, depth); snapshot(n.line, scope); }
    }
    return null;
  };
  try { execute(program(source), globals, 0); } catch (e) { result.error = e instanceof Error ? e.message : 'Check the program.'; }
  return result;
}
