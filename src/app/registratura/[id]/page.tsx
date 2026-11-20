import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { compartimente } from "@/baza/schema";
import { fisaDocumentului } from "@/baza/registratura";
import { ceasurileDocumentului } from "@/baza/ceasuri";
import { fisaCererii } from "@/baza/cereri";
import { ETICHETE_SOLUTIE, SOLUTII_LA_RASPUNS, type Inchidere } from "@/domeniu/cereri";
import { Ceasuri } from "./Ceasuri";
import { Cererea } from "./Cererea";
import { ETICHETE, STARI } from "@/domeniu/drumul-actului";
import { ETICHETE_CANAL } from "@/domeniu/import-registru";
import { aziInRomania, ETICHETE_EXPEDIERE, ETICHETE_TERMEN, PASI, pasiiPosibili, stareaTermenului, vedereaRegistrului, zileIntre, type ModExpediere } from "@/domeniu/registratura";
import { termenul } from "@/domeniu/termene";
import { dataRo } from "@/componente/format";
import { confirmaPrimirea, facePasul, inregistreazaIesirea } from "../actiuni";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function Fisa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const u = await cere();
  const vedere = vedereaRegistrului(u.acordari);
  if (vedere.fel === "nimic") redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const date = await inEntitate(b, u.entitateId, async (tx) => {
    const fisa = await fisaDocumentului(tx, id, vedere);
    if (!fisa) return null;
    return { fisa, ceasuri: await ceasurileDocumentului(tx, id), cerere: await fisaCererii(tx, id) };
  });
  if (!date) notFound();
  const { fisa } = date;
  const d = fisa.doc;
  const azi = aziInRomania();
  const intrare = d.directie !== "iesire";
  const st = intrare ? stareaTermenului(d.termen, d.stare, azi) : null;
  const tl = d.termenCheie ? termenul(d.termenCheie) : undefined;
  const pozitie = STARI.indexOf(d.stare);
  // Clasat, redirecționat sau conexat fără răspuns propriu: emiterea și publicarea n-au avut loc.
  const sarit = d.stare === "arhivat" && intrare && fisa.iesiri.length === 0;
  const comp = await b.select({ id: compartimente.id, nume: compartimente.nume }).from(compartimente).where(eq(compartimente.entitateId, u.entitateId)).orderBy(asc(compartimente.nume));

  const pasi = intrare
    ? pasiiPosibili(d.stare).filter((p) => PASI[p].drept.some((x) => u.poate(x, PASI[p].peCompartiment ? d.compartimentId : undefined)))
    : [];
  const poateConfirma = u.poate("documente.inregistreaza") || u.poate("documente.rezolva", d.compartimentId);
  // Registratura vede fișa de înregistrare; mersul din birou (urma pașilor) îl văd biroul și conducerea.
  const vedeMersul = vedere.fel !== "fisa" || (u.poate("cereri.gestioneaza") && !!date.cerere);
  const cerere = date.cerere?.cerere ?? null;
  const gestioneaza = u.poate("cereri.gestioneaza");
  const rezolva = u.poate("documente.rezolva", d.compartimentId);
  const inchideri: Inchidere[] = gestioneaza || rezolva ? ["redirectionata", "conexata", "clasata"] : u.poate("documente.inregistreaza") ? ["redirectionata"] : [];

  return (
    <>
      <p className="slab"><Link href="/registratura">← Registrul</Link></p>
      <p className="slab">
        Nr. {d.numar}/{d.an} din {dataRo(d.dataInregistrare.toISOString())} · {intrare ? "intrare" : "ieșire"}
        {d.sursa === "import" && " · din registrul oficial (import)"}
      </p>
      <h1>{d.tip}</h1>
      <p>{d.continut}</p>

      <dl className="fisa">
        {intrare ? (<><dt>Emitent</dt><dd>{d.emitentText ?? fisa.emitentPersoana ?? "—"}</dd></>) : (<><dt>Destinatar</dt><dd>{d.destinatarText ?? "—"}</dd></>)}
        {d.canal && (<><dt>Cum a intrat</dt><dd>{ETICHETE_CANAL[d.canal]}</dd></>)}
        <dt>Compartimentul</dt><dd>{fisa.compartiment ?? (d.compartimentText ? `${d.compartimentText} (nepotrivit cu un compartiment din Petru)` : "nerepartizat")}</dd>
        <dt>Starea</dt><dd><span className="eticheta">{ETICHETE[d.stare]}</span></dd>
        {intrare && (
          <>
            <dt>Termenul</dt>
            <dd>
              {d.termen ? dataRo(d.termen) : "—"}
              {st && st !== "fara_termen" && <> <span className={`eticheta termen-${st}`}>{ETICHETE_TERMEN[st]}</span></>}
              {st === "depasit" && d.termen && <> cu {zileIntre(d.termen, azi)} zile</>}
              {tl && <span className="slab"> · {tl.ce}: {tl.zile} zile {tl.felZile} ({tl.temei}){!d.termenRecunoscut && " — termen implicit, tipul nu a fost recunoscut; de verificat"}</span>}
            </dd>
          </>
        )}
        {!intrare && fisa.laNumar && (<><dt>Răspuns la</dt><dd>nr. {fisa.laNumar}/{fisa.laAn}</dd></>)}
        {!intrare && (
          <>
            <dt>Expedierea</dt><dd>{d.modExpediere ? ETICHETE_EXPEDIERE[d.modExpediere as ModExpediere] : "—"}{d.expediatLa && `, ${dataRo(d.expediatLa)}`}</dd>
            <dt>Confirmarea de primire</dt><dd>{d.confirmatLa ? dataRo(d.confirmatLa) : "lipsește"}</dd>
          </>
        )}
      </dl>

      <h2>Drumul actului</h2>
      <ol className="drum">
        {STARI.map((s, i) => (
          <li key={s} className={i === pozitie ? "acum" : i < pozitie && !(sarit && (s === "emis" || s === "publicat")) ? "facut" : ""}>{ETICHETE[s]}</li>
        ))}
      </ol>

      {intrare && (
        <>
          <h2>Răspunsul</h2>
          {fisa.iesiri.length === 0 && <p className="slab">Încă nu a plecat niciun răspuns.</p>}
          {fisa.iesiri.map((x) => (
            <section key={x.id} className="card" style={{ marginBottom: "0.8rem" }}>
              <p>
                <Link href={`/registratura/${x.id}`}>Ieșirea nr. {x.numar}/{x.an}</Link> din {dataRo(x.data.toISOString())}
                {x.destinatar && ` către ${x.destinatar}`}
                {x.modExpediere && ` · ${ETICHETE_EXPEDIERE[x.modExpediere as ModExpediere]}`}
              </p>
              {x.confirmatLa ? (
                <p className="slab">Primit la {dataRo(x.confirmatLa)}.</p>
              ) : poateConfirma ? (
                <form action={confirmaPrimirea} className="rand-formular">
                  <input type="hidden" name="iesire" value={x.id} />
                  <input type="hidden" name="inapoi" value={d.id} />
                  <div><label htmlFor={`conf-${x.id}`}>Confirmarea de primire, data</label><input id={`conf-${x.id}`} name="data" type="date" defaultValue={azi} max={azi} /></div>
                  <button className="buton buton-mic" type="submit">Scrie confirmarea</button>
                </form>
              ) : (
                <p className="slab">Fără confirmare de primire.</p>
              )}
            </section>
          ))}
        </>
      )}

      {!intrare && !d.confirmatLa && poateConfirma && (
        <form action={confirmaPrimirea} className="card rand-formular">
          <input type="hidden" name="iesire" value={d.id} />
          <input type="hidden" name="inapoi" value={d.id} />
          <div><label htmlFor="conf">Confirmarea de primire, data</label><input id="conf" name="data" type="date" defaultValue={azi} max={azi} /></div>
          <button className="buton buton-mic" type="submit">Scrie confirmarea</button>
        </form>
      )}

      {intrare && (
        <Ceasuri ceasuri={date.ceasuri} azi={azi} poatePrelungiDreptul={gestioneaza || rezolva} />
      )}

      {intrare && (cerere || u.poate("documente.inregistreaza") || gestioneaza) && (
        <Cererea
          docId={d.id} stare={d.stare} dataInregistrare={d.dataInregistrare.toISOString().slice(0, 10)} fisa={date.cerere} azi={azi} anul={d.an}
          drepturi={{ felul: gestioneaza || u.poate("documente.inregistreaza"), inchideri, reclamatia: gestioneaza }}
        />
      )}

      {pasi.length > 0 && (
        <>
          <h2>Pasul următor</h2>
          <div className="pasi">
            {pasi.map((p) => {
              if (p === "repartizeaza") {
                return (
                  <form key={p} action={facePasul} className="card rand-formular">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="pas" value={p} />
                    <div>
                      <label htmlFor="compartiment">{d.compartimentId ? "Redirecționează la" : "Repartizează la"}</label>
                      <select id="compartiment" name="compartiment" required defaultValue="">
                        <option value="" disabled>— compartimentul —</option>
                        {comp.filter((c) => c.id !== d.compartimentId).map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
                      </select>
                    </div>
                    <button className="buton buton-mic" type="submit">{d.compartimentId ? "Redirecționează" : "Repartizează"}</button>
                  </form>
                );
              }
              if (p === "iesire") {
                return (
                  <form key={p} action={inregistreazaIesirea} className="card rand-formular">
                    <input type="hidden" name="id" value={d.id} />
                    <div><label htmlFor="nr-iesire">Nr. de ieșire (din registrul oficial)</label><input id="nr-iesire" name="numar" type="text" inputMode="numeric" required /></div>
                    <div><label htmlFor="data-iesire">Data</label><input id="data-iesire" name="data" type="date" required defaultValue={azi} max={azi} /></div>
                    <div>
                      <label htmlFor="mod">Cum a plecat</label>
                      <select id="mod" name="mod" required defaultValue={d.canal === "email" ? "email" : d.canal === "platforma" ? "platforma" : "posta"}>
                        {Object.entries(ETICHETE_EXPEDIERE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><label htmlFor="destinatar">Destinatarul</label><input id="destinatar" name="destinatar" type="text" defaultValue={d.emitentText ?? ""} /></div>
                    {cerere && !cerere.solutie && (
                      <div>
                        <label htmlFor="solutie">Soluția</label>
                        <select id="solutie" name="solutie" required defaultValue="">
                          <option value="" disabled>— alegeți —</option>
                          {SOLUTII_LA_RASPUNS[cerere.fel].map((x) => <option key={x} value={x}>{ETICHETE_SOLUTIE[x]}</option>)}
                        </select>
                      </div>
                    )}
                    <button className="buton buton-mic" type="submit">Răspunsul a plecat</button>
                  </form>
                );
              }
              if (p === "claseaza") {
                return (
                  <form key={p} action={facePasul} className="card rand-formular">
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="pas" value={p} />
                    <div><label htmlFor="motiv">Motivul clasării</label><input id="motiv" name="motiv" type="text" required placeholder="de pildă: petiție repetată, fără elemente noi" /></div>
                    <button className="buton-text" type="submit">{PASI[p].nume}</button>
                  </form>
                );
              }
              return (
                <form key={p} action={facePasul}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="hidden" name="pas" value={p} />
                  <button className="buton" type="submit">{PASI[p].nume}</button>
                </form>
              );
            })}
          </div>
        </>
      )}

      {vedeMersul && (
        <>
          <h2>Urma</h2>
          {fisa.urma.length === 0 ? <p className="slab">Nimic încă.</p> : (
            <ul className="jurnal">
              {fisa.urma.map((e, i) => (
                <li key={i}><strong>{e.cand.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</strong> — {e.cine ?? "sistemul"}: {e.actiune}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
