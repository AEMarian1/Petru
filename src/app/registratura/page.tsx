import Link from "next/link";
import { DOCUMENTE } from "@/date-proba/documente";
import { ETICHETE } from "@/domeniu/drumul-actului";
import { dataRo } from "@/componente/format";

export default function Registratura() {
  return (
    <>
      <h1>Registrul de intrare-ieșire</h1>
      <p className="slab">Date inventate. La pasul S6, registratura primește înregistrarea și repartizarea reale.</p>
      <div className="tabel-invelis">
        <table>
          <thead>
            <tr><th>Nr.</th><th>Data</th><th>Tip</th><th>Emitent</th><th>Compartiment</th><th>Stare</th></tr>
          </thead>
          <tbody>
            {DOCUMENTE.map((d) => (
              <tr key={d.id}>
                <td>{d.numar}</td>
                <td>{dataRo(d.data)}</td>
                <td><Link href={`/acte/${d.id}`}>{d.tip}</Link></td>
                <td>{d.emitent}</td>
                <td>{d.compartiment}</td>
                <td><span className="eticheta">{ETICHETE[d.stare]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
