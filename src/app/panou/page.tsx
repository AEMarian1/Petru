import Link from "next/link";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { cifrele, listaRegistrului } from "@/baza/registratura";
import { cifreleCererilor, deLaConducere } from "@/baza/cereri";
import { cifreleConsiliului } from "@/baza/consiliu";
import { dataRo as zi } from "@/componente/format";
import { ETICHETE } from "@/domeniu/drumul-actului";
import { aziInRomania, ETICHETE_TERMEN, stareaTermenului, vedereaRegistrului } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";

export default async function Panou() {
  const u = await cere();
  const vedere = vedereaRegistrului(u.acordari);
  const b = db();
  const azi = aziInRomania();
  const vedeCererile = u.poate("cereri.gestioneaza") || u.poate("documente.vede_tot") || u.poate("documente.vede_compartiment");
  // Consiliul local: termenele (prefect, procesul-verbal, Legea 52) pentru cine ține consiliul și pentru secretarul general.
  const vedeConsiliul = u.poate("consiliu.gestioneaza") || u.poate("documente.contrasemneaza");
  const consiliu = b && vedeConsiliul ? await inEntitate(b, u.entitateId, (tx) => cifreleConsiliului(tx, { fel: "tot" }, azi)) : null;
  const date = b && vedere.fel !== "nimic"
    ? await inEntitate(b, u.entitateId, async (tx) => ({
        cifre: await cifrele(tx, vedere, azi),
        cereri: vedeCererile ? await cifreleCererilor(tx, vedere, azi) : null,
        conducere: u.poate("documente.semneaza") || u.poate("documente.contrasemneaza") ? await deLaConducere(tx, vedere) : null,
        urgente: [
          ...(await listaRegistrului(tx, vedere, { termen: "depasit", directie: "intrare" }, azi, 10)),
          ...(await listaRegistrului(tx, vedere, { termen: "aproape", directie: "intrare" }, azi, 10)),
        ],
      }))
    : null;
  return (
    <>
      <h1>Panou — {u.numeAfisat}</h1>
      <p className="slab">{u.entitateNume} · Roluri: {u.roluri.map((r) => (r.compartiment ? `${r.nume} (${r.compartiment})` : r.nume)).join(", ") || "niciunul"}</p>
      {consiliu && (
        <>
          <h2>Consiliul local</h2>
          <div className="grila">
            <Link href="/consiliu?filtru=adoptate" className="card"><h3>{consiliu.prefectDeschise}</h3><p className="slab">hotărâri de comunicat la prefect{consiliu.prefectDepasite > 0 && `, ${consiliu.prefectDepasite} cu termenul depășit`}</p></Link>
            <Link href="/consiliu" className="card"><h3>{consiliu.pvDePublicat}</h3><p className="slab">procese-verbale de publicat{consiliu.pvDepasite > 0 && `, ${consiliu.pvDepasite} cu termenul depășit`}</p></Link>
            <Link href="/consiliu?filtru=adoptate" className="card"><h3>{u.poate("documente.contrasemneaza") ? consiliu.deContrasemnat : consiliu.deSemnat}</h3><p className="slab">{u.poate("documente.contrasemneaza") ? "hotărâri de contrasemnat" : "hotărâri fără semnătura președintelui de ședință"}</p></Link>
          </div>
          {vedere.fel !== "nimic" && <h2>Registrul</h2>}
        </>
      )}
      {date && (
        <>
          <div className="grila">
            <Link href="/registratura?termen=deschise" className="card"><h3>{date.cifre.deschise}</h3><p className="slab">documente fără răspuns</p></Link>
            <Link href="/registratura?termen=depasit" className="card"><h3>{date.cifre.depasite}</h3><p className="slab">termene depășite</p></Link>
            <Link href="/registratura?termen=aproape" className="card"><h3>{date.cifre.aproape}</h3><p className="slab">scad în următoarele 3 zile</p></Link>
            <Link href="/registratura?termen=fara_confirmare" className="card"><h3>{date.cifre.faraConfirmare}</h3><p className="slab">ieșiri fără confirmare de primire</p></Link>
          </div>
          {date.conducere && (
            <>
              <h2>Așteaptă hotărârea dumneavoastră</h2>
              <div className="grila">
                {u.poate("documente.semneaza") && <Link href="/registratura?termen=la_semnat" className="card"><h3>{date.conducere.deSemnat}</h3><p className="slab">răspunsuri la semnat, fără semnătura conducătorului</p></Link>}
                {u.poate("documente.contrasemneaza") && <Link href="/registratura?termen=la_semnat" className="card"><h3>{date.conducere.deContrasemnat}</h3><p className="slab">răspunsuri la semnat, fără contrasemnătura secretarului general</p></Link>}
              </div>
              {u.poate("documente.semneaza") && date.conducere.prelungiri.length > 0 && (
                <>
                  <p><strong>Prelungiri de termen propuse de compartimente:</strong></p>
                  <ul>
                    {date.conducere.prelungiri.map((x) => (
                      <li key={x.docId}><Link href={`/registratura/${x.docId}`}>nr. {x.numar}/{x.an}</Link> — {x.continut} <span className="slab">(termen {zi(x.termen)}; motiv: {x.motiv})</span></li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          {date.cereri && (
            <div className="grila" style={{ marginTop: "1rem" }}>
              <Link href="/cereri?fel=petitie" className="card"><h3>{date.cereri.petitie.deschise}</h3><p className="slab">petiții fără soluție{date.cereri.petitie.depasite > 0 && `, ${date.cereri.petitie.depasite} cu termen depășit`}</p></Link>
              <Link href="/cereri?fel=informatii_publice" className="card"><h3>{date.cereri.informatii_publice.deschise}</h3><p className="slab">cereri 544 fără soluție{date.cereri.informatii_publice.depasite > 0 && `, ${date.cereri.informatii_publice.depasite} cu termen depășit`}</p></Link>
            </div>
          )}
          <h2>De rezolvat întâi</h2>
          {date.urgente.length === 0 ? <p className="slab">Niciun termen depășit sau apropiat.</p> : (
            <div className="tabel-invelis">
              <table>
                <thead><tr><th>Nr.</th><th>Document</th><th>Stare</th><th>Termen</th></tr></thead>
                <tbody>
                  {[...date.urgente].sort((a, c) => (a.termen ?? "").localeCompare(c.termen ?? "")).map((d) => {
                    const st = stareaTermenului(d.termen, d.stare, azi);
                    return (
                      <tr key={d.id}>
                        <td>{d.numar}/{d.an}</td>
                        <td><Link href={`/registratura/${d.id}`}>{d.continut}</Link></td>
                        <td><span className="eticheta">{ETICHETE[d.stare]}</span></td>
                        <td>{d.termen ? dataRo(d.termen) : "—"} <span className={`eticheta termen-${st}`}>{ETICHETE_TERMEN[st]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
