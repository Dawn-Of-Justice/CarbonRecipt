import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    // Mirror the "@/*" path alias from tsconfig so imports resolve under Vitest.
    alias: { "@": resolve(__dirname, "src") },
  },
});
