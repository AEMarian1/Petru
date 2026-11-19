import { desc, eq, or, isNull } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { jurnal, utilizatori } from "@/baza/schema";

export default async function Jurnal() {
  const u = await cere("jurnal.citeste");
  const b = db()!;
  const randuri = await b
    .select({ id: jurnal.id, cand: jurnal.cand, cine: utilizatori.numeAfisat, actiune: jurnal.actiune, entitate: jurnal.entitate })
    .from(jurnal)
    .leftJoin(utilizatori, eq(utilizatori.id, jurnal.utilizatorId))
    .where(or(eq(utilizatori.entitateId, u.entitateId), isNull(jurnal.utilizatorId)))
    .orderBy(desc(jurnal.id))
    .limit(200);
  return (
    <>
      <h1>Jurnalul</h1>
      <p className="slab">Ultimele 200 de înregistrări ale entității. Jurnalul nu se poate modifica sau șterge.</p>
      <div className="tabel-invelis">
        <table>
          <thead><tr><th>Când</th><th>Cine</th><th>Ce</th><th>Despre</th></tr></thead>
          <tbody>
            {randuri.map((r) => (
              <tr key={r.id}>
                <td>{r.cand.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</td>
                <td>{r.cine ?? "—"}</td>
                <td>{r.actiune}</td>
                <td>{r.entitate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
