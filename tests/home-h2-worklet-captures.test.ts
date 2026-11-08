import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

it('native Home worklets never serialize the recognizer-bearing interaction object', () => {
 const result = babel.transformSync(readFileSync(process.env.LI_CAPTURE_SOURCE ?? 'src/home/HomeScreen.tsx', 'utf8'), {
  filename: 'src/home/HomeScreen.tsx', configFile: false, babelrc: false, ast: true,
  plugins: ['react-native-worklets/plugin', ['@babel/plugin-transform-typescript', { isTSX: true }]],
 });
 const interactionNames = new Set<string>();
 const closures: string[][] = [];
 function walk(node: any) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'CallExpression' && node.init.callee.name === 'useInteraction')
   interactionNames.add(node.id.name);
  if (node.type === 'AssignmentExpression' && node.left?.property?.name === '__closure' && node.right.type === 'ObjectExpression')
   closures.push(node.right.properties.map((p: any) => p.value?.name).filter(Boolean));
  for (const value of Object.values(node)) {
   if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
 }
 walk(result.ast);
 expect(interactionNames.size).toBeGreaterThan(0);
 expect(closures.length).toBeGreaterThan(0);
 for (const captures of closures) for (const name of interactionNames) expect(captures).not.toContain(name);
});
