import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { dirtyGeneratedFiles, generatedFiles, prep, previewProblem, restore } from "../scripts/ios-preview-bundle.mjs";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const defaultCatalog = { preview: false, items: [], index: Array.from({ length: 50 }, (_, i) => ({ id: `t${i}` })) };
/** A throwaway repo holding the four committed default-mode generated files. */
function fixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), "li-preview-"));
  dirs.push(dir);
  mkdirSync(join(dir, "src/library"), { recursive: true });
  for (const file of generatedFiles)
    writeFileSync(join(dir, file), file.endsWith(".json") ? JSON.stringify(defaultCatalog) : `// default ${file}\n`);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  git("-c", "user.email=t@t", "-c", "user.name=t", "add", ".");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "default");
  return dir;
}

describe("L5 native family-preview bundle path", () => {
  it("accepts only a preview catalog with more than 100 items", () => {
    expect(previewProblem(defaultCatalog)).toMatch(/preview is not true/);
    expect(previewProblem({ preview: true, items: new Array(100).fill({}) })).toMatch(/100 items/);
    expect(previewProblem({ preview: true, items: new Array(101).fill({}) })).toBeUndefined();
    expect(previewProblem({ preview: true, items: new Array(146).fill({}) })).toBeUndefined();
    expect(previewProblem({ preview: true })).toMatch(/0 items/);
    expect(previewProblem(undefined)).toBeTruthy();
  });
  it("covers every generated file build-index writes", () => {
    const script = readFileSync("scripts/library/build-index.mjs", "utf8");
    for (const file of generatedFiles) expect(script).toContain(file.replace("src/library/", ""));
    const written = [...script.matchAll(/\$\{output\}\/([\w.-]+)/g)].map((m) => `src/library/${m[1]}`);
    expect([...new Set(written)].sort()).toEqual([...generatedFiles].sort());
  });
  it("restores the committed default files exactly and reports the default catalog", () => {
    const dir = fixtureRepo();
    writeFileSync(join(dir, generatedFiles[0]), JSON.stringify({ preview: true, items: new Array(146).fill({}), index: [] }));
    writeFileSync(join(dir, generatedFiles[1]), "// preview assets\n");
    expect(dirtyGeneratedFiles(dir)).toHaveLength(2);
    const catalog = restore(dir);
    expect(catalog.preview).toBe(false);
    expect(dirtyGeneratedFiles(dir)).toEqual([]);
    expect(readFileSync(join(dir, generatedFiles[1]), "utf8")).toBe(`// default ${generatedFiles[1]}\n`);
  });
  it("refuses to regenerate over uncommitted edits instead of discarding them later", () => {
    const dir = fixtureRepo();
    writeFileSync(join(dir, generatedFiles[2]), "// hand edit\n");
    expect(() => prep(dir)).toThrow(/uncommitted changes/);
    expect(readFileSync(join(dir, generatedFiles[2]), "utf8")).toBe("// hand edit\n");
  });
  it("is wired to npm scripts and documented", () => {
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
    expect(scripts["ios:preview-bundle-prep"]).toContain("ios-preview-bundle.mjs prep");
    expect(scripts["ios:restore-generated"]).toContain("ios-preview-bundle.mjs restore");
    expect(scripts["ios:preview-build"]).toContain("ios-preview-bundle.mjs build");
    const qa = readFileSync("docs/QA.md", "utf8");
    for (const needle of ["ios:preview-bundle-prep", "ios:restore-generated", "pod", "json', '< 3'"]) expect(qa).toContain(needle);
  });
});
