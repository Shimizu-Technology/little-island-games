/* global __dirname */
// Exercise production worklet initialization; plain TypeScript tests miss closure-order errors.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const babel = require("@babel/core");
const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = (module, file) => {
  const result = babel.transformSync(fs.readFileSync(file, "utf8"), {
    filename: file,
    configFile: false,
    babelrc: false,
    plugins: [
      "react-native-worklets/plugin",
      "@babel/plugin-transform-typescript",
      "@babel/plugin-transform-modules-commonjs",
    ],
  });
  module._compile(result.code, file);
};
// Each order runs in a fresh process; a warm require cache masks circular captures.
if (process.argv[2] !== "model-first") require(path.join(root, "src/home/scene/proposal.ts"));
const { starterHome, validHome } = require(path.join(root, "src/home/model.ts"));
const { buildScene } = require(path.join(root, "src/home/scene/graph.ts"));
const { resolve, apply } = require(path.join(root, "src/home/scene/proposal.ts"));
const { resolveDrop } = require(path.join(root, "src/home/drop.ts"));
const { dropWorld } = require(path.join(root, "src/home/interactions.ts"));
const { roomPoint } = require(path.join(root, "src/home/scene/types.ts"));
const { focusCamera } = require(path.join(root, "src/home/runtime/CameraController.ts"));
const { buildingLayout } = require(path.join(root, "src/home/camera.ts"));
assert.equal(focusCamera(0, { width: 390, height: 720 }, buildingLayout(4)).a, 390 / 800);
const state = starterHome();
const index = buildScene(state).rooms.home;
const proposal = resolve(index, index.entities["character/0"], roomPoint(610, 480), { scale: 1, release: true });
const result = apply(state, proposal);
assert.ok("state" in result && validHome(result.state));
assert.ok(resolveDrop(dropWorld(state.rooms.home), { slot: 0 }, 610, 480));
console.log("Production-transformed scene initialization and resolve/apply passed.");

const audit = require('./audit-home-worklet-closures.cjs').auditHomeWorklets();
assert.ok(audit.worklets >= 295);
// Unlike web execution, native UI cannot call an untagged function captured by a worklet.
const inspected = new WeakSet();
function assertClosure(value, label) {
  if (!value || (typeof value !== 'object' && typeof value !== 'function') || inspected.has(value)) return;
  inspected.add(value);
  if (typeof value === 'function') {
    assert.ok(value.__workletHash, `Non-worklet callable captured at ${label}`);
    assertClosure(value.__closure, `${label}.__closure`);
  } else for (const [key, child] of Object.entries(value)) assertClosure(child, `${label}.${key}`);
}
for (const mod of Object.values(require.cache)) {
  if (!mod.filename.startsWith(path.join(root, 'src/home'))) continue;
  for (const [key, value] of Object.entries(mod.exports)) if (typeof value === 'function' && value.__workletHash) assertClosure(value, `${mod.filename}:${key}`);
}
const { roomHops } = require(path.join(root, 'src/home/roomHops.ts'));
for (const room of ['kitchen', 'tumon-beach', 'cocos-island']) {
  const prepared = buildScene(state);
  const index = { ...prepared.rooms[room], entities: prepared.entities };
  const subjects = [prepared.entities['character/0'], ...Object.values(index.entities).filter(e => e.room === room && e.item && e.body.portable && !e.children.length)];
  const points = [...index.targets.map(t => t.contact), ...roomHops(room).map(h => roomPoint(h.box.left + h.box.width / 2, h.box.top + h.box.height / 2)), roomPoint(650, 290)];
  for (const subject of subjects) for (const point of points) for (const offset of [-24, 0, 24]) {
    const proposal = resolve(index, subject, roomPoint(point.x + offset, point.y), { scale: 1, release: true });
    const result = apply(state, proposal);
    assert.ok('state' in result && validHome(result.state), `${room}: ${subject.id} at ${JSON.stringify(point)} -> ${proposal.target ?? proposal.kind}`);
  }
}
console.log(`Home closure audit: ${audit.worklets} production worklets, ${audit.callableCaptures} callable captures; Kitchen and both lagoons passed.`);
