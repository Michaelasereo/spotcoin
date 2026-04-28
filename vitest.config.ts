import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
    mockReset: true,
    include: ["lib/**/*.test.ts", "tests/netlify/**/*.test.ts", "app/api/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
