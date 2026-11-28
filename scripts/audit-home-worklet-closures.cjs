/* global __dirname */
// Inspect the closures emitted by the shipping plugin, including auto-workletized hooks/gestures.
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '..');
function filesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? filesIn(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
}
function auditHomeWorklets(overrides = {}) {
  const modules = new Map(), errors = [], edges = [];
  let count = 0;
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = overrides[path.relative(root, file)] ?? fs.readFileSync(file, 'utf8');
    const ast = babel.parseSync(source, { filename: file, configFile: false, babelrc: false, parserOpts: { plugins: ['typescript', 'jsx'] } });
    const transformed = babel.transformFromAstSync(ast, source, { filename: file, configFile: false, babelrc: false, ast: true,
      plugins: ['react-native-worklets/plugin', ['@babel/plugin-transform-typescript', { isTSX: true }], '@babel/plugin-transform-react-jsx'] });
    const info = { ast, worklets: new Set(), closures: [], exports: new Map() };
    modules.set(file, info);
    traverse(transformed.ast, { AssignmentExpression(p) {
      const lhs = p.node.left;
      if (lhs.type !== 'MemberExpression' || lhs.property.name !== '__workletHash') return;
      const fn = p.scope.getBinding(lhs.object.name)?.path.get('init');
      if (!fn?.node?.body?.loc) throw Error(`Missing production worklet function in ${file}`);
      info.worklets.add(`${fn.node.body.loc.start.line}:${fn.node.body.loc.start.column}`);
    } });
    traverse(ast, { ExportNamedDeclaration(p) {
      const decl = p.get('declaration');
      if (decl.isFunctionDeclaration()) info.exports.set(decl.node.id.name, decl);
      if (decl.isVariableDeclaration()) for (const d of decl.get('declarations')) if (d.node.id.type === 'Identifier') info.exports.set(d.node.id.name, d.get('init'));
      for (const spec of p.get('specifiers')) {
        if (spec.node.type === 'ExportSpecifier') info.exports.set(spec.node.exported.name, { reexport: p.node.source?.value, name: spec.node.local.name, scope: p.scope });
      }
    }, Function(p) {
      if (p.node.body.loc && info.worklets.has(`${p.node.body.loc.start.line}:${p.node.body.loc.start.column}`)) info.closures.push(p);
    } });
    return info;
  }
  function localFile(file, source) {
    const base = path.resolve(path.dirname(file), source);
    return [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(f => fs.existsSync(f));
  }
  function callable(bindingPath, file, seen = new Set()) {
    if (!bindingPath?.node || seen.has(bindingPath.node)) return undefined;
    seen.add(bindingPath.node);
    if (bindingPath.isImportSpecifier()) {
      const from = bindingPath.parent.source.value;
      if (!from.startsWith('.')) {
        // These are UI-runtime primitives supplied by Reanimated/Worklets, not app JS.
        return /^(react-native-reanimated|react-native-worklets)$/.test(from) ? { safe: true } : { safe: false, label: `${from}/${bindingPath.node.imported.name}` };
      }
      const target = localFile(file, from);
      const exp = target && load(target).exports.get(bindingPath.node.imported.name);
      if (exp?.node) return callable(exp, target, seen);
      if (exp?.reexport) {
        const next = localFile(target, exp.reexport);
        return next && callable(load(next).exports.get(exp.name), next, seen);
      }
      if (exp?.scope) return callable(exp.scope.getBinding(exp.name)?.path, target, seen);
      return undefined;
    }
    if (bindingPath.isVariableDeclarator()) return callable(bindingPath.get('init'), file, seen);
    if (bindingPath.isIdentifier()) return callable(bindingPath.scope.getBinding(bindingPath.node.name)?.path, file, seen);
    if (bindingPath.isCallExpression() && bindingPath.node.callee.name === 'useCallback') return callable(bindingPath.get('arguments.0'), file, seen);
    if (bindingPath.isFunction()) {
      const loc = bindingPath.node.body.loc?.start;
      return { safe: !!loc && load(file).worklets.has(`${loc.line}:${loc.column}`), label: `${path.relative(root, file)}:${loc?.line}` };
    }
    return undefined;
  }
  // These callbacks cross typed component ports. Resolve their actual Home providers,
  // rather than trusting a prop's name/type or allowing arbitrary function parameters.
  function componentPort(file, name) {
    const consumer = path.relative(root, file);
    const interactionPort = /^src\/home\/runtime\/(?:DesignTools|FriendDrawer|StagingTray|StoredCell)\.tsx$/.test(consumer) && /^external(?:Down|Move|Up)$/.test(name);
    const mealPort = consumer === 'src/home/runtime/MealPaths.tsx' && name === 'index';
    if (!interactionPort && !mealPort) return undefined;
    const provider = path.join(root, 'src/home/runtime', interactionPort ? 'useInteraction.ts' : 'MealArt.tsx');
    const providerName = interactionPort ? name : 'frameIndex';
    let declaration;
    traverse(load(provider).ast, { FunctionDeclaration(p) { if (p.node.id?.name === providerName) declaration = p; },
      VariableDeclarator(p) { if (p.node.id.name === providerName) declaration = p.get('init'); } });
    if (!declaration) return { safe: false, label: `missing component provider ${providerName}` };
    return callable(declaration, provider);
  }
  for (const file of filesIn(path.join(root, 'src/home'))) load(file);
  // Loading a captured helper may add a module outside Home. Audit its worklets too.
  for (const [file, info] of modules) for (const fn of info.closures) {
    count++;
    fn.traverse({ Identifier(p) {
      if (!p.isReferencedIdentifier() || p.findParent(x => x.node.type.startsWith('TS'))) return;
      const binding = p.scope.getBinding(p.node.name);
      if (!binding || binding.scope === fn.scope || binding.path.findParent(x => x === fn)) return;
      // JS callbacks are allowed only as scheduled runOnJS payloads, never direct UI calls.
      if (p.parentPath.isCallExpression() && p.key !== 'callee' && p.parentPath.node.callee.name === 'runOnJS') return;
      const value = callable(binding.path, file) ?? componentPort(file, p.node.name);
      if (!value) {
        const call = p.parentPath;
        const callback = call.isCallExpression() && call.node.callee.type === 'MemberExpression' &&
          /^(?:map|flatMap|filter|find|some|every|forEach|sort|reduce|modify)$/.test(call.node.callee.property.name);
        if (call.isCallExpression() && p.key === 'callee' || callback) errors.push(`${path.relative(root, file)}:${p.node.loc.start.line} -> unverified callable ${p.node.name}`);
        return; // serialized data and shared-value handles aren't app functions
      }
      const edge = `${path.relative(root, file)}:${p.node.loc.start.line} -> ${p.node.name} (${value.label ?? 'UI primitive'})`;
      edges.push(edge);
      if (!value.safe) errors.push(edge);
    } });
  }
  if (errors.length) throw Error(`Unsafe UI worklet captures:\n${[...new Set(errors)].join('\n')}`);
  if (count < 150) throw Error(`Audit did not discover Home's worklets: ${count}`);
  return { worklets: count, callableCaptures: new Set(edges).size };
}
module.exports = { auditHomeWorklets };
if (require.main === module) console.log(auditHomeWorklets());
