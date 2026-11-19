import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function adresaBazei(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

export function creeazaPool(adresa: string): Pool {
  return new Pool({ connectionString: adresa, max: 5 });
}

export function bazaDeDate(pool: Pool) {
  return drizzle(pool, { schema });
}
