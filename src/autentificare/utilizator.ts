import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/baza/db";
import { compartimente, entitati, rolPermisiuni, roluri, utilizatori, utilizatorRoluri } from "@/baza/schema";
import { areDreptul, type Acordare, type Permisiune } from "@/domeniu/permisiuni";
import { utilizatorulDinSesiune } from "./sesiune";

export type UtilizatorCurent = {
  id: string;
  numeAfisat: string;
  functie: string | null;
  entitateId: string;
  entitateNume: string;
  roluri: { nume: string; compartiment: string | null }[];
  acordari: Acordare[];
  poate: (p: Permisiune, compartimentId?: string | null) => boolean;
};

/** Utilizatorul curent, încărcat o dată pe cerere. Drepturile se citesc din bază la fiecare cerere. */
export const utilizatorulCurent = cache(async (): Promise<UtilizatorCurent | null> => {
  const baza = db();
  const id = await utilizatorulDinSesiune();
  if (!baza || !id) return null;
  const [u] = await baza
    .select({ id: utilizatori.id, numeAfisat: utilizatori.numeAfisat, functie: utilizatori.functie, activ: utilizatori.activ, entitateId: utilizatori.entitateId, entitateNume: entitati.nume })
    .from(utilizatori)
    .innerJoin(entitati, eq(entitati.id, utilizatori.entitateId))
    .where(eq(utilizatori.id, id));
  if (!u || !u.activ || !u.entitateId) return null;

  const randuri = await baza
    .select({ rolId: roluri.id, rolNume: roluri.nume, compartimentId: utilizatorRoluri.compartimentId, compartimentNume: compartimente.nume, permisiune: rolPermisiuni.permisiune })
    .from(utilizatorRoluri)
    .innerJoin(roluri, and(eq(roluri.id, utilizatorRoluri.rolId), eq(roluri.entitateId, u.entitateId)))
    .leftJoin(rolPermisiuni, eq(rolPermisiuni.rolId, roluri.id))
    .leftJoin(compartimente, eq(compartimente.id, utilizatorRoluri.compartimentId))
    .where(eq(utilizatorRoluri.utilizatorId, u.id));

  const pe = new Map<string, { nume: string; compartiment: string | null; acordare: Acordare & { permisiuni: string[] } }>();
  for (const r of randuri) {
    const cheie = `${r.rolId}:${r.compartimentId ?? ""}`;
    if (!pe.has(cheie)) pe.set(cheie, { nume: r.rolNume, compartiment: r.compartimentNume, acordare: { permisiuni: [], compartimentId: r.compartimentId } });
    if (r.permisiune) pe.get(cheie)!.acordare.permisiuni.push(r.permisiune);
  }
  const acordari = [...pe.values()].map((x) => x.acordare);
  return {
    id: u.id,
    numeAfisat: u.numeAfisat,
    functie: u.functie,
    entitateId: u.entitateId,
    entitateNume: u.entitateNume,
    roluri: [...pe.values()].map((x) => ({ nume: x.nume, compartiment: x.compartiment })),
    acordari,
    poate: (p, c) => areDreptul(acordari, p, c),
  };
});

/** Pentru pagini: cere un utilizator autentificat și, opțional, un drept. */
export async function cere(permisiune?: Permisiune): Promise<UtilizatorCurent> {
  const u = await utilizatorulCurent();
  if (!u) redirect("/");
  if (permisiune && !u.poate(permisiune)) redirect("/fara-drept");
  return u;
}
