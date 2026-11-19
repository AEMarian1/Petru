import { sql } from "drizzle-orm";
import { bigserial, boolean, date, integer, jsonb, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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
export const tipPersoana = petru.enum("tip_persoana", ["fizica", "juridica", "institutie"]);
export const directieDocument = petru.enum("directie_document", ["intrare", "iesire", "intern"]);

/** Setările instituției: numele, localitatea, județul. Un singur rând. În cod nu apare nicio localitate. */
export const institutie = petru.table("institutie", {
  id: id(),
  nume: text("nume").notNull(),
  localitate: text("localitate").notNull(),
  judet: text("judet").notNull(),
  cif: text("cif"),
  creatLa: creatLa(),
});

export const compartimente = petru.table("compartimente", {
  id: id(),
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
  numeAfisat: text("nume_afisat").notNull(),
  rol: text("rol").notNull(),
  compartimentId: uuid("compartiment_id").references(() => compartimente.id),
  /** Identificatorul din Entra ID (producție). Gol la conturile locale de probă. */
  entraOid: text("entra_oid").unique(),
  contLocal: boolean("cont_local").notNull().default(false),
  creatLa: creatLa(),
});

/** Registrul de intrare-ieșire: un singur drum al actului pentru toate documentele. */
export const documente = petru.table(
  "documente",
  {
    id: id(),
    an: integer("an").notNull(),
    numar: integer("numar").notNull(),
    dataInregistrare: timestamp("data_inregistrare", { withTimezone: true }).notNull().defaultNow(),
    directie: directieDocument("directie").notNull().default("intrare"),
    tip: text("tip").notNull(),
    continut: text("continut").notNull(),
    emitentId: uuid("emitent_id").references(() => persoane.id),
    compartimentId: uuid("compartiment_id").references(() => compartimente.id),
    stare: stareDocument("stare").notNull().default("inregistrat"),
    termen: date("termen"),
    creatLa: creatLa(),
  },
  (t) => [unique("documente_an_numar").on(t.an, t.numar)],
);

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
