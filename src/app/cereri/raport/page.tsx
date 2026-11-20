import Link from "next/link";
import { redirect } from "next/navigation";
import { cere } from "@/autentificare/utilizator";
import { db } from "@/baza/db";
import { inEntitate } from "@/baza/entitate";
import { randurileRaportului } from "@/baza/cereri";
import { anul, esteFelCerere, FELURI, raportul544, raportulPetitiilor, semestrul, type FelCerere } from "@/domeniu/cereri";
import { aziInRomania, vedereaRegistrului } from "@/domeniu/registratura";
import { dataRo } from "@/componente/format";

type Cautare = { fel?: string; an?: string; semestru?: string };

function Rand({ ce, n, slab }: { ce: string; n: number; slab?: boolean }) {
  return <tr><td className={slab ? "slab" : undefined}>{ce}</td><td>{n}</td></tr>;
}

export default async function Raport({ searchParams }: { searchParams: Promise<Cautare> }) {
  const u = await cere();
  if (!u.poate("cereri.gestioneaza") && !u.poate("documente.vede_tot")) redirect("/fara-drept");
  const vedere = vedereaRegistrului(u.acordari);
  const b = db();
  if (!b) return <p className="eroare">Baza de date nu e configurată.</p>;
  const p = await searchParams;
  const fel: FelCerere = p.fel && esteFelCerere(p.fel) ? p.fel : "petitie";
  const azi = aziInRomania();
  const an = /^\d{4}$/.test(p.an ?? "") ? Number(p.an) : Number(azi.slice(0, 4));
  const sem = p.semestru === "1" ? 1 : p.semestru === "2" ? 2 : Number(azi.slice(5, 7)) <= 6 ? 1 : 2;
  const perioada = fel === "petitie" ? semestrul(an, sem) : anul(an);
  const randuri = await inEntitate(b, u.entitateId, (tx) => randurileRaportului(tx, vedere, fel, perioada));
  // Situația se citește la sfârșitul perioadei sau azi, dacă perioada nu s-a încheiat.
  const la = perioada.pana < azi ? perioada.pana : azi;

  return (
    <>
      <p className="slab"><Link href={`/cereri?fel=${fel}`}>← {FELURI[fel].registru}</Link></p>
      <h1>{fel === "petitie" ? "Raportul petițiilor" : "Raportul privind accesul la informațiile de interes public"}, {perioada.nume}</h1>
      <p className="slab">
        {u.entitateNume} · cererile înregistrate între {dataRo(perioada.de)} și {dataRo(perioada.pana)}, cu situația din {dataRo(la)}.
        Structura raportului e de confirmat de jurist pe {fel === "petitie" ? "OG 27/2002" : "Legea 544/2001 și normele ei"}.
      </p>

      <form className="rand-formular" method="get">
        <input type="hidden" name="fel" value={fel} />
        <div><label htmlFor="an">Anul</label><input id="an" name="an" type="text" inputMode="numeric" defaultValue={String(an)} size={5} /></div>
        {fel === "petitie" && (
          <div>
            <label htmlFor="semestru">Semestrul</label>
            <select id="semestru" name="semestru" defaultValue={String(sem)}><option value="1">I</option><option value="2">al II-lea</option></select>
          </div>
        )}
        <button className="buton" type="submit">Arată</button>
      </form>

      {fel === "petitie" ? <RaportPetitii r={raportulPetitiilor(randuri, perioada, la)} /> : <Raport544 r={raportul544(randuri, perioada, la)} />}
      <p className="slab">Raportul nu conține date personale: numai numere. Se poate tipări din browser.</p>
    </>
  );
}

function PeCompartimente({ lista }: { lista: { cheie: string; numar: number }[] }) {
  if (lista.length === 0) return null;
  return (
    <>
      <h2>Pe compartimente</h2>
      <div className="tabel-invelis"><table><tbody>{lista.map((x) => <Rand key={x.cheie} ce={x.cheie} n={x.numar} />)}</tbody></table></div>
    </>
  );
}

function RaportPetitii({ r }: { r: ReturnType<typeof raportulPetitiilor> }) {
  return (
    <>
      <h2>Petițiile primite: {r.primite}</h2>
      <div className="tabel-invelis">
        <table>
          <tbody>
            <Rand ce="pe hârtie (ghișeu, poștă)" n={r.peCanal.hartie} slab />
            <Rand ce="electronic (e-mail, platformă)" n={r.peCanal.electronic} slab />
            <Rand ce="canal nespecificat" n={r.peCanal.nespecificat} slab />
            <Rand ce="Rezolvate favorabil" n={r.solutii.favorabile} />
            <Rand ce="Rezolvate nefavorabil" n={r.solutii.nefavorabile} />
            <Rand ce="Redirecționate la instituția competentă" n={r.solutii.redirectionate} />
            <Rand ce="Clasate" n={r.solutii.clasate} />
            <Rand ce="Conexate" n={r.solutii.conexate} />
            <Rand ce="Răspunse fără soluție scrisă în Petru" n={r.solutii.fara} slab />
            <Rand ce="Rezolvate în termen" n={r.rezolvateInTermen} />
            <Rand ce="Rezolvate după termen" n={r.rezolvateDupaTermen} />
            <Rand ce="Cu termenul prelungit" n={r.prelungite} />
            <Rand ce="În lucru" n={r.inLucru} />
            <Rand ce="În lucru, cu termenul depășit" n={r.inLucruCuTermenDepasit} />
          </tbody>
        </table>
      </div>
      <PeCompartimente lista={r.peCompartimente} />
    </>
  );
}

function Raport544({ r }: { r: ReturnType<typeof raportul544> }) {
  return (
    <>
      <h2>Cererile primite: {r.total}</h2>
      <div className="tabel-invelis">
        <table>
          <tbody>
            <Rand ce="de la persoane fizice" n={r.peSolicitant.fizice} slab />
            <Rand ce="de la persoane juridice" n={r.peSolicitant.juridice} slab />
            <Rand ce="solicitant nespecificat" n={r.peSolicitant.nespecificat} slab />
            <Rand ce="pe hârtie (ghișeu, poștă)" n={r.peCanal.hartie} slab />
            <Rand ce="electronic (e-mail, platformă)" n={r.peCanal.electronic} slab />
            <Rand ce="Informația comunicată" n={r.solutii.comunicate} />
            <Rand ce="Comunicată parțial" n={r.solutii.partial} />
            <Rand ce="Respinse: informație exceptată" n={r.solutii.exceptate} />
            <Rand ce="Respinse: informația nu există" n={r.solutii.inexistente} />
            <Rand ce="Redirecționate la altă instituție" n={r.solutii.redirectionate} />
            <Rand ce="Clasate sau conexate" n={r.solutii.clasate} />
            <Rand ce="Răspunse în 10 zile" n={r.termene.in10Zile} />
            <Rand ce="Răspunse în 11–30 de zile (termen prelungit)" n={r.termene.in30Zile} />
            <Rand ce="Răspunse după termen" n={r.termene.dupaTermen} />
            <Rand ce="Refuzuri comunicate după 5 zile" n={r.termene.refuzuriDupa5Zile} />
            <Rand ce="În lucru" n={r.inLucru} />
            <Rand ce="În lucru, cu termenul depășit" n={r.inLucruCuTermenDepasit} />
          </tbody>
        </table>
      </div>
      <h2>Reclamațiile și plângerile</h2>
      <div className="tabel-invelis">
        <table>
          <tbody>
            <Rand ce="Reclamații administrative" n={r.reclamatii.total} />
            <Rand ce="admise" n={r.reclamatii.admise} slab />
            <Rand ce="respinse" n={r.reclamatii.respinse} slab />
            <Rand ce="în lucru" n={r.reclamatii.inLucru} slab />
            <Rand ce="Plângeri în instanță" n={r.plangeriInstanta} />
          </tbody>
        </table>
      </div>
      <PeCompartimente lista={r.peCompartimente} />
    </>
  );
}
