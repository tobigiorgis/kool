import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    env: {
      // Tests no necesitan secrets reales; saltea validación de lib/env.ts.
      SKIP_ENV_VALIDATION: "1",
    },
  },
})
