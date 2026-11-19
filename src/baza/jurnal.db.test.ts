/**
 * Test pe baza de date: rulează numai dacă există DATABASE_URL (în CI, cu PostgreSQL de probă,
 * după `npm run db:refacere`). Local: `DATABASE_URL=... npm test`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { adresaBazei, bazaDeDate, creeazaPool } from "./conexiune";
import { jurnal, persoane } from "./schema";
import { esteCnpDeProba } from "./cnp-proba";

const adresa = adresaBazei();
const pool = adresa ? creeazaPool(adresa) : null;
afterAll(async () => { await pool?.end(); });

describe.skipIf(!adresa)("baza de date", () => {
  const db = () => bazaDeDate(pool!);

  it("jurnalul primește rânduri noi", async () => {
    const [r] = await db().insert(jurnal).values({ actiune: "test", entitate: "test" }).returning({ id: jurnal.id });
    expect(r?.id).toBeGreaterThan(0);
  });

  it("jurnalul nu se poate modifica sau șterge", async () => {
    await expect(db().execute(sql`UPDATE petru.jurnal SET actiune = 'altceva'`)).rejects.toThrow();
    await expect(db().execute(sql`DELETE FROM petru.jurnal`)).rejects.toThrow();
    await expect(db().execute(sql`TRUNCATE petru.jurnal`)).rejects.toThrow();
  });

  it("toate persoanele din datele de probă sunt marcate și au CNP de probă", async () => {
    const toate = await db().select().from(persoane);
    expect(toate.length).toBeGreaterThan(0);
    expect(toate.every((p) => p.esteProba)).toBe(true);
    expect(toate.filter((p) => p.cnp).every((p) => esteCnpDeProba(p.cnp!))).toBe(true);
  });
});
