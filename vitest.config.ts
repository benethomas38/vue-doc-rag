import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests du serveur, de l'interface, du code partagé et des widgets ; on ignore la doc clonée dans data/
    include: ["src/**/*.test.ts", "web/src/**/*.test.ts", "shared/**/*.test.ts", "widgets/*/src/**/*.test.ts"],
  },
});
