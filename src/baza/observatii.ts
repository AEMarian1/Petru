import { sql } from "drizzle-orm";
import { pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Schema „observatii”: observațiile din „Ce lipsește?”. NU se reface la publicare.
 * Se creează idempotent din scripts/baza.ts, în afara migrărilor schemei „petru”.
 */
export const observatiiSchema = pgSchema("observatii");
export const observatii = observatiiSchema.table("observatii", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cand: timestamp("cand", { withTimezone: true }).notNull().defaultNow(),
  mediu: text("mediu").notNull(),
  pagina: text("pagina"),
  rol: text("rol"),
  mesaj: text("mesaj").notNull(),
});
