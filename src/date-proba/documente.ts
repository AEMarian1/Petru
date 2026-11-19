import type { Stare } from "@/domeniu/drumul-actului";

/**
 * DATE INVENTATE, pentru mediul de probă. Nu aparțin unor persoane reale.
 * Se înlocuiesc la pasul S2 cu generatorul de date de probă din bază.
 */
export type EvenimentJurnal = { cand: string; cine: string; ce: string };

export type Document = {
  id: string;
  numar: string;
  data: string;
  tip: string;
  emitent: string;
  continut: string;
  compartiment: string;
  stare: Stare;
  termen: string;
  jurnal: EvenimentJurnal[];
};

export const DOCUMENTE: Document[] = [
  {
    id: "d1",
    numar: "1001",
    data: "2026-11-03",
    tip: "Cerere certificat de urbanism",
    emitent: "Persoana de probă A",
    continut: "Certificat de urbanism pentru informare, teren intravilan (probă)",
    compartiment: "Urbanism",
    stare: "in_lucru",
    termen: "2026-11-24",
    jurnal: [
      { cand: "2026-11-03 09:12", cine: "Registratura", ce: "A înregistrat cererea" },
      { cand: "2026-11-03 10:40", cine: "Secretarul general", ce: "A repartizat la Urbanism" },
      { cand: "2026-11-05 14:02", cine: "Urbanism", ce: "A început lucrul" },
    ],
  },
  {
    id: "d2",
    numar: "1002",
    data: "2026-11-04",
    tip: "Petiție",
    emitent: "Persoana de probă B",
    continut: "Sesizare privind iluminatul public pe o stradă (probă)",
    compartiment: "Administrativ – Consiliul local",
    stare: "repartizat",
    termen: "2026-12-04",
    jurnal: [
      { cand: "2026-11-04 08:55", cine: "Registratura", ce: "A înregistrat petiția" },
      { cand: "2026-11-04 11:20", cine: "Secretarul general", ce: "A repartizat la Administrativ – Consiliul local" },
    ],
  },
  {
    id: "d3",
    numar: "1003",
    data: "2026-11-06",
    tip: "Cerere informații publice (Legea 544/2001)",
    emitent: "Asociația de probă C",
    continut: "Solicitare privind contractele de lucrări din anul curent (probă)",
    compartiment: "Achiziții publice",
    stare: "la_semnat",
    termen: "2026-11-16",
    jurnal: [
      { cand: "2026-11-06 09:30", cine: "Registratura", ce: "A înregistrat cererea" },
      { cand: "2026-11-06 12:00", cine: "Secretarul general", ce: "A repartizat la Achiziții publice" },
      { cand: "2026-11-12 15:45", cine: "Achiziții publice", ce: "A trimis răspunsul la semnat" },
    ],
  },
  {
    id: "d4",
    numar: "1004",
    data: "2026-10-20",
    tip: "Proiect de dispoziție",
    emitent: "Resurse umane",
    continut: "Dispoziție privind constituirea unei comisii (probă)",
    compartiment: "Secretarul general",
    stare: "emis",
    termen: "2026-10-30",
    jurnal: [
      { cand: "2026-10-20 10:00", cine: "Registratura", ce: "A înregistrat proiectul" },
      { cand: "2026-10-22 13:10", cine: "Secretarul general", ce: "A dat avizul de legalitate" },
      { cand: "2026-10-23 09:00", cine: "Primarul în funcție", ce: "A semnat dispoziția" },
    ],
  },
  {
    id: "d5",
    numar: "1005",
    data: "2026-11-10",
    tip: "Adresă de la instituție",
    emitent: "Instituția Prefectului (probă)",
    continut: "Solicitare de situație statistică (probă)",
    compartiment: "—",
    stare: "inregistrat",
    termen: "2026-11-20",
    jurnal: [{ cand: "2026-11-10 08:30", cine: "Registratura", ce: "A înregistrat adresa" }],
  },
];

export function documentul(id: string): Document | undefined {
  return DOCUMENTE.find((d) => d.id === id);
}
