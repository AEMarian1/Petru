import Link from "next/link";
import type { fisaCererii } from "@/baza/cereri";
import { poateTrece, type Stare } from "@/domeniu/drumul-actului";
import { ETICHETE_RECLAMATIE, ETICHETE_SOLICITANT, ETICHETE_SOLUTIE, FELURI, INCHIDERI, poateAveaReclamatie, redirectionareInTermen, type Inchidere } from "@/domeniu/cereri";
import { ETICHETE_EXPEDIERE } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";
import { inchideCerereaFaraRaspuns, noteazaPlangerea, scrieReclamatia, scrieSolutiaReclamatiei, stabilesteFelulCererii } from "@/app/cereri/actiuni";

type Fisa = NonNullable<Awaited<ReturnType<typeof fisaCererii>>>;

export type DrepturiCerere = { felul: boolean; inchideri: Inchidere[]; reclamatia: boolean };

/** Petiția sau cererea 544: felul, soluția, închiderile fără răspuns în fond și reclamația administrativă. */
export function Cererea(p: { docId: string; stare: Stare; dataInregistrare: string; fisa: Fisa | null; azi: string; drepturi: DrepturiCerere; anul: number }) {
  const { fisa, drepturi, azi } = p;
  const c = fisa?.cerere ?? null;
  const deschisa = c ? !c.solutie : true;
  const poateInchide = !!c && deschisa && poateTrece(p.stare, "arhivat");

  return (
    <>
      <h2>{c ? FELURI[c.fel].registru : "Petiție sau cerere de informații publice?"}</h2>
      {c ? (
        <dl className="fisa">
          <dt>Felul</dt><dd>{FELURI[c.fel].nume} ({FELURI[c.fel].temei}) · <Link href={`/cereri?fel=${c.fel}`}>registrul</Link></dd>
          <dt>Solicitantul</dt><dd>{ETICHETE_SOLICITANT[c.solicitant]}</dd>
          <dt>Soluția</dt>
          <dd>
            {c.solutie ? <>{ETICHETE_SOLUTIE[c.solutie]}{c.solutieLa && `, la ${dataRo(c.solutieLa)}`}{c.solutieMotiv && ` — ${c.solutieMotiv}`}</> : "încă nu"}
            {c.solutie === "redirectionata" && c.solutieLa && !redirectionareInTermen(p.dataInregistrare, c.solutieLa) && <> <span className="eticheta termen-depasit">după cele 5 zile</span></>}
          </dd>
          {c.redirectionatCatre && (<><dt>Trimisă la</dt><dd>{c.redirectionatCatre}</dd></>)}
          {fisa!.baza && (<><dt>Conexată la</dt><dd><Link href={`/registratura/${fisa!.baza.docId}`}>nr. {fisa!.baza.numar}/{fisa!.baza.an}</Link> (se răspunde acolo)</dd></>)}
          {fisa!.conexate.length > 0 && (
            <><dt>Cereri conexate</dt><dd>{fisa!.conexate.map((x, i) => <span key={x.docId}>{i > 0 && ", "}<Link href={`/registratura/${x.docId}`}>nr. {x.numar}/{x.an}</Link></span>)} — primesc același răspuns</dd></>
          )}
          {c.reclamatieLa && (
            <>
              <dt>Reclamația administrativă</dt>
              <dd>
                primită la {dataRo(c.reclamatieLa)}{c.reclamatieNumar && `, nr. ${c.reclamatieNumar}`}
                {c.reclamatieSolutie ? ` · ${ETICHETE_RECLAMATIE[c.reclamatieSolutie]}${c.reclamatieSolutieLa ? `, la ${dataRo(c.reclamatieSolutieLa)}` : ""}` : " · fără soluție încă"}
              </dd>
            </>
          )}
          {c.plangereInstanta && (<><dt>În instanță</dt><dd>solicitantul a făcut plângere (Legea 544/2001, art. 22)</dd></>)}
        </dl>
      ) : (
        <p className="slab">Documentul nu e în registrele petițiilor sau ale cererilor 544. Dacă este una dintre ele, stabiliți felul: termenul se socotește după legea ei.</p>
      )}

      {drepturi.felul && deschisa && (
        <form action={stabilesteFelulCererii} className="card rand-formular" style={{ marginBottom: "0.8rem" }}>
          <input type="hidden" name="id" value={p.docId} />
          <div>
            <label htmlFor="fel">Felul</label>
            <select id="fel" name="fel" defaultValue={c?.fel ?? "petitie"}>
              <option value="petitie">Petiție (OG 27/2002)</option>
              <option value="informatii_publice">Cerere de informații publice (Legea 544/2001)</option>
              {c && <option value="niciuna">Nu e cerere: scoate din registre</option>}
            </select>
          </div>
          <div>
            <label htmlFor="solicitant">Solicitantul</label>
            <select id="solicitant" name="solicitant" defaultValue={c?.solicitant ?? "nespecificat"}>
              {Object.entries(ETICHETE_SOLICITANT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button className="buton buton-mic" type="submit">{c ? "Schimbă" : "Stabilește felul"}</button>
        </form>
      )}

      {poateInchide && drepturi.inchideri.length > 0 && (
        <div className="pasi">
          {drepturi.inchideri.includes("redirectionata") && (
            <form action={inchideCerereaFaraRaspuns} className="card rand-formular">
              <input type="hidden" name="id" value={p.docId} />
              <input type="hidden" name="inchidere" value="redirectionata" />
              <p className="slab" style={{ width: "100%", margin: 0 }}>{INCHIDERI.redirectionata.ajutor}</p>
              <div><label htmlFor="catre">Instituția competentă</label><input id="catre" name="catre" type="text" required /></div>
              <div><label htmlFor="red-data">Data</label><input id="red-data" name="data" type="date" required defaultValue={azi} max={azi} /></div>
              <div><label htmlFor="red-nr">Nr. de ieșire (opțional)</label><input id="red-nr" name="numar" type="text" inputMode="numeric" /></div>
              <div>
                <label htmlFor="red-mod">Cum a plecat</label>
                <select id="red-mod" name="mod" defaultValue="email">
                  {Object.entries(ETICHETE_EXPEDIERE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label htmlFor="red-motiv">Mențiune</label><input id="red-motiv" name="motiv" type="text" placeholder="solicitantul a fost înștiințat" /></div>
              <button className="buton buton-mic" type="submit">{INCHIDERI.redirectionata.nume}</button>
            </form>
          )}
          {drepturi.inchideri.includes("conexata") && (
            <form action={inchideCerereaFaraRaspuns} className="card rand-formular">
              <input type="hidden" name="id" value={p.docId} />
              <input type="hidden" name="inchidere" value="conexata" />
              <p className="slab" style={{ width: "100%", margin: 0 }}>{INCHIDERI.conexata.ajutor}</p>
              <div><label htmlFor="cx-nr">Nr. cererii de bază</label><input id="cx-nr" name="conexat_numar" type="text" inputMode="numeric" required /></div>
              <div><label htmlFor="cx-an">Anul</label><input id="cx-an" name="conexat_an" type="text" inputMode="numeric" required defaultValue={String(p.anul)} /></div>
              <div><label htmlFor="cx-data">Data</label><input id="cx-data" name="data" type="date" required defaultValue={azi} max={azi} /></div>
              <button className="buton buton-mic" type="submit">{INCHIDERI.conexata.nume}</button>
            </form>
          )}
          {drepturi.inchideri.includes("clasata") && (
            <form action={inchideCerereaFaraRaspuns} className="card rand-formular">
              <input type="hidden" name="id" value={p.docId} />
              <input type="hidden" name="inchidere" value="clasata" />
              <p className="slab" style={{ width: "100%", margin: 0 }}>{INCHIDERI.clasata.ajutor}</p>
              <div><label htmlFor="cl-motiv">Motivul</label><input id="cl-motiv" name="motiv" type="text" required /></div>
              <div><label htmlFor="cl-data">Data</label><input id="cl-data" name="data" type="date" required defaultValue={azi} max={azi} /></div>
              <button className="buton-text" type="submit">{INCHIDERI.clasata.nume}</button>
            </form>
          )}
        </div>
      )}

      {c && drepturi.reclamatia && !c.reclamatieLa && poateAveaReclamatie(c.fel, c.solutie) && (c.solutie !== null || p.stare !== "inregistrat") && (
        <form action={scrieReclamatia} className="card rand-formular" style={{ marginTop: "0.8rem" }}>
          <input type="hidden" name="id" value={p.docId} />
          <p className="slab" style={{ width: "100%", margin: 0 }}>Reclamația administrativă (Legea 544/2001, art. 21): după un refuz, un răspuns parțial sau lipsa răspunsului. Pornește un ceas de 15 zile.</p>
          <div><label htmlFor="rec-data">Primită la</label><input id="rec-data" name="data" type="date" required defaultValue={azi} max={azi} /></div>
          <div><label htmlFor="rec-nr">Nr. de înregistrare</label><input id="rec-nr" name="numar" type="text" /></div>
          <button className="buton buton-mic" type="submit">Scrie reclamația</button>
        </form>
      )}
      {c && drepturi.reclamatia && c.reclamatieLa && !c.reclamatieSolutie && (
        <form action={scrieSolutiaReclamatiei} className="card rand-formular" style={{ marginTop: "0.8rem" }}>
          <input type="hidden" name="id" value={p.docId} />
          <div>
            <label htmlFor="rec-sol">Soluția reclamației</label>
            <select id="rec-sol" name="solutie" required defaultValue="">
              <option value="" disabled>— alegeți —</option>
              {Object.entries(ETICHETE_RECLAMATIE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label htmlFor="rec-sol-data">Data</label><input id="rec-sol-data" name="data" type="date" required defaultValue={azi} max={azi} /></div>
          <div><label htmlFor="rec-pl">Plângere în instanță</label><select id="rec-pl" name="plangere" defaultValue="nu"><option value="nu">nu</option><option value="da">da</option></select></div>
          <button className="buton buton-mic" type="submit">Scrie soluția</button>
        </form>
      )}
      {c && drepturi.reclamatia && c.fel === "informatii_publice" && !c.plangereInstanta && (poateAveaReclamatie(c.fel, c.solutie) || c.reclamatieSolutie === "respinsa") && (c.solutie || c.reclamatieSolutie) && (
        <form action={noteazaPlangerea} style={{ marginTop: "0.6rem" }}>
          <input type="hidden" name="id" value={p.docId} />
          <button className="buton-text" type="submit">Notează o plângere în instanță</button>
        </form>
      )}
    </>
  );
}
