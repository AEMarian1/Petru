import type { Pool } from "pg";
import { adresaBazei, bazaDeDate, creeazaPool } from "./conexiune";

const g = globalThis as unknown as { __petruPool?: Pool };

/** Conexiunea la bază pentru aplicație (una pe proces). `null` dacă DATABASE_URL lipsește. */
export function db() {
  const adresa = adresaBazei();
  if (!adresa) return null;
  g.__petruPool ??= creeazaPool(adresa);
  return bazaDeDate(g.__petruPool);
}

export type Db = NonNullable<ReturnType<typeof db>>;
