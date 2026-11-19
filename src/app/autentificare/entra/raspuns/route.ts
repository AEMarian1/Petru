import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { client, configurareEntra, entraConfigurat } from "@/autentificare/entra";
import { deschideSesiunea } from "@/autentificare/sesiune";
import { db } from "@/baza/db";
import { jurnal, utilizatori } from "@/baza/schema";

/**
 * Întoarcerea de la Entra ID. Intră numai utilizatorii deja creați de administrator în Petru:
 * după identificatorul Entra (oid) sau, prima dată, după adresa de e-mail.
 */
export async function GET(cerere: NextRequest) {
  const baza = db();
  if (!entraConfigurat() || !baza) return new NextResponse("Intrarea cu Entra ID nu e configurată.", { status: 404 });
  const borcan = await cookies();
  const salvat = borcan.get("petru_entra")?.value;
  borcan.delete("petru_entra");
  if (!salvat) return NextResponse.redirect(new URL("/?eroare=sesiune", cerere.url));
  const { verificator, stare, nonce } = JSON.parse(salvat) as { verificator: string; stare: string; nonce: string };

  const config = await configurareEntra();
  const jetoane = await client.authorizationCodeGrant(config, new URL(cerere.url), {
    pkceCodeVerifier: verificator,
    expectedState: stare,
    expectedNonce: nonce,
  });
  const c = jetoane.claims();
  if (!c || c.tid !== process.env.ENTRA_TENANT_ID) return NextResponse.redirect(new URL("/?eroare=organizatie", cerere.url));
  const oid = String(c.oid ?? "");
  const email = String(c.preferred_username ?? c.email ?? "").toLowerCase();

  let [u] = await baza.select().from(utilizatori).where(eq(utilizatori.entraOid, oid));
  if (!u && email) {
    [u] = await baza.select().from(utilizatori).where(eq(utilizatori.email, email));
    if (u && !u.entraOid) await baza.update(utilizatori).set({ entraOid: oid }).where(eq(utilizatori.id, u.id));
    else if (u && u.entraOid !== oid) u = undefined;
  }
  if (!u || !u.activ) return NextResponse.redirect(new URL("/?eroare=fara-cont", cerere.url));

  await baza.update(utilizatori).set({ ultimaIntrare: new Date() }).where(eq(utilizatori.id, u.id));
  await baza.insert(jurnal).values({ utilizatorId: u.id, actiune: "a intrat (Entra ID)", entitate: "utilizator", entitateId: u.id });
  await deschideSesiunea(u.id, "entra");
  return NextResponse.redirect(new URL("/panou", cerere.url));
}
