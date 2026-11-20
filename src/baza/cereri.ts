/**
 * Registrele petițiilor și ale cererilor 544 în bază: felul cererii, închiderile (redirecționare,
 * clasare, conexare), soluția la răspuns, reclamația administrativă, listele și rândurile rapoartelor.
 * Toate funcțiile primesc o tranzacție deschisă cu `inEntitate`.
 */
import { and, asc, desc, eq, gte, isNull, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ceasuri, cereri, compartimente, documente, jurnal, proiecteHotarare } from "./schema";
import type { Tranzactie } from "./entitate";
import { conditiaVederii, creeazaIesirea } from "./registratura";
import { opresteCeasurile, pornesteCeasulDocumentului, schimbaRegulaRaspunsului } from "./ceasuri";
import { poateTrece } from "@/domeniu/drumul-actului";
import { ZILE_AVERTIZARE } from "@/domeniu/ceas";
import { adaugaZile } from "@/domeniu/termene";
import {
  ETICHETE_SOLUTIE, FELURI, poateAveaReclamatie, type FelCerere, type Inchidere, type Perioada, type RandRaport,
  type Solutie, type SolutieReclamatie, type TipSolicitant,
} from "@/domeniu/cereri";
import type { Vedere } from "@/domeniu/registratura";
import type { ModExpediere } from "@/domeniu/registratura";

const ziua = (d: Date) => d.toISOString().slice(0, 10);

async function documentul(tx: Tranzactie, id: string) {
  const [d] = await tx.select().from(documente).where(eq(documente.id, id)).for("update");
  if (!d) throw new Error("Documentul nu există.");
  if (d.directie === "iesire") throw new Error("O ieșire nu e o cerere.");
  const [p] = await tx.select({ id: proiecteHotarare.id }).from(proiecteHotarare).where(eq(proiecteHotarare.documentId, id));
  if (p) throw new Error("Un proiect de hotărâre nu e o cerere.");
  return d;
}

export async function cerereaDocumentului(tx: Tranzactie, documentId: string) {
  const [c] = await tx.select().from(cereri).where(eq(cereri.documentId, documentId));
  return c ?? null;
}

/**
 * Stabilește felul documentului: petiție, cerere 544 sau niciuna. Felul pornește ceasul legii lui;
 * se poate schimba numai până la prima soluție și până la o prelungire.
 */
export async function stabilesteFelul(tx: Tranzactie, a: { entitateId: string; utilizatorId: string; documentId: string; fel: FelCerere | null; solicitant: TipSolicitant }) {
  const d = await documentul(tx, a.documentId);
  const existenta = await cerereaDocumentului(tx, d.id);
  if (existenta?.solutie) throw new Error("Cererea are deja o soluție; felul ei nu se mai schimbă.");
  const pornitLa = ziua(d.dataInregistrare);
  if (a.fel === null) {
    if (existenta) await tx.delete(cereri).where(eq(cereri.id, existenta.id));
    await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a scos documentul din registrele cererilor", entitate: "document", entitateId: d.id });
    return;
  }
  await schimbaRegulaRaspunsului(tx, { entitateId: a.entitateId, documentId: d.id, regulaNoua: FELURI[a.fel].regula, pornitLa });
  if (existenta) {
    await tx.update(cereri).set({ fel: a.fel, solicitant: a.solicitant, actualizatLa: new Date() }).where(eq(cereri.id, existenta.id));
  } else {
    await tx.insert(cereri).values({ entitateId: a.entitateId, documentId: d.id, fel: a.fel, solicitant: a.solicitant });
  }
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: `a stabilit felul: ${FELURI[a.fel].nume.toLowerCase()}`, entitate: "document", entitateId: d.id, detalii: { fel: a.fel, solicitant: a.solicitant } });
}

/**
 * Închide cererea fără răspuns în fond: redirecționată la instituția competentă (cu adresa de ieșire,
 * dacă are deja număr), clasată sau conexată la cererea de bază. Documentul trece în arhivă.
 */
export async function inchideCererea(
  tx: Tranzactie,
  a: {
    entitateId: string; utilizatorId: string; documentId: string; inchidere: Inchidere; la: string; motiv: string;
    catre?: string; iesire?: { numar: number; mod: ModExpediere } | null; conexatLa?: { numar: number; an: number };
  },
) {
  const d = await documentul(tx, a.documentId);
  const c = await cerereaDocumentului(tx, d.id);
  if (!c) throw new Error("Documentul nu e în registrele cererilor. Stabiliți întâi felul.");
  if (c.solutie) throw new Error("Cererea are deja o soluție.");
  if (!poateTrece(d.stare, "arhivat")) throw new Error("Din starea de acum, cererea nu se poate închide așa. Dacă răspunsul e la semnat, înregistrați ieșirea.");
  if (a.la < ziua(d.dataInregistrare)) throw new Error("Data e înainte de înregistrare.");
  const schimbari: Partial<typeof cereri.$inferInsert> = { solutie: a.inchidere, solutieLa: a.la, solutieMotiv: a.motiv || null, actualizatLa: new Date() };
  const detalii: Record<string, unknown> = { motiv: a.motiv, la: a.la };

  if (a.inchidere === "redirectionata") {
    if (!a.catre) throw new Error("Scrieți instituția competentă.");
    schimbari.redirectionatCatre = a.catre;
    detalii.catre = a.catre;
    if (a.iesire) {
      const ies = await creeazaIesirea(tx, {
        entitateId: a.entitateId, utilizatorId: a.utilizatorId, intrare: d, numar: a.iesire.numar, data: a.la, mod: a.iesire.mod,
        destinatar: a.catre, tip: `Redirecționare: nr. ${d.numar}/${d.an}`, motivOprire: `redirecționată la ${a.catre}`,
      });
      detalii.iesire = `${a.iesire.numar}/${ies.an}`;
    }
  }
  if (a.inchidere === "conexata") {
    if (!a.conexatLa) throw new Error("Scrieți numărul cererii de bază.");
    const [baza] = await tx
      .select({ id: cereri.id, fel: cereri.fel, docId: documente.id })
      .from(cereri)
      .innerJoin(documente, eq(documente.id, cereri.documentId))
      .where(and(eq(documente.numar, a.conexatLa.numar), eq(documente.an, a.conexatLa.an)));
    if (!baza) throw new Error(`Cererea nr. ${a.conexatLa.numar}/${a.conexatLa.an} nu e în registrele cererilor.`);
    if (baza.docId === d.id) throw new Error("O cerere nu se conexează la ea însăși.");
    if (baza.fel !== c.fel) throw new Error("Se conexează numai cereri de același fel.");
    schimbari.conexatLaId = baza.id;
    detalii.conexataLa = `${a.conexatLa.numar}/${a.conexatLa.an}`;
  }

  await tx.update(cereri).set(schimbari).where(eq(cereri.id, c.id));
  await opresteCeasurile(tx, { documentId: d.id, la: a.la, motiv: ETICHETE_SOLUTIE[a.inchidere].toLowerCase() });
  await tx.update(documente).set({ stare: "arhivat", actualizatLa: new Date() }).where(eq(documente.id, d.id));
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: ETICHETE_SOLUTIE[a.inchidere].toLowerCase(), entitate: "document", entitateId: d.id, detalii });
}

/** Soluția scrisă la ieșirea răspunsului. */
export async function scrieSolutia(tx: Tranzactie, a: { documentId: string; solutie: Solutie; la: string }) {
  await tx.update(cereri).set({ solutie: a.solutie, solutieLa: a.la, actualizatLa: new Date() }).where(and(eq(cereri.documentId, a.documentId), isNull(cereri.solutie)));
}

/** Reclamația administrativă (Legea 544/2001, art. 21): pornește ceasul de 15 zile al răspunsului la ea. */
export async function primesteReclamatia(tx: Tranzactie, a: { entitateId: string; utilizatorId: string; documentId: string; la: string; numar: string | null }) {
  const d = await documentul(tx, a.documentId);
  const c = await cerereaDocumentului(tx, d.id);
  if (!c || !poateAveaReclamatie(c.fel, c.solutie)) throw new Error("Reclamația administrativă se face la o cerere 544 refuzată, comunicată parțial sau fără răspuns.");
  if (c.reclamatieLa) throw new Error("Reclamația e deja scrisă.");
  if (a.la < ziua(d.dataInregistrare)) throw new Error("Data reclamației e înainte de cerere.");
  await tx.update(cereri).set({ reclamatieLa: a.la, reclamatieNumar: a.numar, actualizatLa: new Date() }).where(eq(cereri.id, c.id));
  await pornesteCeasulDocumentului(tx, { entitateId: a.entitateId, documentId: d.id, regula: "544-reclamatie", pornitLa: a.la, principal: false });
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a primit reclamația administrativă", entitate: "document", entitateId: d.id, detalii: { la: a.la, numar: a.numar } });
}

export async function solutiaReclamatiei(tx: Tranzactie, a: { utilizatorId: string; documentId: string; solutie: SolutieReclamatie; la: string; plangere: boolean }) {
  const c = await cerereaDocumentului(tx, a.documentId);
  if (!c?.reclamatieLa) throw new Error("Nu există o reclamație administrativă.");
  if (a.la < c.reclamatieLa) throw new Error("Data soluției e înainte de reclamație.");
  await tx.update(cereri).set({ reclamatieSolutie: a.solutie, reclamatieSolutieLa: a.la, plangereInstanta: a.plangere, actualizatLa: new Date() }).where(eq(cereri.id, c.id));
  await opresteCeasurile(tx, { documentId: a.documentId, la: a.la, motiv: `reclamația ${a.solutie}`, regula: "544-reclamatie" });
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: `a scris soluția reclamației: ${a.solutie}`, entitate: "document", entitateId: a.documentId, detalii: { la: a.la, plangere: a.plangere } });
}

export async function marcheazaPlangerea(tx: Tranzactie, a: { utilizatorId: string; documentId: string }) {
  await tx.update(cereri).set({ plangereInstanta: true, actualizatLa: new Date() }).where(eq(cereri.documentId, a.documentId));
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a notat plângerea în instanță", entitate: "document", entitateId: a.documentId });
}

/** Fișa cererii: cererea, ceasurile, cererea de bază (la conexare) și cererile conexate la ea. */
export async function fisaCererii(tx: Tranzactie, documentId: string) {
  const c = await cerereaDocumentului(tx, documentId);
  if (!c) return null;
  const [baza] = c.conexatLaId
    ? await tx.select({ docId: documente.id, numar: documente.numar, an: documente.an }).from(cereri).innerJoin(documente, eq(documente.id, cereri.documentId)).where(eq(cereri.id, c.conexatLaId))
    : [];
  const conexate = await tx
    .select({ docId: documente.id, numar: documente.numar, an: documente.an })
    .from(cereri)
    .innerJoin(documente, eq(documente.id, cereri.documentId))
    .where(eq(cereri.conexatLaId, c.id))
    .orderBy(asc(documente.numar));
  return { cerere: c, baza: baza ?? null, conexate };
}

export type FiltruCereri = "deschise" | "depasite" | "aproape" | "rezolvate" | "toate";

const ceasRaspuns = alias(ceasuri, "ceas_raspuns");
const ceasReclamatie = alias(ceasuri, "ceas_reclamatie");

/** Registrul unui fel de cereri, pe vederea utilizatorului. */
export async function registrulCererilor(tx: Tranzactie, v: Vedere, fel: FelCerere, a: { filtru: FiltruCereri; an?: number }, azi: string, limita = 300) {
  const conditii: (SQL | undefined)[] = [eq(cereri.fel, fel), conditiaVederii(v)];
  if (a.an) conditii.push(eq(documente.an, a.an));
  const limitaAproape = adaugaZile(azi, ZILE_AVERTIZARE, "calendaristice");
  if (a.filtru === "deschise") conditii.push(isNull(cereri.solutie), isNull(ceasRaspuns.opritLa));
  if (a.filtru === "depasite") conditii.push(isNull(ceasRaspuns.opritLa), sql`${ceasRaspuns.termen} < ${azi}`);
  if (a.filtru === "aproape") conditii.push(isNull(ceasRaspuns.opritLa), gte(ceasRaspuns.termen, azi), lte(ceasRaspuns.termen, limitaAproape));
  if (a.filtru === "rezolvate") conditii.push(sql`(${cereri.solutie} is not null or ${ceasRaspuns.opritLa} is not null)`);
  return tx
    .select({
      docId: documente.id, numar: documente.numar, an: documente.an, data: documente.dataInregistrare, continut: documente.continut,
      emitent: documente.emitentText, stare: documente.stare, compartiment: sql<string | null>`coalesce(${compartimente.nume}, ${documente.compartimentText})`,
      solicitant: cereri.solicitant, solutie: cereri.solutie, solutieLa: cereri.solutieLa, redirectionatCatre: cereri.redirectionatCatre,
      reclamatieLa: cereri.reclamatieLa, reclamatieSolutie: cereri.reclamatieSolutie, plangereInstanta: cereri.plangereInstanta,
      ceas: { regula: ceasRaspuns.regula, pornitLa: ceasRaspuns.pornitLa, termenInitial: ceasRaspuns.termenInitial, termen: ceasRaspuns.termen, prelungitLa: ceasRaspuns.prelungitLa, opritLa: ceasRaspuns.opritLa },
      reclamatieTermen: ceasReclamatie.termen, reclamatieOprita: ceasReclamatie.opritLa,
    })
    .from(cereri)
    .innerJoin(documente, eq(documente.id, cereri.documentId))
    .leftJoin(compartimente, eq(compartimente.id, documente.compartimentId))
    .leftJoin(ceasRaspuns, and(eq(ceasRaspuns.documentId, documente.id), eq(ceasRaspuns.regula, FELURI[fel].regula)))
    .leftJoin(ceasReclamatie, and(eq(ceasReclamatie.documentId, documente.id), eq(ceasReclamatie.regula, "544-reclamatie")))
    .where(and(...conditii))
    .orderBy(desc(documente.an), desc(documente.numar))
    .limit(limita);
}

/** Cifrele registrelor, pentru panou. */
export async function cifreleCererilor(tx: Tranzactie, v: Vedere, azi: string) {
  const limitaAproape = adaugaZile(azi, ZILE_AVERTIZARE, "calendaristice");
  const deschis = sql`${ceasuri.opritLa} is null`;
  const r = await tx
    .select({
      fel: cereri.fel,
      deschise: sql<number>`count(*) filter (where ${deschis})::int`,
      depasite: sql<number>`count(*) filter (where ${deschis} and ${ceasuri.termen} < ${azi})::int`,
      aproape: sql<number>`count(*) filter (where ${deschis} and ${ceasuri.termen} between ${azi} and ${limitaAproape})::int`,
    })
    .from(cereri)
    .innerJoin(documente, eq(documente.id, cereri.documentId))
    .innerJoin(ceasuri, eq(ceasuri.documentId, documente.id))
    .where(and(conditiaVederii(v), sql`${ceasuri.regula} = case ${cereri.fel} when 'petitie' then 'petitie' else '544' end`))
    .groupBy(cereri.fel);
  const gol = { deschise: 0, depasite: 0, aproape: 0 };
  return { petitie: r.find((x) => x.fel === "petitie") ?? gol, informatii_publice: r.find((x) => x.fel === "informatii_publice") ?? gol };
}

/** Rândurile unui raport: cererile înregistrate în perioadă, cu ceasul răspunsului. */
export async function randurileRaportului(tx: Tranzactie, v: Vedere, fel: FelCerere, p: Perioada): Promise<RandRaport[]> {
  const rows = await tx
    .select({
      data: documente.dataInregistrare, canal: documente.canal, compartiment: compartimente.nume, solicitant: cereri.solicitant,
      termenInitial: ceasRaspuns.termenInitial, termen: ceasRaspuns.termen, prelungitLa: ceasRaspuns.prelungitLa, opritLa: ceasRaspuns.opritLa,
      solutie: cereri.solutie, reclamatieLa: cereri.reclamatieLa, reclamatieSolutie: cereri.reclamatieSolutie, plangereInstanta: cereri.plangereInstanta,
    })
    .from(cereri)
    .innerJoin(documente, eq(documente.id, cereri.documentId))
    .leftJoin(compartimente, eq(compartimente.id, documente.compartimentId))
    .innerJoin(ceasRaspuns, and(eq(ceasRaspuns.documentId, documente.id), eq(ceasRaspuns.regula, FELURI[fel].regula)))
    .where(and(eq(cereri.fel, fel), conditiaVederii(v), gte(ceasRaspuns.pornitLa, p.de), lte(ceasRaspuns.pornitLa, p.pana)));
  return rows.map((r) => ({
    fel, data: ziua(r.data), canal: r.canal, solicitant: r.solicitant, compartiment: r.compartiment,
    termenInitial: r.termenInitial, termen: r.termen, prelungitLa: r.prelungitLa, opritLa: r.opritLa,
    solutie: r.solutie, reclamatieLa: r.reclamatieLa, reclamatieSolutie: r.reclamatieSolutie, plangereInstanta: r.plangereInstanta,
  }));
}

/** Ce așteaptă conducerea: răspunsuri de semnat sau de contrasemnat, prelungiri propuse. */
export async function deLaConducere(tx: Tranzactie, v: Vedere) {
  const [r] = await tx
    .select({
      deSemnat: sql<number>`count(*) filter (where ${documente.stare} = 'la_semnat' and ${documente.semnatLa} is null)::int`,
      deContrasemnat: sql<number>`count(*) filter (where ${documente.stare} = 'la_semnat' and ${documente.contrasemnatLa} is null)::int`,
    })
    .from(documente)
    .where(and(eq(documente.directie, "intrare"), conditiaVederii(v)));
  const prelungiri = await tx
    .select({ docId: documente.id, numar: documente.numar, an: documente.an, continut: documente.continut, motiv: ceasuri.prelungireMotiv, termen: ceasuri.termen })
    .from(ceasuri)
    .innerJoin(documente, eq(documente.id, ceasuri.documentId))
    .where(and(sql`${ceasuri.prelungirePropusaLa} is not null`, isNull(ceasuri.prelungitLa), isNull(ceasuri.opritLa), conditiaVederii(v)))
    .orderBy(asc(ceasuri.termen));
  return { deSemnat: r?.deSemnat ?? 0, deContrasemnat: r?.deContrasemnat ?? 0, prelungiri };
}
