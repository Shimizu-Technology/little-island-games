/* global __dirname */
/* Run with node scripts/bench-home-scene.cjs. No server or native runtime needed. */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { performance } = require("node:perf_hooks");
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, file) =>
    module._compile(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        fileName: file,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText,
      file
    );
}
const root = path.resolve(__dirname, "..");
const { instance, starterHome } = require(path.join(root, "src/home/model.ts"));
const { buildScene } = require(path.join(root, "src/home/scene/graph.ts"));
const { resolve } = require(path.join(root, "src/home/scene/proposal.ts"));
const { roomPoint } = require(path.join(root, "src/home/scene/types.ts"));
const state = starterHome();
const room = state.rooms.home;
room.instances = [];
room.characters = [{ slot: 0, anchor: "floor", pose: "stand", x: 18, y: 8 }];
for (let y = 0; y <= 10; y += 2)
  for (let x = 1; x <= 13; x += 2) room.instances.push(instance(`book-${x}-${y}`, "book", x, y));
for (let x = 1; x <= 11; x += 2) room.instances.push(instance(`wall-${x}`, "sea-picture", x, 0));
const start = performance.now();
const index = buildScene(state).rooms.home;
const preparationMs = performance.now() - start;
const subjects = [index.entities["character/0"], index.entities["home/item/book-1-0"]];
const context = { scale: 0.58, release: true };
const query = (n) => resolve(index, subjects[n % 2], roomPoint((n * 17) % 801, 80 + ((n * 23) % 481)), context);
for (let n = 0; n < 3000; n++) query(n);
const timings = [];
const outcomes = {};
for (let n = 0; n < 20000; n++) {
  const before = performance.now();
  const proposal = query(n);
  timings.push(performance.now() - before);
  outcomes[proposal.kind] = (outcomes[proposal.kind] ?? 0) + 1;
}
timings.sort((a, b) => a - b);
const quantile = (fraction) => timings[Math.floor((timings.length - 1) * fraction)];
const result = {
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  loadAverage: os.loadavg(),
  instances: room.instances.length,
  warmupCalls: 3000,
  measuredCalls: timings.length,
  preparationMs,
  medianMs: quantile(0.5),
  p95Ms: quantile(0.95),
  p99Ms: quantile(0.99),
  maxMs: timings.at(-1),
  meanMs: timings.reduce((a, b) => a + b, 0) / timings.length,
  outcomes,
  scope: "Prepared pure resolver, alternating character and prop, no rendering or native timing",
};
console.log(JSON.stringify(result, null, 2));
if (result.p95Ms >= 1) process.exitCode = 1;
