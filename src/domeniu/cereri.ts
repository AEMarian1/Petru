/**
 * Registrele petițiilor (OG 27/2002) și ale cererilor de informații de interes public (Legea 544/2001).
 * Fiecare cerere e un document din registru, cu ceasul ei de termen. Aici stau regulile și rapoartele,
 * fără bază de date, ca să poată fi testate.
 */
import { adaugaZile, termenul } from "./termene";

export type FelCerere = "petitie" | "informatii_publice";

export const FELURI: Record<FelCerere, { nume: string; registru: string; regula: string; temei: string }> = {
  petitie: { nume: "Petiție", registru: "Registrul petițiilor", regula: "petitie", temei: "OG 27/2002" },
  informatii_publice: { nume: "Cerere de informații publice", registru: "Registrul cererilor de informații publice", regula: "544", temei: "Legea 544/2001" },
};

export function esteFelCerere(x: string): x is FelCerere {
  return x in FELURI;
}

/** Felul cererii după regula de termen recunoscută la înregistrare. Fără recunoaștere sigură, nu se ghicește. */
export function felulDupaTermen(cheie: string | null, recunoscut: boolean): FelCerere | null {
  if (!recunoscut) return null;
  if (cheie === "petitie") return "petitie";
  if (cheie === "544") return "informatii_publice";
  return null;
}

export type Solutie =
  | "favorabila" | "nefavorabila"
  | "comunicata" | "comunicata_partial" | "respinsa_exceptata" | "respinsa_inexistenta"
  | "redirectionata" | "clasata" | "conexata";

export const ETICHETE_SOLUTIE: Record<Solutie, string> = {
  favorabila: "Rezolvată favorabil",
  nefavorabila: "Rezolvată nefavorabil",
  comunicata: "Informația comunicată",
  comunicata_partial: "Comunicată parțial (o parte exceptată)",
  respinsa_exceptata: "Respinsă: informație exceptată",
  respinsa_inexistenta: "Respinsă: informația nu există",
  redirectionata: "Redirecționată la instituția competentă",
  clasata: "Clasată",
  conexata: "Conexată la altă cerere",
};

/** Soluțiile date prin răspunsul propriu (ieșirea), pe felul cererii. */
export const SOLUTII_LA_RASPUNS: Record<FelCerere, Solutie[]> = {
  petitie: ["favorabila", "nefavorabila"],
  informatii_publice: ["comunicata", "comunicata_partial", "respinsa_exceptata", "respinsa_inexistenta"],
};

/** Închiderile fără răspuns în fond: trimiterea la altă instituție, clasarea, conexarea. */
export type Inchidere = "redirectionata" | "clasata" | "conexata";

export const INCHIDERI: Record<Inchidere, { nume: string; ajutor: string }> = {
  redirectionata: { nume: "Redirecționează la instituția competentă", ajutor: "Se trimite în 5 zile de la înregistrare și se înștiințează solicitantul." },
  clasata: { nume: "Clasează", ajutor: "De pildă: petiție anonimă sau fără date de identificare (OG 27/2002, art. 7), ori trimisă din nou după ce s-a răspuns." },
  conexata: { nume: "Conexează la altă cerere", ajutor: "Același solicitant, aceeași problemă: se dă un singur răspuns, la cererea de bază (OG 27/2002)." },
};

export function esteInchidere(x: string): x is Inchidere {
  return x in INCHIDERI;
}

export function esteSolutieLaRaspuns(fel: FelCerere, x: string): x is Solutie {
  return (SOLUTII_LA_RASPUNS[fel] as string[]).includes(x);
}

export type TipSolicitant = "fizica" | "juridica" | "nespecificat";

export const ETICHETE_SOLICITANT: Record<TipSolicitant, string> = {
  fizica: "Persoană fizică",
  juridica: "Persoană juridică",
  nespecificat: "Nespecificat",
};

export function esteTipSolicitant(x: string): x is TipSolicitant {
  return x in ETICHETE_SOLICITANT;
}

export type SolutieReclamatie = "admisa" | "respinsa";

export const ETICHETE_RECLAMATIE: Record<SolutieReclamatie, string> = {
  admisa: "Admisă (informația se comunică)",
  respinsa: "Respinsă",
};

/** Reclamația administrativă se poate face numai după un refuz sau un răspuns parțial (Legea 544/2001, art. 21). */
export function poateAveaReclamatie(fel: FelCerere, solutie: Solutie | null): boolean {
  return fel === "informatii_publice" && (solutie === "respinsa_exceptata" || solutie === "respinsa_inexistenta" || solutie === "comunicata_partial" || solutie === null);
}

/** Refuzul se comunică în 5 zile (Legea 544/2001, art. 7 alin. (2)). */
export function refuzInTermen(pornitLa: string, solutieLa: string): boolean {
  const t = termenul("544-refuz")!;
  return solutieLa <= adaugaZile(pornitLa, t.zile, t.felZile);
}

/** Redirecționarea se face în 5 zile de la înregistrare (OG 27/2002 și normele Legii 544/2001). */
export function redirectionareInTermen(pornitLa: string, la: string): boolean {
  return la <= adaugaZile(pornitLa, 5, "calendaristice");
}

/* ---------- Rapoartele ---------- */

export type RandRaport = {
  fel: FelCerere;
  /** Data înregistrării, AAAA-LL-ZZ. */
  data: string;
  canal: "ghiseu" | "posta" | "email" | "platforma" | null;
  solicitant: TipSolicitant;
  compartiment: string | null;
  termenInitial: string;
  termen: string;
  prelungitLa: string | null;
  opritLa: string | null;
  solutie: Solutie | null;
  reclamatieLa: string | null;
  reclamatieSolutie: SolutieReclamatie | null;
  plangereInstanta: boolean;
};

export type Perioada = { de: string; pana: string; nume: string };

export function semestrul(an: number, s: 1 | 2): Perioada {
  return s === 1 ? { de: `${an}-01-01`, pana: `${an}-06-30`, nume: `semestrul I ${an}` } : { de: `${an}-07-01`, pana: `${an}-12-31`, nume: `semestrul al II-lea ${an}` };
}

export function anul(an: number): Perioada {
  return { de: `${an}-01-01`, pana: `${an}-12-31`, nume: `anul ${an}` };
}

const numara = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;

function peChei<T extends string>(xs: (T | null)[], gol: string): { cheie: string; numar: number }[] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x ?? gol, (m.get(x ?? gol) ?? 0) + 1);
  return [...m.entries()].map(([cheie, numar]) => ({ cheie, numar })).sort((a, b) => b.numar - a.numar || a.cheie.localeCompare(b.cheie));
}

const ePeHartie = (c: RandRaport["canal"]) => c === "ghiseu" || c === "posta";
const eElectronic = (c: RandRaport["canal"]) => c === "email" || c === "platforma";

/** Rândurile înregistrate în perioadă, cu situația de la sfârșitul ei (sau de azi, dacă perioada nu s-a încheiat). */
function inPerioada(randuri: RandRaport[], fel: FelCerere, p: Perioada) {
  return randuri.filter((r) => r.fel === fel && r.data >= p.de && r.data <= p.pana);
}

/**
 * Raportul petițiilor pe o perioadă (de obicei semestrul): câte au venit, cum s-au rezolvat, câte în
 * termen. Structura raportului semestrial e de confirmat de jurist pe OG 27/2002.
 */
export function raportulPetitiilor(randuri: RandRaport[], p: Perioada, azi: string) {
  const r = inPerioada(randuri, "petitie", p);
  const rezolvate = r.filter((x) => x.opritLa);
  return {
    perioada: p,
    primite: r.length,
    peCanal: { hartie: numara(r, (x) => ePeHartie(x.canal)), electronic: numara(r, (x) => eElectronic(x.canal)), nespecificat: numara(r, (x) => x.canal === null) },
    solutii: {
      favorabile: numara(r, (x) => x.solutie === "favorabila"),
      nefavorabile: numara(r, (x) => x.solutie === "nefavorabila"),
      redirectionate: numara(r, (x) => x.solutie === "redirectionata"),
      clasate: numara(r, (x) => x.solutie === "clasata"),
      conexate: numara(r, (x) => x.solutie === "conexata"),
      fara: numara(rezolvate, (x) => x.solutie === null),
    },
    rezolvateInTermen: numara(rezolvate, (x) => x.opritLa! <= x.termen),
    rezolvateDupaTermen: numara(rezolvate, (x) => x.opritLa! > x.termen),
    prelungite: numara(r, (x) => x.prelungitLa !== null),
    inLucru: numara(r, (x) => !x.opritLa),
    inLucruCuTermenDepasit: numara(r, (x) => !x.opritLa && x.termen < azi),
    peCompartimente: peChei(r.map((x) => x.compartiment), "nerepartizate"),
  };
}

/**
 * Raportul anual pe Legea 544/2001. Indicatorii urmează ce cer de obicei normele (solicitanți, canal,
 * soluții, termene, reclamații, plângeri); lista exactă din anexa normelor e de confirmat de jurist.
 */
export function raportul544(randuri: RandRaport[], p: Perioada, azi: string) {
  const r = inPerioada(randuri, "informatii_publice", p);
  const rezolvate = r.filter((x) => x.opritLa);
  const respinse = (x: RandRaport) => x.solutie === "respinsa_exceptata" || x.solutie === "respinsa_inexistenta";
  return {
    perioada: p,
    total: r.length,
    peSolicitant: { fizice: numara(r, (x) => x.solicitant === "fizica"), juridice: numara(r, (x) => x.solicitant === "juridica"), nespecificat: numara(r, (x) => x.solicitant === "nespecificat") },
    peCanal: { hartie: numara(r, (x) => ePeHartie(x.canal)), electronic: numara(r, (x) => eElectronic(x.canal)), nespecificat: numara(r, (x) => x.canal === null) },
    solutii: {
      comunicate: numara(r, (x) => x.solutie === "comunicata"),
      partial: numara(r, (x) => x.solutie === "comunicata_partial"),
      exceptate: numara(r, (x) => x.solutie === "respinsa_exceptata"),
      inexistente: numara(r, (x) => x.solutie === "respinsa_inexistenta"),
      redirectionate: numara(r, (x) => x.solutie === "redirectionata"),
      clasate: numara(r, (x) => x.solutie === "clasata" || x.solutie === "conexata"),
    },
    termene: {
      in10Zile: numara(rezolvate, (x) => x.opritLa! <= x.termenInitial),
      in30Zile: numara(rezolvate, (x) => x.opritLa! > x.termenInitial && x.opritLa! <= x.termen),
      dupaTermen: numara(rezolvate, (x) => x.opritLa! > x.termen),
      refuzuriDupa5Zile: numara(rezolvate, (x) => respinse(x) && !refuzInTermen(x.data, x.opritLa!)),
      prelungite: numara(r, (x) => x.prelungitLa !== null),
    },
    inLucru: numara(r, (x) => !x.opritLa),
    inLucruCuTermenDepasit: numara(r, (x) => !x.opritLa && x.termen < azi),
    reclamatii: {
      total: numara(r, (x) => x.reclamatieLa !== null),
      admise: numara(r, (x) => x.reclamatieSolutie === "admisa"),
      respinse: numara(r, (x) => x.reclamatieSolutie === "respinsa"),
      inLucru: numara(r, (x) => x.reclamatieLa !== null && x.reclamatieSolutie === null),
    },
    plangeriInstanta: numara(r, (x) => x.plangereInstanta),
    peCompartimente: peChei(r.map((x) => x.compartiment), "nerepartizate"),
  };
}

/* ---------- Semnăturile pe răspuns ---------- */

/**
 * Răspunsul la o petiție sau la o cerere 544 îl redactează compartimentul, îl semnează conducătorul
 * și îl contrasemnează secretarul general (așa lucrează instituția; răspunsul autorului din 20.11.2026).
 * Întoarce ce lipsește înainte ca răspunsul să plece.
 */
export function semnaturiLipsa(d: { semnatLa: string | null; contrasemnatLa: string | null }): string[] {
  const lipsa: string[] = [];
  if (!d.semnatLa) lipsa.push("semnătura conducătorului");
  if (!d.contrasemnatLa) lipsa.push("contrasemnătura secretarului general");
  return lipsa;
}
