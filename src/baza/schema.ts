import { sql } from "drizzle-orm";
import { type AnyPgColumn, bigserial, boolean, date, integer, jsonb, pgSchema, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Schema „petru”: datele aplicației. În mediile de probă se șterge și se reface la fiecare publicare.
 * Reguli: identificatori UUID, date și ore cu fus orar, migrări numerotate în depozit.
 */
export const petru = pgSchema("petru");

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const creatLa = () => timestamp("creat_la", { withTimezone: true }).notNull().defaultNow();

export const stareDocument = petru.enum("stare_document", [
  "inregistrat", "repartizat", "in_lucru", "la_semnat", "emis", "publicat", "arhivat",
]);
export const tipEntitate = petru.enum("tip_entitate", ["primarie", "serviciu_public", "alta"]);
export const tipPersoana = petru.enum("tip_persoana", ["fizica", "juridica", "institutie"]);
export const directieDocument = petru.enum("directie_document", ["intrare", "iesire", "intern"]);
export const sursaDocument = petru.enum("sursa_document", ["petru", "import"]);
export const canalIntrare = petru.enum("canal_intrare", ["ghiseu", "posta", "email", "platforma"]);
export const modExpediere = petru.enum("mod_expediere", ["posta", "email", "ghiseu", "platforma"]);
export const stareImport = petru.enum("stare_import", ["verificat", "aplicat", "renuntat"]);

/** Setările instituției: numele, localitatea, județul. Un singur rând. În cod nu apare nicio localitate. */
export const institutie = petru.table("institutie", {
  id: id(),
  nume: text("nume").notNull(),
  localitate: text("localitate").notNull(),
  judet: text("judet").notNull(),
  cif: text("cif"),
  creatLa: creatLa(),
});

/**
 * Entitățile care lucrează în Petru, fiecare cu datele ei: primăria și, de pildă, serviciul de
 * salubrizare (formă juridică distinctă). Fiecare entitate e operator pentru datele ei.
 */
export const entitati = petru.table("entitati", {
  id: id(),
  cheie: text("cheie").notNull().unique(),
  nume: text("nume").notNull(),
  tip: tipEntitate("tip").notNull(),
  cif: text("cif"),
  creatLa: creatLa(),
});

export const compartimente = petru.table("compartimente", {
  id: id(),
  entitateId: uuid("entitate_id").references(() => entitati.id),
  cheie: text("cheie").notNull().unique(),
  nume: text("nume").notNull(),
  atributii: text("atributii"),
  program: text("program"),
  interior: text("interior"),
  email: text("email"),
  creatLa: creatLa(),
});

/** Registrul comun: persoanele, firmele și instituțiile, ținute o singură dată. */
export const persoane = petru.table("persoane", {
  id: id(),
  tip: tipPersoana("tip").notNull(),
  nume: text("nume").notNull(),
  prenume: text("prenume"),
  cnp: text("cnp"),
  cui: text("cui"),
  adresa: text("adresa"),
  telefon: text("telefon"),
  email: text("email"),
  /** Marcajul obligatoriu al datelor inventate. */
  esteProba: boolean("este_proba").notNull().default(false),
  creatLa: creatLa(),
});

export const utilizatori = petru.table("utilizatori", {
  id: id(),
  entitateId: uuid("entitate_id").references(() => entitati.id),
  numeAfisat: text("nume_afisat").notNull(),
  email: text("email").unique(),
  /** Funcția (postul), nu persoana: „inspector”, „referent”. Rolurile dau drepturile. */
  functie: text("functie"),
  /** Vechiul câmp de rol; drepturile vin din utilizator_roluri. */
  rol: text("rol"),
  compartimentId: uuid("compartiment_id").references(() => compartimente.id),
  /** Identificatorul din Entra ID (producție). Gol la conturile locale de probă. */
  entraOid: text("entra_oid").unique(),
  contLocal: boolean("cont_local").notNull().default(false),
  activ: boolean("activ").notNull().default(true),
  ultimaIntrare: timestamp("ultima_intrare", { withTimezone: true }),
  creatLa: creatLa(),
});

/** Rolurile: seturi de drepturi, pe funcții. Cele predefinite vin din cod; administratorul poate adăuga altele. */
export const roluri = petru.table(
  "roluri",
  {
    id: id(),
    entitateId: uuid("entitate_id").notNull().references(() => entitati.id),
    cheie: text("cheie").notNull(),
    nume: text("nume").notNull(),
    descriere: text("descriere"),
    predefinit: boolean("predefinit").notNull().default(false),
    creatLa: creatLa(),
  },
  (t) => [unique("roluri_entitate_cheie").on(t.entitateId, t.cheie)],
);

/** Drepturile fiecărui rol. Lista drepturilor posibile e în cod (src/domeniu/permisiuni.ts). */
export const rolPermisiuni = petru.table(
  "rol_permisiuni",
  {
    rolId: uuid("rol_id").notNull().references(() => roluri.id, { onDelete: "cascade" }),
    permisiune: text("permisiune").notNull(),
  },
  (t) => [primaryKey({ columns: [t.rolId, t.permisiune] })],
);

/** Rolurile unui utilizator; un rol poate fi limitat la un compartiment. */
export const utilizatorRoluri = petru.table(
  "utilizator_roluri",
  {
    id: id(),
    utilizatorId: uuid("utilizator_id").notNull().references(() => utilizatori.id, { onDelete: "cascade" }),
    rolId: uuid("rol_id").notNull().references(() => roluri.id, { onDelete: "cascade" }),
    compartimentId: uuid("compartiment_id").references(() => compartimente.id),
    acordatDe: uuid("acordat_de").references(() => utilizatori.id),
    creatLa: creatLa(),
  },
  (t) => [unique("utilizator_rol_compartiment").on(t.utilizatorId, t.rolId, t.compartimentId)],
);

/**
 * Registrul de intrare-ieșire: un singur drum al actului pentru toate documentele.
 * Fiecare rând aparține unei entități; baza oprește accesul unei entități la rândurile alteia
 * (securitate la nivel de rând, migrarea 0004). Registrul oficial e azi în SOBIS: rândurile cu
 * sursa „import” vin din exportul lui, cu numărul lui; Petru adaugă urmărirea.
 */
export const documente = petru.table(
  "documente",
  {
    id: id(),
    entitateId: uuid("entitate_id").notNull().references(() => entitati.id),
    an: integer("an").notNull(),
    numar: integer("numar").notNull(),
    dataInregistrare: timestamp("data_inregistrare", { withTimezone: true }).notNull().defaultNow(),
    directie: directieDocument("directie").notNull().default("intrare"),
    sursa: sursaDocument("sursa").notNull().default("petru"),
    canal: canalIntrare("canal"),
    tip: text("tip").notNull(),
    continut: text("continut").notNull(),
    emitentId: uuid("emitent_id").references(() => persoane.id),
    /** Emitentul așa cum e scris în registrul oficial, până la legarea de registrul comun. */
    emitentText: text("emitent_text"),
    compartimentId: uuid("compartiment_id").references(() => compartimente.id),
    /** Compartimentul așa cum e scris în export, când nu s-a putut potrivi cu unul din Petru. */
    compartimentText: text("compartiment_text"),
    stare: stareDocument("stare").notNull().default("inregistrat"),
    termen: date("termen"),
    /** Cheia termenului legal (src/domeniu/termene.ts) și dacă a fost recunoscut sau e cel implicit. */
    termenCheie: text("termen_cheie"),
    termenRecunoscut: boolean("termen_recunoscut").notNull().default(true),
    /** La ieșire: documentul intrat la care răspunde. */
    raspunsLaId: uuid("raspuns_la_id").references((): AnyPgColumn => documente.id),
    destinatarText: text("destinatar_text"),
    modExpediere: modExpediere("mod_expediere"),
    expediatLa: date("expediat_la"),
    confirmatLa: date("confirmat_la"),
    importId: uuid("import_id").references(() => importuri.id),
    creatLa: creatLa(),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("documente_entitate_an_numar").on(t.entitateId, t.an, t.numar)],
);

/** Importurile exportului din registrul oficial: întâi verificate, apoi aplicate. Rămân ca urmă. */
export const importuri = petru.table("importuri", {
  id: id(),
  entitateId: uuid("entitate_id").notNull().references(() => entitati.id),
  utilizatorId: uuid("utilizator_id").references(() => utilizatori.id),
  numeFisier: text("nume_fisier").notNull(),
  /** Amprenta SHA-256 a fișierului, ca același export să nu fie aplicat de două ori din greșeală. */
  amprenta: text("amprenta").notNull(),
  stare: stareImport("stare").notNull().default("verificat"),
  potrivire: jsonb("potrivire").notNull(),
  randuri: jsonb("randuri").notNull(),
  erori: jsonb("erori").notNull(),
  noi: integer("noi").notNull().default(0),
  actualizate: integer("actualizate").notNull().default(0),
  aplicatLa: timestamp("aplicat_la", { withTimezone: true }),
  creatLa: creatLa(),
});

/** Jurnalul: se poate doar adăuga. Modificarea și ștergerea sunt blocate în bază (migrarea 0001). */
export const jurnal = petru.table("jurnal", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  cand: timestamp("cand", { withTimezone: true }).notNull().defaultNow(),
  utilizatorId: uuid("utilizator_id").references(() => utilizatori.id),
  actiune: text("actiune").notNull(),
  entitate: text("entitate").notNull(),
  entitateId: uuid("entitate_id"),
  detalii: jsonb("detalii"),
});
