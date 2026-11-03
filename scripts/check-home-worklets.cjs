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
