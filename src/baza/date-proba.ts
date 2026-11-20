import { cnpDeProba } from "./cnp-proba";

/**
 * Generatorul de date de probă. Totul e inventat și marcat ca probă.
 * Generatorul e determinist (aceeași sămânță, aceleași date), ca previzualizările să arate la fel.
 */

export function aleator(samanta: number) {
  let x = samanta >>> 0 || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return x / 0x100000000;
  };
}

const PRENUME_F = ["Ana", "Maria", "Elena", "Ioana", "Andreea", "Cristina", "Mihaela", "Daniela"];
const PRENUME_M = ["Ion", "Andrei", "Mihai", "Alexandru", "Vasile", "Gheorghe", "Florin", "Radu"];
const NUME = ["Exemplu", "Probescu", "Testeanu", "Inventatu", "Model", "Demonstrescu", "Fictivu", "Mostra"];

export type PersoanaProba = {
  tip: "fizica" | "juridica";
  nume: string;
  prenume: string | null;
  cnp: string | null;
  cui: string | null;
  adresa: string;
  telefon: string;
  email: string;
};

export function persoaneDeProba(cate: number, samanta = 2026): PersoanaProba[] {
  const r = aleator(samanta);
  const ia = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)] as T;
  const rezultat: PersoanaProba[] = [];
  for (let i = 0; i < cate; i++) {
    if (i % 5 === 4) {
      const n = `${ia(NUME)} Servicii SRL (probă)`;
      rezultat.push({ tip: "juridica", nume: n, prenume: null, cnp: null, cui: `RO99${String(100000 + i)}`, adresa: `Strada Exemplu nr. ${i + 1}, Localitatea Exemplu`, telefon: `0700 000 ${String(i).padStart(3, "0")}`, email: `firma${i}@exemplu.invalid` });
      continue;
    }
    const sex = r() < 0.5 ? "F" : "M";
    const anul = 1950 + Math.floor(r() * 55);
    rezultat.push({
      tip: "fizica",
      nume: ia(NUME),
      prenume: sex === "F" ? ia(PRENUME_F) : ia(PRENUME_M),
      cnp: cnpDeProba(sex, anul, 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 28), i + 1),
      cui: null,
      adresa: `Strada Exemplu nr. ${i + 1}, Localitatea Exemplu`,
      telefon: `0700 000 ${String(i).padStart(3, "0")}`,
      email: `persoana${i}@exemplu.invalid`,
    });
  }
  return rezultat;
}

export const TIPURI_DOCUMENTE: { tip: string; compartiment: string; zile: number }[] = [
  { tip: "Cerere de certificat de urbanism", compartiment: "urbanism", zile: 15 },
  { tip: "Petiție", compartiment: "administratie", zile: 30 },
  { tip: "Cerere de informații publice (Legea 544/2001)", compartiment: "administratie", zile: 10 },
  { tip: "Cerere de certificat de atestare fiscală", compartiment: "taxe", zile: 2 },
  { tip: "Declarație fiscală pentru clădiri", compartiment: "taxe", zile: 30 },
  { tip: "Cerere de adeverință din registrul agricol", compartiment: "agricol", zile: 10 },
  { tip: "Cerere de alocație de stat pentru copii", compartiment: "asistenta", zile: 30 },
  { tip: "Cerere de extras multilingv", compartiment: "stare-civila", zile: 10 },
];
