import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { compartimente } from "@/baza/schema";
import { ETICHETE_INITIATOR, MAJORITATI } from "@/domeniu/consiliu";
import { aziInRomania } from "@/domeniu/registratura";
import { initiaza } from "../../actiuni";
import { Mesaje } from "../../Mesaje";

export default async function ProiectNou({ searchParams }: { searchParams: Promise<{ eroare?: string }> }) {
  const p = await searchParams;
  const u = await cere();
  if (!u.poate("consiliu.initiaza") && !u.poate("consiliu.gestioneaza")) redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const comp = await b.select({ id: compartimente.id, nume: compartimente.nume }).from(compartimente).where(eq(compartimente.entitateId, u.entitateId)).orderBy(asc(compartimente.nume));
  const azi = aziInRomania();
  return (
    <>
      <p className="slab"><Link href="/consiliu">← Consiliul local</Link></p>
      <h1>Proiect de hotărâre nou</h1>
      <Mesaje eroare={p.eroare} />
      <p className="slab">
        Proiectul se înregistrează întâi în registrul oficial (SOBIS); aici se scrie numărul primit. Petru îi dă numărul din registrul
        proiectelor de hotărâre și îl trimite compartimentului de specialitate, care redactează raportul.
      </p>
      <form action={initiaza} className="card">
        <label htmlFor="titlu">Titlul</label>
        <input id="titlu" name="titlu" type="text" required minLength={10} placeholder="Proiect de hotărâre privind …" />
        <div className="rand-formular" style={{ marginTop: "0.8rem" }}>
          <div><label htmlFor="numar">Nr. de înregistrare (registrul oficial)</label><input id="numar" name="numar" type="text" inputMode="numeric" required /></div>
          <div><label htmlFor="data">Data înregistrării</label><input id="data" name="data" type="date" required defaultValue={azi} max={azi} /></div>
          <div>
            <label htmlFor="initiator">Inițiatorul</label>
            <select id="initiator" name="initiator" required defaultValue="primar">
              {Object.entries(ETICHETE_INITIATOR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="compartiment">Compartimentul de specialitate (raportul)</label>
            <select id="compartiment" name="compartiment" required defaultValue="">
              <option value="" disabled>— alegeți —</option>
              {comp.map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
            </select>
          </div>
        </div>
        <div className="rand-formular" style={{ marginTop: "0.8rem" }}>
          <div>
            <label htmlFor="normativ">Caracterul</label>
            <select id="normativ" name="normativ" required defaultValue="nu">
              <option value="nu">Individual</option>
              <option value="da">Normativ (cere anunțul pe Legea 52/2003)</option>
            </select>
          </div>
          <div>
            <label htmlFor="majoritate">Majoritatea cerută la vot</label>
            <select id="majoritate" name="majoritate" required defaultValue="simpla">
              {Object.entries(MAJORITATI).map(([k, v]) => <option key={k} value={k}>{v.nume}</option>)}
            </select>
          </div>
        </div>
        <p style={{ marginTop: "0.8rem" }}>
          <input id="referat" name="referat" type="checkbox" defaultChecked /> <label htmlFor="referat" style={{ display: "inline", fontWeight: 400 }}>Referatul de aprobare al inițiatorului e semnat, cu data înregistrării</label>
        </p>
        <button className="buton" type="submit">Înregistrează proiectul</button>
      </form>
    </>
  );
}
