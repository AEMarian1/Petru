/**
 * CNP-uri de probă: au formatul și cifra de control corecte, dar codul de județ 99,
 * care nu e atribuit niciunui județ. Așa nu pot coincide cu CNP-ul unei persoane reale
 * și se recunosc imediat ca date de probă.
 */
const CHEIE = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
export const JUDET_PROBA = "99";

export function cifraDeControl(primele12: string): number {
  const suma = primele12.split("").reduce((s, c, i) => s + Number(c) * (CHEIE[i] ?? 0), 0);
  const rest = suma % 11;
  return rest === 10 ? 1 : rest;
}

export function cnpDeProba(sex: "M" | "F", anul: number, luna: number, ziua: number, nnn: number): string {
  const secol = anul >= 2000 ? (sex === "M" ? 5 : 6) : sex === "M" ? 1 : 2;
  const p = (n: number, l: number) => String(n).padStart(l, "0");
  const primele12 = `${secol}${p(anul % 100, 2)}${p(luna, 2)}${p(ziua, 2)}${JUDET_PROBA}${p(nnn, 3)}`;
  return primele12 + cifraDeControl(primele12);
}

export function esteCnpDeProba(cnp: string): boolean {
  return /^\d{13}$/.test(cnp) && cnp.slice(7, 9) === JUDET_PROBA && cifraDeControl(cnp.slice(0, 12)) === Number(cnp[12]);
}
