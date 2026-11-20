/**
 * Ceasul termenelor în bază. Regulile sunt în `src/domeniu/ceas.ts`; aici se citesc și se scriu
 * ceasurile, cu urma în jurnal. Toate funcțiile primesc o tranzacție deschisă cu `inEntitate`.
 *
 * Ceasul cu regula documentului (`documente.termen_cheie`) e ceasul răspunsului: termenul lui se
 * copiază în `documente.termen`, ca listele și panoul să-l vadă fără alte căutări.
 */
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { ceasuri, documente, jurnal, utilizatori } from "./schema";
import type { Tranzactie } from "./entitate";
import { opreste, pornesteCeasul, poatePropunePrelungirea, prelungeste, type Ceas } from "@/domeniu/ceas";

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
  const randuri = await tx.select().from(ceasuri).where(eq(ceasuri.documentId, documentId)).orderBy(asc(ceasuri.pornitLa), asc(ceasuri.creatLa));
  const ids = [...new Set(randuri.flatMap((r) => [r.prelungirePropusaDe, r.prelungitDe]).filter((x): x is string => !!x))];
  const nume = ids.length ? await tx.select({ id: utilizatori.id, nume: utilizatori.numeAfisat }).from(utilizatori).where(inArray(utilizatori.id, ids)) : [];
  const cine = (id: string | null) => nume.find((n) => n.id === id)?.nume ?? null;
  return randuri.map((r) => ({ ...r, propusDeNume: cine(r.prelungirePropusaDe), prelungitDeNume: cine(r.prelungitDe) }));
}

/** Compartimentul propune prelungirea, cu motivul. Termenul nu se schimbă până la hotărârea conducătorului. */
export async function propunePrelungirea(tx: Tranzactie, a: { ceasId: string; azi: string; motiv: string; utilizatorId: string }) {
  const [r] = await tx.select().from(ceasuri).where(eq(ceasuri.id, a.ceasId)).for("update");
  if (!r) throw new Error("Ceasul nu există.");
  const v = poatePropunePrelungirea(caCeas(r), r.prelungirePropusaLa, a.azi);
  if (!v.da) throw new Error(v.motiv);
  await tx.update(ceasuri).set({ prelungirePropusaLa: a.azi, prelungirePropusaDe: a.utilizatorId, prelungireMotiv: a.motiv, actualizatLa: new Date() }).where(eq(ceasuri.id, r.id));
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "a propus prelungirea termenului", entitate: "document", entitateId: r.documentId, detalii: { regula: r.regula, motiv: a.motiv } });
  return r.documentId;
}

/** Conducătorul nu aprobă propunerea: termenul rămâne, propunerea se șterge (urma rămâne în jurnal). */
export async function respingePropunerea(tx: Tranzactie, a: { ceasId: string; utilizatorId: string }) {
  const [r] = await tx.select().from(ceasuri).where(eq(ceasuri.id, a.ceasId)).for("update");
  if (!r?.prelungirePropusaLa || r.prelungitLa) throw new Error("Nu există o propunere de prelungire.");
  await tx.update(ceasuri).set({ prelungirePropusaLa: null, prelungirePropusaDe: null, prelungireMotiv: null, actualizatLa: new Date() }).where(eq(ceasuri.id, r.id));
  await tx.insert(jurnal).values({ utilizatorId: a.utilizatorId, actiune: "nu a aprobat prelungirea termenului", entitate: "document", entitateId: r.documentId, detalii: { motivPropus: r.prelungireMotiv } });
  return r.documentId;
}

/**
 * Prelungește un ceas, după regula lui: hotărârea conducătorului, la data `la`. Termenul nou trece și
 * pe document, dacă e ceasul răspunsului. Motivul vine din propunerea compartimentului, dacă există.
 */
export async function prelungesteCeasul(tx: Tranzactie, a: { ceasId: string; la: string; motiv: string | null; instiintare: string | null; utilizatorId: string }) {
  const [r] = await tx.select().from(ceasuri).where(eq(ceasuri.id, a.ceasId)).for("update");
  if (!r) throw new Error("Ceasul nu există.");
  const motiv = a.motiv || r.prelungireMotiv;
  if (!motiv) throw new Error("Scrieți motivul prelungirii.");
  const nou = prelungeste(caCeas(r), a.la);
  await tx.update(ceasuri).set({ termen: nou.termen, prelungitLa: a.la, prelungitDe: a.utilizatorId, prelungireMotiv: motiv, instiintare: a.instiintare, actualizatLa: new Date() }).where(eq(ceasuri.id, r.id));
  const [doc] = await tx.select({ termenCheie: documente.termenCheie }).from(documente).where(eq(documente.id, r.documentId));
  if (doc?.termenCheie === r.regula) await tx.update(documente).set({ termen: nou.termen, actualizatLa: new Date() }).where(eq(documente.id, r.documentId));
  await tx.insert(jurnal).values({
    utilizatorId: a.utilizatorId, actiune: "a hotărât prelungirea termenului", entitate: "document", entitateId: r.documentId,
    detalii: { regula: r.regula, din: r.termen, pana: nou.termen, la: a.la, motiv, instiintare: a.instiintare },
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
