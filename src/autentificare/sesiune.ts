import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { mediul } from "@/domeniu/mediu";

export const COOKIE_SESIUNE = "petru_sesiune";
const DURATA_ORE = 8;

function secretul(): Uint8Array {
  const s = process.env.AUTH_SECRET?.trim();
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (mediul() === "productie") throw new Error("AUTH_SECRET lipsește sau e prea scurt (minimum 32 de caractere).");
  // Numai în mediile de probă, cu date inventate: un secret fix, ca demo-ul să meargă fără setări.
  return new TextEncoder().encode("petru-mediu-de-proba-secret-fara-valoare-reala");
}

export async function deschideSesiunea(utilizatorId: string, metoda: "entra" | "proba") {
  const jeton = await new SignJWT({ m: metoda })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(utilizatorId)
    .setIssuedAt()
    .setExpirationTime(`${DURATA_ORE}h`)
    .sign(secretul());
  (await cookies()).set(COOKIE_SESIUNE, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: mediul() !== "local",
    path: "/",
    maxAge: DURATA_ORE * 3600,
  });
}

export async function inchideSesiunea() {
  (await cookies()).delete(COOKIE_SESIUNE);
}

/** Identificatorul utilizatorului din sesiune, sau null. */
export async function utilizatorulDinSesiune(): Promise<string | null> {
  const jeton = (await cookies()).get(COOKIE_SESIUNE)?.value;
  if (!jeton) return null;
  try {
    const { payload } = await jwtVerify(jeton, secretul(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
