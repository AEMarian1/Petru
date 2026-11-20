import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { importuri } from "@/baza/schema";
import { importul } from "@/baza/registratura";
import { ETICHETE_CAMPURI, type Camp } from "@/domeniu/import-registru";
import { dataRo } from "@/componente/format";
import { aplicaImportulVerificat, renuntaLaImport } from "../../actiuni";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ARATA = 30;

export default async function Verificare({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const u = await cere("documente.inregistreaza");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const { i, dejaAplicat } = await inEntitate(b, u.entitateId, async (tx) => {
    const i = await importul(tx, id);
    if (!i) return { i: null, dejaAplicat: false };
    const [alt] = await tx.select({ id: importuri.id }).from(importuri).where(and(eq(importuri.amprenta, i.amprenta), eq(importuri.stare, "aplicat"), ne(importuri.id, i.id))).limit(1);
    return { i, dejaAplicat: !!alt };
  });
  if (!i) notFound();
  const campuri = Object.entries(i.potrivire.campuri) as [Camp, number][];
  const intrari = i.randuri.filter((r) => r.directie !== "iesire").length;
  const iesiri = i.randuri.length - intrari;
  const nerepartizate = i.randuri.filter((r) => r.directie !== "iesire" && !r.compartiment).length;

  return (
    <>
      <p className="slab"><Link href="/registratura/import">← Importul</Link></p>
      <h1>Verificarea fișierului {i.numeFisier}</h1>

      {i.stare === "aplicat" && <p className="nota">Importul a fost aplicat: {i.noi} documente noi, {i.actualizate} actualizate. <Link href="/registratura">Vedeți registrul</Link>.</p>}
      {i.stare === "renuntat" && <p className="nota">S-a renunțat la acest import.</p>}
      {dejaAplicat && i.stare === "verificat" && <p className="eroare">Același fișier a mai fost aplicat o dată. Dacă îl aplicați din nou, documentele doar se actualizează.</p>}

      <div className="grila">
        <div className="card"><h3>{i.randuri.length}</h3><p className="slab">rânduri bune ({intrari} intrări, {iesiri} ieșiri)</p></div>
        <div className="card"><h3>{i.erori.length}</h3><p className="slab">rânduri cu erori, lăsate deoparte</p></div>
        <div className="card"><h3>{nerepartizate}</h3><p className="slab">intrări fără compartiment în export</p></div>
      </div>

      <h2>Cum am înțeles coloanele</h2>
      <ul>
        {campuri.map(([c]) => <li key={c}>{ETICHETE_CAMPURI[c]}</li>)}
        {i.potrivire.ignorate.length > 0 && <li className="slab">Lăsate deoparte: {i.potrivire.ignorate.join(", ")}</li>}
      </ul>

      {i.erori.length > 0 && (
        <>
          <h2>Rândurile cu erori</h2>
          <ul>{i.erori.slice(0, 50).map((e) => <li key={e.rand}>Rândul {e.rand}: {e.mesaj}</li>)}</ul>
          {i.erori.length > 50 && <p className="slab">… și încă {i.erori.length - 50}.</p>}
        </>
      )}

      <h2>Primele rânduri</h2>
      <div className="tabel-invelis">
        <table>
          <thead><tr><th>Nr.</th><th>Data</th><th>Sens</th><th>Emitent</th><th>Conținut</th><th>Compartiment</th><th>La nr.</th></tr></thead>
          <tbody>
            {i.randuri.slice(0, ARATA).map((r) => (
              <tr key={r.rand}>
                <td>{r.numar}/{r.an}</td><td>{dataRo(r.data)}</td><td>{r.directie}</td><td>{r.emitent}</td><td>{r.continut}</td><td>{r.compartiment ?? "—"}</td><td>{r.laNumar ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {i.stare === "verificat" && (
        <div className="rand-formular" style={{ marginTop: "1rem" }}>
          <form action={aplicaImportulVerificat}>
            <input type="hidden" name="id" value={i.id} />
            <button className="buton" type="submit" disabled={i.randuri.length === 0}>Aplică importul ({i.randuri.length} rânduri)</button>
          </form>
          <form action={renuntaLaImport}>
            <input type="hidden" name="id" value={i.id} />
            <button className="buton-text" type="submit">Renunț</button>
          </form>
        </div>
      )}
    </>
  );
}
