/**
 * Ceasul termenelor în bază. Regulile sunt în `src/domeniu/ceas.ts`; aici se citesc și se scriu
 * ceasurile, cu urma în jurnal. Toate funcțiile primesc o tranzacție deschisă cu `inEntitate`.
 *
 * Ceasul cu regula documentului (`documente.termen_cheie`) e ceasul răspunsului: termenul lui se
 * copiază în `documente.termen`, ca listele și panoul să-l vadă fără alte căutări.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { ceasuri, documente, jurnal } from "./schema";
import type { Tranzactie } from "./entitate";
import { opreste, pornesteCeasul, prelungeste, type Ceas } from "@/domeniu/ceas";

export type RandCeas = typeof ceasuri.$inferSelect;

export function caCeas(r: RandCeas): Ceas {
  return { regula: r.regula, pornitLa: r.pornitLa, termenInitial: r.termenInitial, termen: r.termen, prelungitLa: r.prelungitLa, opritLa: r.opritLa };
}

/** Pornește ceasul unei reguli pentru document. Dacă există deja, îl lasă cum e (cu prelungirea lui). */
export async function pornesteCeasulDocumentului(tx: Tranzactie, a: { entitateId: string; documentId: string; regula: string; pornitLa: string; principal: boolean }) {
  const c = pornesteCeasul(a.regula, a.pornitLa);
  await tx
    .insert(ceasuri)
    .values({ entitateId: a.entitateId, documentId: a.documentId, regula: c.regula, pornitLa: c.pornitLa, termenInitial: c.termenInitial, termen: c.termen })
    .onConflictDoNothing({ target: [ceasuri.documentId, ceasuri.regula] });
  const [r] = await tx.select().from(ceasuri).where(and(eq(ceasuri.documentId, a.documentId), eq(ceasuri.regula, a.regula)));
  if (a.principal) await tx.update(documente).set({ termen: r!.termen, termenCheie: a.regula, actualizatLa: new Date() }).where(eq(documente.id, a.documentId));
  return r!;
}

/**
 * Schimbă regula ceasului răspunsului (de pildă, documentul e recunoscut ca cerere 544, nu ca petiție).
 * Se poate numai cât timp ceasul nu e prelungit și nu e oprit; termenul se socotește din nou.
 */
export async function schimbaRegulaRaspunsului(tx: Tranzactie, a: { entitateId: string; documentId: string; regulaNoua: string; pornitLa: string }) {
  const [doc] = await tx.select({ termenCheie: documente.termenCheie }).from(documente).where(eq(documente.id, a.documentId));
  if (!doc) throw new Error("Documentul nu există.");
  if (doc.termenCheie === a.regulaNoua) return pornesteCeasulDocumentului(tx, { ...a, regula: a.regulaNoua, principal: true });
  const [vechi] = doc.termenCheie ? await tx.select().from(ceasuri).where(and(eq(ceasuri.documentId, a.documentId), eq(ceasuri.regula, doc.termenCheie))) : [];
  if (vechi && (vechi.prelungitLa || vechi.opritLa)) throw new Error("Termenul a fost deja prelungit sau oprit; regula nu se mai schimbă.");
  const c = pornesteCeasul(a.regulaNoua, a.pornitLa);
  if (vechi) {
    const [ocupat] = await tx.select({ id: ceasuri.id }).from(ceasuri).where(and(eq(ceasuri.documentId, a.documentId), eq(ceasuri.regula, a.regulaNoua)));
    if (ocupat) throw new Error("Documentul are deja un ceas cu această regulă.");
    await tx.update(ceasuri).set({ regula: c.regula, pornitLa: c.pornitLa, termenInitial: c.termenInitial, termen: c.termen, actualizatLa: new Date() }).where(eq(ceasuri.id, vechi.id));
  } else {
    await tx.insert(ceasuri).values({ entitateId: a.entitateId, documentId: a.documentId, regula: c.regula, pornitLa: c.pornitLa, termenInitial: c.termenInitial, termen: c.termen });
  }
  await tx.update(documente).set({ termen: c.termen, termenCheie: c.regula, termenRecunoscut: true, actualizatLa: new Date() }).where(eq(documente.id, a.documentId));
}

export async function ceasurileDocumentului(tx: Tranzactie, documentId: string) {
  return tx.select().from(ceasuri).where(eq(ceasuri.documentId, documentId)).orderBy(asc(ceasuri.pornitLa), asc(ceasuri.creatLa));
}

/** Prelungește un ceas, după regula lui; termenul nou trece și pe document, dacă e ceasul răspunsului. */
export async function prelungesteCeasul(tx: Tranzactie, a: { ceasId: string; la: string; motiv: string; instiintare: string | null; utilizatorId: string }) {
  const [r] = await tx.select().from(ceasuri).where(eq(ceasuri.id, a.ceasId)).for("update");
  if (!r) throw new Error("Ceasul nu există.");
  const nou = prelungeste(caCeas(r), a.la);
  await tx.update(ceasuri).set({ termen: nou.termen, prelungitLa: a.la, prelungireMotiv: a.motiv, instiintare: a.instiintare, actualizatLa: new Date() }).where(eq(ceasuri.id, r.id));
  const [doc] = await tx.select({ termenCheie: documente.termenCheie }).from(documente).where(eq(documente.id, r.documentId));
  if (doc?.termenCheie === r.regula) await tx.update(documente).set({ termen: nou.termen, actualizatLa: new Date() }).where(eq(documente.id, r.documentId));
  await tx.insert(jurnal).values({
    utilizatorId: a.utilizatorId, actiune: "a prelungit termenul", entitate: "document", entitateId: r.documentId,
    detalii: { regula: r.regula, din: r.termen, pana: nou.termen, la: a.la, motiv: a.motiv, instiintare: a.instiintare },
  });
  return nou;
}

/** Oprește ceasurile care merg ale documentului (toate sau numai cel al unei reguli). */
export async function opresteCeasurile(tx: Tranzactie, a: { documentId: string; la: string; motiv: string; regula?: string }) {
  const deschise = await tx
    .select()
    .from(ceasuri)
    .where(and(eq(ceasuri.documentId, a.documentId), isNull(ceasuri.opritLa), a.regula ? eq(ceasuri.regula, a.regula) : undefined));
  for (const r of deschise) {
    // Un răspuns datat înainte de pornire (o greșeală de dată în export) oprește ceasul la pornire.
    const la = a.la < r.pornitLa ? r.pornitLa : a.la;
    opreste(caCeas(r), la);
    await tx.update(ceasuri).set({ opritLa: la, motivOprire: a.motiv, actualizatLa: new Date() }).where(eq(ceasuri.id, r.id));
  }
  return deschise.length;
}
