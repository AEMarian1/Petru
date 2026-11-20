export type Mediu = "local" | "previzualizare" | "test" | "productie";

export function mediul(): Mediu {
  const m = process.env.PETRU_MEDIU;
  return m === "previzualizare" || m === "test" || m === "productie" ? m : "local";
}

/** Setarea instituției: numele, localitatea și județul vin din mediu; în cod nu apare nicio localitate. */
export function setareaInstitutiei(): { nume: string; localitate: string; judet: string } {
  return {
    nume: process.env.PETRU_INSTITUTIE?.trim() || "Primăria Comunei Exemplu",
    localitate: process.env.PETRU_LOCALITATE?.trim() || "Exemplu",
    judet: process.env.PETRU_JUDET?.trim() || "Județul Exemplu",
  };
}

export function numeleInstitutiei(): string {
  return setareaInstitutiei().nume;
}

export function esteMediuDeProba(): boolean {
  return mediul() !== "productie";
}
