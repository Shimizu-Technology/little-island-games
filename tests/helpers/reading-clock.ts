import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Reading is never timed. This is the static supplement to the fake-clock tests (`tests/reading-fake-clock.test.tsx`):
 * it follows every local module a reading route can reach, the way Metro resolves them (relative and `@/` imports,
 * re-exports, require and dynamic import; `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` and `.cjs`; every platform variant,
 * including a directory's `index.ios.ts` and the like), and lists each clock it touches. A clock used any way other
 * than a direct call (an alias, a destructured or imported rename, a computed lookup) is reported as a reference, and
 * no reference is ever allowed.
 */
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];
const PLATFORMS = ["", ".ios", ".android", ".native", ".web"];
const variants = ["", ...PLATFORMS.flatMap((p) => EXTENSIONS.map((e) => p + e)), ...PLATFORMS.flatMap((p) => EXTENSIONS.map((e) => `/index${p}${e}`))];
export function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((n) => files(join(path, n))).filter((f) => SOURCE.test(f));
}
/**
 * `stop` names modules whose imports are not followed: the generated game registries, which reach every game in the app.
 * The reading games are entries in their own right, so nothing a reading route runs is lost.
 */
export function reachable(root: string, entries: readonly string[], stop: readonly string[] = []): string[] {
  const seen = new Set<string>(), queue: string[] = [];
  const add = (path: string) => {
    for (const v of variants) {
      const candidate = path + v;
      if (!existsSync(candidate) || !statSync(candidate).isFile() || !SOURCE.test(candidate)) continue;
      const name = relative(root, candidate);
      if (!name.startsWith("..") && !seen.has(name)) {
        seen.add(name);
        queue.push(name);
      }
    }
  };
  for (const e of entries) add(resolve(root, e));
  for (let i = 0; i < queue.length; i++) {
    const name = queue[i], path = join(root, name);
    if (stop.includes(name)) continue;
    const tree = ts.createSourceFile(name, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    const edge = (spec: string) => {
      if (spec.startsWith(".")) add(resolve(dirname(path), spec));
      else if (spec.startsWith("@/")) add(join(root, "src", spec.slice(2)));
    };
    const visit = (n: ts.Node) => {
      if ((ts.isImportDeclaration(n) && !n.importClause?.isTypeOnly) || (ts.isExportDeclaration(n) && !n.isTypeOnly)) {
        if (n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) edge(n.moduleSpecifier.text);
      }
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require")) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) edge(n.arguments[0].text);
      ts.forEachChild(n, visit);
    };
    visit(tree);
  }
  return [...seen].sort();
}

/** `call` is the call with the local declarations of callbacks passed by name; `text` is everything the key binds. */
export type ClockUse = { file: string; kind: "timeout" | "interval" | "frame" | "clock" | "animation-callback" | "clock-call" | "reference"; key: string; call: string; text: string };
/**
 * Small, reviewed functions that own the School host's and the Store's clocks (R1a fix 4). The clock inside each is
 * keyed like any other, by its whole (small) function. A call to one from another module is a `clock-call`, keyed by
 * the call itself and every function-valued declaration it uses, followed name by name (a wrapped `sound`, a
 * `useCallback`), but not by the rest of the function it sits in, so an ordinary host edit elsewhere needs no fresh
 * review. Any other use of one (an alias, a namespace passed around, a require) is a reference and is never allowed.
 */
export const CLOCK_OWNERS: Readonly<Record<string, readonly string[]>> = {
  "src/learn/frameClocks.ts": ["speakAfter"],
  "src/state/storeClocks.ts": ["flushDeadline", "launchClock", "newLearnerId", "restorePause", "slowOpenNotice"],
};
/** The local file an import names, resolved the way `reachable` resolves it, or undefined. */
export function resolveLocal(root: string, from: string, spec: string): string | undefined {
  const base = spec.startsWith(".") ? resolve(root, dirname(from), spec) : spec.startsWith("@/") ? join(resolve(root), "src", spec.slice(2)) : undefined;
  if (!base) return undefined;
  for (const v of variants) {
    const candidate = base + v;
    if (existsSync(candidate) && statSync(candidate).isFile() && SOURCE.test(candidate)) return relative(resolve(root), candidate);
  }
  return undefined;
}
const TIMEOUT = new Set(["setTimeout", "setImmediate", "requestIdleCallback", "runAfterInteractions"]);
const INTERVAL = new Set(["setInterval"]);
const FRAME = new Set(["requestAnimationFrame"]);
const CLOCKS = new Set([...TIMEOUT, ...INTERVAL, ...FRAME]);
const isFunction = (n: ts.Node): n is ts.FunctionLikeDeclaration => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isConstructorDeclaration(n);
const inType = (n: ts.Node): boolean => { for (let p = n.parent; p; p = p.parent) { if (ts.isTypeNode(p)) return true; if (ts.isStatement(p) || ts.isExpression(p) && !ts.isIdentifier(p)) return false; } return false; };

/**
 * Every clock a set of modules touches. An allowance key binds the file, the kind and a digest of everything the call
 * depends on in its module: the whole function the call sits in, and, followed through every name it uses, the
 * declarations those names come from (a renamed prop, a wrapper function, a ref, an import). Changing any of them
 * changes the key, so the call needs a fresh look. What an imported module does is checked by the fake-clock tests.
 */
export function clockUses(root: string, names: readonly string[]): ClockUse[] {
  const out: ClockUse[] = [];
  for (const file of names) {
    const path = join(root, file), text = readFileSync(path, "utf8");
    // One file, no libraries: the checker is used only to find which local declaration a name refers to.
    const program = ts.createProgram([path], { noResolve: true, noLib: true, allowJs: true, jsx: ts.JsxEmit.Preserve, types: [] }, {
      ...ts.createCompilerHost({}),
      getSourceFile: (name, target) => (resolve(name) === resolve(path) ? ts.createSourceFile(name, text, target, true) : undefined),
      fileExists: (name) => resolve(name) === resolve(path),
      readFile: (name) => (resolve(name) === resolve(path) ? text : undefined),
    });
    const tree = program.getSourceFile(path)!;
    let checked: ts.TypeChecker | undefined;
    const checker = { getSymbolAtLocation: (n: ts.Node) => (checked ??= program.getTypeChecker()).getSymbolAtLocation(n) };
    /** The declaration a use of a name should bring with it: a whole statement, parameter or import specifier. */
    const unit = (d: ts.Node): ts.Node => {
      for (let p: ts.Node = d; p.parent; p = p.parent) {
        if (ts.isParameter(p) || ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return p;
        if (ts.isVariableStatement(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p)) return p;
        if (ts.isVariableDeclaration(p) && ts.isVariableDeclarationList(p.parent) && !ts.isVariableStatement(p.parent.parent)) return p.parent;
      }
      return d;
    };
    const bound = (call: ts.Node): string => {
      let fn: ts.Node = call;
      while (fn.parent && !isFunction(fn)) fn = fn.parent;
      const taken: ts.Node[] = [fn], queue: ts.Node[] = [fn];
      const contains = (outer: ts.Node, n: ts.Node) => n.pos >= outer.pos && n.end <= outer.end;
      while (queue.length) {
        const visit = (n: ts.Node) => {
          if (ts.isIdentifier(n)) {
            for (const d of checker.getSymbolAtLocation(n)?.declarations ?? []) {
              if (d.getSourceFile() !== tree) continue;
              const u = unit(d);
              if (!taken.some((t) => contains(t, u))) { taken.push(u); queue.push(u); }
            }
          }
          ts.forEachChild(n, visit);
        };
        visit(queue.shift()!);
      }
      return taken.sort((a, b) => a.pos - b.pos).map((n) => n.getText(tree)).join("\n");
    };
    /** A clock-call binds the call and, followed name by name, every function-valued declaration it uses. */
    const functional = (u: ts.Node): boolean => {
      if (ts.isFunctionDeclaration(u)) return true;
      const list = ts.isVariableStatement(u) ? u.declarationList : ts.isVariableDeclarationList(u) ? u : undefined;
      return !!list?.declarations.some((d) => !!d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer) || (ts.isCallExpression(d.initializer) && /^use(?:Callback|EffectEvent)$/.test(callee(d.initializer.expression)))));
    };
    const callbacks = (call: ts.Node): string => {
      const taken: ts.Node[] = [call], queue: ts.Node[] = [call];
      const contains = (outer: ts.Node, n: ts.Node) => n.pos >= outer.pos && n.end <= outer.end;
      while (queue.length) {
        const visit = (n: ts.Node) => {
          if (ts.isIdentifier(n)) {
            for (const d of checker.getSymbolAtLocation(n)?.declarations ?? []) {
              if (d.getSourceFile() !== tree) continue;
              const u = unit(d);
              if (functional(u) && !taken.some((t) => contains(t, u))) { taken.push(u); queue.push(u); }
            }
          }
          ts.forEachChild(n, visit);
        };
        visit(queue.shift()!);
      }
      return taken.sort((a, b) => a.pos - b.pos).map((n) => n.getText(tree)).join("\n");
    };
    // Names this module imports from a clock owner: `{ speakAfter as later }` maps later, `* as clocks` maps clocks.
    const owned = new Set<string>(), owners = new Map<string, string>();
    const ownerOf = (spec: string) => { const f = resolveLocal(root, file, spec); return f && Object.hasOwn(CLOCK_OWNERS, f) ? f : undefined; };
    for (const st of tree.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly || !ts.isStringLiteralLike(st.moduleSpecifier)) continue;
      const owner = ownerOf(st.moduleSpecifier.text), clause = st.importClause;
      if (!owner || !clause) continue;
      if (clause.name) owners.set(clause.name.text, owner);
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) owners.set(bindings.name.text, owner);
      else if (bindings) for (const e of bindings.elements) if (!e.isTypeOnly && CLOCK_OWNERS[owner].includes((e.propertyName ?? e.name).text)) owned.add(e.name.text);
    }
    const named = (node: ts.Node) =>
      ts.isCallExpression(node) ? node.arguments.filter(ts.isIdentifier).flatMap((a) => (checker.getSymbolAtLocation(a)?.declarations ?? []).filter((d) => d.getSourceFile() === tree).map((d) => d.getText(tree))) : [];
    const push = (kind: ClockUse["kind"], node: ts.Node) => {
      const shown = node.getText(tree), call = [shown, ...named(node)].join(" ").replace(/\s+/g, " ");
      const bind = kind === "reference" ? shown.replace(/\s+/g, " ") : kind === "clock-call" ? callbacks(node).replace(/\s+/g, " ") : `${shown}\n${bound(node)}`.replace(/\s+/g, " ");
      out.push({ file, kind, key: `${file}#${kind}#${createHash("sha256").update(bind).digest("hex").slice(0, 12)}`, call, text: bind });
    };
    const callee = (e: ts.Expression) => (ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "");
    const calledAs = (n: ts.Node) => {
      const call = ts.isPropertyAccessExpression(n.parent) && n.parent.name === n ? n.parent : n;
      return ts.isCallExpression(call.parent) && call.parent.expression === call;
    };
    const declaredHere = (n: ts.Identifier) => ts.isImportSpecifier(n.parent) || ts.isNamespaceImport(n.parent) || ts.isImportClause(n.parent);
    const visit = (n: ts.Node) => {
      // A reviewed clock function: called directly it is a clock-call; any other use is a reference.
      if (ts.isIdentifier(n) && !inType(n) && !declaredHere(n)) {
        const p = n.parent;
        if (owned.has(n.text) && !(ts.isPropertyAccessExpression(p) && p.name === n)) push(calledAs(n) ? "clock-call" : "reference", p);
        else if (owners.has(n.text) && ts.isPropertyAccessExpression(p) && p.expression === n && CLOCK_OWNERS[owners.get(n.text)!].includes(p.name.text) && calledAs(p.name)) push("clock-call", p.parent);
        else if (owners.has(n.text) && !(ts.isPropertyAccessExpression(p) && p.name === n)) push("reference", p);
      }
      if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require")) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0]) && ownerOf(n.arguments[0].text)) push("reference", n);
      if (ts.isExportDeclaration(n) && !n.isTypeOnly && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier) && ownerOf(n.moduleSpecifier.text)) push("reference", n);
      if (ts.isCallExpression(n)) {
        const name = callee(n.expression);
        if (TIMEOUT.has(name)) push("timeout", n);
        else if (INTERVAL.has(name)) push("interval", n);
        else if (FRAME.has(name)) push("frame", n);
        else if (name === "now" && ts.isPropertyAccessExpression(n.expression) && /^(?:Date|performance)$/.test(n.expression.expression.getText(tree))) push("clock", n);
        // An animation that runs code when it finishes is a timer too.
        else if (name === "start" && n.arguments.length > 0) push("animation-callback", n);
        else if (/^with(?:Timing|Delay|Spring|Repeat|Sequence)$/.test(name) && n.arguments.some((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a))) push("animation-callback", n);
      }
      if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "Date") push("clock", n);
      // Any other mention of a clock: `const later = setTimeout`, `{ setTimeout: later } = globalThis`, an import
      // rename, `globalThis["setTimeout"]`, `performance.now` passed as a value, `const D = Date`.
      if (ts.isIdentifier(n) && !inType(n)) {
        const p = n.parent;
        if (CLOCKS.has(n.text) && !calledAs(n)) push("reference", p);
        else if (n.text === "Date" && !((ts.isNewExpression(p) && p.expression === n) || (ts.isPropertyAccessExpression(p) && p.expression === n && (p.name.text !== "now" || calledAs(p.name))))) push("reference", p);
        else if (n.text === "now" && ts.isPropertyAccessExpression(p) && p.name === n && p.expression.getText(tree) === "performance" && !calledAs(n)) push("reference", p);
      }
      if (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && (CLOCKS.has(n.argumentExpression.text) || n.argumentExpression.text === "now")) push("reference", n);
      ts.forEachChild(n, visit);
    };
    visit(tree);
  }
  return out;
}
