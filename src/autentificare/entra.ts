import * as client from "openid-client";

/** Configurarea Entra ID (OpenID Connect). Numai cu toate variabilele puse; altfel intrarea Entra e ascunsă. */
export function entraConfigurat(): boolean {
  return !!(process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET && process.env.PETRU_URL);
}

let configurare: Promise<client.Configuration> | null = null;

export function configurareEntra(): Promise<client.Configuration> {
  configurare ??= client.discovery(
    new URL(`https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`),
    process.env.ENTRA_CLIENT_ID!,
    process.env.ENTRA_CLIENT_SECRET!,
  );
  return configurare;
}

export function adresaDeIntoarcere(): string {
  return new URL("/autentificare/entra/raspuns", process.env.PETRU_URL).toString();
}

export { client };
