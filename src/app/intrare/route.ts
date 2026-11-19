import { NextResponse, type NextRequest } from "next/server";
import { esteRol } from "@/domeniu/roluri";
import { esteMediuDeProba } from "@/domeniu/mediu";
import { COOKIE_ROL } from "@/componente/sesiune";

export function GET(cerere: NextRequest) {
  // Conturile de probă sunt oprite din cod în producție.
  if (!esteMediuDeProba()) {
    return new NextResponse("Conturile de probă nu există în producție.", { status: 403 });
  }
  const rol = cerere.nextUrl.searchParams.get("rol") ?? undefined;
  if (!esteRol(rol)) return NextResponse.redirect(new URL("/", cerere.url));
  const raspuns = NextResponse.redirect(new URL("/panou", cerere.url));
  raspuns.cookies.set(COOKIE_ROL, rol, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return raspuns;
}
