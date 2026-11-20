/**
 * Un singur drum al actului: toate documentele trec prin aceleași stări.
 * Modulele adaugă pași în interiorul stărilor, nu drumuri paralele.
 */
export const STARI = [
  "inregistrat",
  "repartizat",
  "in_lucru",
  "la_semnat",
  "emis",
  "publicat",
  "arhivat",
] as const;

export type Stare = (typeof STARI)[number];

export const ETICHETE: Record<Stare, string> = {
  inregistrat: "Înregistrat",
  repartizat: "Repartizat",
  in_lucru: "În lucru",
  la_semnat: "La semnat",
  emis: "Emis",
  publicat: "Publicat",
  arhivat: "Arhivat",
};

/**
 * Trecerile permise. Publicarea e opțională: un act emis poate merge direct în arhivă.
 * Un document în lucru se poate clasa fără răspuns (de pildă, o petiție repetată), direct în arhivă.
 * O cerere înregistrată sau repartizată se poate închide fără răspuns în fond: redirecționată la
 * instituția competentă, clasată (petiție anonimă) sau conexată la altă cerere.
 */
const TRECERI: Record<Stare, readonly Stare[]> = {
  inregistrat: ["repartizat", "arhivat"],
  repartizat: ["in_lucru", "repartizat", "arhivat"],
  in_lucru: ["la_semnat", "repartizat", "arhivat"],
  la_semnat: ["emis", "in_lucru"],
  emis: ["publicat", "arhivat"],
  publicat: ["arhivat"],
  arhivat: [],
};

export function poateTrece(din: Stare, spre: Stare): boolean {
  return TRECERI[din].includes(spre);
}

/**
 * Poarta de publicare: nimic nu ajunge la public fără aprobarea unui om cu rolul potrivit
 * și fără copia anonimizată.
 */
export type CererePublicare = {
  stare: Stare;
  aprobatDe: string | null;
  copieAnonimizata: boolean;
};

export function poatePublica(c: CererePublicare): { da: boolean; motiv?: string } {
  if (c.stare !== "emis") return { da: false, motiv: "Numai un act emis poate fi publicat." };
  if (!c.aprobatDe) return { da: false, motiv: "Lipsește aprobarea de publicare." };
  if (!c.copieAnonimizata) return { da: false, motiv: "Lipsește copia anonimizată." };
  return { da: true };
}
