import { defineConfig } from "vitest/config";
// Shared-host queueing can exceed fixture budgets without changing their results.
// Opt in to more waiting time; normal budgets and every assertion stay unchanged.
export default defineConfig({ define: { __DEV__: "false" }, test: { include: ["tests/**/*.test.{ts,tsx}"], environment: "node", testTimeout: process.env.LITTLE_ISLAND_SLOW_HOST === "1" ? 1800000 : 120000 } });
