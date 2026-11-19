/**
 * Termenele legale folosite de modulul „Termenele și sarcinile”.
 * `deConfirmat: true` = termenul trebuie confirmat de jurist pe forma la zi a legii.
 */
export type TermenLegal = {
  cheie: string;
  ce: string;
  zile: number;
  felZile: "calendaristice" | "lucrătoare";
  temei: string;
  deConfirmat: boolean;
};

export const TERMENE: TermenLegal[] = [
  { cheie: "544", ce: "Răspuns la cererea de informații publice", zile: 10, felZile: "calendaristice", temei: "Legea 544/2001, art. 7 (până la 30 de zile, cu înștiințare)", deConfirmat: false },
  { cheie: "544-refuz", ce: "Înștiințarea refuzului (informație exceptată)", zile: 5, felZile: "calendaristice", temei: "Legea 544/2001, art. 7", deConfirmat: false },
  { cheie: "petitie", ce: "Răspuns la petiție", zile: 30, felZile: "calendaristice", temei: "OG 27/2002, art. 8 (prelungire cu 15 zile)", deConfirmat: false },
  { cheie: "certificat-fiscal", ce: "Certificatul de atestare fiscală", zile: 2, felZile: "lucrătoare", temei: "Codul de procedură fiscală", deConfirmat: true },
  { cheie: "certificat-urbanism", ce: "Certificatul de urbanism", zile: 15, felZile: "lucrătoare", temei: "Codul amenajării teritoriului, urbanismului și construcțiilor (Legea 169/2026)", deConfirmat: true },
  { cheie: "autorizatie-construire", ce: "Autorizația de construire", zile: 30, felZile: "calendaristice", temei: "Codul amenajării teritoriului, urbanismului și construcțiilor (Legea 169/2026)", deConfirmat: true },
  { cheie: "transparenta-52", ce: "Propuneri la proiectele normative, după anunț", zile: 10, felZile: "calendaristice", temei: "Legea 52/2003", deConfirmat: false },
];

export function termenul(cheie: string): TermenLegal | undefined {
  return TERMENE.find((t) => t.cheie === cheie);
}

/** Adaugă zile la o dată ISO (AAAA-LL-ZZ). Zilele lucrătoare sar peste sâmbătă și duminică (fără sărbători, deocamdată). */
export function adaugaZile(dataIso: string, zile: number, fel: TermenLegal["felZile"]): string {
  const d = new Date(`${dataIso}T12:00:00Z`);
  if (fel === "calendaristice") {
    d.setUTCDate(d.getUTCDate() + zile);
  } else {
    let ramase = zile;
    while (ramase > 0) {
      d.setUTCDate(d.getUTCDate() + 1);
      const zi = d.getUTCDay();
      if (zi !== 0 && zi !== 6) ramase--;
    }
  }
  return d.toISOString().slice(0, 10);
}
