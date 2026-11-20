/**
 * Registratura 0.1: urmărirea documentelor din registrul oficial (importat din SOBIS).
 * Răspunde la ce încurcă azi: termenele depășite, unde e actul, ieșirea și confirmarea de primire.
 * Partea aceasta e pură, ca să poată fi testată.
 */
import { poateTrece, type Stare } from "./drumul-actului";
import type { Permisiune } from "./permisiuni";
import { adaugaZile, termenul, type TermenLegal } from "./termene";
import { normalizeaza } from "./import-registru";
import { ZILE_AVERTIZARE, zileIntre } from "./ceas";

export { ZILE_AVERTIZARE, zileIntre };

/** Termenul implicit, când tipul documentului nu se recunoaște: 30 de zile, ca la petiții. */
export const CHEIE_IMPLICITA = "petitie";

/** Reguli simple de recunoaștere a tipului, din tip sau din conținut. Ordinea contează. */
const REGULI: { cheie: string; potriveste: RegExp }[] = [
  { cheie: "544", potriveste: /\b544\b|informat\w* (de interes )?public/ },
  { cheie: "certificat-urbanism", potriveste: /certificat\w* de urbanism/ },
  { cheie: "autorizatie-construire", potriveste: /autorizat\w* de (construire|desfiintare)/ },
  { cheie: "certificat-fiscal", potriveste: /(certificat\w* de )?atestare fiscal|certificat\w* fiscal/ },
  { cheie: "petitie", potriveste: /petiti|sesizar|reclamati|propunere/ },
];

/**
 * Termenul legal după tipul documentului. Întoarce cheia termenului și dacă a fost recunoscut sau e
 * cel implicit (atunci se afișează „de verificat”).
 */
export function recunoasteTermenul(tip: string | null, continut: string): { termen: TermenLegal; recunoscut: boolean } {
  const text = normalizeaza(`${tip ?? ""} ${continut}`);
  const regula = REGULI.find((r) => r.potriveste.test(text));
  return { termen: termenul(regula?.cheie ?? CHEIE_IMPLICITA)!, recunoscut: !!regula };
}

/** Data-limită a răspunsului, din data înregistrării și termenul legal. */
export function dataLimita(dataInregistrare: string, t: TermenLegal): string {
  return adaugaZile(dataInregistrare, t.zile, t.felZile);
}

export type StareTermen = "depasit" | "aproape" | "in_termen" | "rezolvat" | "fara_termen";

export const ETICHETE_TERMEN: Record<StareTermen, string> = {
  depasit: "Termen depășit",
  aproape: "Scade în curând",
  in_termen: "În termen",
  rezolvat: "Rezolvat",
  fara_termen: "Fără termen",
};

const REZOLVATE: readonly Stare[] = ["emis", "publicat", "arhivat"];

export function esteRezolvat(stare: Stare): boolean {
  return REZOLVATE.includes(stare);
}

/** Starea termenului față de ziua de azi (AAAA-LL-ZZ). */
export function stareaTermenului(termen: string | null, stare: Stare, azi: string): StareTermen {
  if (esteRezolvat(stare)) return "rezolvat";
  if (!termen) return "fara_termen";
  const ramase = zileIntre(azi, termen);
  if (ramase < 0) return "depasit";
  if (ramase <= ZILE_AVERTIZARE) return "aproape";
  return "in_termen";
}

/** Ziua de azi în fusul orar al României, ca AAAA-LL-ZZ. */
export function aziInRomania(acum = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(acum);
}

/**
 * Pașii pe care îi scrie omul în Petru. Fiecare pas cere un drept și o trecere permisă pe drumul actului.
 * Biroul marchează mersul; registratura scrie ieșirea, expedierea și confirmarea de primire.
 */
export type Pas = "repartizeaza" | "preia" | "la_semnat" | "inapoi_in_lucru" | "iesire" | "claseaza";

export const PASI: Record<Pas, { nume: string; facut: string; spre: Stare; drept: Permisiune[]; peCompartiment: boolean }> = {
  repartizeaza: { nume: "Repartizează", facut: "a repartizat", spre: "repartizat", drept: ["documente.repartizeaza"], peCompartiment: false },
  preia: { nume: "Preia în lucru", facut: "a preluat în lucru", spre: "in_lucru", drept: ["documente.rezolva"], peCompartiment: true },
  la_semnat: { nume: "Răspunsul e la semnat", facut: "a dat răspunsul la semnat", spre: "la_semnat", drept: ["documente.rezolva"], peCompartiment: true },
  inapoi_in_lucru: { nume: "Înapoi în lucru", facut: "a întors în lucru", spre: "in_lucru", drept: ["documente.rezolva", "documente.semneaza", "documente.contrasemneaza"], peCompartiment: true },
  iesire: { nume: "Răspunsul a plecat (ieșirea)", facut: "a înregistrat ieșirea", spre: "emis", drept: ["documente.inregistreaza", "documente.rezolva"], peCompartiment: true },
  claseaza: { nume: "Clasează fără răspuns", facut: "a clasat fără răspuns", spre: "arhivat", drept: ["documente.rezolva"], peCompartiment: true },
};

/** Pașii posibili acum, după starea documentului (fără verificarea drepturilor). */
export function pasiiPosibili(stare: Stare): Pas[] {
  return (Object.keys(PASI) as Pas[]).filter((p) => {
    if (p === "inapoi_in_lucru") return stare === "la_semnat";
    if (p === "preia") return stare === "repartizat";
    if (p === "repartizeaza") return stare === "inregistrat" || stare === "repartizat";
    if (p === "claseaza") return stare === "in_lucru";
    return poateTrece(stare, PASI[p].spre);
  });
}

export type ModExpediere = "posta" | "email" | "ghiseu" | "platforma";

export const ETICHETE_EXPEDIERE: Record<ModExpediere, string> = {
  posta: "Poștă (recomandată, cu confirmare)",
  email: "E-mail",
  ghiseu: "Ridicat la ghișeu",
  platforma: "Platformă online",
};

export function esteModExpediere(x: string): x is ModExpediere {
  return x in ETICHETE_EXPEDIERE;
}

/**
 * Ce vede utilizatorul din registru:
 * - „tot”: conducerea (dreptul de a vedea toate documentele entității);
 * - „compartimente”: biroul, numai documentele compartimentelor sale (și cererile, dacă ține registrele lor);
 * - „fisa”: registratura, numai fișa de înregistrare a tuturor documentelor, fără mersul din birou;
 * - „cereri”: responsabilul cu petițiile și informațiile publice, numai documentele care sunt cereri.
 */
export type Vedere =
  | { fel: "tot" }
  | { fel: "compartimente"; ids: string[] | "toate"; cereri?: true }
  | { fel: "fisa" }
  | { fel: "cereri" }
  | { fel: "nimic" };

export function vedereaRegistrului(acordari: readonly { permisiuni: readonly string[]; compartimentId: string | null }[]): Vedere {
  const are = (p: Permisiune) => acordari.some((a) => a.permisiuni.includes(p));
  if (are("documente.vede_tot")) return { fel: "tot" };
  const siCereri = are("cereri.gestioneaza") ? ({ cereri: true } as const) : {};
  const pe = acordari.filter((a) => a.permisiuni.includes("documente.vede_compartiment"));
  if (pe.length) return pe.some((a) => a.compartimentId === null) ? { fel: "compartimente", ids: "toate" } : { fel: "compartimente", ids: [...new Set(pe.map((a) => a.compartimentId!))], ...siCereri };
  if (are("documente.inregistreaza") || are("documente.repartizeaza")) return { fel: "fisa" };
  if (are("cereri.gestioneaza")) return { fel: "cereri" };
  return { fel: "nimic" };
}
