import Link from "next/link";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { cifrele, listaRegistrului } from "@/baza/registratura";
import { cifreleCererilor } from "@/baza/cereri";
import { ETICHETE } from "@/domeniu/drumul-actului";
import { aziInRomania, ETICHETE_TERMEN, stareaTermenului, vedereaRegistrului } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";

export default async function Panou() {
  const u = await cere();
  const vedere = vedereaRegistrului(u.acordari);
  const b = db();
  const azi = aziInRomania();
  const vedeCererile = u.poate("cereri.gestioneaza") || u.poate("documente.vede_tot");
  const date = b && vedere.fel !== "nimic"
    ? await inEntitate(b, u.entitateId, async (tx) => ({
        cifre: await cifrele(tx, vedere, azi),
        cereri: vedeCererile ? await cifreleCererilor(tx, vedere, azi) : null,
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
      {date && (
        <>
          <div className="grila">
            <Link href="/registratura?termen=deschise" className="card"><h3>{date.cifre.deschise}</h3><p className="slab">documente fără răspuns</p></Link>
            <Link href="/registratura?termen=depasit" className="card"><h3>{date.cifre.depasite}</h3><p className="slab">termene depășite</p></Link>
            <Link href="/registratura?termen=aproape" className="card"><h3>{date.cifre.aproape}</h3><p className="slab">scad în următoarele 3 zile</p></Link>
            <Link href="/registratura?termen=fara_confirmare" className="card"><h3>{date.cifre.faraConfirmare}</h3><p className="slab">ieșiri fără confirmare de primire</p></Link>
          </div>
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
