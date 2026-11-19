import Link from "next/link";
import { SEDINTE } from "@/date-proba/consiliu";
import { ETICHETE_SEDINTA } from "@/domeniu/proiect-hotarare";
import { dataRo } from "@/componente/format";

export default function Consiliu() {
  return (
    <>
      <h1>Consiliul local — ședințele</h1>
      <p className="slab">Date inventate. Registrele cerute de lege (proiecte, hotărâri, procese-verbale) se generează din aceste date.</p>
      <div className="tabel-invelis">
        <table>
          <thead><tr><th>Data</th><th>Tipul</th><th>Proiecte</th><th>Hotărâri adoptate</th></tr></thead>
          <tbody>
            {SEDINTE.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/consiliu/${s.id}`}>{dataRo(s.data)}</Link></td>
                <td><span className="eticheta">{ETICHETE_SEDINTA[s.tip]}</span></td>
                <td>{s.proiecte.length}</td>
                <td>{s.proiecte.filter((p) => p.rezultat === "aprobat").length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
