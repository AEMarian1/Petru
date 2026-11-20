"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { cere, type UtilizatorCurent } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate, type Tranzactie } from "@/baza/entitate";
import { documente } from "@/baza/schema";
import { inchideCererea, marcheazaPlangerea, primesteReclamatia, solutiaReclamatiei, stabilesteFelul } from "@/baza/cereri";
import { citesteData, citesteNumar } from "@/domeniu/import-registru";
import { esteFelCerere, esteInchidere, esteTipSolicitant, type Inchidere } from "@/domeniu/cereri";
import { aziInRomania, esteModExpediere } from "@/domeniu/registratura";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const text = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

function baza() {
  const b = db();
  if (!b) throw new Error("Baza de date nu e configurată.");
  return b;
}

function reimprospateaza(id: string) {
  revalidatePath(`/registratura/${id}`);
  revalidatePath("/registratura");
  revalidatePath("/cereri");
}

/** Data din formular: obligatorie, nu în viitor. */
function dataDin(f: FormData, k = "data"): string {
  const d = citesteData(text(f, k, 20));
  if (!d) throw new Error("Completați data.");
  if (d > aziInRomania()) throw new Error("Data nu poate fi în viitor.");
  return d;
}

async function compartimentul(tx: Tranzactie, id: string) {
  const [d] = await tx.select({ compartimentId: documente.compartimentId }).from(documente).where(eq(documente.id, id));
  if (!d) throw new Error("Documentul nu există.");
  return d.compartimentId;
}

/** Cine poate închide o cerere fără răspuns în fond. Redirecționarea o poate face și registratura. */
function poateInchide(u: UtilizatorCurent, inchidere: Inchidere, compartimentId: string | null) {
  if (u.poate("cereri.gestioneaza") || u.poate("documente.rezolva", compartimentId)) return true;
  return inchidere === "redirectionata" && u.poate("documente.inregistreaza");
}

/**
 * Felul documentului: petiție, cerere 544 sau niciuna. Îl stabilește compartimentul care lucrează
 * documentul (fiecare compartiment își ține petițiile), registratura sau responsabilul cu cererile.
 */
export async function stabilesteFelulCererii(f: FormData) {
  const u = await cere();
  const id = text(f, "id");
  const fel = text(f, "fel", 30);
  const solicitant = text(f, "solicitant", 30) || "nespecificat";
  if (!UUID.test(id) || (fel !== "niciuna" && !esteFelCerere(fel)) || !esteTipSolicitant(solicitant)) throw new Error("Cerere greșită.");
  await inEntitate(baza(), u.entitateId, async (tx) => {
    const compartimentId = await compartimentul(tx, id);
    if (!u.poate("cereri.gestioneaza") && !u.poate("documente.inregistreaza") && !u.poate("documente.rezolva", compartimentId)) throw new Error("Nu aveți dreptul să stabiliți felul cererii.");
    await stabilesteFelul(tx, { entitateId: u.entitateId, utilizatorId: u.id, documentId: id, fel: fel === "niciuna" ? null : fel, solicitant });
  });
  reimprospateaza(id);
}

/** Redirecționarea, clasarea sau conexarea. */
export async function inchideCerereaFaraRaspuns(f: FormData) {
  const u = await cere();
  const id = text(f, "id");
  const inchidere = text(f, "inchidere", 30);
  if (!UUID.test(id) || !esteInchidere(inchidere)) throw new Error("Cerere greșită.");
  const la = dataDin(f);
  const motiv = text(f, "motiv", 300);
  const catre = text(f, "catre", 200) || undefined;
  const numarIesire = citesteNumar(text(f, "numar", 20));
  const mod = text(f, "mod", 20);
  const conexNr = citesteNumar(text(f, "conexat_numar", 20));
  const conexAn = citesteNumar(text(f, "conexat_an", 4));
  if (inchidere === "clasata" && !motiv) throw new Error("Scrieți motivul clasării.");
  if (inchidere === "conexata" && (conexNr === null || conexAn === null)) throw new Error("Scrieți numărul și anul cererii de bază.");
  await inEntitate(baza(), u.entitateId, async (tx) => {
    if (!poateInchide(u, inchidere, await compartimentul(tx, id))) throw new Error("Nu aveți dreptul pentru acest pas.");
    await inchideCererea(tx, {
      entitateId: u.entitateId, utilizatorId: u.id, documentId: id, inchidere, la, motiv, catre,
      iesire: numarIesire !== null && esteModExpediere(mod) ? { numar: numarIesire, mod } : null,
      conexatLa: conexNr !== null && conexAn !== null ? { numar: conexNr, an: conexAn } : undefined,
    });
  });
  reimprospateaza(id);
}

export async function scrieReclamatia(f: FormData) {
  const u = await cere("cereri.gestioneaza");
  const id = text(f, "id");
  if (!UUID.test(id)) throw new Error("Cerere greșită.");
  const la = dataDin(f);
  await inEntitate(baza(), u.entitateId, (tx) => primesteReclamatia(tx, { entitateId: u.entitateId, utilizatorId: u.id, documentId: id, la, numar: text(f, "numar", 40) || null }));
  reimprospateaza(id);
}

export async function scrieSolutiaReclamatiei(f: FormData) {
  const u = await cere("cereri.gestioneaza");
  const id = text(f, "id");
  const solutie = text(f, "solutie", 20);
  if (!UUID.test(id) || (solutie !== "admisa" && solutie !== "respinsa")) throw new Error("Cerere greșită.");
  const la = dataDin(f);
  await inEntitate(baza(), u.entitateId, (tx) => solutiaReclamatiei(tx, { utilizatorId: u.id, documentId: id, solutie, la, plangere: f.get("plangere") === "da" }));
  reimprospateaza(id);
}

export async function noteazaPlangerea(f: FormData) {
  const u = await cere("cereri.gestioneaza");
  const id = text(f, "id");
  if (!UUID.test(id)) throw new Error("Cerere greșită.");
  await inEntitate(baza(), u.entitateId, (tx) => marcheazaPlangerea(tx, { utilizatorId: u.id, documentId: id }));
  reimprospateaza(id);
}
