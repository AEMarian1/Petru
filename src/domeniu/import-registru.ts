/**
 * Importul registrului de intrare-ieșire din exportul CSV al programului de registratură folosit azi
 * (SOBIS). Registrul oficial rămâne acolo; Petru citește exportul și adaugă urmărirea: unde e actul,
 * termenele, răspunsul, expedierea și confirmarea de primire.
 *
 * Coloanele exacte ale exportului nu sunt încă cunoscute. Potrivirea se face după numele coloanelor,
 * cu sinonime (`COLOANE`); când se află coloanele exacte, se adaugă aici, fără alte schimbări.
 * Partea aceasta e pură (fără bază), ca să poată fi testată.
 */

export type Camp =
  | "numar"
  | "data"
  | "emitent"
  | "continut"
  | "compartiment"
  | "termen"
  | "tip"
  | "directie"
  | "canal"
  | "laNumar"
  | "destinatar";

export const ETICHETE_CAMPURI: Record<Camp, string> = {
  numar: "Numărul de înregistrare",
  data: "Data înregistrării",
  emitent: "Emitentul",
  continut: "Conținutul pe scurt",
  compartiment: "Compartimentul repartizat",
  termen: "Termenul",
  tip: "Tipul documentului",
  directie: "Intrare / ieșire",
  canal: "Cum a intrat",
  laNumar: "Răspuns la nr.",
  destinatar: "Destinatarul",
};

export const OBLIGATORII: readonly Camp[] = ["numar", "data", "emitent", "continut"];

/** Sinonimele numelor de coloane, scrise fără diacritice, cu litere mici și fără semne. */
export const COLOANE: Record<Camp, readonly string[]> = {
  numar: ["nr", "numar", "nr inregistrare", "numar inregistrare", "nr inreg", "nr document", "numar document"],
  data: ["data", "data inregistrare", "data inregistrarii", "data inreg", "data document"],
  emitent: ["emitent", "petent", "expeditor", "de la", "solicitant", "emitent petent"],
  continut: ["continut", "obiect", "rezumat", "continut pe scurt", "descriere", "subiect"],
  compartiment: ["compartiment", "repartizat", "repartizat la", "compartiment repartizat", "birou", "serviciu"],
  termen: ["termen", "termen raspuns", "termen de raspuns", "data limita"],
  tip: ["tip", "tip document", "categorie"],
  directie: ["directie", "intrare iesire", "tip inregistrare", "sens"],
  canal: ["canal", "mod primire", "cum a intrat", "sursa", "mod de primire"],
  laNumar: ["la nr", "raspuns la", "raspuns la nr", "nr intrare", "conex", "conexat la", "legat de"],
  destinatar: ["destinatar", "catre", "trimis catre"],
};

/** Scoate diacriticele, semnele și spațiile în plus, pentru potrivirea numelor de coloane. */
export function normalizeaza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Desparte textul CSV în rânduri și celule. Recunoaște ghilimelele, BOM-ul și separatorul „;” sau „,”. */
export function citesteCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const primaLinie = t.slice(0, t.search(/\r?\n|$/));
  const separator = (primaLinie.match(/;/g)?.length ?? 0) >= (primaLinie.match(/,/g)?.length ?? 0) ? ";" : ",";
  const randuri: string[][] = [];
  let rand: string[] = [];
  let celula = "";
  let inGhilimele = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (inGhilimele) {
      if (c === '"') {
        if (t[i + 1] === '"') { celula += '"'; i++; } else inGhilimele = false;
      } else celula += c;
    } else if (c === '"') inGhilimele = true;
    else if (c === separator) { rand.push(celula); celula = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      rand.push(celula); celula = "";
      if (rand.some((x) => x.trim() !== "")) randuri.push(rand);
      rand = [];
    } else celula += c;
  }
  rand.push(celula);
  if (rand.some((x) => x.trim() !== "")) randuri.push(rand);
  return randuri;
}

export type Potrivire = { campuri: Partial<Record<Camp, number>>; ignorate: string[]; lipsa: Camp[] };

/** Potrivește antetul exportului cu câmpurile lui Petru. */
export function potrivesteColoanele(antet: string[]): Potrivire {
  const campuri: Partial<Record<Camp, number>> = {};
  const ignorate: string[] = [];
  antet.forEach((nume, i) => {
    const n = normalizeaza(nume);
    const camp = (Object.keys(COLOANE) as Camp[]).find((c) => campuri[c] === undefined && COLOANE[c].includes(n));
    if (camp) campuri[camp] = i;
    else if (nume.trim()) ignorate.push(nume.trim());
  });
  return { campuri, ignorate, lipsa: OBLIGATORII.filter((c) => campuri[c] === undefined) };
}

/** Data din export: ZZ.LL.AAAA, ZZ/LL/AAAA, ZZ-LL-AAAA sau AAAA-LL-ZZ (eventual cu oră). Întoarce AAAA-LL-ZZ. */
export function citesteData(s: string): string | null {
  const t = s.trim();
  let a: number, l: number, z: number;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  if (m) { a = +m[1]!; l = +m[2]!; z = +m[3]!; }
  else {
    m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s.*)?$/);
    if (!m) return null;
    z = +m[1]!; l = +m[2]!; a = +m[3]!;
  }
  const d = new Date(Date.UTC(a, l - 1, z));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== l - 1 || d.getUTCDate() !== z) return null;
  return d.toISOString().slice(0, 10);
}

/** Numărul de înregistrare: „1234”, „1234/2026” sau „nr. 1234”. */
export function citesteNumar(s: string): number | null {
  const m = s.trim().match(/^(?:nr\.?\s*)?(\d{1,9})(?:\s*\/.*)?$/i);
  return m ? Number(m[1]) : null;
}

export type Directie = "intrare" | "iesire" | "intern";
export type Canal = "ghiseu" | "posta" | "email" | "platforma";

export const ETICHETE_CANAL: Record<Canal, string> = {
  ghiseu: "La ghișeu",
  posta: "Poștă sau curier",
  email: "E-mail",
  platforma: "Platformă online",
};

export function citesteDirectia(s: string): Directie | null {
  const n = normalizeaza(s);
  if (!n) return "intrare";
  if (["intrare", "i", "in", "intrat"].includes(n)) return "intrare";
  if (["iesire", "e", "out", "iesit"].includes(n)) return "iesire";
  if (["intern", "interna"].includes(n)) return "intern";
  return null;
}

export function citesteCanalul(s: string): Canal | null {
  const n = normalizeaza(s);
  if (!n) return null;
  if (/ghiseu|personal|registratura/.test(n)) return "ghiseu";
  if (/posta|curier|recomandat/.test(n)) return "posta";
  if (/e ?mail|mail/.test(n)) return "email";
  if (/platform|online|portal|ghiseul|pcu|web/.test(n)) return "platforma";
  return null;
}

export type RandImportat = {
  rand: number;
  numar: number;
  an: number;
  data: string;
  emitent: string;
  continut: string;
  compartiment: string | null;
  termen: string | null;
  tip: string | null;
  directie: Directie;
  canal: Canal | null;
  laNumar: number | null;
  destinatar: string | null;
};

export type EroareRand = { rand: number; mesaj: string };

export type Rezultat = { potrivire: Potrivire; randuri: RandImportat[]; erori: EroareRand[] };

const MAX_RANDURI = 20_000;

/** Citește tot exportul: antetul, potrivirea coloanelor și fiecare rând, cu erorile pe rânduri. */
export function citesteExportul(text: string): Rezultat {
  const toate = citesteCsv(text);
  const antet = toate[0] ?? [];
  const potrivire = potrivesteColoanele(antet);
  const randuri: RandImportat[] = [];
  const erori: EroareRand[] = [];
  if (potrivire.lipsa.length) return { potrivire, randuri, erori };
  if (toate.length - 1 > MAX_RANDURI) {
    erori.push({ rand: 0, mesaj: `Fișierul are peste ${MAX_RANDURI} de rânduri; împărțiți exportul pe luni.` });
    return { potrivire, randuri, erori };
  }
  const c = potrivire.campuri;
  const ia = (r: string[], k: Camp) => (c[k] === undefined ? "" : (r[c[k]!] ?? "").trim());
  const vazute = new Set<string>();
  toate.slice(1).forEach((r, i) => {
    const nr = i + 2; // rândul din fișier, cu antetul pe rândul 1
    const numar = citesteNumar(ia(r, "numar"));
    const data = citesteData(ia(r, "data"));
    const emitent = ia(r, "emitent");
    const continut = ia(r, "continut");
    const directie = citesteDirectia(ia(r, "directie"));
    const termenText = ia(r, "termen");
    const termen = termenText ? citesteData(termenText) : null;
    const laText = ia(r, "laNumar");
    const laNumar = laText ? citesteNumar(laText) : null;
    const probleme: string[] = [];
    if (numar === null) probleme.push("numărul lipsește sau nu e număr");
    if (!data) probleme.push("data lipsește sau nu e o dată");
    if (!emitent && directie !== "iesire") probleme.push("emitentul lipsește");
    if (!continut) probleme.push("conținutul lipsește");
    if (directie === null) probleme.push(`direcția „${ia(r, "directie")}” nu e intrare, ieșire sau intern`);
    if (termenText && !termen) probleme.push("termenul nu e o dată");
    if (laText && laNumar === null) probleme.push("„răspuns la nr.” nu e un număr");
    if (probleme.length) { erori.push({ rand: nr, mesaj: probleme.join("; ") }); return; }
    const an = Number(data!.slice(0, 4));
    const cheie = `${an}/${numar}`;
    if (vazute.has(cheie)) { erori.push({ rand: nr, mesaj: `numărul ${numar}/${an} apare de două ori în fișier` }); return; }
    vazute.add(cheie);
    randuri.push({
      rand: nr,
      numar: numar!,
      an,
      data: data!,
      emitent: emitent.slice(0, 300),
      continut: continut.slice(0, 2000),
      compartiment: ia(r, "compartiment") || null,
      termen,
      tip: ia(r, "tip") || null,
      directie: directie!,
      canal: citesteCanalul(ia(r, "canal")),
      laNumar,
      destinatar: ia(r, "destinatar") || null,
    });
  });
  return { potrivire, randuri, erori };
}

/** Găsește compartimentul după numele din export (fără diacritice, după nume sau cheie). */
export function gasesteCompartimentul<T extends { id: string; nume: string; cheie: string }>(text: string | null, compartimente: readonly T[]): T | null {
  if (!text) return null;
  const n = normalizeaza(text);
  return (
    compartimente.find((c) => normalizeaza(c.nume) === n || normalizeaza(c.cheie) === n) ??
    compartimente.find((c) => normalizeaza(c.nume).includes(n) || n.includes(normalizeaza(c.nume))) ??
    null
  );
}
