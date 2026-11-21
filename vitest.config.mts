import { defineConfig } from "vitest/config";
// Shared-host queueing can exceed fixture budgets without changing their results.
// Opt in to more waiting time; normal budgets and every assertion stay unchanged.
export default defineConfig({ test: {
  include: ["tests/**/*.test.{ts,tsx}"],
  environment: "node",
  // Private Linux runners may expose only two cores: Vitest's cores-minus-one
  // default then serializes the suite. Keep isolation and use both cores.
  maxWorkers: process.env.GITHUB_ACTIONS === "true" ? 2 : undefined,
  testTimeout: process.env.LITTLE_ISLAND_SLOW_HOST === "1" ? 1800000 : 120000,
} });
