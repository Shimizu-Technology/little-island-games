import { resolve, relative } from 'node:path';
import ts from 'typescript';
import { expect, test } from 'vitest';
import { POWER_SECONDS } from '../src/arcade/games/lagoon-run/course';
import { createRun } from '../src/arcade/games/lagoon-run/engine';
import { POWER_AURA, RUN_SLOTS, runPoses } from '../src/arcade/games/scrolling/render';

function hasWorkletDirective(body: ts.ConciseBody | undefined) {
  if (!body || !ts.isBlock(body)) return false;
  for (const statement of body.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === 'worklet') return true;
  }
  return false;
}

function* topLevelWorklets(file: ts.SourceFile) {
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && hasWorkletDirective(statement.body)) {
      yield { name: statement.name, node: statement };
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const { name, initializer } of statement.declarationList.declarations) {
      if (ts.isIdentifier(name) && initializer &&
          (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) &&
          hasWorkletDirective(initializer.body)) {
        yield { name, node: initializer };
      }
    }
  }
}

test('Arcade worklets only capture same-file top-level worklets initialized before them', () => {
  const arcade = resolve('src/arcade');
  const paths = ts.sys.readDirectory(arcade, ['.ts', '.tsx']);
  const program = ts.createProgram(paths, { noResolve: true, noLib: true, types: [] });
  const checker = program.getTypeChecker();
  const errors: string[] = [];
  let workletCount = 0;

  for (const file of program.getSourceFiles()) {
    const worklets = [...topLevelWorklets(file)];
    workletCount += worklets.length;
    const positions = new Map(worklets.map(({ name }, index) => [checker.getSymbolAtLocation(name), index]));

    for (const [index, { name, node }] of worklets.entries()) {
      // Babel captures free bindings when the module initializes the worklet factory.
      function visit(child: ts.Node) {
        if (ts.isTypeNode(child)) return;
        if (ts.isIdentifier(child)) {
          const symbol = ts.isShorthandPropertyAssignment(child.parent) && child.parent.name === child
            ? checker.getShorthandAssignmentValueSymbol(child.parent)
            : checker.getSymbolAtLocation(child);
          const target = positions.get(symbol);
          if (target !== undefined && target > index) {
            const { line } = file.getLineAndCharacterOfPosition(child.getStart(file));
            errors.push(`${relative(process.cwd(), file.fileName)}:${line + 1}: ${name.text} captures later worklet ${child.text}`);
          }
        }
        ts.forEachChild(child, visit);
      }
      ts.forEachChild(node, visit);
    }
  }

  expect(workletCount).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('runPoses builds a full pose array with the active power effect', () => {
  const state = { ...createRun('endless', 42), kite: POWER_SECONDS.kite / 2 };
  const poses = runPoses(state);

  expect(poses).toHaveLength(RUN_SLOTS);
  expect(poses[POWER_AURA + 2].opacity).toBeGreaterThan(0);
});
