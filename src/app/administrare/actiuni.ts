"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { compartimente, jurnal, rolPermisiuni, roluri, utilizatori, utilizatorRoluri } from "@/baza/schema";
import { estePermisiune } from "@/domeniu/permisiuni";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const text = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
const uuidSauNull = (v: string) => (UUID.test(v) ? v : null);

function baza() {
  const b = db();
  if (!b) throw new Error("Baza de date nu e configurată.");
  return b;
}

/** Verifică că rolul și compartimentul aparțin entității utilizatorului curent. */
async function verificaEntitatea(entitateId: string, rolId: string | null, compartimentId: string | null) {
  const b = baza();
  if (rolId) {
    const [r] = await b.select({ id: roluri.id }).from(roluri).where(and(eq(roluri.id, rolId), eq(roluri.entitateId, entitateId)));
    if (!r) throw new Error("Rolul nu aparține entității.");
  }
  if (compartimentId) {
    const [c] = await b.select({ id: compartimente.id }).from(compartimente).where(and(eq(compartimente.id, compartimentId), eq(compartimente.entitateId, entitateId)));
    if (!c) throw new Error("Compartimentul nu aparține entității.");
  }
}

export async function adaugaUtilizator(f: FormData) {
  const u = await cere("administrare.utilizatori");
  const numeAfisat = text(f, "nume");
  const email = text(f, "email").toLowerCase();
  const functie = text(f, "functie") || null;
  const rolId = uuidSauNull(text(f, "rol"));
  const compartimentId = uuidSauNull(text(f, "compartiment"));
  if (!numeAfisat || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Numele și adresa de e-mail sunt obligatorii.");
  await verificaEntitatea(u.entitateId, rolId, compartimentId);
  const b = baza();
  const [nou] = await b
    .insert(utilizatori)
    .values({ entitateId: u.entitateId, numeAfisat, email, functie, compartimentId, contLocal: false })
    .returning({ id: utilizatori.id });
  if (rolId) await b.insert(utilizatorRoluri).values({ utilizatorId: nou!.id, rolId, compartimentId, acordatDe: u.id });
  await b.insert(jurnal).values({ utilizatorId: u.id, actiune: "a creat utilizatorul", entitate: "utilizator", entitateId: nou!.id, detalii: { email, rolId, compartimentId } });
  revalidatePath("/administrare/utilizatori");
}

export async function schimbaActiv(f: FormData) {
  const u = await cere("administrare.utilizatori");
  const id = uuidSauNull(text(f, "id"));
  if (!id || id === u.id) throw new Error("Nu vă puteți opri propriul cont.");
  const activ = text(f, "activ") === "da";
  const b = baza();
  await b.update(utilizatori).set({ activ }).where(and(eq(utilizatori.id, id), eq(utilizatori.entitateId, u.entitateId)));
  await b.insert(jurnal).values({ utilizatorId: u.id, actiune: activ ? "a pornit contul" : "a oprit contul", entitate: "utilizator", entitateId: id });
  revalidatePath("/administrare/utilizatori");
}

export async function acordaRol(f: FormData) {
  const u = await cere("administrare.utilizatori");
  const utilizatorId = uuidSauNull(text(f, "utilizator"));
  const rolId = uuidSauNull(text(f, "rol"));
  const compartimentId = uuidSauNull(text(f, "compartiment"));
  if (!utilizatorId || !rolId) throw new Error("Alegeți utilizatorul și rolul.");
  if (utilizatorId === u.id) throw new Error("Nu vă puteți schimba singur rolurile.");
  await verificaEntitatea(u.entitateId, rolId, compartimentId);
  const b = baza();
  const [tinta] = await b.select({ id: utilizatori.id }).from(utilizatori).where(and(eq(utilizatori.id, utilizatorId), eq(utilizatori.entitateId, u.entitateId)));
  if (!tinta) throw new Error("Utilizatorul nu aparține entității.");
  await b.insert(utilizatorRoluri).values({ utilizatorId, rolId, compartimentId, acordatDe: u.id }).onConflictDoNothing();
  await b.insert(jurnal).values({ utilizatorId: u.id, actiune: "a acordat un rol", entitate: "utilizator", entitateId: utilizatorId, detalii: { rolId, compartimentId } });
  revalidatePath("/administrare/utilizatori");
}

export async function retrageRol(f: FormData) {
  const u = await cere("administrare.utilizatori");
  const acordareId = uuidSauNull(text(f, "acordare"));
  if (!acordareId) return;
  const b = baza();
  const [a] = await b
    .select({ id: utilizatorRoluri.id, utilizatorId: utilizatorRoluri.utilizatorId, entitateId: utilizatori.entitateId })
    .from(utilizatorRoluri)
    .innerJoin(utilizatori, eq(utilizatori.id, utilizatorRoluri.utilizatorId))
    .where(eq(utilizatorRoluri.id, acordareId));
  if (!a || a.entitateId !== u.entitateId) throw new Error("Acordarea nu aparține entității.");
  if (a.utilizatorId === u.id) throw new Error("Nu vă puteți schimba singur rolurile.");
  await b.delete(utilizatorRoluri).where(eq(utilizatorRoluri.id, acordareId));
  await b.insert(jurnal).values({ utilizatorId: u.id, actiune: "a retras un rol", entitate: "utilizator", entitateId: a.utilizatorId, detalii: { acordareId } });
  revalidatePath("/administrare/utilizatori");
}

export async function salveazaDrepturi(f: FormData) {
  const u = await cere("administrare.roluri");
  const rolId = uuidSauNull(text(f, "rol"));
  if (!rolId) throw new Error("Rol lipsă.");
  await verificaEntitatea(u.entitateId, rolId, null);
  const alese = f.getAll("permisiune").map(String).filter(estePermisiune);
  const b = baza();
  await b.transaction(async (tx) => {
    await tx.delete(rolPermisiuni).where(eq(rolPermisiuni.rolId, rolId));
    if (alese.length) await tx.insert(rolPermisiuni).values(alese.map((permisiune) => ({ rolId, permisiune })));
    await tx.insert(jurnal).values({ utilizatorId: u.id, actiune: "a schimbat drepturile rolului", entitate: "rol", entitateId: rolId, detalii: { permisiuni: alese } });
  });
  revalidatePath("/administrare/roluri");
}

export async function adaugaRol(f: FormData) {
  const u = await cere("administrare.roluri");
  const nume = text(f, "nume", 80);
  const descriere = text(f, "descriere", 300) || null;
  if (!nume) throw new Error("Numele rolului e obligatoriu.");
  const cheie = nume.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const b = baza();
  const [r] = await b.insert(roluri).values({ entitateId: u.entitateId, cheie, nume, descriere }).returning({ id: roluri.id });
  await b.insert(jurnal).values({ utilizatorId: u.id, actiune: "a creat rolul", entitate: "rol", entitateId: r!.id, detalii: { nume } });
  revalidatePath("/administrare/roluri");
}
