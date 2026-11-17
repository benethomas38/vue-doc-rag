import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests du serveur et de l'interface ; on ignore la doc clonée dans data/
    include: ["src/**/*.test.ts", "web/src/**/*.test.ts"],
  },
});
