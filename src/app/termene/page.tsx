import { sarbatoriLegale } from "@/domeniu/calendar";
import { TERMENE } from "@/domeniu/termene";
import { aziInRomania } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";

const ZILE = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];

/** Regulile ceasului termenelor și calendarul zilelor nelucrătoare, ca să le poată verifica oricine (și juristul). */
export default async function Termene({ searchParams }: { searchParams: Promise<{ an?: string }> }) {
  const p = await searchParams;
  const azi = aziInRomania();
  const cerut = Number(p.an);
  const an = Number.isInteger(cerut) && cerut >= 1900 && cerut <= 2099 ? cerut : Number(azi.slice(0, 4));
  return (
    <>
      <h1>Ceasul termenelor</h1>
      <p className="slab">
        Termenele se socotesc de la data înregistrării, fără ziua de pornire. La zilele lucrătoare se sar sâmbetele, duminicile și
        sărbătorile legale. Un termen în zile calendaristice care cade într-o zi nelucrătoare nu se mută: Petru arată termenul strict
        și o notă. Regulile marcate „de confirmat” se verifică de jurist pe forma la zi a legii.
      </p>

      <h2>Regulile</h2>
      <div className="tabel-invelis">
        <table>
          <thead><tr><th>Ce</th><th>Termenul</th><th>Prelungirea</th><th>Termene intermediare</th><th>Temeiul</th></tr></thead>
          <tbody>
            {TERMENE.map((t) => (
              <tr key={t.cheie}>
                <td>{t.ce}</td>
                <td>{t.zile} zile {t.felZile}</td>
                <td>
                  {t.prelungire ? (
                    <>
                      +{t.prelungire.zileInPlus} zile, {t.prelungire.panaLa === "inainte_de_termen" ? "hotărâtă înainte de termen" : `anunțată în primele ${t.prelungire.panaLa.inZile} zile`}
                      <span className="slab"> · {t.prelungire.conditie}</span>
                    </>
                  ) : <span className="slab">nu</span>}
                </td>
                <td>{t.jaloane?.length ? t.jaloane.map((j) => <div key={j.cheie}>{j.zile} zile: {j.ce}{j.deConfirmat && <span className="slab"> (de confirmat)</span>}</div>) : <span className="slab">—</span>}</td>
                <td>{t.temei}{t.deConfirmat ? <> <span className="eticheta termen-aproape">de confirmat</span></> : <> <span className="eticheta">citat în cercetare</span></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Sărbătorile legale {an}</h2>
      <p className="slab">Codul muncii, art. 139 (de confirmat de jurist). Paștele și Rusaliile se calculează după calendarul ortodox.</p>
      <form className="rand-formular" method="get">
        <div><label htmlFor="an">Anul</label><input id="an" name="an" type="text" inputMode="numeric" defaultValue={String(an)} size={5} /></div>
        <button className="buton" type="submit">Arată</button>
      </form>
      <div className="tabel-invelis">
        <table>
          <tbody>
            {sarbatoriLegale(an).map((s) => (
              <tr key={s.data}><td>{dataRo(s.data)}</td><td>{ZILE[new Date(`${s.data}T12:00:00Z`).getUTCDay()]}</td><td>{s.nume}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
