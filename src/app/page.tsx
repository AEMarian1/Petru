import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { esteMediuDeProba } from "@/domeniu/mediu";
import { db } from "@/baza/db";
import { entitati, utilizatori } from "@/baza/schema";
import { entraConfigurat } from "@/autentificare/entra";
import { utilizatorulCurent } from "@/autentificare/utilizator";

const ERORI: Record<string, string> = {
  "fara-cont": "Contul dumneavoastră Microsoft nu are cont în Petru sau contul e oprit. Cereți-l administratorului aplicației.",
  organizatie: "Contul nu aparține organizației instituției.",
  sesiune: "Sesiunea de intrare a expirat. Încercați din nou.",
};

export default async function Intrare({ searchParams }: { searchParams: Promise<{ eroare?: string }> }) {
  if (await utilizatorulCurent()) redirect("/panou");
  const { eroare } = await searchParams;
  const baza = db();
  const proba = esteMediuDeProba();
  const conturi = baza && proba
    ? await baza
        .select({ id: utilizatori.id, nume: utilizatori.numeAfisat, functie: utilizatori.functie, entitate: entitati.nume })
        .from(utilizatori)
        .innerJoin(entitati, eq(entitati.id, utilizatori.entitateId))
        .where(eq(utilizatori.contLocal, true))
        .orderBy(asc(entitati.nume), asc(utilizatori.numeAfisat))
    : [];
  const peEntitati = [...new Set(conturi.map((c) => c.entitate))];

  return (
    <>
      <h1>Intrarea în Petru</h1>
      {eroare && ERORI[eroare] && <p className="eroare">{ERORI[eroare]}</p>}
      {entraConfigurat() && (
        <p><a className="buton" href="/autentificare/entra">Intră cu contul Microsoft al instituției</a></p>
      )}
      {!baza && <p className="nota">Baza de date nu e configurată în acest mediu.</p>}
      {proba && baza && (
        <>
          <p className="slab">Mediu de probă: alegeți un cont de probă. Toate datele sunt inventate.</p>
          {peEntitati.map((e) => (
            <section key={e}>
              <h2>{e}</h2>
              <div className="grila">
                {conturi.filter((c) => c.entitate === e).map((c) => (
                  <form key={c.id} action="/intrare" method="get" className="card">
                    <h3>{c.nume}</h3>
                    {c.functie && <p className="slab">{c.functie}</p>}
                    <input type="hidden" name="utilizator" value={c.id} />
                    <button className="buton" type="submit">Intră</button>
                  </form>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
