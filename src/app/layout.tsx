import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { esteMediuDeProba, numeleInstitutiei } from "@/domeniu/mediu";
import { rolulCurent } from "@/componente/sesiune";

export const metadata: Metadata = {
  title: "Petru",
  description: "Petru — aplicația pentru primării și instituții publice",
  robots: { index: false, follow: false },
};

export default async function Radacina({ children }: { children: React.ReactNode }) {
  const rol = await rolulCurent();
  const proba = esteMediuDeProba();
  return (
    <html lang="ro">
      <body>
        {proba && <div className="banda-proba">Mediu de probă: nu introduceți date reale</div>}
        <header className="antet">
          <Link href="/" className="nume">
            Petru — {numeleInstitutiei()}
          </Link>
          <nav aria-label="Meniul principal">
            <Link href="/panou">Panou</Link>
            <Link href="/registratura">Registratura</Link>
            <Link href="/module">Modulele</Link>
          </nav>
          <span className="rol">{rol ? `Rol: ${rol.nume} (probă)` : "Neautentificat"}</span>
        </header>
        <main>{children}</main>
        {proba && (
          <Link href="/ce-lipseste" className="buton buton-ce-lipseste">
            Ce lipsește?
          </Link>
        )}
      </body>
    </html>
  );
}
