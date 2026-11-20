import Link from "next/link";
import { redirect } from "next/navigation";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { cifreleCererilor, registrulCererilor, type FiltruCereri } from "@/baza/cereri";
import { stareaCeasului, zileIntre } from "@/domeniu/ceas";
import { ETICHETE_SOLICITANT, ETICHETE_SOLUTIE, FELURI, esteFelCerere, type FelCerere } from "@/domeniu/cereri";
import { aziInRomania, vedereaRegistrului } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";

const FILTRE: { cheie: FiltruCereri; nume: string }[] = [
  { cheie: "deschise", nume: "Fără soluție" },
  { cheie: "depasite", nume: "Termen depășit" },
  { cheie: "aproape", nume: "Scad în curând" },
  { cheie: "rezolvate", nume: "Rezolvate" },
  { cheie: "toate", nume: "Toate" },
];

const ETICHETE_CEAS = { depasit: "Termen depășit", aproape: "Scade în curând", in_termen: "În termen", oprit: "Oprit" } as const;

type Cautare = { fel?: string; filtru?: string; an?: string };

export default async function Cereri({ searchParams }: { searchParams: Promise<Cautare> }) {
  const u = await cere();
  if (!(u.poate("cereri.gestioneaza") || u.poate("documente.vede_tot") || u.poate("documente.vede_compartiment"))) redirect("/fara-drept");
  const vedere = vedereaRegistrului(u.acordari);
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const p = await searchParams;
  const fel: FelCerere = p.fel && esteFelCerere(p.fel) ? p.fel : "petitie";
  const filtru = FILTRE.find((x) => x.cheie === p.filtru)?.cheie ?? "deschise";
  const azi = aziInRomania();
  const an = /^\d{4}$/.test(p.an ?? "") ? Number(p.an) : undefined;

  const { lista, cifre } = await inEntitate(b, u.entitateId, async (tx) => ({
    lista: await registrulCererilor(tx, vedere, fel, { filtru, an }, azi),
    cifre: await cifreleCererilor(tx, vedere, azi),
  }));
  const leg = (x: Partial<Cautare>) => `/cereri?${new URLSearchParams({ fel, filtru, ...(an ? { an: String(an) } : {}), ...x } as Record<string, string>)}`;
  const anAzi = Number(azi.slice(0, 4));
  const semestrul = Number(azi.slice(5, 7)) <= 6 ? 1 : 2;

  return (
    <>
      <h1>Petițiile și informațiile publice</h1>
      <p className="slab">
        Registrele cererilor după OG 27/2002 și Legea 544/2001. Fiecare cerere e un document din registrul de intrare-ieșire,
        cu ceasul termenului ei. Fiecare compartiment își ține petițiile: stabilește felul din fișa documentului, ține termenul și dă răspunsul. Aici fiecare vede cererile compartimentului său; conducerea și responsabilul le văd pe toate.
      </p>

      <nav className="pasi" aria-label="Registrele">
        {(Object.keys(FELURI) as FelCerere[]).map((k) => (
          <Link key={k} href={`/cereri?fel=${k}`} className={`card${k === fel ? " card-ales" : ""}`} aria-current={k === fel ? "page" : undefined}>
            <h3>{FELURI[k].registru}</h3>
            <p className="slab">{cifre[k].deschise} fără soluție · {cifre[k].depasite} cu termen depășit · {cifre[k].aproape} scad în curând</p>
          </Link>
        ))}
      </nav>

      <p>
        <Link className="buton" href={fel === "petitie" ? `/cereri/raport?fel=petitie&an=${anAzi}&semestru=${semestrul}` : `/cereri/raport?fel=informatii_publice&an=${anAzi}`}>
          {fel === "petitie" ? "Raportul semestrial al petițiilor" : "Raportul anual pe Legea 544"}
        </Link>{" "}
        <Link href="/termene">Regulile de termen și calendarul</Link>
      </p>

      <p className="rand-formular">
        {FILTRE.map((x) => (
          <Link key={x.cheie} href={leg({ filtru: x.cheie })} className={`eticheta${x.cheie === filtru ? " termen-aproape" : ""}`}>{x.nume}</Link>
        ))}
      </p>

      <div className="tabel-invelis">
        <table>
          <thead>
            <tr><th>Nr.</th><th>Data</th><th>Conținut</th><th>Solicitant</th><th>Compartiment</th><th>Termen</th><th>Soluția</th></tr>
          </thead>
          <tbody>
            {lista.map((r) => {
              const st = r.ceas?.termen ? stareaCeasului({ termen: r.ceas.termen, opritLa: r.ceas.opritLa }, azi) : null;
              return (
                <tr key={r.docId}>
                  <td><Link href={`/registratura/${r.docId}`}>{r.numar}/{r.an}</Link></td>
                  <td>{dataRo(r.data.toISOString())}</td>
                  <td>{r.continut}</td>
                  <td>{r.emitent ?? "—"}<span className="slab"> · {ETICHETE_SOLICITANT[r.solicitant]}</span></td>
                  <td>{r.compartiment ?? <span className="slab">nerepartizat</span>}</td>
                  <td>
                    {r.ceas?.termen ? dataRo(r.ceas.termen) : "—"}
                    {r.ceas?.prelungitLa && <span className="slab"> (prelungit)</span>}
                    {st && st !== "in_termen" && st !== "oprit" && <> <span className={`eticheta termen-${st}`}>{ETICHETE_CEAS[st]}</span></>}
                    {st === "depasit" && r.ceas?.termen && <span className="slab"> {zileIntre(r.ceas.termen, azi)} z.</span>}
                    {r.ceas?.opritLa && r.ceas.termen && r.ceas.opritLa > r.ceas.termen && <> <span className="eticheta termen-depasit">rezolvat după termen</span></>}
                  </td>
                  <td>
                    {r.solutie ? ETICHETE_SOLUTIE[r.solutie] : <span className="slab">—</span>}
                    {r.redirectionatCatre && <span className="slab"> · la {r.redirectionatCatre}</span>}
                    {r.reclamatieLa && <span className="slab"> · reclamație {r.reclamatieSolutie ?? `(termen ${r.reclamatieTermen ? dataRo(r.reclamatieTermen) : "—"})`}</span>}
                    {r.plangereInstanta && <span className="slab"> · în instanță</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.length === 0 && <p className="slab">Nicio cerere pentru alegerea făcută.</p>}
      {lista.length === 300 && <p className="slab">Se arată primele 300.</p>}
    </>
  );
}
