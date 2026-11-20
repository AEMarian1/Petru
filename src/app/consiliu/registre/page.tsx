import Link from "next/link";
import { redirect } from "next/navigation";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { vedereaConsiliului } from "@/domeniu/consiliu";
import { aziInRomania } from "@/domeniu/registratura";
import { esteFelRegistru, randurileRegistrului, REGISTRE, type FelRegistru } from "./date";

export default async function Registre({ searchParams }: { searchParams: Promise<{ fel?: string; an?: string }> }) {
  const p = await searchParams;
  const u = await cere();
  if (vedereaConsiliului(u.acordari).fel !== "tot") redirect("/fara-drept");
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const fel: FelRegistru = p.fel && esteFelRegistru(p.fel) ? p.fel : "hotarari";
  const anAzi = Number(aziInRomania().slice(0, 4));
  const cerut = Number(p.an);
  const an = Number.isInteger(cerut) && cerut >= 2000 && cerut <= 2100 ? cerut : anAzi;
  const r = await inEntitate(b, u.entitateId, (tx) => randurileRegistrului(tx, fel, an));
  return (
    <>
      <p className="slab"><Link href="/consiliu">← Consiliul local</Link></p>
      <h1>{REGISTRE[fel]} — {an}</h1>
      <p className="slab">
        Registrele se fac din drumul proiectelor, fără a doua scriere. Secretarul general le încarcă pe platforma Monitorului Oficial
        Local (exportul CSV de mai jos); Petru nu publică singur. Coloanele exacte din anexa Codului administrativ sunt de confirmat de jurist.
      </p>
      <nav className="pasi" aria-label="Registrele" style={{ marginBottom: "0.6rem" }}>
        {(Object.keys(REGISTRE) as FelRegistru[]).map((f) => (
          <Link key={f} href={`/consiliu/registre?fel=${f}&an=${an}`} className={`eticheta${f === fel ? " card-ales" : ""}`}>{REGISTRE[f]}</Link>
        ))}
      </nav>
      <form className="rand-formular" method="get">
        <input type="hidden" name="fel" value={fel} />
        <div><label htmlFor="an">Anul</label><input id="an" name="an" type="text" inputMode="numeric" defaultValue={String(an)} size={5} /></div>
        <button className="buton buton-mic" type="submit">Arată</button>
        <a className="buton buton-mic" href={`/consiliu/registre/csv?fel=${fel}&an=${an}`} download>Descarcă CSV</a>
      </form>
      <div className="tabel-invelis" style={{ marginTop: "0.8rem" }}>
        <table>
          <thead><tr>{r.cap.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {r.randuri.length === 0 && <tr><td colSpan={r.cap.length} className="slab">Nimic în {an}.</td></tr>}
            {r.randuri.map((rand, i) => (
              <tr key={i}>{rand.map((c, j) => <td key={j}>{j === 0 && r.legaturi[i] ? <Link href={r.legaturi[i]!}>{c}</Link> : c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
