import { sql } from "drizzle-orm";
import type { bazaDeDate } from "./conexiune";

type Baza = ReturnType<typeof bazaDeDate>;
export type Tranzactie = Parameters<Parameters<Baza["transaction"]>[0]>[0];

/**
 * Rulează `fn` într-o tranzacție legată de o entitate: baza vede și scrie numai rândurile acelei
 * entități în tabelele izolate (documentele, importurile). Rolul „petru_aplicatie” nu poate ocoli
 * regula (migrarea 0004). Setările sunt locale tranzacției, deci sigure și prin pooler.
 */
export async function inEntitate<T>(baza: Baza, entitateId: string, fn: (tx: Tranzactie) => Promise<T>): Promise<T> {
  return baza.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('petru.entitate', ${entitateId}, true)`);
    await tx.execute(sql`SET LOCAL ROLE petru_aplicatie`);
    return fn(tx);
  });
}

/** Numai pentru scripturile de întreținere (refacerea datelor de probă): ocolește izolarea, ca proprietar. */
export async function caSistem<T>(baza: Baza, fn: (tx: Tranzactie) => Promise<T>): Promise<T> {
  return baza.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('petru.sistem', 'da', true)`);
    return fn(tx);
  });
}
