import { COMPARTIMENTE } from "@/date-proba/compartimente";
import { FORMULARE } from "@/date-proba/formulare";
import { termenul } from "@/domeniu/termene";

export default function Formulare() {
  const cuFormulare = COMPARTIMENTE.filter((c) => FORMULARE.some((f) => f.compartiment === c.cheie));
  return (
    <>
      <h1>Catalogul de formulare</h1>
      <p className="slab">
        Azi formularele se descarcă și se aduc la ghișeu. În Petru, aceleași cereri se vor completa online și vor primi
        număr de înregistrare pe loc. Termenele marcate „de confirmat” le verifică juristul.
      </p>
      {cuFormulare.map((c) => (
        <section key={c.cheie}>
          <h2>{c.nume}</h2>
          <div className="tabel-invelis">
            <table>
              <thead><tr><th>Formular</th><th>Termen de soluționare</th><th>Taxă</th></tr></thead>
              <tbody>
                {FORMULARE.filter((f) => f.compartiment === c.cheie).map((f) => {
                  const t = f.termen ? termenul(f.termen) : undefined;
                  return (
                    <tr key={f.titlu}>
                      <td>{f.titlu}</td>
                      <td>
                        {t ? `${t.zile} zile ${t.felZile}` : "—"}
                        {t?.deConfirmat && <span className="eticheta"> de confirmat</span>}
                        {t && <div className="slab">{t.temei}</div>}
                      </td>
                      <td>{f.taxa ? "Da" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
