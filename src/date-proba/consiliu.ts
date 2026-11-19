import type { PasProiect, Rezultat, TipSedinta } from "@/domeniu/proiect-hotarare";

/** DATE INVENTATE pentru mediul de probă. */
export type Proiect = {
  id: string;
  numar: string;
  titlu: string;
  initiator: string;
  compartiment: string;
  normativ: boolean;
  pas: PasProiect;
  rezultat?: Rezultat;
  numarHcl?: string;
  vot?: { pentru: number; contra: number; abtineri: number };
};

export type Sedinta = {
  id: string;
  data: string;
  tip: TipSedinta;
  proiecte: Proiect[];
};

export const SEDINTE: Sedinta[] = [
  {
    id: "s1",
    data: "2026-10-29",
    tip: "ordinara",
    proiecte: [
      { id: "p1", numar: "101", titlu: "Proiect de hotărâre privind rectificarea bugetului local (probă)", initiator: "Primarul în funcție", compartiment: "Contabilitate", normativ: false, pas: "votat", rezultat: "aprobat", numarHcl: "95", vot: { pentru: 14, contra: 0, abtineri: 1 } },
      { id: "p2", numar: "102", titlu: "Proiect de hotărâre privind aprobarea unui regulament local de salubrizare (probă)", initiator: "Primarul în funcție", compartiment: "Mediu și salubrizare", normativ: true, pas: "votat", rezultat: "respins", vot: { pentru: 6, contra: 8, abtineri: 1 } },
      { id: "p3", numar: "103", titlu: "Proiect de hotărâre privind atribuirea unei denumiri de stradă (probă)", initiator: "Un consilier local", compartiment: "Urbanism", normativ: false, pas: "pe_ordinea_de_zi", rezultat: "retras" },
    ],
  },
  {
    id: "s2",
    data: "2026-11-12",
    tip: "de_indata",
    proiecte: [
      { id: "p4", numar: "104", titlu: "Proiect de hotărâre privind aprobarea cofinanțării unui proiect de investiții (probă)", initiator: "Primarul în funcție", compartiment: "Proiecte cu finanțare externă", normativ: false, pas: "votat", rezultat: "aprobat", numarHcl: "96", vot: { pentru: 15, contra: 0, abtineri: 0 } },
    ],
  },
  {
    id: "s3",
    data: "2026-11-26",
    tip: "ordinara",
    proiecte: [
      { id: "p5", numar: "105", titlu: "Proiect de hotărâre privind nivelul impozitelor și taxelor locale pentru anul următor (probă)", initiator: "Primarul în funcție", compartiment: "Taxe și impozite", normativ: true, pas: "avizat" },
      { id: "p6", numar: "106", titlu: "Proiect de hotărâre privind inventarul domeniului public (probă)", initiator: "Primarul în funcție", compartiment: "Patrimoniu", normativ: false, pas: "pe_ordinea_de_zi" },
    ],
  },
];

export function sedinta(id: string): Sedinta | undefined {
  return SEDINTE.find((s) => s.id === id);
}
