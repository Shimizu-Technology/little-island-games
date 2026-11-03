import { execFileSync } from "node:child_process";
import { it, expect } from "vitest";

it.each(["proposal-first", "model-first"])(
  "initializes production worklets %s before resolving a real edit",
  (order) => {
    const output = execFileSync(process.execPath, ["scripts/check-home-worklets.cjs", order], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
      timeout: 180000,
    });
    expect(output).toContain("Production-transformed scene initialization and resolve/apply passed.");
  },
  190000
);
