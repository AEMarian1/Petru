import Link from "next/link";
import { redirect } from "next/navigation";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { cifreleConsiliului, listaProiectelor, listaSedintelor, type FiltruProiecte } from "@/baza/consiliu";
import { ETICHETE_SEDINTA, stadiul, vedereaConsiliului } from "@/domeniu/consiliu";
import { stareaCeasului } from "@/domeniu/ceas";
import { aziInRomania } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";
import { sedintaNoua } from "./actiuni";
import { Mesaje } from "./Mesaje";

const FILTRE: Record<FiltruProiecte, string> = {
  in_lucru: "În lucru",
  pe_ordinea_de_zi: "Pe ordinea de zi",
  adoptate: "Hotărâri adoptate",
  toate: "Toate",
};

const ETICHETE_CEAS = { depasit: "termen depășit", aproape: "scade în curând", in_termen: "în termen", oprit: "comunicată" } as const;

export default async function Consiliu({ searchParams }: { searchParams: Promise<{ filtru?: string; eroare?: string; atentie?: string }> }) {
  const p = await searchParams;
  const u = await cere();
  const vedere = vedereaConsiliului(u.acordari);
  if (vedere.fel === "nimic") redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const azi = aziInRomania();
  const filtru: FiltruProiecte = p.filtru && p.filtru in FILTRE ? (p.filtru as FiltruProiecte) : vedere.fel === "tot" ? "in_lucru" : "toate";
  const toate = vedere.fel === "tot";
  const gestioneaza = u.poate("consiliu.gestioneaza");
  const date = await inEntitate(b, u.entitateId, async (tx) => ({
    cifre: await cifreleConsiliului(tx, vedere, azi),
    sedinte: toate ? await listaSedintelor(tx) : [],
    proiecte: await listaProiectelor(tx, vedere, { filtru }),
  }));
  const c = date.cifre;
  const viitoare = date.sedinte.filter((s) => s.data >= azi).reverse();
  const trecute = date.sedinte.filter((s) => s.data < azi);

  return (
    <>
      <h1>Consiliul local</h1>
      <Mesaje eroare={p.eroare} atentie={p.atentie} />
      <p className="slab">
        Proiectele de hotărâre, de la referatul inițiatorului la vot, comunicarea la prefect și publicare. Registrele cerute pentru
        Monitorul Oficial Local se fac din aceleași date. Termenele marcate „de confirmat” se verifică de jurist.
      </p>
      <p className="pasi">
        {(u.poate("consiliu.initiaza") || gestioneaza) && <Link className="buton" href="/consiliu/proiecte/nou">Proiect de hotărâre nou</Link>}
        {toate && <Link className="buton" href="/consiliu/registre">Registrele (MOL)</Link>}
      </p>

      {toate && (
        <>
          <h2>Ce expiră și ce așteaptă</h2>
          <div className="grila">
            <Link href="/consiliu?filtru=adoptate" className="card">
              <h3>{c.prefectDeschise}</h3>
              <p className="slab">hotărâri de comunicat la prefect{c.prefectDepasite > 0 && <>, <strong className="eticheta termen-depasit">{c.prefectDepasite} cu termenul depășit</strong></>}{c.prefectAproape > 0 && <>, {c.prefectAproape} scad în 3 zile</>}</p>
            </Link>
            <div className="card"><h3>{c.pvDePublicat}</h3><p className="slab">procese-verbale aprobate, de afișat și publicat{c.pvDepasite > 0 && <>, <strong className="eticheta termen-depasit">{c.pvDepasite} cu termenul depășit</strong></>}</p></div>
            <div className="card"><h3>{c.l52Asteptare}</h3><p className="slab">proiecte normative în consultare publică (Legea 52), încă nevotabile</p></div>
            <div className="card"><h3>{c.deSemnat + c.deContrasemnat}</h3><p className="slab">hotărâri la semnat: {c.deSemnat} fără semnătura președintelui de ședință, {c.deContrasemnat} fără contrasemnătura secretarului general</p></div>
            <div className="card"><h3>{c.dePublicat}</h3><p className="slab">hotărâri emise, nepublicate încă în Monitorul Oficial Local</p></div>
            <Link href="/consiliu?filtru=in_lucru" className="card"><h3>{c.faraRaport}</h3><p className="slab">proiecte fără raportul compartimentului de specialitate</p></Link>
          </div>

          <h2>Ședințele</h2>
          {viitoare.length > 0 && <p><strong>Următoarele:</strong> {viitoare.map((s, i) => <span key={s.id}>{i > 0 && " · "}<Link href={`/consiliu/sedinte/${s.id}`}>{ETICHETE_SEDINTA[s.tip].toLowerCase()}, {dataRo(s.data)}</Link>{!s.convocatLa && <span className="slab"> (neconvocată)</span>}</span>)}</p>}
          <div className="tabel-invelis">
            <table>
              <thead><tr><th>Data</th><th>Tipul</th><th>Proiecte</th><th>Hotărâri</th><th>Procesul-verbal</th></tr></thead>
              <tbody>
                {[...viitoare, ...trecute].map((s) => {
                  const pvSt = s.pvTermen && !s.pvPublicatLa ? stareaCeasului({ termen: s.pvTermen, opritLa: null }, azi) : null;
                  return (
                    <tr key={s.id}>
                      <td><Link href={`/consiliu/sedinte/${s.id}`}>{dataRo(s.data)}</Link></td>
                      <td><span className="eticheta">{ETICHETE_SEDINTA[s.tip]}</span></td>
                      <td>{s.proiecte}</td>
                      <td>{s.adoptate}</td>
                      <td>
                        {s.pvPublicatLa ? <span className="eticheta termen-rezolvat">publicat {dataRo(s.pvPublicatLa)}</span>
                          : s.pvAprobatLa ? <>aprobat; de publicat până la {dataRo(s.pvTermen!)} {pvSt && <span className={`eticheta termen-${pvSt}`}>{pvSt === "depasit" ? "depășit" : pvSt === "aproape" ? "scade în curând" : "în termen"}</span>}</>
                          : s.pvRedactatLa ? "redactat, de semnat și aprobat"
                          : s.data <= azi ? <span className="slab">de redactat</span> : <span className="slab">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {gestioneaza && (
            <details style={{ marginTop: "0.8rem" }}>
              <summary>Ședință nouă</summary>
              <form action={sedintaNoua} className="card rand-formular" style={{ marginTop: "0.5rem" }}>
                <div><label htmlFor="s-data">Data</label><input id="s-data" name="data" type="date" required min="2000-01-01" max="2100-12-31" /></div>
                <div>
                  <label htmlFor="s-tip">Tipul</label>
                  <select id="s-tip" name="tip" required defaultValue="ordinara">
                    {Object.entries(ETICHETE_SEDINTA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label htmlFor="s-cons">Consilieri în funcție</label><input id="s-cons" name="consilieri" type="text" inputMode="numeric" required defaultValue={String(date.sedinte[0]?.consilieriInFunctie ?? 15)} size={4} /></div>
                <button className="buton buton-mic" type="submit">Creează ședința</button>
              </form>
            </details>
          )}
        </>
      )}

      <h2>{toate ? "Proiectele de hotărâre" : "Proiectele compartimentului dumneavoastră"}</h2>
      {!toate && <p className="slab">Compartimentul de specialitate redactează raportul la proiect. Restul pașilor îi ține secretariatul consiliului local.</p>}
      <nav className="pasi" aria-label="Filtrele proiectelor" style={{ marginBottom: "0.6rem" }}>
        {(Object.keys(FILTRE) as FiltruProiecte[]).map((f) => (
          <Link key={f} href={`/consiliu?filtru=${f}`} className={`eticheta${f === filtru ? " card-ales" : ""}`}>{FILTRE[f]}</Link>
        ))}
      </nav>
      {date.proiecte.length === 0 ? <p className="slab">Niciun proiect.</p> : (
        <div className="tabel-invelis">
          <table>
            <thead><tr><th>Nr.</th><th>Proiectul</th><th>Compartimentul</th><th>Stadiul</th></tr></thead>
            <tbody>
              {date.proiecte.map((x) => {
                const st = x.prefectTermen ? stareaCeasului({ termen: x.prefectTermen, opritLa: x.prefectOprit }, azi) : null;
                return (
                  <tr key={x.id}>
                    <td>{x.numar}/{x.an}</td>
                    <td><Link href={`/consiliu/proiecte/${x.id}`}>{x.titlu}</Link>{x.normativ && <span className="slab"> · normativ</span>}</td>
                    <td>{x.compartiment}</td>
                    <td>
                      {stadiul({ ...x, emisa: x.stare === "emis" || x.stare === "publicat", comunicatPrefect: !!x.prefectNumar, publicat: !!x.publicatLa })}
                      {x.numarHcl && <> · HCL nr. {x.numarHcl}/{x.anHcl}</>}
                      {st && st !== "oprit" && <> <span className={`eticheta termen-${st}`}>prefect: {ETICHETE_CEAS[st]}, {dataRo(x.prefectTermen!)}</span></>}
                      {!x.rezultat && x.sedintaData && <span className="slab"> · ședința din {dataRo(x.sedintaData)}</span>}
                      {!x.rezultat && !x.raportLa && <> <span className="eticheta termen-aproape">fără raport</span></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
