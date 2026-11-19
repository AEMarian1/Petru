import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { esteMediuDeProba } from "@/domeniu/mediu";
import { deschideSesiunea } from "@/autentificare/sesiune";
import { db } from "@/baza/db";
import { jurnal, utilizatori } from "@/baza/schema";

/** Intrarea cu un cont de probă. Oprită din cod în producție; numai pentru conturile locale. */
export async function GET(cerere: NextRequest) {
  if (!esteMediuDeProba()) return new NextResponse("Conturile de probă nu există în producție.", { status: 403 });
  const baza = db();
  const id = cerere.nextUrl.searchParams.get("utilizator") ?? "";
  if (!baza || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.redirect(new URL("/", cerere.url));
  const [u] = await baza.select().from(utilizatori).where(and(eq(utilizatori.id, id), eq(utilizatori.contLocal, true), eq(utilizatori.activ, true)));
  if (!u) return NextResponse.redirect(new URL("/", cerere.url));
  await baza.insert(jurnal).values({ utilizatorId: u.id, actiune: "a intrat (cont de probă)", entitate: "utilizator", entitateId: u.id });
  await deschideSesiunea(u.id, "proba");
  return NextResponse.redirect(new URL("/panou", cerere.url));
}
