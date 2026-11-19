import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/baza/schema.ts",
  out: "./migrari",
  schemaFilter: ["petru"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://petru:petru-local@localhost:5432/petru" },
  migrations: { schema: "petru_migrari", table: "migrari" },
});
