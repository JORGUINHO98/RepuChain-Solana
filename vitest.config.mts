import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: [{ find: /^@repuchain\/validation$/, replacement: fileURLToPath(new URL("./packages/validation/src/index.ts", import.meta.url)) }],
  },
  test: { include: ["tests/integration/**/*.test.ts"], environment: "node" },
});
