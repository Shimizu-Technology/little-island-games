import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('native module loading', () => {
  it('loads only Picture Grid controls without touching PushNotificationIOS or any other lazy export', async () => {
    const native = { View: 'View', Text: 'Text', Pressable: 'Pressable' };
    Object.defineProperty(native, 'PushNotificationIOS', { enumerable: true, get() { throw new Error('missing native notification emitter'); } });
    let requires = 0;
    const exports: Record<string, unknown> = {};
    const output = ts.transpileModule(readFileSync('src/puzzles/picture-grid/nativeControls.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(output, { exports, require: (name: string) => { expect(name).toBe('react-native'); requires++; return native; } });
    expect(requires).toBe(0); // Catalog/registry tooling can import this module in Node.
    const load = exports.loadNativeControls as () => Promise<unknown>;
    await expect(load()).resolves.toEqual({ View: 'View', Text: 'Text', Pressable: 'Pressable' });
    expect(requires).toBe(1);
  });

  it('demonstrates why Metro namespace imports initialize unused native exports', () => {
    const context = vm.createContext({ __DEV__: false, __METRO_GLOBAL_PREFIX__: '' });
    context.global = context;
    vm.runInContext(readFileSync(require.resolve('metro-runtime/src/polyfills/require.js'), 'utf8'), context);
    const exports = { View: 'View', Text: 'Text', Pressable: 'Pressable' };
    const nativeFailure = new Error('unused native module initialized');
    Object.defineProperty(exports, 'PushNotificationIOS', { enumerable: true, get() { throw nativeFailure; } });
    context.exports = exports;
    vm.runInContext('__d(function(g,r,d,a,module) { module.exports = exports; }, 1, []);', context);
    expect(() => vm.runInContext('__r.importAll(1)', context)).toThrow(nativeFailure);
    expect(vm.runInContext('__r(1).View', context)).toBe('View');
  });

  it('keeps every app game free of runtime dynamic imports of the native core namespace', () => {
    const offenders: string[] = [];
    for (const path of ts.sys.readDirectory(resolve('src'), ['.ts', '.tsx'])) {
      const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
          && node.arguments.some(a => ts.isStringLiteral(a) && a.text === 'react-native')) {
          offenders.push(`${relative(process.cwd(), path)}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(file);
    }
    expect(offenders).toEqual([]);
  });
});
