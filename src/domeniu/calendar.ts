/**
 * Calendarul zilelor lucrătoare: sâmbăta, duminica și sărbătorile legale nu se lucrează.
 * Sărbătorile legale după Codul muncii, art. 139 alin. (1), în forma cunoscută la 20.11.2026.
 * Lista e de confirmat de jurist pe forma la zi a legii (vezi `docs/termene.md`).
 * Zilele libere „punte” date prin hotărâre de guvern nu sunt sărbători legale și nu se scad.
 */

export type Sarbatoare = { data: string; nume: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const laAmiaza = (dataIso: string) => new Date(`${dataIso}T12:00:00Z`);

/** Adaugă zile calendaristice la o dată ISO (AAAA-LL-ZZ). */
export function plusZile(dataIso: string, zile: number): string {
  const d = laAmiaza(dataIso);
  d.setUTCDate(d.getUTCDate() + zile);
  return iso(d);
}

/**
 * Duminica Paștelui ortodox, în calendarul gregorian. Algoritmul lui Meeus pentru calendarul iulian,
 * plus 13 zile (diferența dintre calendare, valabilă între 1900 și 2099).
 */
export function pasteOrtodox(an: number): string {
  if (an < 1900 || an > 2099) throw new Error("Calendarul e calculat pentru anii 1900–2099.");
  const a = an % 4;
  const b = an % 7;
  const c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31);
  const zi = ((d + e + 114) % 31) + 1;
  const iulian = `${an}-${String(luna).padStart(2, "0")}-${String(zi).padStart(2, "0")}`;
  return plusZile(iulian, 13);
}

const cache = new Map<number, Sarbatoare[]>();

/** Sărbătorile legale ale unui an, în ordine. */
export function sarbatoriLegale(an: number): Sarbatoare[] {
  const gata = cache.get(an);
  if (gata) return gata;
  const z = (ll: number, zz: number) => `${an}-${String(ll).padStart(2, "0")}-${String(zz).padStart(2, "0")}`;
  const paste = pasteOrtodox(an);
  const lista: Sarbatoare[] = [
    { data: z(1, 1), nume: "Anul Nou" },
    { data: z(1, 2), nume: "A doua zi după Anul Nou" },
    { data: z(1, 6), nume: "Botezul Domnului (Boboteaza)" },
    { data: z(1, 7), nume: "Soborul Sfântului Ioan Botezătorul" },
    { data: z(1, 24), nume: "Ziua Unirii Principatelor Române" },
    { data: plusZile(paste, -2), nume: "Vinerea Mare" },
    { data: paste, nume: "Paștele" },
    { data: plusZile(paste, 1), nume: "A doua zi de Paște" },
    { data: z(5, 1), nume: "Ziua Muncii" },
    { data: z(6, 1), nume: "Ziua Copilului" },
    { data: plusZile(paste, 49), nume: "Rusaliile" },
    { data: plusZile(paste, 50), nume: "A doua zi de Rusalii" },
    { data: z(8, 15), nume: "Adormirea Maicii Domnului" },
    { data: z(11, 30), nume: "Sfântul Andrei" },
    { data: z(12, 1), nume: "Ziua Națională a României" },
    { data: z(12, 25), nume: "Crăciunul" },
    { data: z(12, 26), nume: "A doua zi de Crăciun" },
  ];
  // Rusaliile pot cădea pe 1 iunie: rămâne o singură zi în listă, cu ambele nume.
  const unice = new Map<string, Sarbatoare>();
  for (const s of lista) {
    const exista = unice.get(s.data);
    unice.set(s.data, exista ? { data: s.data, nume: `${exista.nume}; ${s.nume}` } : s);
  }
  const rezultat = [...unice.values()].sort((x, y) => x.data.localeCompare(y.data));
  cache.set(an, rezultat);
  return rezultat;
}

/** Sărbătoarea legală din ziua dată, dacă e una. */
export function sarbatoarea(dataIso: string): Sarbatoare | undefined {
  return sarbatoriLegale(Number(dataIso.slice(0, 4))).find((s) => s.data === dataIso);
}

export function esteZiLucratoare(dataIso: string): boolean {
  const zi = laAmiaza(dataIso).getUTCDay();
  return zi !== 0 && zi !== 6 && !sarbatoarea(dataIso);
}

/** Adaugă zile lucrătoare: ziua de pornire nu se socotește; se sar sâmbetele, duminicile și sărbătorile legale. */
export function plusZileLucratoare(dataIso: string, zile: number): string {
  let d = dataIso;
  let ramase = zile;
  while (ramase > 0) {
    d = plusZile(d, 1);
    if (esteZiLucratoare(d)) ramase--;
  }
  return d;
}

/** Prima zi lucrătoare începând cu ziua dată (ea însăși, dacă se lucrează). */
export function primaZiLucratoare(dataIso: string): string {
  let d = dataIso;
  while (!esteZiLucratoare(d)) d = plusZile(d, 1);
  return d;
}
