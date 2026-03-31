import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    environment: "node",
    include: ["backend/**/*.test.ts", "backend/**/*.spec.ts", "frontend/**/*.test.ts", "frontend/**/*.test.tsx"],
    setupFiles: ["./backend/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["backend/**/*.ts"],
      exclude: ["backend/**/*.test.ts", "backend/__tests__/**"],
    },
  },
});
