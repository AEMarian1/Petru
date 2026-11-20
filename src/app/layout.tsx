import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { esteMediuDeProba, numeleInstitutiei } from "@/domeniu/mediu";
import { utilizatorulCurent } from "@/autentificare/utilizator";

export const metadata: Metadata = {
  title: "Petru",
  description: "Petru — aplicația pentru primării și instituții publice",
  robots: { index: false, follow: false },
};

export default async function Radacina({ children }: { children: React.ReactNode }) {
  const u = await utilizatorulCurent();
  const proba = esteMediuDeProba();
  const administreaza = u && (u.poate("administrare.utilizatori") || u.poate("administrare.roluri") || u.poate("jurnal.citeste"));
  return (
    <html lang="ro">
      <body>
        {proba && <div className="banda-proba">Mediu de probă: nu introduceți date reale</div>}
        <header className="antet">
          <Link href={u ? "/panou" : "/"} className="nume">
            Petru — {u?.entitateNume ?? numeleInstitutiei()}
          </Link>
          <nav aria-label="Meniul principal">
            {u && <Link href="/panou">Panou</Link>}
            <Link href="/registratura">Registratura</Link>
            {u && (u.poate("cereri.gestioneaza") || u.poate("documente.vede_tot")) && <Link href="/cereri">Petiții și 544</Link>}
            <Link href="/consiliu">Consiliul local</Link>
            <Link href="/formulare">Formulare</Link>
            <Link href="/compartimente">Compartimente</Link>
            <Link href="/module">Modulele</Link>
            {administreaza && <Link href="/administrare">Administrare</Link>}
          </nav>
          <span className="rol">
            {u ? (
              <>
                {u.numeAfisat}
                <form action="/iesire" method="post" style={{ display: "inline", marginLeft: "0.6rem" }}>
                  <button type="submit" className="buton-text">Ieșire</button>
                </form>
              </>
            ) : (
              "Neautentificat"
            )}
          </span>
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
