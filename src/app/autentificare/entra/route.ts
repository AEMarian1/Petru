import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adresaDeIntoarcere, client, configurareEntra, entraConfigurat } from "@/autentificare/entra";

/** Pornește intrarea cu contul Microsoft (Entra ID), cu PKCE, state și nonce. */
export async function GET() {
  if (!entraConfigurat()) return new NextResponse("Intrarea cu Entra ID nu e configurată.", { status: 404 });
  const config = await configurareEntra();
  const verificator = client.randomPKCECodeVerifier();
  const stare = client.randomState();
  const nonce = client.randomNonce();
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: adresaDeIntoarcere(),
    scope: "openid profile email",
    code_challenge: await client.calculatePKCECodeChallenge(verificator),
    code_challenge_method: "S256",
    state: stare,
    nonce,
  });
  (await cookies()).set("petru_entra", JSON.stringify({ verificator, stare, nonce }), {
    httpOnly: true, sameSite: "lax", secure: true, path: "/autentificare", maxAge: 600,
  });
  return NextResponse.redirect(url);
}
