/**
 * Drumul unui proiect de hotărâre, de la inițiere la rezultatul din ședință.
 * Rezultatul are una din trei valori, ca în registrele Monitorului Oficial Local.
 */
export const PASI_PROIECT = [
  "initiat",
  "anuntat",
  "avizat",
  "pe_ordinea_de_zi",
  "votat",
] as const;
export type PasProiect = (typeof PASI_PROIECT)[number];

export const ETICHETE_PAS: Record<PasProiect, string> = {
  initiat: "Inițiat (referat, raport)",
  anuntat: "Anunțat public (Legea 52/2003)",
  avizat: "Avizat de comisii",
  pe_ordinea_de_zi: "Pe ordinea de zi",
  votat: "Votat",
};

export type Rezultat = "aprobat" | "respins" | "retras";

export const ETICHETE_REZULTAT: Record<Rezultat, string> = {
  aprobat: "Aprobat în ședință",
  respins: "Respins în ședință",
  retras: "Retras de pe ordinea de zi",
};

export type TipSedinta = "ordinara" | "extraordinara" | "de_indata";

export const ETICHETE_SEDINTA: Record<TipSedinta, string> = {
  ordinara: "Ordinară",
  extraordinara: "Extraordinară",
  de_indata: "De îndată",
};

/**
 * Un proiect normativ se anunță public cu cel puțin 30 de zile înainte de supunerea spre aprobare
 * (Legea 52/2003), cu excepția situațiilor de urgență. Proiectele individuale nu au această etapă.
 */
export function cereAnuntPublic(normativ: boolean, tip: TipSedinta): boolean {
  return normativ && tip !== "de_indata";
}

/** Rezultatul se poate stabili numai după ce proiectul a fost pe ordinea de zi. */
export function poateAveaRezultat(pas: PasProiect, rezultat: Rezultat): boolean {
  if (rezultat === "retras") return pas === "pe_ordinea_de_zi" || pas === "votat";
  return pas === "votat";
}
