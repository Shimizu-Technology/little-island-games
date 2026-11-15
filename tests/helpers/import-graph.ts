import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { resolveLocal } from "./reading-clock";

/**
 * The app's import graph, resolved the way Metro resolves it (`reading-clock.ts`'s resolver: relative and `@/` paths,
 * normalised, every extension and platform variant, directory indexes). Every way a module can name another counts:
 * import, export-from, `import x = require()`, `require()` and `import()`. An edge is type-only only when TypeScript
 * erases it (`import type`, `export type`, or an import whose every name is a type).
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
  const add = (spec: string, typeOnly: boolean, bindings: Binding[] = []) => out.push({ from: file, spec, to: resolveLocal(root, file, spec), typeOnly, bindings });
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
/**
 * The modules that render one of `components` (a map from a defining module to the component names it exports) as a
 * JSX element or through `createElement`, however the name was imported (renamed, default, or a namespace).
 */
export function renderers(root: string, files: readonly string[], components: Readonly<Record<string, readonly string[]>>): Record<string, { component: string; props: string[] }[]> {
  const out: Record<string, { component: string; props: string[] }[]> = {};
  for (const file of files) {
    const local = new Map<string, string>(), namespaces = new Map<string, string>();
    for (const e of edgesOf(root, file)) {
      if (!e.to || e.typeOnly || !components[e.to]) continue;
      for (const b of e.bindings) {
        if (b.imported === "*") namespaces.set(b.local, e.to);
        else if (components[e.to].includes(b.imported)) local.set(b.local, `${e.to}#${b.imported}`);
      }
    }
    // A module that defines one of the components renders it when it names it in JSX too.
    for (const name of components[file] ?? []) local.set(name, `${file}#${name}`);
    if (!local.size && !namespaces.size) continue;
    const tree = ts.createSourceFile(file, readFileSync(join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
    const named = (tag: ts.Node): string | undefined => {
      if (ts.isIdentifier(tag)) return local.get(tag.text);
      if (ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.expression)) {
        const ns = namespaces.get(tag.expression.text);
        return ns && components[ns].includes(tag.name.text) ? `${ns}#${tag.name.text}` : undefined;
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
      // The component passed around as a value is a renderer we cannot see through.
      if (ts.isIdentifier(n) && local.has(n.text) && !ts.isJsxOpeningElement(n.parent) && !ts.isJsxSelfClosingElement(n.parent) && !ts.isJsxClosingElement(n.parent) && !ts.isImportSpecifier(n.parent) && !ts.isImportClause(n.parent) && !(ts.isCallExpression(n.parent) && n.parent.arguments[0] === n) && !ts.isFunctionDeclaration(n.parent) && !(components[file]?.includes(n.text))) found.push({ component: local.get(n.text)!, props: ["value"] });
      ts.forEachChild(n, visit);
    };
    visit(tree);
    if (found.length) out[file] = found;
  }
  return out;
}
