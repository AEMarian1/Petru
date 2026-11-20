"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cere, type UtilizatorCurent } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate, type Tranzactie } from "@/baza/entitate";
import { proiecteHotarare } from "@/baza/schema";
import {
  adaugaPropunerea, analizeazaPropunerea, anuntaProiectul, aprobaPublicarea, comunicaPrefectului, confirmaPrimireaLaPrefect, convoaca, creeazaSedinta,
  initiazaProiectul, marcheazaCopiaAnonimizata, marcheazaPublicarea, puneOrdineaDeZi, scoateComisia, scoateDeOrdineaDeZi, scrieAvizul,
  scrieExceptiaDeUrgenta, scrieMaterialul, scriePrezenta, scriePv, semneazaHotararea, sesizeazaComisiile, voteaza, type Material, type PasPv,
} from "@/baza/consiliu";
import { citesteData, citesteNumar } from "@/domeniu/import-registru";
import { aziInRomania, esteModExpediere } from "@/domeniu/registratura";
import { esteInitiator, esteMajoritate, esteRezultat, esteSensAviz, esteTipSedinta } from "@/domeniu/consiliu";
import type { Permisiune } from "@/domeniu/permisiuni";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const text = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const id = (f: FormData, k = "id") => {
  const v = text(f, k, 40);
  if (!UUID.test(v)) throw new Error("Cerere greșită.");
  return v;
};
const data = (f: FormData, k = "data") => {
  const v = citesteData(text(f, k, 20));
  if (!v) throw new Error("Completați data.");
  if (v > aziInRomania()) throw new Error("Data nu poate fi în viitor.");
  return v;
};

function baza() {
  const b = db();
  if (!b) throw new Error("Baza de date nu e configurată.");
  return b;
}

/** Mesajul pentru om: erorile noastre se arată; cele ale bazei (constrângeri) primesc o explicație scurtă. */
function mesajul(e: unknown): string {
  const cauza = (e as { cause?: { code?: string } })?.cause ?? (e as { code?: string });
  if (cauza?.code === "23505") return "Numărul există deja (în registru sau în registrul hotărârilor).";
  if (cauza?.code) return "Operația nu respectă regulile bazei de date și nu s-a făcut.";
  if (e instanceof Error && !e.message.startsWith("Failed query")) return e.message;
  return "Operația nu s-a putut face.";
}

/**
 * Rulează pasul în entitatea utilizatorului și se întoarce la pagină. Eroarea (de pildă, „Legea 52 nu
 * permite încă votul”) se arată pe pagină, nu ca pagină de eroare; o avertizare la fel.
 */
async function pas(u: UtilizatorCurent, inapoi: string, fn: (tx: Tranzactie) => Promise<string | null | void>) {
  let eroare: string | null = null;
  let atentie: string | null = null;
  try {
    const r = await inEntitate(baza(), u.entitateId, fn);
    if (typeof r === "string") atentie = r;
  } catch (e) {
    eroare = mesajul(e);
  }
  revalidatePath("/consiliu", "layout");
  revalidatePath("/panou");
  revalidatePath("/registratura", "layout");
  if (eroare) redirect(`${inapoi}?eroare=${encodeURIComponent(eroare)}`);
  if (atentie) redirect(`${inapoi}?atentie=${encodeURIComponent(atentie)}`);
  redirect(inapoi);
}

function oricare(u: UtilizatorCurent, ...p: Permisiune[]) {
  if (!p.some((x) => u.poate(x))) throw new Error("Nu aveți dreptul pentru acest pas.");
}

const laProiect = (pid: string) => `/consiliu/proiecte/${pid}`;
const laSedinta = (sid: string) => `/consiliu/sedinte/${sid}`;

// ——— Proiectul ———

export async function initiaza(f: FormData) {
  const u = await cere();
  if (!u.poate("consiliu.initiaza") && !u.poate("consiliu.gestioneaza")) redirect("/fara-drept");
  const numar = citesteNumar(text(f, "numar", 20));
  const titlu = text(f, "titlu", 500);
  const initiator = text(f, "initiator", 20);
  const majoritate = text(f, "majoritate", 20);
  const compartimentId = text(f, "compartiment", 40);
  let nou: string | null = null;
  let eroare: string | null = null;
  try {
    const zi = data(f);
    if (numar === null) throw new Error("Scrieți numărul de înregistrare din registrul oficial.");
    if (titlu.length < 10) throw new Error("Scrieți titlul proiectului.");
    if (!esteInitiator(initiator) || !esteMajoritate(majoritate) || !UUID.test(compartimentId)) throw new Error("Completați inițiatorul, majoritatea și compartimentul de specialitate.");
    const referatLa = f.get("referat") ? zi : null;
    nou = await inEntitate(baza(), u.entitateId, async (tx) => (await initiazaProiectul(tx, {
      entitateId: u.entitateId, utilizatorId: u.id, numarInregistrare: numar, data: zi, titlu, initiator, compartimentId,
      normativ: text(f, "normativ", 5) === "da", majoritate, referatLa,
    })).id);
  } catch (e) {
    eroare = mesajul(e);
  }
  if (eroare || !nou) redirect(`/consiliu/proiecte/nou?eroare=${encodeURIComponent(eroare ?? "Proiectul nu s-a putut înregistra.")}`);
  revalidatePath("/consiliu", "layout");
  redirect(laProiect(nou));
}

/** Compartimentul și proiectul, pentru verificarea dreptului pe compartiment. */
async function compartimentulProiectului(tx: Tranzactie, pid: string) {
  const [p] = await tx.select({ compartimentId: proiecteHotarare.compartimentId }).from(proiecteHotarare).where(eq(proiecteHotarare.id, pid));
  if (!p) throw new Error("Proiectul nu există.");
  return p.compartimentId;
}

export async function scrieMaterial(f: FormData) {
  const u = await cere();
  const pid = id(f);
  await pas(u, laProiect(pid), async (tx) => {
    const fel = text(f, "fel", 20) as Material;
    if (fel === "referat") oricare(u, "consiliu.initiaza", "consiliu.gestioneaza");
    else if (fel === "raport") {
      const c = await compartimentulProiectului(tx, pid);
      if (!u.poate("consiliu.gestioneaza") && !u.poate("documente.rezolva", c)) throw new Error("Raportul îl scrie compartimentul de specialitate.");
    } else if (fel === "aviz_legalitate") oricare(u, "documente.contrasemneaza");
    else throw new Error("Cerere greșită.");
    await scrieMaterialul(tx, { proiectId: pid, fel, la: data(f), utilizatorId: u.id });
  });
}

export async function sesizeaza(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => sesizeazaComisiile(tx, { entitateId: u.entitateId, proiectId: pid, comisieIds: f.getAll("comisie").map(String).filter((x) => UUID.test(x)), la: data(f), utilizatorId: u.id }));
}

export async function scoateSesizarea(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => scoateComisia(tx, { avizId: id(f, "aviz"), utilizatorId: u.id }));
}

export async function aviz(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), async (tx) => {
    const sens = text(f, "sens", 40);
    if (!esteSensAviz(sens)) throw new Error("Alegeți sensul avizului.");
    await scrieAvizul(tx, { avizId: id(f, "aviz"), sens, data: data(f), amendamente: text(f, "amendamente", 1000) || null, utilizatorId: u.id });
  });
}

export async function anunta(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => anuntaProiectul(tx, { entitateId: u.entitateId, proiectId: pid, la: data(f), unde: text(f, "unde", 200) || "pagina de internet și Monitorul Oficial Local", utilizatorId: u.id }));
}

export async function exceptie(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => scrieExceptiaDeUrgenta(tx, { proiectId: pid, motiv: text(f, "motiv", 1000), utilizatorId: u.id }));
}

export async function propunere(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), async (tx) => {
    const rezumat = text(f, "rezumat", 1000);
    if (rezumat.length < 5) throw new Error("Scrieți pe scurt propunerea (fără datele celui care a trimis-o).");
    await adaugaPropunerea(tx, { entitateId: u.entitateId, proiectId: pid, la: data(f), numar: text(f, "numar", 40) || null, rezumat, utilizatorId: u.id });
  });
}

export async function analizeaza(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => analizeazaPropunerea(tx, { propunereId: id(f, "propunere"), preluata: text(f, "preluata", 5) === "da", utilizatorId: u.id }));
}

export async function peOrdineaDeZi(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  const sid = id(f, "sedinta");
  const inapoi = text(f, "inapoi", 20) === "sedinta" ? laSedinta(sid) : laProiect(pid);
  await pas(u, inapoi, (tx) => puneOrdineaDeZi(tx, { proiectId: pid, sedintaId: sid, utilizatorId: u.id }));
}

export async function scoateDePeOrdine(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => scoateDeOrdineaDeZi(tx, { proiectId: pid, utilizatorId: u.id }));
}

export async function vot(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  const sid = id(f, "sedinta");
  await pas(u, laSedinta(sid), async (tx) => {
    const rezultat = text(f, "rezultat", 20);
    const majoritate = text(f, "majoritate", 20);
    if (!esteRezultat(rezultat) || !esteMajoritate(majoritate)) throw new Error("Alegeți rezultatul și majoritatea.");
    const n = (k: string) => {
      const x = citesteNumar(text(f, k, 5));
      return x === null ? Number.NaN : x;
    };
    const v = rezultat === "retras" ? null : { pentru: n("pentru"), contra: n("contra"), abtineri: n("abtineri") };
    const r = await voteaza(tx, { entitateId: u.entitateId, proiectId: pid, rezultat, vot: v, majoritate, utilizatorId: u.id });
    return r.numarHcl ? `Proiectul e aprobat: hotărârea nr. ${r.numarHcl}/${r.anHcl}. Ceasul comunicării la prefect a pornit.` : null;
  });
}

export async function semneaza(f: FormData) {
  const u = await cere();
  const pid = id(f);
  const fel = text(f, "fel", 20);
  await pas(u, laProiect(pid), async (tx) => {
    if (fel === "presedinte") oricare(u, "consiliu.gestioneaza");
    else if (fel === "secretar") oricare(u, "documente.contrasemneaza");
    else throw new Error("Cerere greșită.");
    await semneazaHotararea(tx, { proiectId: pid, fel, la: data(f), utilizatorId: u.id });
  });
}

export async function prefect(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), async (tx) => {
    const numar = citesteNumar(text(f, "numar", 20));
    const mod = text(f, "mod", 20);
    if (numar === null || !esteModExpediere(mod)) throw new Error("Completați numărul de ieșire și cum a plecat.");
    await comunicaPrefectului(tx, { entitateId: u.entitateId, proiectId: pid, numar, data: data(f), mod, utilizatorId: u.id });
  });
}

export async function primitLaPrefect(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const pid = id(f);
  await pas(u, laProiect(pid), (tx) => confirmaPrimireaLaPrefect(tx, { proiectId: pid, la: data(f), utilizatorId: u.id }));
}

export async function poarta(f: FormData) {
  const u = await cere();
  const pid = id(f);
  const fel = text(f, "fel", 20);
  await pas(u, laProiect(pid), async (tx) => {
    const azi = aziInRomania();
    if (fel === "aproba") {
      oricare(u, "publicare.aproba");
      await aprobaPublicarea(tx, { proiectId: pid, azi, utilizatorId: u.id });
    } else if (fel === "copie") {
      oricare(u, "consiliu.gestioneaza", "documente.contrasemneaza");
      await marcheazaCopiaAnonimizata(tx, { proiectId: pid, azi, utilizatorId: u.id });
    } else if (fel === "publicat") {
      oricare(u, "consiliu.gestioneaza");
      await marcheazaPublicarea(tx, { proiectId: pid, la: data(f), unde: text(f, "unde", 200) || "Monitorul Oficial Local", utilizatorId: u.id });
    } else throw new Error("Cerere greșită.");
  });
}

// ——— Ședința ———

export async function sedintaNoua(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const tip = text(f, "tip", 20);
  const zi = citesteData(text(f, "data", 20));
  const inFunctie = citesteNumar(text(f, "consilieri", 5));
  let nou: string | null = null;
  let eroare: string | null = null;
  try {
    if (!zi || !esteTipSedinta(tip) || inFunctie === null) throw new Error("Completați data, tipul ședinței și câți consilieri sunt în funcție.");
    nou = await inEntitate(baza(), u.entitateId, (tx) => creeazaSedinta(tx, { entitateId: u.entitateId, data: zi, tip, consilieriInFunctie: inFunctie, utilizatorId: u.id }));
  } catch (e) {
    eroare = mesajul(e);
  }
  if (eroare || !nou) redirect(`/consiliu?eroare=${encodeURIComponent(eroare ?? "Ședința nu s-a putut crea.")}`);
  revalidatePath("/consiliu", "layout");
  redirect(laSedinta(nou));
}

export async function convocare(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const sid = id(f);
  await pas(u, laSedinta(sid), async (tx) => {
    const conv = text(f, "convocare", 200);
    if (!conv) throw new Error("Scrieți numărul convocatorului sau al dispoziției de convocare.");
    const materiale = text(f, "materiale", 20) ? data(f, "materiale") : null;
    return convoaca(tx, { sedintaId: sid, la: data(f), convocare: conv, materialeLa: materiale, utilizatorId: u.id });
  });
}

export async function prezenta(f: FormData) {
  const u = await cere("consiliu.gestioneaza");
  const sid = id(f);
  await pas(u, laSedinta(sid), async (tx) => {
    const n = citesteNumar(text(f, "prezenti", 5));
    if (n === null) throw new Error("Scrieți câți consilieri sunt prezenți.");
    await scriePrezenta(tx, { sedintaId: sid, prezenti: n, presedinte: text(f, "presedinte", 200) || null, utilizatorId: u.id });
  });
}

export async function procesVerbal(f: FormData) {
  const u = await cere();
  const sid = id(f);
  const p = text(f, "pas", 20) as PasPv;
  await pas(u, laSedinta(sid), async (tx) => {
    if (p === "semnat") oricare(u, "documente.contrasemneaza");
    else if (p === "redactat" || p === "aprobat" || p === "publicat") oricare(u, "consiliu.gestioneaza");
    else throw new Error("Cerere greșită.");
    const aprobatIn = p === "aprobat" ? id(f, "in_sedinta") : null;
    await scriePv(tx, { entitateId: u.entitateId, sedintaId: sid, pas: p, la: p === "aprobat" ? aziInRomania() : data(f), aprobatInSedintaId: aprobatIn, utilizatorId: u.id });
  });
}
