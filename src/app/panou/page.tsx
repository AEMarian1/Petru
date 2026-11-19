import Link from "next/link";
import { DOCUMENTE } from "@/date-proba/documente";
import { ETICHETE } from "@/domeniu/drumul-actului";
import { cere } from "@/autentificare/utilizator";
import { dataRo } from "@/componente/format";

const AZI = "2026-11-19"; // data fixă a datelor de probă

export default async function Panou() {
  const u = await cere();
  const deschise = DOCUMENTE.filter((d) => d.stare !== "arhivat" && d.stare !== "emis");
  const depasite = deschise.filter((d) => d.termen < AZI);
  const laSemnat = DOCUMENTE.filter((d) => d.stare === "la_semnat");
  return (
    <>
      <h1>Panou — {u.numeAfisat}</h1>
      <p className="slab">{u.entitateNume} · Roluri: {u.roluri.map((r) => (r.compartiment ? `${r.nume} (${r.compartiment})` : r.nume)).join(", ") || "niciunul"}</p>
      <div className="grila">
        <div className="card"><h3>{deschise.length}</h3><p className="slab">documente în lucru</p></div>
        <div className="card"><h3>{depasite.length}</h3><p className="slab">termene depășite</p></div>
        <div className="card"><h3>{laSemnat.length}</h3><p className="slab">acte la semnat</p></div>
      </div>
      <h2>Termene apropiate</h2>
      <div className="tabel-invelis">
        <table>
          <thead><tr><th>Nr.</th><th>Document</th><th>Stare</th><th>Termen</th></tr></thead>
          <tbody>
            {[...deschise].sort((a, b) => a.termen.localeCompare(b.termen)).map((d) => (
              <tr key={d.id}>
                <td>{d.numar}</td>
                <td><Link href={`/acte/${d.id}`}>{d.tip}</Link></td>
                <td><span className="eticheta">{ETICHETE[d.stare]}</span></td>
                <td>{dataRo(d.termen)}{d.termen < AZI ? " — depășit" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
