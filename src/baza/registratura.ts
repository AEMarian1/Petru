/**
 * Registratura în bază: lista, fișa, pașii și importul exportului din registrul oficial.
 * Toate funcțiile primesc o tranzacție deschisă cu `inEntitate`, deci văd numai entitatea utilizatorului.
 */
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { compartimente, documente, importuri, jurnal, persoane, utilizatori } from "./schema";
import type { Tranzactie } from "./entitate";
import { gasesteCompartimentul, type EroareRand, type Potrivire, type RandImportat } from "@/domeniu/import-registru";
import { dataLimita, esteRezolvat, recunoasteTermenul, ZILE_AVERTIZARE, type Vedere } from "@/domeniu/registratura";
import { adaugaZile } from "@/domeniu/termene";
import type { Stare } from "@/domeniu/drumul-actului";

export type FiltruTermen = "depasit" | "aproape" | "deschise" | "fara_confirmare" | "toate";

export type Filtre = { cauta?: string; termen?: FiltruTermen; compartimentId?: string; directie?: "intrare" | "iesire" };

/** Condiția de vizibilitate pe compartimente. Entitatea e deja oprită de bază. */
function conditiaVederii(v: Vedere): SQL | undefined {
  if (v.fel === "compartimente" && v.ids !== "toate") return v.ids.length ? inArray(documente.compartimentId, v.ids) : sql`false`;
  if (v.fel === "nimic") return sql`false`;
  return undefined;
}

const DESCHISE: Stare[] = ["inregistrat", "repartizat", "in_lucru", "la_semnat"];

export async function listaRegistrului(tx: Tranzactie, v: Vedere, f: Filtre, azi: string, limita = 200) {
  const conditii: (SQL | undefined)[] = [conditiaVederii(v)];
  if (f.directie) conditii.push(eq(documente.directie, f.directie));
  if (f.compartimentId) conditii.push(eq(documente.compartimentId, f.compartimentId));
  if (f.cauta) {
    const t = f.cauta.trim();
    const nr = /^\d+$/.test(t) ? Number(t) : null;
    const tipar = `%${t.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditii.push(or(nr !== null ? eq(documente.numar, nr) : undefined, ilike(documente.continut, tipar), ilike(documente.emitentText, tipar), ilike(documente.tip, tipar)));
  }
  const limitaAproape = adaugaZile(azi, ZILE_AVERTIZARE, "calendaristice");
  if (f.termen === "depasit") conditii.push(inArray(documente.stare, DESCHISE), sql`${documente.termen} < ${azi}`);
  if (f.termen === "aproape") conditii.push(inArray(documente.stare, DESCHISE), sql`${documente.termen} >= ${azi}`, sql`${documente.termen} <= ${limitaAproape}`);
  if (f.termen === "deschise") conditii.push(inArray(documente.stare, DESCHISE), eq(documente.directie, "intrare"));
  if (f.termen === "fara_confirmare") conditii.push(eq(documente.directie, "iesire"), isNull(documente.confirmatLa));

  return tx
    .select({
      id: documente.id,
      an: documente.an,
      numar: documente.numar,
      data: documente.dataInregistrare,
      directie: documente.directie,
      sursa: documente.sursa,
      tip: documente.tip,
      continut: documente.continut,
      emitent: sql<string | null>`coalesce(${documente.emitentText}, nullif(concat_ws(' ', ${persoane.nume}, ${persoane.prenume}), ''))`,
      destinatar: documente.destinatarText,
      compartiment: sql<string | null>`coalesce(${compartimente.nume}, ${documente.compartimentText})`,
      stare: documente.stare,
      termen: documente.termen,
      confirmatLa: documente.confirmatLa,
      raspunsNumar: sql<number | null>`(select r.numar from petru.documente r where r.raspuns_la_id = ${documente.id} order by r.data_inregistrare desc limit 1)`,
    })
    .from(documente)
    .leftJoin(compartimente, eq(compartimente.id, documente.compartimentId))
    .leftJoin(persoane, eq(persoane.id, documente.emitentId))
    .where(and(...conditii))
    .orderBy(desc(documente.an), desc(documente.numar))
    .limit(limita);
}

/** Cifrele pentru panou și pentru capul registrului, pe aceeași vedere. */
export async function cifrele(tx: Tranzactie, v: Vedere, azi: string) {
  const limitaAproape = adaugaZile(azi, ZILE_AVERTIZARE, "calendaristice");
  const deschis = sql`${documente.stare} in ('inregistrat','repartizat','in_lucru','la_semnat') and ${documente.directie} = 'intrare'`;
  const [r] = await tx
    .select({
      deschise: sql<number>`count(*) filter (where ${deschis})::int`,
      depasite: sql<number>`count(*) filter (where ${deschis} and ${documente.termen} < ${azi})::int`,
      aproape: sql<number>`count(*) filter (where ${deschis} and ${documente.termen} between ${azi} and ${limitaAproape})::int`,
      faraConfirmare: sql<number>`count(*) filter (where ${documente.directie} = 'iesire' and ${documente.confirmatLa} is null)::int`,
      faraCompartiment: sql<number>`count(*) filter (where ${documente.compartimentId} is null and ${documente.directie} = 'intrare' and ${documente.stare} = 'inregistrat')::int`,
    })
    .from(documente)
    .where(conditiaVederii(v));
  return r ?? { deschise: 0, depasite: 0, aproape: 0, faraConfirmare: 0, faraCompartiment: 0 };
}

/** Fișa unui document, cu răspunsurile (ieșirile legate) și documentul la care răspunde. */
export async function fisaDocumentului(tx: Tranzactie, id: string, v: Vedere) {
  const [doc]: (typeof documente.$inferSelect)[] = await tx.select().from(documente).where(and(eq(documente.id, id), conditiaVederii(v) ?? sql`true`));
  if (!doc) return null;
  const [c] = doc.compartimentId ? await tx.select({ nume: compartimente.nume }).from(compartimente).where(eq(compartimente.id, doc.compartimentId)) : [];
  const [p] = doc.emitentId ? await tx.select({ nume: persoane.nume, prenume: persoane.prenume }).from(persoane).where(eq(persoane.id, doc.emitentId)) : [];
  const [la] = doc.raspunsLaId ? await tx.select({ numar: documente.numar, an: documente.an }).from(documente).where(eq(documente.id, doc.raspunsLaId)) : [];
  const iesiri = await tx
    .select({ id: documente.id, numar: documente.numar, an: documente.an, data: documente.dataInregistrare, destinatar: documente.destinatarText, modExpediere: documente.modExpediere, expediatLa: documente.expediatLa, confirmatLa: documente.confirmatLa })
    .from(documente)
    .where(eq(documente.raspunsLaId, id))
    .orderBy(asc(documente.dataInregistrare));
  const urma = await tx
    .select({ cand: jurnal.cand, actiune: jurnal.actiune, cine: utilizatori.numeAfisat })
    .from(jurnal)
    .leftJoin(utilizatori, eq(utilizatori.id, jurnal.utilizatorId))
    .where(and(eq(jurnal.entitate, "document"), eq(jurnal.entitateId, id)))
    .orderBy(asc(jurnal.cand));
  return {
    doc,
    compartiment: c?.nume ?? null,
    emitentPersoana: p ? [p.nume, p.prenume].filter(Boolean).join(" ") : null,
    laNumar: la?.numar ?? null,
    laAn: la?.an ?? null,
    iesiri,
    urma,
  };
}

/** Datele unui import verificat, pentru ecranul de confirmare. */
export async function importul(tx: Tranzactie, id: string) {
  const [i] = await tx.select().from(importuri).where(eq(importuri.id, id));
  if (!i) return null;
  return { ...i, potrivire: i.potrivire as Potrivire, randuri: i.randuri as RandImportat[], erori: i.erori as EroareRand[] };
}

export async function ultimeleImporturi(tx: Tranzactie) {
  return tx
    .select({ id: importuri.id, numeFisier: importuri.numeFisier, stare: importuri.stare, noi: importuri.noi, actualizate: importuri.actualizate, creatLa: importuri.creatLa, aplicatLa: importuri.aplicatLa })
    .from(importuri)
    .orderBy(desc(importuri.creatLa))
    .limit(10);
}

const laAmiaza = (zi: string) => new Date(`${zi}T12:00:00Z`);

/**
 * Aplică un import verificat. Registrul oficial dă datele de înregistrare (număr, dată, emitent,
 * conținut, compartiment); Petru păstrează urmărirea (starea, expedierea, confirmarea).
 * Ieșirile cu „răspuns la nr.” se leagă de intrare, iar intrarea trece la „emis”.
 */
export async function aplicaImportul(tx: Tranzactie, importId: string, entitateId: string, utilizatorId: string) {
  const [i] = await tx
    .update(importuri)
    .set({ stare: "aplicat", aplicatLa: new Date() })
    .where(and(eq(importuri.id, importId), eq(importuri.stare, "verificat")))
    .returning();
  if (!i) throw new Error("Importul nu există sau a fost deja aplicat.");
  const randuri = i.randuri as RandImportat[];
  const comp = await tx.select({ id: compartimente.id, nume: compartimente.nume, cheie: compartimente.cheie }).from(compartimente).where(eq(compartimente.entitateId, entitateId));

  let noi = 0;
  let actualizate = 0;
  const idDupaCheie = new Map<string, string>();
  for (const r of randuri) {
    const c = gasesteCompartimentul(r.compartiment, comp);
    const [existent] = await tx
      .select({ id: documente.id, stare: documente.stare, termenCheie: documente.termenCheie })
      .from(documente)
      .where(and(eq(documente.an, r.an), eq(documente.numar, r.numar)));
    const intrare = r.directie !== "iesire";
    const termenAles = intrare ? (r.termen ? null : recunoasteTermenul(r.tip, r.continut)) : null;
    const termen = intrare ? (r.termen ?? dataLimita(r.data, termenAles!.termen)) : null;
    const comune = {
      dataInregistrare: laAmiaza(r.data),
      directie: r.directie,
      tip: r.tip ?? (intrare ? "Document intrat" : "Document ieșit"),
      continut: r.continut,
      emitentText: r.emitent || null,
      destinatarText: r.destinatar,
      compartimentId: c?.id ?? null,
      compartimentText: c ? null : r.compartiment,
      canal: r.canal,
      termen,
      termenCheie: termenAles?.termen.cheie ?? null,
      termenRecunoscut: termenAles ? termenAles.recunoscut : true,
      importId: i.id,
      actualizatLa: new Date(),
    };
    if (existent) {
      const stare: Stare = existent.stare === "inregistrat" && c ? "repartizat" : existent.stare;
      await tx.update(documente).set({ ...comune, stare }).where(eq(documente.id, existent.id));
      idDupaCheie.set(`${r.an}/${r.numar}`, existent.id);
      actualizate++;
    } else {
      const stare: Stare = intrare ? (c ? "repartizat" : "inregistrat") : "emis";
      const [nou] = await tx
        .insert(documente)
        .values({ ...comune, entitateId, an: r.an, numar: r.numar, sursa: "import", stare, expediatLa: intrare ? null : r.data })
        .returning({ id: documente.id });
      idDupaCheie.set(`${r.an}/${r.numar}`, nou!.id);
      noi++;
    }
  }

  // Legăturile ieșire → intrare, după ce toate rândurile sunt în bază.
  let legate = 0;
  for (const r of randuri.filter((x) => x.directie === "iesire" && x.laNumar !== null)) {
    const [intr] = await tx
      .select({ id: documente.id, stare: documente.stare })
      .from(documente)
      .where(and(eq(documente.numar, r.laNumar!), eq(documente.directie, "intrare"), or(eq(documente.an, r.an), eq(documente.an, r.an - 1))))
      .orderBy(desc(documente.an))
      .limit(1);
    if (!intr) continue;
    await tx.update(documente).set({ raspunsLaId: intr.id }).where(eq(documente.id, idDupaCheie.get(`${r.an}/${r.numar}`)!));
    if (!esteRezolvat(intr.stare)) {
      await tx.update(documente).set({ stare: "emis", actualizatLa: new Date() }).where(eq(documente.id, intr.id));
      await tx.insert(jurnal).values({ utilizatorId, actiune: "răspuns legat din import", entitate: "document", entitateId: intr.id, detalii: { iesire: `${r.numar}/${r.an}` } });
    }
    legate++;
  }

  await tx.update(importuri).set({ noi, actualizate }).where(eq(importuri.id, i.id));
  await tx.insert(jurnal).values({ utilizatorId, actiune: "a aplicat importul registrului", entitate: "import", entitateId: i.id, detalii: { noi, actualizate, legate, fisier: i.numeFisier } });
  return { noi, actualizate, legate };
}
