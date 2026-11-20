/**
 * Comenzile bazei de date:
 *   npm run db:migreaza   — aplică migrările (orice mediu, inclusiv producția)
 *   npm run db:refacere   — șterge schema „petru”, aplică migrările și încarcă datele de probă
 *                           (NUMAI în mediile de probă; refuză în producție)
 * Fără DATABASE_URL, comenzile nu fac nimic (de pildă, la previzualizări înainte de pasul S4).
 * Observațiile din „Ce lipsește?” stau în schema „observatii” și nu se șterg niciodată aici.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { adresaBazei, bazaDeDate, creeazaPool } from "../src/baza/conexiune";
import * as s from "../src/baza/schema";
import { persoaneDeProba, TIPURI_DOCUMENTE, aleator } from "../src/baza/date-proba";
import { COMPARTIMENTE } from "../src/date-proba/compartimente";
import { ROLURI_PREDEFINITE } from "../src/domeniu/roluri-predefinite";
import { caSistem } from "../src/baza/entitate";
import { aziInRomania, dataLimita, recunoasteTermenul } from "../src/domeniu/registratura";
import { adaugaZile } from "../src/domeniu/termene";
import { setareaInstitutiei } from "../src/domeniu/mediu";
import { opreste, pornesteCeasul, prelungeste, poatePrelungi, type Ceas } from "../src/domeniu/ceas";
import { felulDupaTermen, type Solutie } from "../src/domeniu/cereri";

const LACAT_REFACERE = 7_202_611;
const MIGRARI = { migrationsFolder: "migrari", migrationsSchema: "petru_migrari", migrationsTable: "migrari" };

type Db = ReturnType<typeof bazaDeDate>;

async function main() {
  const comanda = process.argv[2];
  // Refacerea folosește conexiunea directă, dacă există: lacătul de sesiune nu e sigur printr-un pooler.
  const adresa = process.env.DATABASE_URL_DIRECTA?.trim() || adresaBazei();
  if (!adresa) {
    console.log("DATABASE_URL lipsește: nu fac nimic.");
    return;
  }
  const mediu = process.env.PETRU_MEDIU ?? "local";
  const pool = creeazaPool(adresa);
  const db = bazaDeDate(pool);
  try {
    await pregatesteObservatiile(db);
    if (comanda === "migreaza") {
      await migrate(db, MIGRARI);
      console.log("Migrările sunt aplicate.");
    } else if (comanda === "refacere") {
      if (mediu === "productie") throw new Error("Refacerea bazei e interzisă în producție.");
      // Un singur client pentru lacăt: lacătul de sesiune ține cât ține conexiunea.
      const client = await pool.connect();
      try {
        const prinPooler = /-pooler\./.test(adresa);
        if (prinPooler) console.warn("Conexiune prin pooler: refac fără lacăt (adăugați DATABASE_URL_DIRECTA).");
        else await client.query("SELECT pg_advisory_lock($1)", [LACAT_REFACERE]);
        await client.query("DROP SCHEMA IF EXISTS petru CASCADE");
        await client.query("DROP SCHEMA IF EXISTS petru_migrari CASCADE");
        await migrate(db, MIGRARI);
        await incarcaDateDeProba(db);
      } finally {
        if (!/-pooler\./.test(adresa)) await client.query("SELECT pg_advisory_unlock($1)", [LACAT_REFACERE]);
        client.release();
      }
      console.log(`Baza e refăcută cu date de probă (mediul: ${mediu}).`);
    } else {
      throw new Error("Comanda e „migreaza” sau „refacere”.");
    }
  } finally {
    await pool.end();
  }
}

async function pregatesteObservatiile(db: Db) {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS observatii`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS observatii.observatii (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cand timestamptz NOT NULL DEFAULT now(),
    mediu text NOT NULL,
    pagina text,
    rol text,
    mesaj text NOT NULL
  )`);
}

async function incarcaDateDeProba(db: Db) {
  const institutia = setareaInstitutiei();
  await db.insert(s.institutie).values(institutia);

  // Entitățile: primăria și serviciul de salubrizare (formă juridică distinctă), fiecare cu datele ei.
  const [primaria, salubrizare] = await db
    .insert(s.entitati)
    .values([
      { cheie: "primaria", nume: institutia.nume, tip: "primarie" },
      { cheie: "salubrizare", nume: "Serviciul de salubrizare (probă)", tip: "serviciu_public" },
    ])
    .returning({ id: s.entitati.id });

  const comp = await db
    .insert(s.compartimente)
    .values([
      ...COMPARTIMENTE.map((c) => ({ entitateId: primaria!.id, cheie: c.cheie, nume: c.nume, atributii: c.ce, program: c.program, interior: c.interior })),
      { entitateId: salubrizare!.id, cheie: "salubrizare-colectare", nume: "Colectare și transport", atributii: "Programul de colectare, recipientele, rutele" },
      { entitateId: salubrizare!.id, cheie: "salubrizare-relatii", nume: "Relații cu utilizatorii", atributii: "Cereri, reclamații, recipiente noi" },
    ])
    .returning({ id: s.compartimente.id, cheie: s.compartimente.cheie });
  const compId = new Map(comp.map((c) => [c.cheie, c.id]));

  // Rolurile predefinite, pentru fiecare entitate, după tipul ei.
  const rolId = new Map<string, string>();
  for (const [entitate, tip] of [[primaria!.id, "primarie"], [salubrizare!.id, "serviciu_public"]] as const) {
    for (const r of ROLURI_PREDEFINITE.filter((x) => x.tipuri.includes(tip))) {
      const [rol] = await db
        .insert(s.roluri)
        .values({ entitateId: entitate, cheie: r.cheie, nume: r.nume, descriere: r.descriere, predefinit: true })
        .returning({ id: s.roluri.id });
      await db.insert(s.rolPermisiuni).values(r.permisiuni.map((permisiune) => ({ rolId: rol!.id, permisiune })));
      rolId.set(`${entitate}:${r.cheie}`, rol!.id);
    }
  }

  // Conturile de probă: câte unul pe funcție. Nume de funcții, nu de persoane.
  const conturi: { entitate: string; nume: string; functie: string; roluri: [string, string | null][] }[] = [
    { entitate: primaria!.id, nume: "Primarul în funcție (probă)", functie: "Primar", roluri: [["primar", null]] },
    { entitate: primaria!.id, nume: "Viceprimarul (probă)", functie: "Viceprimar", roluri: [["viceprimar", null]] },
    { entitate: primaria!.id, nume: "Secretarul general (probă)", functie: "Secretar general", roluri: [["secretar", null]] },
    { entitate: primaria!.id, nume: "Registratura (probă)", functie: "Referent", roluri: [["registratura", null]] },
    { entitate: primaria!.id, nume: "Responsabilul cu petițiile și informațiile publice (probă)", functie: "Consilier", roluri: [["responsabil_cereri", null]] },
    { entitate: primaria!.id, nume: "Inspector urbanism (probă)", functie: "Inspector", roluri: [["functionar", "urbanism"]] },
    { entitate: primaria!.id, nume: "Inspector taxe și impozite (probă)", functie: "Inspector", roluri: [["functionar", "taxe"]] },
    { entitate: primaria!.id, nume: "Consilier local (probă)", functie: "Consilier local", roluri: [["consilier", null]] },
    { entitate: primaria!.id, nume: "Administratorul aplicației (probă)", functie: "Administrator", roluri: [["administrator", null]] },
    { entitate: salubrizare!.id, nume: "Operator colectare (probă)", functie: "Operator", roluri: [["functionar", "salubrizare-colectare"]] },
    { entitate: salubrizare!.id, nume: "Administratorul serviciului (probă)", functie: "Administrator", roluri: [["administrator", null]] },
  ];
  const utilizatorId = new Map<string, string>();
  for (const [i, c] of conturi.entries()) {
    const comp0 = c.roluri.find(([, cc]) => cc)?.[1];
    const [nou] = await db
      .insert(s.utilizatori)
      .values({ entitateId: c.entitate, numeAfisat: c.nume, functie: c.functie, email: `proba${i + 1}@exemplu.invalid`, contLocal: true, compartimentId: comp0 ? compId.get(comp0) : null })
      .returning({ id: s.utilizatori.id });
    for (const [rol, cc] of c.roluri) {
      await db.insert(s.utilizatorRoluri).values({ utilizatorId: nou!.id, rolId: rolId.get(`${c.entitate}:${rol}`)!, compartimentId: cc ? compId.get(cc) : null });
    }
    utilizatorId.set(c.nume, nou!.id);
  }
  const registratura = { id: utilizatorId.get("Registratura (probă)")! };

  const pers = await db
    .insert(s.persoane)
    .values(persoaneDeProba(40).map((p) => ({ ...p, esteProba: true })))
    .returning({ id: s.persoane.id });

  await documenteDeProba(db, primaria!.id, salubrizare!.id, compId, pers.map((p) => p.id), registratura.id);
}

/**
 * Registrul de probă: intrări cu date în ultimele două luni, ca să existe termene depășite, apropiate
 * și în termen; câteva ieșiri legate de intrări, unele cu confirmare de primire. Totul e inventat.
 */
/**
 * Ceasul termenului și, la petiții și cereri 544, rândul din registrul lor: câteva prelungite, una
 * redirecționată, una clasată, o reclamație administrativă. Totul e inventat.
 */
async function ceasSiCerere(
  tx: Parameters<Parameters<typeof caSistem>[1]>[0],
  a: { entitateId: string; documentId: string; data: string; cheie: string; recunoscut: boolean; stare: string; opritLa: string | null; juridica: boolean; zar: () => number },
) {
  const azi = aziInRomania();
  let c: Ceas = pornesteCeasul(a.cheie, a.data);
  const fel = felulDupaTermen(a.cheie, a.recunoscut);
  let motivPrelungire: string | null = null;
  const laPrelungire = adaugaZile(a.data, 3, "calendaristice");
  if (fel && a.zar() < 0.3 && laPrelungire <= azi && poatePrelungi(c, laPrelungire).da) {
    c = prelungeste(c, laPrelungire);
    motivPrelungire = fel === "petitie" ? "cere o cercetare la fața locului (probă)" : "informația trebuie adunată din mai multe compartimente (probă)";
  }
  let solutie: Solutie | null = null;
  let motivOprire: string | null = null;
  let catre: string | null = null;
  if (a.opritLa) {
    const zar = a.zar();
    if (a.stare === "arhivat") {
      solutie = fel === "petitie" && zar < 0.5 ? "redirectionata" : "clasata";
      if (solutie === "redirectionata") catre = "Instituția competentă (probă)";
      motivOprire = solutie === "clasata" ? "petiție fără date de identificare (probă)" : "redirecționată (probă)";
    } else {
      solutie = fel === "petitie" ? (zar < 0.7 ? "favorabila" : "nefavorabila") : (zar < 0.6 ? "comunicata" : zar < 0.8 ? "comunicata_partial" : "respinsa_exceptata");
      motivOprire = "răspuns (probă)";
    }
    c = opreste(c, a.opritLa);
  }
  await tx.insert(s.ceasuri).values({
    entitateId: a.entitateId, documentId: a.documentId, regula: c.regula, pornitLa: c.pornitLa, termenInitial: c.termenInitial, termen: c.termen,
    prelungitLa: c.prelungitLa, prelungireMotiv: motivPrelungire, instiintare: motivPrelungire ? "adresă de ieșire (probă)" : null, opritLa: c.opritLa, motivOprire,
  });
  if (c.termen !== c.termenInitial) await tx.update(s.documente).set({ termen: c.termen }).where(sql`${s.documente.id} = ${a.documentId}`);
  if (!fel) return;
  const [cerere] = await tx
    .insert(s.cereri)
    .values({
      entitateId: a.entitateId, documentId: a.documentId, fel, solicitant: a.juridica ? "juridica" : "fizica",
      solutie: fel ? solutie : null, solutieLa: solutie ? a.opritLa : null, solutieMotiv: solutie === "clasata" ? motivOprire : null, redirectionatCatre: catre,
    })
    .returning({ id: s.cereri.id });
  // O reclamație administrativă la un refuz pe Legea 544, cu termenul de 15 zile pornit.
  if (fel === "informatii_publice" && solutie === "respinsa_exceptata" && a.opritLa) {
    const la = adaugaZile(a.opritLa, 2, "calendaristice");
    if (la <= azi) {
      const rc = pornesteCeasul("544-reclamatie", la);
      await tx.insert(s.ceasuri).values({ entitateId: a.entitateId, documentId: a.documentId, regula: rc.regula, pornitLa: rc.pornitLa, termenInitial: rc.termenInitial, termen: rc.termen });
      await tx.update(s.cereri).set({ reclamatieLa: la, reclamatieNumar: "probă" }).where(sql`${s.cereri.id} = ${cerere!.id}`);
    }
  }
}

async function documenteDeProba(db: Db, primariaId: string, salubrizareId: string, compId: Map<string, string>, persoaneIds: string[], registraturaId: string) {
  const r = aleator(11);
  const azi = aziInRomania();
  const zi = (inUrma: number) => adaugaZile(azi, -inUrma, "calendaristice");
  const canale = s.canalIntrare.enumValues;
  // Al doilea generator, pentru ceasuri și cereri, ca registrul de mai sus să rămână același.
  const r2 = aleator(12);
  await caSistem(db, async (tx) => {
    let numar = 1001;
    for (let i = 0; i < 60; i++) {
      const t = TIPURI_DOCUMENTE[i % TIPURI_DOCUMENTE.length]!;
      const data = zi(Math.floor(r() * 60));
      const { termen: tl, recunoscut } = recunoasteTermenul(t.tip, t.tip);
      const termen = dataLimita(data, tl);
      // Starea: cele cu termenul trecut sunt de obicei rezolvate; câteva rămân în urmă (termene depășite).
      const zar = r();
      const trecut = termen < azi;
      const stare = trecut
        ? (zar < 0.08 ? "repartizat" : zar < 0.16 ? "in_lucru" : zar < 0.2 ? "la_semnat" : zar < 0.92 ? "emis" : "arhivat")
        : (zar < 0.12 ? "inregistrat" : zar < 0.4 ? "repartizat" : zar < 0.7 ? "in_lucru" : zar < 0.85 ? "la_semnat" : "emis");
      const [doc] = await tx
        .insert(s.documente)
        .values({
          entitateId: primariaId, an: Number(data.slice(0, 4)), numar: numar++, dataInregistrare: new Date(`${data}T09:00:00Z`),
          sursa: i % 3 === 0 ? "petru" : "import", canal: canale[Math.floor(r() * canale.length)]!,
          tip: t.tip, continut: `${t.tip} (probă)`, emitentId: persoaneIds[i % persoaneIds.length]!,
          compartimentId: stare === "inregistrat" ? null : compId.get(t.compartiment), stare,
          termen, termenCheie: tl.cheie, termenRecunoscut: recunoscut,
        })
        .returning({ id: s.documente.id, an: s.documente.an, numar: s.documente.numar });
      await tx.insert(s.jurnal).values({ utilizatorId: registraturaId, actiune: "a înregistrat", entitate: "document", entitateId: doc!.id, detalii: { numar: doc!.numar, proba: true } });
      const dataIesire = adaugaZile(data, Math.min(tl.zile, 1 + Math.floor(r() * tl.zile)), "calendaristice");
      const iesireData = dataIesire > azi ? azi : dataIesire;
      await ceasSiCerere(tx, { entitateId: primariaId, documentId: doc!.id, data, cheie: tl.cheie, recunoscut, stare, opritLa: stare === "emis" || stare === "arhivat" ? iesireData : null, juridica: (i % persoaneIds.length) % 5 === 4, zar: r2 });
      if (stare === "emis" || stare === "arhivat") {
        const mod = (["posta", "email", "ghiseu", "platforma"] as const)[Math.floor(r() * 4)]!;
        await tx.insert(s.documente).values({
          entitateId: primariaId, an: Number(iesireData.slice(0, 4)), numar: numar++, dataInregistrare: new Date(`${iesireData}T13:00:00Z`),
          directie: "iesire", sursa: "import", tip: `Răspuns la nr. ${doc!.numar}/${doc!.an}`, continut: `Răspuns: ${t.tip} (probă)`,
          compartimentId: compId.get(t.compartiment), raspunsLaId: doc!.id, destinatarText: "Destinatar (probă)",
          modExpediere: mod, expediatLa: iesireData, confirmatLa: r() < 0.6 ? iesireData : null, stare: "emis",
        });
      }
    }
    // O intrare a serviciului de salubrizare: nu trebuie să se vadă din primărie (izolarea entităților).
    await tx.insert(s.documente).values({
      entitateId: salubrizareId, an: Number(azi.slice(0, 4)), numar: 1, dataInregistrare: new Date(`${zi(5)}T09:00:00Z`),
      tip: "Cerere de recipient nou", continut: "Cerere de recipient nou (probă)", emitentText: "Exemplu Ana (probă)",
      compartimentId: compId.get("salubrizare-colectare"), stare: "repartizat", termen: adaugaZile(zi(5), 30, "calendaristice"), termenCheie: "petitie",
    });
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
