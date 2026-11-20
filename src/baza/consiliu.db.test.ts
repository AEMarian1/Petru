/**
 * Teste pe baza de date pentru consiliul local: drumul unui proiect normativ de la inițiere la publicare,
 * procesul-verbal cu ceasul lui, numerotarea pe an și izolarea entităților. Rulează numai cu DATABASE_URL,
 * după `npm run db:refacere`. Fiecare test lucrează într-o tranzacție care se anulează la sfârșit.
 * Datele sunt în 2030, ca să nu se amestece cu registrul de probă.
 */
import { afterAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { adresaBazei, bazaDeDate, creeazaPool } from "./conexiune";
import { caSistem, inEntitate, type Tranzactie } from "./entitate";
import { ceasuri, comisii, compartimente, documente, entitati, proiecteHotarare, sedinte, utilizatori } from "./schema";
import {
  anuntaProiectul, aprobaPublicarea, comunicaPrefectului, creeazaSedinta, initiazaProiectul, marcheazaCopiaAnonimizata, marcheazaPublicarea,
  puneOrdineaDeZi, registrulHotararilor, scrieAvizul, scrieMaterialul, scriePrezenta, scriePv, semneazaHotararea, sesizeazaComisiile, voteaza,
} from "./consiliu";
import { avizeComisii } from "./schema";

const adresa = adresaBazei();
const pool = adresa ? creeazaPool(adresa) : null;
afterAll(async () => { await pool?.end(); });

class Anulare<T> extends Error {
  constructor(public rezultat: T) { super("anulare"); }
}

async function siAnuleaza<T>(entitateId: string, fn: (tx: Tranzactie) => Promise<T>): Promise<T> {
  try {
    await inEntitate(bazaDeDate(pool!), entitateId, async (tx) => { throw new Anulare(await fn(tx)); });
  } catch (e) {
    if (e instanceof Anulare) return e.rezultat as T;
    throw e;
  }
  throw new Error("nu se ajunge aici");
}

describe.skipIf(!adresa)("consiliul local în bază", () => {
  const db = () => bazaDeDate(pool!);
  const entitatea = async (cheie: string) => (await db().select().from(entitati).where(eq(entitati.cheie, cheie)))[0]!;
  const contul = async (nume: string) => (await db().select({ id: utilizatori.id }).from(utilizatori).where(eq(utilizatori.numeAfisat, nume)))[0]!.id;

  it("fiecare entitate își vede numai ședințele, proiectele și comisiile ei", async () => {
    const primaria = await entitatea("primaria");
    const salubrizare = await entitatea("salubrizare");
    const aleP = await inEntitate(db(), primaria.id, async (tx) => ({
      s: await tx.select({ e: sedinte.entitateId }).from(sedinte), p: await tx.select({ e: proiecteHotarare.entitateId }).from(proiecteHotarare),
      c: await tx.select({ e: comisii.entitateId }).from(comisii),
    }));
    expect(aleP.s.length).toBeGreaterThan(0);
    expect(aleP.p.length).toBeGreaterThan(0);
    expect(aleP.c.length).toBe(5);
    expect([...aleP.s, ...aleP.p, ...aleP.c].every((x) => x.e === primaria.id)).toBe(true);
    const aleS = await inEntitate(db(), salubrizare.id, async (tx) => [
      ...(await tx.select({ id: sedinte.id }).from(sedinte)), ...(await tx.select({ id: proiecteHotarare.id }).from(proiecteHotarare)), ...(await tx.select({ id: ceasuri.id }).from(ceasuri).where(isNull(ceasuri.documentId))),
    ]);
    expect(aleS).toHaveLength(0);
  });

  it("nu se poate scrie o ședință pentru altă entitate și nici lega un proiect de documentul altei entități", async () => {
    const primaria = await entitatea("primaria");
    const salubrizare = await entitatea("salubrizare");
    await expect(siAnuleaza(primaria.id, (tx) => tx.insert(sedinte).values({ entitateId: salubrizare.id, data: "2030-01-10", tip: "ordinara", consilieriInFunctie: 15 }))).rejects.toThrow();
    const [docS] = await caSistem(db(), (tx) => tx.select({ id: documente.id }).from(documente).where(eq(documente.entitateId, salubrizare.id)).limit(1));
    const [comp] = await db().select({ id: compartimente.id }).from(compartimente).where(eq(compartimente.cheie, "taxe"));
    await expect(
      siAnuleaza(primaria.id, (tx) => tx.insert(proiecteHotarare).values({ entitateId: primaria.id, documentId: docS!.id, an: 2030, numar: 999, titlu: "Proiect (probă)", initiator: "primar", compartimentId: comp!.id, normativ: false })),
    ).rejects.toThrow();
  });

  it("baza refuză o dată de ședință imposibilă și un număr de hotărâre la un proiect respins", async () => {
    const primaria = await entitatea("primaria");
    await expect(siAnuleaza(primaria.id, (tx) => tx.insert(sedinte).values({ entitateId: primaria.id, data: "9999-12-31", tip: "ordinara", consilieriInFunctie: 15 }))).rejects.toThrow();
    await expect(
      siAnuleaza(primaria.id, async (tx) => {
        const [p] = await tx.select({ id: proiecteHotarare.id }).from(proiecteHotarare).where(eq(proiecteHotarare.rezultat, "respins")).limit(1);
        await tx.update(proiecteHotarare).set({ anHcl: 2030, numarHcl: 1 }).where(eq(proiecteHotarare.id, p!.id));
      }),
    ).rejects.toThrow();
  });

  it("proiectul normativ: Legea 52, avizele, cvorumul, pragul, hotărârea, prefectul, poarta de publicare", async () => {
    const primaria = await entitatea("primaria");
    const secretar = await contul("Secretarul general (probă)");
    const secretariat = await contul("Inspector administrație publică (probă)");
    const primar = await contul("Primarul în funcție (probă)");
    const [comp] = await db().select({ id: compartimente.id }).from(compartimente).where(eq(compartimente.cheie, "taxe"));
    const r = await siAnuleaza(primaria.id, async (tx) => {
      const e = primaria.id;
      const com = await tx.select({ id: comisii.id }).from(comisii).orderBy(comisii.numar);
      const p = await initiazaProiectul(tx, { entitateId: e, utilizatorId: secretariat, numarInregistrare: 9001, data: "2030-02-01", titlu: "Proiect de hotărâre privind taxele locale (probă)", initiator: "primar", compartimentId: comp!.id, normativ: true, majoritate: "simpla", referatLa: "2030-02-01" });
      const al2lea = await initiazaProiectul(tx, { entitateId: e, utilizatorId: secretariat, numarInregistrare: 9002, data: "2030-02-02", titlu: "Proiect de hotărâre privind un inventar (probă)", initiator: "primar", compartimentId: comp!.id, normativ: false, majoritate: "simpla", referatLa: null });
      const devreme = await creeazaSedinta(tx, { entitateId: e, data: "2030-02-20", tip: "ordinara", consilieriInFunctie: 15, utilizatorId: secretar });
      const tarziu = await creeazaSedinta(tx, { entitateId: e, data: "2030-04-25", tip: "ordinara", consilieriInFunctie: 15, utilizatorId: secretar });
      const urmatoarea = await creeazaSedinta(tx, { entitateId: e, data: "2030-05-30", tip: "ordinara", consilieriInFunctie: 15, utilizatorId: secretar });
      const erori: string[] = [];
      const incearca = async (f: () => Promise<unknown>) => {
        try { await f(); erori.push("—"); } catch (x) { erori.push((x as Error).message); }
      };
      await scrieMaterialul(tx, { proiectId: p.id, fel: "raport", la: "2030-02-05", utilizatorId: secretariat });
      await incearca(() => puneOrdineaDeZi(tx, { proiectId: p.id, sedintaId: tarziu, utilizatorId: secretar }));
      await anuntaProiectul(tx, { entitateId: e, proiectId: p.id, la: "2030-02-06", unde: "pagina de internet (probă)", utilizatorId: secretariat });
      await incearca(() => puneOrdineaDeZi(tx, { proiectId: p.id, sedintaId: devreme, utilizatorId: secretar }));
      await puneOrdineaDeZi(tx, { proiectId: p.id, sedintaId: tarziu, utilizatorId: secretar });
      await incearca(() => voteaza(tx, { entitateId: e, proiectId: p.id, rezultat: "aprobat", vot: { pentru: 9, contra: 0, abtineri: 0 }, majoritate: "simpla", utilizatorId: secretariat }));
      await sesizeazaComisiile(tx, { entitateId: e, proiectId: p.id, comisieIds: [com[0]!.id, com[4]!.id], la: "2030-02-07", utilizatorId: secretariat });
      const avize = await tx.select({ id: avizeComisii.id }).from(avizeComisii).where(eq(avizeComisii.proiectId, p.id));
      for (const a of avize) await scrieAvizul(tx, { avizId: a.id, sens: "favorabil", data: "2030-04-20", amendamente: null, utilizatorId: secretariat });
      await incearca(() => voteaza(tx, { entitateId: e, proiectId: p.id, rezultat: "aprobat", vot: { pentru: 9, contra: 0, abtineri: 0 }, majoritate: "simpla", utilizatorId: secretariat }));
      await scriePrezenta(tx, { sedintaId: tarziu, prezenti: 12, presedinte: "consilierul local ales președinte de ședință (probă)", utilizatorId: secretariat });
      await incearca(() => voteaza(tx, { entitateId: e, proiectId: p.id, rezultat: "aprobat", vot: { pentru: 6, contra: 4, abtineri: 2 }, majoritate: "simpla", utilizatorId: secretariat }));
      const hcl = await voteaza(tx, { entitateId: e, proiectId: p.id, rezultat: "aprobat", vot: { pentru: 9, contra: 2, abtineri: 1 }, majoritate: "simpla", utilizatorId: secretariat });
      const [doc] = await tx.select().from(documente).innerJoin(proiecteHotarare, eq(proiecteHotarare.documentId, documente.id)).where(eq(proiecteHotarare.id, p.id));
      const ceasurile = await tx.select().from(ceasuri).where(eq(ceasuri.documentId, doc!.documente.id));
      await incearca(() => comunicaPrefectului(tx, { entitateId: e, proiectId: p.id, numar: 9101, data: "2030-04-26", mod: "curier", utilizatorId: secretar }));
      await semneazaHotararea(tx, { proiectId: p.id, fel: "presedinte", la: "2030-04-26", utilizatorId: secretariat });
      const [inca] = await tx.select({ stare: documente.stare }).from(documente).where(eq(documente.id, doc!.documente.id));
      await semneazaHotararea(tx, { proiectId: p.id, fel: "secretar", la: "2030-04-26", utilizatorId: secretar });
      await comunicaPrefectului(tx, { entitateId: e, proiectId: p.id, numar: 9101, data: "2030-04-29", mod: "curier", utilizatorId: secretar });
      const [prefect] = await tx.select().from(ceasuri).where(and(eq(ceasuri.documentId, doc!.documente.id), eq(ceasuri.regula, "hcl-prefect")));
      await incearca(() => marcheazaPublicarea(tx, { proiectId: p.id, la: "2030-04-30", unde: "MOL (probă)", utilizatorId: secretar }));
      await aprobaPublicarea(tx, { proiectId: p.id, azi: "2030-04-30", utilizatorId: primar });
      await incearca(() => marcheazaPublicarea(tx, { proiectId: p.id, la: "2030-04-30", unde: "MOL (probă)", utilizatorId: secretar }));
      await marcheazaCopiaAnonimizata(tx, { proiectId: p.id, azi: "2030-04-30", utilizatorId: secretar });
      await marcheazaPublicarea(tx, { proiectId: p.id, la: "2030-04-30", unde: "MOL (probă)", utilizatorId: secretar });
      const [final] = await tx.select({ stare: documente.stare }).from(documente).where(eq(documente.id, doc!.documente.id));
      // Procesul-verbal: în ordine, aprobat în ședința următoare, cu ceasul publicării.
      await incearca(() => scriePv(tx, { entitateId: e, sedintaId: tarziu, pas: "aprobat", la: "2030-05-30", aprobatInSedintaId: urmatoarea, utilizatorId: secretariat }));
      await scriePv(tx, { entitateId: e, sedintaId: tarziu, pas: "redactat", la: "2030-04-27", utilizatorId: secretariat });
      await scriePv(tx, { entitateId: e, sedintaId: tarziu, pas: "semnat", la: "2030-04-28", utilizatorId: secretar });
      await scriePv(tx, { entitateId: e, sedintaId: tarziu, pas: "aprobat", la: "2030-05-30", aprobatInSedintaId: urmatoarea, utilizatorId: secretariat });
      const [ceasPv] = await tx.select().from(ceasuri).where(eq(ceasuri.sedintaId, tarziu));
      await scriePv(tx, { entitateId: e, sedintaId: tarziu, pas: "publicat", la: "2030-06-03", utilizatorId: secretar });
      const [ceasPvOprit] = await tx.select().from(ceasuri).where(eq(ceasuri.sedintaId, tarziu));
      const registrul = await registrulHotararilor(tx, 2030);
      return { p, al2lea, hcl, erori, doc: doc!.documente, ceasurile, inca, prefect, final, ceasPv, ceasPvOprit, registrul };
    });
    expect(r.p.numar).toBe(1);
    expect(r.al2lea.numar).toBe(2);
    expect(r.erori[0]).toMatch(/nu a fost anunțat/);
    expect(r.erori[1]).toMatch(/numai după/);
    expect(r.erori[2]).toMatch(/nu a fost trimis la nicio comisie/);
    expect(r.erori[3]).toMatch(/prezența/);
    expect(r.erori[4]).toMatch(/cel puțin 7 voturi/);
    expect(r.hcl).toEqual({ numarHcl: 1, anHcl: 2030 });
    expect(r.doc.stare).toBe("la_semnat");
    // Joi 25.04.2030 + 10 zile lucrătoare, peste Vinerea Mare (26.04), a doua zi de Paște (29.04) și 1 Mai.
    expect(r.ceasurile.find((c) => c.regula === "hcl-prefect")?.termen).toBe("2030-05-14");
    expect(r.ceasurile.filter((c) => c.regula !== "hcl-prefect").every((c) => c.opritLa === "2030-04-25")).toBe(true);
    expect(r.erori[5]).toMatch(/după semnătură/);
    expect(r.inca?.stare).toBe("la_semnat");
    expect(r.prefect?.opritLa).toBe("2030-04-29");
    expect(r.erori[6]).toMatch(/aprobarea de publicare/);
    expect(r.erori[7]).toMatch(/copia anonimizată/);
    expect(r.final?.stare).toBe("publicat");
    expect(r.erori[8]).toMatch(/întâi semnat/);
    expect(r.ceasPv?.termen).toBe("2030-06-04");
    expect(r.ceasPvOprit?.opritLa).toBe("2030-06-03");
    expect(r.registrul.map((x) => x.numarHcl)).toEqual([1]);
    expect(r.registrul[0]?.prefectNumar).toBe(9101);
  });

  it("datele de probă au termene la prefect în curs și depășite", async () => {
    const primaria = await entitatea("primaria");
    const r = await inEntitate(db(), primaria.id, (tx) => tx.select({ termen: ceasuri.termen, oprit: ceasuri.opritLa }).from(ceasuri).where(eq(ceasuri.regula, "hcl-prefect")));
    expect(r.length).toBeGreaterThanOrEqual(4);
    expect(r.some((c) => c.oprit === null)).toBe(true);
    expect(r.some((c) => c.oprit !== null)).toBe(true);
  });
});
