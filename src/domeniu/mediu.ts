export type Mediu = "local" | "previzualizare" | "test" | "productie";

export function mediul(): Mediu {
  const m = process.env.PETRU_MEDIU;
  return m === "previzualizare" || m === "test" || m === "productie" ? m : "local";
}

/** Numele instituției e o setare; în cod nu apare nicio localitate. */
export function numeleInstitutiei(): string {
  return process.env.PETRU_INSTITUTIE?.trim() || "Primăria Comunei Exemplu";
}

export function esteMediuDeProba(): boolean {
  return mediul() !== "productie";
}
