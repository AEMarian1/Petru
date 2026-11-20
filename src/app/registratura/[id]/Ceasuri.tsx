import { caCeas, type RandCeas } from "@/baza/ceasuri";
import { jaloanele, poatePrelungi, stareaCeasului, termenulPrelungit, ultimaZiDePrelungire, ziNelucratoare, zileIntre, inTermen } from "@/domeniu/ceas";
import { termenul } from "@/domeniu/termene";
import { dataRo } from "@/componente/format";
import { prelungesteTermenul } from "../actiuni";

const ETICHETE_CEAS = { depasit: "Termen depășit", aproape: "Scade în curând", in_termen: "În termen", oprit: "Oprit" } as const;

/** Ceasurile termenelor unui document: termenul, prelungirea, jaloanele și oprirea. */
export function Ceasuri({ ceasuri, azi, poatePrelungiDreptul }: { ceasuri: RandCeas[]; azi: string; poatePrelungiDreptul: boolean }) {
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
              <dd>
                {dataRo(c.termen)} <span className={`eticheta termen-${st === "oprit" ? "rezolvat" : st}`}>{ETICHETE_CEAS[st]}</span>
                {st === "depasit" && <> cu {zileIntre(c.termen, azi)} zile</>}
                {zi && !c.opritLa && <span className="slab"> · cade într-o zi nelucrătoare ({zi}); Petru nu îl mută</span>}
              </dd>
              {c.prelungitLa && (
                <>
                  <dt>Prelungit</dt>
                  <dd>
                    la {dataRo(c.prelungitLa)}, de la {dataRo(c.termenInitial)} la {dataRo(c.termen)}
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
                    <span className={`eticheta ${it ? "termen-rezolvat" : "termen-depasit"}`}>{it ? "în termen" : `după termen, cu ${zileIntre(c.termen, c.opritLa)} zile`}</span>
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
            {poatePrelungiDreptul && prel.da && termenNou && (
              <form action={prelungesteTermenul} className="rand-formular">
                <input type="hidden" name="ceas" value={r.id} />
                <div><label htmlFor={`prel-data-${r.id}`}>Prelungire hotărâtă la</label><input id={`prel-data-${r.id}`} name="data" type="date" required defaultValue={azi} min={c.pornitLa} max={ultima && ultima < azi ? ultima : azi} /></div>
                <div><label htmlFor={`prel-motiv-${r.id}`}>Motivul</label><input id={`prel-motiv-${r.id}`} name="motiv" type="text" required placeholder="de pildă: cere o cercetare la fața locului" /></div>
                <div><label htmlFor={`prel-inst-${r.id}`}>Înștiințarea solicitantului</label><input id={`prel-inst-${r.id}`} name="instiintare" type="text" placeholder="nr. adresei de ieșire sau e-mailul" /></div>
                <button className="buton buton-mic" type="submit">Prelungește până la {dataRo(termenNou)}</button>
              </form>
            )}
            {poatePrelungiDreptul && !prel.da && !c.opritLa && t?.prelungire && <p className="slab">Prelungirea nu mai e posibilă: {prel.motiv}</p>}
          </section>
        );
      })}
    </>
  );
}
