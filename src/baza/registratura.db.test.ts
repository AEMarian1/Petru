/**
 * Teste pe baza de date pentru registratură: izolarea entităților (securitate la nivel de rând) și
 * importul exportului din registrul oficial. Rulează numai cu DATABASE_URL, după `npm run db:refacere`.
 */
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { adresaBazei, bazaDeDate, creeazaPool } from "./conexiune";
import { inEntitate } from "./entitate";
import { documente, entitati, importuri, utilizatori } from "./schema";
import { aplicaImportul, listaRegistrului } from "./registratura";
import { citesteExportul } from "@/domeniu/import-registru";

const adresa = adresaBazei();
const pool = adresa ? creeazaPool(adresa) : null;
afterAll(async () => { await pool?.end(); });

describe.skipIf(!adresa)("registratura în bază", () => {
  const db = () => bazaDeDate(pool!);
  const entitatea = async (cheie: string) => (await db().select().from(entitati).where(eq(entitati.cheie, cheie)))[0]!;

  it("fiecare entitate își vede numai documentele ei", async () => {
    const primaria = await entitatea("primaria");
    const salubrizare = await entitatea("salubrizare");
    const aleP = await inEntitate(db(), primaria.id, (tx) => tx.select({ e: documente.entitateId }).from(documente));
    const aleS = await inEntitate(db(), salubrizare.id, (tx) => tx.select({ e: documente.entitateId }).from(documente));
    expect(aleP.length).toBeGreaterThan(0);
    expect(aleS.length).toBeGreaterThan(0);
    expect(aleP.every((d) => d.e === primaria.id)).toBe(true);
    expect(aleS.every((d) => d.e === salubrizare.id)).toBe(true);
  });

  it("fără entitate, rolul aplicației nu vede nimic", async () => {
    const n = await db().transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL ROLE petru_aplicatie`);
      return tx.select({ id: documente.id }).from(documente);
    });
    expect(n).toEqual([]);
  });

  it("rolul aplicației nu poate scrie în altă entitate și nu poate ocoli regula", async () => {
    const primaria = await entitatea("primaria");
    const salubrizare = await entitatea("salubrizare");
    await expect(
      inEntitate(db(), primaria.id, (tx) => tx.insert(documente).values({ entitateId: salubrizare.id, an: 2026, numar: 999_001, tip: "x", continut: "x (probă)" })),
    ).rejects.toThrow();
    const vazute = await inEntitate(db(), primaria.id, async (tx) => {
      await tx.execute(sql`SELECT set_config('petru.sistem', 'da', true)`);
      return tx.select({ e: documente.entitateId }).from(documente).where(eq(documente.entitateId, salubrizare.id));
    });
    expect(vazute).toEqual([]);
  });

  it("importul adaugă, actualizează și leagă ieșirea de intrare", async () => {
    const primaria = await entitatea("primaria");
    const [u] = await db().select({ id: utilizatori.id }).from(utilizatori).where(eq(utilizatori.entitateId, primaria.id)).limit(1);
    const csv = [
      "Nr;Data;Emitent;Continut;Compartiment;Sens;La nr",
      "880001;02.11.2026;Exemplu Ana (probă);Cerere de certificat de urbanism (probă);urbanism;intrare;",
      "880002;03.11.2026;Probescu Ion (probă);Petiție (probă);;intrare;",
      "880003;05.11.2026;;Răspuns (probă);urbanism;iesire;880001",
    ].join("\n");
    const r = citesteExportul(csv);
    expect(r.erori).toEqual([]);
    const rezultat = await inEntitate(db(), primaria.id, async (tx) => {
      const [i] = await tx.insert(importuri).values({ entitateId: primaria.id, utilizatorId: u!.id, numeFisier: "test.csv", amprenta: "x", potrivire: r.potrivire, randuri: r.randuri, erori: r.erori }).returning({ id: importuri.id });
      const rez = await aplicaImportul(tx, i!.id, primaria.id, u!.id);
      await expect(aplicaImportul(tx, i!.id, primaria.id, u!.id)).rejects.toThrow(/deja aplicat/);
      const intrare = (await tx.select().from(documente).where(and(eq(documente.an, 2026), eq(documente.numar, 880001))))[0]!;
      const petitie = (await tx.select().from(documente).where(and(eq(documente.an, 2026), eq(documente.numar, 880002))))[0]!;
      const iesire = (await tx.select().from(documente).where(and(eq(documente.an, 2026), eq(documente.numar, 880003))))[0]!;
      return { rez, intrare, petitie, iesire };
    });
    expect(rezultat.rez).toEqual({ noi: 3, actualizate: 0, legate: 1 });
    expect(rezultat.intrare.stare).toBe("emis");
    expect(rezultat.intrare.termenCheie).toBe("certificat-urbanism");
    expect(rezultat.petitie.stare).toBe("inregistrat");
    expect(rezultat.petitie.termen).toBe("2026-12-03");
    expect(rezultat.iesire.raspunsLaId).toBe(rezultat.intrare.id);
  });

  it("biroul vede numai compartimentul lui în listă", async () => {
    const primaria = await entitatea("primaria");
    const lista = await inEntitate(db(), primaria.id, (tx) => listaRegistrului(tx, { fel: "compartimente", ids: [] }, {}, "2026-11-20"));
    expect(lista).toEqual([]);
  });
});
