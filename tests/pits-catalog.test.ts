import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Runs against the manifest in `cwd`, so a scratch copy never touches the real one.
const generator = (args: string[], cwd = process.cwd()) =>
  execFileSync("node", ["--import", resolve("scripts/puzzles/register.mjs"), resolve("scripts/boards/pits-catalog.ts"), ...args], { cwd, encoding: "utf8", stdio: "pipe" });
const file = "src/state/save-catalog.json";

describe("Shell Pits save-catalog generator", () => {
  it("the committed manifest matches the registration: bank 460, dares 3200–3263, pits-1 to pits-4", () => {
    expect(generator(["--check"])).toContain("Shell Pits catalog checked: 1 bank, 45 dares, 4 contexts.");
    const catalog = JSON.parse(readFileSync(file, "utf8"));
    expect(catalog.banks.filter((b: { engine: string }) => b.engine === "shell-pits").map((b: { slot: number }) => b.slot)).toEqual([460]);
    const dares = catalog.dares.filter(([slot]: [number]) => slot >= 3200 && slot <= 3263);
    expect(dares).toHaveLength(45);
    expect(dares.every(([, d]: [number, { bank: number }]) => d.bank === 460)).toBe(true);
    for (const c of ["pits-1", "pits-2", "pits-3", "pits-4"]) expect(catalog.contexts).toContain(c);
  });
  it("restores missing Pits entries without touching other slices, and refuses a changed Pits slot", () => {
    const catalog = JSON.parse(readFileSync(file, "utf8"));
    const dir = mkdtempSync(`${tmpdir()}/pits-catalog-`),
      scratch = `${dir}/${file}`;
    mkdirSync(`${dir}/src/state`, { recursive: true });
    try {
      // A merge that took the other side: no Pits entries at all.
      const without = {
        ...catalog,
        banks: catalog.banks.filter((b: { slot: number }) => b.slot !== 460),
        dares: catalog.dares.filter(([slot]: [number]) => slot < 3200 || slot > 3263),
        contexts: catalog.contexts.filter((c: string) => !c.startsWith("pits-")),
      };
      writeFileSync(scratch, JSON.stringify(without, null, 2) + "\n");
      expect(() => generator(["--check"], dir)).toThrow(/missing or stale/);
      generator([], dir);
      const rebuilt = JSON.parse(readFileSync(scratch, "utf8"));
      expect(rebuilt.banks).toEqual(catalog.banks);
      expect(rebuilt.dares).toEqual(catalog.dares);
      expect([...rebuilt.contexts].sort()).toEqual([...catalog.contexts].sort());
      // Rerunning is a no-op.
      generator([], dir);
      expect(readFileSync(scratch, "utf8")).toBe(JSON.stringify(rebuilt, null, 2) + "\n");
      // A frozen Pits dare that means something else stops the run.
      const changed = { ...catalog, dares: catalog.dares.map(([slot, d]: [number, object]) => (slot === 3200 ? [slot, { ...d, help: "independent", kind: "par" }] : [slot, d])) };
      writeFileSync(scratch, JSON.stringify(changed, null, 2) + "\n");
      expect(() => generator([], dir)).toThrow(/Immutable dare 3200 changed/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
