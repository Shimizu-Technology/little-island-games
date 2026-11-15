import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { resolveAll } from "./reading-clock";

/**
 * The app's import graph, resolved the way Metro resolves it (`reading-clock.ts`'s resolver: relative and `@/` paths,
 * normalised, every extension and platform variant, directory indexes). Every way a module can name another counts:
 * import, export-from, `import x = require()`, `require()` and `import()`. An edge is type-only only when TypeScript
 * erases it (`import type`, `export type`, or an import whose every name is a type). An import that can resolve to
 * several files (a plain module and its `.ios`, `.android`, `.native` or `.web` variants) gives one edge to each, since
 * some bundle loads each of them.
 */
export type Binding = { local: string; imported: string };
export type Edge = { from: string; spec: string; to: string | undefined; typeOnly: boolean; bindings: Binding[] };
const CODE = /\.(?:[cm]?[jt]sx?)$/;
export function appFiles(root: string, dirs: readonly string[] = ["src", "content", "modules"]): string[] {
  const walk = (dir: string): string[] => readdirSync(join(root, dir)).flatMap((n) => {
    const p = `${dir}/${n}`;
    if (n === "node_modules") return [];
    return statSync(join(root, p)).isDirectory() ? walk(p) : CODE.test(n) ? [p] : [];
  });
  return dirs.filter((d) => existsSync(join(root, d))).flatMap(walk).sort();
}
export function edgesOf(root: string, file: string): Edge[] {
  const tree = ts.createSourceFile(file, readFileSync(join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const out: Edge[] = [];
  const add = (spec: string, typeOnly: boolean, bindings: Binding[] = []) => {
    const targets = resolveAll(root, file, spec);
    for (const to of targets.length ? targets : [undefined]) out.push({ from: file, spec, to, typeOnly, bindings });
  };
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteralLike(n.moduleSpecifier)) {
      const clause = n.importClause, named = clause?.namedBindings;
      const bindings: Binding[] = [];
      if (clause?.name) bindings.push({ local: clause.name.text, imported: "default" });
      if (named && ts.isNamespaceImport(named)) bindings.push({ local: named.name.text, imported: "*" });
      else if (named) for (const e of named.elements) if (!e.isTypeOnly) bindings.push({ local: e.name.text, imported: (e.propertyName ?? e.name).text });
      const allTypes = !!clause && (clause.isTypeOnly || (!clause.name && !!named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)));
      add(n.moduleSpecifier.text, allTypes, bindings);
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteralLike(n.moduleSpecifier)) {
      const named = n.exportClause;
      add(n.moduleSpecifier.text, n.isTypeOnly || (!!named && ts.isNamedExports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)));
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference) && ts.isStringLiteralLike(n.moduleReference.expression)) {
      add(n.moduleReference.expression.text, n.isTypeOnly, [{ local: n.name.text, imported: "*" }]);
    } else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require")) && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
      add(n.arguments[0].text, false);
    }
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return out;
}
/** Every module `entry` loads at run time, itself included. */
export function closure(root: string, entry: string): string[] {
  const seen = new Set<string>([entry]), queue = [entry];
  for (let i = 0; i < queue.length; i++) for (const e of edgesOf(root, queue[i])) if (e.to && !e.typeOnly && !seen.has(e.to)) { seen.add(e.to); queue.push(e.to); }
  return [...seen].sort();
}
/** What a name exported by a module is, followed through re-exports: one of the tracked components, or a namespace. */
type Exported = { component: string } | { namespace: string };
const trees = new Map<string, ts.SourceFile>();
const parsed = (root: string, file: string) => {
  const key = join(root, file);
  if (!trees.has(key)) trees.set(key, ts.createSourceFile(file, readFileSync(key, "utf8"), ts.ScriptTarget.Latest, true));
  return trees.get(key)!;
};
/** What `local` names inside `file`, through the module's own runtime imports. */
function imported(root: string, file: string, local: string, components: Readonly<Record<string, readonly string[]>>, seen: Set<string>): Exported[] {
  if (components[file]?.includes(local)) return [{ component: `${file}#${local}` }];
  return edgesOf(root, file).flatMap((e) => (!e.to || e.typeOnly ? [] : e.bindings.filter((b) => b.local === local).flatMap((b) => (b.imported === "*" ? [{ namespace: e.to! }] : exported(root, e.to!, b.imported, components, seen)))));
}
/**
 * What `name`, exported by `file`, is: a tracked component, followed through `export { X } from`, `export { X as Y }
 * from`, `export * from`, `export * as ns from`, `import { X }; export { X }` and `export default X` re-exports.
 */
export function exported(root: string, file: string, name: string, components: Readonly<Record<string, readonly string[]>>, seen = new Set<string>()): Exported[] {
  const key = `${file}#${name}`;
  if (seen.has(key)) return [];
  seen.add(key);
  if (components[file]?.includes(name)) return [{ component: key }];
  const out: Exported[] = [];
  for (const st of parsed(root, file).statements) {
    if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      const targets = st.moduleSpecifier && ts.isStringLiteralLike(st.moduleSpecifier) ? resolveAll(root, file, st.moduleSpecifier.text) : undefined;
      const clause = st.exportClause;
      if (!clause) { if (targets && name !== "default") for (const t of targets) out.push(...exported(root, t, name, components, seen)); }
      else if (ts.isNamespaceExport(clause)) { if (targets && clause.name.text === name) for (const t of targets) out.push({ namespace: t }); }
      else for (const el of clause.elements) {
        if (el.isTypeOnly || el.name.text !== name) continue;
        const original = (el.propertyName ?? el.name).text;
        if (targets) for (const t of targets) out.push(...exported(root, t, original, components, seen));
        else out.push(...imported(root, file, original, components, seen));
      }
    } else if (ts.isExportAssignment(st) && name === "default" && ts.isIdentifier(st.expression)) out.push(...imported(root, file, st.expression.text, components, seen));
  }
  return out;
}
/**
 * The modules that render one of `components` (a map from a defining module to the component names it exports) as a
 * JSX element or through `createElement`, however the name was imported (renamed, default, a namespace, or through a
 * barrel that re-exports it).
 */
export function renderers(root: string, files: readonly string[], components: Readonly<Record<string, readonly string[]>>): Record<string, { component: string; props: string[] }[]> {
  const out: Record<string, { component: string; props: string[] }[]> = {};
  for (const file of files) {
    const local = new Map<string, string>(), namespaces = new Map<string, string[]>();
    for (const e of edgesOf(root, file)) {
      if (!e.to || e.typeOnly) continue;
      for (const b of e.bindings) {
        if (b.imported === "*") namespaces.set(b.local, [...(namespaces.get(b.local) ?? []), e.to]);
        else for (const x of exported(root, e.to, b.imported, components)) {
          if ("component" in x) local.set(b.local, x.component);
          else namespaces.set(b.local, [...(namespaces.get(b.local) ?? []), x.namespace]);
        }
      }
    }
    // A module that defines one of the components renders it when it names it in JSX too.
    for (const name of components[file] ?? []) local.set(name, `${file}#${name}`);
    if (!local.size && !namespaces.size) continue;
    const tree = parsed(root, file);
    /** The modules a namespace expression stands for (`kit`, or `kit.inner` for `export * as inner`). */
    const spaces = (e: ts.Expression): string[] => {
      if (ts.isIdentifier(e)) return namespaces.get(e.text) ?? [];
      if (ts.isPropertyAccessExpression(e)) return spaces(e.expression).flatMap((ns) => exported(root, ns, e.name.text, components)).flatMap((x) => ("namespace" in x ? [x.namespace] : []));
      return [];
    };
    const named = (tag: ts.Node): string | undefined => {
      if (ts.isIdentifier(tag)) return local.get(tag.text);
      if (ts.isPropertyAccessExpression(tag)) {
        for (const ns of spaces(tag.expression)) for (const x of exported(root, ns, tag.name.text, components)) if ("component" in x) return x.component;
      }
      return undefined;
    };
    const found: { component: string; props: string[] }[] = [];
    const visit = (n: ts.Node) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const c = named(n.tagName);
        if (c) found.push({ component: c, props: n.attributes.properties.map((a) => (ts.isJsxAttribute(a) ? a.name.getText(tree) : "...spread")) });
      }
      if (ts.isCallExpression(n) && /(?:^|\.)createElement$/.test(n.expression.getText(tree)) && n.arguments[0]) {
        const c = named(n.arguments[0]);
        if (c) found.push({ component: c, props: ["createElement"] });
      }
      // The component passed around as a value is a renderer we cannot see through. Re-exporting it is followed instead.
      if (ts.isIdentifier(n) && local.has(n.text) && !ts.isJsxOpeningElement(n.parent) && !ts.isJsxSelfClosingElement(n.parent) && !ts.isJsxClosingElement(n.parent) && !ts.isImportSpecifier(n.parent) && !ts.isImportClause(n.parent) && !ts.isExportSpecifier(n.parent) && !ts.isExportAssignment(n.parent) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isCallExpression(n.parent) && n.parent.arguments[0] === n) && !ts.isFunctionDeclaration(n.parent) && !(components[file]?.includes(n.text))) found.push({ component: local.get(n.text)!, props: ["value"] });
      // So is one reached through a namespace (`kit.ReadingText`) anywhere but a tag or createElement.
      if (ts.isPropertyAccessExpression(n) && !((ts.isJsxOpeningElement(n.parent) || ts.isJsxSelfClosingElement(n.parent) || ts.isJsxClosingElement(n.parent)) && n.parent.tagName === n) && !(ts.isCallExpression(n.parent) && n.parent.arguments[0] === n && /(?:^|\.)createElement$/.test(n.parent.expression.getText(tree)))) {
        const c = named(n);
        if (c) found.push({ component: c, props: ["value"] });
      }
      ts.forEachChild(n, visit);
    };
    visit(tree);
    if (found.length) out[file] = found;
  }
  return out;
}
