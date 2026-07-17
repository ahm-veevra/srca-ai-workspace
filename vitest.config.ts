import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit/component test harness (vitest + React Testing Library).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    // Globals let React Testing Library register its afterEach auto-cleanup.
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["{app,components,lib}/**/*.test.{ts,tsx}"],
  },
});
