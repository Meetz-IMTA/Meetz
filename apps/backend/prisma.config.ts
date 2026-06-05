import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: "../../.env" }); // chemin relatif vers la racine

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
