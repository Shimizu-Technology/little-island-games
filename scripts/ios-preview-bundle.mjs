// Native family-preview bundle path.
//
// The Library catalog, asset, speech and vector maps are generated files committed in DEFAULT mode.
// Xcode/EAS bundle whatever is on disk, so a native build made without this script silently ships the
// legacy 50 topics. This regenerates them for the family preview, checks the result, runs the build
// you give it, and always puts the committed default files back.
//
//   node scripts/ios-preview-bundle.mjs prep            regenerate + assert (leaves preview files on disk)
//   node scripts/ios-preview-bundle.mjs restore         git checkout the committed default files
//   node scripts/ios-preview-bundle.mjs build -- <cmd>  prep, run <cmd>, restore (also on failure or Ctrl-C)
import { spawnSync } from "node:child_process";
import { gateDelivery } from "./words/delivery.mjs";
import { requireCleanSource } from "./words/check.mjs";
import { checkShippingTree } from "./words/shipping.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const generatedFiles = [
  "src/library/catalog.generated.json",
  "src/library/assets.generated.ts",
  "src/library/speech.generated.ts",
  "src/library/vectors.generated.ts",
];
export const minimumPreviewItems = 100;

/** A reason the catalog is not a family-preview catalog, or undefined when it is. */
export function previewProblem(catalog) {
  if (!catalog || catalog.preview !== true) return "catalog.preview is not true (default-mode catalog)";
  const items = Array.isArray(catalog.items) ? catalog.items.length : 0;
  if (items <= minimumPreviewItems) return `catalog has ${items} items; the preview needs more than ${minimumPreviewItems}`;
  return undefined;
}

const git = (cwd, args) => spawnSync("git", args, { cwd, encoding: "utf8" });
/** Refuse to overwrite hand edits: restore would throw them away. */
export function dirtyGeneratedFiles(cwd = process.cwd()) {
  const result = git(cwd, ["status", "--porcelain", "--", ...generatedFiles]);
  if (result.status !== 0) throw new Error(`git status failed: ${result.stderr}`);
  return result.stdout.split("\n").filter(Boolean);
}
export function readCatalog(cwd = process.cwd()) {
  return JSON.parse(readFileSync(resolve(cwd, generatedFiles[0]), "utf8"));
}
export function restore(cwd = process.cwd()) {
  const result = git(cwd, ["checkout", "--", ...generatedFiles]);
  if (result.status !== 0) throw new Error(`git checkout failed: ${result.stderr}`);
  const dirty = dirtyGeneratedFiles(cwd);
  if (dirty.length) throw new Error(`generated files still differ from the commit:\n${dirty.join("\n")}`);
  const catalog = readCatalog(cwd);
  if (catalog.preview === true) throw new Error("restored catalog is still in preview mode");
  return catalog;
}
export function prep(cwd = process.cwd(), env = process.env) {
  const dirty = dirtyGeneratedFiles(cwd);
  if (dirty.length)
    throw new Error(`Refusing to regenerate over uncommitted changes (restore would discard them):\n${dirty.join("\n")}`);
  checkShippingTree(cwd,env.LITTLE_ISLAND_WORD_RECEIPTS,{full:true});
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/library/build-index.mjs"], {
    cwd,
    stdio: "inherit",
    env: { ...env, EXPO_PUBLIC_LIBRARY_PREVIEW: "1" },
  });
  if (result.status !== 0) throw new Error("library index generation failed");
  const catalog = readCatalog(cwd);
  const problem = previewProblem(catalog);
  if (problem) throw new Error(`preview catalog rejected: ${problem}`);
  return catalog;
}
export function build(command, cwd = process.cwd(), env = process.env) {
  requireCleanSource(cwd);
  checkShippingTree(cwd,env.LITTLE_ISLAND_WORD_RECEIPTS,{full:true});
  let restored = false;
  const putBack = () => {
    if (restored) return;
    restored = true;
    restore(cwd);
    console.log("restored committed default Library files");
  };
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      try {
        putBack();
      } finally {
        process.exit(130);
      }
    });
  try {
    const catalog = prep(cwd, env);
    console.log(`preview catalog: ${catalog.items.length} items, ${catalog.index.length} index entries`);
    const result = spawnSync(command[0], command.slice(1), {
      cwd,
      stdio: "inherit",
      env: { ...env, EXPO_PUBLIC_LIBRARY_PREVIEW: "1" },
    });
    if(result.status!==0) return result.status ?? 1;
    gateDelivery(cwd,{...env,EXPO_PUBLIC_LIBRARY_PREVIEW:"1"});
    putBack();
    return 0;
  } finally {
    putBack();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, ...rest] = process.argv.slice(2);
  try {
    if (mode === "prep") {
      const catalog = prep();
      console.log(`preview catalog ready: ${catalog.items.length} items, ${catalog.index.length} index entries`);
      console.log("Build now, then run: npm run ios:restore-generated");
    } else if (mode === "restore") {
      const catalog = restore();
      console.log(`restored committed default catalog: ${catalog.items.length} items, ${catalog.index.length} index entries`);
    } else if (mode === "build") {
      const command = rest[0] === "--" ? rest.slice(1) : rest;
      if (!command.length) throw new Error("usage: build -- <build command...>");
      process.exitCode = build(command);
    } else throw new Error("usage: ios-preview-bundle.mjs prep | restore | build -- <command...>");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
