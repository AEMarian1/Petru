import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { comisiileEntitatii, fisaProiectului, listaSedintelor } from "@/baza/consiliu";
import { ceasurileDocumentului } from "@/baza/ceasuri";
import {
  conditiaL52, ETICHETE_AVIZ, ETICHETE_INITIATOR, ETICHETE_SEDINTA, MAJORITATI, pasiiProiectului, semnaturiHotarareLipsa, stadiul, vedereaConsiliului,
} from "@/domeniu/consiliu";
import { poatePublica } from "@/domeniu/drumul-actului";
import { aziInRomania, ETICHETE_EXPEDIERE } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";
import { Ceasuri } from "@/app/registratura/[id]/Ceasuri";
import {
  analizeaza, anunta, aviz, exceptie, peOrdineaDeZi, poarta, prefect, primitLaPrefect, propunere, scoateDePeOrdine, scoateSesizarea, scrieMaterial, semneaza, sesizeaza,
} from "../../actiuni";
import { Mesaje } from "../../Mesaje";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function Data({ id, azi, min }: { id?: string; azi: string; min?: string }) {
  return <input id={id} name="data" type="date" required defaultValue={azi} max={azi} min={min} aria-label={id ? undefined : "Data"} />;
}

export default async function FisaProiectului({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ eroare?: string; atentie?: string }> }) {
  const { id } = await params;
  const q = await searchParams;
  if (!UUID.test(id)) notFound();
  const u = await cere();
  const vedere = vedereaConsiliului(u.acordari);
  if (vedere.fel === "nimic") redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const date = await inEntitate(b, u.entitateId, async (tx) => {
    const p = await fisaProiectului(tx, id, vedere);
    if (!p) return null;
    return { p, ceasuri: await ceasurileDocumentului(tx, p.rand.documentId), comisii: await comisiileEntitatii(tx), sedinte: await listaSedintelor(tx) };
  });
  if (!date) notFound();
  const { p } = date;
  const r = p.rand;
  const azi = aziInRomania();
  const gestioneaza = u.poate("consiliu.gestioneaza");
  const secretar = u.poate("documente.contrasemneaza");
  const deschis = !p.rezultat;
  const emisa = p.stare === "emis" || p.stare === "publicat";
  const pasi = pasiiProiectului({ ...p, comisiiSesizate: p.comisiiSesizate, emisa, comunicatPrefect: !!p.prefectNumar, publicat: !!p.publicatLa });
  const urmatorul = pasi.findIndex((x) => !x.facut);
  const sesizate = new Set(p.avize.map((a) => a.comisieId));
  const deSesizat = date.comisii.filter((c) => !sesizate.has(c.id));
  const sedinteDeschise = date.sedinte.filter((s) => !s.pvRedactatLa).reverse();
  const l52 = conditiaL52(p, azi);
  const lipsaSemnaturi = semnaturiHotarareLipsa(p);
  const gata = poatePublica({ stare: p.stare, aprobatDe: r.publicareAprobataDe, copieAnonimizata: !!r.copieAnonimizataLa });
  const raportul = gestioneaza || u.poate("documente.rezolva", p.compartimentId);

  return (
    <>
      <p className="slab"><Link href="/consiliu">← Consiliul local</Link></p>
      <p className="slab">
        Proiectul nr. {p.numar}/{p.an} · înregistrat cu nr. <Link href={`/registratura/${r.documentId}`}>{p.numarInregistrare}/{p.an}</Link> din {dataRo(p.dataInregistrare.toISOString())}
        {" "}· {p.normativ ? "normativ" : "individual"} · inițiator: {ETICHETE_INITIATOR[p.initiator]}
      </p>
      <h1>{p.titlu}</h1>
      <Mesaje eroare={q.eroare} atentie={q.atentie} />
      <p>
        <span className="eticheta">{stadiul({ ...p, emisa, comunicatPrefect: !!p.prefectNumar, publicat: !!p.publicatLa })}</span>
        {p.numarHcl && <> <strong>Hotărârea nr. {p.numarHcl}/{p.anHcl}</strong> din {dataRo(p.rezultatLa!)}</>}
      </p>

      <ol className="drum" aria-label="Pașii proiectului">
        {pasi.map((x, i) => <li key={x.cheie} className={x.facut ? "facut" : i === urmatorul ? "acum" : ""}>{x.nume}</li>)}
      </ol>

      <h2>Materialele</h2>
      <dl className="fisa">
        <dt>Compartimentul de specialitate</dt><dd>{p.compartiment}</dd>
        <dt>Referatul de aprobare</dt>
        <dd>
          {p.referatLa ? dataRo(p.referatLa) : "lipsește"}
          {!p.referatLa && deschis && (u.poate("consiliu.initiaza") || gestioneaza) && (
            <form action={scrieMaterial} className="rand-formular"><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="referat" /><Data azi={azi} /><button className="buton buton-mic" type="submit">Referatul e semnat</button></form>
          )}
        </dd>
        <dt>Raportul de specialitate</dt>
        <dd>
          {p.raportLa ? dataRo(p.raportLa) : <span className="eticheta termen-aproape">lipsește</span>}
          {!p.raportLa && deschis && raportul && (
            <form action={scrieMaterial} className="rand-formular"><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="raport" /><Data azi={azi} /><button className="buton buton-mic" type="submit">Raportul e redactat și semnat</button></form>
          )}
        </dd>
        <dt>Avizul de legalitate (secretarul general)</dt>
        <dd>
          {r.avizLegalitateLa ? `${dataRo(r.avizLegalitateLa)}${p.cine(r.avizLegalitateDe) ? `, ${p.cine(r.avizLegalitateDe)}` : ""}` : "lipsește"}
          {!r.avizLegalitateLa && deschis && secretar && (
            <form action={scrieMaterial} className="rand-formular"><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="aviz_legalitate" /><Data azi={azi} /><button className="buton buton-mic" type="submit">Avizez pentru legalitate</button></form>
          )}
        </dd>
        <dt>Majoritatea cerută</dt><dd>{MAJORITATI[r.majoritate].nume}</dd>
      </dl>

      {p.normativ && (
        <>
          <h2>Consultarea publică (Legea 52/2003)</h2>
          {p.exceptieUrgenta ? (
            <p className="nota">Excepție de urgență (art. 7 alin. (13), de confirmat de jurist): {p.exceptieUrgenta}</p>
          ) : p.anuntatLa ? (
            <p>Anunțat la {dataRo(p.anuntatLa)}{r.anuntUnde && ` — ${r.anuntUnde}`}. {deschis && (l52.da ? <span className="eticheta termen-rezolvat">se poate supune aprobării</span> : <strong>{l52.motiv}</strong>)}</p>
          ) : (
            <p className="nota">Neanunțat: proiectul normativ nu poate intra pe ordinea de zi.</p>
          )}
          {deschis && gestioneaza && !p.anuntatLa && !p.exceptieUrgenta && (
            <div className="pasi">
              <form action={anunta} className="card rand-formular">
                <input type="hidden" name="id" value={id} />
                <div><label htmlFor="an-data">Anunțat la</label><Data id="an-data" azi={azi} /></div>
                <div><label htmlFor="an-unde">Unde</label><input id="an-unde" name="unde" type="text" defaultValue="pagina de internet și Monitorul Oficial Local" /></div>
                <button className="buton buton-mic" type="submit">Scrie anunțul</button>
              </form>
              <form action={exceptie} className="card rand-formular">
                <input type="hidden" name="id" value={id} />
                <div><label htmlFor="ex-motiv">Excepția de urgență: motivul</label><input id="ex-motiv" name="motiv" type="text" required minLength={10} /></div>
                <button className="buton-text" type="submit">Scrie excepția</button>
              </form>
            </div>
          )}
          {p.anuntatLa && (
            <>
              <h3>Propunerile primite</h3>
              {p.propuneri.length === 0 ? <p className="slab">Nicio propunere scrisă.</p> : (
                <ul>
                  {p.propuneri.map((x) => (
                    <li key={x.id}>
                      {dataRo(x.primitaLa)}{x.numarInregistrare && ` (nr. ${x.numarInregistrare})`}: {x.rezumat}{" "}
                      {x.preluata === null ? <span className="slab">neanalizată</span> : <span className="eticheta">{x.preluata ? "preluată" : "nepreluată"}</span>}
                      {gestioneaza && x.preluata === null && (
                        <>
                          {" "}
                          <form action={analizeaza} style={{ display: "inline" }}><input type="hidden" name="id" value={id} /><input type="hidden" name="propunere" value={x.id} /><input type="hidden" name="preluata" value="da" /><button className="buton-text" type="submit">preluată</button></form>
                          {" · "}
                          <form action={analizeaza} style={{ display: "inline" }}><input type="hidden" name="id" value={id} /><input type="hidden" name="propunere" value={x.id} /><input type="hidden" name="preluata" value="nu" /><button className="buton-text" type="submit">nepreluată</button></form>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {gestioneaza && deschis && (
                <form action={propunere} className="rand-formular">
                  <input type="hidden" name="id" value={id} />
                  <div><label htmlFor="pr-data">Primită la</label><Data id="pr-data" azi={azi} min={p.anuntatLa} /></div>
                  <div><label htmlFor="pr-nr">Nr. înregistrare</label><input id="pr-nr" name="numar" type="text" size={8} /></div>
                  <div style={{ flex: "1 1 16rem" }}><label htmlFor="pr-rez">Rezumatul (fără datele celui care propune)</label><input id="pr-rez" name="rezumat" type="text" required /></div>
                  <button className="buton buton-mic" type="submit">Scrie propunerea</button>
                </form>
              )}
            </>
          )}
        </>
      )}

      <h2>Avizele comisiilor de specialitate</h2>
      {p.avize.length === 0 ? <p className="slab">Proiectul nu a fost trimis încă la nicio comisie.</p> : (
        <div className="tabel-invelis">
          <table>
            <thead><tr><th>Comisia</th><th>Sesizată</th><th>Avizul</th></tr></thead>
            <tbody>
              {p.avize.map((a) => (
                <tr key={a.id}>
                  <td>{a.comisie}</td>
                  <td>{dataRo(a.sesizataLa)}</td>
                  <td>
                    {a.sens ? <><span className="eticheta">{ETICHETE_AVIZ[a.sens]}</span> din {dataRo(a.data!)}{a.amendamente && <span className="slab"> · {a.amendamente}</span>}</> : <span className="eticheta termen-aproape">așteaptă avizul</span>}
                    {!a.sens && deschis && gestioneaza && (
                      <>
                        <form action={aviz} className="rand-formular" style={{ marginTop: "0.4rem" }}>
                          <input type="hidden" name="id" value={id} /><input type="hidden" name="aviz" value={a.id} />
                          <div>
                            <select name="sens" required defaultValue="" aria-label="Sensul avizului">
                              <option value="" disabled>— avizul —</option>
                              {Object.entries(ETICHETE_AVIZ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div><Data azi={azi} min={a.sesizataLa} /></div>
                          <div><input name="amendamente" type="text" placeholder="amendamentele, dacă sunt" aria-label="Amendamentele" /></div>
                          <button className="buton buton-mic" type="submit">Scrie avizul</button>
                        </form>
                        <form action={scoateSesizarea}><input type="hidden" name="id" value={id} /><input type="hidden" name="aviz" value={a.id} /><button className="buton-text" type="submit">scoate comisia</button></form>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {deschis && gestioneaza && deSesizat.length > 0 && (
        <form action={sesizeaza} className="card" style={{ marginTop: "0.8rem" }}>
          <input type="hidden" name="id" value={id} />
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend><strong>Trimite la avizare</strong></legend>
            {deSesizat.map((c) => (
              <div key={c.id}><input id={`c-${c.id}`} name="comisie" type="checkbox" value={c.id} /> <label htmlFor={`c-${c.id}`} style={{ display: "inline", fontWeight: 400 }}>{c.nume}</label></div>
            ))}
          </fieldset>
          <div className="rand-formular" style={{ marginTop: "0.5rem" }}><div><label htmlFor="ses-data">Sesizate la</label><Data id="ses-data" azi={azi} /></div><button className="buton buton-mic" type="submit">Trimite</button></div>
        </form>
      )}

      <h2>Ordinea de zi și votul</h2>
      {p.sedintaId ? (
        <p>
          Pe ordinea de zi a ședinței <Link href={`/consiliu/sedinte/${p.sedintaId}`}>{ETICHETE_SEDINTA[p.sedintaTip!].toLowerCase()} din {dataRo(p.sedintaData!)}</Link>, punctul {p.ordine}.
          {p.rezultat ? (
            <> <strong>{p.rezultat === "aprobat" ? "Aprobat" : p.rezultat === "respins" ? "Respins" : "Retras de pe ordinea de zi"}</strong>{p.votPentru !== null && ` — pentru ${p.votPentru}, contra ${p.votContra}, abțineri ${p.votAbtineri}`}.</>
          ) : <span className="slab"> Votul se scrie din pagina ședinței.</span>}
        </p>
      ) : <p className="slab">Încă nu e pe ordinea de zi.</p>}
      {deschis && gestioneaza && p.sedintaId && (
        <form action={scoateDePeOrdine}><input type="hidden" name="id" value={id} /><button className="buton-text" type="submit">Scoate de pe ordinea de zi (amânat)</button></form>
      )}
      {deschis && gestioneaza && !p.sedintaId && sedinteDeschise.length > 0 && (
        <form action={peOrdineaDeZi} className="rand-formular">
          <input type="hidden" name="id" value={id} />
          <div>
            <label htmlFor="sedinta">Pune pe ordinea de zi a ședinței</label>
            <select id="sedinta" name="sedinta" required defaultValue="">
              <option value="" disabled>— ședința —</option>
              {sedinteDeschise.map((s) => <option key={s.id} value={s.id}>{ETICHETE_SEDINTA[s.tip]}, {dataRo(s.data)}</option>)}
            </select>
          </div>
          <button className="buton buton-mic" type="submit">Pune pe ordinea de zi</button>
        </form>
      )}

      {p.rezultat === "aprobat" && (
        <>
          <h2>Hotărârea nr. {p.numarHcl}/{p.anHcl}</h2>
          <dl className="fisa">
            <dt>Președintele de ședință</dt>
            <dd>
              {p.semnatLa ? `semnată la ${dataRo(p.semnatLa)}` : "nesemnată"}
              {!p.semnatLa && p.stare === "la_semnat" && gestioneaza && (
                <form action={semneaza} className="rand-formular"><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="presedinte" /><Data azi={azi} min={p.rezultatLa!} /><button className="buton buton-mic" type="submit">Consemnez semnătura președintelui</button></form>
              )}
            </dd>
            <dt>Secretarul general</dt>
            <dd>
              {p.contrasemnatLa ? `contrasemnată la ${dataRo(p.contrasemnatLa)}` : "necontrasemnată"}
              {!p.contrasemnatLa && p.stare === "la_semnat" && secretar && (
                <form action={semneaza} className="rand-formular"><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="secretar" /><Data azi={azi} min={p.rezultatLa!} /><button className="buton buton-mic" type="submit">Contrasemnez pentru legalitate</button></form>
              )}
            </dd>
          </dl>
          {lipsaSemnaturi.length > 0 && <p className="slab">Hotărârea e emisă după {lipsaSemnaturi.join(" și ")} (Codul administrativ, art. 140, de confirmat).</p>}

          <h3>Comunicarea la prefect</h3>
          {p.prefectNumar ? (
            <p>
              Adresa nr. <Link href={`/registratura/${r.prefectIesireId}`}>{p.prefectNumar}</Link> din {dataRo(p.prefectLa!)}.{" "}
              {p.prefectConfirmatLa ? <span className="eticheta termen-rezolvat">primită la {dataRo(p.prefectConfirmatLa)}</span> : <span className="eticheta termen-aproape">fără dovada primirii</span>}
            </p>
          ) : <p className="slab">Necomunicată. Termenul: {p.prefectTermen ? dataRo(p.prefectTermen) : "—"} (10 zile lucrătoare de la adoptare, art. 197, de confirmat).</p>}
          {!p.prefectNumar && emisa && gestioneaza && (
            <form action={prefect} className="card rand-formular">
              <input type="hidden" name="id" value={id} />
              <div><label htmlFor="pf-nr">Nr. de ieșire (registrul oficial)</label><input id="pf-nr" name="numar" type="text" inputMode="numeric" required /></div>
              <div><label htmlFor="pf-data">Data</label><Data id="pf-data" azi={azi} min={p.rezultatLa!} /></div>
              <div>
                <label htmlFor="pf-mod">Cum a plecat</label>
                <select id="pf-mod" name="mod" required defaultValue="curier">
                  {Object.entries(ETICHETE_EXPEDIERE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button className="buton buton-mic" type="submit">Hotărârea a plecat la prefect</button>
            </form>
          )}
          {!p.prefectNumar && !emisa && <p className="slab">Se comunică după semnătură și contrasemnătură.</p>}
          {p.prefectNumar && !p.prefectConfirmatLa && gestioneaza && (
            <form action={primitLaPrefect} className="rand-formular">
              <input type="hidden" name="id" value={id} />
              <div><label htmlFor="pf-conf">Dovada primirii, data</label><Data id="pf-conf" azi={azi} min={p.prefectLa!} /></div>
              <button className="buton buton-mic" type="submit">Scrie dovada primirii</button>
            </form>
          )}

          <h3>Publicarea în Monitorul Oficial Local</h3>
          <p className="slab">
            Petru nu publică singur. Secretarul general încarcă hotărârea pe platforma Monitorului Oficial Local, numai copia
            anonimizată, după aprobarea publicării; apoi scrie aici data. Ce se publică integral, anonimizat sau deloc, pe tipuri de
            acte, e întrebarea J11 pentru jurist.
          </p>
          <ul>
            <li>{emisa ? "✓" : "○"} hotărârea emisă (semnată și contrasemnată)</li>
            <li>
              {r.publicareAprobataLa ? `✓ publicarea aprobată la ${dataRo(r.publicareAprobataLa)}${p.cine(r.publicareAprobataDe) ? ` de ${p.cine(r.publicareAprobataDe)}` : ""}` : "○ publicarea neaprobată"}
              {!r.publicareAprobataLa && u.poate("publicare.aproba") && <> <form action={poarta} style={{ display: "inline" }}><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="aproba" /><button className="buton buton-mic" type="submit">Aprob publicarea</button></form></>}
            </li>
            <li>
              {r.copieAnonimizataLa ? `✓ copia anonimizată verificată la ${dataRo(r.copieAnonimizataLa)}${p.cine(r.copieAnonimizataDe) ? ` de ${p.cine(r.copieAnonimizataDe)}` : ""}` : "○ copia anonimizată neverificată"}
              {!r.copieAnonimizataLa && (gestioneaza || secretar) && <> <form action={poarta} style={{ display: "inline" }}><input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="copie" /><button className="buton buton-mic" type="submit">Copia anonimizată e gata</button></form></>}
            </li>
            <li>{p.publicatLa ? `✓ publicată la ${dataRo(p.publicatLa)}${p.publicatUnde ? ` — ${p.publicatUnde}` : ""}` : "○ nepublicată"}</li>
          </ul>
          {!p.publicatLa && gestioneaza && (gata.da ? (
            <form action={poarta} className="rand-formular">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="fel" value="publicat" />
              <div><label htmlFor="pb-data">Publicată la</label><Data id="pb-data" azi={azi} min={p.rezultatLa!} /></div>
              <div><label htmlFor="pb-unde">Unde</label><input id="pb-unde" name="unde" type="text" defaultValue="Monitorul Oficial Local" /></div>
              <button className="buton buton-mic" type="submit">Am publicat</button>
            </form>
          ) : <p className="slab">Poarta de publicare: {gata.motiv}</p>)}
        </>
      )}

      <Ceasuri ceasuri={date.ceasuri} azi={azi} poatePropune={false} poateHotari={false} />

      <h2>Urma</h2>
      {p.urma.length === 0 ? <p className="slab">Nimic încă.</p> : (
        <ul className="jurnal">
          {p.urma.map((e, i) => <li key={i}><strong>{e.cand.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</strong> — {e.cine ?? "sistemul"}: {e.actiune}</li>)}
        </ul>
      )}
    </>
  );
}
