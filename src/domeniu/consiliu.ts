/**
 * Consiliul local (0.2): regulile pure ale proiectului de hotărâre și ale ședinței, fără bază, ca să fie
 * testate. Drumul proiectului e drumul actului (`drumul-actului.ts`): proiectul e un document din registru,
 * iar hotărârea adoptată e același act, emis după semnătură și contrasemnătură.
 *
 * Textele de lege nu au fost citite pe forma oficială: tot ce e marcat „de confirmat” se verifică de jurist
 * (`docs/consiliul-local.md`, întrebările J19–J27).
 */
import type { Verificare } from "./ceas";

export type TipSedinta = "ordinara" | "extraordinara" | "de_indata";

export const ETICHETE_SEDINTA: Record<TipSedinta, string> = {
  ordinara: "Ordinară",
  extraordinara: "Extraordinară",
  de_indata: "De îndată",
};

export function esteTipSedinta(x: string): x is TipSedinta {
  return x in ETICHETE_SEDINTA;
}

/** Cine are inițiativa (Codul administrativ, art. 136 alin. (1), de confirmat). Azi, în practică, inițiază primarul. */
export type Initiator = "primar" | "viceprimar" | "consilier" | "cetateni";

export const ETICHETE_INITIATOR: Record<Initiator, string> = {
  primar: "Primarul în funcție",
  viceprimar: "Viceprimarul",
  consilier: "Consilieri locali",
  cetateni: "Cetățenii (inițiativă cetățenească)",
};

export function esteInitiator(x: string): x is Initiator {
  return x in ETICHETE_INITIATOR;
}

/** Rezultatul din ședință: una din trei valori, ca în registrele Monitorului Oficial Local. */
export type Rezultat = "aprobat" | "respins" | "retras";

export const ETICHETE_REZULTAT: Record<Rezultat, string> = {
  aprobat: "Aprobat în ședință",
  respins: "Respins în ședință",
  retras: "Retras de pe ordinea de zi",
};

export function esteRezultat(x: string): x is Rezultat {
  return x in ETICHETE_REZULTAT;
}

/** Majoritatea cerută la vot (Codul administrativ, art. 5 și art. 139, de confirmat). */
export type Majoritate = "simpla" | "absoluta" | "doua_treimi";

export const MAJORITATI: Record<Majoritate, { nume: string; din: string }> = {
  simpla: { nume: "Majoritate simplă", din: "consilierii prezenți" },
  absoluta: { nume: "Majoritate absolută (de pildă: bugetul, patrimoniul)", din: "consilierii în funcție" },
  doua_treimi: { nume: "Două treimi", din: "consilierii în funcție" },
};

export function esteMajoritate(x: string): x is Majoritate {
  return x in MAJORITATI;
}

export type SensAviz = "favorabil" | "favorabil_cu_amendamente" | "nefavorabil";

export const ETICHETE_AVIZ: Record<SensAviz, string> = {
  favorabil: "Favorabil",
  favorabil_cu_amendamente: "Favorabil, cu amendamente",
  nefavorabil: "Nefavorabil",
};

export function esteSensAviz(x: string): x is SensAviz {
  return x in ETICHETE_AVIZ;
}

/**
 * Cu cât timp înainte se convoacă ședința (Codul administrativ, art. 134 alin. (3), de confirmat):
 * ordinara cu cel puțin 5 zile, extraordinara cu cel puțin 3 zile, cea de îndată imediat.
 * Petru avertizează; nu blochează, cât timp regula nu e confirmată.
 */
export const CONVOCARE: Record<TipSedinta, { zile: number | null; temei: string; deConfirmat: boolean }> = {
  ordinara: { zile: 5, temei: "Codul administrativ, art. 134 alin. (3) lit. a)", deConfirmat: true },
  extraordinara: { zile: 3, temei: "Codul administrativ, art. 134 alin. (3) lit. b)", deConfirmat: true },
  de_indata: { zile: null, temei: "Codul administrativ, art. 134 alin. (3) lit. c)", deConfirmat: true },
};

const zileIntre = (de: string, pana: string) => Math.round((Date.parse(`${pana}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);

/** Avertizarea pentru o convocare făcută prea târziu, sau `null` dacă termenul e respectat. */
export function avertizareConvocare(tip: TipSedinta, convocatLa: string, dataSedintei: string): string | null {
  if (convocatLa > dataSedintei) return "Convocarea e datată după ședință.";
  const z = CONVOCARE[tip].zile;
  if (z === null) return null;
  const ramase = zileIntre(convocatLa, dataSedintei);
  if (ramase < z) return `Ședința ${ETICHETE_SEDINTA[tip].toLowerCase()} se convoacă cu cel puțin ${z} zile înainte (${CONVOCARE[tip].temei}, de confirmat); convocarea s-a făcut cu ${ramase}.`;
  return null;
}

/** Datele ședințelor se validează (pe platforma publică au apărut ani imposibili, 0001 și 9999). */
export function dataSedinteiValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const an = Number(data.slice(0, 4));
  return an >= 2000 && an <= 2100 && !Number.isNaN(Date.parse(`${data}T12:00:00Z`));
}

/** Ședința e statutară cu majoritatea consilierilor în funcție (Codul administrativ, art. 137, de confirmat). */
export function areCvorum(prezenti: number, inFunctie: number): boolean {
  return inFunctie > 0 && prezenti > inFunctie / 2;
}

/** Câte voturi „pentru” trebuie: primul număr natural strict mai mare decât jumătatea, sau două treimi. */
export function pragul(m: Majoritate, prezenti: number, inFunctie: number): number {
  if (m === "simpla") return Math.floor(prezenti / 2) + 1;
  if (m === "absoluta") return Math.floor(inFunctie / 2) + 1;
  return Math.ceil((2 * inFunctie) / 3);
}

export type Vot = { pentru: number; contra: number; abtineri: number };

/**
 * Votul e în acord cu rezultatul scris? Aprobat cere pragul atins, respins cere pragul neatins.
 * Retragerea de pe ordinea de zi nu are vot.
 */
export function verificaVotul(a: { rezultat: Rezultat; majoritate: Majoritate; prezenti: number; inFunctie: number; vot: Vot | null }): Verificare {
  if (a.rezultat === "retras") return { da: true };
  if (!areCvorum(a.prezenti, a.inFunctie)) return { da: false, motiv: "Ședința nu are cvorum: sunt prezenți mai puțin de jumătate plus unu din consilierii în funcție." };
  if (!a.vot) return { da: false, motiv: "Scrieți voturile: pentru, contra, abțineri." };
  const { pentru, contra, abtineri } = a.vot;
  if ([pentru, contra, abtineri].some((x) => !Number.isInteger(x) || x < 0)) return { da: false, motiv: "Voturile sunt numere întregi, de la 0 în sus." };
  if (pentru + contra + abtineri > a.prezenti) return { da: false, motiv: `Sunt mai multe voturi (${pentru + contra + abtineri}) decât consilieri prezenți (${a.prezenti}).` };
  const prag = pragul(a.majoritate, a.prezenti, a.inFunctie);
  if (a.rezultat === "aprobat" && pentru < prag) return { da: false, motiv: `Pentru ${MAJORITATI[a.majoritate].nume.toLowerCase()} trebuie cel puțin ${prag} voturi „pentru” (din ${MAJORITATI[a.majoritate].din}). Sunt ${pentru}: proiectul e respins.` };
  if (a.rezultat === "respins" && pentru >= prag) return { da: false, motiv: `Cu ${pentru} voturi „pentru” pragul de ${prag} e atins: proiectul e aprobat.` };
  return { da: true };
}

/** Ce trebuie știut despre un proiect ca să se hotărască pașii următori. */
export type StareProiect = {
  normativ: boolean;
  referatLa: string | null;
  raportLa: string | null;
  /** Ultima zi a așteptării pe Legea 52 (ceasul „l52-anunt”), dacă proiectul a fost anunțat. */
  l52Termen: string | null;
  /** Excepția de urgență (Legea 52/2003, art. 7 alin. (13), de confirmat): motivul scris. */
  exceptieUrgenta: string | null;
  comisiiSesizate: number;
  avizeDate: number;
  sedintaId: string | null;
  rezultat: Rezultat | null;
};

/** Legea 52: proiectul normativ se supune aprobării numai după cele 30 de zile lucrătoare de la anunț. */
export function conditiaL52(p: Pick<StareProiect, "normativ" | "l52Termen" | "exceptieUrgenta">, laData: string): Verificare {
  if (!p.normativ || p.exceptieUrgenta) return { da: true };
  if (!p.l52Termen) return { da: false, motiv: "Proiectul normativ nu a fost anunțat public (Legea 52/2003)." };
  if (laData <= p.l52Termen) return { da: false, motiv: `Proiectul normativ se poate supune aprobării numai după ${p.l52Termen.split("-").reverse().join(".")} (30 de zile lucrătoare de la anunț, Legea 52/2003, de confirmat).` };
  return { da: true };
}

/** Se poate pune proiectul pe ordinea de zi a ședinței din `dataSedintei`? */
export function poatePeOrdineaDeZi(p: StareProiect, dataSedintei: string): Verificare {
  if (p.rezultat) return { da: false, motiv: "Proiectul are deja un rezultat." };
  if (!p.referatLa) return { da: false, motiv: "Lipsește referatul de aprobare al inițiatorului." };
  if (!p.raportLa) return { da: false, motiv: "Lipsește raportul compartimentului de specialitate." };
  return conditiaL52(p, dataSedintei);
}

/**
 * Se poate vota? Proiectul se dezbate numai cu referatul, raportul și avizele comisiilor sesizate
 * (Codul administrativ, art. 136, de confirmat), iar cel normativ numai după termenul Legii 52.
 * Retragerea de pe ordinea de zi se poate oricând înainte de vot.
 */
export function poateFiVotat(p: StareProiect, dataSedintei: string, rezultat: Rezultat): Verificare {
  if (p.rezultat) return { da: false, motiv: "Proiectul are deja un rezultat." };
  if (!p.sedintaId) return { da: false, motiv: "Proiectul nu e pe ordinea de zi." };
  if (rezultat === "retras") return { da: true };
  if (!p.referatLa || !p.raportLa) return { da: false, motiv: "Lipsește referatul de aprobare sau raportul de specialitate." };
  if (p.comisiiSesizate === 0) return { da: false, motiv: "Proiectul nu a fost trimis la nicio comisie de specialitate." };
  if (p.avizeDate < p.comisiiSesizate) return { da: false, motiv: `Lipsesc avizele comisiilor: ${p.avizeDate} din ${p.comisiiSesizate}.` };
  return conditiaL52(p, dataSedintei);
}

/** Hotărârea adoptată se emite cu semnătura președintelui de ședință și contrasemnătura secretarului general (art. 140). */
export function semnaturiHotarareLipsa(h: { semnatLa: string | null; contrasemnatLa: string | null }): string[] {
  const lipsa: string[] = [];
  if (!h.semnatLa) lipsa.push("semnătura președintelui de ședință");
  if (!h.contrasemnatLa) lipsa.push("contrasemnătura secretarului general");
  return lipsa;
}

export type Pas = { cheie: string; nume: string; facut: boolean; sarit?: boolean };

/** Pașii proiectului, pentru fișă: ce e făcut și ce urmează. */
export function pasiiProiectului(p: StareProiect & { emisa: boolean; comunicatPrefect: boolean; publicat: boolean }): Pas[] {
  const pasi: Pas[] = [
    { cheie: "referat", nume: "Inițiat (referatul de aprobare)", facut: !!p.referatLa },
    { cheie: "raport", nume: "Raportul compartimentului de specialitate", facut: !!p.raportLa },
  ];
  if (p.normativ) pasi.push({ cheie: "l52", nume: p.exceptieUrgenta ? "Consultarea publică (excepție de urgență)" : "Anunțat public (Legea 52/2003)", facut: !!p.l52Termen || !!p.exceptieUrgenta });
  pasi.push(
    { cheie: "avize", nume: "Avizele comisiilor", facut: p.comisiiSesizate > 0 && p.avizeDate >= p.comisiiSesizate },
    { cheie: "ordinea", nume: "Pe ordinea de zi", facut: !!p.sedintaId },
    { cheie: "vot", nume: p.rezultat ? ETICHETE_REZULTAT[p.rezultat] : "Votul", facut: !!p.rezultat },
  );
  if (p.rezultat === "aprobat") {
    pasi.push(
      { cheie: "emisa", nume: "Hotărârea semnată și contrasemnată", facut: p.emisa },
      { cheie: "prefect", nume: "Comunicată la prefect", facut: p.comunicatPrefect },
      { cheie: "publicata", nume: "Publicată în Monitorul Oficial Local", facut: p.publicat },
    );
  }
  return pasi;
}

/** Stadiul pe scurt, pentru liste și pentru registrul proiectelor. */
export function stadiul(p: { rezultat: Rezultat | null; sedintaId: string | null; raportLa: string | null; emisa: boolean; comunicatPrefect: boolean; publicat: boolean }): string {
  if (p.rezultat === "aprobat") {
    if (p.publicat) return "Hotărâre publicată";
    if (p.comunicatPrefect) return "Hotărâre comunicată la prefect";
    if (p.emisa) return "Hotărâre emisă";
    return "Adoptat, la semnat";
  }
  if (p.rezultat) return ETICHETE_REZULTAT[p.rezultat];
  if (p.sedintaId) return "Pe ordinea de zi";
  if (p.raportLa) return "Cu raport, la avizare";
  return "Inițiat";
}

/** Stadiul cerut de registrul proiectelor din Monitorul Oficial Local: în lucru, aprobat, respins, retras. */
export function stadiulMol(rezultat: Rezultat | null): string {
  return rezultat ? ETICHETE_REZULTAT[rezultat] : "În lucru";
}

/** Ce vede utilizatorul din proiecte: toate (consiliul, conducerea) sau numai ale compartimentelor lui (pentru raport). */
export type VedereConsiliu = { fel: "tot" } | { fel: "compartimente"; ids: string[] } | { fel: "nimic" };

export function vedereaConsiliului(acordari: readonly { permisiuni: readonly string[]; compartimentId: string | null }[]): VedereConsiliu {
  const are = (p: string) => acordari.some((a) => a.permisiuni.includes(p));
  if (["consiliu.vede", "consiliu.gestioneaza", "consiliu.initiaza", "documente.vede_tot"].some(are)) return { fel: "tot" };
  const pe = acordari.filter((a) => a.permisiuni.includes("documente.vede_compartiment"));
  if (pe.some((a) => a.compartimentId === null)) return { fel: "tot" };
  if (pe.length) return { fel: "compartimente", ids: [...new Set(pe.map((a) => a.compartimentId!))] };
  return { fel: "nimic" };
}

/**
 * Exportul unui registru ca CSV (UTF-8 cu BOM, separator „;”, ca să se deschidă corect în Excel în
 * română). Câmpurile cu ghilimele, separator sau rând nou se pun între ghilimele.
 */
export function catreCsv(randuri: readonly (readonly (string | number | null | undefined)[])[]): string {
  const camp = (x: string | number | null | undefined) => {
    const t = x === null || x === undefined ? "" : String(x);
    return /[";\r\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };
  return `﻿${randuri.map((r) => r.map(camp).join(";")).join("\r\n")}\r\n`;
}
