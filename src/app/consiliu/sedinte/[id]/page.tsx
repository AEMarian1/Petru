import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { fisaSedintei, listaSedintelor, proiecteDisponibile } from "@/baza/consiliu";
import {
  areCvorum, avertizareConvocare, CONVOCARE, ETICHETE_REZULTAT, ETICHETE_SEDINTA, MAJORITATI, poateFiVotat, poatePeOrdineaDeZi, pragul, vedereaConsiliului,
} from "@/domeniu/consiliu";
import { stareaCeasului } from "@/domeniu/ceas";
import { aziInRomania } from "@/domeniu/registratura";
import { termenul } from "@/domeniu/termene";
import { dataRo } from "@/componente/format";
import { convocare, peOrdineaDeZi, prezenta, procesVerbal, vot } from "../../actiuni";
import { Mesaje } from "../../Mesaje";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function Sedinta({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ eroare?: string; atentie?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  if (!UUID.test(id)) notFound();
  const u = await cere();
  const vedere = vedereaConsiliului(u.acordari);
  if (vedere.fel !== "tot") redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const gestioneaza = u.poate("consiliu.gestioneaza");
  const date = await inEntitate(b, u.entitateId, async (tx) => {
    const f = await fisaSedintei(tx, id, vedere);
    if (!f) return null;
    return { f, disponibile: gestioneaza ? await proiecteDisponibile(tx) : [], sedinte: gestioneaza ? await listaSedintelor(tx) : [] };
  });
  if (!date) notFound();
  const { sedinta: s, ordinea, ceasPv, aprobatIn, urma } = date.f;
  const azi = aziInRomania();
  const avertizare = s.convocatLa ? avertizareConvocare(s.tip, s.convocatLa, s.data) : null;
  const cvorum = s.prezenti !== null ? areCvorum(s.prezenti, s.consilieriInFunctie) : null;
  const tinuta = s.data <= azi;
  const ulterioare = date.sedinte.filter((x) => x.data > s.data && x.data <= azi).reverse();
  const regulaPv = termenul("pv-publicare")!;
  const stPv = ceasPv ? stareaCeasului(ceasPv, azi) : null;
  const deschisa = !s.pvRedactatLa;

  return (
    <>
      <p className="slab"><Link href="/consiliu">← Consiliul local</Link></p>
      <p className="slab">Ședința {ETICHETE_SEDINTA[s.tip].toLowerCase()} · {s.consilieriInFunctie} consilieri în funcție</p>
      <h1>Ședința din {dataRo(s.data)}</h1>
      <Mesaje eroare={q.eroare} atentie={q.atentie} />
      {s.tip === "de_indata" && <p className="nota">Ședință de îndată: convocarea și materialele pleacă în aceeași zi.</p>}

      <h2>Convocarea</h2>
      <dl className="fisa">
        <dt>Convocată la</dt><dd>{s.convocatLa ? dataRo(s.convocatLa) : "neconvocată"}{s.convocare && ` — ${s.convocare}`}</dd>
        <dt>Materialele la consilieri</dt><dd>{s.materialeTrimiseLa ? `trimise la ${dataRo(s.materialeTrimiseLa)} (e-mail)` : "netrimise"}</dd>
        <dt>Termenul de convocare</dt><dd>{CONVOCARE[s.tip].zile ? `cel puțin ${CONVOCARE[s.tip].zile} zile înainte` : "de îndată"} <span className="slab">({CONVOCARE[s.tip].temei}, de confirmat)</span></dd>
      </dl>
      {avertizare && <p className="nota">{avertizare}</p>}
      {gestioneaza && deschisa && (
        <details open={!s.convocatLa}>
          <summary>{s.convocatLa ? "Schimbă convocarea" : "Scrie convocarea"}</summary>
          <form action={convocare} className="card rand-formular" style={{ marginTop: "0.5rem" }}>
            <input type="hidden" name="id" value={id} />
            <div><label htmlFor="cv-data">Convocată la</label><input id="cv-data" name="data" type="date" required defaultValue={s.convocatLa ?? azi} max={azi} /></div>
            <div style={{ flex: "1 1 14rem" }}><label htmlFor="cv-nr">Convocatorul (nr. dispoziției de convocare)</label><input id="cv-nr" name="convocare" type="text" required defaultValue={s.convocare ?? ""} /></div>
            <div><label htmlFor="cv-mat">Materialele trimise la</label><input id="cv-mat" name="materiale" type="date" defaultValue={s.materialeTrimiseLa ?? azi} max={azi} /></div>
            <button className="buton buton-mic" type="submit">Scrie</button>
          </form>
        </details>
      )}

      <h2>Prezența</h2>
      {s.prezenti !== null ? (
        <p>
          {s.prezenti} prezenți din {s.consilieriInFunctie} în funcție{" "}
          <span className={`eticheta ${cvorum ? "termen-rezolvat" : "termen-depasit"}`}>{cvorum ? "ședință statutară (cvorum)" : "fără cvorum"}</span>
          {s.presedinte && <span className="slab"> · președinte de ședință: {s.presedinte}</span>}
        </p>
      ) : <p className="slab">{tinuta ? "Prezența nu e scrisă." : "Ședința nu a avut loc încă."}</p>}
      {gestioneaza && tinuta && deschisa && (
        <form action={prezenta} className="rand-formular">
          <input type="hidden" name="id" value={id} />
          <div><label htmlFor="pz-n">Consilieri prezenți</label><input id="pz-n" name="prezenti" type="text" inputMode="numeric" required size={4} defaultValue={s.prezenti ?? ""} /></div>
          <div style={{ flex: "1 1 14rem" }}><label htmlFor="pz-p">Președintele de ședință (funcția)</label><input id="pz-p" name="presedinte" type="text" defaultValue={s.presedinte ?? "consilierul local ales președinte de ședință"} /></div>
          <button className="buton buton-mic" type="submit">Scrie prezența</button>
        </form>
      )}

      <h2>Ordinea de zi</h2>
      {ordinea.length === 0 && <p className="slab">Niciun proiect pe ordinea de zi.</p>}
      {ordinea.map((p) => {
        const stare = { ...p, rezultat: p.rezultat };
        const poateVota = poateFiVotat(stare, s.data, "aprobat");
        return (
          <section key={p.id} className="card" style={{ marginBottom: "0.8rem" }}>
            <p className="slab">Punctul {p.ordine} · proiectul nr. {p.numar}/{p.an} · {p.normativ ? "normativ" : "individual"} · {p.compartiment}</p>
            <h3><Link href={`/consiliu/proiecte/${p.id}`}>{p.titlu}</Link></h3>
            <p className="slab">
              Avize: {p.avizeDate} din {p.comisiiSesizate}{p.comisiiSesizate === 0 && " (netrimis la comisii)"}
              {p.normativ && <> · Legea 52: {p.exceptieUrgenta ? "excepție de urgență" : p.l52Termen ? `după ${dataRo(p.l52Termen)}` : "neanunțat"}</>}
            </p>
            {p.rezultat ? (
              <p>
                <strong>{ETICHETE_REZULTAT[p.rezultat]}</strong>
                {p.votPentru !== null && ` — pentru ${p.votPentru}, contra ${p.votContra}, abțineri ${p.votAbtineri}`}
                {p.numarHcl && ` · HCL nr. ${p.numarHcl}/${p.anHcl}`}
              </p>
            ) : (
              <>
                {!poateVota.da && <p className="nota">Nu se poate vota încă: {poateVota.motiv}</p>}
                {gestioneaza && tinuta && (
                  <form action={vot} className="rand-formular" style={{ marginTop: "0.5rem" }}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="sedinta" value={id} />
                    <div>
                      <label htmlFor={`rz-${p.id}`}>Rezultatul</label>
                      <select id={`rz-${p.id}`} name="rezultat" required defaultValue="">
                        <option value="" disabled>— alegeți —</option>
                        {Object.entries(ETICHETE_REZULTAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`mj-${p.id}`}>Majoritatea</label>
                      <select id={`mj-${p.id}`} name="majoritate" defaultValue="simpla">
                        {Object.entries(MAJORITATI).map(([k, v]) => <option key={k} value={k}>{v.nume}{s.prezenti !== null ? ` — prag ${pragul(k as keyof typeof MAJORITATI, s.prezenti, s.consilieriInFunctie)}` : ""}</option>)}
                      </select>
                    </div>
                    <div><label htmlFor={`vp-${p.id}`}>Pentru</label><input id={`vp-${p.id}`} name="pentru" type="text" inputMode="numeric" size={3} /></div>
                    <div><label htmlFor={`vc-${p.id}`}>Contra</label><input id={`vc-${p.id}`} name="contra" type="text" inputMode="numeric" size={3} /></div>
                    <div><label htmlFor={`va-${p.id}`}>Abțineri</label><input id={`va-${p.id}`} name="abtineri" type="text" inputMode="numeric" size={3} /></div>
                    <button className="buton buton-mic" type="submit">Scrie votul</button>
                  </form>
                )}
              </>
            )}
          </section>
        );
      })}
      {gestioneaza && deschisa && date.disponibile.length > 0 && (
        <form action={peOrdineaDeZi} className="rand-formular">
          <input type="hidden" name="sedinta" value={id} /><input type="hidden" name="inapoi" value="sedinta" />
          <div style={{ flex: "1 1 20rem" }}>
            <label htmlFor="od-p">Adaugă pe ordinea de zi</label>
            <select id="od-p" name="id" required defaultValue="">
              <option value="" disabled>— proiectul —</option>
              {date.disponibile.map((p) => {
                const v = poatePeOrdineaDeZi(p, s.data);
                return <option key={p.id} value={p.id} disabled={!v.da}>{p.numar}/{p.an} — {p.titlu}{!v.da ? ` (${v.motiv})` : ""}</option>;
              })}
            </select>
          </div>
          <button className="buton buton-mic" type="submit">Adaugă</button>
        </form>
      )}

      <h2>Procesul-verbal</h2>
      <p className="slab">Îl redactează biroul Administrație publică; îl semnează președintele de ședință și secretarul general; se aprobă în ședința următoare, apoi se afișează și se publică în {regulaPv.zile} zile {regulaPv.felZile} ({regulaPv.temei}, de confirmat de jurist).</p>
      <ul>
        <li>{s.pvRedactatLa ? `✓ redactat la ${dataRo(s.pvRedactatLa)}` : "○ neredactat"}</li>
        <li>{s.pvSemnatLa ? `✓ semnat la ${dataRo(s.pvSemnatLa)}` : "○ nesemnat"}</li>
        <li>{s.pvAprobatLa ? <>✓ aprobat în ședința din {aprobatIn ? <Link href={`/consiliu/sedinte/${aprobatIn.id}`}>{dataRo(aprobatIn.data)}</Link> : dataRo(s.pvAprobatLa)}</> : "○ neaprobat"}</li>
        <li>
          {s.pvPublicatLa ? `✓ afișat și publicat la ${dataRo(s.pvPublicatLa)}` : "○ nepublicat"}
          {ceasPv && !s.pvPublicatLa && <> — termen {dataRo(ceasPv.termen)} <span className={`eticheta termen-${stPv}`}>{stPv === "depasit" ? "depășit" : stPv === "aproape" ? "scade în curând" : "în termen"}</span></>}
          {ceasPv?.opritLa && <span className={`eticheta ${ceasPv.opritLa <= ceasPv.termen ? "termen-rezolvat" : "termen-depasit"}`}>{ceasPv.opritLa <= ceasPv.termen ? "în termen" : "după termen"}</span>}
        </li>
      </ul>
      {tinuta && !s.pvPublicatLa && (() => {
        const urmator = !s.pvRedactatLa ? "redactat" : !s.pvSemnatLa ? "semnat" : !s.pvAprobatLa ? "aprobat" : "publicat";
        const poate = urmator === "semnat" ? u.poate("documente.contrasemneaza") : gestioneaza;
        if (!poate) return null;
        if (urmator === "aprobat") {
          return ulterioare.length ? (
            <form action={procesVerbal} className="rand-formular">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="pas" value="aprobat" />
              <div>
                <label htmlFor="pv-in">Aprobat în ședința</label>
                <select id="pv-in" name="in_sedinta" required defaultValue="">
                  <option value="" disabled>— ședința următoare —</option>
                  {ulterioare.map((x) => <option key={x.id} value={x.id}>{ETICHETE_SEDINTA[x.tip]}, {dataRo(x.data)}</option>)}
                </select>
              </div>
              <button className="buton buton-mic" type="submit">Procesul-verbal e aprobat</button>
            </form>
          ) : <p className="slab">Procesul-verbal se aprobă în ședința următoare.</p>;
        }
        const nume = { redactat: "Procesul-verbal e redactat", semnat: "Procesul-verbal e semnat (președinte și secretar general)", publicat: "Procesul-verbal e afișat și publicat" }[urmator];
        return (
          <form action={procesVerbal} className="rand-formular">
            <input type="hidden" name="id" value={id} /><input type="hidden" name="pas" value={urmator} />
            <div><label htmlFor="pv-data">Data</label><input id="pv-data" name="data" type="date" required defaultValue={azi} min={s.data} max={azi} /></div>
            <button className="buton buton-mic" type="submit">{nume}</button>
          </form>
        );
      })()}

      <h2>Urma</h2>
      {urma.length === 0 ? <p className="slab">Nimic încă.</p> : (
        <ul className="jurnal">
          {urma.map((e, i) => <li key={i}><strong>{e.cand.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</strong> — {e.cine ?? "sistemul"}: {e.actiune}</li>)}
        </ul>
      )}
    </>
  );
}
