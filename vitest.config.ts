import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: { label: "logic", color: "green" },
          environment: "node",
          include: ["__tests__/**/*.test.ts"],
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: { label: "ui", color: "cyan" },
          environment: "jsdom",
          include: ["src/components/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
