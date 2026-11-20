import { caCeas, type RandCeas } from "@/baza/ceasuri";
import { esteAsteptare, stareaAsteptarii, jaloanele, poatePrelungi, poatePropunePrelungirea, stareaCeasului, termenulPrelungit, ultimaZiDePrelungire, ziNelucratoare, zileIntre, inTermen } from "@/domeniu/ceas";
import { termenul } from "@/domeniu/termene";
import { dataRo } from "@/componente/format";
import { hotarastePrelungirea, propunePrelungireaTermenului, respingePrelungirea } from "../actiuni";

const ETICHETE_CEAS = { depasit: "Termen depășit", aproape: "Scade în curând", in_termen: "În termen", oprit: "Oprit" } as const;

/** Motivele obișnuite pentru care funcționarul cere prelungirea; se poate scrie și altul. */
const MOTIVE_PRELUNGIRE = [
  "volumul mare de documente sau informații solicitate",
  "încărcarea compartimentului în această perioadă",
  "cere o cercetare mai amănunțită sau la fața locului",
  "informația trebuie adunată din mai multe compartimente",
];

type Rand = RandCeas & { propusDeNume: string | null; prelungitDeNume: string | null };

/**
 * Ceasurile termenelor unui document: termenul, prelungirea, jaloanele și oprirea.
 * Prelungirea o propune compartimentul și o hotărăște conducătorul instituției.
 */
export function Ceasuri({ ceasuri, azi, poatePropune, poateHotari }: { ceasuri: Rand[]; azi: string; poatePropune: boolean; poateHotari: boolean }) {
  if (ceasuri.length === 0) return null;
  return (
    <>
      <h2>Ceasul termenului</h2>
      {ceasuri.map((r) => {
        const c = caCeas(r);
        const t = termenul(r.regula);
        const st = stareaCeasului(c, azi);
        const zi = ziNelucratoare(c.termen);
        const jal = jaloanele(c, azi);
        const prel = poatePrelungi(c, azi);
        const termenNou = termenulPrelungit(c);
        const ultima = ultimaZiDePrelungire(c);
        const it = inTermen(c);
        // Un termen de așteptare (Legea 52) nu se depășește: după el, actul se poate face.
        const asteapta = esteAsteptare(r.regula);
        const ast = stareaAsteptarii(c, azi);
        return (
          <section key={r.id} className="card" style={{ marginBottom: "0.8rem" }}>
            <h3>{t?.ce ?? r.regula}</h3>
            <p className="slab">
              {t ? `${t.zile} zile ${t.felZile}, ${t.temei}` : "regulă necunoscută"}
              {t?.deConfirmat && " — de confirmat de jurist"}
            </p>
            <dl className="fisa">
              <dt>Pornit la</dt><dd>{dataRo(c.pornitLa)}</dd>
              <dt>Termenul</dt>
              {asteapta ? (
                <dd>
                  {dataRo(c.termen)} <span className={`eticheta ${ast === "indeplinit" || c.opritLa ? "termen-rezolvat" : "termen-aproape"}`}>{c.opritLa ? "Oprit" : ast === "indeplinit" ? "Îndeplinit" : "În așteptare"}</span>
                  <span className="slab"> · actul se poate face numai după această zi</span>
                </dd>
              ) : (
                <dd>
                  {dataRo(c.termen)} <span className={`eticheta termen-${st === "oprit" ? "rezolvat" : st}`}>{ETICHETE_CEAS[st]}</span>
                  {st === "depasit" && <> cu {zileIntre(c.termen, azi)} zile</>}
                  {zi && !c.opritLa && <span className="slab"> · cade într-o zi nelucrătoare ({zi}); Petru nu îl mută</span>}
                </dd>
              )}
              {c.prelungitLa && (
                <>
                  <dt>Prelungit</dt>
                  <dd>
                    la {dataRo(c.prelungitLa)}{r.prelungitDeNume && `, hotărâtă de ${r.prelungitDeNume}`}, de la {dataRo(c.termenInitial)} la {dataRo(c.termen)}
                    {r.prelungireMotiv && ` — ${r.prelungireMotiv}`}
                    {r.instiintare && <span className="slab"> · înștiințare: {r.instiintare}</span>}
                  </dd>
                </>
              )}
              {c.opritLa && (
                <>
                  <dt>Oprit la</dt>
                  <dd>
                    {dataRo(c.opritLa)}{r.motivOprire && ` — ${r.motivOprire}`}{" "}
                    {!asteapta && <span className={`eticheta ${it ? "termen-rezolvat" : "termen-depasit"}`}>{it ? "în termen" : `după termen, cu ${zileIntre(c.termen, c.opritLa)} zile`}</span>}
                  </dd>
                </>
              )}
            </dl>
            {jal.length > 0 && (
              <>
                <p className="slab" style={{ marginBottom: "0.2rem" }}>Termenele intermediare, dacă e cazul:</p>
                <ul>
                  {jal.map((j) => (
                    <li key={j.cheie}>
                      <strong>până la {dataRo(j.pana)}</strong>{j.trecut && <span className="eticheta termen-depasit"> trecut</span>}: {j.ce}
                      <span className="slab"> ({j.temei}{j.deConfirmat && ", de confirmat de jurist"})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {r.prelungirePropusaLa && !c.prelungitLa && !c.opritLa && (
              <p className="nota">
                Prelungire propusă la {dataRo(r.prelungirePropusaLa)}{r.propusDeNume && ` de ${r.propusDeNume}`}: {r.prelungireMotiv}.
                {" "}Așteaptă hotărârea conducătorului{ultima && `, cel târziu la ${dataRo(ultima)}`}.
              </p>
            )}
            {poateHotari && prel.da && termenNou && (
              <form action={hotarastePrelungirea} className="rand-formular">
                <input type="hidden" name="ceas" value={r.id} />
                <div><label htmlFor={`prel-data-${r.id}`}>Prelungire hotărâtă la</label><input id={`prel-data-${r.id}`} name="data" type="date" required defaultValue={azi} min={c.pornitLa} max={ultima && ultima < azi ? ultima : azi} /></div>
                {!r.prelungirePropusaLa && <div><label htmlFor={`prel-motiv-${r.id}`}>Motivul</label><input id={`prel-motiv-${r.id}`} name="motiv" type="text" required /></div>}
                <div><label htmlFor={`prel-inst-${r.id}`}>Înștiințarea solicitantului</label><input id={`prel-inst-${r.id}`} name="instiintare" type="text" placeholder="nr. adresei de ieșire sau e-mailul" /></div>
                <button className="buton buton-mic" type="submit">Hotărăște prelungirea până la {dataRo(termenNou)}</button>
              </form>
            )}
            {poateHotari && r.prelungirePropusaLa && !c.prelungitLa && !c.opritLa && (
              <form action={respingePrelungirea} style={{ marginTop: "0.5rem" }}>
                <input type="hidden" name="ceas" value={r.id} />
                <button className="buton-text" type="submit">Nu aprob prelungirea</button>
              </form>
            )}
            {!poateHotari && poatePropune && poatePropunePrelungirea(c, r.prelungirePropusaLa, azi).da && termenNou && (
              <form action={propunePrelungireaTermenului} className="rand-formular">
                <input type="hidden" name="ceas" value={r.id} />
                <div><label htmlFor={`prel-motiv-${r.id}`}>Motivul</label><input id={`prel-motiv-${r.id}`} name="motiv" type="text" required list={`motive-${r.id}`} placeholder="alegeți sau scrieți motivul" /></div>
                <datalist id={`motive-${r.id}`}>{MOTIVE_PRELUNGIRE.map((m) => <option key={m} value={m} />)}</datalist>
                <button className="buton buton-mic" type="submit">Propune conducătorului prelungirea până la {dataRo(termenNou)}</button>
              </form>
            )}
            {(poateHotari || poatePropune) && !prel.da && !c.opritLa && t?.prelungire && <p className="slab">Prelungirea nu mai e posibilă: {prel.motiv}</p>}
          </section>
        );
      })}
    </>
  );
}
