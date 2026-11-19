import { cookies } from "next/headers";
import { esteRol, ROLURI, type Rol } from "@/domeniu/roluri";

export const COOKIE_ROL = "petru_rol_proba";

/** Rolul de probă ales la intrare. Numai în mediile de probă; în producție intrarea e cu Entra ID. */
export async function rolulCurent(): Promise<{ cheie: Rol; nume: string } | null> {
  const valoare = (await cookies()).get(COOKIE_ROL)?.value;
  return esteRol(valoare) ? { cheie: valoare, nume: ROLURI[valoare] } : null;
}
