// Lets build tools import the app's real engines, which use extensionless and type-only imports.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const candidates = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith('.') || specifier.startsWith('/')) && context.parentURL?.startsWith('file:')) {
    const base = new URL(specifier, context.parentURL);
    for (const suffix of candidates) {
      const path = fileURLToPath(base) + suffix;
      if (existsSync(path) && (suffix || /\.tsx?$/.test(path))) return { url: pathToFileURL(path).href, shortCircuit: true };
    }
    if (specifier.endsWith('.json')) return { url: base.href, shortCircuit: true, importAttributes: { type: 'json' } };
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (!/\.tsx?$/.test(url)) return next(url, context);
  const source = readFileSync(fileURLToPath(url), 'utf8');
  const { outputText } = ts.transpileModule(source, { fileName: fileURLToPath(url), compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: false } });
  return { format: 'module', source: outputText, shortCircuit: true };
}
