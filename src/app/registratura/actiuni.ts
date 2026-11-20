"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { cere, type UtilizatorCurent } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { compartimente, documente, importuri, jurnal } from "@/baza/schema";
import { aplicaImportul } from "@/baza/registratura";
import { citesteExportul, citesteData, citesteNumar } from "@/domeniu/import-registru";
import { poateTrece } from "@/domeniu/drumul-actului";
import { aziInRomania, esteModExpediere, PASI, pasiiPosibili, type Pas } from "@/domeniu/registratura";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const text = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

function baza() {
  const b = db();
  if (!b) throw new Error("Baza de date nu e configurată.");
  return b;
}

function poateFacePasul(u: UtilizatorCurent, pas: Pas, compartimentId: string | null) {
  const p = PASI[pas];
  return p.drept.some((d) => u.poate(d, p.peCompartiment ? compartimentId : undefined));
}

/** Un pas pe drumul actului, scris de birou sau de registratură. */
export async function facePasul(f: FormData) {
  const u = await cere();
  const id = text(f, "id");
  const pas = text(f, "pas") as Pas;
  if (!UUID.test(id) || !(pas in PASI) || pas === "iesire") throw new Error("Cerere greșită.");
  const compartimentNou = text(f, "compartiment");
  await inEntitate(baza(), u.entitateId, async (tx) => {
    const [d] = await tx.select({ stare: documente.stare, compartimentId: documente.compartimentId }).from(documente).where(eq(documente.id, id)).for("update");
    if (!d) throw new Error("Documentul nu există.");
    if (!poateFacePasul(u, pas, d.compartimentId)) throw new Error("Nu aveți dreptul pentru acest pas.");
    const spre = PASI[pas].spre;
    if (!pasiiPosibili(d.stare).includes(pas)) throw new Error("Pasul nu e posibil din starea de acum.");
    const schimbari: Partial<typeof documente.$inferInsert> = { stare: spre, actualizatLa: new Date() };
    const detalii: Record<string, string> = { din: d.stare, spre };
    if (pas === "repartizeaza") {
      if (!UUID.test(compartimentNou)) throw new Error("Alegeți compartimentul.");
      const [c] = await tx.select({ id: compartimente.id, nume: compartimente.nume }).from(compartimente).where(and(eq(compartimente.id, compartimentNou), eq(compartimente.entitateId, u.entitateId)));
      if (!c) throw new Error("Compartimentul nu aparține entității.");
      schimbari.compartimentId = c.id;
      schimbari.compartimentText = null;
      detalii.compartiment = c.nume;
    }
    if (pas === "claseaza") {
      const motiv = text(f, "motiv", 300);
      if (!motiv) throw new Error("Scrieți motivul clasării.");
      detalii.motiv = motiv;
    }
    await tx.update(documente).set(schimbari).where(eq(documente.id, id));
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: PASI[pas].facut, entitate: "document", entitateId: id, detalii });
  });
  revalidatePath(`/registratura/${id}`);
  revalidatePath("/registratura");
}

/**
 * Ieșirea: răspunsul a plecat. Numărul de ieșire e cel dat de registrul oficial (număr nou, legat de
 * intrare). Se scriu data, cum a plecat și destinatarul; intrarea trece la „emis”.
 */
export async function inregistreazaIesirea(f: FormData) {
  const u = await cere();
  const id = text(f, "id");
  const numar = citesteNumar(text(f, "numar", 20));
  const data = citesteData(text(f, "data", 20));
  const mod = text(f, "mod", 20);
  const destinatar = text(f, "destinatar") || null;
  if (!UUID.test(id) || numar === null || !data || !esteModExpediere(mod)) throw new Error("Completați numărul de ieșire, data și cum a plecat.");
  await inEntitate(baza(), u.entitateId, async (tx) => {
    const [d] = await tx.select().from(documente).where(eq(documente.id, id)).for("update");
    if (!d) throw new Error("Documentul nu există.");
    if (!poateFacePasul(u, "iesire", d.compartimentId)) throw new Error("Nu aveți dreptul pentru acest pas.");
    if (!poateTrece(d.stare, "emis")) throw new Error("Răspunsul trebuie să fie întâi la semnat.");
    const an = Number(data.slice(0, 4));
    const [ocupat] = await tx.select({ id: documente.id }).from(documente).where(and(eq(documente.an, an), eq(documente.numar, numar)));
    if (ocupat) throw new Error(`Numărul ${numar}/${an} există deja în registru.`);
    const [iesire] = await tx
      .insert(documente)
      .values({
        entitateId: u.entitateId, an, numar, dataInregistrare: new Date(`${data}T12:00:00Z`), directie: "iesire", sursa: "petru",
        tip: `Răspuns la nr. ${d.numar}/${d.an}`, continut: `Răspuns la: ${d.continut}`.slice(0, 2000),
        compartimentId: d.compartimentId, raspunsLaId: d.id, destinatarText: destinatar ?? d.emitentText,
        modExpediere: mod, expediatLa: data, stare: "emis",
      })
      .returning({ id: documente.id });
    await tx.update(documente).set({ stare: "emis", actualizatLa: new Date() }).where(eq(documente.id, d.id));
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: "a înregistrat ieșirea", entitate: "document", entitateId: d.id, detalii: { iesire: `${numar}/${an}`, mod } });
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: "ieșire înregistrată", entitate: "document", entitateId: iesire!.id, detalii: { laNumar: `${d.numar}/${d.an}` } });
  });
  revalidatePath(`/registratura/${id}`);
  revalidatePath("/registratura");
}

/** Confirmarea de primire a unei ieșiri (confirmarea poștei, a e-mailului sau semnătura la ghișeu). */
export async function confirmaPrimirea(f: FormData) {
  const u = await cere();
  const id = text(f, "iesire");
  const inapoi = text(f, "inapoi");
  const data = citesteData(text(f, "data", 20)) ?? aziInRomania();
  if (!UUID.test(id)) throw new Error("Cerere greșită.");
  await inEntitate(baza(), u.entitateId, async (tx) => {
    const [d] = await tx.select({ directie: documente.directie, compartimentId: documente.compartimentId }).from(documente).where(eq(documente.id, id));
    if (!d || d.directie !== "iesire") throw new Error("Ieșirea nu există.");
    if (!poateFacePasul(u, "iesire", d.compartimentId)) throw new Error("Nu aveți dreptul pentru acest pas.");
    await tx.update(documente).set({ confirmatLa: data, actualizatLa: new Date() }).where(eq(documente.id, id));
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: "a scris confirmarea de primire", entitate: "document", entitateId: id, detalii: { data } });
  });
  if (UUID.test(inapoi)) revalidatePath(`/registratura/${inapoi}`);
  revalidatePath("/registratura");
}

export type StareVerificare = { eroare?: string } | undefined;

const MAX_OCTETI = 10 * 1024 * 1024;

/** Pasul 1 al importului: citește fișierul, îl verifică și îl păstrează ca „verificat”. Nu schimbă registrul. */
export async function verificaImportul(_: StareVerificare, f: FormData): Promise<StareVerificare> {
  const u = await cere("documente.inregistreaza");
  const fisier = f.get("fisier");
  if (!(fisier instanceof File) || fisier.size === 0) return { eroare: "Alegeți fișierul CSV exportat din registru." };
  if (fisier.size > MAX_OCTETI) return { eroare: "Fișierul e prea mare (peste 10 MB). Exportați pe perioade mai scurte." };
  const octeti = Buffer.from(await fisier.arrayBuffer());
  let continut: string;
  try {
    continut = new TextDecoder("utf-8", { fatal: true }).decode(octeti);
  } catch {
    // Exporturile vechi pot fi în Windows-1250 (codificarea obișnuită pentru română în Windows).
    continut = new TextDecoder("windows-1250").decode(octeti);
  }
  const rezultat = citesteExportul(continut);
  if (rezultat.potrivire.lipsa.length) {
    return { eroare: `Nu găsesc coloanele obligatorii: ${rezultat.potrivire.lipsa.join(", ")}. Coloanele din fișier: ${rezultat.potrivire.ignorate.join(", ") || "niciuna"}.` };
  }
  const amprenta = createHash("sha256").update(octeti).digest("hex");
  const id = await inEntitate(baza(), u.entitateId, async (tx) => {
    const [i] = await tx
      .insert(importuri)
      .values({ entitateId: u.entitateId, utilizatorId: u.id, numeFisier: fisier.name.slice(0, 200), amprenta, potrivire: rezultat.potrivire, randuri: rezultat.randuri, erori: rezultat.erori })
      .returning({ id: importuri.id });
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: "a verificat un export al registrului", entitate: "import", entitateId: i!.id, detalii: { randuri: rezultat.randuri.length, erori: rezultat.erori.length } });
    return i!.id;
  });
  redirect(`/registratura/import/${id}`);
}

/** Pasul 2 al importului: aplică ce s-a verificat. */
export async function aplicaImportulVerificat(f: FormData) {
  const u = await cere("documente.inregistreaza");
  const id = text(f, "id");
  if (!UUID.test(id)) throw new Error("Cerere greșită.");
  await inEntitate(baza(), u.entitateId, (tx) => aplicaImportul(tx, id, u.entitateId, u.id));
  revalidatePath("/registratura");
  revalidatePath(`/registratura/import/${id}`);
}

export async function renuntaLaImport(f: FormData) {
  const u = await cere("documente.inregistreaza");
  const id = text(f, "id");
  if (!UUID.test(id)) throw new Error("Cerere greșită.");
  await inEntitate(baza(), u.entitateId, async (tx) => {
    await tx.update(importuri).set({ stare: "renuntat" }).where(and(eq(importuri.id, id), eq(importuri.stare, "verificat")));
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: "a renunțat la import", entitate: "import", entitateId: id });
  });
  redirect("/registratura/import");
}
