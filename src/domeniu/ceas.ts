/**
 * Ceasul termenelor: serviciul comun care ține termenul legal al unui act.
 * Un pas pe drumul actului poate porni, prelungi sau opri un ceas. Partea aceasta e pură (fără bază),
 * ca regulile să fie testate; în bază, ceasurile stau în tabelul `ceasuri`.
 *
 * Azi îl folosesc registratura, petițiile și cererile pe Legea 544. Mai târziu: comunicarea
 * hotărârilor la prefect, consultarea pe Legea 52, avizele și termenele din contracte.
 */
import { esteZiLucratoare, sarbatoarea } from "./calendar";
import { adaugaZile, termenul, type Jalon, type TermenLegal } from "./termene";

/** Câte zile înainte de termen se semnalează actul. */
export const ZILE_AVERTIZARE = 3;

export type Ceas = {
  regula: string;
  pornitLa: string;
  termenInitial: string;
  termen: string;
  prelungitLa: string | null;
  opritLa: string | null;
};

export type StareCeas = "depasit" | "aproape" | "in_termen" | "oprit";

function regula(cheie: string): TermenLegal {
  const t = termenul(cheie);
  if (!t) throw new Error(`Regula de termen „${cheie}” nu există.`);
  return t;
}

export function zileIntre(de: string, pana: string): number {
  return Math.round((Date.parse(`${pana}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

/** Pornește ceasul la data înregistrării: termenul se socotește după regula tipului de act. */
export function pornesteCeasul(cheie: string, pornitLa: string): Ceas {
  const t = regula(cheie);
  const termen = adaugaZile(pornitLa, t.zile, t.felZile);
  return { regula: cheie, pornitLa, termenInitial: termen, termen, prelungitLa: null, opritLa: null };
}

/**
 * Starea unui termen de așteptare (`sens: "asteptare"`): „in_asteptare” până la termen inclusiv,
 * „indeplinit” după el. De pildă, votul pe un proiect normativ vine numai după cele 30 de zile
 * lucrătoare de la anunț (Legea 52/2003).
 */
export type StareAsteptare = "in_asteptare" | "indeplinit";

export function esteAsteptare(cheie: string): boolean {
  return regula(cheie).sens === "asteptare";
}

/**
 * S-a împlinit așteptarea la data `la`? Termenul e ultima zi a așteptării: actul se poate face numai
 * după el (calcul prudent: „cu cel puțin 30 de zile înainte” lasă 30 de zile întregi între anunț și vot).
 */
export function stareaAsteptarii(c: Pick<Ceas, "termen">, la: string): StareAsteptare {
  return la > c.termen ? "indeplinit" : "in_asteptare";
}

/** Starea ceasului față de ziua de azi. */
export function stareaCeasului(c: Pick<Ceas, "termen" | "opritLa">, azi: string): StareCeas {
  if (c.opritLa) return "oprit";
  const ramase = zileIntre(azi, c.termen);
  if (ramase < 0) return "depasit";
  if (ramase <= ZILE_AVERTIZARE) return "aproape";
  return "in_termen";
}

export type Verificare = { da: true } | { da: false; motiv: string };

/** Până când se poate hotărî prelungirea, dacă regula o permite. */
export function ultimaZiDePrelungire(c: Ceas): string | null {
  const p = regula(c.regula).prelungire;
  if (!p) return null;
  return p.panaLa === "inainte_de_termen" ? c.termenInitial : adaugaZile(c.pornitLa, p.panaLa.inZile, "calendaristice");
}

/** Se poate prelungi termenul la data `la` (data hotărârii și a înștiințării)? */
export function poatePrelungi(c: Ceas, la: string): Verificare {
  const p = regula(c.regula).prelungire;
  if (!p) return { da: false, motiv: "Legea nu prevede prelungirea acestui termen." };
  if (c.opritLa) return { da: false, motiv: "Ceasul e oprit: actul e deja rezolvat." };
  if (c.prelungitLa) return { da: false, motiv: "Termenul a fost deja prelungit o dată." };
  if (la < c.pornitLa) return { da: false, motiv: "Data prelungirii e înainte de înregistrare." };
  const ultima = ultimaZiDePrelungire(c)!;
  if (la > ultima) {
    return { da: false, motiv: p.panaLa === "inainte_de_termen" ? "Termenul inițial a trecut: prelungirea se hotărăște înainte de expirare." : `Înștiințarea despre prelungire se face în primele ${p.panaLa.inZile} zile; termenul ei a trecut.` };
  }
  return { da: true };
}

/** Prelungește termenul, cu verificarea regulii. */
export function prelungeste(c: Ceas, la: string): Ceas {
  const v = poatePrelungi(c, la);
  if (!v.da) throw new Error(v.motiv);
  const p = regula(c.regula).prelungire!;
  return { ...c, termen: adaugaZile(c.termenInitial, p.zileInPlus, p.felZile), prelungitLa: la };
}

/** Termenul după o eventuală prelungire (fără s-o facă), pentru formular. */
export function termenulPrelungit(c: Ceas): string | null {
  const p = regula(c.regula).prelungire;
  return p ? adaugaZile(c.termenInitial, p.zileInPlus, p.felZile) : null;
}

/** Oprește ceasul: răspunsul a plecat, cererea a fost redirecționată, clasată sau conexată. */
export function opreste(c: Ceas, la: string): Ceas {
  if (c.opritLa) return c;
  if (la < c.pornitLa) throw new Error("Data opririi e înainte de înregistrare.");
  return { ...c, opritLa: la };
}

/** Rezolvat în termen? `null` cât timp ceasul merge. */
export function inTermen(c: Pick<Ceas, "termen" | "opritLa">): boolean | null {
  return c.opritLa ? c.opritLa <= c.termen : null;
}

export type JalonCalculat = { cheie: Jalon["cheie"]; ce: string; pana: string; temei: string; deConfirmat: boolean; trecut: boolean };

/**
 * Termenele intermediare ale ceasului: redirecționarea și refuzul în 5 zile, înștiințarea prelungirii
 * în 10 zile la Legea 544. Se arată cât timp ceasul merge.
 */
export function jaloanele(c: Ceas, azi: string): JalonCalculat[] {
  if (c.opritLa) return [];
  const t = regula(c.regula);
  const lista: JalonCalculat[] = (t.jaloane ?? []).map((j) => {
    const pana = adaugaZile(c.pornitLa, j.zile, j.felZile);
    return { cheie: j.cheie, ce: j.ce, pana, temei: j.temei, deConfirmat: j.deConfirmat, trecut: pana < azi };
  });
  const p = t.prelungire;
  if (p && typeof p.panaLa === "object" && !c.prelungitLa) {
    const pana = adaugaZile(c.pornitLa, p.panaLa.inZile, "calendaristice");
    lista.push({ cheie: "instiintare_prelungire", ce: `Înștiințarea prelungirii, dacă răspunsul cere mai mult (${p.conditie})`, pana, temei: p.temei, deConfirmat: p.deConfirmat, trecut: pana < azi });
  }
  return lista.sort((a, b) => a.pana.localeCompare(b.pana));
}

/**
 * Dacă termenul cade într-o zi nelucrătoare, spune de ce. Petru nu mută termenul (calculul rămâne
 * cel strict, mai prudent); mutarea pe următoarea zi lucrătoare e o întrebare pentru jurist.
 */
export function ziNelucratoare(termen: string): string | null {
  if (esteZiLucratoare(termen)) return null;
  const s = sarbatoarea(termen);
  if (s) return s.nume;
  return new Date(`${termen}T12:00:00Z`).getUTCDay() === 0 ? "duminică" : "sâmbătă";
}

/**
 * Compartimentul propune prelungirea; o hotărăște conducătorul instituției (OG 27/2002, art. 9).
 * Propunerea se poate face cât timp prelungirea e încă posibilă și nu există deja una.
 */
export function poatePropunePrelungirea(c: Ceas, propusaLa: string | null, azi: string): Verificare {
  if (propusaLa) return { da: false, motiv: "Prelungirea e deja propusă; așteaptă hotărârea conducătorului." };
  return poatePrelungi(c, azi);
}
