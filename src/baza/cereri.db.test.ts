/**
 * Teste pe baza de date pentru ceasul termenelor și registrele cererilor: drumul unei cereri 544 și al
 * unei petiții, izolarea entităților. Rulează numai cu DATABASE_URL, după `npm run db:refacere`.
 * Fiecare test lucrează într-o tranzacție care se anulează la sfârșit, ca baza de probă să rămână la fel.
 */
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { adresaBazei, bazaDeDate, creeazaPool } from "./conexiune";
import { caSistem, inEntitate, type Tranzactie } from "./entitate";
import { ceasuri, cereri, documente, entitati, utilizatori } from "./schema";
import { ceasurileDocumentului, prelungesteCeasul, propunePrelungirea, respingePropunerea } from "./ceasuri";
import { cerereaDocumentului, inchideCererea, primesteReclamatia, randurileRaportului, registrulCererilor, scrieSolutia, solutiaReclamatiei, stabilesteFelul } from "./cereri";
import { creeazaIesirea } from "./registratura";
import { anul, raportul544 } from "@/domeniu/cereri";

const adresa = adresaBazei();
const pool = adresa ? creeazaPool(adresa) : null;
afterAll(async () => { await pool?.end(); });

class Anulare<T> extends Error {
  constructor(public rezultat: T) { super("anulare"); }
}

/** Rulează în entitate și anulează tot la sfârșit; întoarce ce a găsit. */
async function siAnuleaza<T>(entitateId: string, fn: (tx: Tranzactie) => Promise<T>): Promise<T> {
  try {
    await inEntitate(bazaDeDate(pool!), entitateId, async (tx) => { throw new Anulare(await fn(tx)); });
  } catch (e) {
    if (e instanceof Anulare) return e.rezultat as T;
    throw e;
  }
  throw new Error("nu se ajunge aici");
}

describe.skipIf(!adresa)("ceasul termenelor și cererile în bază", () => {
  const db = () => bazaDeDate(pool!);
  const entitatea = async (cheie: string) => (await db().select().from(entitati).where(eq(entitati.cheie, cheie)))[0]!;
  const unUtilizator = async (entitateId: string) => (await db().select({ id: utilizatori.id }).from(utilizatori).where(eq(utilizatori.entitateId, entitateId)).limit(1))[0]!.id;

  async function documentNou(tx: Tranzactie, entitateId: string, numar: number, data: string, continut: string) {
    const [d] = await tx
      .insert(documente)
      .values({ entitateId, an: 2026, numar, dataInregistrare: new Date(`${data}T12:00:00Z`), tip: "Document intrat", continut, emitentText: "Exemplu Ana (probă)", stare: "repartizat" })
      .returning();
    return d!;
  }

  it("fiecare entitate își vede numai ceasurile și cererile ei", async () => {
    const primaria = await entitatea("primaria");
    const salubrizare = await entitatea("salubrizare");
    const aleP = await inEntitate(db(), primaria.id, async (tx) => ({ c: await tx.select({ e: ceasuri.entitateId }).from(ceasuri), r: await tx.select({ e: cereri.entitateId }).from(cereri) }));
    expect(aleP.c.length).toBeGreaterThan(0);
    expect(aleP.r.length).toBeGreaterThan(0);
    expect([...aleP.c, ...aleP.r].every((x) => x.e === primaria.id)).toBe(true);
    const aleS = await inEntitate(db(), salubrizare.id, (tx) => tx.select({ e: cereri.entitateId }).from(cereri));
    expect(aleS.every((x) => x.e === salubrizare.id)).toBe(true);
  });

  it("un ceas nu se poate lega de documentul altei entități, nici cu identificatorul lui", async () => {
    const primaria = await entitatea("primaria");
    const salubrizare = await entitatea("salubrizare");
    const [docS] = await caSistem(db(), (tx) => tx.select({ id: documente.id }).from(documente).where(eq(documente.entitateId, salubrizare.id)).limit(1));
    await expect(
      siAnuleaza(primaria.id, (tx) => tx.insert(ceasuri).values({ entitateId: primaria.id, documentId: docS!.id, regula: "petitie", pornitLa: "2026-11-02", termenInitial: "2026-12-02", termen: "2026-12-02" })),
    ).rejects.toThrow();
  });

  it("cererea 544: felul, prelungirea, refuzul, reclamația și raportul", async () => {
    const primaria = await entitatea("primaria");
    const u = await unUtilizator(primaria.id);
    const r = await siAnuleaza(primaria.id, async (tx) => {
      const d = await documentNou(tx, primaria.id, 990_001, "2026-11-02", "Solicitare de copii după contracte (probă)");
      await stabilesteFelul(tx, { entitateId: primaria.id, utilizatorId: u, documentId: d.id, fel: "informatii_publice", solicitant: "juridica" });
      const [ceas] = await ceasurileDocumentului(tx, d.id);
      const termenInitial = (await tx.select({ t: documente.termen }).from(documente).where(eq(documente.id, d.id)))[0]!.t;
      await expect(prelungesteCeasul(tx, { ceasId: ceas!.id, la: "2026-11-13", motiv: "x", instiintare: null, utilizatorId: u })).rejects.toThrow(/primele 10 zile/);
      await prelungesteCeasul(tx, { ceasId: ceas!.id, la: "2026-11-06", motiv: "informația e în mai multe compartimente (probă)", instiintare: "e-mail (probă)", utilizatorId: u });
      const termenPrelungit = (await tx.select({ t: documente.termen }).from(documente).where(eq(documente.id, d.id)))[0]!.t;
      await creeazaIesirea(tx, { entitateId: primaria.id, utilizatorId: u, intrare: d, numar: 990_002, data: "2026-11-20", mod: "email", destinatar: null, motivOprire: "răspuns" });
      await scrieSolutia(tx, { documentId: d.id, solutie: "respinsa_exceptata", la: "2026-11-20" });
      await primesteReclamatia(tx, { entitateId: primaria.id, utilizatorId: u, documentId: d.id, la: "2026-11-20", numar: "990003" });
      await expect(primesteReclamatia(tx, { entitateId: primaria.id, utilizatorId: u, documentId: d.id, la: "2026-11-20", numar: null })).rejects.toThrow(/deja/);
      const ceasuriDupa = await ceasurileDocumentului(tx, d.id);
      await solutiaReclamatiei(tx, { utilizatorId: u, documentId: d.id, solutie: "respinsa", la: "2026-11-20", plangere: true });
      const cerere = await cerereaDocumentului(tx, d.id);
      const raport = raportul544(await randurileRaportului(tx, { fel: "tot" }, "informatii_publice", anul(2026)), anul(2026), "2026-11-20");
      const finale = await ceasurileDocumentului(tx, d.id);
      return { termenInitial, termenPrelungit, ceasuriDupa, cerere, raport, finale };
    });
    expect(r.termenInitial).toBe("2026-11-12");
    expect(r.termenPrelungit).toBe("2026-12-02");
    expect(r.ceasuriDupa.map((c) => [c.regula, c.opritLa, c.termen])).toEqual([["544", "2026-11-20", "2026-12-02"], ["544-reclamatie", null, "2026-12-05"]]);
    expect(r.cerere).toMatchObject({ fel: "informatii_publice", solicitant: "juridica", solutie: "respinsa_exceptata", reclamatieSolutie: "respinsa", plangereInstanta: true });
    expect(r.finale.every((c) => c.opritLa)).toBe(true);
    expect(r.raport.reclamatii.respinse).toBeGreaterThanOrEqual(1);
    expect(r.raport.termene.refuzuriDupa5Zile).toBeGreaterThanOrEqual(1);
  });

  it("petiția: conexarea la cererea de bază și redirecționarea cu adresa de ieșire", async () => {
    const primaria = await entitatea("primaria");
    const u = await unUtilizator(primaria.id);
    const r = await siAnuleaza(primaria.id, async (tx) => {
      const a = await documentNou(tx, primaria.id, 990_011, "2026-11-02", "Sesizare despre un drum (probă)");
      const b = await documentNou(tx, primaria.id, 990_012, "2026-11-04", "Aceeași sesizare, din nou (probă)");
      const c = await documentNou(tx, primaria.id, 990_013, "2026-11-05", "Sesizare despre o rețea a altei instituții (probă)");
      for (const d of [a, b, c]) await stabilesteFelul(tx, { entitateId: primaria.id, utilizatorId: u, documentId: d.id, fel: "petitie", solicitant: "fizica" });
      await expect(inchideCererea(tx, { entitateId: primaria.id, utilizatorId: u, documentId: b.id, inchidere: "conexata", la: "2026-11-05", motiv: "", conexatLa: { numar: 990_012, an: 2026 } })).rejects.toThrow(/ea însăși/);
      await inchideCererea(tx, { entitateId: primaria.id, utilizatorId: u, documentId: b.id, inchidere: "conexata", la: "2026-11-05", motiv: "", conexatLa: { numar: 990_011, an: 2026 } });
      await inchideCererea(tx, { entitateId: primaria.id, utilizatorId: u, documentId: c.id, inchidere: "redirectionata", la: "2026-11-07", motiv: "înștiințat (probă)", catre: "Instituția competentă (probă)", iesire: { numar: 990_014, mod: "email" } });
      await expect(stabilesteFelul(tx, { entitateId: primaria.id, utilizatorId: u, documentId: c.id, fel: "informatii_publice", solicitant: "fizica" })).rejects.toThrow(/soluție/);
      const stari = await tx.select({ numar: documente.numar, stare: documente.stare, raspunsLa: documente.raspunsLaId }).from(documente).where(sql`${documente.numar} between 990011 and 990014`);
      const cb = await cerereaDocumentului(tx, b.id);
      const ca = await cerereaDocumentului(tx, a.id);
      const deschise = await registrulCererilor(tx, { fel: "tot" }, "petitie", { filtru: "deschise" }, "2026-11-20");
      const ceasC = (await tx.select().from(ceasuri).where(and(eq(ceasuri.documentId, c.id), eq(ceasuri.regula, "petitie"))))[0]!;
      return { stari, cb, ca, deschise: deschise.map((x) => x.numar), ceasC };
    });
    const stare = (n: number) => r.stari.find((x) => x.numar === n);
    expect(stare(990_012)!.stare).toBe("arhivat");
    expect(stare(990_013)!.stare).toBe("arhivat");
    expect(stare(990_014)!.raspunsLa).not.toBeNull();
    expect(r.cb!.conexatLaId).toBe(r.ca!.id);
    expect(r.deschise).toContain(990_011);
    expect(r.deschise).not.toContain(990_012);
    expect(r.ceasC.opritLa).toBe("2026-11-07");
  });

  it("prelungirea: compartimentul o propune, conducătorul o respinge sau o hotărăște", async () => {
    const primaria = await entitatea("primaria");
    const u = await unUtilizator(primaria.id);
    const r = await siAnuleaza(primaria.id, async (tx) => {
      const d = await documentNou(tx, primaria.id, 990_021, "2026-11-02", "Sesizare care cere cercetare (probă)");
      await stabilesteFelul(tx, { entitateId: primaria.id, utilizatorId: u, documentId: d.id, fel: "petitie", solicitant: "fizica" });
      const [c] = await ceasurileDocumentului(tx, d.id);
      await propunePrelungirea(tx, { ceasId: c!.id, azi: "2026-11-20", motiv: "cercetare la fața locului (probă)", utilizatorId: u });
      await expect(propunePrelungirea(tx, { ceasId: c!.id, azi: "2026-11-20", motiv: "x", utilizatorId: u })).rejects.toThrow(/deja propusă/);
      const propusa = (await ceasurileDocumentului(tx, d.id))[0]!;
      await respingePropunerea(tx, { ceasId: c!.id, utilizatorId: u });
      const respinsa = (await ceasurileDocumentului(tx, d.id))[0]!;
      await propunePrelungirea(tx, { ceasId: c!.id, azi: "2026-11-20", motiv: "cercetare la fața locului (probă)", utilizatorId: u });
      await prelungesteCeasul(tx, { ceasId: c!.id, la: "2026-11-21", motiv: null, instiintare: "adresă (probă)", utilizatorId: u });
      return { propusa, respinsa, final: (await ceasurileDocumentului(tx, d.id))[0]! };
    });
    expect(r.propusa.termen).toBe("2026-12-02");
    expect(r.propusa.prelungirePropusaLa).toBe("2026-11-20");
    expect(r.respinsa.prelungirePropusaLa).toBeNull();
    expect(r.final.termen).toBe("2026-12-17");
    expect(r.final.prelungireMotiv).toBe("cercetare la fața locului (probă)");
    expect(r.final.prelungitDe).not.toBeNull();
  });
});
