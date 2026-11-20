/**
 * Regulile de termen ale ceasului termenelor (`src/domeniu/ceas.ts`), pe tipul documentului.
 * Fiecare regulă are temeiul ei. `deConfirmat: true` = termenul trebuie confirmat de jurist pe forma
 * la zi a legii; până atunci se arată „de confirmat” lângă el.
 */
import { plusZile, plusZileLucratoare } from "./calendar";

export type FelZile = "calendaristice" | "lucrătoare";

/** Prelungirea permisă de lege: cu câte zile și până când se poate hotărî. */
export type PrelungireLegala = {
  zileInPlus: number;
  felZile: FelZile;
  /** „inainte_de_termen”: oricând până la termenul inițial; `inZile`: numai în primele zile de la pornire. */
  panaLa: "inainte_de_termen" | { inZile: number };
  /** Ce trebuie făcut ca prelungirea să fie legală. */
  conditie: string;
  temei: string;
  deConfirmat: boolean;
};

/** Un termen intermediar al aceluiași ceas (redirecționarea în 5 zile, refuzul motivat în 5 zile). */
export type Jalon = {
  cheie: "redirectionare" | "refuz" | "instiintare_prelungire";
  ce: string;
  zile: number;
  felZile: FelZile;
  temei: string;
  deConfirmat: boolean;
};

/**
 * Sensul termenului: „limita” = actul trebuie făcut până la termen (răspunsul, comunicarea la prefect);
 * „asteptare” = actul nu se poate face înainte de termen (votul pe un proiect normativ, după anunțul
 * pe Legea 52/2003). Un termen de așteptare nu se „depășește”: după el, condiția e îndeplinită.
 */
export type SensTermen = "limita" | "asteptare";

export type TermenLegal = {
  cheie: string;
  ce: string;
  zile: number;
  felZile: FelZile;
  temei: string;
  deConfirmat: boolean;
  /** Implicit „limita”. */
  sens?: SensTermen;
  prelungire?: PrelungireLegala;
  jaloane?: Jalon[];
};

export const TERMENE: TermenLegal[] = [
  {
    cheie: "544", ce: "Răspuns la cererea de informații publice", zile: 10, felZile: "calendaristice",
    temei: "Legea 544/2001, art. 7 alin. (1)", deConfirmat: false,
    prelungire: {
      zileInPlus: 20, felZile: "calendaristice", panaLa: { inZile: 10 },
      conditie: "solicitantul e înștiințat în scris, în primele 10 zile, că răspunsul vine în cel mult 30 de zile",
      temei: "Legea 544/2001, art. 7 alin. (1)", deConfirmat: false,
    },
    jaloane: [
      { cheie: "refuz", ce: "Refuzul motivat (informație exceptată sau inexistentă)", zile: 5, felZile: "calendaristice", temei: "Legea 544/2001, art. 7 alin. (2)", deConfirmat: false },
      { cheie: "redirectionare", ce: "Trimiterea la instituția competentă, cu înștiințarea solicitantului", zile: 5, felZile: "calendaristice", temei: "normele de aplicare a Legii 544/2001", deConfirmat: true },
    ],
  },
  { cheie: "544-refuz", ce: "Înștiințarea refuzului (informație exceptată)", zile: 5, felZile: "calendaristice", temei: "Legea 544/2001, art. 7 alin. (2)", deConfirmat: false },
  { cheie: "544-reclamatie", ce: "Răspuns la reclamația administrativă", zile: 15, felZile: "calendaristice", temei: "Legea 544/2001, art. 21–22", deConfirmat: true },
  {
    cheie: "petitie", ce: "Răspuns la petiție", zile: 30, felZile: "calendaristice",
    temei: "OG 27/2002, art. 8", deConfirmat: false,
    prelungire: {
      zileInPlus: 15, felZile: "calendaristice", panaLa: "inainte_de_termen",
      conditie: "petiția cere o cercetare mai amănunțită; prelungirea o hotărăște conducătorul instituției",
      temei: "OG 27/2002, art. 9", deConfirmat: false,
    },
    jaloane: [
      { cheie: "redirectionare", ce: "Trimiterea petiției greșit îndreptate, cu înștiințarea petiționarului", zile: 5, felZile: "calendaristice", temei: "OG 27/2002, art. 6 alin. (3)", deConfirmat: true },
    ],
  },
  { cheie: "certificat-fiscal", ce: "Certificatul de atestare fiscală", zile: 2, felZile: "lucrătoare", temei: "Codul de procedură fiscală", deConfirmat: true },
  { cheie: "certificat-urbanism", ce: "Certificatul de urbanism", zile: 15, felZile: "lucrătoare", temei: "Codul amenajării teritoriului, urbanismului și construcțiilor (Legea 169/2026)", deConfirmat: true },
  { cheie: "autorizatie-construire", ce: "Autorizația de construire", zile: 30, felZile: "calendaristice", temei: "Codul amenajării teritoriului, urbanismului și construcțiilor (Legea 169/2026)", deConfirmat: true },
  { cheie: "transparenta-52", ce: "Propuneri la proiectele normative, după anunț", zile: 10, felZile: "calendaristice", temei: "Legea 52/2003, art. 7", deConfirmat: false, sens: "asteptare" },
  // Consiliul local (0.2). Textele nu au fost citite pe forma oficială: toate sunt de confirmat (J1, J19–J21).
  {
    cheie: "l52-anunt", ce: "Proiectul normativ se supune aprobării numai după anunțul public", zile: 30, felZile: "lucrătoare",
    temei: "Legea 52/2003, art. 7 alin. (2)", deConfirmat: true, sens: "asteptare",
  },
  { cheie: "hcl-prefect", ce: "Comunicarea hotărârii consiliului local la prefect", zile: 10, felZile: "lucrătoare", temei: "Codul administrativ, art. 197 alin. (1)", deConfirmat: true },
  { cheie: "pv-publicare", ce: "Afișarea și publicarea procesului-verbal al ședinței, după aprobarea lui", zile: 3, felZile: "lucrătoare", temei: "Codul administrativ, art. 138", deConfirmat: true },
];

export function termenul(cheie: string): TermenLegal | undefined {
  return TERMENE.find((t) => t.cheie === cheie);
}

/**
 * Adaugă zile la o dată ISO (AAAA-LL-ZZ). Ziua de pornire nu se socotește.
 * Zilele lucrătoare sar peste sâmbătă, duminică și sărbătorile legale (`calendar.ts`).
 */
export function adaugaZile(dataIso: string, zile: number, fel: FelZile): string {
  return fel === "calendaristice" ? plusZile(dataIso, zile) : plusZileLucratoare(dataIso, zile);
}
