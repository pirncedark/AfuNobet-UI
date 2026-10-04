import { defineConfig } from "vitest/config";

// scripts/*.test.mjs use node:test and are run by Node, not by Vitest.
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });
