/**
 * Consiliul local în bază (0.2): proiectele de hotărâre, comisiile, Legea 52, ședințele, votul,
 * hotărârile, comunicarea la prefect, procesele-verbale, poarta de publicare și registrele.
 * Toate funcțiile primesc o tranzacție deschisă cu `inEntitate`, deci văd numai entitatea utilizatorului.
 *
 * Proiectul e un document din registrul de intrare-ieșire (`directie = intern`), cu numărul dat de
 * registrul oficial: merge pe drumul actului (repartizat → în lucru → la semnat → emis → publicat;
 * respins sau retras → arhivat). Ceasurile lui (Legea 52, prefectul) sunt ceasurile documentului.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, max, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { avizeComisii, ceasuri, comisii, compartimente, documente, jurnal, propuneriL52, proiecteHotarare, sedinte, utilizatori } from "./schema";
import type { Tranzactie } from "./entitate";
import { creeazaIesirea } from "./registratura";
import { opresteCeasurile, pornesteCeasulDocumentului } from "./ceasuri";
import { opreste, pornesteCeasul, ZILE_AVERTIZARE } from "@/domeniu/ceas";
import { poatePublica, poateTrece, type Stare } from "@/domeniu/drumul-actului";
import { adaugaZile } from "@/domeniu/termene";
import type { ModExpediere } from "@/domeniu/registratura";
import {
  avertizareConvocare, dataSedinteiValida, ETICHETE_REZULTAT, poateFiVotat, poatePeOrdineaDeZi, semnaturiHotarareLipsa, verificaVotul,
  type Initiator, type Majoritate, type Rezultat, type SensAviz, type StareProiect, type TipSedinta, type VedereConsiliu, type Vot,
} from "@/domeniu/consiliu";

const ziua = (d: Date) => d.toISOString().slice(0, 10);
const REGULI_L52 = ["l52-anunt", "transparenta-52"];

type Proiect = typeof proiecteHotarare.$inferSelect;

function conditiaVederii(v: VedereConsiliu): SQL | undefined {
  if (v.fel === "nimic") return sql`false`;
  if (v.fel === "compartimente") return v.ids.length ? inArray(proiecteHotarare.compartimentId, v.ids) : sql`false`;
  return undefined;
}

async function proiectul(tx: Tranzactie, id: string): Promise<Proiect> {
  const [p] = await tx.select().from(proiecteHotarare).where(eq(proiecteHotarare.id, id)).for("update");
  if (!p) throw new Error("Proiectul nu există.");
  return p;
}

async function documentulProiectului(tx: Tranzactie, p: Proiect) {
  const [d] = await tx.select().from(documente).where(eq(documente.id, p.documentId)).for("update");
  if (!d) throw new Error("Documentul proiectului nu există.");
  return d;
}

async function sedinta(tx: Tranzactie, id: string) {
  const [s] = await tx.select().from(sedinte).where(eq(sedinte.id, id)).for("update");
  if (!s) throw new Error("Ședința nu există.");
  return s;
}

async function scrieInJurnal(tx: Tranzactie, utilizatorId: string, actiune: string, documentId: string, detalii?: Record<string, unknown>) {
  await tx.insert(jurnal).values({ utilizatorId, actiune, entitate: "document", entitateId: documentId, detalii });
}

async function schimbaStarea(tx: Tranzactie, documentId: string, din: Stare, spre: Stare) {
  if (din === spre) return;
  if (!poateTrece(din, spre)) throw new Error(`Drumul actului nu permite trecerea din „${din}” în „${spre}”.`);
  await tx.update(documente).set({ stare: spre, actualizatLa: new Date() }).where(eq(documente.id, documentId));
}

/** Este documentul un proiect de hotărâre? Atunci pașii lui se fac din Consiliul local, nu din registratură. */
export async function proiectulDocumentului(tx: Tranzactie, documentId: string) {
  const [p] = await tx.select({ id: proiecteHotarare.id, numar: proiecteHotarare.numar, an: proiecteHotarare.an }).from(proiecteHotarare).where(eq(proiecteHotarare.documentId, documentId));
  return p ?? null;
}

/** Și ieșirea de comunicare la prefect ține de un proiect. */
export async function proiectulIesirii(tx: Tranzactie, iesireId: string) {
  const [p] = await tx.select({ id: proiecteHotarare.id }).from(proiecteHotarare).where(eq(proiecteHotarare.prefectIesireId, iesireId));
  return p ?? null;
}

export async function comisiileEntitatii(tx: Tranzactie) {
  return tx.select().from(comisii).where(eq(comisii.activa, true)).orderBy(asc(comisii.numar));
}

// ——— Proiectul ———

/**
 * Inițierea: proiectul intră în registru cu numărul dat de registrul oficial și primește numărul din
 * registrul proiectelor de hotărâre (pe an). Merge direct la compartimentul de specialitate, pentru raport.
 */
export async function initiazaProiectul(
  tx: Tranzactie,
  a: {
    entitateId: string; utilizatorId: string; numarInregistrare: number; data: string; titlu: string; initiator: Initiator;
    compartimentId: string; normativ: boolean; majoritate: Majoritate; referatLa: string | null;
  },
) {
  const an = Number(a.data.slice(0, 4));
  const [ocupat] = await tx.select({ id: documente.id }).from(documente).where(and(eq(documente.an, an), eq(documente.numar, a.numarInregistrare)));
  if (ocupat) throw new Error(`Numărul ${a.numarInregistrare}/${an} există deja în registru.`);
  const [c] = await tx.select({ id: compartimente.id }).from(compartimente).where(and(eq(compartimente.id, a.compartimentId), eq(compartimente.entitateId, a.entitateId)));
  if (!c) throw new Error("Compartimentul nu aparține entității.");
  if (a.referatLa && a.referatLa < a.data) throw new Error("Referatul de aprobare nu poate fi datat înainte de înregistrare.");
  const [doc] = await tx
    .insert(documente)
    .values({
      entitateId: a.entitateId, an, numar: a.numarInregistrare, dataInregistrare: new Date(`${a.data}T12:00:00Z`), directie: "intern", sursa: "petru",
      tip: "Proiect de hotărâre", continut: a.titlu, compartimentId: a.compartimentId, stare: "repartizat",
    })
    .returning({ id: documente.id });
  const [m] = await tx.select({ m: max(proiecteHotarare.numar) }).from(proiecteHotarare).where(eq(proiecteHotarare.an, an));
  const numar = (m?.m ?? 0) + 1;
  const [p] = await tx
    .insert(proiecteHotarare)
    .values({
      entitateId: a.entitateId, documentId: doc!.id, an, numar, titlu: a.titlu, initiator: a.initiator, compartimentId: a.compartimentId,
      normativ: a.normativ, majoritate: a.majoritate, referatLa: a.referatLa,
    })
    .returning({ id: proiecteHotarare.id });
  await scrieInJurnal(tx, a.utilizatorId, `a inițiat proiectul de hotărâre nr. ${numar}/${an}`, doc!.id, { inregistrare: `${a.numarInregistrare}/${an}`, initiator: a.initiator, normativ: a.normativ });
  return { id: p!.id, numar, an };
}

export type Material = "referat" | "raport" | "aviz_legalitate";

export const ETICHETE_MATERIAL: Record<Material, string> = {
  referat: "referatul de aprobare al inițiatorului",
  raport: "raportul compartimentului de specialitate",
  aviz_legalitate: "avizul de legalitate al secretarului general",
};

/** Referatul, raportul sau avizul de legalitate: data la care e gata. Raportul trece proiectul „în lucru”. */
export async function scrieMaterialul(tx: Tranzactie, a: { proiectId: string; fel: Material; la: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (p.rezultat) throw new Error("Proiectul are deja un rezultat; materialele nu se mai schimbă.");
  const d = await documentulProiectului(tx, p);
  if (a.la < ziua(d.dataInregistrare)) throw new Error("Data e înainte de înregistrarea proiectului.");
  const camp = a.fel === "referat" ? { referatLa: a.la } : a.fel === "raport" ? { raportLa: a.la } : { avizLegalitateLa: a.la, avizLegalitateDe: a.utilizatorId };
  await tx.update(proiecteHotarare).set({ ...camp, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  if (a.fel === "raport" && d.stare === "repartizat") await schimbaStarea(tx, d.id, d.stare, "in_lucru");
  await scrieInJurnal(tx, a.utilizatorId, `a scris ${ETICHETE_MATERIAL[a.fel]}`, d.id, { la: a.la });
}

/** Trimite proiectul la comisiile de specialitate (avizul lor se scrie apoi, la fiecare). */
export async function sesizeazaComisiile(tx: Tranzactie, a: { entitateId: string; proiectId: string; comisieIds: string[]; la: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (p.rezultat) throw new Error("Proiectul are deja un rezultat.");
  if (!a.comisieIds.length) throw new Error("Alegeți cel puțin o comisie.");
  const gasite = await tx.select({ id: comisii.id, nume: comisii.nume }).from(comisii).where(and(inArray(comisii.id, a.comisieIds), eq(comisii.activa, true)));
  if (gasite.length !== a.comisieIds.length) throw new Error("O comisie aleasă nu există.");
  await tx
    .insert(avizeComisii)
    .values(gasite.map((c) => ({ entitateId: a.entitateId, proiectId: p.id, comisieId: c.id, sesizataLa: a.la })))
    .onConflictDoNothing({ target: [avizeComisii.proiectId, avizeComisii.comisieId] });
  await scrieInJurnal(tx, a.utilizatorId, `a trimis proiectul la avizare: ${gasite.map((c) => c.nume).join(", ")}`, p.documentId, { la: a.la });
}

/** O comisie sesizată din greșeală se scoate cât timp nu a dat avizul. */
export async function scoateComisia(tx: Tranzactie, a: { avizId: string; utilizatorId: string }) {
  const [r] = await tx.select({ id: avizeComisii.id, sens: avizeComisii.sens, proiectId: avizeComisii.proiectId, nume: comisii.nume }).from(avizeComisii).innerJoin(comisii, eq(comisii.id, avizeComisii.comisieId)).where(eq(avizeComisii.id, a.avizId));
  if (!r) throw new Error("Sesizarea nu există.");
  if (r.sens) throw new Error("Comisia a dat deja avizul; nu se mai scoate.");
  const p = await proiectul(tx, r.proiectId);
  if (p.rezultat) throw new Error("Proiectul are deja un rezultat.");
  await tx.delete(avizeComisii).where(eq(avizeComisii.id, r.id));
  await scrieInJurnal(tx, a.utilizatorId, `a scos comisia de la avizare: ${r.nume}`, p.documentId);
}

/** Avizul scris al comisiei. Avizul e consultativ: un aviz nefavorabil nu oprește votul. */
export async function scrieAvizul(tx: Tranzactie, a: { avizId: string; sens: SensAviz; data: string; amendamente: string | null; utilizatorId: string }) {
  const [r] = await tx.select({ id: avizeComisii.id, proiectId: avizeComisii.proiectId, sesizataLa: avizeComisii.sesizataLa, nume: comisii.nume }).from(avizeComisii).innerJoin(comisii, eq(comisii.id, avizeComisii.comisieId)).where(eq(avizeComisii.id, a.avizId)).for("update");
  if (!r) throw new Error("Sesizarea nu există.");
  const p = await proiectul(tx, r.proiectId);
  if (p.rezultat) throw new Error("Proiectul are deja un rezultat.");
  if (a.data < r.sesizataLa) throw new Error("Avizul nu poate fi datat înainte de sesizarea comisiei.");
  if (a.sens === "favorabil_cu_amendamente" && !a.amendamente) throw new Error("Scrieți pe scurt amendamentele.");
  await tx.update(avizeComisii).set({ sens: a.sens, data: a.data, amendamente: a.amendamente }).where(eq(avizeComisii.id, r.id));
  await scrieInJurnal(tx, a.utilizatorId, `a scris avizul comisiei: ${r.nume}, ${a.sens.replaceAll("_", " ")}`, p.documentId, { data: a.data });
}

/**
 * Anunțul pe Legea 52 (proiectele normative): pe site și în Monitorul Oficial Local. Pornește două ceasuri
 * de așteptare: propunerile (10 zile) și supunerea spre aprobare (30 de zile lucrătoare).
 */
export async function anuntaProiectul(tx: Tranzactie, a: { entitateId: string; proiectId: string; la: string; unde: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (!p.normativ) throw new Error("Numai proiectele normative se anunță pe Legea 52.");
  if (p.anuntatLa) throw new Error("Proiectul e deja anunțat.");
  if (p.rezultat) throw new Error("Proiectul are deja un rezultat.");
  const d = await documentulProiectului(tx, p);
  if (a.la < ziua(d.dataInregistrare)) throw new Error("Anunțul e înainte de înregistrarea proiectului.");
  await tx.update(proiecteHotarare).set({ anuntatLa: a.la, anuntUnde: a.unde, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  for (const regula of REGULI_L52) await pornesteCeasulDocumentului(tx, { entitateId: a.entitateId, documentId: d.id, regula, pornitLa: a.la, principal: false });
  await scrieInJurnal(tx, a.utilizatorId, "a anunțat proiectul pe Legea 52/2003", d.id, { la: a.la, unde: a.unde });
}

/** Excepția de urgență (Legea 52/2003, art. 7 alin. (13), de confirmat): proiectul normativ se adoptă fără așteptare, cu motivul scris. */
export async function scrieExceptiaDeUrgenta(tx: Tranzactie, a: { proiectId: string; motiv: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (!p.normativ) throw new Error("Excepția privește numai proiectele normative.");
  if (p.rezultat) throw new Error("Proiectul are deja un rezultat.");
  if (a.motiv.length < 10) throw new Error("Scrieți motivul urgenței (situația excepțională).");
  await tx.update(proiecteHotarare).set({ exceptieUrgenta: a.motiv, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  await scrieInJurnal(tx, a.utilizatorId, "a scris excepția de urgență de la Legea 52/2003", p.documentId, { motiv: a.motiv });
}

/** Registrul propunerilor primite la proiectul anunțat: numai rezumatul, fără datele celui care propune. */
export async function adaugaPropunerea(tx: Tranzactie, a: { entitateId: string; proiectId: string; la: string; numar: string | null; rezumat: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (!p.anuntatLa) throw new Error("Proiectul nu a fost anunțat pe Legea 52.");
  if (a.la < p.anuntatLa) throw new Error("Propunerea e datată înainte de anunț.");
  await tx.insert(propuneriL52).values({ entitateId: a.entitateId, proiectId: p.id, primitaLa: a.la, numarInregistrare: a.numar, rezumat: a.rezumat });
  await scrieInJurnal(tx, a.utilizatorId, "a scris o propunere primită pe Legea 52", p.documentId, { la: a.la, numar: a.numar });
}

export async function analizeazaPropunerea(tx: Tranzactie, a: { propunereId: string; preluata: boolean; utilizatorId: string }) {
  const [r] = await tx.select().from(propuneriL52).where(eq(propuneriL52.id, a.propunereId));
  if (!r) throw new Error("Propunerea nu există.");
  const p = await proiectul(tx, r.proiectId);
  await tx.update(propuneriL52).set({ preluata: a.preluata }).where(eq(propuneriL52.id, r.id));
  await scrieInJurnal(tx, a.utilizatorId, a.preluata ? "a preluat o propunere în proiect" : "nu a preluat o propunere", p.documentId);
}

async function stareaProiectului(tx: Tranzactie, p: Proiect): Promise<StareProiect> {
  const [l52] = await tx.select({ termen: ceasuri.termen }).from(ceasuri).where(and(eq(ceasuri.documentId, p.documentId), eq(ceasuri.regula, "l52-anunt")));
  const [av] = await tx
    .select({ sesizate: sql<number>`count(*)::int`, date: sql<number>`count(${avizeComisii.sens})::int` })
    .from(avizeComisii)
    .where(eq(avizeComisii.proiectId, p.id));
  return {
    normativ: p.normativ, referatLa: p.referatLa, raportLa: p.raportLa, l52Termen: l52?.termen ?? null, exceptieUrgenta: p.exceptieUrgenta,
    comisiiSesizate: av?.sesizate ?? 0, avizeDate: av?.date ?? 0, sedintaId: p.sedintaId, rezultat: p.rezultat,
  };
}

// ——— Ședința ———

export async function creeazaSedinta(tx: Tranzactie, a: { entitateId: string; data: string; tip: TipSedinta; consilieriInFunctie: number; utilizatorId: string }) {
  if (!dataSedinteiValida(a.data)) throw new Error("Data ședinței nu e validă.");
  if (!Number.isInteger(a.consilieriInFunctie) || a.consilieriInFunctie < 1 || a.consilieriInFunctie > 99) throw new Error("Scrieți câți consilieri sunt în funcție.");
  const [s] = await tx.insert(sedinte).values({ entitateId: a.entitateId, data: a.data, tip: a.tip, consilieriInFunctie: a.consilieriInFunctie }).returning({ id: sedinte.id });
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a creat ședința consiliului local", entitate: "sedinta", entitateId: s!.id, detalii: { data: a.data, tip: a.tip } });
  return s!.id;
}

/** Pune proiectul pe ordinea de zi (la sfârșitul ei). Proiectul normativ, numai după termenul Legii 52. */
export async function puneOrdineaDeZi(tx: Tranzactie, a: { proiectId: string; sedintaId: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  const s = await sedinta(tx, a.sedintaId);
  if (p.sedintaId === s.id) return;
  const v = poatePeOrdineaDeZi(await stareaProiectului(tx, p), s.data);
  if (!v.da) throw new Error(v.motiv);
  if (s.pvRedactatLa) throw new Error("Ședința s-a încheiat (procesul-verbal e redactat).");
  const [m] = await tx.select({ m: max(proiecteHotarare.ordine) }).from(proiecteHotarare).where(eq(proiecteHotarare.sedintaId, s.id));
  await tx.update(proiecteHotarare).set({ sedintaId: s.id, ordine: (m?.m ?? 0) + 1, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  await scrieInJurnal(tx, a.utilizatorId, `a pus proiectul pe ordinea de zi a ședinței din ${s.data.split("-").reverse().join(".")}`, p.documentId);
}

/** Scoate proiectul de pe ordinea de zi înainte de ședință (amânat). Retragerea în ședință e un rezultat. */
export async function scoateDeOrdineaDeZi(tx: Tranzactie, a: { proiectId: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (!p.sedintaId || p.rezultat) throw new Error("Proiectul nu e pe o ordine de zi deschisă.");
  await tx.update(proiecteHotarare).set({ sedintaId: null, ordine: null, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  await scrieInJurnal(tx, a.utilizatorId, "a scos proiectul de pe ordinea de zi (amânat)", p.documentId);
}

/** Convocarea: data, convocatorul și trimiterea materialelor către consilieri. Întoarce o avertizare, dacă e cazul. */
export async function convoaca(tx: Tranzactie, a: { sedintaId: string; la: string; convocare: string; materialeLa: string | null; utilizatorId: string }) {
  const s = await sedinta(tx, a.sedintaId);
  if (a.materialeLa && a.materialeLa < a.la) throw new Error("Materialele nu pot pleca înainte de convocare.");
  await tx.update(sedinte).set({ convocatLa: a.la, convocare: a.convocare, materialeTrimiseLa: a.materialeLa, actualizatLa: new Date() }).where(eq(sedinte.id, s.id));
  const avertizare = avertizareConvocare(s.tip, a.la, s.data);
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a scris convocarea ședinței", entitate: "sedinta", entitateId: s.id, detalii: { la: a.la, convocare: a.convocare, materialeLa: a.materialeLa, avertizare } });
  return avertizare;
}

export async function scriePrezenta(tx: Tranzactie, a: { sedintaId: string; prezenti: number; presedinte: string | null; utilizatorId: string }) {
  const s = await sedinta(tx, a.sedintaId);
  if (!Number.isInteger(a.prezenti) || a.prezenti < 0 || a.prezenti > s.consilieriInFunctie) throw new Error(`Prezenți: între 0 și ${s.consilieriInFunctie} (consilierii în funcție).`);
  const [votate] = await tx.select({ n: sql<number>`count(*)::int` }).from(proiecteHotarare).where(and(eq(proiecteHotarare.sedintaId, s.id), isNotNull(proiecteHotarare.votPentru)));
  if ((votate?.n ?? 0) > 0 && a.prezenti !== s.prezenti) throw new Error("S-au scris deja voturi în această ședință; prezența nu se mai schimbă.");
  await tx.update(sedinte).set({ prezenti: a.prezenti, presedinte: a.presedinte, actualizatLa: new Date() }).where(eq(sedinte.id, s.id));
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a scris prezența la ședință", entitate: "sedinta", entitateId: s.id, detalii: { prezenti: a.prezenti, inFunctie: s.consilieriInFunctie } });
}

/**
 * Votul pe proiect. Petru verifică pragul majorității cu prezența scrisă. Proiectul aprobat primește
 * numărul din registrul hotărârilor (pe an) și pornește ceasul comunicării la prefect.
 */
export async function voteaza(tx: Tranzactie, a: { entitateId: string; proiectId: string; rezultat: Rezultat; vot: Vot | null; majoritate: Majoritate; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (!p.sedintaId) throw new Error("Proiectul nu e pe ordinea de zi.");
  const s = await sedinta(tx, p.sedintaId);
  const v = poateFiVotat(await stareaProiectului(tx, p), s.data, a.rezultat);
  if (!v.da) throw new Error(v.motiv);
  if (a.rezultat !== "retras" && s.prezenti === null) throw new Error("Scrieți întâi prezența la ședință.");
  const vv = verificaVotul({ rezultat: a.rezultat, majoritate: a.majoritate, prezenti: s.prezenti ?? 0, inFunctie: s.consilieriInFunctie, vot: a.vot });
  if (!vv.da) throw new Error(vv.motiv);
  const d = await documentulProiectului(tx, p);
  const schimbari: Partial<typeof proiecteHotarare.$inferInsert> = {
    rezultat: a.rezultat, rezultatLa: s.data, majoritate: a.majoritate, actualizatLa: new Date(),
    ...(a.rezultat !== "retras" && a.vot ? { votPentru: a.vot.pentru, votContra: a.vot.contra, votAbtineri: a.vot.abtineri } : {}),
  };
  const anHcl = Number(s.data.slice(0, 4));
  let numarHcl: number | null = null;
  if (a.rezultat === "aprobat") {
    const [m] = await tx.select({ m: max(proiecteHotarare.numarHcl) }).from(proiecteHotarare).where(eq(proiecteHotarare.anHcl, anHcl));
    numarHcl = (m?.m ?? 0) + 1;
    Object.assign(schimbari, { anHcl, numarHcl });
  }
  await tx.update(proiecteHotarare).set(schimbari).where(eq(proiecteHotarare.id, p.id));
  // Așteptarea pe Legea 52 s-a încheiat cu ședința.
  for (const regula of REGULI_L52) await opresteCeasurile(tx, { documentId: d.id, la: s.data, motiv: "proiectul a ajuns la vot", regula });
  if (a.rezultat === "aprobat") {
    let stare = d.stare;
    if (stare === "repartizat") {
      await schimbaStarea(tx, d.id, stare, "in_lucru");
      stare = "in_lucru";
    }
    await schimbaStarea(tx, d.id, stare, "la_semnat");
    await pornesteCeasulDocumentului(tx, { entitateId: a.entitateId, documentId: d.id, regula: "hcl-prefect", pornitLa: s.data, principal: true });
  } else {
    await schimbaStarea(tx, d.id, d.stare, "arhivat");
  }
  const cifre = a.vot && a.rezultat !== "retras" ? ` (pentru ${a.vot.pentru}, contra ${a.vot.contra}, abțineri ${a.vot.abtineri})` : "";
  await scrieInJurnal(tx, a.utilizatorId, `${ETICHETE_REZULTAT[a.rezultat].toLowerCase()}${cifre}${numarHcl ? `: hotărârea nr. ${numarHcl}/${anHcl}` : ""}`, d.id, { sedinta: s.id, majoritate: a.majoritate });
  return { numarHcl, anHcl };
}

/**
 * Semnătura președintelui de ședință (consemnată de secretariat, de pe hârtie) și contrasemnătura
 * secretarului general. Cu amândouă, hotărârea e emisă.
 */
export async function semneazaHotararea(tx: Tranzactie, a: { proiectId: string; fel: "presedinte" | "secretar"; la: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (p.rezultat !== "aprobat") throw new Error("Se semnează numai hotărârea adoptată.");
  const d = await documentulProiectului(tx, p);
  if (d.stare !== "la_semnat") throw new Error("Hotărârea nu e la semnat.");
  if (p.rezultatLa && a.la < p.rezultatLa) throw new Error("Semnătura nu poate fi înainte de ședință.");
  const schimbari = a.fel === "presedinte" ? { semnatLa: a.la } : { contrasemnatLa: a.la, contrasemnatDe: a.utilizatorId };
  await tx.update(documente).set({ ...schimbari, actualizatLa: new Date() }).where(eq(documente.id, d.id));
  await scrieInJurnal(tx, a.utilizatorId, a.fel === "presedinte" ? "a consemnat semnătura președintelui de ședință pe hotărâre" : "a contrasemnat hotărârea", d.id, { la: a.la });
  const lipsa = semnaturiHotarareLipsa({ semnatLa: a.fel === "presedinte" ? a.la : d.semnatLa, contrasemnatLa: a.fel === "secretar" ? a.la : d.contrasemnatLa });
  if (lipsa.length === 0) {
    await schimbaStarea(tx, d.id, "la_semnat", "emis");
    await scrieInJurnal(tx, a.utilizatorId, `hotărârea nr. ${p.numarHcl}/${p.anHcl} e emisă`, d.id);
  }
}

/**
 * Comunicarea la prefect: adresa de înaintare pleacă din registru (ieșire legată de proiect, cu numărul
 * dat de registrul oficial). Oprește ceasul de 10 zile lucrătoare. Dovada primirii se scrie apoi pe ieșire.
 */
export async function comunicaPrefectului(tx: Tranzactie, a: { entitateId: string; proiectId: string; numar: number; data: string; mod: ModExpediere; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (p.rezultat !== "aprobat") throw new Error("Se comunică numai hotărârea adoptată.");
  if (p.prefectIesireId) throw new Error("Hotărârea e deja comunicată la prefect.");
  const d = await documentulProiectului(tx, p);
  if (d.stare !== "emis" && d.stare !== "publicat") throw new Error("Hotărârea se comunică după semnătură și contrasemnătură.");
  if (p.rezultatLa && a.data < p.rezultatLa) throw new Error("Comunicarea nu poate fi înainte de ședință.");
  const ies = await creeazaIesirea(tx, {
    entitateId: a.entitateId, utilizatorId: a.utilizatorId, intrare: d, numar: a.numar, data: a.data, mod: a.mod, destinatar: "Instituția Prefectului",
    tip: `Comunicarea HCL nr. ${p.numarHcl}/${p.anHcl} la prefect`, continut: `Comunicarea hotărârii nr. ${p.numarHcl}/${p.anHcl}: ${p.titlu}`,
    motivOprire: `comunicată la prefect, nr. ${a.numar}`,
  });
  await tx.update(proiecteHotarare).set({ prefectIesireId: ies.id, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
}

/** Dovada primirii la prefect (confirmarea poștei, semnătura de primire a curierului, numărul de înregistrare al prefecturii). */
export async function confirmaPrimireaLaPrefect(tx: Tranzactie, a: { proiectId: string; la: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (!p.prefectIesireId) throw new Error("Hotărârea nu e comunicată la prefect.");
  const [i] = await tx.select({ expediatLa: documente.expediatLa }).from(documente).where(eq(documente.id, p.prefectIesireId));
  if (i?.expediatLa && a.la < i.expediatLa) throw new Error("Primirea nu poate fi înainte de expediere.");
  await tx.update(documente).set({ confirmatLa: a.la, actualizatLa: new Date() }).where(eq(documente.id, p.prefectIesireId));
  await scrieInJurnal(tx, a.utilizatorId, "a scris dovada primirii la prefect", p.documentId, { la: a.la });
}

// ——— Poarta de publicare ———

/** Aprobarea publicării (poarta): un om cu dreptul de publicare. */
export async function aprobaPublicarea(tx: Tranzactie, a: { proiectId: string; azi: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (p.rezultat !== "aprobat") throw new Error("Se publică numai hotărârea adoptată.");
  await tx.update(proiecteHotarare).set({ publicareAprobataLa: a.azi, publicareAprobataDe: a.utilizatorId, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  await scrieInJurnal(tx, a.utilizatorId, "a aprobat publicarea hotărârii", p.documentId);
}

/** Copia anonimizată e pregătită și verificată (anexele fără date personale nefiltrate). */
export async function marcheazaCopiaAnonimizata(tx: Tranzactie, a: { proiectId: string; azi: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  if (p.rezultat !== "aprobat") throw new Error("Se publică numai hotărârea adoptată.");
  await tx.update(proiecteHotarare).set({ copieAnonimizataLa: a.azi, copieAnonimizataDe: a.utilizatorId, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  await scrieInJurnal(tx, a.utilizatorId, "a verificat copia anonimizată a hotărârii", p.documentId);
}

/**
 * Publicarea în Monitorul Oficial Local o face omul, pe platforma MOL; Petru scrie că s-a făcut, numai
 * după poartă: hotărârea emisă, publicarea aprobată, copia anonimizată verificată.
 */
export async function marcheazaPublicarea(tx: Tranzactie, a: { proiectId: string; la: string; unde: string; utilizatorId: string }) {
  const p = await proiectul(tx, a.proiectId);
  const d = await documentulProiectului(tx, p);
  const v = poatePublica({ stare: d.stare, aprobatDe: p.publicareAprobataDe, copieAnonimizata: !!p.copieAnonimizataLa });
  if (!v.da) throw new Error(v.motiv);
  if (p.rezultatLa && a.la < p.rezultatLa) throw new Error("Publicarea nu poate fi înainte de ședință.");
  await tx.update(proiecteHotarare).set({ publicatLa: a.la, publicatUnde: a.unde, actualizatLa: new Date() }).where(eq(proiecteHotarare.id, p.id));
  await schimbaStarea(tx, d.id, d.stare, "publicat");
  await scrieInJurnal(tx, a.utilizatorId, `a scris publicarea hotărârii: ${a.unde}`, d.id, { la: a.la });
}

// ——— Procesul-verbal ———

export type PasPv = "redactat" | "semnat" | "aprobat" | "publicat";

/**
 * Procesul-verbal: redactat (Administrație publică), semnat (președintele și secretarul general), aprobat
 * în ședința următoare, apoi afișat și publicat. Aprobarea pornește ceasul publicării (art. 138, de confirmat).
 */
export async function scriePv(tx: Tranzactie, a: { entitateId: string; sedintaId: string; pas: PasPv; la: string; aprobatInSedintaId?: string | null; utilizatorId: string }) {
  const s = await sedinta(tx, a.sedintaId);
  if (a.la < s.data) throw new Error("Data e înainte de ședință.");
  const lipsa = a.pas === "semnat" && !s.pvRedactatLa ? "redactat" : a.pas === "aprobat" && !s.pvSemnatLa ? "semnat" : a.pas === "publicat" && !s.pvAprobatLa ? "aprobat" : null;
  if (lipsa) throw new Error(`Procesul-verbal trebuie întâi ${lipsa}.`);
  const schimbari: Partial<typeof sedinte.$inferInsert> = { actualizatLa: new Date() };
  if (a.pas === "redactat") schimbari.pvRedactatLa = a.la;
  if (a.pas === "semnat") schimbari.pvSemnatLa = a.la;
  if (a.pas === "aprobat") {
    if (!a.aprobatInSedintaId) throw new Error("Alegeți ședința în care s-a aprobat procesul-verbal.");
    const urm = await sedinta(tx, a.aprobatInSedintaId);
    if (urm.data <= s.data) throw new Error("Procesul-verbal se aprobă într-o ședință ulterioară.");
    if (urm.data > a.la) throw new Error("Ședința în care se aprobă procesul-verbal nu a avut loc încă.");
    Object.assign(schimbari, { pvAprobatLa: urm.data, pvAprobatInSedintaId: urm.id });
  }
  if (a.pas === "publicat") schimbari.pvPublicatLa = a.la;
  await tx.update(sedinte).set(schimbari).where(eq(sedinte.id, s.id));
  if (a.pas === "aprobat") {
    const c = pornesteCeasul("pv-publicare", schimbari.pvAprobatLa!);
    await tx.insert(ceasuri).values({ entitateId: a.entitateId, sedintaId: s.id, regula: c.regula, pornitLa: c.pornitLa, termenInitial: c.termenInitial, termen: c.termen }).onConflictDoNothing({ target: [ceasuri.sedintaId, ceasuri.regula] });
  }
  if (a.pas === "publicat") {
    const deschise = await tx.select().from(ceasuri).where(and(eq(ceasuri.sedintaId, s.id), isNull(ceasuri.opritLa)));
    for (const r of deschise) {
      const la = a.la < r.pornitLa ? r.pornitLa : a.la;
      opreste({ regula: r.regula, pornitLa: r.pornitLa, termenInitial: r.termenInitial, termen: r.termen, prelungitLa: r.prelungitLa, opritLa: null }, la);
      await tx.update(ceasuri).set({ opritLa: la, motivOprire: "procesul-verbal publicat", actualizatLa: new Date() }).where(eq(ceasuri.id, r.id));
    }
  }
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: `procesul-verbal: ${a.pas}`, entitate: "sedinta", entitateId: s.id, detalii: { la: a.la } });
}

// ——— Citirea ———

const iesirePrefect = alias(documente, "iesire_prefect");
const ceasPrefect = alias(ceasuri, "ceas_prefect");
const ceasL52 = alias(ceasuri, "ceas_l52");
const docProiect = alias(documente, "doc_proiect");

/** Coloanele comune listelor și registrelor. */
const randProiect = {
  id: proiecteHotarare.id, an: proiecteHotarare.an, numar: proiecteHotarare.numar, titlu: proiecteHotarare.titlu, initiator: proiecteHotarare.initiator,
  normativ: proiecteHotarare.normativ, compartiment: compartimente.nume, compartimentId: proiecteHotarare.compartimentId,
  referatLa: proiecteHotarare.referatLa, raportLa: proiecteHotarare.raportLa, anuntatLa: proiecteHotarare.anuntatLa, exceptieUrgenta: proiecteHotarare.exceptieUrgenta,
  sedintaId: proiecteHotarare.sedintaId, sedintaData: sedinte.data, sedintaTip: sedinte.tip, ordine: proiecteHotarare.ordine,
  rezultat: proiecteHotarare.rezultat, rezultatLa: proiecteHotarare.rezultatLa, votPentru: proiecteHotarare.votPentru, votContra: proiecteHotarare.votContra, votAbtineri: proiecteHotarare.votAbtineri,
  anHcl: proiecteHotarare.anHcl, numarHcl: proiecteHotarare.numarHcl, publicatLa: proiecteHotarare.publicatLa, publicatUnde: proiecteHotarare.publicatUnde,
  dataInregistrare: docProiect.dataInregistrare, numarInregistrare: docProiect.numar, stare: docProiect.stare, semnatLa: docProiect.semnatLa, contrasemnatLa: docProiect.contrasemnatLa,
  prefectNumar: iesirePrefect.numar, prefectLa: iesirePrefect.expediatLa, prefectConfirmatLa: iesirePrefect.confirmatLa,
  prefectTermen: ceasPrefect.termen, prefectOprit: ceasPrefect.opritLa, l52Termen: ceasL52.termen,
  comisiiSesizate: sql<number>`(select count(*)::int from petru.avize_comisii a where a.proiect_id = proiecte_hotarare.id)`,
  avizeDate: sql<number>`(select count(a.sens)::int from petru.avize_comisii a where a.proiect_id = proiecte_hotarare.id)`,
};

function interogareProiecte(tx: Tranzactie) {
  return tx
    .select(randProiect)
    .from(proiecteHotarare)
    .innerJoin(docProiect, eq(docProiect.id, proiecteHotarare.documentId))
    .leftJoin(compartimente, eq(compartimente.id, proiecteHotarare.compartimentId))
    .leftJoin(sedinte, eq(sedinte.id, proiecteHotarare.sedintaId))
    .leftJoin(iesirePrefect, eq(iesirePrefect.id, proiecteHotarare.prefectIesireId))
    .leftJoin(ceasPrefect, and(eq(ceasPrefect.documentId, proiecteHotarare.documentId), eq(ceasPrefect.regula, "hcl-prefect")))
    .leftJoin(ceasL52, and(eq(ceasL52.documentId, proiecteHotarare.documentId), eq(ceasL52.regula, "l52-anunt")));
}

export type RandProiectLista = Awaited<ReturnType<typeof listaProiectelor>>[number];

export type FiltruProiecte = "in_lucru" | "pe_ordinea_de_zi" | "adoptate" | "toate";

export async function listaProiectelor(tx: Tranzactie, v: VedereConsiliu, a: { filtru: FiltruProiecte; an?: number }) {
  const conditii: (SQL | undefined)[] = [conditiaVederii(v)];
  if (a.an) conditii.push(eq(proiecteHotarare.an, a.an));
  if (a.filtru === "in_lucru") conditii.push(isNull(proiecteHotarare.rezultat), isNull(proiecteHotarare.sedintaId));
  if (a.filtru === "pe_ordinea_de_zi") conditii.push(isNull(proiecteHotarare.rezultat), isNotNull(proiecteHotarare.sedintaId));
  if (a.filtru === "adoptate") conditii.push(eq(proiecteHotarare.rezultat, "aprobat"));
  return interogareProiecte(tx).where(and(...conditii)).orderBy(desc(proiecteHotarare.an), desc(proiecteHotarare.numar)).limit(300);
}

export async function fisaProiectului(tx: Tranzactie, id: string, v: VedereConsiliu) {
  const [p] = await interogareProiecte(tx).where(and(eq(proiecteHotarare.id, id), conditiaVederii(v) ?? sql`true`));
  if (!p) return null;
  const [r] = await tx.select().from(proiecteHotarare).where(eq(proiecteHotarare.id, id));
  const avize = await tx
    .select({ id: avizeComisii.id, comisieId: comisii.id, comisie: comisii.nume, numarComisie: comisii.numar, sesizataLa: avizeComisii.sesizataLa, sens: avizeComisii.sens, data: avizeComisii.data, amendamente: avizeComisii.amendamente })
    .from(avizeComisii)
    .innerJoin(comisii, eq(comisii.id, avizeComisii.comisieId))
    .where(eq(avizeComisii.proiectId, id))
    .orderBy(asc(comisii.numar));
  const propuneri = await tx.select().from(propuneriL52).where(eq(propuneriL52.proiectId, id)).orderBy(asc(propuneriL52.primitaLa), asc(propuneriL52.creatLa));
  const ids = [r!.avizLegalitateDe, r!.publicareAprobataDe, r!.copieAnonimizataDe].filter((x): x is string => !!x);
  const nume = ids.length ? await tx.select({ id: utilizatori.id, nume: utilizatori.numeAfisat }).from(utilizatori).where(inArray(utilizatori.id, ids)) : [];
  const urma = await tx
    .select({ cand: jurnal.cand, actiune: jurnal.actiune, cine: utilizatori.numeAfisat })
    .from(jurnal)
    .leftJoin(utilizatori, eq(utilizatori.id, jurnal.utilizatorId))
    .where(and(eq(jurnal.entitate, "document"), eq(jurnal.entitateId, r!.documentId)))
    .orderBy(asc(jurnal.cand));
  return { ...p, rand: r!, avize, propuneri, urma, cine: (x: string | null) => nume.find((n) => n.id === x)?.nume ?? null };
}

export async function listaSedintelor(tx: Tranzactie, an?: number) {
  return tx
    .select({
      id: sedinte.id, data: sedinte.data, tip: sedinte.tip, convocatLa: sedinte.convocatLa, prezenti: sedinte.prezenti, consilieriInFunctie: sedinte.consilieriInFunctie,
      pvRedactatLa: sedinte.pvRedactatLa, pvAprobatLa: sedinte.pvAprobatLa, pvPublicatLa: sedinte.pvPublicatLa,
      proiecte: sql<number>`(select count(*)::int from petru.proiecte_hotarare p where p.sedinta_id = sedinte.id)`,
      adoptate: sql<number>`(select count(*)::int from petru.proiecte_hotarare p where p.sedinta_id = sedinte.id and p.rezultat = 'aprobat')`,
      pvTermen: sql<string | null>`(select c.termen::text from petru.ceasuri c where c.sedinta_id = sedinte.id and c.regula = 'pv-publicare')`,
    })
    .from(sedinte)
    .where(an ? sql`extract(year from ${sedinte.data}) = ${an}` : undefined)
    .orderBy(desc(sedinte.data));
}

export async function fisaSedintei(tx: Tranzactie, id: string, v: VedereConsiliu) {
  const [s] = await tx.select().from(sedinte).where(eq(sedinte.id, id));
  if (!s) return null;
  const ordinea = await interogareProiecte(tx).where(and(eq(proiecteHotarare.sedintaId, id), conditiaVederii(v) ?? sql`true`)).orderBy(asc(proiecteHotarare.ordine));
  const [ceasPv] = await tx.select().from(ceasuri).where(and(eq(ceasuri.sedintaId, id), eq(ceasuri.regula, "pv-publicare")));
  const [aprobatIn] = s.pvAprobatInSedintaId ? await tx.select({ id: sedinte.id, data: sedinte.data }).from(sedinte).where(eq(sedinte.id, s.pvAprobatInSedintaId)) : [];
  const urma = await tx
    .select({ cand: jurnal.cand, actiune: jurnal.actiune, cine: utilizatori.numeAfisat, detalii: jurnal.detalii })
    .from(jurnal)
    .leftJoin(utilizatori, eq(utilizatori.id, jurnal.utilizatorId))
    .where(and(eq(jurnal.entitate, "sedinta"), eq(jurnal.entitateId, id)))
    .orderBy(asc(jurnal.cand));
  return { sedinta: s, ordinea, ceasPv: ceasPv ?? null, aprobatIn: aprobatIn ?? null, urma };
}

/** Proiectele care pot intra pe ordinea de zi (fără rezultat, fără ședință), pentru alegerea din ședință. */
export async function proiecteDisponibile(tx: Tranzactie) {
  return interogareProiecte(tx).where(and(isNull(proiecteHotarare.rezultat), isNull(proiecteHotarare.sedintaId))).orderBy(asc(proiecteHotarare.an), asc(proiecteHotarare.numar));
}

/** Cifrele consiliului pentru panou: ce expiră și ce așteaptă. */
export async function cifreleConsiliului(tx: Tranzactie, v: VedereConsiliu, azi: string) {
  const limita = adaugaZile(azi, ZILE_AVERTIZARE, "calendaristice");
  const [r] = await tx
    .select({
      prefectDeschise: sql<number>`count(*) filter (where ${ceasPrefect.id} is not null and ${ceasPrefect.opritLa} is null)::int`,
      prefectDepasite: sql<number>`count(*) filter (where ${ceasPrefect.opritLa} is null and ${ceasPrefect.termen} < ${azi})::int`,
      prefectAproape: sql<number>`count(*) filter (where ${ceasPrefect.opritLa} is null and ${ceasPrefect.termen} between ${azi} and ${limita})::int`,
      l52Asteptare: sql<number>`count(*) filter (where ${ceasL52.opritLa} is null and ${ceasL52.termen} >= ${azi})::int`,
      deSemnat: sql<number>`count(*) filter (where ${docProiect.stare} = 'la_semnat' and ${docProiect.semnatLa} is null)::int`,
      deContrasemnat: sql<number>`count(*) filter (where ${docProiect.stare} = 'la_semnat' and ${docProiect.contrasemnatLa} is null)::int`,
      faraRaport: sql<number>`count(*) filter (where ${proiecteHotarare.rezultat} is null and ${proiecteHotarare.raportLa} is null)::int`,
      dePublicat: sql<number>`count(*) filter (where ${docProiect.stare} = 'emis' and ${proiecteHotarare.publicatLa} is null)::int`,
    })
    .from(proiecteHotarare)
    .innerJoin(docProiect, eq(docProiect.id, proiecteHotarare.documentId))
    .leftJoin(ceasPrefect, and(eq(ceasPrefect.documentId, proiecteHotarare.documentId), eq(ceasPrefect.regula, "hcl-prefect")))
    .leftJoin(ceasL52, and(eq(ceasL52.documentId, proiecteHotarare.documentId), eq(ceasL52.regula, "l52-anunt")))
    .where(conditiaVederii(v));
  const [pv] = await tx
    .select({
      dePublicat: sql<number>`count(*) filter (where ${ceasuri.opritLa} is null)::int`,
      depasite: sql<number>`count(*) filter (where ${ceasuri.opritLa} is null and ${ceasuri.termen} < ${azi})::int`,
    })
    .from(ceasuri)
    .where(and(isNotNull(ceasuri.sedintaId), eq(ceasuri.regula, "pv-publicare")));
  const gol = { prefectDeschise: 0, prefectDepasite: 0, prefectAproape: 0, l52Asteptare: 0, deSemnat: 0, deContrasemnat: 0, faraRaport: 0, dePublicat: 0 };
  return { ...(r ?? gol), pvDePublicat: pv?.dePublicat ?? 0, pvDepasite: pv?.depasite ?? 0 };
}

// ——— Registrele, pentru Monitorul Oficial Local ———

export async function registrulProiectelor(tx: Tranzactie, an: number) {
  return interogareProiecte(tx).where(eq(proiecteHotarare.an, an)).orderBy(asc(proiecteHotarare.numar));
}

export async function registrulHotararilor(tx: Tranzactie, an: number) {
  return interogareProiecte(tx).where(eq(proiecteHotarare.anHcl, an)).orderBy(asc(proiecteHotarare.numarHcl));
}

export async function registrulProceselorVerbale(tx: Tranzactie, an: number) {
  return listaSedintelor(tx, an).then((r) => [...r].reverse());
}
