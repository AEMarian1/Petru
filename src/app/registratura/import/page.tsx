import Link from "next/link";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { ultimeleImporturi } from "@/baza/registratura";
import { COLOANE, ETICHETE_CAMPURI, OBLIGATORII, type Camp } from "@/domeniu/import-registru";
import { esteMediuDeProba } from "@/domeniu/mediu";
import { FormularImport } from "./FormularImport";

const STARI_IMPORT = { verificat: "verificat, neaplicat", aplicat: "aplicat", renuntat: "renunțat" } as const;

export default async function Import() {
  const u = await cere("documente.inregistreaza");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const importuri = await inEntitate(b, u.entitateId, (tx) => ultimeleImporturi(tx));
  return (
    <>
      <p className="slab"><Link href="/registratura">← Registrul</Link></p>
      <h1>Importul registrului</h1>
      <p>
        Registrul oficial rămâne în programul de registratură. Exportați din el registrul (CSV) și încărcați-l aici:
        Petru îl verifică întâi, vă arată ce a înțeles și abia apoi, la confirmarea dumneavoastră, îl adaugă.
        Un document deja importat se actualizează după număr; mersul lui în Petru (starea, răspunsul, confirmarea) rămâne.
      </p>
      {esteMediuDeProba() && (
        <p className="nota">
          Mediu de probă: încărcați numai fișiere cu date inventate. Un exemplu: <a href="/exemple/registru-proba.csv" download>registru-proba.csv</a>.
        </p>
      )}

      <FormularImport />

      <h2>Coloanele pe care le recunoaște</h2>
      <p className="slab">Numele coloanelor se potrivesc fără diacritice și fără semne. Coloanele necunoscute se arată și se lasă deoparte.</p>
      <div className="tabel-invelis">
        <table>
          <thead><tr><th>Câmpul</th><th>Obligatoriu</th><th>Nume de coloană recunoscute</th></tr></thead>
          <tbody>
            {(Object.keys(COLOANE) as Camp[]).map((c) => (
              <tr key={c}><td>{ETICHETE_CAMPURI[c]}</td><td>{OBLIGATORII.includes(c) ? "da" : "nu"}</td><td>{COLOANE[c].join(", ")}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Importurile recente</h2>
      {importuri.length === 0 ? <p className="slab">Niciun import încă.</p> : (
        <ul>
          {importuri.map((i) => (
            <li key={i.id}>
              <Link href={`/registratura/import/${i.id}`}>{i.numeFisier}</Link> — {i.creatLa.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })} — {STARI_IMPORT[i.stare]}
              {i.stare === "aplicat" && ` (${i.noi} noi, ${i.actualizate} actualizate)`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
