/**
 * Comenzile bazei de date:
 *   npm run db:migreaza   — aplică migrările (orice mediu, inclusiv producția)
 *   npm run db:refacere   — șterge schema „petru”, aplică migrările și încarcă datele de probă
 *                           (NUMAI în mediile de probă; refuză în producție)
 * Fără DATABASE_URL, comenzile nu fac nimic (de pildă, la previzualizări înainte de pasul S4).
 * Observațiile din „Ce lipsește?” stau în schema „observatii” și nu se șterg niciodată aici.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { adresaBazei, bazaDeDate, creeazaPool } from "../src/baza/conexiune";
import * as s from "../src/baza/schema";
import { persoaneDeProba, TIPURI_DOCUMENTE, aleator } from "../src/baza/date-proba";
import { COMPARTIMENTE } from "../src/date-proba/compartimente";

const LACAT_REFACERE = 7_202_611;
const MIGRARI = { migrationsFolder: "migrari", migrationsSchema: "petru_migrari", migrationsTable: "migrari" };

type Db = ReturnType<typeof bazaDeDate>;

async function main() {
  const comanda = process.argv[2];
  // Refacerea folosește conexiunea directă, dacă există: lacătul de sesiune nu e sigur printr-un pooler.
  const adresa = process.env.DATABASE_URL_DIRECTA?.trim() || adresaBazei();
  if (!adresa) {
    console.log("DATABASE_URL lipsește: nu fac nimic.");
    return;
  }
  const mediu = process.env.PETRU_MEDIU ?? "local";
  const pool = creeazaPool(adresa);
  const db = bazaDeDate(pool);
  try {
    await pregatesteObservatiile(db);
    if (comanda === "migreaza") {
      await migrate(db, MIGRARI);
      console.log("Migrările sunt aplicate.");
    } else if (comanda === "refacere") {
      if (mediu === "productie") throw new Error("Refacerea bazei e interzisă în producție.");
      // Un singur client pentru lacăt: lacătul de sesiune ține cât ține conexiunea.
      const client = await pool.connect();
      try {
        const prinPooler = /-pooler\./.test(adresa);
        if (prinPooler) console.warn("Conexiune prin pooler: refac fără lacăt (adăugați DATABASE_URL_DIRECTA).");
        else await client.query("SELECT pg_advisory_lock($1)", [LACAT_REFACERE]);
        await client.query("DROP SCHEMA IF EXISTS petru CASCADE");
        await client.query("DROP SCHEMA IF EXISTS petru_migrari CASCADE");
        await migrate(db, MIGRARI);
        await incarcaDateDeProba(db);
      } finally {
        if (!/-pooler\./.test(adresa)) await client.query("SELECT pg_advisory_unlock($1)", [LACAT_REFACERE]);
        client.release();
      }
      console.log(`Baza e refăcută cu date de probă (mediul: ${mediu}).`);
    } else {
      throw new Error("Comanda e „migreaza” sau „refacere”.");
    }
  } finally {
    await pool.end();
  }
}

async function pregatesteObservatiile(db: Db) {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS observatii`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS observatii.observatii (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cand timestamptz NOT NULL DEFAULT now(),
    mediu text NOT NULL,
    pagina text,
    rol text,
    mesaj text NOT NULL
  )`);
}

async function incarcaDateDeProba(db: Db) {
  await db.insert(s.institutie).values({
    nume: process.env.PETRU_INSTITUTIE?.trim() || "Primăria Comunei Exemplu",
    localitate: "Exemplu",
    judet: "Județul Exemplu",
  });

  const comp = await db
    .insert(s.compartimente)
    .values(COMPARTIMENTE.map((c) => ({ cheie: c.cheie, nume: c.nume, atributii: c.ce, program: c.program, interior: c.interior })))
    .returning({ id: s.compartimente.id, cheie: s.compartimente.cheie });
  const compId = new Map(comp.map((c) => [c.cheie, c.id]));

  const pers = await db
    .insert(s.persoane)
    .values(persoaneDeProba(40).map((p) => ({ ...p, esteProba: true })))
    .returning({ id: s.persoane.id });

  const [registratura] = await db
    .insert(s.utilizatori)
    .values({ numeAfisat: "Registratura (probă)", rol: "registratura", contLocal: true, compartimentId: compId.get("registratura") })
    .returning({ id: s.utilizatori.id });

  const r = aleator(11);
  const stari = s.stareDocument.enumValues;
  const an = 2026;
  for (let i = 0; i < 60; i++) {
    const t = TIPURI_DOCUMENTE[i % TIPURI_DOCUMENTE.length]!;
    const zi = new Date(Date.UTC(an, 8, 1) + Math.floor(r() * 80) * 86_400_000);
    const termen = new Date(zi.getTime() + t.zile * 86_400_000);
    const [doc] = await db
      .insert(s.documente)
      .values({
        an,
        numar: 1001 + i,
        dataInregistrare: zi,
        tip: t.tip,
        continut: `${t.tip} (probă)`,
        emitentId: pers[i % pers.length]!.id,
        compartimentId: compId.get(t.compartiment),
        stare: stari[Math.floor(r() * 5)]!,
        termen: termen.toISOString().slice(0, 10),
      })
      .returning({ id: s.documente.id });
    await db.insert(s.jurnal).values({
      utilizatorId: registratura!.id,
      actiune: "a înregistrat",
      entitate: "document",
      entitateId: doc!.id,
      detalii: { numar: 1001 + i, proba: true },
    });
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
