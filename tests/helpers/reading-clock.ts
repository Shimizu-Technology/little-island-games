import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Reading is never timed. This follows every local module a reading route can reach (relative and `@/` imports,
 * re-exports, require and dynamic import, every platform variant) and lists each clock it touches, so a timer in a
 * shared hook or helper is found as surely as one in the game's own folder.
 */
const variants = ["", ".tsx", ".ts", ".ios.tsx", ".ios.ts", ".android.tsx", ".android.ts", ".native.tsx", ".native.ts", ".web.tsx", ".web.ts", ".js", ".jsx", "/index.tsx", "/index.ts", "/index.js"];
export function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((n) => files(join(path, n))).filter((f) => /\.(ts|tsx)$/.test(f));
}
export function reachable(root: string, entries: readonly string[]): string[] {
  const seen = new Set<string>(), queue: string[] = [];
  const add = (path: string) => {
    for (const v of variants) {
      const candidate = path + v;
      if (!existsSync(candidate) || !statSync(candidate).isFile() || !/\.[jt]sx?$/.test(candidate)) continue;
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

export type ClockUse = { file: string; kind: "timeout" | "interval" | "frame" | "clock" | "animation-callback"; key: string; text: string };
const TIMEOUT = new Set(["setTimeout", "setImmediate", "requestIdleCallback", "runAfterInteractions"]);
const INTERVAL = new Set(["setInterval"]);
const FRAME = new Set(["requestAnimationFrame"]);
/** Every clock a set of modules touches, keyed by file, kind and a digest of the exact call, so a key names one call. */
export function clockUses(root: string, names: readonly string[]): ClockUse[] {
  const out: ClockUse[] = [];
  for (const file of names) {
    const tree = ts.createSourceFile(file, readFileSync(join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
    // A callback passed by name is bound by its declaration too, so changing what a timer runs changes its key.
    const declared = new Map<string, string>();
    const collect = (n: ts.Node) => {
      if ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n)) && n.name && ts.isIdentifier(n.name)) declared.set(n.name.text, n.getText(tree));
      ts.forEachChild(n, collect);
    };
    collect(tree);
    const push = (kind: ClockUse["kind"], node: ts.Node) => {
      const named = ts.isCallExpression(node) ? node.arguments.filter(ts.isIdentifier).map((a) => declared.get(a.text) ?? "") : [];
      const text = [node.getText(tree), ...named].join(" ").replace(/\s+/g, " ");
      out.push({ file, kind, key: `${file}#${kind}#${createHash("sha256").update(text).digest("hex").slice(0, 12)}`, text });
    };
    const callee = (e: ts.Expression) => (ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "");
    const visit = (n: ts.Node) => {
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
      ts.forEachChild(n, visit);
    };
    visit(tree);
  }
  return out;
}
